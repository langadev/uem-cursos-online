import {
    Bell,
    BookOpen,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquare,
    Settings,
    TrendingUp,
    Users,
    X,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";

interface InstructorLayoutProps {
  children: React.ReactNode;
}

const InstructorLayout: React.FC<InstructorLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile, user } = useAuth();
  const { branding } = useBranding();

  const instructorName = profile?.full_name || user?.displayName || "Instrutor";
  const instructorFirstName =
    (instructorName || "Instrutor").split(" ")[0] || "Instrutor";
  const instructorAvatarUrl =
    profile?.avatar_url ||
    user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=0e7038&color=fff`;

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsLogoutModalOpen(false);
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const menuItems = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: "Visão Geral",
      href: "/instrutor/dashboard",
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: "Meus Cursos",
      href: "/instrutor/cursos",
    },
    // {
    //   icon: <Users className="w-5 h-5" />,
    //   label: "Meus Formandos",
    //   href: "/instrutor/alunos",
    // },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: "Dúvidas",
      href: "/instrutor/duvidas",
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Comunidade",
      href: "/instrutor/comunidade",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: "Relatórios",
      href: "/instrutor/relatorios",
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: "Configurações",
      href: "/instrutor/configuracoes",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {branding.appearance.logoUrl ? (
              <img
                src={branding.appearance.logoUrl}
                alt="Logo"
                className="h-14 w-auto"
              />
            ) : (
              <div
                className="p-2 rounded-lg text-white font-black flex items-center justify-center h-10 w-10"
                style={{ backgroundColor: branding.appearance.primaryColor }}
              >
                {branding.appearance.logoText?.charAt(0) || "U"}
              </div>
            )}
            <span className="ml-1 text-[10px] bg-brand-accent text-brand-dark px-1.5 py-0.5 rounded font-black uppercase">
              Instrutor
            </span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <img
              src={instructorAvatarUrl}
              alt="Instructor"
              className="w-10 h-10 rounded-full border-2 border-brand-accent object-cover"
            />
            <div>
              <p className="font-semibold text-sm">{instructorName}</p>
              <p className="text-xs text-brand-accent font-bold uppercase tracking-tighter">
                Instrutor Sênior
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                  ${
                    isActive
                      ? "bg-brand-green text-white shadow-lg shadow-green-900/40"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-black uppercase tracking-widest text-slate-400 hover:bg-red-500 hover:text-white transition-all active:scale-95 group"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Sair do Painel
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile */}
        <header className="bg-white border-b border-gray-200 py-4 px-6 md:hidden flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-800">Painel do Instrutor</span>
          <img
            src={instructorAvatarUrl}
            className="w-8 h-8 rounded-full object-cover"
          />
        </header>

        {/* Header Desktop */}
        <header className="hidden md:flex bg-white border-b border-gray-200 py-4 px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-lg font-bold text-slate-700 hover:text-brand-green transition-colors px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              ← Voltar para o Site
            </Link>
            <div className="h-6 w-px bg-gray-200"></div>
            <p className="text-sm text-gray-500 font-medium">
              Bem-vindo(a) de volta, {instructorFirstName}.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-brand-green transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <button
              onClick={handleLogoutClick}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              title="Encerrar Sessão"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        title="Confirmar Saída"
        message="Tem a certeza que deseja sair do Painel do Instrutor?"
        isLoading={isLoggingOut}
      />
    </div>
  );
};

export default InstructorLayout;
