import {
    Bell,
    Building2,
    Camera,
    Check,
    CheckCircle,
    ChevronDown,
    CreditCard,
    Save,
    User,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";

import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../services/firebase";
import { isSupabaseConfigured, supabase } from "../../services/supabase";

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "profile" | "payout" | "notifications"
  >("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(
    "BCI - Banco Comercial e de Investimentos",
  );

  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const instructorName =
    fullName || profile?.full_name || user?.displayName || "Instrutor";
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const instructorAvatarUrl =
    previewUrl ||
    profile?.avatar_url ||
    user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=0e7038&color=fff&size=120`;

  useEffect(() => {
    setPreviewUrl(profile?.avatar_url || user?.photoURL || "");
  }, [profile?.avatar_url, user?.photoURL]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setSpecialty(profile.specialty || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!user?.uid) return;
      // Salvar no Firestore
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          full_name: fullName,
          specialty: specialty,
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
      console.error("Erro ao salvar configurações:", err);
      alert("❌ Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleChangeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !user?.uid) return;
    const isValidType = ["image/png", "image/jpeg", "image/jpg"].includes(
      file.type,
    );
    const isValidSize = file.size <= 5 * 1024 * 1024;
    if (!isValidType) {
      alert("Selecione uma imagem PNG ou JPG.");
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

      if (!finalUrl) throw new Error("Falha ao obter URL final do avatar.");
      await setDoc(
        doc(db, "profiles", user.uid),
        { avatar_url: finalUrl, updatedAt: serverTimestamp() },
        { merge: true },
      );
      await updateProfile(user, { photoURL: finalUrl });
      setPreviewUrl(finalUrl);
    } catch (err) {
      console.error("Erro ao atualizar foto do instrutor", err);
      alert("Não foi possível atualizar a foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Configurações do Painel
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie suas informações pessoais e preferências de recebimento.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Side Menu */}
          <aside className="w-full md:w-64 space-y-2">
            <SettingsTab
              active={activeTab === "profile"}
              icon={<User size={18} />}
              label="Perfil do Instrutor"
              onClick={() => setActiveTab("profile")}
            />
            <SettingsTab
              active={activeTab === "payout"}
              icon={<CreditCard size={18} />}
              label="Dados de Pagamento"
              onClick={() => setActiveTab("payout")}
            />
            <SettingsTab
              active={activeTab === "notifications"}
              icon={<Bell size={18} />}
              label="Notificações"
              onClick={() => setActiveTab("notifications")}
            />
          </aside>

          {/* Form Content */}
          <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-10">
            {activeTab === "profile" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <img
                      src={instructorAvatarUrl}
                      className="w-24 h-24 rounded-3xl border-4 border-slate-50 shadow-md object-cover"
                      alt={instructorName}
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/30 rounded-3xl grid place-items-center text-white text-xs font-bold">
                        Carregando...
                      </div>
                    )}
                    <button
                      onClick={handlePickImage}
                      className="absolute bottom-0 right-0 p-2 bg-brand-green text-white rounded-xl shadow-lg hover:scale-110 transition-transform"
                    >
                      <Camera size={16} />
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
                    <h4 className="font-bold text-slate-900">
                      {instructorName}
                    </h4>
                    <p className="text-sm text-slate-400">
                      Instrutora desde Jan 2024
                    </p>
                    <span className="mt-2 inline-flex text-[10px] font-bold bg-brand-green text-white px-2 py-0.5 rounded uppercase">
                      Verificada
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Nome Público
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Especialidade
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Ex: Senior Product Designer"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Mini Biografia
                    </label>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Conte sobre sua experiência e especialidades..."
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payout" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="p-6 bg-brand-light/30 border border-brand-green/10 rounded-2xl flex gap-4">
                  <CreditCard
                    size={24}
                    className="text-brand-green flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-brand-dark text-sm">
                      Transferências em MZM
                    </h4>
                    <p className="text-xs text-brand-dark/60 mt-1 font-medium">
                      Seus ganhos são transferidos mensalmente para sua conta
                      bancária moçambicana cadastrada.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Banco Destinatário
                    </label>
                    <Select
                      className="w-full"
                      value={selectedBank}
                      onValueChange={setSelectedBank}
                    >
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-brand-green" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectPopover>
                        <SelectListBox>
                          <SelectItem value="BCI - Banco Comercial e de Investimentos">
                            BCI - Banco Comercial e de Investimentos
                          </SelectItem>
                          <SelectItem value="Standard Bank Moçambique">
                            Standard Bank Moçambique
                          </SelectItem>
                          <SelectItem value="Millennium bim">
                            Millennium bim
                          </SelectItem>
                          <SelectItem value="Absa Bank Moçambique">
                            Absa Bank Moçambique
                          </SelectItem>
                          <SelectItem value="Moza Banco">Moza Banco</SelectItem>
                        </SelectListBox>
                      </SelectPopover>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      NIB (Número de Identificação Bancária)
                    </label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000 0000 0"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 font-mono outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <ToggleOption
                  label="Nova Matrícula"
                  description="Receber e-mail sempre que um formando se inscrever no curso."
                  defaultChecked
                />
                <ToggleOption
                  label="Nova Dúvida"
                  description="Avisar no Telegram sobre novas perguntas pendentes."
                  defaultChecked
                />
                <ToggleOption
                  label="Relatório Semanal"
                  description="Resumo de performance de todos os cursos por e-mail."
                />
              </div>
            )}

            <div className="pt-8 border-t border-slate-50 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-brand-green text-white font-bold px-10 py-3 rounded-xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/10 disabled:opacity-70 active:scale-95"
              >
                {isSaving ? (
                  "Salvando..."
                ) : (
                  <>
                    <Save size={18} /> Salvar Alterações
                  </>
                )}
              </button>
            </div>
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
                Configurações Salvas!
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
    </InstructorLayout>
  );
};

// --- Custom Internal Components ---

const SettingsTab = ({ active, icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
      active
        ? "bg-brand-green text-white shadow-lg shadow-green-900/20"
        : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-100"
    }`}
  >
    {icon}
    {label}
  </button>
);

