import {
    AlertTriangle,
    AppWindow,
    Building2,
    CheckCircle2,
    CreditCard,
    Database,
    Globe,
    Image as ImageIcon,
    Palette,
    RotateCcw,
    Save,
    Server,
    Shield,
    X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";

const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "system" | "appearance" | "security" | "payment"
  >("appearance");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Appearance State
  const [brandSettings, setBrandSettings] = useState({
    platformName: "UEM Cursos online",
    institutionName: "UEM Cursos online Academy Group",
    applicationName: "UEM Cursos online LMS Portal",
    primaryColor: "#0E7038",
    accentColor: "#EAB308",
    fontFamily: "Inter",
    logoUrl: "",
  });

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    publicSignups: true,
    dynamicCache: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    require2FA: true,
    auditLogs: true,
    limitedSessions: false,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    mpesaNumber: "",
    emolaNumber: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Settings can be loaded from localStorage or API if implemented
        // For now, just use default values
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Save settings to localStorage or API
      localStorage.setItem("brandSettings", JSON.stringify(brandSettings));
      localStorage.setItem("systemSettings", JSON.stringify(systemSettings));
      localStorage.setItem(
        "securitySettings",
        JSON.stringify(securitySettings),
      );
      localStorage.setItem("paymentSettings", JSON.stringify(paymentSettings));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    try {
      setIsSaving(true);
      const defaultSettings = {
        platformName: "UEM Cursos online",
        institutionName: "Universidade Eduardo Mondlane",
        applicationName: "UEM Cursos online",
        primaryColor: "#0e7038",
        accentColor: "#eab308",
        fontFamily: "Inter",
        logoUrl: "",
      };

      setBrandSettings(defaultSettings);
      setSystemSettings({
        maintenanceMode: false,
        publicSignups: true,
        dynamicCache: true,
      });
      setSecuritySettings({
        require2FA: true,
        auditLogs: true,
        limitedSessions: false,
      });

      // Clear localStorage
      localStorage.removeItem("brandSettings");
      localStorage.removeItem("systemSettings");
      localStorage.removeItem("securitySettings");
      localStorage.removeItem("paymentSettings");

      setShowResetConfirm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = [
        "image/svg+xml",
        "image/png",
        "image/webp",
        "image/jpeg",
      ];
      if (!validTypes.includes(file.type)) {
        alert("Formatos permitidos: SVG, PNG, WebP ou JPG.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Tamanho máximo permitido é 5MB.");
        return;
      }
      setUploadingLogo(true);
      try {
        // For now, use Data URL for logo storage (works without external storage)
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setBrandSettings({ ...brandSettings, logoUrl: dataUrl });
          localStorage.setItem(
            "brandSettings",
            JSON.stringify({ ...brandSettings, logoUrl: dataUrl }),
          );
        };
        reader.readAsDataURL(file);
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Configurações do Sistema
            </h1>
            <p className="text-slate-500 text-sm">
              Gerencie os parâmetros globais da plataforma UEM Cursos online.
            </p>
          </div>
          {showSuccess && (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-100 animate-in fade-in slide-in-from-right-4">
              <CheckCircle2 size={16} />
              <span className="text-xs font-bold uppercase tracking-tight">
                Alterações Aplicadas
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-2">
            <SettingBtn
              active={activeTab === "system"}
              label="Geral & Infra"
              icon={<Server size={18} />}
              onClick={() => setActiveTab("system")}
            />
            <SettingBtn
              active={activeTab === "appearance"}
              label="Marca & Estilo"
              icon={<Globe size={18} />}
              onClick={() => setActiveTab("appearance")}
            />
            <SettingBtn
              active={activeTab === "security"}
              label="Segurança"
              icon={<Shield size={18} />}
              onClick={() => setActiveTab("security")}
            />
            <SettingBtn
              active={activeTab === "payment"}
              label="Dados de Pagamento"
              icon={<CreditCard size={18} />}
              onClick={() => setActiveTab("payment")}
            />
          </aside>

          <div className="flex-1 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8 min-h-[500px]">
            {activeTab === "system" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                  <Database size={20} className="text-brand-green" />{" "}
                  Infraestrutura
                </h3>
                <div className="space-y-4">
                  <ToggleSetting
                    label="Modo Manutenção"
                    description="Oculta a plataforma para utilizadores externos."
                    checked={systemSettings.maintenanceMode}
                    onChange={(v: boolean) =>
                      setSystemSettings((s) => ({ ...s, maintenanceMode: v }))
                    }
                  />
                  <ToggleSetting
                    label="Inscrições Públicas"
                    description="Permite que novos estudantes criem contas."
                    checked={systemSettings.publicSignups}
                    onChange={(v: boolean) =>
                      setSystemSettings((s) => ({ ...s, publicSignups: v }))
                    }
                  />
                  <ToggleSetting
                    label="Cache Dinâmico"
                    description="Aumenta performance, mas pode atrasar atualizações visuais."
                    checked={systemSettings.dynamicCache}
                    onChange={(v: boolean) =>
                      setSystemSettings((s) => ({ ...s, dynamicCache: v }))
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    <Palette size={20} className="text-brand-green" />{" "}
                    Identidade Visual
                  </h3>
                </div>

                {/* Logo Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Logotipo da Plataforma
                  </p>
                  <div className="flex items-center gap-6">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-green hover:bg-brand-light/20 transition-all group relative overflow-hidden"
                    >
                      {brandSettings.logoUrl ? (
                        <img
                          src={brandSettings.logoUrl}
                          className="w-full h-full object-contain p-4"
                          alt="Logo"
                        />
                      ) : (
                        <>
                          <ImageIcon
                            size={24}
                            className="text-slate-300 group-hover:text-brand-green transition-colors"
                          />
                          <span className="text-[9px] font-black text-slate-400 mt-2 uppercase">
                            Subir Logo
                          </span>
                        </>
                      )}
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-black/30 text-white text-[10px] font-black grid place-items-center">
                          Enviando...
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-bold text-slate-700">
                        Formatos: SVG, PNG ou WebP
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        O logotipo será exibido na barra de navegação e em
                        rodapés. Recomendamos fundo transparente.
                      </p>
                      {brandSettings.logoUrl && (
                        <button
                          onClick={() =>
                            setBrandSettings({ ...brandSettings, logoUrl: "" })
                          }
                          className="text-[10px] font-black text-red-500 uppercase hover:underline flex items-center gap-1"
                        >
                          <X size={12} /> Remover imagem
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* General Style Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Nome da Instituição
                    </label>
                    <div className="relative">
                      <Building2
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                        size={16}
                      />
                      <input
                        type="text"
                        value={brandSettings.institutionName}
                        onChange={(e) =>
                          setBrandSettings({
                            ...brandSettings,
                            institutionName: e.target.value,
                          })
                        }
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Nome da Aplicação
                    </label>
                    <div className="relative">
                      <AppWindow
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                        size={16}
                      />
                      <input
                        type="text"
                        value={brandSettings.applicationName}
                        onChange={(e) =>
                          setBrandSettings({
                            ...brandSettings,
                            applicationName: e.target.value,
                          })
                        }
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tipografia Principal
                    </label>
                    <select
                      value={brandSettings.fontFamily}
                      onChange={(e) =>
                        setBrandSettings({
                          ...brandSettings,
                          fontFamily: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 transition-all outline-none cursor-pointer"
                    >
                      <option value="Inter">Inter (Padrão)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Montserrat">Montserrat</option>
                    </select>
                  </div>
                  <div className="hidden md:block"></div>
                </div>

                {/* Colors Section */}
                <div className="space-y-4 pt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Paleta de Cores
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 border border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-white transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase">
                          Cor Primária
                        </p>
                        <input
                          type="color"
                          value={brandSettings.primaryColor}
                          onChange={(e) =>
                            setBrandSettings({
                              ...brandSettings,
                              primaryColor: e.target.value,
                            })
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl shadow-lg border-2 border-white"
                          style={{
                            backgroundColor: brandSettings.primaryColor,
                          }}
                        ></div>
                        <div>
                          <span className="text-sm font-mono font-black text-slate-900 uppercase">
                            {brandSettings.primaryColor}
                          </span>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">
                            Base da Identidade
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 border border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-white transition-colors group">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase">
                          Cor de Acento
                        </p>
                        <input
                          type="color"
                          value={brandSettings.accentColor}
                          onChange={(e) =>
                            setBrandSettings({
                              ...brandSettings,
                              accentColor: e.target.value,
                            })
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl shadow-lg border-2 border-white"
                          style={{ backgroundColor: brandSettings.accentColor }}
                        ></div>
                        <div>
                          <span className="text-sm font-mono font-black text-slate-900 uppercase">
                            {brandSettings.accentColor}
                          </span>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">
                            Botões e Destaques
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                  <Shield size={20} className="text-brand-green" /> Políticas de
                  Acesso
                </h3>
                <div className="space-y-4">
                  <ToggleSetting
                    label="Exigir 2FA"
                    description="Obrigatório para administradores e tutores logarem."
                    checked={securitySettings.require2FA}
                    onChange={(v: boolean) =>
                      setSecuritySettings((s) => ({ ...s, require2FA: v }))
                    }
                  />
                  <ToggleSetting
                    label="Auditoria de Logs"
                    description="Registar cada login e alteração de conteúdo no sistema."
                    checked={securitySettings.auditLogs}
                    onChange={(v: boolean) =>
                      setSecuritySettings((s) => ({ ...s, auditLogs: v }))
                    }
                  />
                  <ToggleSetting
                    label="Sessões Limitadas"
                    description="Desconectar usuários após 24 horas de inatividade."
                    checked={securitySettings.limitedSessions}
                    onChange={(v: boolean) =>
                      setSecuritySettings((s) => ({ ...s, limitedSessions: v }))
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="p-6 bg-brand-light/30 border border-brand-green/10 rounded-2xl flex gap-4">
                  <CreditCard
                    size={24}
                    className="text-brand-green flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-brand-dark text-sm">
                      Dados de Pagamento
                    </h4>
                    <p className="text-xs text-brand-dark/60 mt-1 font-medium">
                      Configure os métodos de pagamento para os certificados.
                      Estes dados serão utilizados pelos alunos ao solicitar
                      certificados.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Número M-Pesa
                    </label>
                    <input
                      type="text"
                      placeholder="+258 XX XXX XXXX"
                      value={paymentSettings.mpesaNumber}
                      onChange={(e) =>
                        setPaymentSettings((s) => ({
                          ...s,
                          mpesaNumber: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Número E-Mola
                    </label>
                    <input
                      type="text"
                      placeholder="+258 XX XXX XXXX"
                      value={paymentSettings.emolaNumber}
                      onChange={(e) =>
                        setPaymentSettings((s) => ({
                          ...s,
                          emolaNumber: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Nome do Banco
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: BCI - Banco Comercial"
                        value={paymentSettings.bankName}
                        onChange={(e) =>
                          setPaymentSettings((s) => ({
                            ...s,
                            bankName: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Titular da Conta
                      </label>
                      <input
                        type="text"
                        placeholder="Nome da instituição"
                        value={paymentSettings.accountHolder}
                        onChange={(e) =>
                          setPaymentSettings((s) => ({
                            ...s,
                            accountHolder: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Número de Conta / NIB
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 0000 0000 0000 0000 0000 0"
                      value={paymentSettings.accountNumber}
                      onChange={(e) =>
                        setPaymentSettings((s) => ({
                          ...s,
                          accountNumber: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 font-mono outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight italic">
                * Algumas alterações podem levar até 5 minutos para propagar via
                CDN.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isSaving || loading}
                  className="flex items-center justify-center gap-2 bg-red-50 text-red-600 font-black uppercase text-xs tracking-widest px-6 py-4 rounded-2xl hover:bg-red-100 border border-red-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-wait"
                >
                  <X size={16} /> Resetar Padrões
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-green text-white font-black uppercase text-xs tracking-widest px-12 py-4 rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-green-900/10 active:scale-95 disabled:opacity-70 disabled:cursor-wait"
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      A guardar...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Aplicar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Confirmação de Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[420px] rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-3">
              Resetar Todas as Configurações?
            </h3>
            <p className="text-xs text-slate-500 mb-2 leading-relaxed font-medium">
              Esta ação é irreversível. As seguintes alterações serão
              revertidas:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8 text-left">
              <ul className="text-[10px] text-red-700 font-bold space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-black mt-0.5">•</span>
                  <span>Cores: Verde #0e7038 e Amarelo #eab308</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-black mt-0.5">•</span>
                  <span>Nome da plataforma, instituição e aplicação</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-black mt-0.5">•</span>
                  <span>Logotipo e tipografia</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-black mt-0.5">•</span>
                  <span>Todas as configurações de sistema e segurança</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 h-12 bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95"
              >
                Manter Atual
              </button>
              <button
                onClick={handleResetSettings}
                disabled={isSaving}
                className="flex-1 h-12 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Resetando...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} /> Sim, Resetar Tudo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const SettingBtn = ({ active, label, icon, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
      active
        ? "bg-brand-green text-white shadow-lg shadow-green-900/20"
        : "text-slate-500 hover:bg-white hover:text-brand-green border border-transparent hover:border-slate-100"
    }`}
  >
    {icon} {label}
  </button>
);

const ToggleSetting = ({ label, description, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
    <div>
      <h4 className="text-sm font-bold text-slate-800">{label}</h4>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
        {description}
      </p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-brand-green after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6"></div>
    </label>
  </div>
);

export default AdminSettingsPage;
