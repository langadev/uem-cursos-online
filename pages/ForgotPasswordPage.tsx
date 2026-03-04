import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call logic here
    console.log('Reset password for:', email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row border border-gray-100">

        {/* Left Side - Image/Brand */}
        <div className="md:w-1/2 bg-brand-dark relative hidden md:flex flex-col justify-between p-12 text-white">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Recuperação de Acesso</h2>
            <p className="text-brand-light/80 leading-relaxed">
              Não se preocupe, acontece com todos. Vamos ajudá-lo a recuperar o acesso à sua jornada de aprendizado em poucos passos.
            </p>
          </div>

          <div className="relative z-10">
            <div className="h-1 w-20 bg-brand-accent rounded-full"></div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 bg-brand-green/20 mix-blend-overlay"></div>
          <img
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            alt="Support"
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay grayscale"
          />
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          {submitted ? (
            <div className="text-center animate-fadeIn">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Enviamos instruções de recuperação para <strong>{email}</strong>.
                <br />Por favor, verifique sua caixa de entrada e spam.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 font-bold text-brand-green hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center md:text-left mb-8">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Link>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Esqueceu a senha?</h3>
                <p className="text-gray-500 text-sm">
                  Digite o e-mail associado à sua conta e enviaremos um link para redefinir sua senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail cadastrado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-brand-green focus:border-brand-green transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-all transform hover:-translate-y-0.5"
                >
                  Enviar Link de Recuperação
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;