import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../services/api";

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  full_name?: string;
  avatar_url?: string | null;
  role: "student" | "instructor" | "admin";
  status: "Ativo" | "Suspenso";
  providers?: string[];
  createdAt?: any;
  lastLogin?: any;
}

interface AuthContextType {
  profile: UserProfile | null;
  user: UserProfile | null; // Alias para profile (compatibilidade com código antigo)
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Detecta se há login via JWT (MySQL) ou Firebase
  const loadJWTProfile = async (): Promise<UserProfile | null> => {
    const token = localStorage.getItem("auth_token");
    const uid = localStorage.getItem("user_id");

    if (!token || !uid) {
      return null;
    }

    try {
      console.log("🔵 [AuthContext] Carregando perfil via JWT...");
      const apiProfile = await apiClient.getMe();

      const profileData: UserProfile = {
        id: apiProfile.id || uid,
        uid: apiProfile.uid || uid,
        email: apiProfile.email || "",
        name: apiProfile.name || "",
        full_name: apiProfile.name || apiProfile.full_name || "",
        avatar_url: apiProfile.avatar_url || null,
        role: apiProfile.role || "student",
        status: apiProfile.status || "Ativo",
        createdAt: apiProfile.created_at,
        lastLogin: apiProfile.last_login,
      };

      console.log("✅ [AuthContext] Perfil JWT carregado:", {
        role: profileData.role,
        email: profileData.email,
      });

      return profileData;
    } catch (error: any) {
      console.warn(
        "⚠️ [AuthContext] Erro ao carregar perfil JWT:",
        error.message,
      );
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_id");
      return null;
    }
  };

  // Fallback: usa dados do MySQL
  const getOrUpdateProfile = async (): Promise<UserProfile | null> => {
    try {
      const apiProfile = await apiClient.getMe();

      const profileData: UserProfile = {
        id: apiProfile.id || apiProfile.uid,
        uid: apiProfile.uid,
        email: apiProfile.email || "",
        name: apiProfile.name || "",
        full_name: apiProfile.name || apiProfile.full_name || "",
        avatar_url: apiProfile.avatar_url || null,
        role: apiProfile.role || "student",
        status: apiProfile.status || "Ativo",
        createdAt: apiProfile.created_at,
        lastLogin: apiProfile.last_login,
      };

      console.log("✅ [AuthContext] Perfil carregado via API:", {
        role: profileData.role,
        email: profileData.email,
      });

      return profileData;
    } catch (error: any) {
      console.warn(
        "⚠️  [AuthContext] Erro ao carregar perfil via API:",
        error.message,
      );
      return null;
    }
  };

  useEffect(() => {
    // Timeout de segurança: garante que loading fica false após 5 segundos
    const safetyTimeout = setTimeout(() => {
      console.warn(
        "⏰ [AuthContext] TIMEOUT de segurança! Loading ficou true por muito tempo",
      );
      setLoading(false);
    }, 5000);

    const initAuth = async () => {
      try {
        // Tenta carregar profile via JWT (MySQL)
        console.log("🔍 [AuthContext] Inicializando autenticação via JWT...");
        const jwtProfile = await loadJWTProfile();

        if (jwtProfile) {
          console.log("✅ [AuthContext] Utilizador autenticado via JWT");
          setProfile(jwtProfile);
        } else {
          console.log("👤 [AuthContext] Nenhuma sessão JWT ativa");
          setProfile(null);
        }
      } catch (err) {
        console.error("❌ [AuthContext] Erro na inicialização:", err);
        setProfile(null);
      } finally {
        console.log("🏁 [AuthContext] Setando loading=false");
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, []);

  const logout = async () => {
    try {
      console.log("🚪 [AuthContext] Fazendo logout...");
      localStorage.removeItem("user_id");
      localStorage.removeItem("auth_token");
      setProfile(null);
      console.log("✅ [AuthContext] Logout bem-sucedido");
    } catch (e) {
      console.error("❌ Erro ao fazer logout:", e);
    }
  };

  const refreshProfile = async () => {
    try {
      console.log("🔄 [AuthContext] Atualizando perfil...");
      // Tenta JWT primeiro
      const jwtProfile = await loadJWTProfile();
      if (jwtProfile) {
        setProfile(jwtProfile);
        console.log("✅ [AuthContext] Perfil atualizado via JWT");
        return;
      }

      // Se não há JWT, desautent
      setProfile(null);
    } catch (err) {
      console.error("❌ [AuthContext] Erro ao atualizar perfil:", err);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ profile, user: profile, loading, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};
