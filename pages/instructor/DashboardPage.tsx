import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import {
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    BookOpen,
    Check,
    ChevronDown,
    Filter,
    Star,
    TrendingUp,
    Users
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { db } from "../../services/firebase";

const InstructorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [salesFilter, setSalesFilter] = useState("Últimos 7 dias");

  // Estado com dados reais
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeCourses: 0,
    totalStudents: 0,
    avgRating: 0,
    completionRate: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
    activeStudents: 0,
    pendingCertificates: 0,
    totalEarnings: 0,
  });
  const [perCourse, setPerCourse] = useState<
    Array<{
      id: string;
      label: string;
      count: number;
      revenue: number;
      completions?: number;
      rating?: number;
    }>
  >([]);
  const [recentStudents, setRecentStudents] = useState<
    Array<{ id: string; name: string; when: string; course?: string }>
  >([]);
  const [series, setSeries] = useState<Array<{ label: string; value: number }>>(
    [],
  );
  const [courseMetrics, setCourseMetrics] = useState<
    Array<{
      id: string;
      title: string;
      students: number;
      avgCompletion: number;
      revenue: number;
      rating: number;
      status: string;
    }>
  >([]);

  // Helpers
  const parsePriceMZM = (val: any): number => {
    if (typeof val === "number") return val;
    const s = (val || "").toString().trim();
    if (!s) return 0;
    // remove separador milhar . e troca , por .
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  };

  // Carrega cursos, inscrições e submissões do instrutor
  useEffect(() => {
    if (!user?.uid) {
      setStats({
        totalRevenue: 0,
        activeCourses: 0,
        totalStudents: 0,
        avgRating: 0,
        completionRate: 0,
      });
      setPerCourse([]);
      setRecentStudents([]);
      setSeries([]);
      return;
    }

    let enrollUnsubs: Array<() => void> = [];
    let coursesUnsub: (() => void) | null = null;
    let fallbackUnsub: (() => void) | null = null;
    let nameUnsub: (() => void) | null = null;
    let subsUnsub: (() => void) | null = null;

    const recomputeSeries = (
      items: Array<{ ts: Date; amount: number }>,
      days: number,
    ) => {
      // Gera labels diárias dos últimos N dias
      const end = new Date();
      const data: Array<{ label: string; value: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("pt-PT", { weekday: "short" });
        const value = items
          .filter((it) => it.ts.toISOString().slice(0, 10) === key)
          .reduce((acc, it) => acc + it.amount, 0);
        data.push({ label, value });
      }
      setSeries(data);
    };

    const subscribeEnrollments = (courseDocs: any[]) => {
      enrollUnsubs.forEach((u) => u());
      enrollUnsubs = [];
      if (subsUnsub) {
        subsUnsub();
        subsUnsub = null;
      }

      const courseMap: Record<
        string,
        { title: string; certificatePrice: number }
      > = {};
      const courseIds: string[] = [];
      let ratingSum = 0;
      let ratingCount = 0;
      let activeCount = 0;
      courseDocs.forEach((d) => {
        const data: any = d.data();
        courseIds.push(d.id);
        const certificatePrice = parsePriceMZM(data?.certificatePrice);
        courseMap[d.id] = { title: data?.title || "Curso", certificatePrice };
        if (typeof data?.rating === "number") {
          ratingSum += data.rating;
          ratingCount += 1;
        }
        if (data?.isActive || data?.status === "Publicado") activeCount += 1;
      });

      if (courseIds.length === 0) {
        setStats({
          totalRevenue: 0,
          activeCourses: 0,
          totalStudents: 0,
          avgRating: ratingCount ? ratingSum / ratingCount : 0,
          completionRate: 0,
          monthlyRevenue: 0,
          conversionRate: 0,
          activeStudents: 0,
          pendingCertificates: 0,
          totalEarnings: 0,
        });
        setPerCourse([]);
        setRecentStudents([]);
        setSeries([]);
        setCourseMetrics([]);
        return;
      }

      // Series auxiliares em memória
      const allEnrollMap = new Map<string, any>();

      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);

      chunks.forEach((ids) => {
        const qA = query(
          collection(db, "enrollments"),
          where("course_id", "in", ids),
        );
        const qB = query(
          collection(db, "enrollments"),
          where("courseId", "in", ids),
        );

        const handleSnap = async (snap: any) => {
          const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          // Merge em memória (normalizando e deduplicando por doc.id)
          list.forEach((rec: any) => {
            const course_id = rec.course_id || rec.courseId;
            const user_uid = rec.user_uid || rec.userId || rec.uid;
            if (!course_id || !user_uid) return;
            const ts: Date | null = rec?.enrolledAt?.toDate
              ? rec.enrolledAt.toDate()
              : rec?.createdAt?.toDate
                ? rec.createdAt.toDate()
                : null;
            const norm = { ...rec, course_id, user_uid, ts };
            allEnrollMap.set(rec.id, norm);
          });

          // Agregações
          const byCourse = new Map<
            string,
            { label: string; count: number; revenue: number }
          >();
          const seenEnrollIds = new Set<string>();
          const revenueEvents: Array<{ ts: Date; amount: number }> = [];
          const uniqueEnrollmentPairs = new Set<string>();

          Array.from(allEnrollMap.values()).forEach((rec: any) => {
            const c = byCourse.get(rec.course_id) || {
              label:
                courseMap[rec.course_id]?.title || rec.course_title || "Curso",
              count: 0,
              revenue: 0,
            };
            c.count += 1;
            // Receita por certificados pagos (certificatePaid = true)
            if (rec.certificatePaid) {
              c.revenue += rec.certificatePrice || 0;
              if (rec.ts)
                revenueEvents.push({
                  ts: rec.ts,
                  amount: rec.certificatePrice || 0,
                });
            }
            byCourse.set(rec.course_id, c);
            uniqueEnrollmentPairs.add(`${rec.user_uid}::${rec.course_id}`);
            seenEnrollIds.add(rec.id);
          });

          const perCourseArr = Array.from(byCourse.entries())
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.count - a.count);
          const totalStudents = Array.from(
            uniqueEnrollmentPairs.values(),
          ).length;
          const totalRevenue = perCourseArr.reduce(
            (acc, it) => acc + it.revenue,
            0,
          );
          const avgRating = ratingCount ? ratingSum / ratingCount : 0;

          // Calcula receita do mês atual
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthlyRev = revenueEvents
            .filter((e) => e.ts >= monthStart)
            .reduce((acc, e) => acc + e.amount, 0);

          // Taxa de conversão (alunos com certificado pago / total)
          const paidCerts = Array.from(allEnrollMap.values()).filter(
            (e: any) => e.certificatePaid,
          ).length;
          const conversionRate =
            totalStudents > 0
              ? Math.round((paidCerts / totalStudents) * 100)
              : 0;

          // Alunos ativos (últimos 7 dias)
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const activeStudentsCount =
            Array.from(
              new Set(
                revenueEvents.filter((e) => e.ts >= weekAgo).map(() => 1),
              ),
            ).length || totalStudents;

          // Certificados pendentes
          const pending = Array.from(allEnrollMap.values()).filter(
            (e: any) =>
              e.status === "submitted" ||
              (e.certificatePaid === false && e.completed),
          ).length;

          setPerCourse(perCourseArr);
          setStats((prev) => ({
            ...prev,
            totalRevenue,
            totalStudents,
            activeCourses: activeCount,
            avgRating,
            monthlyRevenue: monthlyRev,
            conversionRate,
            activeStudents: activeStudentsCount,
            pendingCertificates: pending,
            totalEarnings: totalRevenue,
          }));

          // Constrói métricas por curso para exibição
          const metricsArray = perCourseArr.map((course) => ({
            id: course.id,
            title: course.label,
            students: course.count,
            avgCompletion: conversionRate,
            revenue: course.revenue,
            rating: avgRating,
            status: "Ativo",
          }));
          setCourseMetrics(metricsArray);

          // Recalcular série conforme filtro atual
          const days =
            salesFilter === "Últimos 30 dias"
              ? 30
              : salesFilter === "Último trimestre"
                ? 90
                : 7;
          recomputeSeries(revenueEvents, days);

          // Alunos recentes (5 últimos)
          const recent = Array.from(allEnrollMap.values())
            .filter((e) => e.ts)
            .sort((a, b) => (b.ts as any) - (a.ts as any))
            .slice(0, 5);
          const withProfiles = await Promise.all(
            recent.map(async (r: any) => {
              try {
                const ps = await getDoc(doc(db, "profiles", r.user_uid));
                const name = ps.exists()
                  ? (ps.data() as any)?.full_name || "Formando"
                  : "Formando";
                const when = r.ts
                  ? new Intl.RelativeTimeFormat("pt-PT", {
                      numeric: "auto",
                    }).format(
                      Math.round((r.ts.getTime() - Date.now()) / 3600000),
                      "hour",
                    )
                  : "";
                const courseName = courseMap[r.course_id]?.title || "Curso";
                return { id: r.user_uid, name, when, course: courseName };
              } catch {
                return {
                  id: r.user_uid,
                  name: "Formando",
                  when: "",
                  course: "Curso",
                };
              }
            }),
          );
          setRecentStudents(withProfiles);
        };

        const u1 = onSnapshot(qA, handleSnap);
        const u2 = onSnapshot(qB, handleSnap);
        enrollUnsubs.push(u1);
        enrollUnsubs.push(u2);
      });

      // Completion rate via submissions (distintos user_uid::course_id)
      subsUnsub = onSnapshot(
        query(
          collection(db, "submissions"),
          where("instructor_uid", "==", user.uid),
        ),
        (snap) => {
          const keys = new Set<string>();
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const k = `${data?.user_uid || ""}::${data?.course_id || ""}`;
            if (data?.user_uid && data?.course_id) keys.add(k);
          });
          const withSubmission = keys.size;
          setStats((prev) => {
            const total = Math.max(1, prev.totalStudents);
            return {
              ...prev,
              completionRate: Math.min(
                100,
                Math.round((withSubmission / total) * 100),
              ),
            };
          });
        },
      );
    };

    // Cursos do instrutor com fallbacks
    coursesUnsub = onSnapshot(
      query(collection(db, "courses"), where("instructor_uid", "==", user.uid)),
      (snap) => {
        if (snap.empty) {
          fallbackUnsub = onSnapshot(
            query(
              collection(db, "courses"),
              where("creator_uid", "==", user.uid),
            ),
            (snap2) => {
              if (snap2.empty) {
                const name = (user.displayName || "").trim();
                if (name) {
                  nameUnsub = onSnapshot(
                    query(
                      collection(db, "courses"),
                      where("instructor", "==", name),
                    ),
                    (snap3) => {
                      subscribeEnrollments(snap3.docs);
                    },
                  );
                } else {
                  subscribeEnrollments([]);
                }
              } else {
                subscribeEnrollments(snap2.docs);
              }
            },
          );
        } else {
          subscribeEnrollments(snap.docs);
        }
      },
    );

    return () => {
      enrollUnsubs.forEach((u) => u());
      if (coursesUnsub) coursesUnsub();
      if (fallbackUnsub) fallbackUnsub();
      if (nameUnsub) nameUnsub();
      if (subsUnsub) subsUnsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, salesFilter]);

  const maxSales = useMemo(
    () => Math.max(1, ...series.map((d) => d.value)),
    [series],
  );

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Dashboard do Instrutor
            </h1>
            <p className="text-slate-500 mt-1">
              Veja como está o desempenho dos seus cursos hoje.
            </p>
          </div>
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              UEM-Cursos online•{" "}
              {new Date().toLocaleDateString("pt-MZ", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Stats Grid - 5 Cards (Including Active Courses) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* REMOVIDO: Cards financeiros - O instrutor não gerencia finanças */}
          {/*
          <InstructorStatCard
            label="Receita Total"
            value={`MZM ${stats.totalRevenue.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="text-emerald-600" />}
            trend={`+${stats.conversionRate}% conv.`}
            trendType="up"
          />
          <InstructorStatCard
            label="Este Mês"
            value={`MZM ${stats.monthlyRevenue.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`}
            icon={<TrendingUp className="text-blue-600" />}
            trend="Revenue do mês"
            trendType="up"
          />
          */}
          <InstructorStatCard
            label="Cursos Ativos"
            value={String(stats.activeCourses).padStart(2, "0")}
            icon={<BookOpen className="text-brand-green" />}
            trend="Publicados"
            trendType="neutral"
          />
          <InstructorStatCard
            label="Total de Formandos"
            value={stats.totalStudents.toString()}
            icon={<Users className="text-brand-accent" />}
            trend={`${stats.activeStudents} ativos`}
            trendType="up"
          />
          {/* REMOVIDO: Taxa de Conversão - Métrica financeira */}
          {/*
          <InstructorStatCard
            label="Taxa de Conversão"
            value={`${stats.conversionRate}%`}
            icon={<TrendingUp className="text-purple-600" />}
            trend="com certificado"
            trendType={stats.conversionRate > 50 ? "up" : "down"}
          />
          */}
          <InstructorStatCard
            label="Avaliação Média"
            value={stats.avgRating.toFixed(1)}
            icon={<Star className="text-brand-accent fill-brand-accent" />}
            trend="global"
            trendType="neutral"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Alertas de Performance */}
            {/* REMOVIDO: Alerta de Taxa de Conversão - Métrica financeira */}
            {/*
            {stats.conversionRate < 30 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle
                  className="text-amber-600 mt-1 flex-shrink-0"
                  size={20}
                />
                <div>
                  <p className="font-bold text-amber-900">
                    Taxa de Conversão Baixa
                  </p>
                  <p className="text-xs text-amber-700">
                    Apenas {stats.conversionRate}% dos formandos compraram
                    certificados. Considere adicionar mais conteúdo de
                    qualidade.
                  </p>
                </div>
              </div>
            )}
            */}

            {stats.pendingCertificates > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Check className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="font-bold text-blue-900">
                    Certificados Pendentes
                  </p>
                  <p className="text-xs text-blue-700">
                    Há {stats.pendingCertificates} certificados aguardando
                    aprovação. Revise-os para melhorar satisfação.
                  </p>
                </div>
              </div>
            )}

            {/* Desempenho por Curso */}
            {courseMetrics.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-brand-green" />
                  <h3 className="font-bold text-slate-800">
                    Desempenho por Curso
                  </h3>
                </div>
                <div className="space-y-4">
                  {courseMetrics.slice(0, 5).map((course) => (
                    <div
                      key={course.id}
                      className="border border-slate-50 rounded-lg p-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-2">
                          {course.title}
                        </h4>
                        <span className="text-xs font-bold bg-brand-green/10 text-brand-green px-2 py-1 rounded">
                          Ativo
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {course.students}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Formandos
                          </p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {stats.completionRate}%
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Conclusão
                          </p>
                        </div>
                        <div>
                          {/* REMOVIDO: Dados de receita */}
                          {/*
                          <p className="text-2xl font-bold text-emerald-600">
                            MZM {(course.revenue / 1000).toFixed(0)}k
                          </p>
                          <p className="text-[10px] text-slate-500">Receita</p>
                          */}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-500">
                            ★ {course.rating.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-slate-500">Nota</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOVO: Estudantes Inscritos por Curso (Acima do gráfico de crescimento) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-green" />
                  <h3 className="font-bold text-slate-800">
                    Estudantes Inscritos por Curso
                  </h3>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total: {stats.totalStudents}
                </span>
              </div>

              <div className="space-y-5">
                {perCourse.slice(0, 4).map((c, idx) => (
                  <CourseRegistrationBar
                    key={c.id}
                    label={c.label}
                    count={c.count}
                    total={Math.max(1, stats.totalStudents)}
                    color={
                      [
                        "bg-blue-500",
                        "bg-emerald-500",
                        "bg-brand-green",
                        "bg-brand-accent",
                      ][idx % 4]
                    }
                  />
                ))}
                {perCourse.length === 0 && (
                  <div className="text-xs text-slate-400">
                    Sem inscrições ainda.
                  </div>
                )}
              </div>
            </div>

            {/* REMOVIDO: Gráfico de Crescimento de Vendas - Conteúdo financeiro */}
          </div>
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                Formandos Recentes
                <button className="text-xs text-brand-green font-bold hover:underline">
                  Ver todos
                </button>
              </h3>
              <div className="space-y-4">
                {recentStudents.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=ebf5ef&color=0e7038`}
                        className="w-10 h-10 rounded-full border-2 border-brand-green/10 shadow-sm"
                        alt="Student"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {s.course || "Curso"} • {s.when || "agora"}
                        </p>
                      </div>
                    </div>
                    <div className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200 uppercase">
                      ✓ Ativo
                    </div>
                  </div>
                ))}
                {recentStudents.length === 0 && (
                  <div className="text-xs text-slate-400 py-4">
                    Nenhuma inscrição recente.
                  </div>
                )}
              </div>
            </div>

            {/* Dica: Qualidade do Conteúdo */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl">
              {/* Decorative blob */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-green/20 rounded-full blur-3xl"></div>

              <div className="relative z-10">
                <div className="bg-brand-green/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="text-brand-accent w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  Dica: Melhore a Qualidade
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-5">
                  Formandos que recebem feedback nos primeiros 7 dias de estudo
                  têm 85% mais engajamento no curso e completam com sucesso.
                  Mantenha uma comunicação ativa!
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-5">
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="font-bold text-brand-green">
                      {stats.activeStudents}
                    </p>
                    <p className="text-slate-400">formandos ativos agora</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="font-bold text-blue-400">
                      {stats.completionRate}%
                    </p>
                    <p className="text-slate-400">taxa de conclusão</p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-brand-green hover:bg-brand-dark text-white rounded-lg font-bold text-xs transition-all shadow-lg shadow-black/30">
                  Acessar Mensagens
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
};

// --- Helper Components ---

const InstructorStatCard = ({ label, value, icon, trend, trendType }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3 group hover:border-brand-green/30 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-brand-green/5 transition-colors">
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div
        className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
          trendType === "up"
            ? "bg-emerald-50 text-emerald-600"
            : trendType === "down"
              ? "bg-red-50 text-red-600"
              : "bg-slate-50 text-slate-500"
        }`}
      >
        {trendType === "up" && <ArrowUpRight size={10} />}
        {trendType === "down" && <ArrowDownRight size={10} />}
        {trend}
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-green transition-colors">
        {value}
      </h3>
    </div>
  </div>
);

const CourseRegistrationBar = ({ label, count, total, color }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
      <span className="text-xs font-bold text-slate-700 truncate max-w-[70%]">
        {label}
      </span>
      <span className="text-[10px] font-black text-slate-400">
        {count} FORMANDOS
      </span>
    </div>
    <div className="w-full h-2.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
      <div
        className={`${color} h-full rounded-full transition-all duration-1000 ease-out shadow-sm`}
        style={{ width: `${(count / total) * 100}%` }}
      ></div>
    </div>
  </div>
);

// --- Custom Select Components for Dashboard ---

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
      <div ref={containerRef} className={`relative ${className}`}>
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
      className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-green/10 focus:border-brand-green transition-all shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        {children}
      </div>
      <ChevronDown
        className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
};

const SelectValue = () => {
  const { value, placeholder } = React.useContext(SelectContext);
  return (
    <span className={!value ? "text-slate-400" : "text-slate-800 truncate"}>
      {value || placeholder}
    </span>
  );
};

const SelectPopover = ({ children }: any) => {
  const { isOpen } = React.useContext(SelectContext);
  if (!isOpen) return null;
  return (
    <div className="absolute top-full mt-2 left-0 z-[100] w-full min-w-[10rem] overflow-hidden rounded-xl border border-gray-100 bg-white text-slate-950 shadow-xl animate-in fade-in zoom-in-95 duration-200">
      {children}
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
      className={`relative flex w-full cursor-default select-none items-center rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold outline-none hover:bg-slate-50 transition-colors ${
        isSelected ? "bg-brand-green/5 text-brand-green" : "text-slate-600"
      }`}
    >
      <span className="truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
};

export default InstructorDashboardPage;
