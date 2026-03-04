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
    BookOpen,
    Calendar,
    CheckCircle,
    MessageSquare,
    TrendingUp,
    Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { db } from "../../services/firebase";

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [periodLabel] = useState("Últimos 30 dias");
  const periodDays = 30;

  // Métricas pedagógicas
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [avgEngagement, setAvgEngagement] = useState(0);
  const [certificatesIssued, setCertificatesIssued] = useState(0);
  const [answersResolved, setAnswersResolved] = useState(0);
  const [classesCompleted, setClassesCompleted] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [regions, setRegions] = useState<
    Array<{ name: string; count: number }>
  >([]);

  useEffect(() => {
    if (!user?.uid) {
      setTotalEnrollments(0);
      setCompletionRate(0);
      setAvgEngagement(0);
      setCertificatesIssued(0);
      setAnswersResolved(0);
      setClassesCompleted(0);
      setAvgRating(0);
      setRegions([]);
      return;
    }

    let coursesUnsub: (() => void) | null = null;
    let fallbackUnsub: (() => void) | null = null;
    let nameUnsub: (() => void) | null = null;
    let enrollUnsubs: Array<() => void> = [];
    let subsUnsub: (() => void) | null = null;
    let certsUnsub: (() => void) | null = null;
    let questionsUnsubs: Array<() => void> = [];
    let ratingsUnsub: (() => void) | null = null;

    const now = Date.now();
    const since = now - periodDays * 24 * 3600 * 1000;

    const subscribeCore = (courseDocs: any[]) => {
      enrollUnsubs.forEach((u) => u());
      enrollUnsubs = [];

      const courseIds: string[] = [];
      courseDocs.forEach((d) => {
        courseIds.push(d.id);
      });

      if (courseIds.length === 0) {
        setTotalEnrollments(0);
        setCompletionRate(0);
        setRegions([]);
        return;
      }

      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);

      const enrolls = new Map<string, any>();
      let loadedChunks = 0;

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
          snap.docs.forEach((d: any) => {
            const data: any = d.data();
            const course_id = data.course_id || data.courseId;
            const user_uid = data.user_uid || data.userId || data.uid;
            const ts: Date | null = data?.enrolledAt?.toDate
              ? data.enrolledAt.toDate()
              : data?.createdAt?.toDate
                ? data.createdAt.toDate()
                : null;
            if (!course_id || !user_uid || !ts) return;
            if (ts.getTime() < since) return;
            enrolls.set(d.id, {
              id: d.id,
              course_id,
              user_uid,
              ts,
              completed: data.completed || false,
            });
          });

          loadedChunks++;

          // Total de inscrições únicas
          const uniqueEnrollPairs = new Set<string>();
          const uniqueStudents = new Set<string>();
          enrolls.forEach((e: any) => {
            uniqueEnrollPairs.add(`${e.user_uid}::${e.course_id}`);
            uniqueStudents.add(e.user_uid);
          });
          setTotalEnrollments(uniqueStudents.size);

          // Taxa de conclusão
          const completed = Array.from(enrolls.values()).filter(
            (e: any) => e.completed,
          ).length;
          const rate = Math.round(
            (completed / Math.max(1, enrolls.size)) * 100,
          );
          setCompletionRate(rate);

          // Regiões dos formandos
          const uniqueUsers = Array.from(uniqueStudents).slice(0, 50);
          const profs = await Promise.all(
            uniqueUsers.map(async (uid: string) => {
              try {
                const ps = await getDoc(doc(db, "profiles", uid));
                return ps.exists() ? (ps.data() as any) : null;
              } catch {
                return null;
              }
            }),
          );
          const counts = new Map<string, number>();
          profs.forEach((p) => {
            const country = (p?.country ||
              p?.location ||
              "Moçambique") as string;
            counts.set(country, (counts.get(country) || 0) + 1);
          });
          const regionArr = Array.from(counts.entries()).map(
            ([name, count]) => ({ name, count }),
          );
          regionArr.sort((a, b) => b.count - a.count);
          setRegions(regionArr);
        };

        const u1 = onSnapshot(qA, handleSnap);
        const u2 = onSnapshot(qB, handleSnap);
        enrollUnsubs.push(u1);
        enrollUnsubs.push(u2);
      });

      // Submissões (engajamento e aulas concluídas)
      subsUnsub = onSnapshot(
        query(
          collection(db, "submissions"),
          where("instructor_uid", "==", user.uid),
        ),
        (snap) => {
          let count = 0;
          const pairs = new Set<string>();
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const ts: Date | null = data?.submittedAt?.toDate
              ? data.submittedAt.toDate()
              : data?.createdAt?.toDate
                ? data.createdAt.toDate()
                : null;
            if (ts && ts.getTime() >= since) {
              count += 1;
              if (data?.user_uid && data?.course_id)
                pairs.add(`${data.user_uid}::${data.course_id}`);
            }
          });
          setClassesCompleted(count);
          const engaged = pairs.size;
          const baseline = Math.max(1, totalEnrollments);
          setAvgEngagement(
            Math.min(100, Math.round((engaged / baseline) * 100)),
          );
        },
      );

      // Certificados emitidos
      certsUnsub = onSnapshot(
        query(
          collection(db, "certificates"),
          where("instructor_uid", "==", user.uid),
        ),
        (snap) => {
          let count = 0;
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const ts: Date | null = data?.issuedAt?.toDate
              ? data.issuedAt.toDate()
              : data?.createdAt?.toDate
                ? data.createdAt.toDate()
                : null;
            if (!ts || ts.getTime() >= since) count += 1;
          });
          setCertificatesIssued(count);
        },
      );

      // Dúvidas resolvidas
      questionsUnsubs.forEach((u) => u());
      questionsUnsubs = [];
      const qChunks = chunks;
      qChunks.forEach((ids) => {
        const qQ = query(
          collection(db, "questions"),
          where("course_id", "in", ids),
        );
        const u = onSnapshot(qQ, (snap) => {
          let sum = 0;
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const ts: Date | null = data?.createdAt?.toDate
              ? data.createdAt.toDate()
              : null;
            if (ts && ts.getTime() < since) return;
            sum +=
              typeof data?.repliesCount === "number" ? data.repliesCount : 0;
          });
          setAnswersResolved(sum);
        });
        questionsUnsubs.push(u);
      });

      // Avaliação média dos cursos
      ratingsUnsub = onSnapshot(
        query(
          collection(db, "courses"),
          where("instructor_uid", "==", user.uid),
        ),
        (snap) => {
          let totalRating = 0;
          let count = 0;
          snap.docs.forEach((d) => {
            const data: any = d.data();
            if (typeof data?.rating === "number" && data.rating > 0) {
              totalRating += data.rating;
              count++;
            }
          });
          const avg = count > 0 ? totalRating / count : 0;
          setAvgRating(Number(avg.toFixed(1)));
        },
      );
    };

    // Cursos do instrutor
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
                    (snap3) => subscribeCore(snap3.docs),
                  );
                } else {
                  subscribeCore([]);
                }
              } else {
                subscribeCore(snap2.docs);
              }
            },
          );
        } else {
          subscribeCore(snap.docs);
        }
      },
    );

    return () => {
      if (coursesUnsub) coursesUnsub();
      if (fallbackUnsub) fallbackUnsub();
      if (nameUnsub) nameUnsub();
      enrollUnsubs.forEach((u) => u());
      if (subsUnsub) subsUnsub();
      if (certsUnsub) certsUnsub();
      if (ratingsUnsub) ratingsUnsub();
      questionsUnsubs.forEach((u) => u());
    };
  }, [user?.uid, totalEnrollments]);

  const regionDisplay = regions.slice(0, 4).map((r) => ({
    name: r.name,
    value: `${r.count} formandos`,
  }));

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Relatórios & Desempenho
            </h1>
            <p className="text-slate-500 mt-1">
              Dados sobre o engajamento e desempenho dos seus formandos.
            </p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-gray-50 shadow-sm">
            <Calendar size={18} /> {periodLabel}
          </button>
        </div>

        {/* Métricas Pedagógicas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PerformanceCard
            icon={<Users size={20} className="text-brand-green" />}
            label="Total de Formandos"
            value={totalEnrollments.toString()}
            trend={periodLabel}
            trendType="up"
          />
          <PerformanceCard
            icon={<CheckCircle size={20} className="text-blue-600" />}
            label="Taxa de Conclusão"
            value={`${completionRate}%`}
            trend={periodLabel}
            trendType="up"
          />
          <PerformanceCard
            icon={<TrendingUp size={20} className="text-brand-accent" />}
            label="Engajamento Médio"
            value={`${avgEngagement}%`}
            trend={periodLabel}
            trendType="up"
          />
          <PerformanceCard
            icon={<BookOpen size={20} className="text-purple-600" />}
            label="Avaliação Média"
            value={avgRating.toFixed(1)}
            trend="dos cursos"
            trendType="up"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Resumo Acadêmico */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-8 flex items-center gap-2">
              <BookOpen size={20} className="text-brand-green" /> Resumo
              Acadêmico
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <AcademicSummaryItem
                icon={<BookOpen className="w-6 h-6 text-blue-600" />}
                label="Aulas Completadas"
                value={classesCompleted.toLocaleString("pt-MZ")}
                description="Atividades enviadas"
              />
              <AcademicSummaryItem
                icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                label="Certificados Emitidos"
                value={certificatesIssued.toLocaleString("pt-MZ")}
                description="Neste período"
              />
              <AcademicSummaryItem
                icon={<MessageSquare className="w-6 h-6 text-brand-accent" />}
                label="Dúvidas Resolvidas"
                value={answersResolved.toLocaleString("pt-MZ")}
                description="Respostas fornecidas"
              />
              <AcademicSummaryItem
                icon={<Users className="w-6 h-6 text-brand-green" />}
                label="Engajamento"
                value={`${avgEngagement}%`}
                description="Formandos ativos"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
              <TrendingUp size={32} className="text-brand-accent mb-6" />
              <h3 className="text-xl font-bold mb-4">Dica: Melhore Mais</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Formandos que completam as aulas nos primeiros 7 dias têm 3x
                mais chances de conclusão. Mantenha a comunicação ativa e
                ofereça feedback regular!
              </p>
              <button className="w-full py-2.5 bg-brand-green hover:bg-brand-dark text-white rounded-lg font-bold text-xs transition-all shadow-lg shadow-black/30">
                Acessar Mensagens
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-6">
                Formandos por Região
              </h4>
              <div className="space-y-4">
                {regionDisplay.length > 0 ? (
                  regionDisplay.map((r, idx) => (
                    <RegionStat key={idx} name={r.name} value={r.value} />
                  ))
                ) : (
                  <div className="text-xs text-slate-400">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
};

const PerformanceCard = ({
  icon,
  label,
  value,
  trend,
  trendType,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  trendType: "up" | "down";
}) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      {icon}
    </div>
    <div className="flex items-end justify-between">
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      <div
        className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded ${
          trendType === "up"
            ? "bg-emerald-50 text-emerald-600"
            : "bg-red-50 text-red-600"
        }`}
      >
        {trendType === "up" ? (
          <ArrowUpRight size={12} />
        ) : (
          <ArrowDownRight size={12} />
        )}
        {trend}
      </div>
    </div>
  </div>
);

const AcademicSummaryItem = ({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0">{icon}</div>
    <div className="flex-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  </div>
);

const RegionStat = ({ name, value }: { name: string; value: string }) => (
  <div className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0">
    <span className="text-sm font-bold text-slate-600">{name}</span>
    <span className="text-sm font-black text-brand-green">{value}</span>
  </div>
);

export default ReportsPage;
