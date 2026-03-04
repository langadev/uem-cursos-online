/**
 * Sistema de Proteção de Rotas
 * Centraliza toda a lógica de controle de acesso por role
 */

import { UserProfile } from "../contexts/AuthContext";

export type UserRole = "student" | "instructor" | "admin";

/**
 * Define as rotas que cada role pode acessar
 */
const ROLE_BASED_ROUTES: Record<UserRole, string[]> = {
  admin: [
    "/admin/dashboard",
    "/admin/usuarios",
    "/admin/tutores",
    "/admin/conteudos",
    "/admin/moderacao",
    "/admin/permissoes",
    "/admin/analytics",
    "/admin/configuracoes",
  ],
  instructor: [
    "/instrutor/dashboard",
    "/instrutor/cursos",
    "/instrutor/cursos/novo",
    "/instrutor/cursos/editar",
    "/instrutor/alunos",
    "/instrutor/duvidas",
    "/instrutor/relatorios",
    "/instrutor/configuracoes",
  ],
  student: [
    "/aluno/dashboard",
    "/aluno/cursos",
    "/aluno/historico",
    "/aluno/forum",
    "/aluno/certificados",
    "/aluno/certificado",
    "/aluno/configuracoes",
    "/aluno/feedback",
    "/aluno/inscricao",
    "/aluno/sala-de-aula",
  ],
};

/**
 * Rotas públicas que não requerem autenticação
 */
export const PUBLIC_ROUTES = [
  "/",
  "/cursos",
  "/tutores",
  "/categorias",
  "/comunidade",
  "/sobre",
  "/termos",
  "/privacidade",
  "/login",
  "/cadastro",
  "/recuperar-senha",
];

/**
 * Dashboard padrão para cada role
 */
export const DEFAULT_DASHBOARD: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  instructor: "/instrutor/dashboard",
  student: "/aluno/dashboard",
};

/**
 * Verifica se um utilizador pode acessar uma rota específica
 * @param pathname - O caminho que tenta acessar
 * @param userRole - O role do utilizador
 * @returns true se pode acessar, false caso contrário
 */
export const canAccessRoute = (
  pathname: string,
  userRole: UserRole | undefined,
): boolean => {
  if (!userRole) return false;

  const routes = ROLE_BASED_ROUTES[userRole];

  // Verifica se o pathname começa com alguma das rotas permitidas
  return routes.some((route) => pathname.startsWith(route));
};

/**
 * Obtém o dashboard padrão para o role do utilizador
 * @param profile - Perfil do utilizador
 * @returns URL do dashboard ou "/" se role inválido
 */
export const getDefaultDashboard = (profile: UserProfile | null): string => {
  if (!profile || !profile.role) return "/";
  return DEFAULT_DASHBOARD[profile.role] || "/";
};

/**
 * Verifica se um pathname é uma rota pública
 * @param pathname - O caminho a verificar
 * @returns true se é uma rota pública
 */
export const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route),
  );
};

/**
 * Garante que um utilizador não acede a rotas de outro role
 * @param pathname - O caminho que tenta acessar
 * @param userRole - O role do utilizador
 * @param allowFallback - Se deve permitir fallback para dashboard padrão
 * @returns O pathname correto ou null se acesso negado
 */
export const validateRoleAccess = (
  pathname: string,
  userRole: UserRole | undefined,
  allowFallback = true,
): string | null => {
  // Rotas públicas sempre permitidas
  if (isPublicRoute(pathname)) {
    return pathname;
  }

  // Se não tem role, nega acesso
  if (!userRole) {
    return null;
  }

  // Se pode acessar, permite
  if (canAccessRoute(pathname, userRole)) {
    return pathname;
  }

  // Se tem fallback ativado, retorna o dashboard padrão
  if (allowFallback) {
    return DEFAULT_DASHBOARD[userRole];
  }

  return null;
};

/**
 * Verifica se um role é válido
 * @param role - O role a validar
 * @returns true se é um role válido
 */
export const isValidRole = (role: unknown): role is UserRole => {
  return role === "admin" || role === "instructor" || role === "student";
};

/**
 * Log de tentativa de acesso não autorizado (útil para debugging)
 * @param pathname - Caminho não autorizado
 * @param userRole - Role do utilizador
 * @param userId - ID do utilizador
 */
export const logUnauthorizedAccess = (
  pathname: string,
  userRole: UserRole | undefined,
  userId: string | undefined,
): void => {
  console.warn("[SECURITY] Tentativa de acesso não autorizado:", {
    timestamp: new Date().toISOString(),
    pathname,
    userRole: userRole || "anonymous",
    userId: userId || "unknown",
  });
};
