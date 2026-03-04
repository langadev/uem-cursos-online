import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import {
    AlertCircle,
    ArrowLeft,
    Award,
    BookOpen,
    CheckCircle,
    ChevronDown,
    Eye,
    File,
    FileText,
    Play,
    User,
    X
} from "lucide-react";
import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { db } from "../../services/firebase";
import { Course } from "../../types";

interface Lesson {
  id: string;
  title: string;
  type: "video" | "text" | "document";
  content: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface InteractiveExercise {
  id: string;
  type: string;
  title: string;
  description?: string;
}

interface CourseWithDetails extends Course {
  cardDescription?: string;
  fullDescription?: string;
  language?: string;
  learningOutcomes?: string[];
  modules?: Module[];
  interactiveExercises?: InteractiveExercise[];
  creator_uid?: string;
}

const CourseModerationPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [previewCourse, setPreviewCourse] = useState<CourseWithDetails | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [approvalModal, setApprovalModal] = useState<{
    action: "approve" | "reject";
    courseId: string;
    courseTitle: string;
    instructor: string;
  } | null>(null);

  // Listener em tempo real para cursos
  useEffect(() => {
    setLoading(true);
    const coursesRef = collection(db, "courses");

    const unsubscribe = onSnapshot(
      coursesRef,
      (snapshot) => {
        const coursesList: Course[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          coursesList.push({
            id: doc.id,
            title: data.title || "Sem título",
            instructor: data.instructor || "Sem instrutor",
            category: data.category || "Geral",
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            duration: data.duration || "0h",
            relevanceScore: data.relevanceScore || 0,
            imageUrl: data.imageUrl || "",
            isActive: data.isActive !== false,
            badgeColor: data.badgeColor || "bg-stone-100 text-stone-800",
            approvalStatus: data.approvalStatus || "pending",
          } as Course);
        });

        setCourses(coursesList);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar cursos:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleViewCourse = async (courseId: string) => {
    setPreviewLoading(true);
    try {
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        setPreviewCourse({
          id: courseDoc.id,
          title: data.title || "Sem título",
          instructor: data.instructor || "Sem instrutor",
          category: data.category || "Geral",
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          duration: data.duration || "0h",
          relevanceScore: data.relevanceScore || 0,
          imageUrl: data.imageUrl || "",
          cardDescription: data.cardDescription || "",
          fullDescription: data.fullDescription || "",
          language: data.language || "Português",
          learningOutcomes: data.learningOutcomes || [],
          modules: data.modules || [],
          interactiveExercises: data.interactiveExercises || [],
          approvalStatus: data.approvalStatus || "pending",
        } as CourseWithDetails);
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do curso:", error);
      showToast("Erro ao carregar curso", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApproveCourse = async (courseId: string, courseTitle: string) => {
    try {
      await updateDoc(doc(db, "courses", courseId), {
        approvalStatus: "approved",
        updatedAt: serverTimestamp(),
      });
      showToast(`✅ Curso "${courseTitle}" aprovado!`, "success");
      setApprovalModal(null);
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      showToast("Erro ao aprovar curso.", "error");
      setApprovalModal(null);
    }
  };

  const handleRejectCourse = async (courseId: string, courseTitle: string) => {
    try {
      await updateDoc(doc(db, "courses", courseId), {
        approvalStatus: "rejected",
        updatedAt: serverTimestamp(),
      });
      showToast(`✗ Curso "${courseTitle}" rejeitado.`, "success");
      setApprovalModal(null);
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
      showToast("Erro ao rejeitar curso.", "error");
      setApprovalModal(null);
    }
  };

  const filteredCourses = courses.filter(
    (course) => course.approvalStatus === tab,
  );

  if (previewCourse) {
    return (
      <AdminLayout>
        <div className="space-y-4 sm:space-y-6 pb-12 px-4 sm:px-0">
          {/* Header com Voltar */}
          <button
            onClick={() => setPreviewCourse(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft size={18} />
            <span className="font-bold">Voltar à Moderação</span>
          </button>

          {/* Conteúdo do Curso - Full Preview */}
          {previewLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-slate-400 mt-4 text-xs sm:text-sm">
                Carregando curso...
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-6 lg:p-8 items-start lg:items-start">
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-4">
                      <span className="px-3 py-1 bg-slate-700 text-slate-100 text-xs font-bold rounded-full uppercase">
                        {previewCourse.category}
                      </span>
                      <span className="px-3 py-1 bg-slate-700 text-slate-100 text-xs font-bold rounded-full uppercase">
                        {previewCourse.duration}
                      </span>
                    </div>
                    <h1 className="text-2xl lg:text-4xl font-black text-white mb-2 leading-tight">
                      {previewCourse.title}
                    </h1>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4 mt-4 lg:mt-6">
                      <div className="flex items-center gap-2">
                        <User
                          size={18}
                          className="text-slate-300 flex-shrink-0"
                        />
                        <span className="text-slate-200 font-medium text-sm lg:text-base">
                          {previewCourse.instructor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen
                          size={18}
                          className="text-slate-300 flex-shrink-0"
                        />
                        <span className="text-slate-200 font-medium text-sm lg:text-base">
                          {previewCourse.language}
                        </span>
                      </div>
                    </div>
                  </div>
                  {previewCourse.imageUrl && (
                    <img
                      src={previewCourse.imageUrl}
                      alt={previewCourse.title}
                      className="w-full sm:w-40 lg:w-48 h-auto lg:h-32 rounded-2xl object-cover shadow-2xl flex-shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* Descrição */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:p-8 space-y-4">
                <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600 flex-shrink-0" />
                  Descrição do Curso
                </h2>
                <p className="text-slate-600 leading-relaxed text-sm lg:text-base">
                  {previewCourse.cardDescription}
                </p>
                {previewCourse.fullDescription &&
                  previewCourse.fullDescription !==
                    previewCourse.cardDescription && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-slate-600 leading-relaxed text-sm lg:text-base">
                        {previewCourse.fullDescription}
                      </p>
                    </div>
                  )}
              </div>

              {/* Objetivos de Aprendizado */}
              {previewCourse.learningOutcomes &&
                previewCourse.learningOutcomes.length > 0 && (
                  <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 lg:p-8">
                    <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Award
                        size={20}
                        className="text-blue-600 flex-shrink-0"
                      />
                      Objetivos de Aprendizado
                    </h2>
                    <ul className="space-y-2">
                      {previewCourse.learningOutcomes.map((outcome, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle
                            size={20}
                            className="text-blue-600 mt-0.5 flex-shrink-0 hidden sm:block"
                          />
                          <CheckCircle
                            size={16}
                            className="text-blue-600 mt-0.5 flex-shrink-0 sm:hidden"
                          />
                          <span className="text-slate-700 text-sm lg:text-base">
                            {outcome}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Módulos e Aulas */}
              {previewCourse.modules && previewCourse.modules.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:p-8 space-y-4 lg:space-y-6">
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen
                      size={20}
                      className="text-green-600 flex-shrink-0"
                    />
                    <span>Estrutura do Curso</span>
                    <span className="text-xs lg:text-sm bg-slate-100 text-slate-700 px-2 py-1 rounded-full ml-auto font-black">
                      {previewCourse.modules.length} módulos
                    </span>
                  </h2>
                  <div className="space-y-3 lg:space-y-4">
                    {previewCourse.modules.map((module, modIdx) => (
                      <details key={module.id} className="group">
                        <summary className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors font-bold text-slate-900 text-sm lg:text-base border border-green-200">
                          <ChevronDown
                            size={20}
                            className="group-open:rotate-180 transition-transform flex-shrink-0 text-green-600"
                          />
                          <span className="flex-1">
                            <span className="text-green-600 font-black">
                              Módulo {modIdx + 1}:
                            </span>{" "}
                            {module.title}
                          </span>
                          <span className="text-xs lg:text-sm bg-green-600 text-white px-2 py-1 rounded-full font-black flex-shrink-0">
                            {module.lessons.length}
                          </span>
                        </summary>
                        <div className="mt-3 lg:mt-4 ml-4 lg:ml-6 border-l-2 border-green-300 pl-3 lg:pl-4 space-y-2 lg:space-y-2.5">
                          {module.lessons.map((lesson, lesIdx) => (
                            <div
                              key={lesson.id}
                              className="flex items-start gap-2 lg:gap-3 p-2 lg:p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group/lesson"
                            >
                              <div className="flex-shrink-0 pt-0.5">
                                {lesson.type === "video" && (
                                  <Play size={16} className="text-red-500" />
                                )}
                                {lesson.type === "text" && (
                                  <FileText
                                    size={16}
                                    className="text-blue-500"
                                  />
                                )}
                                {lesson.type === "document" && (
                                  <File size={16} className="text-amber-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs lg:text-sm font-medium text-slate-600">
                                  <span className="text-slate-500">
                                    Aula {lesIdx + 1}
                                  </span>
                                </p>
                                <p className="text-sm lg:text-base font-bold text-slate-900 break-words lg:break-normal">
                                  {lesson.title}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-black px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap uppercase ${
                                  lesson.type === "video"
                                    ? "bg-red-100 text-red-700"
                                    : lesson.type === "text"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {lesson.type === "video"
                                  ? "🎥 Vídeo"
                                  : lesson.type === "text"
                                    ? "📄 Texto"
                                    : "📄 Doc"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercícios Interativos */}
              {previewCourse.interactiveExercises &&
                previewCourse.interactiveExercises.length > 0 && (
                  <div className="bg-purple-50 rounded-2xl border border-purple-200 p-6 lg:p-8">
                    <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Award
                        size={20}
                        className="text-purple-600 flex-shrink-0"
                      />
                      <span>Exercícios Interativos</span>
                      <span className="text-xs lg:text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-auto font-black">
                        {previewCourse.interactiveExercises.length}
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                      {previewCourse.interactiveExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="flex items-start gap-2 p-3 bg-white rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-xs font-bold text-purple-600 uppercase px-2 py-1 bg-purple-100 rounded flex-shrink-0 whitespace-nowrap">
                            {exercise.type}
                          </span>
                          <span className="text-slate-700 text-xs lg:text-sm">
                            {exercise.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Action Buttons - Aprovação */}
              {previewCourse.approvalStatus === "pending" && (
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 sticky bottom-0 bg-white p-4 lg:p-6 rounded-2xl shadow-lg">
                  <button
                    onClick={() =>
                      setApprovalModal({
                        action: "reject",
                        courseId: previewCourse.id,
                        courseTitle: previewCourse.title,
                        instructor: previewCourse.instructor,
                      })
                    }
                    className="flex items-center justify-center gap-2 px-4 lg:px-6 py-3 lg:py-4 bg-red-50 text-red-600 border border-red-200 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-100 transition-all"
                  >
                    <X size={18} />
                    <span className="hidden sm:inline">Rejeitar</span>
                    <span className="sm:hidden">Rejeitar</span>
                  </button>
                  <button
                    onClick={() =>
                      setApprovalModal({
                        action: "approve",
                        courseId: previewCourse.id,
                        courseTitle: previewCourse.title,
                        instructor: previewCourse.instructor,
                      })
                    }
                    className="flex items-center justify-center gap-2 px-4 lg:px-6 py-3 lg:py-4 bg-green-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                  >
                    <CheckCircle size={18} />
                    <span className="hidden sm:inline">Aprovar</span>
                    <span className="sm:hidden">Aprovar</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Confirmação */}
        {approvalModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[340px] rounded-[32px] p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
              <div
                className={`w-12 h-12 ${
                  approvalModal.action === "approve"
                    ? "bg-green-50 text-green-500"
                    : "bg-red-50 text-red-500"
                } rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6`}
              >
                {approvalModal.action === "approve" ? (
                  <CheckCircle size={24} />
                ) : (
                  <X size={24} />
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">
                {approvalModal.action === "approve"
                  ? "Aprovar Curso?"
                  : "Rejeitar Curso?"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8 leading-relaxed font-medium px-2">
                {approvalModal.action === "approve"
                  ? `Você está aprovando "${approvalModal.courseTitle}" do tutor ${approvalModal.instructor}. O tutor poderá ativar o curso.`
                  : `Você está rejeitando "${approvalModal.courseTitle}". O tutor não poderá ativar este curso.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setApprovalModal(null)}
                  className="flex-1 h-10 sm:h-11 bg-slate-50 text-slate-500 font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (approvalModal.action === "approve") {
                      handleApproveCourse(
                        approvalModal.courseId,
                        approvalModal.courseTitle,
                      );
                    } else {
                      handleRejectCourse(
                        approvalModal.courseId,
                        approvalModal.courseTitle,
                      );
                    }
                  }}
                  className={`flex-1 h-10 sm:h-11 ${
                    approvalModal.action === "approve"
                      ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20"
                      : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
                  } text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl transition-all`}
                >
                  {approvalModal.action === "approve"
                    ? "Sim, Aprovar"
                    : "Sim, Rejeitar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-[200] px-6 py-3 rounded-xl font-bold text-sm shadow-lg animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3 ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {toast.message}
          </div>
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 lg:space-y-8 pb-12 px-4 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
              Moderação de Cursos
            </h1>
            <p className="text-slate-500 mt-1 lg:mt-2 text-sm sm:text-base">
              Analise e aprove os cursos submetidos pelos tutores
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 rounded-2xl shadow-lg shadow-blue-900/20 w-full sm:w-auto">
            <div className="text-[10px] font-black text-blue-100 uppercase tracking-widest">
              Pendentes de Análise
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {courses.filter((c) => c.approvalStatus === "pending").length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <div className="flex border-b border-slate-100">
            {(["pending", "approved", "rejected"] as const).map((tab_name) => (
              <button
                key={tab_name}
                onClick={() => setTab(tab_name)}
                className={`flex-1 min-w-24 sm:min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${
                  tab === tab_name
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab_name === "pending"
                  ? `Pend. (${courses.filter((c) => c.approvalStatus === "pending").length})`
                  : tab_name === "approved"
                    ? `Apr. (${courses.filter((c) => c.approvalStatus === "approved").length})`
                    : `Rej. (${courses.filter((c) => c.approvalStatus === "rejected").length})`}
                {tab === tab_name && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-block">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-400 mt-4 text-xs sm:text-sm font-medium">
                Carregando cursos...
              </p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <CheckCircle
                size={36}
                className="text-slate-200 mx-auto mb-4 sm:mb-4"
              />
              <p className="text-slate-400 font-medium text-base sm:text-lg">
                {tab === "pending"
                  ? "Nenhum curso pendente"
                  : tab === "approved"
                    ? "Todos os cursos foram aprovados ✅"
                    : "Nenhum curso foi rejeitado"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex gap-3 sm:gap-4 flex-1 w-full">
                    {course.imageUrl && (
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 text-sm sm:text-lg mb-2 truncate sm:truncate-none">
                        {course.title}
                      </h3>
                      <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                        <p className="text-slate-600 flex items-center gap-2 truncate sm:truncate-none">
                          <User
                            size={14}
                            className="text-slate-400 flex-shrink-0"
                          />
                          <span className="font-bold truncate sm:truncate-none">
                            {course.instructor}
                          </span>
                        </p>
                        <p className="text-slate-600 flex items-center gap-2">
                          <FileText
                            size={14}
                            className="text-slate-400 flex-shrink-0"
                          />
                          <span className="truncate sm:truncate-none">
                            {course.category} • {course.duration}
                          </span>
                        </p>
                      </div>
                      {tab === "pending" && (
                        <div className="mt-2 sm:mt-3 flex gap-2">
                          <span className="text-[10px] sm:text-xs font-bold text-yellow-700 bg-yellow-100 px-2 sm:px-3 py-1 rounded-full uppercase">
                            ⏰ Análise
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewCourse(course.id)}
                    disabled={previewLoading}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex-shrink-0 w-full sm:w-auto"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Ver Curso</span>
                    <span className="sm:hidden">Ver</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[200] px-6 py-3 rounded-xl font-bold text-sm shadow-lg animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {toast.message}
        </div>
      )}
    </AdminLayout>
  );
};

export default CourseModerationPage;
