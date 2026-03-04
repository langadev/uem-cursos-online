import { collection, onSnapshot, query, where } from "firebase/firestore";
import { toPng } from "html-to-image";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  History,
  Loader2,
  Play,
  Printer,
  TrendingUp,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import StudentLayout from "../../layouts/StudentLayout";
import { db } from "../../services/firebase";

interface HistoryEvent {
  id: string;
  type:
    | "course_start"
    | "lesson_complete"
    | "module_complete"
    | "certificate_earned";
  title: string;
  courseName: string;
  time: string;
  date: string;
}

const HistoryPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [hoursStr, setHoursStr] = useState("0h");
  const [lessonsCount, setLessonsCount] = useState(0);
  const [focusStr, setFocusStr] = useState("0/10");
  const [completedCourses, setCompletedCourses] = useState(0);

  const planLabel =
    (profile as any)?.plan || (profile as any)?.subscription?.name || "Membro";
  const memberSinceDate: Date | null = (profile as any)?.member_since?.toDate
    ? (profile as any).member_since.toDate()
    : (profile as any)?.createdAt?.toDate
      ? (profile as any).createdAt.toDate()
      : null;
  const memberSinceText = memberSinceDate
    ? memberSinceDate.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      })
    : "";

  useEffect(() => {
    if (!user?.uid) {
      setEvents([]);
      setHoursStr("0h");
      setLessonsCount(0);
      setFocusStr("0/10");
      setCompletedCourses(0);
      return;
    }

    let enrollUnsubA: (() => void) | null = null;
    let enrollUnsubB: (() => void) | null = null;
    let subsUnsubA: (() => void) | null = null;
    let subsUnsubB: (() => void) | null = null;
    let courseUnsubs: Array<() => void> = [];

    const enrollsMap = new Map<string, { ts?: Date; title?: string }>();
    const coursesMap = new Map<string, any>();
    const submissions = new Map<
      string,
      { cid: string; lid: string; ts: Date; title?: string }
    >();

    const formatDate = (d: Date): { time: string; date: string } => {
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const startYesterday = new Date(startToday);
      startYesterday.setDate(startToday.getDate() - 1);
      const time = new Intl.DateTimeFormat("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
      let date = new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "short",
      }).format(d);
      if (d >= startToday) date = "Hoje";
      else if (d >= startYesterday) date = "Ontem";
      return { time, date };
    };

    const recompute = () => {
      const subsArr = Array.from(submissions.values());
      const minutes = subsArr.length * 20;
      const hh = Math.floor(minutes / 60);
      const mm = minutes % 60;
      setHoursStr(`${hh}h${mm ? ` ${mm}m` : ""}`);
      setLessonsCount(subsArr.length);

      const byCourseLessons = new Map<string, Set<string>>();
      const lastByCourse = new Map<string, Date>();
      const since7 = Date.now() - 7 * 24 * 3600 * 1000;
      const daysSet = new Set<string>();
      subsArr.forEach((s) => {
        if (!byCourseLessons.has(s.cid)) byCourseLessons.set(s.cid, new Set());
        byCourseLessons.get(s.cid)!.add(s.lid);
        const prev = lastByCourse.get(s.cid);
        if (!prev || s.ts.getTime() > prev.getTime())
          lastByCourse.set(s.cid, s.ts);
        if (s.ts.getTime() >= since7)
          daysSet.add(s.ts.toISOString().slice(0, 10));
      });
      const focus = Math.min(10, Math.round((daysSet.size / 7) * 10 * 10) / 10);
      setFocusStr(`${focus.toFixed(1)}/10`);

      const ev: Array<{
        id: string;
        type: HistoryEvent["type"];
        title: string;
        courseName: string;
        ts: Date;
      }> = [];

      enrollsMap.forEach((e, cid) => {
        if (e.ts)
          ev.push({
            id: `start|${cid}|${e.ts.getTime()}`,
            type: "course_start",
            title: "Matrícula Realizada",
            courseName: e.title || coursesMap.get(cid)?.title || "Curso",
            ts: e.ts,
          });
      });

      subsArr.forEach((s) => {
        const course = coursesMap.get(s.cid);
        let lessonTitle = s.title as string | undefined;
        if (!lessonTitle && course && Array.isArray(course.modules)) {
          for (const m of course.modules) {
            const found = (Array.isArray(m?.lessons) ? m.lessons : []).find(
              (l: any) => String(l?.id || l?.lessonId) === s.lid,
            );
            if (found) {
              lessonTitle = found.title || found.name;
              break;
            }
          }
        }
        ev.push({
          id: `lesson|${s.cid}|${s.lid}|${s.ts.getTime()}`,
          type: "lesson_complete",
          title: lessonTitle || "Lição concluída",
          courseName: course?.title || enrollsMap.get(s.cid)?.title || "Curso",
          ts: s.ts,
        });
      });

      coursesMap.forEach((course, cid) => {
        const submitted = byCourseLessons.get(cid) || new Set<string>();
        (Array.isArray(course?.modules) ? course.modules : []).forEach(
          (m: any, midx: number) => {
            const lessons = Array.isArray(m?.lessons) ? m.lessons : [];
            if (lessons.length === 0) return;
            const allDone = lessons.every((l: any) =>
              submitted.has(String(l?.id || l?.lessonId)),
            );
            if (allDone) {
              let maxTs = new Date(0);
              lessons.forEach((l: any) => {
                const lid = String(l?.id || l?.lessonId);
                const ts = subsArr
                  .filter((x) => x.cid === cid && x.lid === lid)
                  .map((x) => x.ts)
                  .sort((a, b) => b.getTime() - a.getTime())[0];
                if (ts && ts.getTime() > maxTs.getTime()) maxTs = ts;
              });
              const title = m?.title
                ? `Módulo: ${m.title} concluído`
                : `Módulo ${midx + 1} concluído`;
              ev.push({
                id: `module|${cid}|${m?.id || midx}|${maxTs.getTime()}`,
                type: "module_complete",
                title,
                courseName: course?.title || "Curso",
                ts: maxTs,
              });
            }
          },
        );
      });

      let completed = 0;
      coursesMap.forEach((course, cid) => {
        const total = Array.isArray(course?.modules)
          ? course.modules.reduce(
              (acc: number, m: any) =>
                acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
              0,
            )
          : course?.totalLessons || 0;
        const done = byCourseLessons.get(cid)?.size || 0;
        if (total > 0 && done >= total) {
          completed += 1;
          const last =
            subsArr
              .filter((x) => x.cid === cid)
              .map((x) => x.ts)
              .sort((a, b) => b.getTime() - a.getTime())[0] || new Date();
          ev.push({
            id: `cert|${cid}|${last.getTime()}`,
            type: "certificate_earned",
            title: "Certificado disponível",
            courseName: course?.title || "Curso",
            ts: last,
          });
        }
      });
      setCompletedCourses(completed);

      ev.sort((a, b) => b.ts.getTime() - a.ts.getTime());
      const formatted: HistoryEvent[] = ev.map((x) => ({
        id: x.id,
        type: x.type,
        title: x.title,
        courseName: x.courseName,
        ...formatDate(x.ts),
      }));
      setEvents(formatted);
    };

    const subscribeCourses = (courseIds: string[]) => {
      courseUnsubs.forEach((u) => u());
      courseUnsubs = [];
      if (courseIds.length === 0) {
        coursesMap.clear();
        recompute();
        return;
      }
      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);
      chunks.forEach((ids) => {
        const qC = query(
          collection(db, "courses"),
          where("__name__", "in", ids),
        );
        const u = onSnapshot(qC, (snap) => {
          snap.docs.forEach((d) => coursesMap.set(d.id, d.data()));
          recompute();
        });
        courseUnsubs.push(u);
      });
    };

    const handleEnroll = (snap: any) => {
      const setIds = new Set<string>();
      snap.docs.forEach((d: any) => {
        const data: any = d.data();
        const cid = data?.course_id || data?.courseId;
        if (!cid) return;
        setIds.add(cid);
        const ts: Date | null = data?.enrolledAt?.toDate
          ? data.enrolledAt.toDate()
          : data?.createdAt?.toDate
            ? data.createdAt.toDate()
            : null;
        const prev = enrollsMap.get(cid)?.ts;
        const newTs =
          ts && (!prev || ts.getTime() > prev.getTime()) ? ts : prev;
        enrollsMap.set(cid, { ts: newTs, title: data?.course_title });
      });
      subscribeCourses(Array.from(new Set([...Array.from(enrollsMap.keys())])));
      recompute();
    };

    const handleSubs = (snap: any) => {
      snap.docs.forEach((d: any) => {
        const data: any = d.data();
        const cid = data?.course_id || data?.courseId;
        const lid = String(data?.lesson_id || data?.lessonId || d.id);
        const ts: Date | null = data?.submittedAt?.toDate
          ? data.submittedAt.toDate()
          : data?.createdAt?.toDate
            ? data.createdAt.toDate()
            : null;
        if (!cid || !lid || !ts) return;
        submissions.set(d.id, { cid, lid, ts, title: data?.lesson_title });
      });
      const fromEnrolls = Array.from(enrollsMap.keys());
      const fromSubs = Array.from(
        new Set(Array.from(submissions.values()).map((s) => s.cid)),
      );
      subscribeCourses(Array.from(new Set([...fromEnrolls, ...fromSubs])));
      recompute();
    };

    enrollUnsubA = onSnapshot(
      query(collection(db, "enrollments"), where("user_uid", "==", user.uid)),
      handleEnroll,
    );
    enrollUnsubB = onSnapshot(
      query(collection(db, "enrollments"), where("userId", "==", user.uid)),
      handleEnroll,
    );
    subsUnsubA = onSnapshot(
      query(collection(db, "submissions"), where("user_uid", "==", user.uid)),
      handleSubs,
    );
    subsUnsubB = onSnapshot(
      query(collection(db, "submissions"), where("userId", "==", user.uid)),
      handleSubs,
    );

    // Converter lesson-completions para formato de submissions
    const handleLessonCompletions = (snap: any) => {
      snap.docs.forEach((d: any) => {
        const data: any = d.data();
        const cid = data?.course_id;
        const lid = String(data?.lesson_id);
        const ts: Date | null =
          data?.completedAt?.toDate?.() || data?.createdAt?.toDate?.() || null;
        if (!cid || !lid || !ts) return;
        // Usar chave diferente para não sobrescrever submissions
        submissions.set(`lc|${d.id}`, {
          cid,
          lid,
          ts,
          title: data?.lesson_title,
        });
      });
      const fromEnrolls = Array.from(enrollsMap.keys());
      const fromSubs = Array.from(
        new Set(Array.from(submissions.values()).map((s) => s.cid)),
      );
      subscribeCourses(Array.from(new Set([...fromEnrolls, ...fromSubs])));
      recompute();
    };

    const lcUnsubA = onSnapshot(
      query(
        collection(db, "lesson-completions"),
        where("user_uid", "==", user.uid),
      ),
      handleLessonCompletions,
    );
    const lcUnsubB = onSnapshot(
      query(
        collection(db, "lesson-completions"),
        where("userId", "==", user.uid),
      ),
      handleLessonCompletions,
    );

    return () => {
      if (enrollUnsubA) enrollUnsubA();
      if (enrollUnsubB) enrollUnsubB();
      if (subsUnsubA) subsUnsubA();
      if (subsUnsubB) subsUnsubB();
      lcUnsubA();
      lcUnsubB();
      courseUnsubs.forEach((u) => u());
    };
  }, [user?.uid]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `Relatorio-Aprendizado-${profile?.full_name?.replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao baixar relatório:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 sm:mb-10 flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 flex-wrap">
              <History className="w-6 sm:w-8 h-6 sm:h-8 text-brand-green flex-shrink-0" />
              Meu Histórico de Aprendizado
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Acompanhe cada passo da sua jornada de conhecimento.
            </p>
          </div>
          <button
            onClick={() => setIsReportOpen(true)}
            className="self-start sm:self-auto flex items-center gap-2 text-sm font-bold text-brand-green bg-brand-green/5 px-4 py-2 rounded-lg hover:bg-brand-green/10 transition-colors"
          >
            <Calendar className="w-4 h-4 flex-shrink-0" /> Relatório Completo
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <StatMiniCard
            label="Horas de Estudo"
            value={hoursStr}
            icon={<Clock className="text-blue-600" />}
            color="bg-blue-50"
          />
          <StatMiniCard
            label="Aulas Concluídas"
            value={String(lessonsCount)}
            icon={<CheckCircle className="text-brand-green" />}
            color="bg-brand-light"
          />
          <StatMiniCard
            label="Nível de Foco"
            value={focusStr}
            icon={<TrendingUp className="text-orange-600" />}
            color="bg-orange-50"
          />
        </div>

        {/* Timeline */}
        <div className="relative px-2 sm:px-0">
          <div className="absolute left-[13px] sm:left-[21px] top-2 bottom-0 w-0.5 bg-gray-200"></div>
          <div className="space-y-6 sm:space-y-10">
            {events.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isFirst={index === 0}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 sm:mt-12 text-center">
          <button className="text-xs sm:text-sm font-bold text-gray-500 hover:text-brand-dark transition-colors flex items-center gap-2 mx-auto">
            Carregar atividades anteriores...
          </button>
        </div>
      </div>

      {/* Report Modal Overlay */}
      {isReportOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto print:bg-white print:block print:p-0">
          {/* Action Bar (Hidden in print) */}
          <div className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-[110] print:hidden">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setIsReportOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                Relatório de Aprendizagem
              </h3>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-gray-700 px-3 sm:px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-bold transition-all text-xs sm:text-sm"
              >
                <Printer className="w-4 h-4 flex-shrink-0" />{" "}
                <span className="hidden sm:inline">Imprimir / PDF</span>
                <span className="sm:hidden">Imprimir</span>
              </button>
              <button
                disabled={isDownloading}
                onClick={handleDownloadReport}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-green text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-brand-dark font-bold transition-all text-xs sm:text-sm shadow-lg shadow-green-900/10"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <Download className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="hidden sm:inline">Baixar Imagem</span>
                <span className="sm:hidden">Baixar</span>
              </button>
            </div>
          </div>

          {/* Report Content Wrapper */}
          <div className="flex-1 flex justify-center py-4 sm:py-10 px-2 sm:px-4 print:p-0">
            <div
              ref={reportRef}
              className="bg-white w-full max-w-[800px] shadow-2xl p-6 sm:p-8 md:p-12 lg:p-16 relative flex flex-col min-h-[1100px] print:shadow-none print:max-w-none print:w-full print:m-0 print:p-0"
            >
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-8 mb-8 sm:mb-12 border-b-2 border-blue-700 pb-6 sm:pb-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/logo-plataforma.png"
                      alt="Logo Plataforma"
                      className="h-8 sm:h-10 w-auto"
                    />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
                    Relatório de Aprendizagem
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                    Universidade Eduardo Mondlane - Documento oficial de
                    acompanhamento acadêmico
                  </p>
                </div>
                <div className="text-right text-xs sm:text-sm flex-shrink-0">
                  <p className="font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Data de Emissão
                  </p>
                  <p className="text-gray-900 font-bold">
                    {new Date().toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Student Info Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12 p-4 sm:p-6 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Estudante
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 break-words">
                    {profile?.full_name ||
                      user?.displayName ||
                      user?.email?.split("@")[0] ||
                      "Utilizador"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    ID: UEM-
                    {(user?.uid || "USER").substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Plano Atual
                  </p>
                  <p className="text-base sm:text-lg font-bold text-brand-green break-words">
                    {planLabel}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {memberSinceText ? `Membro desde ${memberSinceText}` : ""}
                  </p>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="mb-8 sm:mb-12">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 sm:mb-6 border-l-4 border-brand-accent pl-4">
                  Resumo de Performance
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <ReportStat label="Horas Totais" value={hoursStr} />
                  <ReportStat
                    label="Cursos Ativos"
                    value={String(
                      new Set(
                        events
                          .filter((e) => e.type !== "course_start")
                          .map((e) => e.courseName),
                      ).size,
                    )}
                  />
                  <ReportStat
                    label="Concluídos"
                    value={String(completedCourses)}
                  />
                  <ReportStat label="Média de Foco" value={focusStr} />
                </div>
              </div>

              {/* Detailed Activity Table */}
              <div className="flex-1 overflow-x-auto">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 sm:mb-6 border-l-4 border-brand-accent pl-4">
                  Detalhes do seu avanço
                </h4>
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="py-2 sm:py-3 font-bold text-gray-400 uppercase tracking-tighter text-[9px] sm:text-[10px] w-16 sm:w-24">
                        Data
                      </th>
                      <th className="py-2 sm:py-3 font-bold text-gray-400 uppercase tracking-tighter text-[9px] sm:text-[10px] px-2 sm:px-0">
                        Evento / Atividade
                      </th>
                      <th className="py-2 sm:py-3 font-bold text-gray-400 uppercase tracking-tighter text-[9px] sm:text-[10px]">
                        Curso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className="py-3 sm:py-4 text-gray-500 font-mono text-[10px] sm:text-xs whitespace-nowrap">
                          {event.date === "Hoje"
                            ? new Date().toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })
                            : event.date}
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-0">
                          <p className="font-bold text-gray-900 text-xs sm:text-sm break-words">
                            {event.title}
                          </p>
                          <p className="text-[8px] sm:text-[10px] text-brand-green font-bold uppercase">
                            {event.type.replace("_", " ")}
                          </p>
                        </td>
                        <td className="py-3 sm:py-4 text-gray-500 italic text-xs sm:text-sm break-words">
                          {event.courseName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer / Authentication */}
              <div className="mt-8 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-32 sm:w-48 border-b border-gray-300 pb-2 mb-2 text-center font-serif text-gray-400 italic text-xs sm:text-sm">
                    Universidade Eduardo Mondlane
                  </div>
                  <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                    Certificado de Aprendizagem
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100 inline-block mb-2">
                    <FileText className="w-8 sm:w-10 h-8 sm:h-10 text-gray-200 mx-auto" />
                  </div>
                  <p className="text-[8px] sm:text-[9px] text-gray-300 font-mono">
                    AUTHCODE: UEM-
                    {Math.random().toString(36).substr(2, 12).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root, .fixed, .print\\:hidden { display: none !important; }
          .fixed.inset-0.z-\\[100\\] {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            background: white !important;
          }
          .fixed.inset-0.z-\\[100\\] * { visibility: visible; }
          .report-content, .fixed.inset-0.z-\\[100\\] > div:last-child > div {
             box-shadow: none !important;
             margin: 0 !important;
             padding: 40px !important;
             width: 100% !important;
             max-width: none !important;
          }
          @page { size: portrait; margin: 0; }
        }
      `}</style>
    </StudentLayout>
  );
};

