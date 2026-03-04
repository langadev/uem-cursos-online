import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  Plus,
  Power,
  Search,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { cacheService } from "../../services/cacheService";
import { db } from "../../services/firebase";
// Added Course import to fix interface extension error
import { Course } from "../../types";

// Interface local para gerenciar o estado dos cursos no painel
// Fix: Changed 'extends any' to 'extends Course' to resolve TS error and inherited imageUrl property
interface InstructorCourse extends Course {
  status: "Publicado" | "Rascunho";
  enrollmentCount: number;
  revenue: number;
  totalLessons: number;
  moduleCount: number;
  completionRate: number;
}

const InstructorCoursesPage: React.FC = () => {
  // Estado local para permitir a ativação/desativação
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<InstructorCourse | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const { user } = useAuth();
  const courseMetricsRef = useRef<{ [key: string]: any }>({});

  // Mostrar toast notification
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Carrega cursos rapidamente SEM aguardar sub-coleções
  // Depois carrega métricas em background
  useEffect(() => {
    if (!user?.uid) {
      setCourses([]);
      setLoading(false);
      return;
    }

    // Tentar carregar do cache primeiro
    const cached = cacheService.get(`instructor_courses_${user.uid}`);
    if (cached) {
      setCourses(cached);
      setLoading(false);
    }

    // Query rápida: apenas dados básicos dos cursos
    const q = query(
      collection(db, "courses"),
      where("instructor_uid", "==", user.uid),
      limit(100), // Limita a 100 cursos
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list: InstructorCourse[] = [];

      // Primeiro: Carrega dados básicos RAPIDAMENTE
      for (const d of snap.docs) {
        const data: any = d.data();
        const status: "Publicado" | "Rascunho" =
          data?.status === "Publicado" ? "Publicado" : "Rascunho";

        // Dados imediatos (sem awaits)
        const basicCourse: InstructorCourse = {
          id: d.id,
          title: data?.title || "Sem título",
          instructor: data?.instructor || "",
          category: data?.category || "Geral",
          rating: typeof data?.rating === "number" ? data.rating : 0,
          reviewCount:
            typeof data?.reviewCount === "number" ? data.reviewCount : 0,
          duration: data?.duration || "0h",
          relevanceScore:
            typeof data?.relevanceScore === "number" ? data.relevanceScore : 0,
          imageUrl:
            data?.imageUrl ||
            "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?w=400&q=80&auto=format&fit=crop",
          badgeColor: data?.badgeColor || "blue",
          isActive: status === "Publicado",
          status,
          approvalStatus: data?.approvalStatus || "pending",
          // Dados agregados (com valores padrão do banco)
          enrollmentCount: data?.enrollmentCount || 0,
          revenue: data?.totalRevenue || 0,
          totalLessons: data?.totalLessons || 0,
          moduleCount: data?.moduleCount || 0,
          completionRate: data?.completionRate || 0,
        } as InstructorCourse;

        list.push(basicCourse);

        // Carregar métricas em background (não bloqueia UI)
        loadCourseMetrics(d.id, user.uid);
      }

      // Ordena por data
      list.sort((a, b) => {
        const aTime = new Date(a.id).getTime() || 0;
        const bTime = new Date(b.id).getTime() || 0;
        return bTime - aTime;
      });

      setCourses(list);
      // Cache com TTL de 30 minutos
      cacheService.set(`instructor_courses_${user.uid}`, list, 30);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // Carrega métricas em background, separado da renderização
  const loadCourseMetrics = async (courseId: string, instructorUid: string) => {
    try {
      // Se já temos em cache, use
      const cacheKey = `course_metrics_${courseId}`;
      let metrics: any = cacheService.get(cacheKey);

      if (!metrics) {
        let totalLessons = 0;
        let moduleCount = 0;

        // Contar módulos e aulas (apenas se não estiver em cache)
        const modulesSnap = await getDocs(
          collection(db, "courses", courseId, "modules"),
        );
        moduleCount = modulesSnap.size;

        // Apenas contar lições se houver módulos
        if (moduleCount > 0) {
          for (const moduleDoc of modulesSnap.docs) {
            const lessonsSnap = await getDocs(
              collection(
                db,
                "courses",
                courseId,
                "modules",
                moduleDoc.id,
                "lessons",
              ),
            );
            totalLessons += lessonsSnap.size;
          }
        }

        // Contar inscrições e calcular métricas
        const enrollmentsQ = query(
          collection(db, "enrollments"),
          where("course_id", "==", courseId),
          limit(1000), // Limite para segurança
        );
        const enrollmentsSnap = await getDocs(enrollmentsQ);
        const enrollmentCount = enrollmentsSnap.size;

        let completedEnrollments = 0;
        let totalRevenue = 0;

        enrollmentsSnap.forEach((enrollDoc) => {
          const enrollData: any = enrollDoc.data();
          if (enrollData?.certificatePaid) {
            const certificatePrice = enrollData?.certificatePrice || 0;
            totalRevenue +=
              typeof certificatePrice === "string"
                ? parseFloat(
                    certificatePrice.replace(/\./g, "").replace(",", "."),
                  ) || 0
                : certificatePrice;
          }
          if (enrollData?.progress === 100) {
            completedEnrollments++;
          }
        });

        const completionRate =
          enrollmentCount > 0
            ? Math.round((completedEnrollments / enrollmentCount) * 100)
            : 0;

        metrics = {
          totalLessons,
          moduleCount,
          enrollmentCount,
          revenue: totalRevenue,
          completionRate,
        };

        // Cache com TTL de 60 minutos
        cacheService.set(cacheKey, metrics, 60);
      }

      // Atualiza o curso com as métricas
      courseMetricsRef.current[courseId] = metrics;
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                totalLessons: metrics.totalLessons,
                moduleCount: metrics.moduleCount,
                enrollmentCount: metrics.enrollmentCount,
                revenue: metrics.revenue,
                completionRate: metrics.completionRate,
              }
            : c,
        ),
      );
    } catch (err) {
      console.error("Erro ao carregar métricas do curso:", err);
    }
  };

  const [filterValue, setFilterValue] = useState("Mais recentes");
  const [searchValue, setSearchValue] = useState("");

  // Função para filtrar e ordenar cursos
  const getFilteredAndSortedCourses = () => {
    let filtered = courses.filter(
      (course) =>
        course.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        course.category.toLowerCase().includes(searchValue.toLowerCase()),
    );

    switch (filterValue) {
      case "Mais vendidos":
        filtered.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
        break;
      case "Melhor avaliados":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "Mais recentes":
      default:
        // Já está ordenado por data
        break;
    }

    return filtered;
  };

  const filteredCourses = getFilteredAndSortedCourses();

  const toggleCourseStatus = async (id: string) => {
    const current = courses.find((c) => c.id === id);
    if (!current) return;

    // Verificar se o curso foi aprovado pelo admin
    if (
      current.status === "Rascunho" &&
      current.approvalStatus !== "approved"
    ) {
      showToast(
        "Você não pode ativar este curso. Aguarde a aprovação do administrador.",
        "error",
      );
      return;
    }

    const newStatus: "Publicado" | "Rascunho" =
      current.status === "Publicado" ? "Rascunho" : "Publicado";
    // Atualiza UI otimisticamente
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: newStatus, isActive: newStatus === "Publicado" }
          : c,
      ),
    );
    try {
      await updateDoc(doc(db, "courses", id), {
        status: newStatus,
        isActive: newStatus === "Publicado",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      // Reverte em caso de erro
      setCourses((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: current.status,
                isActive: current.status === "Publicado",
              }
            : c,
        ),
      );
      console.error("Falha ao alterar status do curso:", e);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete || !user?.uid) return;

    setIsDeleting(true);
    try {
      // 1. Desativar o curso automaticamente
      await updateDoc(doc(db, "courses", courseToDelete.id), {
        status: "Rascunho",
        isActive: false,
        deletionRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Criar solicitação de exclusão
      await addDoc(collection(db, "courseDeletionRequests"), {
        courseId: courseToDelete.id,
        courseTitle: courseToDelete.title,
        instructorId: user.uid,
        instructorName: user.displayName || "Instrutor",
        status: "pending", // pending, approved, rejected
        requestedAt: serverTimestamp(),
        approvedAt: null,
        approvedBy: null,
        rejectionReason: null,
      });

      // 3. Atualizar UI localmente
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseToDelete.id
            ? { ...c, status: "Rascunho", isActive: false }
            : c,
        ),
      );

      // Remove do cache
      if (user?.uid) {
        cacheService.remove(`instructor_courses_${user.uid}`);
      }

      // Fecha o modal de confirmação e abre o de sucesso
      setShowDeleteModal(false);
      setShowDeleteRequestModal(true);
    } catch (e) {
      console.error("Falha ao solicitar exclusão do curso:", e);
      alert("Não foi possível solicitar a exclusão do curso. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Meus Cursos
              </h1>
              {loading && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700">
                    Carregando...
                  </span>
                </div>
              )}
            </div>
            <p className="text-slate-500 mt-1">
              Gerencie seu catálogo de conteúdos e acompanhe as vendas.
            </p>
          </div>
          <Link
            to="/instrutor/cursos/novo"
            className="flex items-center gap-2 bg-brand-green text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" /> Criar Novo Curso
          </Link>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar em meus cursos..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/10"
            />
          </div>

          <div className="flex items-end gap-2">
            <Select
              className="w-full md:w-56"
              placeholder="Ordenar por"
              value={filterValue}
              onValueChange={setFilterValue}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectPopover>
                <SelectListBox>
                  <SelectItem value="Mais recentes">Mais recentes</SelectItem>
                  <SelectItem value="Mais vendidos">Mais vendidos</SelectItem>
                  <SelectItem value="Melhor avaliados">
                    Melhor avaliados
                  </SelectItem>
                </SelectListBox>
              </SelectPopover>
            </Select>
          </div>
        </div>

        {/* Courses Table/Grid */}
        {filteredCourses.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {courses.length === 0
                ? "Nenhum curso criado ainda"
                : "Nenhum curso encontrado"}
            </h3>
            <p className="text-slate-500 mb-6">
              {courses.length === 0
                ? "Comece criando seu primeiro curso para compartilhar conhecimento."
                : "Ajuste sua busca ou filtros."}
            </p>
            {courses.length === 0 && (
              <Link
                to="/instrutor/cursos/novo"
                className="inline-flex items-center gap-2 bg-brand-green text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition-all"
              >
                <Plus className="w-5 h-5" /> Criar Primeiro Curso
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Curso
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Conteúdo
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Métricas
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={course.imageUrl}
                              className={`w-16 h-10 rounded-lg object-cover shadow-sm transition-opacity duration-300 ${course.status === "Rascunho" ? "opacity-40 grayscale" : "opacity-100"}`}
                              alt={course.title}
                            />
                            {course.status === "Rascunho" && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <EyeOff
                                  size={14}
                                  className="text-white drop-shadow-md"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <p
                              className={`font-bold transition-colors ${course.status === "Publicado" ? "text-slate-900 group-hover:text-brand-green" : "text-slate-400 italic"}`}
                            >
                              {course.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {course.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                              <BookOpen size={12} className="text-purple-500" />
                              {course.totalLessons}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                              Aulas
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                              <TrendingUp
                                size={12}
                                className="text-orange-500"
                              />
                              {course.completionRate}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                              Conclusão
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all duration-300 ${
                              course.status === "Rascunho"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full animate-pulse ${course.status === "Rascunho" ? "bg-amber-500" : "bg-emerald-500"}`}
                            ></span>
                            {course.status}
                          </span>
                          {/* Badge de status de aprovação */}
                          {course.approvalStatus && (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                course.approvalStatus === "pending"
                                  ? "bg-blue-50 text-blue-600"
                                  : course.approvalStatus === "approved"
                                    ? "bg-green-50 text-green-600"
                                    : "bg-red-50 text-red-600"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  course.approvalStatus === "pending"
                                    ? "bg-blue-500"
                                    : course.approvalStatus === "approved"
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                }`}
                              ></span>
                              {course.approvalStatus === "pending"
                                ? "Pendente"
                                : course.approvalStatus === "approved"
                                  ? "Aprovado"
                                  : "Rejeitado"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                              <Users size={12} className="text-blue-500" />{" "}
                              {course.enrollmentCount}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                              Formandos
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                              <Star
                                size={12}
                                className="text-brand-accent fill-brand-accent"
                              />{" "}
                              {course.rating}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                              Rating
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Ativar/Desativar */}
                          <button
                            onClick={() => toggleCourseStatus(course.id)}
                            disabled={
                              course.status === "Rascunho" &&
                              course.approvalStatus !== "approved"
                            }
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all active:scale-95 ${
                              course.status === "Rascunho" &&
                              course.approvalStatus !== "approved"
                                ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
                                : course.status === "Publicado"
                                  ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                            }`}
                            title={
                              course.status === "Rascunho" &&
                              course.approvalStatus !== "approved"
                                ? "Aguarde aprovação do administrador"
                                : course.status === "Publicado"
                                  ? "Desativar (Tornar Rascunho)"
                                  : "Ativar (Publicar)"
                            }
                          >
                            {course.status === "Publicado" ? (
                              <Power size={14} />
                            ) : (
                              <Check size={14} />
                            )}
                            {course.status === "Publicado"
                              ? "Desativar"
                              : "Ativar"}
                          </button>

                          <div className="h-6 w-px bg-slate-100 mx-1"></div>

                          <Link
                            to={`/instrutor/cursos/editar/${course.id}`}
                            className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/5 rounded-lg transition-all"
                            title="Editar Curso"
                          >
                            <Edit3 size={18} />
                          </Link>
                          <Link
                            to={`/cursos/${course.id}`}
                            target="_blank"
                            className={`p-2 rounded-lg transition-all ${
                              course.status === "Publicado"
                                ? "text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                                : "text-slate-200 cursor-not-allowed"
                            }`}
                            title={
                              course.status === "Publicado"
                                ? "Ver Página de Vendas"
                                : "Curso não publicado"
                            }
                            onClick={(e) =>
                              course.status !== "Publicado" &&
                              e.preventDefault()
                            }
                          >
                            <Eye size={18} />
                          </Link>
                          <button
                            onClick={() => {
                              setCourseToDelete(course);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Deletar Curso"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Info */}
            <div className="p-6 bg-slate-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs font-medium text-slate-500">
                Mostrando {filteredCourses.length} de {courses.length} cursos
                criados
                {searchValue && ` (busca: "${searchValue}")`}
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-xs font-bold text-slate-400 border border-slate-200 rounded-lg bg-white cursor-not-allowed shadow-sm">
                  Anterior
                </button>
                <button className="px-4 py-2 text-xs font-bold text-brand-green border border-brand-green/20 rounded-lg bg-white hover:bg-brand-green/5 transition-colors shadow-sm">
                  Próximo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && courseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Solicitar Exclusão de Curso
                </h2>
                <p className="text-slate-600 mb-2">
                  Tem certeza que deseja solicitar a exclusão do curso{" "}
                  <strong>{courseToDelete.title}</strong>?
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  O curso será desativado imediatamente e um administrador
                  verificará seu pedido.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setCourseToDelete(null);
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 text-slate-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteCourse}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? "Deletando..." : "Deletar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deletion Request Submitted Modal */}
        {showDeleteRequestModal && courseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                  <Check className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Solicitação Enviada
                </h2>
                <p className="text-slate-600 mb-6">
                  Seu pedido de exclusão para{" "}
                  <strong>{courseToDelete.title}</strong> foi enviado com
                  sucesso. O curso foi desativado e um administrador revisará em
                  breve.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    📋 <strong>Próximo Passo:</strong> Um administrador irá
                    revisar e aprovar ou rejeitar sua solicitação. Você receberá
                    uma notificação quando houver uma decisão.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteRequestModal(false);
                    setCourseToDelete(null);
                  }}
                  className="w-full px-4 py-2.5 bg-brand-green text-white rounded-xl hover:bg-brand-dark transition-all font-semibold"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg font-semibold text-white transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
              toast.type === "success"
                ? "bg-green-600 hover:bg-green-700"
                : toast.type === "error"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
};

const SelectContext = React.createContext<any>(null);

const Select = ({
  children,
  className,
  value,
  onValueChange,
  placeholder,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, isOpen, setIsOpen, placeholder }}
    >
      <div ref={containerRef} className={`flex flex-col gap-2 ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ children }: any) => {
  const { setIsOpen, isOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-green/10 focus:border-brand-green transition-all shadow-sm"
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
};

const SelectValue = () => {
  const { value, placeholder } = React.useContext(SelectContext);
  return (
    <span className={!value ? "text-slate-400" : "text-slate-700"}>
      {value || placeholder}
    </span>
  );
};

const SelectPopover = ({ children }: any) => {
  const { isOpen } = React.useContext(SelectContext);
  if (!isOpen) return null;
  return (
    <div className="relative">
      <div className="absolute top-2 right-0 z-[100] w-full min-w-[12rem] overflow-hidden rounded-xl border border-gray-100 bg-white text-slate-950 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
};

const SelectListBox = ({ children }: any) => {
  return <div className="p-1">{children}</div>;
};

const SelectItem = ({ children, value }: any) => {
  const {
    onValueChange,
    setIsOpen,
    value: selectedValue,
  } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(value);
        setIsOpen(false);
      }}
      className={`relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none hover:bg-slate-50 transition-colors ${
        isSelected
          ? "bg-brand-green/5 text-brand-green font-bold"
          : "text-slate-600"
      }`}
    >
      <span className="truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
};

export default InstructorCoursesPage;
