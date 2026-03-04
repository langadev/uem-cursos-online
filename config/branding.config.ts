/**
 * Configuração Centralizada de Branding
 * Este arquivo controla TODA a aparência do sistema
 * Não depende do Firebase - é configuração local
 */

export const BrandingConfig = {
  // === INFORMAÇÕES PRINCIPAIS ===
  platformName: "UEM Cursos online",
  institutionName: "Universidade Eduardo Mondlane",
  applicationName: "UEM Cursos online",

  // === LOGO/ÍCONE ===
  // Opção 1: Use uma URL de imagem
  logoUrl: "/logo-plataforma.svg",

  // Opção 2: Use texto (será exibido como logo)
  // logoText: "UEM",
  // logoSubtext: "Cursos online",

  // === CORES ===
  primaryColor: "#0e7038", // Verde
  accentColor: "#eab308", // Amarelo/Ouro
  darkColor: "#1e293b", // Cinza escuro
  lightColor: "#f1f5f9", // Cinza claro

  // === TIPOGRAFIA ===
  fontFamily: "Inter",

  // === SISTEMA ===
  system: {
    maintenanceMode: false,
    publicSignups: true,
    dynamicCache: true,
  },

  // === SEGURANÇA ===
  security: {
    require2FA: true,
    auditLogs: true,
    limitedSessions: false,
  },
};

/**
 * COMO USAR:
 *
 * 1. PARA MUDAR APENAS O NOME:
 *    platformName: "MEU NOME"
 *
 * 2. PARA USAR IMAGEM COMO LOGO:
 *    logoUrl: "/meu-logo.png"
 *
 * 3. PARA USAR TEXTO COMO LOGO:
 *    logoText: "MEU"
 *    logoSubtext: "Logo"
 *
 * 4. PARA MUDAR CORES:
 *    primaryColor: "#000000"
 *    accentColor: "#ffffff"
 */
