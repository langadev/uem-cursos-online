import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    User,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";

const RegisterPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("É necessário aceitar os termos de uso.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Criar utilizador no Firebase
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // 2. Adicionar o nome ao perfil do Firebase
      await updateProfile(result.user, { displayName: name });

      // 3. O AuthContext irá detectar a mudança e criar o perfil no Supabase automaticamente
      // Se há um estado anterior (ex: inscrição em curso), redirecionamos para lá
      const state = location.state as { from?: string } | undefined;
      if (state?.from) {
        navigate(state.from, { replace: true });
      } else {
        // Caso contrário, vai para a página inicial
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está em uso por outra conta.");
      } else if (err.code === "auth/weak-password") {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setError("Ocorreu um erro ao criar a sua conta.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        {/* Lado Esquerdo */}
        <div className="md:w-1/2 bg-brand-dark relative hidden md:flex flex-col justify-between p-12 text-white">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Crie sua conta</h2>
            <p className="text-brand-light/80 leading-relaxed">
              Junte-se à maior comunidade de aprendizado online e transforme o
              seu futuro hoje.
            </p>
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-brand-green/20 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-brand-accent" />
              </div>
              <span className="text-sm font-medium">
                Acesso a cursos exclusivos
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-brand-green/20 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-brand-accent" />
              </div>
              <span className="text-sm font-medium">
                Certificados verificados
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-brand-green/20 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-brand-accent" />
              </div>
              <span className="text-sm font-medium">
                Suporte com tutores reais
              </span>
            </div>
          </div>

          <div className="absolute inset-0 bg-brand-green/20 mix-blend-overlay"></div>
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            alt="Study"
            className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
          />
        </div>

        {/* Lado Direito - Form */}
        <div className="md:w-1/2 p-8 md:p-12">
          <div className="text-center md:text-left mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Cadastre-se grátis
            </h3>
            <p className="text-gray-500 text-sm">
              Já tem uma conta?{" "}
              <Link
                to="/login"
                className="text-brand-green font-bold hover:underline"
              >
                Faça login
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle size={18} />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-brand-green focus:border-brand-green text-gray-900"
                  placeholder="Como gostaria de ser chamado?"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-brand-green focus:border-brand-green text-gray-900"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-brand-green focus:border-brand-green text-gray-900"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-500">
                Li e aceito os{" "}
                <Link to="/termos" className="text-brand-green font-medium">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                  to="/privacidade"
                  className="text-brand-green font-medium"
                >
                  Política de Privacidade
                </Link>
                .
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-brand-green hover:bg-brand-dark transition-all disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  Criar Conta Agora
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
