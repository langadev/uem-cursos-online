import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Bell, Camera, CheckCircle, Save, Shield, User } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import StudentLayout from "../../layouts/StudentLayout";
import { db, storage } from "../../services/firebase";
import { isSupabaseConfigured, supabase } from "../../services/supabase";

const SettingsPage: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "notifications"
  >("profile");
  const [isSaved, setIsSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local state for the form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    const initial = profile?.avatar_url || user?.photoURL || "";
    setPreviewUrl(initial);
  }, [profile?.avatar_url, user?.photoURL]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user?.uid) return;
      // Salvar no Firestore
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          full_name: fullName,
          bio: bio,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      // Atualizar também o displayName no Firebase Auth
      await updateProfile(user, { displayName: fullName });
      // Recarregar perfil do contexto
      await refreshProfile();
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } catch (err) {
      console.error("Falha ao salvar perfil", err);
    }
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !user?.uid) return;
    const isValidType = ["image/png", "image/jpeg", "image/jpg"].includes(
      file.type,
    );
    const isValidSize = file.size <= 5 * 1024 * 1024;
    if (!isValidType) {
      alert("Por favor selecione uma imagem PNG ou JPG.");
      return;
    }
    if (!isValidSize) {
      alert("Tamanho máximo permitido é 5MB.");
      return;
    }
    try {
      setUploading(true);
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const ts = Date.now();
      const storagePath = `profiles/${user.uid}/avatar_${ts}.${ext}`;
      let finalUrl: string | null = null;
      const preferSupabase =
        isSupabaseConfigured ||
        (import.meta as any)?.env?.VITE_STORAGE_PROVIDER === "supabase";

      if (preferSupabase) {
        // Supabase primeiro (tenta buckets 'profiles' e 'PROFILES')
        try {
          const supaPath = `${user.uid}/avatar_${ts}.${ext}`;
          const buckets = ["profiles", "PROFILES"];
          for (const b of buckets) {
            const { error: upErr } = await supabase.storage
              .from(b as any)
              .upload(supaPath, file, { upsert: true, contentType: file.type });
            if (!upErr) {
              const { data: pub } = supabase.storage
                .from(b as any)
                .getPublicUrl(supaPath);
              finalUrl = pub?.publicUrl || null;
              break;
            }
          }
        } catch (se) {
          console.warn("Upload no Supabase falhou, tentando Firebase...", se);
        }
        if (!finalUrl) {
          try {
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file, { contentType: file.type });
            finalUrl = await getDownloadURL(storageRef);
          } catch (fe) {
            console.error(
              "Falha nos dois provedores (Supabase e Firebase).",
              fe,
            );
          }
        }
      } else {
        // Firebase primeiro
        try {
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file, { contentType: file.type });
          finalUrl = await getDownloadURL(storageRef);
        } catch (fe) {
          console.warn("Upload no Firebase falhou, tentando Supabase...", fe);
        }
        if (!finalUrl && isSupabaseConfigured) {
          try {
            const supaPath = `${user.uid}/avatar_${ts}.${ext}`;
            const buckets = ["profiles", "PROFILES"];
            for (const b of buckets) {
              const { error: upErr } = await supabase.storage
                .from(b as any)
                .upload(supaPath, file, {
                  upsert: true,
                  contentType: file.type,
                });
              if (!upErr) {
                const { data: pub } = supabase.storage
                  .from(b as any)
                  .getPublicUrl(supaPath);
                finalUrl = pub?.publicUrl || null;
                break;
              }
            }
          } catch (se) {
            console.error(
              "Falha nos dois provedores (Firebase e Supabase).",
              se,
            );
          }
        }
      }

      if (!finalUrl)
        throw new Error("Nenhum provedor disponível para upload da imagem.");

      await setDoc(
        doc(db, "profiles", user.uid),
        {
          avatar_url: finalUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await updateProfile(user, { photoURL: finalUrl });
      await refreshProfile();
      setPreviewUrl(finalUrl);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error("Falha ao atualizar foto de perfil", err);
      alert(
        "Não foi possível atualizar a foto de perfil. Verifique sua conexão ou as configurações do bucket (Firebase/Supabase).",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Configurações da Conta
        </h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Navigation */}
          <aside className="w-full md:w-64 space-y-2">
            <TabItem
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
              icon={<User className="w-4 h-4" />}
              label="Meu Perfil"
            />
            <TabItem
              active={activeTab === "security"}
              onClick={() => setActiveTab("security")}
              icon={<Shield className="w-4 h-4" />}
              label="Segurança"
            />
            <TabItem
              active={activeTab === "notifications"}
              onClick={() => setActiveTab("notifications")}
              icon={<Bell className="w-4 h-4" />}
              label="Notificações"
            />
          </aside>

          {/* Forms */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            {activeTab === "profile" && (
              <form
                onSubmit={handleSave}
                className="space-y-6 animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative group">
                    <img
                      src={
                        previewUrl ||
                        profile?.avatar_url ||
                        user?.photoURL ||
                        "https://i.pravatar.cc/150?img=11"
                      }
                      className="w-24 h-24 rounded-full border-4 border-gray-50 shadow-md object-cover"
                      alt="Avatar"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/30 rounded-full grid place-items-center text-white text-xs font-bold">
                        Carregando...
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handlePickImage}
                      className="absolute bottom-0 right-0 bg-brand-green text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleChangeFile}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Foto de Perfil</h3>
                    <p className="text-sm text-gray-500">PNG ou JPG até 5MB.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#333333] border-transparent rounded-lg focus:ring-4 focus:ring-brand-green/20 text-white placeholder-gray-500 font-medium transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-2.5 bg-[#333333] border-transparent rounded-lg focus:ring-4 focus:ring-brand-green/20 text-white opacity-60 cursor-not-allowed font-medium transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Biografia
                    </label>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Conte-nos sobre você..."
                      className="w-full px-4 py-2.5 bg-[#333333] border-transparent rounded-lg focus:ring-4 focus:ring-brand-green/20 text-white placeholder-gray-500 font-medium transition-all resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  {isSaved && (
                    <span className="flex items-center gap-2 text-green-600 text-sm font-bold">
                      <CheckCircle className="w-4 h-4" /> Alterações salvas!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-brand-green text-white px-6 py-2.5 rounded-lg font-bold hover:bg-brand-dark transition-all ml-auto shadow-lg shadow-green-900/20"
                  >
                    <Save className="w-4 h-4" /> Salvar Perfil
                  </button>
                </div>
              </form>
            )}

            {activeTab === "security" && (
              <form
                onSubmit={handleSave}
                className="space-y-6 animate-in fade-in duration-300"
              >
                <h3 className="font-bold text-gray-900 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-[#333333] border-transparent rounded-xl focus:ring-4 focus:ring-brand-green/20 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-[#333333] border-transparent rounded-xl focus:ring-4 focus:ring-brand-green/20 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-[#333333] border-transparent rounded-xl focus:ring-4 focus:ring-brand-green/20 text-white outline-none"
                    />
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold hover:bg-black transition-all"
                  >
                    Atualizar Senha
                  </button>
                </div>
              </form>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="font-bold text-gray-900 mb-4">
                  Preferências de Notificação
                </h3>
                <div className="space-y-4">
                  <NotificationToggle
                    label="E-mails sobre novos cursos"
                    description="Receba atualizações quando lançarmos novos conteúdos."
                    defaultChecked
                  />
                  <NotificationToggle
                    label="Notificações de fórum"
                    description="Avisar quando alguém responder seus tópicos."
                    defaultChecked
                  />
                  <NotificationToggle
                    label="Lembretes de estudo"
                    description="Avisos semanais para manter sua rotina de estudos."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 animate-in scale-in-50 duration-500">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">
                Perfil Atualizado!
              </h3>
              <p className="text-slate-500 text-sm mb-8">
                Suas alterações foram salvas com sucesso.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/10"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

const TabItem = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
      active
        ? "bg-brand-green text-white shadow-lg shadow-green-900/10"
        : "text-gray-500 hover:bg-white hover:text-brand-dark"
    }`}
  >
    {icon} {label}
  </button>
);

const NotificationToggle = ({
  label,
  description,
  defaultChecked = false,
}: any) => (
  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
    <div>
      <h4 className="font-bold text-gray-800 text-sm">{label}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
    </label>
  </div>
);

export default SettingsPage;
