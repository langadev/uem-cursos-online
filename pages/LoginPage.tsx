import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "/public/login-image.jpg";
// Added Check to the imports from lucide-react
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    AlertCircle,
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { auth, db, googleProvider } from "../services/firebase";
import { DEFAULT_DASHBOARD, isValidRole } from "../utils/routeProtection";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();

  /**
   * Redireciona o utilizador para o dashboard apropriado conforme o seu role,
   * ou para a página anterior se foi redirecionado do login
   */
  const redirectToDashboard = (userRole?: string | null) => {
    // Verifica se existe um estado anterior (por exemplo, de inscrição em um curso)
    const state = location.state as { from?: string } | undefined;
    if (state?.from) {
      navigate(state.from, { replace: true });
      return;
    }

    if (!userRole || !isValidRole(userRole)) {
      navigate("/", { replace: true });
      return;
    }

    const dashboard = DEFAULT_DASHBOARD[userRole];
    navigate(dashboard, { replace: true });
  };

  // Redireciona conforme o papel quando o perfil estiver disponível
  useEffect(() => {
    if (!authLoading && user && profile?.role) {
      redirectToDashboard(profile.role);
    }
  }, [user, profile, authLoading, navigate]);

  /**
   * Obtém o role do utilizador após o login
   */
  const getUserRoleAfterLogin = async (userId: string): Promise<string> => {
    try {
      const snap = await getDoc(doc(db, "profiles", userId));
      if (snap.exists()) {
        const data = snap.data() as any;
        return data?.role || "student";
      }
    } catch (err) {
      console.error("Erro ao obter role do utilizador:", err);
    }
    return "student"; // Fallback padrão
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const cu = auth.currentUser;

      if (cu) {
        const role = await getUserRoleAfterLogin(cu.uid);
        redirectToDashboard(role);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Erro de login:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        setError("E-mail ou senha incorretos.");
      } else if (err.code === "auth/user-not-found") {
        setError("Utilizador não encontrado.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiadas tentativas. Tente novamente mais tarde.");
      } else {
        setError("Erro ao tentar entrar. Verifique sua conexão.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithPopup(auth, googleProvider);
      const cu = auth.currentUser;

      if (cu) {
        const role = await getUserRoleAfterLogin(cu.uid);
        redirectToDashboard(role);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Erro de login com Google:", err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Login cancelado.");
      } else {
        setError("Falha na autenticação com o Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4 py-12 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        {/* Lado Esquerdo - Branding (Conforme imagem) */}
        <div className="md:w-[45%] bg-brand-dark relative hidden md:flex flex-col justify-between p-12 text-white overflow-hidden">
          <div className="absolute inset-0 bg-brand-green/30 mix-blend-overlay z-0"></div>
          <img
            src={logo}
            alt="Students"
            className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale z-0"
          />
          
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold mb-4 leading-tight">
              Bem-vindo de volta!
            </h2>
            <p className="text-brand-light/90 text-lg leading-relaxed">
              Continue sua jornada de aprendizado na plataforma líder em
              Moçambique.
            </p>
          </div>
        </div>

        {/* Lado Direito - Formulário */}
        <div className="md:w-[55%] p-8 md:p-14">
          <div className="text-center md:text-left mb-10">
            <h3 className="text-3xl font-black text-gray-900 mb-2">
              Acesse sua conta
            </h3>
            <p className="text-gray-500 font-medium">
              Novo por aqui?{" "}
              <Link
                to="/cadastro"
                className="text-brand-green font-bold hover:underline"
              >
                Crie sua conta grátis
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <p className="font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm font-bold text-gray-600 disabled:opacity-50 mb-8 shadow-sm"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Entrar com Google
          </button>

          <div className="relative flex py-3 items-center mb-8">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink-0 mx-4 text-gray-300 text-[10px] font-black uppercase tracking-widest">
              ou e-mail
            </span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-[#333333] border-transparent rounded-xl focus:ring-4 focus:ring-brand-green/20 text-white placeholder-gray-500 font-medium transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 bg-[#333333] border-transparent rounded-xl focus:ring-4 focus:ring-brand-green/20 text-white placeholder-gray-500 font-medium transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-5 h-5 bg-gray-200 rounded border border-gray-300 peer-checked:bg-brand-green peer-checked:border-brand-green transition-all"></div>
                  <Check
                    className="absolute inset-0 text-white opacity-0 peer-checked:opacity-100 transition-opacity w-4 h-4 m-auto"
                    strokeWidth={4}
                  />
                </div>
                <span className="ml-2 text-sm font-bold text-gray-500 group-hover:text-gray-700">
                  Lembrar
                </span>
              </label>
              <Link
                to="/recuperar-senha"
                className="text-sm font-bold text-brand-green hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-3 py-4.5 px-6 rounded-xl shadow-xl shadow-green-900/20 text-base font-black uppercase tracking-widest text-white bg-brand-green hover:bg-brand-dark transition-all disabled:opacity-70 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>A entrar...</span>
                </div>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
