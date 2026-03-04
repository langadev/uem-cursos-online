import {
    collection,
    limit,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import { ArrowRight, Clock, Flame, PlayCircle, Trophy } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import StudentLayout from "../../layouts/StudentLayout";
import { db } from "../../services/firebase";
import { EnrolledCourse } from "../../types";

type CourseItem = EnrolledCourse & { lastAccessed?: string };

const DashboardPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<CourseItem[]>([]);
  const [hoursWeek, setHoursWeek] = useState("0h 0m");
  const [certCount, setCertCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [recommended, setRecommended] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setHoursWeek("0h 0m");
      setCertCount(0);
      setStreakDays(0);
      return;
    }

    let enrollUnsubA: (() => void) | null = null;
    let enrollUnsubB: (() => void) | null = null;
    let courseUnsubs: Array<() => void> = [];
    let subsUnsubs: Array<() => void> = [];
    let recUnsub: (() => void) | null = null;

    const enrollsMap = new Map<
      string,
      {
        ts?: Date;
        title?: string;
        imageUrl?: string;
        instructor?: string;
        category?: string;
      }
    >();
    const coursesMap = new Map<string, any>();
    const progressMap = new Map<
      string,
      { completed: number; total: number; lastTs?: Date }
    >();

    const recompute = () => {
      const list: CourseItem[] = [];
      for (const [cid, course] of coursesMap.entries()) {
        const totalLessons = Array.isArray(course?.modules)
          ? course.modules.reduce(
              (acc: number, m: any) =>
                acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
              0,
            )
          : course?.totalLessons || 0;
        const prog = progressMap.get(cid) || {
          completed: 0,
          total: totalLessons,
        };
        const progress =
          totalLessons > 0
            ? Math.min(100, Math.round((prog.completed / totalLessons) * 100))
            : 0;
        const lastTs = prog.lastTs || enrollsMap.get(cid)?.ts;
        const lastAccessed = lastTs
          ? new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" }).format(
              Math.round((lastTs.getTime() - Date.now()) / 3600000),
              "hour",
            )
          : undefined;
        list.push({
          id: cid,
          title: course?.title || "Curso",
          category: course?.category || "Geral",
          imageUrl:
            course?.imageUrl ||
            course?.image ||
            "https://via.placeholder.com/320x180.png?text=Curso",
          instructor: course?.instructor || "Tutor",
          progress,
          totalLessons,
          completedLessons: prog.completed,
          lastAccessed,
        } as CourseItem);
      }
      // Fallback para cursos que ainda não carregaram do Firestore, usando metadados da matrícula
      for (const [cid, e] of enrollsMap.entries()) {
        if (!coursesMap.has(cid)) {
          const lastAccessed = e.ts
            ? new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" }).format(
                Math.round((e.ts.getTime() - Date.now()) / 3600000),
                "hour",
              )
            : undefined;
          list.push({
            id: cid,
            title: e.title || "Curso",
            category: e.category || "Geral",
            imageUrl:
              e.imageUrl ||
              "https://via.placeholder.com/320x180.png?text=Curso",
            instructor: e.instructor || "Tutor",
            progress: 0,
            totalLessons: 0,
            completedLessons: 0,
            lastAccessed,
          } as CourseItem);
        }
      }
      list.sort((a, b) => {
        const aTs = (
          progressMap.get(a.id)?.lastTs ||
          enrollsMap.get(a.id)?.ts ||
          new Date(0)
        ).getTime();
        const bTs = (
          progressMap.get(b.id)?.lastTs ||
          enrollsMap.get(b.id)?.ts ||
          new Date(0)
        ).getTime();
        return bTs - aTs;
      });
      setItems(list);
      setCertCount(list.filter((c) => c.progress === 100).length);
    };

    const subscribeCoursesAndProgress = (courseIds: string[]) => {
      courseUnsubs.forEach((u) => u());
      courseUnsubs = [];
      subsUnsubs.forEach((u) => u());
      subsUnsubs = [];
      if (courseIds.length === 0) {
        setItems([]);
        return;
      }
      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);
      const since7 = Date.now() - 7 * 24 * 3600 * 1000;
      const daysSet = new Set<string>();
      let subsCountWeek = 0;

      chunks.forEach((ids) => {
        const qC = query(
          collection(db, "courses"),
          where("__name__", "in", ids),
        );
        const uc = onSnapshot(qC, (snap) => {
          snap.docs.forEach((d) => coursesMap.set(d.id, d.data()));
          recompute();
        });
        courseUnsubs.push(uc);

        // Procurar submissões (uploads de exercícios)
        const qS = query(
          collection(db, "submissions"),
          where("user_uid", "==", user.uid),
          where("course_id", "in", ids),
        );
        const us = onSnapshot(qS, (snap) => {
          const byCourse = new Map<string, Set<string>>();
          const lastByCourse = new Map<string, Date>();
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const cid = data?.course_id || data?.courseId;
            const lid = data?.lesson_id || data?.lessonId || d.id;
            if (!cid) return;
            if (!byCourse.has(cid)) byCourse.set(cid, new Set());
            byCourse.get(cid)!.add(String(lid));
            const ts: Date | null = data?.submittedAt?.toDate
              ? data.submittedAt.toDate()
              : data?.createdAt?.toDate
                ? data.createdAt.toDate()
                : null;
            if (ts) {
              const prev = lastByCourse.get(cid);
              if (!prev || ts.getTime() > prev.getTime())
                lastByCourse.set(cid, ts);
              if (ts.getTime() >= since7) {
                subsCountWeek += 1;
                daysSet.add(ts.toISOString().slice(0, 10));
              }
            }
          });
          ids.forEach((cid) => {
            const completed = byCourse.get(cid)?.size || 0;
            const total = Array.isArray(coursesMap.get(cid)?.modules)
              ? coursesMap
                  .get(cid)
                  .modules.reduce(
                    (acc: number, m: any) =>
                      acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
                    0,
                  )
              : coursesMap.get(cid)?.totalLessons || 0;
            progressMap.set(cid, {
              completed,
              total,
              lastTs: lastByCourse.get(cid),
            });
          });
          recompute();
        });
        subsUnsubs.push(us);

        // Procurar aulas marcadas como concluídas (lesson-completions) ✅ NOVO
        const qLC = query(
          collection(db, "lesson-completions"),
          where("user_uid", "==", user.uid),
          where("course_id", "in", ids),
        );
        const ulc = onSnapshot(qLC, (snap) => {
          const byCourse = new Map<string, Set<string>>();
          const lastByCourse = new Map<string, Date>();
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const cid = data?.course_id;
            const lid = data?.lesson_id;
            if (!cid || !lid) return;
            if (!byCourse.has(cid)) byCourse.set(cid, new Set());
            byCourse.get(cid)!.add(String(lid));
            const ts: Date | null = data?.completedAt?.toDate
              ? data.completedAt.toDate()
              : null;
            if (ts) {
              const prev = lastByCourse.get(cid);
              if (!prev || ts.getTime() > prev.getTime())
                lastByCourse.set(cid, ts);
              if (ts.getTime() >= since7) {
                subsCountWeek += 1;
                daysSet.add(ts.toISOString().slice(0, 10));
              }
            }
          });
          ids.forEach((cid) => {
            const prevProg = progressMap.get(cid);
            const completed = byCourse.get(cid)?.size || 0;
            const total = Array.isArray(coursesMap.get(cid)?.modules)
              ? coursesMap
                  .get(cid)
                  .modules.reduce(
                    (acc: number, m: any) =>
                      acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
                    0,
                  )
              : coursesMap.get(cid)?.totalLessons || 0;
            // Usar o máximo entre submissions e lesson-completions
            const maxCompleted = Math.max(prevProg?.completed || 0, completed);
            progressMap.set(cid, {
              completed: maxCompleted,
              total,
              lastTs: lastByCourse.get(cid) || prevProg?.lastTs,
            });
          });
          recompute();
        });
        subsUnsubs.push(ulc);
      });
    };

    const subscribeRecommended = (excludeIds: string[]) => {
      if (recUnsub) {
        recUnsub();
        recUnsub = null;
      }
      const qR = query(collection(db, "courses"), limit(20));
      recUnsub = onSnapshot(qR, (snap) => {
        const rec: any[] = [];
        snap.docs.forEach((d) => {
          if (excludeIds.includes(d.id)) return;
          const data: any = d.data();
          rec.push({ id: d.id, ...data });
        });
        setRecommended(rec.slice(0, 6));
      });
    };

    const enrollHandler = (snap: any) => {
      const ids = new Set<string>();
      snap.docs.forEach((d: any) => {
        const data: any = d.data();
        const cid = data?.course_id || data?.courseId;
        const ts: Date | null = data?.enrolledAt?.toDate
          ? data.enrolledAt.toDate()
          : data?.createdAt?.toDate
            ? data.createdAt.toDate()
            : null;
        if (!cid) return;
        ids.add(cid);
        const prev = enrollsMap.get(cid) || {};
        const newTs =
          ts && (!prev.ts || ts.getTime() > prev.ts.getTime()) ? ts : prev.ts;
        enrollsMap.set(cid, {
          ts: newTs,
          title: data?.course_title || prev.title,
          imageUrl: data?.imageUrl || prev.imageUrl,
          instructor: data?.instructor || prev.instructor,
          category: data?.category || prev.category,
        });
      });
      subscribeCoursesAndProgress(Array.from(ids));
      subscribeRecommended(Array.from(ids));
      // recompute immediately using enrollment metadata fallback while course/submission snapshots load
      recompute();
    };

    enrollUnsubA = onSnapshot(
      query(collection(db, "enrollments"), where("user_uid", "==", user.uid)),
      enrollHandler,
    );
    enrollUnsubB = onSnapshot(
      query(collection(db, "enrollments"), where("userId", "==", user.uid)),
      enrollHandler,
    );

    return () => {
      if (enrollUnsubA) enrollUnsubA();
      if (enrollUnsubB) enrollUnsubB();
      courseUnsubs.forEach((u) => u());
      subsUnsubs.forEach((u) => u());
      if (recUnsub) recUnsub();
    };
  }, [user?.uid]);

  const lastCourse = items[0] || null;

  // Extrair o primeiro nome do perfil para a saudação
  const firstName = (
    profile?.full_name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Utilizador"
  ).split(" ")[0];

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section Dinâmica */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Vamos continuar aprendendo hoje? Você tem ótimas atividades
            pendentes.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<Clock className="w-6 h-6 text-blue-600" />}
            value={hoursWeek}
            label="Estudados esta semana"
            bg="bg-blue-50"
            trend=""
          />
          <StatCard
            icon={<Trophy className="w-6 h-6 text-brand-accent" />}
            value={String(certCount)}
            label="Certificados Obtidos"
            bg="bg-yellow-50"
          />
          <StatCard
            icon={<Flame className="w-6 h-6 text-orange-600" />}
            value={`${streakDays} Dias`}
            label="Ofensiva Atual"
            bg="bg-orange-50"
            trend="Continue assim!"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Continue Watching Hero */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-brand-green" />
                Continuar de onde parou
              </h2>
              {lastCourse ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-6 items-start">
                  <Link
                    to={`/aluno/sala-de-aula/${lastCourse.id}`}
                    className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden flex-shrink-0 group cursor-pointer"
                  >
                    <img
                      src={lastCourse.imageUrl}
                      alt={lastCourse.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                      <PlayCircle className="w-10 h-10 text-white opacity-90 group-hover:scale-110 transition-transform" />
                    </div>
                  </Link>

                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-brand-green bg-green-50 px-2 py-0.5 rounded uppercase tracking-wide">
                        {lastCourse.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {lastCourse.lastAccessed}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {lastCourse.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Próxima aula:{" "}
                      <span className="font-medium text-gray-700">
                        {(lastCourse as any).nextLessonTitle || ""}
                      </span>
                    </p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-gray-500">
                        <span>{lastCourse.progress}% Concluído</span>
                        <span>
                          {lastCourse.completedLessons}/
                          {lastCourse.totalLessons} Aulas
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-brand-green h-2 rounded-full transition-all duration-500"
                          style={{ width: `${lastCourse.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <Link
                      to={`/aluno/sala-de-aula/${lastCourse.id}`}
                      className="mt-5 inline-flex items-center justify-center text-sm font-bold text-white bg-brand-green hover:bg-brand-dark py-2.5 px-5 rounded-lg transition-colors w-full sm:w-auto shadow-md shadow-green-900/10"
                    >
                      Continuar Aula
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center text-sm text-gray-500">
                  Sem cursos para continuar.
                </div>
              )}
            </section>

            {/* My Courses Grid */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Meus Cursos</h2>
                <Link
                  to="/aluno/cursos"
                  className="text-sm font-semibold text-brand-green hover:underline flex items-center gap-1"
                >
                  Ver todos <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {items.slice(1).map((course) => (
                  <Link
                    key={course.id}
                    to={`/aluno/sala-de-aula/${course.id}`}
                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex gap-4 group"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-gray-900 text-sm truncate mb-1 group-hover:text-brand-green transition-colors">
                        {course.title}
                      </h4>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                        <div
                          className="bg-brand-accent h-1.5 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {course.progress}% Completo
                      </span>
                    </div>
                  </Link>
                ))}

                {/* Discover More Card */}
                <Link
                  to="/cursos"
                  className="border-2 border-dashed border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center text-center hover:border-brand-green hover:bg-green-50/50 transition-all group"
                >
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-white text-gray-400 group-hover:text-brand-green transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-600 group-hover:text-brand-green">
                    Descobrir novos cursos
                  </span>
                </Link>
              </div>
            </section>
          </div>

          {/* Sidebar Right (Recommended) */}
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Recomendado para você
              </h2>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                {recommended.map((course: any) => (
                  <Link
                    to={`/cursos/${course.id}`}
                    key={course.id}
                    className="block group cursor-pointer"
                  >
                    <div className="h-24 rounded-lg overflow-hidden mb-2 relative">
                      <img
                        src={
                          course.imageUrl ||
                          course.image ||
                          "https://via.placeholder.com/640x360.png?text=Curso"
                        }
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold">
                        {course.rating || 0} ★
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1 group-hover:text-brand-green transition-colors">
                      {course.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {course.instructor || "Tutor"}
                    </p>
                  </Link>
                ))}
                {recommended.length === 0 && (
                  <div className="text-xs text-gray-500">
                    Sem recomendações no momento.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

const StatCard = ({ icon, value, label, bg, trend }: any) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      {trend && (
        <p className="text-xs text-green-600 font-semibold mt-1">{trend}</p>
      )}
    </div>
    <div className={`p-3 rounded-lg ${bg}`}>{icon}</div>
  </div>
);

export default DashboardPage;
