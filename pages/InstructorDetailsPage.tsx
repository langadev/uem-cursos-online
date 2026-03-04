import {
    ArrowLeft,
    Award,
    Calendar,
    Globe,
    Linkedin,
    Mail,
    PlayCircle,
    Star,
    Twitter,
    Users,
} from "lucide-react";
import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useBranding } from "../contexts/BrandingContext";
import { useTutorDetails } from "../hooks/useTutors";

const InstructorDetailsPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { tutor, loading, error } = useTutorDetails(uid || "");
  const { branding } = useBranding();

  if (!uid) {
    return <Navigate to="/tutores" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Carregando detalhes do tutor...</p>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <p className="text-red-800 font-semibold mb-2">
            Erro ao carregar tutor
          </p>
          <p className="text-red-600 text-sm mb-6">
            {error || "Tutor não encontrado"}
          </p>
          <button
            onClick={() => navigate("/tutores")}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-md transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div
        style={{
          backgroundImage: `linear-gradient(to bottom right, ${branding.appearance.primaryColor}, ${branding.appearance.primaryColor}99)`,
        }}
        className="text-white py-20 px-6"
      >
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/tutores")}
            className="flex items-center gap-2 text-brand-light hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para Tutores</span>
          </button>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-end">
            <div>
              <img
                src={
                  tutor.avatar_url ||
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                }
                alt={tutor.full_name}
                className="w-32 h-32 rounded-full object-cover border-4 border-brand-accent shadow-2xl"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
                {tutor.full_name}
              </h1>
              <p className="text-brand-light text-lg mb-4">
                Tutor Certificado • {tutor.status}
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div
                  style={{
                    backgroundColor: `${branding.appearance.primaryColor}20`,
                    borderLeft: `4px solid ${branding.appearance.accentColor}`,
                  }}
                  className="rounded-lg px-4 py-3 backdrop-blur-sm"
                >
                  <Users
                    style={{ color: branding.appearance.accentColor }}
                    className="w-5 h-5 mb-2"
                  />
                  <p className="text-2xl font-bold text-white">
                    {tutor.total_students || 0}
                  </p>
                  <p className="text-xs text-white/80">Formandos</p>
                </div>
                <div
                  style={{
                    backgroundColor: `${branding.appearance.primaryColor}20`,
                    borderLeft: `4px solid ${branding.appearance.accentColor}`,
                  }}
                  className="rounded-lg px-4 py-3 backdrop-blur-sm"
                >
                  <PlayCircle
                    style={{ color: branding.appearance.accentColor }}
                    className="w-5 h-5 mb-2"
                  />
                  <p className="text-2xl font-bold text-white">
                    {tutor.course_count || 0}
                  </p>
                  <p className="text-xs text-white/80">Cursos</p>
                </div>
                <div
                  style={{
                    backgroundColor: `${branding.appearance.primaryColor}20`,
                    borderLeft: `4px solid ${branding.appearance.accentColor}`,
                  }}
                  className="rounded-lg px-4 py-3 backdrop-blur-sm"
                >
                  <Star
                    style={{ color: branding.appearance.accentColor }}
                    className="w-5 h-5 mb-2"
                  />
                  <p className="text-2xl font-bold text-white">
                    {tutor.avg_rating?.toFixed(1) || "N/A"}
                  </p>
                  <p className="text-xs text-white/80">Avaliação</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Informações de Contato */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Mail className="w-6 h-6 text-brand-green" />
                Informações de Contato
              </h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {tutor.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 font-medium">
                    {tutor.status}
                  </span>
                </div>
              </div>
            </section>

            {/* Sobre o Tutor */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Award className="w-6 h-6 text-brand-green" />
                Sobre o Tutor
              </h2>
              <div className="bg-gray-50 rounded-lg p-8">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {tutor.bio ||
                    "Tutor certificado e experiente na plataforma UEM Cursos online com um excelente histórico de ensino e satisfação dos formandos."}
                </p>
              </div>
            </section>

            {/* Cursos do Tutor */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <PlayCircle className="w-6 h-6 text-brand-green" />
                Cursos ({tutor.courses.length})
              </h2>

              {tutor.courses.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <PlayCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Este tutor ainda não possui cursos publicados
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tutor.courses.map((course) => (
                    <div
                      key={course.id}
                      className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all"
                    >
                      <div className="h-40 bg-gradient-to-br from-brand-green to-brand-dark overflow-hidden">
                        {course.image_url ? (
                          <img
                            src={course.image_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle className="w-12 h-12 text-white/50" />
                          </div>
                        )}
                      </div>

                      <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {course.title}
                        </h3>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="inline-block bg-gray-100 px-2 py-1 rounded">
                              {course.category || "Geral"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{course.duration || "Duração variável"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-brand-accent fill-current" />
                            <span className="font-semibold text-gray-900">
                              {course.rating || "N/A"}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({course.review_count || 0})
                            </span>
                          </div>

                          <button className="text-brand-green hover:text-brand-dark font-semibold transition-colors">
                            Ver Curso →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div>
            {/* Redes Sociais */}
            <div className="bg-gradient-to-br from-brand-green to-brand-dark rounded-xl p-8 text-white mb-8">
              <h3 className="text-xl font-bold mb-6">Conecte-se</h3>
              <div className="space-y-4">
                <button className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-3 font-semibold">
                  <Linkedin className="w-5 h-5" />
                  LinkedIn
                </button>
                <button className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-3 font-semibold">
                  <Twitter className="w-5 h-5" />
                  Twitter
                </button>
                <button className="w-full flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-3 font-semibold">
                  <Globe className="w-5 h-5" />
                  Website
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Informações</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Membro desde</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {tutor.createdAt
                      ? new Date(
                          tutor.createdAt.seconds
                            ? tutor.createdAt.seconds * 1000
                            : tutor.createdAt,
                        ).toLocaleDateString("pt-BR")
                      : "Data indisponível"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">ID do Instrutor</p>
                  <p className="font-mono text-xs text-gray-500 break-all">
                    {tutor.uid}
                  </p>
                </div>
              </div>

              <button className="w-full mt-6 bg-brand-green hover:bg-brand-dark text-white font-bold py-3 rounded-lg transition-colors">
                Matricular-se em um Curso
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Importar Clock se não existir
const Clock = ({ className }: { className: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default InstructorDetailsPage;
