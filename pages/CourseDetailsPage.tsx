import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    limit as qbLimit,
    query,
    where,
} from "firebase/firestore";
import {
    AlertCircle,
    Award,
    Check,
    ChevronDown,
    Download,
    File,
    FileText,
    Globe,
    Infinity,
    PlayCircle,
    Share2,
    Smartphone,
    Star,
    Users,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/firebase";

const CourseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [fallbackModules, setFallbackModules] = useState<any[]>([]);
  const { user } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const navigate = useNavigate();
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [instructorData, setInstructorData] = useState<any>(null);
  const [totalLessons, setTotalLessons] = useState(0);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "courses", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setCourse({ id: snap.id, ...snap.data() } as any);
        } else {
          setCourse(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Falha ao carregar curso:", err);
        setCourse(null);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user?.uid || !id) {
        setIsEnrolled(false);
        return;
      }
      try {
        const q = query(
          collection(db, "enrollments"),
          where("course_id", "==", id),
          where("user_uid", "==", user.uid),
          qbLimit(1),
        );
        const r = await getDocs(q);
        setIsEnrolled(!r.empty);
      } catch {
        setIsEnrolled(false);
      }
    };
    checkEnrollment();
  }, [user?.uid, id]);

  // Buscar contagem de inscrições em tempo real
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "enrollments"),
      where("course_id", "==", id),
    );
    const unsub = onSnapshot(q, (snap) => {
      setEnrollmentCount(snap.size);
    });
    return () => unsub();
  }, [id]);

  // Buscar dados do instrutor em tempo real
  useEffect(() => {
    if (!course?.instructor_uid) return;
    const ref = doc(db, "profiles", course.instructor_uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setInstructorData(snap.data());
      }
    });
    return () => unsub();
  }, [course?.instructor_uid]);

  const normalizedModules = useMemo(() => {
    const raw = (course?.modules ??
      course?.modulos ??
      course?.curriculum ??
      course?.curriculum?.modules ??
      course?.conteudos ??
      course?.conteudo ??
      []) as any;
    const toArray = (val: any) =>
      Array.isArray(val)
        ? val
        : val && typeof val === "object"
          ? Object.values(val)
          : [];
    let modulesArr = toArray(raw);
    // Fallback: se existir um array de aulas no nível do curso, cria um módulo padrão
    if (
      (!modulesArr || modulesArr.length === 0) &&
      Array.isArray((course as any)?.lessons)
    ) {
      modulesArr = [
        { id: "0", title: "Módulo 1", lessons: (course as any).lessons },
      ];
    }
    return modulesArr.map((m: any, mi: number) => {
      const lessonsRaw =
        m?.lessons ?? m?.items ?? m?.contents ?? m?.conteudos ?? [];
      const lessonsArr = toArray(lessonsRaw).map((l: any, li: number) => ({
        ...l,
        id: l?.id ?? `${mi}-${li}`,
        title: l?.title ?? l?.name ?? l?.titulo ?? `Aula ${li + 1}`,
        type:
          l?.type ??
          l?.kind ??
          l?.lessonType ??
          ((l?.content ?? l?.url ?? l?.videoUrl)
            ? "video"
            : l?.texto
              ? "text"
              : l?.file
                ? "document"
                : "text"),
        content:
          l?.content ?? l?.url ?? l?.videoUrl ?? l?.texto ?? l?.file ?? "",
        duration: l?.duration ?? l?.duracao ?? l?.length ?? "",
      }));
      return {
        ...m,
        id: m?.id ?? `${mi}`,
        title: m?.title ?? m?.name ?? m?.titulo ?? `Módulo ${mi + 1}`,
        lessons: lessonsArr,
      };
    });
  }, [course]);

  // Fallback: se o documento não tiver módulos embutidos, tenta buscar subcoleções courses/{id}/modules e suas lessons
  useEffect(() => {
    const loadFromSubcollections = async () => {
      if (!id) return;
      if ((normalizedModules?.length ?? 0) > 0) return;
      if ((fallbackModules?.length ?? 0) > 0) return;
      try {
        const modsSnap = await getDocs(
          collection(db, "courses", id, "modules"),
        );
        const modPromises = modsSnap.docs.map(async (md, mi) => {
          const mdl = md.data();
          const lessonsSnap = await getDocs(
            collection(db, "courses", id, "modules", md.id, "lessons"),
          );
          const lessons = lessonsSnap.docs.map((ld, li) => {
            const l = ld.data();
            return {
              id: ld.id,
              title: l?.title ?? l?.name ?? l?.titulo ?? `Aula ${li + 1}`,
              type:
                l?.type ??
                l?.kind ??
                l?.lessonType ??
                ((l?.content ?? l?.url ?? l?.videoUrl)
                  ? "video"
                  : l?.texto
                    ? "text"
                    : l?.file
                      ? "document"
                      : "text"),
              content:
                l?.content ??
                l?.url ??
                l?.videoUrl ??
                l?.texto ??
                l?.file ??
                "",
              duration: l?.duration ?? l?.duracao ?? l?.length ?? "",
            };
          });
          return {
            id: md.id,
            title: mdl?.title ?? mdl?.name ?? mdl?.titulo ?? `Módulo ${mi + 1}`,
            lessons,
          };
        });
        const subs = await Promise.all(modPromises);
        setFallbackModules(subs);
        // Contar total de lições
        const totalLessonsCount = subs.reduce(
          (acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
          0,
        );
        setTotalLessons(totalLessonsCount);
      } catch (e) {
        console.warn("Falha ao carregar subcoleções de módulos:", e);
        setFallbackModules([]);
      }
    };
    loadFromSubcollections();
  }, [id, normalizedModules, fallbackModules]);

  const displayModules = useMemo(() => {
    return (normalizedModules?.length ?? 0) > 0
      ? normalizedModules
      : fallbackModules;
  }, [normalizedModules, fallbackModules]);

  const firstVideo = useMemo(() => {
    const mods = displayModules;
    if (!Array.isArray(mods)) return null;
    for (const m of mods) {
      const lessons = Array.isArray(m?.lessons) ? m.lessons : [];
      const found = lessons.find((l: any) => l?.type === "video" && l?.content);
      if (found) return found;
    }
    return null;
  }, [displayModules]);

  const ytEmbed = (url?: string) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        const idp = u.pathname.replace("/", "");
        return `https://www.youtube.com/embed/${idp}?start=0&end=30&rel=0&modestbranding=1&playsinline=1`;
      }
      if (u.hostname.includes("youtube.com")) {
        const vid = u.searchParams.get("v");
        if (vid)
          return `https://www.youtube.com/embed/${vid}?start=0&end=30&rel=0&modestbranding=1&playsinline=1`;
      }
    } catch {}
    return null;
  };

  const handleEnroll = async () => {
    if (enrolling) return;
    if (!id) return;
    if (!user?.uid) {
      // Se não está logado, redireciona para login com a intenção de voltar para a página de inscrição
      navigate(`/login`, {
        state: { from: `/aluno/inscricao/${id}` },
      });
      return;
    }
    setEnrolling(true);
    // Se já está logado, vai direto para a página de confirmação de inscrição
    navigate(`/aluno/inscricao/${id}`);
    setEnrolling(false);
  };

  const updatedLabel = useMemo(() => {
    const ts: any = course?.updatedAt;
    const d: Date | null = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d) return "—";
    try {
      return new Intl.DateTimeFormat("pt-PT", {
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }, [course?.updatedAt]);

  if (!loading && !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Curso não encontrado
        </h2>
        <Link
          to="/cursos"
          className="text-brand-green font-semibold hover:underline"
        >
          Voltar para Cursos
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* 1. Header Hero Section (Dark Background) */}
      <div
        className="text-white py-12 lg:py-16 px-6 relative overflow-hidden"
        style={{ backgroundColor: "#0E7038" }}
      >
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 relative z-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-300 mb-6 font-medium">
              <Link to="/cursos" className="hover:text-white transition-colors">
                Cursos
              </Link>
              <span className="text-xs">›</span>
              <Link to="/cursos" className="hover:text-white transition-colors">
                {course?.category || "Geral"}
              </Link>
              <span className="text-xs">›</span>
              <span className="text-white truncate max-w-[200px]">
                {course?.title || "Curso"}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
              {course?.title || "Curso"}
            </h1>

            <p className="text-lg text-slate-100 mb-6 max-w-2xl leading-relaxed">
              {course?.cardDescription ||
                "Domine as habilidades essenciais para se destacar no mercado de trabalho com este curso completo e prático, desenhado por especialistas da indústria."}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm mb-8">
              <div className="flex items-center gap-1">
                <span className="font-bold text-yellow-400">
                  {course?.rating ?? 0}
                </span>
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-slate-300 ml-1">
                  (
                  {Math.max(
                    course?.reviewCount ?? 0,
                    enrollmentCount,
                  ).toLocaleString()}{" "}
                  avaliações)
                </span>
              </div>
              <span className="hidden sm:inline text-slate-500">|</span>
              <div className="flex items-center gap-1 text-slate-100">
                <span className="text-slate-300">Instrutor:</span>
                <span className="underline decoration-yellow-400/50 underline-offset-4 font-semibold">
                  {course?.instructor || "Instrutor"}
                </span>
              </div>
              <span className="hidden sm:inline text-slate-500">|</span>
              <div className="flex items-center gap-1.5 text-slate-100">
                <Users className="w-4 h-4" />
                <span>{enrollmentCount.toLocaleString()} formandos</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-white/80">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Última atualização: {updatedLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Globe className="w-3.5 h-3.5" />
                <span>{course?.language || "Português"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Award className="w-3.5 h-3.5" />
                <span>Certificado Incluso</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content & Sidebar Layout */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* LEFT COLUMN (Content) */}
          <div className="lg:col-span-2 space-y-12">
            {/* What you'll learn */}
            <section className="bg-gray-50 border border-gray-200 p-6 md:p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                O que você aprenderá
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Array.isArray(course?.learningOutcomes) &&
                course.learningOutcomes.length > 0 ? (
                  course.learningOutcomes
                    .slice(0, 8)
                    .map((t: string, i: number) => (
                      <LearningPoint key={i} text={t} />
                    ))
                ) : (
                  <>
                    <LearningPoint text="Fundamentos essenciais e boas práticas do mercado" />
                    <LearningPoint text="Desenvolvimento de projetos reais do início ao fim" />
                    <LearningPoint text="Uso avançado de ferramentas profissionais" />
                    <LearningPoint text="Fluxos de trabalho ágeis e produtivos" />
                    <LearningPoint text="Resolução de problemas complexos com confiança" />
                    <LearningPoint text="Preparação para entrevistas e desafios técnicos" />
                  </>
                )}
              </div>
            </section>

            {/* Course Content / Curriculum */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Conteúdo do curso
              </h2>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>
                  {Array.isArray(displayModules)
                    ? `${displayModules.length} módulos`
                    : "Sem módulos"}{" "}
                  •{" "}
                  {Array.isArray(displayModules)
                    ? `${displayModules.reduce((acc: number, m: any) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0), 0)} aulas`
                    : "0 aulas"}{" "}
                  • {course?.duration || "0h"} de duração total
                </span>
                <button
                  onClick={() => setExpandAll((v) => !v)}
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  {expandAll ? "Recolher tudo" : "Expandir tudo"}
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
                {Array.isArray(displayModules) && displayModules.length > 0 ? (
                  displayModules.map((mod: any, idx: number) => (
                    <AccordionItem
                      key={mod.id || idx}
                      title={mod.title || `Módulo ${idx + 1}`}
                      details={`${Array.isArray(mod?.lessons) ? mod.lessons.length : 0} aulas`}
                      isOpen={expandAll || idx === 0}
                      lessons={Array.isArray(mod?.lessons) ? mod.lessons : []}
                    />
                  ))
                ) : (
                  <div className="p-6 text-sm text-gray-500">
                    Currículo ainda não publicado.
                  </div>
                )}
              </div>
            </section>

            {/* Description */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Descrição
              </h2>
              <div className="prose text-gray-600 max-w-none leading-relaxed">
                {course?.fullDescription ? (
                  <p className="mb-4 whitespace-pre-line">
                    {course.fullDescription}
                  </p>
                ) : (
                  <>
                    <p className="mb-4">
                      Este curso foi meticulosamente planejado para levar você
                      do nível iniciante ao avançado. Combinamos teoria sólida
                      com prática intensiva, garantindo que você não apenas
                      entenda os conceitos, mas saiba aplicá-los em cenários do
                      mundo real.
                    </p>
                    <p className="mb-4">
                      Durante a jornada, você terá acesso a materiais
                      exclusivos, exercícios práticos e um projeto final que
                      poderá ser adicionado imediatamente ao seu portfólio.
                      Ideal para quem busca transição de carreira ou
                      aprimoramento profissional.
                    </p>
                  </>
                )}
                <h3 className="text-lg font-bold text-gray-800 mt-6 mb-2">
                  Para quem é este curso:
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Iniciantes que desejam entrar na área de{" "}
                    {course?.category || "Geral"}.
                  </li>
                  <li>
                    Profissionais que buscam atualização e novas técnicas.
                  </li>
                  <li>
                    Estudantes universitários querendo complementar o currículo.
                  </li>
                </ul>
              </div>
            </section>

            {/* Instructor */}
            <section className="bg-white border-t border-gray-100 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Seu Instrutor
              </h2>
              <div className="flex gap-6 items-start">
                <img
                  src={
                    instructorData?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(course?.instructor || "Instrutor")}&background=0e7038&color=fff&size=128`
                  }
                  alt={course?.instructor || "Instrutor"}
                  className="w-16 h-16 rounded-full object-cover border-4 border-gray-50 shadow-sm"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {course?.instructor || "Instrutor"}
                  </h3>
                  <p className="text-brand-green font-medium text-sm mb-3">
                    {instructorData?.profession ||
                      `Senior ${course?.category || "Geral"} Specialist`}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{course?.rating || "4.8"} Instructor Rating</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-gray-400" />
                      <span>{enrollmentCount.toLocaleString()} Formandos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4 text-gray-400" />
                      <span>{course?.courseCount || "12"} Cursos</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {instructorData?.bio ||
                      `Com mais de 10 anos de experiência na indústria, já liderei equipes em grandes empresas de tecnologia e ajudei a formar milhares de profissionais. Minha paixão é tornar conceitos complexos em algo simples e prático.`}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (Sticky Sidebar) */}
          <div className="lg:col-span-1 relative">
            <div className="lg:absolute lg:-top-64 lg:right-0 w-full lg:w-[360px] flex flex-col gap-6">
              {/* Purchase Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden sticky top-24">
                {/* Preview Image Area - Mostrar sempre a imagem de destaque */}
                <div className="relative aspect-video group cursor-pointer bg-gray-900">
                  <img
                    src={course?.imageUrl || course?.cardImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute bottom-4 left-0 w-full text-center">
                    <span className="text-white font-bold text-sm drop-shadow-md">
                      Pré-visualizar curso
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-end gap-3 mb-6">
                    {enrollmentCount > 0 && (
                      <span className="text-xs text-gray-500 font-medium">
                        {enrollmentCount.toLocaleString()} formandos inscritos
                      </span>
                    )}
                  </div>

                  {isEnrolled ? (
                    <Link
                      to={`/aluno/sala-de-aula/${course?.id || id}`}
                      className="w-full inline-flex items-center justify-center bg-emerald-600 hover:bg-slate-900 text-white font-bold py-4 rounded-lg shadow-lg shadow-emerald-600/20 transition-all mb-6 text-lg"
                    >
                      Continuar Curso
                    </Link>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full bg-emerald-600 hover:bg-slate-900 disabled:opacity-70 text-white font-bold py-4 rounded-lg shadow-lg shadow-emerald-600/20 transition-all mb-6 text-lg"
                    >
                      {enrolling
                        ? "Inscrevendo..."
                        : "Inscrever-se Gratuitamente"}
                    </button>
                  )}

                  <div className="space-y-4 pt-6 border-t border-gray-100">
                    <h4 className="font-bold text-gray-900 text-sm">
                      Este curso inclui:
                    </h4>
                    <FeatureRow
                      icon={<Infinity className="w-4 h-4" />}
                      text="Acesso vitalício total"
                    />
                    <FeatureRow
                      icon={<Smartphone className="w-4 h-4" />}
                      text="Acesso no celular e TV"
                    />
                    <FeatureRow
                      icon={<FileText className="w-4 h-4" />}
                      text="Exercícios e projetos práticos"
                    />
                    <FeatureRow
                      icon={<Download className="w-4 h-4" />}
                      text="Recursos para download"
                    />
                    <FeatureRow
                      icon={<Award className="w-4 h-4" />}
                      text="Certificado de conclusão"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                  <span>Compartilhar</span>
                  <Share2 className="w-4 h-4" />
                </div>
              </div>

              {/* Business Quote */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hidden lg:block">
                <h3 className="font-bold text-gray-900 mb-2">
                  Treinando uma equipe?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Obtenha acesso ilimitado a mais de 5.000 cursos para sua
                  empresa.
                </p>
                <button className="text-brand-dark font-bold text-sm hover:underline">
                  UEM Cursos online{" "}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components for this page ---

const LearningPoint: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-start gap-3">
    <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
    <span className="text-sm text-gray-700">{text}</span>
  </div>
);

const FeatureRow = ({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) => (
  <div className="flex items-center gap-3 text-sm text-gray-600">
    <div className="text-gray-900">{icon}</div>
    <span>{text}</span>
  </div>
);

const TimedHtml5Preview: React.FC<{ src?: string }> = ({ src }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      if (v.currentTime > 30) {
        v.pause();
        v.currentTime = 30;
      }
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, []);
  return (
    <video
      ref={videoRef}
      src={src}
      controls
      className="w-full h-full object-cover"
    >
      Desculpe, o seu navegador não suporta pré-visualização de vídeo.
    </video>
  );
};

const AccordionItem: React.FC<{
  title: string;
  details: string;
  isOpen?: boolean;
  lessons?: any[];
}> = ({
  title,
  details,
  isOpen = false,
  lessons = [] as any[],
}) => {
  const [open, setOpen] = React.useState(isOpen);
  React.useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);
  return (
    <div className="bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
          <span className="font-bold text-gray-800 text-sm md:text-base">
            {title}
          </span>
        </div>
        <span className="text-xs text-gray-500 hidden sm:block">{details}</span>
      </button>
      {open && (
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="space-y-3">
            {Array.isArray(lessons) && lessons.length > 0 ? (
              lessons.map((lsn: any, idx: number) => {
                const t = (lsn?.type || "video").toLowerCase();
                const Icon =
                  t === "text"
                    ? FileText
                    : t === "document"
                      ? File
                      : PlayCircle;
                const dur = lsn?.duration || "";
                return (
                  <div
                    key={lsn?.id || idx}
                    className="flex items-center gap-3 text-sm text-gray-600"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span>{lsn?.title || `Aula ${idx + 1}`}</span>
                    {dur ? (
                      <span className="ml-auto text-xs text-gray-400">
                        {dur}
                      </span>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <PlayCircle className="w-4 h-4 text-gray-400" />
                  <span>Aula 1: Bem-vindo ao curso</span>
                  <span className="ml-auto text-xs text-gray-400">04:20</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <PlayCircle className="w-4 h-4 text-gray-400" />
                  <span>Aula 2: Conceitos fundamentais</span>
                  <span className="ml-auto text-xs text-gray-400">12:15</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>Leitura complementar e Material de Apoio</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailsPage;
