import {
    BarChart3,
    Bell,
    Clock,
    FileText,
    Key,
    Layers,
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    Settings,
    UserCheck,
    Users,
    X,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dateTime, setDateTime] = useState<string>("");
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile, user } = useAuth();
  const { branding } = useBranding();

  // Atualizar data e hora em tempo real
  React.useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      setDateTime(formatted);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

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
      label: "Dashboard",
      href: "/admin/dashboard",
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Gestão de Utilizadores",
      href: "/admin/usuarios",
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      label: "Gestão de Tutores",
      href: "/admin/tutores",
    },
    {
      icon: <Layers className="w-5 h-5" />,
      label: "Gestão de Conteúdos",
      href: "/admin/conteudos",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: "Moderação de Cursos",
      href: "/admin/moderacao",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: "Aprovação de Certificados",
      href: "/admin/certificados",
    },
    // {
    //   icon: <Key className="w-5 h-5" />,
    //   label: "Gestão de Permissões",
    //   href: "/admin/permissoes",
    // },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: "Relatório e Analytics",
      href: "/admin/analytics",
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: "Configurações do Sistema",
      href: "/admin/configuracoes",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      {/* Sidebar */}
      <aside
        className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
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
                className="p-2 rounded-lg text-white font-black flex items-center justify-center min-w-10 h-10"
                style={{ backgroundColor: branding.appearance.primaryColor }}
              >
                {branding.appearance.logoText?.charAt(0) || "U"}
              </div>
            )}
            <span className="ml-2 text-[10px] bg-brand-accent text-brand-dark px-1.5 py-0.5 rounded font-black uppercase">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            {profile?.avatar_url || user?.photoURL ? (
              <img
                src={profile?.avatar_url || user?.photoURL || ""}
                className="w-10 h-10 rounded-full border-2 border-brand-accent/30 object-cover"
                alt="Admin"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center font-bold text-white shadow-inner border-2 border-brand-accent/30">
                AD
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">
                {profile?.full_name || "Super Admin"}
              </p>
              <p className="text-[10px] text-brand-accent font-black uppercase tracking-widest">
                Acesso de Nível 1
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
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
        {/* Header Desktop */}
        <header className="hidden md:flex bg-white border-b border-slate-200 py-4 px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-bold text-slate-700 hover:text-brand-green transition-colors px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              ← Voltar para o Site
            </Link>
            <div className="h-6 w-px bg-slate-100"></div>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar usuário, curso ou logs..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/10 focus:border-brand-green"
              />
            </div>
            <div className="h-6 w-px bg-slate-100"></div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                {dateTime}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-brand-green transition-colors bg-slate-50 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-green rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3">
              {profile?.avatar_url || user?.photoURL ? (
                <img
                  src={profile?.avatar_url || user?.photoURL || ""}
                  className="w-8 h-8 rounded-full border-2 border-slate-100 object-cover"
                  alt="Admin"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-green text-white font-bold grid place-items-center border-2 border-slate-100">
                  AD
                </div>
              )}
              <div className="text-sm">
                <p className="font-semibold text-slate-900">
                  {profile?.full_name || "Admin"}
                </p>
                <p className="text-xs text-slate-500">Acesso do Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="bg-slate-900 text-white border-b border-white/5 py-4 px-6 md:hidden flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-slate-400"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            {branding.appearance.logoUrl ? (
              <img
                src={branding.appearance.logoUrl}
                alt="Logo"
                className="h-6 w-auto"
              />
            ) : (
              <div
                className="p-1 rounded text-white font-black text-xs flex items-center justify-center w-6 h-6"
                style={{ backgroundColor: branding.appearance.primaryColor }}
              >
                {branding.appearance.logoText?.charAt(0) || "U"}
              </div>
            )}
            <span
              className="font-bold text-sm"
              style={{ fontFamily: branding.appearance.fontFamily }}
            >
              {branding.appearance.logoText || branding.appearance.platformName}{" "}
              <span style={{ color: branding.appearance.accentColor }}>
                Admin
              </span>
            </span>
          </div>
          <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center font-bold text-xs">
            AD
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</main>
      </div>{" "}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        title="Confirmar Saída"
        message="Encerrar sessão administrativa?"
        isLoading={isLoggingOut}
      />{" "}
    </div>
  );
};

export default AdminLayout;
