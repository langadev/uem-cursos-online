import { ArrowRight, Clock, Flame, PlayCircle, Trophy } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import StudentLayout from "../../layouts/StudentLayout";
import { EnrolledCourse } from "../../types";

type CourseItem = EnrolledCourse & { lastAccessed?: string };

const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<CourseItem[]>([]);
  const [hoursWeek, setHoursWeek] = useState("0h 0m");
  const [certCount, setCertCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [recommended, setRecommended] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Implementar carregamento de cursos via MySQL API
    // Por enquanto, deixar vazio para evitar erros de Firebase
    setItems([]);
    setHoursWeek("0h 0m");
    setCertCount(0);
    setStreakDays(0);
  }, [profile]);

  // Placeholder para dados que virão da API MySQL
  const lastCourse = null; // TODO: Carregar do endpoint /api/enrollments/my-courses

  // Extrair o primeiro nome do perfil para a saudação
  const firstName = (
    profile?.name ||
    profile?.email?.split("@")[0] ||
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
