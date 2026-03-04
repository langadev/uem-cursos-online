import { GraduationCap, Instagram, Linkedin, Twitter } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useBranding } from "../contexts/BrandingContext";

const Footer: React.FC = () => {
  const { branding } = useBranding();

  return (
  <footer className="bg-white border-t border-gray-100 py-12 px-6 md:px-12 mt-auto">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-center items-center gap-12 md:gap-16">

    {/* Brand - Apenas o Logotipo */}
    <div className="flex flex-col items-center">
      <img
        src="/uem.svg"
        alt="Logo UEM"
        className="h-16 w-auto"
      />
    </div>

    {/* Links */}
    <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500 font-medium">
      <Link
        to="/termos"
        className="hover:opacity-80 transition-opacity"
        style={{ color: branding.appearance.primaryColor }}
      >
        Termos
      </Link>
      <Link
        to="/privacidade"
        className="hover:opacity-80 transition-opacity"
        style={{ color: branding.appearance.primaryColor }}
      >
        Privacidade
      </Link>
      <a
        href="#"
        className="hover:opacity-80 transition-opacity"
        style={{ color: branding.appearance.primaryColor }}
      >
        Ajuda
      </a>
      <a
        href="#"
        className="hover:opacity-80 transition-opacity"
        style={{ color: branding.appearance.primaryColor }}
      >
        Carreiras
      </a>
    </div>

    {/* Socials */}
    <div className="flex gap-4">
      <SocialButton
        icon={<Linkedin className="w-4 h-4" />}
        color={branding.appearance.primaryColor}
      />
      <SocialButton
        icon={<Instagram className="w-4 h-4" />}
        color={branding.appearance.primaryColor}
      />
      <SocialButton
        icon={<Twitter className="w-4 h-4" />}
        color={branding.appearance.primaryColor}
      />
    </div>
  </div>

  {/* Copyright com o ano dinâmico e nome da instituição apenas aqui */}
  <div className="text-center text-xs text-gray-400 mt-12">
    © {new Date().getFullYear()} {branding.appearance.institutionName}. Todos os direitos reservados.
  </div>
</footer>
  );
};

const SocialButton: React.FC<{ icon: React.ReactNode; color: string }> = ({
  icon,
  color,
}) => (
  <button
    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-white hover:opacity-90 transition-colors"
    style={{ backgroundColor: color + "20", color: color }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = color)}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color + "20")}
  >
    {icon}
  </button>
);

export default Footer;