const ToggleOption = ({ label, description, defaultChecked = false }: any) => (
  <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 transition-colors hover:border-slate-200">
    <div>
      <h4 className="text-sm font-bold text-slate-800">{label}</h4>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-brand-green after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
    </label>
  </div>
);

// --- Custom Select Implementation (Consistent with App Design) ---

const SelectContext = React.createContext<any>(null);

const Select = ({
  children,
  className,
  value,
  onValueChange,
  placeholder,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, isOpen, setIsOpen, placeholder }}
    >
      <div ref={containerRef} className={`relative ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ children }: any) => {
  const { setIsOpen, isOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
};

const SelectValue = () => {
  const { value, placeholder } = React.useContext(SelectContext);
  return (
    <span className={!value ? "text-slate-400" : "text-slate-900 truncate"}>
      {value || placeholder}
    </span>
  );
};

const SelectPopover = ({ children }: any) => {
  const { isOpen } = React.useContext(SelectContext);
  if (!isOpen) return null;
  return (
    <div className="absolute bottom-full mb-2 left-0 z-[100] w-full min-w-[12rem] overflow-hidden rounded-xl border border-gray-100 bg-white text-slate-950 shadow-xl animate-in fade-in zoom-in-95 duration-200">
      {children}
    </div>
  );
};

const SelectListBox = ({ children }: any) => {
  return (
    <div className="p-1 max-h-60 overflow-y-auto custom-scrollbar">
      {children}
    </div>
  );
};

const SelectItem = ({ children, value }: any) => {
  const {
    onValueChange,
    setIsOpen,
    value: selectedValue,
  } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(value);
        setIsOpen(false);
      }}
      className={`relative flex w-full cursor-default select-none items-center rounded-lg py-2.5 pl-3 pr-8 text-sm font-bold outline-none hover:bg-slate-50 transition-colors ${
        isSelected ? "bg-brand-green/5 text-brand-green" : "text-slate-600"
      }`}
    >
      <span className="truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
};

export default SettingsPage;
