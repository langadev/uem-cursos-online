import React, { useEffect } from "react";

const TermsPage: React.FC = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white min-h-screen pb-20 font-sans">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-brand-dark mb-4">
            Termos e Condições de Uso
          </h1>
          <p className="text-gray-500 text-lg">
            Última atualização: 24 de Outubro de 2024
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg prose-green max-w-none text-gray-600">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. Visão Geral
            </h2>
            <p className="mb-4">
              Bem-vindo à UEM Cursos online. Ao acessar nossa plataforma, criar
              uma conta ou adquirir nossos cursos, você concorda em cumprir
              estes Termos e Condições. Por favor, leia-os atentamente antes de
              utilizar nossos serviços.
            </p>
            <p>
              Estes termos aplicam-se a todos os visitantes, usuários e outras
              pessoas que acessam ou usam o Serviço. Se você discordar de
              qualquer parte dos termos, então você não tem permissão para
              acessar o Serviço.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Uso da Plataforma
            </h2>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                Você deve ter pelo menos 16 anos de idade para usar este
                Serviço.
              </li>
              <li>
                Você é responsável por manter a confidencialidade de sua conta e
                senha.
              </li>
              <li>
                Você concorda em não usar o Serviço para qualquer finalidade
                ilegal ou não autorizada.
              </li>
              <li>
                A UEM Cursos online reserva-se o direito de encerrar contas que
                violem estes termos ou apresentem comportamento abusivo.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. Propriedade Intelectual
            </h2>
            <p className="mb-4">
              O Serviço e todo o seu conteúdo original (excluindo conteúdo
              fornecido pelos usuários), características e funcionalidades são e
              permanecerão de propriedade exclusiva da UEM Cursos online e seus
              licenciadores.
            </p>
            <p>
              O material didático, vídeos, exercícios e códigos-fonte
              disponibilizados nos cursos são para uso pessoal e intransferível
              do aluno. É estritamente proibida a reprodução, distribuição ou
              venda de qualquer material sem autorização expressa.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Pagamentos e Reembolsos
            </h2>
            <p className="mb-4">
              <strong>Pagamentos:</strong> Ao adquirir um curso, você concorda
              em fornecer informações de pagamento válidas. Os preços estão
              sujeitos a alterações, mas as alterações não afetarão compras já
              realizadas.
            </p>
            <p className="mb-4">
              <strong>Garantia de 30 Dias:</strong> Se você não estiver
              satisfeito com um curso adquirido, poderá solicitar reembolso
              total no prazo de 30 dias após a compra, desde que não tenha
              consumido mais de 50% do conteúdo do curso.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Limitação de Responsabilidade
            </h2>
            <p>
              Em nenhum caso a UEM Cursos online, seus diretores, funcionários,
              parceiros, agentes, fornecedores ou afiliados, serão responsáveis
              por quaisquer danos indiretos, incidentais, especiais,
              consequenciais ou punitivos, incluindo, sem limitação, perda de
              lucros, dados, uso, boa vontade ou outras perdas intangíveis.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Alterações
            </h2>
            <p>
              Reservamo-nos o direito, a nosso exclusivo critério, de modificar
              ou substituir estes Termos a qualquer momento. Se uma revisão for
              material, tentaremos fornecer um aviso com pelo menos 30 dias de
              antecedência antes de quaisquer novos termos entrarem em vigor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Contato
            </h2>
            <p>
              Se você tiver alguma dúvida sobre estes Termos, entre em contato
              conosco através do e-mail:{" "}
              <span className="text-brand-green font-semibold">
                legal@uemcursos.mz
              </span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
