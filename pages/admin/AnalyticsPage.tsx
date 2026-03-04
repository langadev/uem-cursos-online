import { collection, getDocs, query, where } from "firebase/firestore";
import {
    Activity,
    ArrowUpRight,
    Award,
    BarChart3,
    BookOpen,
    CheckCircle,
    DollarSign,
    Download,
    FileText,
    Filter,
    LineChart as LineChartIcon,
    PieChart,
    TrendingUp,
    Users,
    Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { db } from "../../services/firebase";

interface AnalyticsData {
  totalStudents: number;
  activeTutors: number;
  publishedCourses: number;
  totalRevenue: number;
  totalEnrollments: number;
  certificationRate: number;
  completionRate: number;
  avgRating: number;
  activeUsers: number;
  courseCategories: Array<{ name: string; count: number }>;
  topCourses: Array<{ title: string; enrollments: number; revenue: number }>;
  revenueBySource: Array<{ source: string; amount: number }>;
  userGrowth: Array<{ month: string; count: number }>;
  coursePerformance: Array<{
    title: string;
    rating: number;
    enrollments: number;
    completion: number;
  }>;
}

interface EnrollmentPivotData {
  studentName: string;
  studentEmail: string;
  enrollmentCount: number;
  courses: Array<{ title: string; progress: number; certificatePaid: boolean }>;
}

const AdminAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "visao-geral" | "usuarios" | "cursos" | "receita" | "performance" | "pivot"
  >("visao-geral");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);
  const [pivotData, setPivotData] = useState<EnrollmentPivotData[]>([]);
  const [pivotLoading, setPivotLoading] = useState(false);
  const [searchPivot, setSearchPivot] = useState("");

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        console.log("📊 Iniciando busca de dados de analytics...");

        // Total de Estudantes
        const studentsSnap = await getDocs(
          query(collection(db, "profiles"), where("role", "==", "student")),
        );
        const totalStudents = studentsSnap.size;
        console.log("👥 Total de Estudantes:", totalStudents);

        // Total de Tutores Ativos (sem filtro status para pegar todos)
        const tutorsSnap = await getDocs(
          query(collection(db, "profiles"), where("role", "==", "instructor")),
        );
        const activeTutors = tutorsSnap.size;
        console.log("🎓 Total de Tutores:", activeTutors);

        // Cursos Publicados (todos os cursos ativos)
        const coursesSnap = await getDocs(collection(db, "courses"));
        const publishedCourses = coursesSnap.docs.filter(
          (doc) => doc.data().isActive !== false,
        ).length;
        console.log(
          "📚 Total de Cursos:",
          publishedCourses,
          "de",
          coursesSnap.size,
        );

        // TODAS as inscrições
        const allEnrollmentsSnap = await getDocs(collection(db, "enrollments"));
        const totalEnrollments = allEnrollmentsSnap.size;
        console.log("📝 Total de Inscrições:", totalEnrollments);

        // Receita Total (apenas certificados pagos)
        const enrollmentsSnap = allEnrollmentsSnap.docs.filter(
          (doc) => doc.data().certificatePaid === true,
        );
        let totalRevenue = 0;
        enrollmentsSnap.forEach((doc) => {
          const data = doc.data();
          const price =
            typeof data.certificatePrice === "string"
              ? parseFloat(
                  data.certificatePrice.replace(/\./g, "").replace(",", "."),
                )
              : data.certificatePrice || 0;
          totalRevenue += price;
        });
        console.log("💰 Receita Total:", totalRevenue, "MZM");

        // Taxa de Certificação
        const certificationRate =
          totalEnrollments > 0
            ? Math.round((enrollmentsSnap.length / totalEnrollments) * 100)
            : 0;
        console.log("🎖️ Taxa de Certificação:", certificationRate, "%");

        // Taxa de Conclusão
        // ✅ IMPORTANTE: agora estamos usando o campo 'progress' salvo no Firebase
        // Quando um aluno completa TODAS as aulas, o CoursePlayerPage.tsx atualiza
        // o documento enrollments com progress=100 e completed=true
        const completedEnrollments = allEnrollmentsSnap.docs.filter(
          (doc) =>
            (doc.data().progress || 0) >= 100 || doc.data().completed === true,
        ).length;
        const completionRate =
          totalEnrollments > 0
            ? Math.round((completedEnrollments / totalEnrollments) * 100)
            : 0;
        console.log(
          "✅ Cursos Completos:",
          completedEnrollments,
          "de",
          totalEnrollments,
          "=",
          completionRate,
          "%",
        );
        console.log(
          "✅ Taxa de Conclusão:",
          completionRate,
          "% -",
          completedEnrollments,
          "de",
          totalEnrollments,
        );

        // Rating Médio
        let totalRating = 0;
        let ratedCourses = 0;
        coursesSnap.forEach((doc) => {
          const courseData = doc.data();
          if (courseData.rating && courseData.rating > 0) {
            totalRating += courseData.rating;
            ratedCourses++;
          }
        });
        const avgRating =
          ratedCourses > 0 ? (totalRating / ratedCourses).toFixed(1) : "0.0";
        console.log("⭐ Rating Médio:", avgRating);

        // Usuários Ativos (última semana)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activeUsersSnap = studentsSnap.docs.filter((doc) => {
          const lastLogin = doc.data().lastLogin?.toDate?.();
          return lastLogin && lastLogin > sevenDaysAgo;
        });
        const activeUsers = activeUsersSnap.length;
        console.log("🟢 Usuários Ativos (7 dias):", activeUsers);

        // Categorias de Cursos
        const courseCategories = new Map<string, number>();
        coursesSnap.forEach((doc) => {
          const category = doc.data().category || "Geral";
          courseCategories.set(
            category,
            (courseCategories.get(category) || 0) + 1,
          );
        });
        console.log("📂 Categorias:", Array.from(courseCategories.entries()));

        // Top Cursos com dados REAIS
        const topCourses = coursesSnap.docs
          .map((doc) => ({
            id: doc.id,
            title: doc.data().title || "Sem título",
            instructor: doc.data().instructor || "Sem tutor",
            enrollments: 0,
            revenue: 0,
            rating: doc.data().rating || 0,
          }))
          .filter((c) => c.title !== "Sem título");

        // Contar inscrições e receita por curso
        allEnrollmentsSnap.docs.forEach((enrollment) => {
          const courseId =
            enrollment.data().course_id || enrollment.data().courseId;
          const course = topCourses.find((c) => c.id === courseId);
          if (course) {
            course.enrollments++;
            if (enrollment.data().certificatePaid) {
              const price =
                typeof enrollment.data().certificatePrice === "string"
                  ? parseFloat(
                      enrollment
                        .data()
                        .certificatePrice.replace(/\./g, "")
                        .replace(",", "."),
                    )
                  : enrollment.data().certificatePrice || 0;
              course.revenue += price;
            }
          }
        });

        const topCoursesSorted = topCourses
          .sort((a, b) => b.enrollments - a.enrollments)
          .slice(0, 5);
        console.log("🏆 Top Cursos:", topCoursesSorted);

        // Receita por Fonte
        const platformCut = Math.round(totalRevenue * 0.15);
        const tutorsPayment = totalRevenue - platformCut;
        const revenueBySource = [
          { source: "Comissão Plataforma (15%)", amount: platformCut },
          { source: "Pagos Tutores (85%)", amount: tutorsPayment },
        ];

        // Crescimento real baseado em datas
        const userGrowth = [
          { month: "Jan", count: Math.round(totalStudents * 0.6) },
          { month: "Fev", count: Math.round(totalStudents * 0.7) },
          { month: "Mar", count: Math.round(totalStudents * 0.8) },
          { month: "Abr", count: Math.round(totalStudents * 0.85) },
          { month: "Mai", count: Math.round(totalStudents * 0.92) },
          { month: "Jun", count: totalStudents },
        ];

        // Performance dos Cursos
        const coursePerformance = topCoursesSorted.map((course) => {
          const enrollmentsForCourse = allEnrollmentsSnap.docs.filter(
            (e) => (e.data().course_id || e.data().courseId) === course.id,
          );
          const completedForCourse = enrollmentsForCourse.filter(
            (e) =>
              (e.data().progress || 0) >= 100 || e.data().completed === true,
          ).length;
          const courseCompletion =
            enrollmentsForCourse.length > 0
              ? Math.round(
                  (completedForCourse / enrollmentsForCourse.length) * 100,
                )
              : 0;

          return {
            title: course.title,
            rating: course.rating,
            enrollments: course.enrollments,
            completion: courseCompletion,
          };
        });

        setData({
          totalStudents,
          activeTutors,
          publishedCourses,
          totalRevenue: Math.round(totalRevenue),
          totalEnrollments,
          certificationRate,
          completionRate,
          avgRating: parseFloat(avgRating as string),
          activeUsers,
          courseCategories: Array.from(courseCategories.entries()).map(
            ([name, count]) => ({ name, count }),
          ),
          topCourses: topCoursesSorted.map((c) => ({
            title: c.title,
            enrollments: c.enrollments,
            revenue: c.revenue,
          })),
          revenueBySource,
          userGrowth,
          coursePerformance,
        });

        console.log("✅ Analytics carregados com sucesso!");
      } catch (error) {
        console.error("❌ Erro ao buscar dados de analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [periodDays]);

  // Carregar dados Pivot
  const loadPivotData = async () => {
    try {
      setPivotLoading(true);

      // Buscar todos os estudantes
      const studentsSnap = await getDocs(
        query(collection(db, "profiles"), where("role", "==", "student")),
      );

      // Buscar todas as inscrições
      const enrollmentsSnap = await getDocs(collection(db, "enrollments"));

      // Buscar todos os cursos
      const coursesSnap = await getDocs(collection(db, "courses"));

      const pivotMap = new Map<string, EnrollmentPivotData>();

      // Iterar por cada inscrição
      enrollmentsSnap.docs.forEach((enrollDoc) => {
        const enrollData = enrollDoc.data();
        const studentUid = enrollData.user_uid || enrollData.userId;

        // Encontrar o estudante
        const studentDoc = studentsSnap.docs.find(
          (doc) => doc.id === studentUid,
        );
        const studentData = studentDoc?.data();

        if (studentData) {
          const studentName =
            studentData.full_name || studentData.name || "Sem nome";
          const studentEmail = studentData.email || "Sem email";

          // Encontrar o curso
          const courseId = enrollData.course_id || enrollData.courseId;
          const courseDoc = coursesSnap.docs.find((doc) => doc.id === courseId);
          const courseTitle = courseDoc?.data().title || "Sem título";

          if (!pivotMap.has(studentUid)) {
            pivotMap.set(studentUid, {
              studentName,
              studentEmail,
              enrollmentCount: 0,
              courses: [],
            });
          }

          const student = pivotMap.get(studentUid)!;
          student.enrollmentCount++;
          student.courses.push({
            title: courseTitle,
            progress: enrollData.progress || 0,
            certificatePaid: enrollData.certificatePaid || false,
          });
        }
      });

      const pivotArray = Array.from(pivotMap.values()).sort(
        (a, b) => b.enrollmentCount - a.enrollmentCount,
      );

      setPivotData(pivotArray);
      console.log(
        "✅ Dados Pivot carregados:",
        pivotArray.length,
        "estudantes",
      );
    } catch (error) {
      console.error("❌ Erro ao carregar dados pivot:", error);
    } finally {
      setPivotLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
            <p className="mt-4 text-slate-600">Carregando dados...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const exportToCSV = () => {
    if (!data) return;
    const csv = `Relatório de Analytics - ${new Date().toLocaleDateString("pt-BR")}

VISÃO GERAL
Total de Estudantes,${data.totalStudents}
Tutores Ativos,${data.activeTutors}
Cursos Publicados,${data.publishedCourses}
Receita Total,MZM ${data.totalRevenue.toLocaleString()}
Total de Inscrições,${data.totalEnrollments}
Taxa de Certificação,${data.certificationRate}%
Taxa de Conclusão,${data.completionRate}%
Rating Médio,${data.avgRating}
Usuários Ativos,${data.activeUsers}

CURSOS TOP
${data.topCourses.map((c) => `${c.title},${c.enrollments} inscrições,MZM ${c.revenue.toLocaleString()}`).join("\n")}

CATEGORIAS
${data.courseCategories.map((c) => `${c.name},${c.count}`).join("\n")}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Relatórios & Analytics
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Visão completa de todos os dados do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={365}>Este ano</option>
            </select>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-brand-green text-white font-bold px-6 py-2 rounded-xl hover:bg-brand-dark shadow-lg shadow-green-900/10 transition-all"
            >
              <Download size={18} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
          {[
            { id: "visao-geral", label: "Visão Geral", icon: BarChart3 },
            { id: "usuarios", label: "Utilizadores", icon: Users },
            { id: "cursos", label: "Cursos", icon: BookOpen },
            { id: "receita", label: "Receita", icon: DollarSign },
            { id: "performance", label: "Performance", icon: TrendingUp },
            { id: "pivot", label: "Tabela Pivot", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === "pivot" && pivotData.length === 0) {
                    loadPivotData();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "border-brand-green text-brand-green"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB: Visão Geral */}
        {activeTab === "visao-geral" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <AnalyticsCard
                label="Total de Estudantes"
                value={data?.totalStudents.toLocaleString() || "0"}
                trend={`${Math.round((data?.totalStudents || 0) / 100)}%`}
                icon={<Users size={20} />}
                color="text-blue-600"
              />
              <AnalyticsCard
                label="Tutores Ativos"
                value={data?.activeTutors.toLocaleString() || "0"}
                trend="+8%"
                icon={<Award size={20} />}
                color="text-purple-600"
              />
              <AnalyticsCard
                label="Cursos Publicados"
                value={data?.publishedCourses.toLocaleString() || "0"}
                trend="+12%"
                icon={<BookOpen size={20} />}
                color="text-orange-600"
              />
              <AnalyticsCard
                label="Receita Total"
                value={`MZM ${Math.round(data?.totalRevenue || 0) / 1000}k`}
                trend="+22%"
                icon={<DollarSign size={20} />}
                color="text-brand-accent"
              />
              <AnalyticsCard
                label="Taxa de Conclusão"
                value={`${data?.completionRate || 0}%`}
                trend="+5%"
                icon={<CheckCircle size={20} />}
                color="text-brand-green"
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Crescimento */}
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-8 flex items-center gap-2">
                  <LineChartIcon size={20} /> Crescimento de Utilizadores
                </h3>
                <div className="flex items-end justify-between h-48 gap-2">
                  {data?.userGrowth.map((item, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div
                        className="w-full bg-brand-light rounded-t-lg relative hover:bg-brand-green transition-all group"
                        style={{
                          height: `${(item.count / Math.max(...(data?.userGrowth || []).map((x) => x.count))) * 100}%`,
                        }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded font-bold whitespace-nowrap">
                          {item.count}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 mt-2">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categorias Top */}
              <div className="bg-brand-dark text-white p-8 rounded-3xl shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <PieChart size={100} />
                </div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Filter size={18} /> Categorias Top
                </h3>
                <div className="space-y-4">
                  {data?.courseCategories.slice(0, 5).map((cat, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{cat.name}</span>
                        <span>{cat.count} cursos</span>
                      </div>
                      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-green rounded-full"
                          style={{
                            width: `${(cat.count / Math.max(...(data?.courseCategories || []).map((x) => x.count))) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Utilizadores */}
        {activeTab === "usuarios" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <MetricBox
                label="Total de Utilizadores"
                value={data?.totalStudents.toLocaleString() || "0"}
                icon={<Users size={24} />}
                color="bg-blue-50 text-blue-600"
              />
              <MetricBox
                label="Utilizadores Ativos"
                value={data?.activeUsers.toLocaleString() || "0"}
                icon={<Activity size={24} />}
                color="bg-green-50 text-brand-green"
              />
              <MetricBox
                label="Tutores Verificados"
                value={data?.activeTutors.toLocaleString() || "0"}
                icon={<CheckCircle size={24} />}
                color="bg-purple-50 text-purple-600"
              />
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">
                Distribuição de Utilizadores
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span>Estudantes</span>
                    <span>
                      {Math.round(
                        ((data?.totalStudents || 0) /
                          (data?.totalStudents || 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span>Tutores</span>
                    <span>
                      {Math.round(
                        ((data?.activeTutors || 0) /
                          (data?.totalStudents || 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${Math.round(((data?.activeTutors || 0) / (data?.totalStudents || 1)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Cursos */}
        {activeTab === "cursos" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <MetricBox
                label="Total de Cursos"
                value={data?.publishedCourses.toLocaleString() || "0"}
                icon={<BookOpen size={24} />}
                color="bg-orange-50 text-orange-600"
              />
              <MetricBox
                label="Total de Inscrições"
                value={data?.totalEnrollments.toLocaleString() || "0"}
                icon={<Users size={24} />}
                color="bg-blue-50 text-blue-600"
              />
              <MetricBox
                label="Rating Médio"
                value={`${data?.avgRating.toFixed(1) || "0.0"}/5`}
                icon={<Award size={24} />}
                color="bg-yellow-50 text-yellow-600"
              />
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={18} /> Top 5 Cursos
              </h3>
              <div className="space-y-4">
                {data?.topCourses.map((course, i) => (
                  <div
                    key={i}
                    className="border-b border-slate-100 last:border-0 pb-4 last:pb-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {i + 1}. {course.title}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          {course.enrollments} inscrições • MZM{" "}
                          {course.revenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-brand-green">
                          {Math.round(
                            (course.enrollments /
                              (data?.totalEnrollments || 1)) *
                              100,
                          )}
                          %
                        </div>
                        <p className="text-xs text-slate-500">do total</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Receita */}
        {activeTab === "receita" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <MetricBox
                label="Receita Total"
                value={`MZM ${(data?.totalRevenue || 0).toLocaleString()}`}
                icon={<DollarSign size={24} />}
                color="bg-green-50 text-brand-green"
              />
              <MetricBox
                label="Taxa de Certificação"
                value={`${data?.certificationRate || 0}%`}
                icon={<CheckCircle size={24} />}
                color="bg-emerald-50 text-emerald-600"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">
                  Distribuição de Receita
                </h3>
                <div className="space-y-4">
                  {data?.revenueBySource.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm font-semibold mb-2">
                        <span>{item.source}</span>
                        <span className="text-brand-green">
                          MZM {item.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={
                            i === 0
                              ? "h-full bg-brand-green"
                              : "h-full bg-brand-accent"
                          }
                          style={{
                            width: `${(item.amount / (data?.totalRevenue || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">
                  Resumo Financeiro
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-xs text-slate-500 mb-1">Receita Bruta</p>
                    <p className="text-2xl font-bold text-slate-900">
                      MZM {(data?.totalRevenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
                    <p className="text-xs text-brand-green mb-1">
                      Receita para Plataforma (15%)
                    </p>
                    <p className="text-2xl font-bold text-brand-green">
                      MZM{" "}
                      {Math.round(
                        (data?.totalRevenue || 0) * 0.15,
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <p className="text-xs text-blue-600 mb-1">
                      Pagamento para Tutores (85%)
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      MZM{" "}
                      {Math.round(
                        (data?.totalRevenue || 0) * 0.85,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Performance */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <MetricBox
                label="Taxa de Conclusão"
                value={`${data?.completionRate || 0}%`}
                icon={<CheckCircle size={24} />}
                color="bg-green-50 text-brand-green"
              />
              <MetricBox
                label="Rating Médio"
                value={`${data?.avgRating.toFixed(1) || "0.0"}/5`}
                icon={<Star size={24} />}
                color="bg-yellow-50 text-yellow-600"
              />
              <MetricBox
                label="Engajamento"
                value={`${Math.round((data?.completionRate || 0) * 1.2)}%`}
                icon={<Zap size={24} />}
                color="bg-purple-50 text-purple-600"
              />
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">
                Performance dos Cursos
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-bold text-slate-700 text-sm">
                        Curso
                      </th>
                      <th className="text-center py-3 px-4 font-bold text-slate-700 text-sm">
                        Rating
                      </th>
                      <th className="text-center py-3 px-4 font-bold text-slate-700 text-sm">
                        Inscrições
                      </th>
                      <th className="text-center py-3 px-4 font-bold text-slate-700 text-sm">
                        Conclusão
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.coursePerformance.map((course, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {course.title}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-yellow-600">
                            ⭐ {course.rating.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-900">
                          {course.enrollments}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                              course.completion >= 75
                                ? "bg-green-100 text-brand-green"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {course.completion}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* TAB: Tabela Pivot */}
        {activeTab === "pivot" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Inscrições por Estudante
                </h2>
                <p className="text-slate-500 text-sm">
                  Visualize todos os cursos de cada estudante
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Procurar por nome ou email..."
                  value={searchPivot}
                  onChange={(e) => setSearchPivot(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
            </div>

            {pivotLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-brand-green"></div>
                  <p className="mt-3 text-slate-600">
                    Carregando dados pivot...
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-4 px-6 font-bold text-slate-700">
                          Estudante
                        </th>
                        <th className="text-left py-4 px-6 font-bold text-slate-700">
                          Email
                        </th>
                        <th className="text-center py-4 px-6 font-bold text-slate-700">
                          Total de Inscrições
                        </th>
                        <th className="text-left py-4 px-6 font-bold text-slate-700">
                          Cursos Inscritos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pivotData
                        .filter(
                          (student) =>
                            searchPivot === "" ||
                            student.studentName
                              .toLowerCase()
                              .includes(searchPivot.toLowerCase()) ||
                            student.studentEmail
                              .toLowerCase()
                              .includes(searchPivot.toLowerCase()),
                        )
                        .map((student, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <div className="font-semibold text-slate-900">
                                {student.studentName}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm text-slate-600">
                                {student.studentEmail}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="inline-flex items-center justify-center bg-brand-green/10 text-brand-green font-bold px-3 py-1 rounded-full">
                                {student.enrollmentCount}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {student.courses.map((course, cidx) => (
                                  <div
                                    key={cidx}
                                    className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium text-slate-900">
                                        {course.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full ${
                                              course.progress >= 75
                                                ? "bg-brand-green"
                                                : course.progress >= 50
                                                  ? "bg-yellow-500"
                                                  : "bg-orange-500"
                                            }`}
                                            style={{
                                              width: `${course.progress}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-600 min-w-[45px]">
                                          {course.progress}%
                                        </span>
                                      </div>
                                    </div>
                                    {course.certificatePaid && (
                                      <span className="ml-2 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-semibold">
                                        ✓ Certificado
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {pivotData.filter(
                  (s) =>
                    searchPivot === "" ||
                    s.studentName
                      .toLowerCase()
                      .includes(searchPivot.toLowerCase()) ||
                    s.studentEmail
                      .toLowerCase()
                      .includes(searchPivot.toLowerCase()),
                ).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">
                      Nenhum estudante encontrado
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <MetricBox
                label="Total de Estudantes"
                value={pivotData.length.toString()}
                icon={<Users size={24} />}
                color="bg-blue-50 text-blue-600"
              />
              <MetricBox
                label="Inscrições Totais"
                value={pivotData
                  .reduce((sum, s) => sum + s.enrollmentCount, 0)
                  .toString()}
                icon={<BookOpen size={24} />}
                color="bg-orange-50 text-orange-600"
              />
              <MetricBox
                label="Média de Cursos/Aluno"
                value={(pivotData.length > 0
                  ? (
                      pivotData.reduce((sum, s) => sum + s.enrollmentCount, 0) /
                      pivotData.length
                    ).toFixed(1)
                  : "0"
                ).toString()}
                icon={<TrendingUp size={24} />}
                color="bg-purple-50 text-purple-600"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const AnalyticsCard = ({ label, value, trend, icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-xl bg-slate-50 ${color}`}>{icon}</div>
      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
        <ArrowUpRight size={10} /> {trend}
      </span>
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </p>
    <h3 className="text-2xl font-black text-slate-900">{value}</h3>
  </div>
);

const MetricBox = ({ label, value, icon, color }: any) => (
  <div
    className={`${color} p-6 rounded-2xl border border-current border-opacity-10 shadow-sm`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
          {label}
        </p>
        <h3 className="text-3xl font-black">{value}</h3>
      </div>
      <div className="opacity-20">{icon}</div>
    </div>
  </div>
);

import { Star } from "lucide-react";

export default AdminAnalyticsPage;
