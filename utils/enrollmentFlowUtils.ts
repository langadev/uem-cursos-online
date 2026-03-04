/**
 * Utilitários para o fluxo de inscrição em cursos
 *
 * FLUXO DE INSCRIÇÃO COMPLETO:
 *
 * 1. USUÁRIO NÃO AUTENTICADO CLICA "INSCREVER-SE GRATUITAMENTE"
 *    - CourseDetailsPage.handleEnroll() detecta que não há user.uid
 *    - Redireciona para /login com state: { from: "/aluno/inscricao/{courseId}" }
 *
 * 2. USUÁRIO FAZ LOGIN
 *    - LoginPage verifica o state.from após login bem-sucedido
 *    - redirectToDashboard() usa o state.from em vez do dashboard padrão
 *    - Redireciona para /aluno/inscricao/{courseId}
 *
 * 3. USUÁRIO VEEM PÁGINA DE CONFIRMAÇÃO DE INSCRIÇÃO
 *    - EnrollmentPage mostra detalhes do curso e opção de confirmar
 *    - Botão "Confirmar Inscrição" ou "Ir para a sala de aula" (se já inscrito)
 *
 * 4. USUÁRIO CONFIRMA INSCRIÇÃO
 *    - handleConfirm() cria um documento em "enrollments"
 *    - Redireciona automaticamente para /aluno/sala-de-aula/{courseId}
 *
 * 5. USUÁRIO ACESSA A SALA DE AULA
 *    - CoursePlayerPage carrega o conteúdo do curso
 *    - Usuário pode assistir aulas, fazer download de recursos, etc.
 *
 * FLUXO DE CONTINUAÇÃO (USUÁRIO JÁ INSCRITO):
 *
 * 1. USUÁRIO ACESSA /cursos/{id}
 *    - CourseDetailsPage verifica se isEnrolled
 *    - Se inscrito: mostra botão "Continuar Curso" (Link para /aluno/sala-de-aula/{id})
 *    - Se não inscrito: mostra botão "Inscrever-se Gratuitamente"
 *
 * 2. USUÁRIO CLICA "CONTINUAR CURSO"
 *    - Link direto para /aluno/sala-de-aula/{id}
 *    - Carrega a página da sala de aula normalmente
 */

export interface EnrollmentFlowState {
  /**
   * URL para redirecionar após login bem-sucedido
   * Ex: "/aluno/inscricao/course-123"
   */
  from?: string;
}

/**
 * Cria um state para navegação que preserva a intenção do usuário
 * Útil para redirecionar após login
 *
 * @param courseId - ID do curso
 * @returns objeto state para usar com navigate()
 */
export const createEnrollmentRedirectState = (
  courseId: string,
): EnrollmentFlowState => ({
  from: `/aluno/inscricao/${courseId}`,
});

/**
 * Verifica se o usuário está tentando navegar a partir de um fluxo de inscrição
 * @param state - state da localização
 * @returns courseId se estiver no fluxo, null caso contrário
 */
export const extractCourseIdFromEnrollmentFlow = (
  state: any,
): string | null => {
  const from = state?.from as string | undefined;
  if (!from) return null;

  const match = from.match(/\/aluno\/inscricao\/(.+)$/);
  return match?.[1] || null;
};

/**
 * Estados possíveis do fluxo de inscrição
 */
export enum EnrollmentFlowStep {
  /** Usuário visualiza o curso e decide se quer se inscrever */
  COURSE_DETAILS = "course_details",

  /** Usuário não autenticado é redirecionado para login */
  LOGIN = "login",

  /** Usuário vê a página de confirmação de inscrição */
  ENROLLMENT_CONFIRMATION = "enrollment_confirmation",

  /** Usuário inicia o curso na sala de aula */
  CLASSROOM = "classroom",

  /** Usuário continua um curso já iniciado */
  CONTINUE_COURSE = "continue_course",
}
