import { PlayCircle, X } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useBranding } from "../contexts/BrandingContext";

const Hero: React.FC = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const { branding } = useBranding();

  return (
    <>
      <section
        className="relative w-full via-white pt-16 pb-24 md:pt-24 md:pb-32 px-6"
        style={{
          backgroundImage: `linear-gradient(to bottom right, ${branding.appearance.primaryColor}15, white, ${branding.appearance.primaryColor}08)`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 border"
            style={{
              backgroundColor: branding.appearance.primaryColor + "15",
              borderColor: branding.appearance.primaryColor + "30",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: branding.appearance.accentColor }}
            ></span>
            <span
              className="text-xs font-bold tracking-wider uppercase"
              style={{ color: branding.appearance.primaryColor }}
            >
              Novas Turmas Abertas
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl md:text-6xl font-extrabold leading-tight mb-6"
            style={{ color: branding.appearance.primaryColor }}
          >
            Universidade Eduardo Mondlane <br />

            <span style={{ color: branding.appearance.accentColor }}>
              Cursos
            </span>
            <span className="relative"> Online</span>{" "}
          </h1>

          {/* Subtext */}
          <p className="text-gray-500 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
        Para Gestores, professores e CTA.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              to="/cursos"
              className="text-white font-bold py-3.5 px-8 rounded-lg shadow-lg transition-all hover:-translate-y-0.5 text-center"
              style={{
                backgroundColor: branding.appearance.primaryColor,
                boxShadow: `0 20px 25px ${branding.appearance.primaryColor}30`,
              }}
            >
              Explorar cursos
            </Link>

            <button
              onClick={() => setIsVideoOpen(true)}
              className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-8 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <PlayCircle
                className="w-5 h-5 fill-current"
                style={{ color: branding.appearance.accentColor }}
              />
              <span>Como funciona</span>
            </button>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isVideoOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsVideoOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/S_8Z3C8i5d0?autoplay=1&rel=0"
              title="UEM Cursos online Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
};

export default Hero;
