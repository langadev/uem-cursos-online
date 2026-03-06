import {
    ArrowRight,
    Award,
    Globe,
    Linkedin,
    PlayCircle,
    Star,
    Twitter,
    Users,
} from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import { useTutors } from "../hooks/useTutors";

const InstructorsPage: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { tutors, loading, error } = useTutors();
  const navigate = useNavigate();
  const { branding } = useBranding();

  const canView =
    !authLoading &&
    profile &&
    (profile.role === "instructor" || profile.role === "admin");

  const handleViewProfile = (uid: string) => {
    navigate(`/tutores/${uid}`);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section
        style={{
          backgroundColor: branding.appearance.primaryColor,
        }}
        className="text-white py-20 px-6 relative overflow-hidden"
      >
        <div
          style={{ backgroundColor: `${branding.appearance.primaryColor}50` }}
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
        ></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full mb-6 border border-white/20">
            <Award
              style={{ color: branding.appearance.accentColor }}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium tracking-wide">
              Excelência Garantida
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            Aprenda com quem{" "}
            <span style={{ color: branding.appearance.accentColor }}>
              lidera
            </span>{" "}
            o mercado
          </h1>
          <p className="text-brand-light/80 text-lg md:text-xl max-w-2xl mx-auto">
            Nossos tutores são especialistas selecionados a dedo, os melhores da
            Universidade Eduardo Mondlane.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        {!canView && (
          <div className="min-h-[400px] flex items-center justify-center">
            <p className="text-gray-500 text-lg">
              A informação sobre tutores não está disponível.
            </p>
          </div>
        )}

        {canView && loading && (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">Carregando tutores...</p>
            </div>
          </div>
        )}

        {canView && error && (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
              <p className="text-red-800 font-semibold mb-2">
                Erro ao carregar tutores
              </p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {canView && !loading && tutors.length === 0 && (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Nenhum tutor disponível no momento
              </p>
            </div>
          </div>
        )}

        {canView && !loading && tutors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tutors.map((tutor) => (
              <div
                key={tutor.uid}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Profile Header */}
                <div className="p-6 pb-0 flex items-start gap-4">
                  <img
                    src={
                      tutor.avatar_url ||
                      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                    }
                    alt={tutor.full_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 group-hover:border-brand-light transition-colors"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-green transition-colors">
                      {tutor.full_name}
                    </h3>
                    <p className="text-sm font-medium text-brand-dark mb-0.5">
                      {tutor.email}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      {tutor.status}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <div className="p-6">
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Tutor certificado e com experiência na plataforma UEM Cursos
                    online.
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between py-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users
                        style={{ color: branding.appearance.accentColor }}
                        className="w-4 h-4"
                      />
                      <span className="font-bold">
                        {tutor.total_students || 0}
                      </span>
                      <span className="text-xs">formandos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Star
                        style={{ color: branding.appearance.accentColor }}
                        className="w-4 h-4 fill-current"
                      />
                      <span className="font-bold">
                        {tutor.avg_rating?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <PlayCircle
                        style={{ color: branding.appearance.accentColor }}
                        className="w-4 h-4"
                      />
                      <span className="font-bold">
                        {tutor.course_count || 0}
                      </span>
                      <span className="text-xs">cursos</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 mt-auto">
                    <div className="flex gap-3">
                      <button className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Linkedin className="w-5 h-5" />
                      </button>
                      <button className="text-gray-400 hover:text-sky-500 transition-colors">
                        <Twitter className="w-5 h-5" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-800 transition-colors">
                        <Globe className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleViewProfile(tutor.uid)}
                      style={{ color: branding.appearance.primaryColor }}
                      className="text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all opacity-70 hover:opacity-100"
                    >
                      Ver Perfil <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Become an Instructor CTA */}
      <section className="bg-gray-50 py-20 px-6">
        <div
          style={{ backgroundColor: branding.appearance.primaryColor }}
          className="max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
        >
          <div className="p-10 md:p-14 md:w-3/5 text-white flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Torne-se um Tutor na UEM Cursos online
            </h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Compartilhe seu conhecimento, impacte milhares de carreiras e gere
              uma nova fonte de renda. Junte-se à nossa comunidade de
              especialistas.
            </p>
            <button
              style={{
                backgroundColor: branding.appearance.accentColor,
              }}
              className="text-brand-dark font-bold py-4 px-8 rounded-xl w-fit transition-all opacity-90 hover:opacity-100 shadow-lg shadow-black/10"
            >
              Começar a Ensinar Hoje
            </button>
          </div>
          <div className="md:w-2/5 bg-black relative min-h-[300px]">
            <img
              src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Dark background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default InstructorsPage;
