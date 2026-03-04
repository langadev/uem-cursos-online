import {
    collection,
    getDocs,
    limit,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import { Download, TrendingUp, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { cacheService } from "../../services/cacheService";
import { db } from "../../services/firebase";

interface StudentProgress {
  student_uid: string;
  student_name: string;
  enrollments: {
    course_id: string;
    course_title: string;
    enrollment_date: any;
    progress_percentage: number;
    completed_lessons: number;
    total_lessons: number;
    certificate_status: "none" | "pending" | "confirmed" | "rejected";
    completion_date?: any;
  }[];
}

const StudentsProgressPage: React.FC = () => {
  const { user } = useAuth();
  const [studentsProgress, setStudentsProgress] = useState<StudentProgress[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "completed"
  >("all");

  useEffect(() => {
    if (user) {
      loadStudentsProgress();
    }
  }, [user]);

  const loadStudentsProgress = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. Obter cursos do instrutor (com cache)
      const cacheKey = `instructor_courses_${user.uid}`;
      const cachedCourses: any = cacheService.get(cacheKey);

      let courses: { [key: string]: string } = {};
      let instructorCourseIds: string[] = [];

      if (cachedCourses) {
        instructorCourseIds = cachedCourses;
        // Tentar carregar dados dos cursos, mas não bloquear se não conseguir
        const coursesRef = collection(db, "courses");
        const q = query(
          coursesRef,
          where("instructor_uid", "==", user.uid),
          limit(100),
        );
        const coursesSnap = await getDocs(q);
        coursesSnap.docs.forEach((doc) => {
          courses[doc.id] = doc.data().title;
        });
      } else {
        const coursesRef = collection(db, "courses");
        const q = query(
          coursesRef,
          where("instructor_uid", "==", user.uid),
          limit(100),
        );
        const coursesSnap = await getDocs(q);
        coursesSnap.docs.forEach((doc) => {
          courses[doc.id] = doc.data().title;
          instructorCourseIds.push(doc.id);
        });
        cacheService.set(cacheKey, instructorCourseIds, 60);
      }

      const studentProgressMap: { [key: string]: StudentProgress } = {};

      // Usar onSnapshot para atualizações em tempo real
      const enrollmentsRef = collection(db, "enrollments");
      const unsubscribe = onSnapshot(enrollmentsRef, async (snapshot) => {
        // Filtrar inscrições dos cursos do instrutor
        const enrollments = snapshot.docs
          .filter((doc) =>
            instructorCourseIds.includes((doc.data() as any).course_id),
          )
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) }) as any);

        // 2. Carregar status de certificados EM BATCH
        const certificatesRef = collection(db, "certificates");
        const certQuery = query(
          certificatesRef,
          limit(1000), // Limitar para segurança
        );
        const certSnap = await getDocs(certQuery);

        // Criar um mapa de certificados para lookup rápido
        const certificateMap = new Map<string, any>();
        certSnap.docs.forEach((doc) => {
          const data = doc.data();
          const key = `${data.student_uid}:${data.course_id}`;
          certificateMap.set(key, data);
        });

        // 3. Agrupar por estudante COM dados dos certificados já carregados
        const newStudentProgressMap: { [key: string]: StudentProgress } = {};

        for (const enrollment of enrollments) {
          const studentUid = enrollment.student_uid;

          if (!newStudentProgressMap[studentUid]) {
            newStudentProgressMap[studentUid] = {
              student_uid: studentUid,
              student_name:
                enrollment.student_name ||
                enrollment.student_email?.split("@")[0] ||
                "Formando",
              enrollments: [],
            };
          }

          // Dados já disponíveis
          const progressPercentage = enrollment.progress_percentage || 0;
          const completedLessons = enrollment.completed_lessons || 0;
          const totalLessons = enrollment.total_lessons || 0;

          // Procurar certificado no mapa (O(1) em vez de N queries)
          let certificateStatus: "none" | "pending" | "confirmed" | "rejected" =
            "none";
          const certKey = `${studentUid}:${enrollment.course_id}`;
          const cert = certificateMap.get(certKey);
          if (cert) {
            certificateStatus = cert.status || "none";
          }

          const enrollmentData = {
            course_id: enrollment.course_id,
            course_title: courses[enrollment.course_id] || "Curso Desconhecido",
            enrollment_date: enrollment.createdAt,
            progress_percentage: progressPercentage,
            completed_lessons: completedLessons,
            total_lessons: totalLessons,
            certificate_status: certificateStatus,
            completion_date:
              progressPercentage === 100 ? enrollment.completed_at : undefined,
          };

          const existingIndex = newStudentProgressMap[
            studentUid
          ].enrollments.findIndex((e) => e.course_id === enrollment.course_id);

          if (existingIndex >= 0) {
            newStudentProgressMap[studentUid].enrollments[existingIndex] =
              enrollmentData;
          } else {
            newStudentProgressMap[studentUid].enrollments.push(enrollmentData);
          }
        }

        setStudentsProgress(Object.values(newStudentProgressMap));
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Erro ao carregar progresso dos estudantes:", err);
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 0) return "bg-gray-300";
    if (percentage < 25) return "bg-red-500";
    if (percentage < 50) return "bg-orange-500";
    if (percentage < 75) return "bg-yellow-500";
    if (percentage < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  const getCertificateStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "confirmed":
        return "text-green-600 bg-green-50 border-green-200";
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getCertificateStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Aguardando";
      case "confirmed":
        return "Confirmado";
      case "rejected":
        return "Rejeitado";
      default:
        return "Nenhum";
    }
  };

  const filteredStudents = studentsProgress.filter((student) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "completed") {
      return student.enrollments.some((e) => e.progress_percentage === 100);
    }
    if (filterStatus === "pending") {
      return student.enrollments.some((e) => e.progress_percentage < 100);
    }
    return true;
  });

  const exportToCSV = () => {
    let csv =
      "Formando,Curso,Data Inscrição,Progresso,Aulas,Status Certificado\n";

    studentsProgress.forEach((student) => {
      student.enrollments.forEach((enrollment) => {
        csv += `"${student.student_name}","${enrollment.course_title}","${
          enrollment.enrollment_date?.toDate?.().toLocaleDateString("pt-PT") ||
          ""
        }","${enrollment.progress_percentage}%","${enrollment.completed_lessons}/${enrollment.total_lessons}","${getCertificateStatusLabel(
          enrollment.certificate_status,
        )}"\n`;
      });
    });

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
    );
    element.setAttribute(
      "download",
      `progresso-estudantes-${new Date().toLocaleDateString("pt-PT")}.csv`,
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Progresso dos Estudantes
          </h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o progresso de todos os seus estudantes nos cursos
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total de Estudantes</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {studentsProgress.length}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-100" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Cursos Completados</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {studentsProgress.reduce((acc, student) => {
                    return (
                      acc +
                      student.enrollments.filter(
                        (e) => e.progress_percentage === 100,
                      ).length
                    );
                  }, 0)}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-100" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Progresso Médio</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {studentsProgress.length > 0
                    ? Math.round(
                        studentsProgress.reduce((acc, student) => {
                          return (
                            acc +
                            student.enrollments.reduce(
                              (subAcc, e) => subAcc + e.progress_percentage,
                              0,
                            ) /
                              Math.max(student.enrollments.length, 1)
                          );
                        }, 0) / studentsProgress.length,
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-orange-100" />
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="mb-6 flex gap-4 items-center justify-between">
          <div className="flex gap-2">
            {["all", "completed", "pending"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {status === "all" && "Todos"}
                {status === "completed" && "Completados"}
                {status === "pending" && "Em Andamento"}
              </button>
            ))}
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
        </div>

        {/* Students List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">
              Carregando progresso dos estudantes...
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum estudante encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div
                key={student.student_uid}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Student Header */}
                <button
                  onClick={() =>
                    setExpandedStudent(
                      expandedStudent === student.student_uid
                        ? null
                        : student.student_uid,
                    )
                  }
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {student.student_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900">
                        {student.student_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {student.enrollments.length} curso
                        {student.enrollments.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Enrollments */}
                {expandedStudent === student.student_uid && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {student.enrollments.map((enrollment, idx) => (
                      <div
                        key={`${enrollment.course_id}-${idx}`}
                        className="p-4"
                      >
                        <h4 className="font-medium text-gray-900 mb-3">
                          {enrollment.course_title}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                          {/* Progress Bar */}
                          <div>
                            <p className="text-xs text-gray-600 mb-2">
                              Progresso
                            </p>
                            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${getProgressColor(
                                  enrollment.progress_percentage,
                                )}`}
                                style={{
                                  width: `${enrollment.progress_percentage}%`,
                                }}
                              />
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {enrollment.progress_percentage}%
                            </p>
                          </div>

                          {/* Lessons */}
                          <div>
                            <p className="text-xs text-gray-600 mb-2">Aulas</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {enrollment.completed_lessons}/
                              {enrollment.total_lessons}
                            </p>
                          </div>

                          {/* Enrollment Date */}
                          <div>
                            <p className="text-xs text-gray-600 mb-2">
                              Data Inscrição
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {enrollment.enrollment_date
                                ?.toDate?.()
                                .toLocaleDateString("pt-PT") || "N/A"}
                            </p>
                          </div>

                          {/* Certificate Status */}
                          <div>
                            <p className="text-xs text-gray-600 mb-2">
                              Certificado
                            </p>
                            <span
                              className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getCertificateStatusColor(
                                enrollment.certificate_status,
                              )}`}
                            >
                              {getCertificateStatusLabel(
                                enrollment.certificate_status,
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Completion Date */}
                        {enrollment.completion_date && (
                          <p className="text-xs text-green-600">
                            Completado em{" "}
                            {enrollment.completion_date
                              ?.toDate?.()
                              .toLocaleDateString("pt-PT")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
};

export default StudentsProgressPage;