const ReportStat = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-gray-100 p-3 sm:p-4 rounded-xl text-center">
    <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
      {label}
    </p>
    <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
  </div>
);

const StatMiniCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4">
    <div
      className={`w-10 sm:w-12 h-10 sm:h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}
    >
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
        {value}
      </p>
    </div>
  </div>
);

const TimelineItem: React.FC<{ event: HistoryEvent; isFirst: boolean }> = ({
  event,
  isFirst,
}) => {
  const getIcon = () => {
    switch (event.type) {
      case "course_start":
        return <BookOpen className="w-5 h-5" />;
      case "lesson_complete":
        return <Play className="w-5 h-5 fill-current" />;
      case "module_complete":
        return <CheckCircle className="w-5 h-5" />;
      case "certificate_earned":
        return <Award className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getColor = () => {
    switch (event.type) {
      case "course_start":
        return "bg-blue-100 text-blue-600 border-blue-200";
      case "lesson_complete":
        return "bg-brand-light text-brand-green border-brand-green/20";
      case "module_complete":
        return "bg-green-100 text-green-700 border-green-200";
      case "certificate_earned":
        return "bg-brand-accent/20 text-brand-accent border-brand-accent/30";
      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  return (
    <div className="relative pl-10 sm:pl-14 animate-in fade-in slide-in-from-left-4 duration-500">
      <div
        className={`absolute left-0 top-1.5 w-10 sm:w-11 h-10 sm:h-11 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${getColor()}`}
      >
        {getIcon()}
      </div>
      <div className="absolute left-[-80px] sm:left-[-100px] top-2 w-16 sm:w-20 text-right hidden lg:block">
        <p className="text-xs sm:text-sm font-bold text-gray-900">
          {event.date}
        </p>
        <p className="text-xs text-gray-400">{event.time}</p>
      </div>
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start gap-2 mb-1 flex-wrap">
          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {event.type.replace("_", " ")}
          </span>
          <span className="lg:hidden text-xs text-gray-400 font-medium whitespace-nowrap flex-shrink-0">
            {event.date} • {event.time}
          </span>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 group-hover:text-brand-green transition-colors break-words">
          {event.title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2 flex-wrap">
          <BookOpen size={14} className="text-gray-300 flex-shrink-0" />
          <span>Curso:</span>
          <span className="font-medium text-gray-700 break-words">
            {event.courseName}
          </span>
        </p>
      </div>
    </div>
  );
};

export default HistoryPage;
