import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: "student" | "instructor" | "admin";
  status: "Ativo" | "Suspenso";
  providers: string[];
  createdAt: any;
  lastLogin: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Garante persistência local da sessão
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((e) => {
      console.warn("Falha ao configurar persistência de sessão:", e);
    });
  }, []);

  useEffect(() => {
    console.log(
      "🟢 [AuthContext] useEffect rápido: auth.currentUser =",
      auth.currentUser?.uid,
      "user state =",
      user?.uid,
    );
    if (auth.currentUser && !user) {
      const cu = auth.currentUser;
      setUser(cu);
      if (!profile) {
        const fullName =
          cu.displayName || cu.email?.split("@")[0] || "Utilizador";
        const fallback: UserProfile = {
          id: cu.uid,
          uid: cu.uid,
          email: cu.email || "",
          full_name: fullName,
          avatar_url: cu.photoURL || null,
          role: "student",
          status: "Ativo",
          providers: cu.providerData.map((p) => p.providerId),
          createdAt: null,
          lastLogin: null,
        };
        console.log(
          "🎯 [AuthContext] Setando fallback profile com role:",
          fallback.role,
        );
        setProfile(fallback);
        setLoading(false);
      }
      setLoading(false);
    }
  }, []);

  const getOrUpdateProfile = async (
    firebaseUser: User,
  ): Promise<UserProfile> => {
    console.log(
      "🔵 [AuthContext] getOrUpdateProfile iniciado para:",
      firebaseUser.uid,
    );
    const userRef = doc(db, "profiles", firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    console.log(
      "📂 [AuthContext] Profile existe no Firestore:",
      userSnap.exists(),
    );

    // Sempre usar displayName do Firebase se disponível
    const fullName =
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "Utilizador";

    let profileData: UserProfile;

    if (userSnap.exists()) {
      const firestoreData = userSnap.data() as any;
      console.log(
        "✅ [AuthContext] Dados do Firestore completos:",
        firestoreData,
      );
      console.log(
        "✅ [AuthContext] Dados do Firestore - role:",
        firestoreData.role,
      );

      // GARANTIR que role sempre existe (fallback para student se não estiver presente)
      const role = firestoreData.role || "student";

      profileData = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email || firestoreData.email || "",
        full_name: fullName,
        avatar_url: firestoreData.avatar_url || firebaseUser.photoURL || null,
        role: role as "student" | "instructor" | "admin",
        status: firestoreData.status || "Ativo",
        providers: firebaseUser.providerData.map((p) => p.providerId),
        createdAt: firestoreData.createdAt || null,
        lastLogin: firestoreData.lastLogin || null,
      };
    } else {
      console.log(
        "⚠️  [AuthContext] Perfil não existe no Firestore, criando novo com role='student'",
      );
      profileData = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        full_name: fullName,
        avatar_url: firebaseUser.photoURL || null,
        role: "student",
        status: "Ativo",
        providers: firebaseUser.providerData.map((p) => p.providerId),
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
    }

    console.log("📤 [AuthContext] Perfil a retornar:", {
      role: profileData.role,
      email: profileData.email,
      uid: profileData.uid,
    });

    // SEMPRE garantir que o Firestore tem o nome correto E O ROLE DEFINIDO
    await setDoc(
      userRef,
      {
        full_name: fullName,
        email: firebaseUser.email,
        lastLogin: serverTimestamp(),
        // CRÍTICO: Garante que role está sempre no Firestore
        role: profileData.role,
      },
      { merge: true },
    );

    return profileData;
  };

  useEffect(() => {
    // Timeout de segurança: garante que loading fica false após 5 segundos
    const safetyTimeout = setTimeout(() => {
      console.warn(
        "⏰ [AuthContext] TIMEOUT de segurança disparo! Loading ficou true por muito tempo",
      );
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log(
        "🔔 [AuthContext] onAuthStateChanged disparado, currentUser:",
        currentUser?.uid,
      );
      setUser(currentUser);
      if (currentUser) {
        try {
          console.log("🔄 [AuthContext] Carregando perfil do Firestore...");
          const userProfile = await getOrUpdateProfile(currentUser);
          console.log("✔️ [AuthContext] Perfil carregado com sucesso:", {
            role: userProfile.role,
            email: userProfile.email,
          });
          setProfile(userProfile);
          await setDoc(
            doc(db, "profiles", currentUser.uid),
            {
              lastLogin: serverTimestamp(),
              providers: currentUser.providerData.map((p) => p.providerId),
            },
            { merge: true },
          );
        } catch (err) {
          console.error("❌ [AuthContext] ERRO ao carregar perfil:", err);
          // Fallback seguro: trata utilizador autenticado como estudante quando Firestore estiver indisponível
          const fullName =
            currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "Utilizador";
          const fallback: UserProfile = {
            id: currentUser.uid,
            uid: currentUser.uid,
            email: currentUser.email || "",
            full_name: fullName,
            avatar_url: currentUser.photoURL || null,
            role: "student",
            status: "Ativo",
            providers: currentUser.providerData.map((p) => p.providerId),
            createdAt: null,
            lastLogin: null,
          };
          console.log(
            "🛡️ [AuthContext] Usando fallback profile com role:",
            fallback.role,
          );
          setProfile(fallback);
        }
      } else {
        console.log("👤 [AuthContext] Utilizador fez logout");
        setProfile(null);
      }
      console.log("🏁 [AuthContext] Setando loading=false");
      clearTimeout(safetyTimeout);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const updated = await getOrUpdateProfile(user);
      setProfile(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, logout, refreshProfile }}
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
