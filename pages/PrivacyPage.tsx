import React, { useEffect } from "react";

const PrivacyPage: React.FC = () => {
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
            Política de Privacidade
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
              1. Introdução
            </h2>
            <p className="mb-4">
              A sua privacidade é importante para nós. É política da UEM Cursos
              online respeitar a sua privacidade em relação a qualquer
              informação sua que possamos coletar no site UEM Cursos online, e
              outros sites que possuímos e operamos.
            </p>
            <p>
              Solicitamos informações pessoais apenas quando realmente
              precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios
              justos e legais, com o seu conhecimento e consentimento. Também
              informamos por que estamos coletando e como será usado.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Coleta de Dados
            </h2>
            <p className="mb-4">
              Podemos coletar os seguintes tipos de informações:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                <strong>Informações de Identificação Pessoal:</strong> Nome,
                endereço de e-mail, número de telefone, etc., que você nos
                fornece voluntariamente ao se registrar ou comprar um curso.
              </li>
              <li>
                <strong>Dados de Uso:</strong> Informações sobre como você
                acessa e usa o Serviço (por exemplo, duração da visita, páginas
                visualizadas, navegador utilizado).
              </li>
              <li>
                <strong>Cookies:</strong> Utilizamos cookies para melhorar a
                experiência do usuário, lembrar preferências e analisar o
                tráfego do site.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. Uso das Informações
            </h2>
            <p className="mb-4">
              Usamos as informações coletadas para diversas finalidades:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>Fornecer e manter nosso Serviço;</li>
              <li>Notificá-lo sobre alterações em nosso Serviço;</li>
              <li>
                Permitir que você participe de recursos interativos de nosso
                Serviço;
              </li>
              <li>Fornecer suporte ao cliente;</li>
              <li>
                Reunir análises ou informações valiosas para que possamos
                melhorar nosso Serviço;
              </li>
              <li>Monitorar o uso de nosso Serviço;</li>
              <li>Detectar, prevenir e resolver problemas técnicos.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Retenção de Dados
            </h2>
            <p className="mb-4">
              Apenas retemos as informações coletadas pelo tempo necessário para
              fornecer o serviço solicitado. Quando armazenamos dados,
              protegemos dentro de meios comercialmente aceitáveis ​​para evitar
              perdas e roubos, bem como acesso, divulgação, cópia, uso ou
              modificação não autorizados.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Compartilhamento de Dados
            </h2>
            <p className="mb-4">
              Não compartilhamos informações de identificação pessoal
              publicamente ou com terceiros, exceto quando exigido por lei ou
              para processamento de pagamentos (gateways seguros).
            </p>
            <p>
              O nosso site pode ter links para sites externos que não são
              operados por nós. Esteja ciente de que não temos controle sobre o
              conteúdo e práticas desses sites e não podemos aceitar
              responsabilidade por suas respectivas políticas de privacidade.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Seus Direitos (LGPD)
            </h2>
            <p className="mb-4">
              Você é livre para recusar a nossa solicitação de informações
              pessoais, entendendo que talvez não possamos fornecer alguns dos
              serviços desejados.
            </p>
            <p>
              Se você é residente no Brasil, tem direitos garantidos pela Lei
              Geral de Proteção de Dados (LGPD), incluindo o direito de acessar,
              corrigir, portar e excluir seus dados pessoais. Para exercer esses
              direitos, entre em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Contato
            </h2>
            <p>
              Se você tiver alguma dúvida sobre como lidamos com dados do
              usuário e informações pessoais, entre em contato conosco através
              do e-mail:{" "}
              <span className="text-brand-green font-semibold">
                privacidade@uemcursos.mz
              </span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
