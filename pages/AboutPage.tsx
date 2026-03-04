import React from "react";
import { Target, Shield, Zap, Globe, Award } from "lucide-react";

const branding = {
  appearance: {
    primaryColor: "#1a6e3c",
    accentColor: "#89a022",
  },
};

const AboutPage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Hero - mesmo layout do Tutor/Categoria */}
      <section
        style={{ backgroundColor: branding.appearance.primaryColor }}
        className="text-white py-20 px-6"
      >
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 mb-6">
            <Award
              style={{ color: branding.appearance.accentColor }}
              className="w-4 h-4"
            />
            <span className="text-sm tracking-wide font-medium">
              Educação Acessível
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            A UEM Cursos Online nasceu com uma missão simples
          </h1>

          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
            Oferecer educação de qualidade,{" "}
            <span
              style={{
                color: branding.appearance.accentColor,
                fontWeight: "bold",
              }}
            >
              democratizar o conhecimento
            </span>{" "}
            e conectar profissionais às oportunidades do mercado global.
          </p>
        </div>
      </section>

      {/* Missão */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-brand-green font-bold mb-2 uppercase tracking-wider text-sm">
              <Target className="w-4 h-4" />
              Nossa Missão
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Educação que Gera Impacto Real
            </h2>

            <p className="text-gray-600 leading-relaxed">
              Acreditamos que a educação deve ser prática, relevante e contínua.
              Nossos cursos são desenhados não apenas para transmitir teoria,
              mas para construir competências aplicáveis imediatamente no
              mercado de trabalho.
            </p>
          </div>

          <div>
            <img
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80"
              alt="Equipa a trabalhar"
              className="rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div
        style={{ backgroundColor: branding.appearance.primaryColor }}
        className="py-20 text-white"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatBox number="50k+" label="Formandos" />
          <StatBox number="120+" label="Cursos Disponíveis" />
          <StatBox number="4.8" label="Nota Média" />
          <StatBox number="25+" label="Países Alcançados" />
        </div>
      </div>

      {/* Valores */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Nossos Valores
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Os pilares que sustentam cada aula e cada experiência na nossa
            plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ValueCard
            icon={<Shield className="w-8 h-8 text-brand-green" />}
            title="Excelência e Qualidade"
            description="Buscamos a excelência em cada detalhe do conteúdo que oferecemos."
          />

          <ValueCard
            icon={<Globe className="w-8 h-8 text-blue-500" />}
            title="Acessibilidade Global"
            description="Conhecimento sem fronteiras, disponível para todos."
          />

          <ValueCard
            icon={<Zap className="w-8 h-8 text-brand-accent" />}
            title="Inovação Constante"
            description="Atualizamos continuamente nossos conteúdos conforme o mercado evolui."
          />
        </div>
      </div>
    </div>
  );
};

const StatBox = ({
  number,
  label,
}: {
  number: string;
  label: string;
}) => (
  <div>
    <p className="text-4xl md:text-5xl font-bold mb-2 text-brand-accent">
      {number}
    </p>
    <p className="text-white/70 font-medium">{label}</p>
  </div>
);

const ValueCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all text-center md:text-left">
    <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 mx-auto md:mx-0">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-500 leading-relaxed">{description}</p>
  </div>
);

export default AboutPage;



