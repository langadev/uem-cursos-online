import {
    Check,
    CheckCircle2,
    Info,
    Loader2,
    Lock,
    RotateCcw,
    Save,
    ShieldAlert,
    ShieldCheck,
    X
} from "lucide-react";
import React, { useState } from "react";
import ConfirmationModal from "../../components/ConfirmationModal";
import AdminLayout from "../../layouts/AdminLayout";

interface RolePermissions {
  master: boolean;
  moderator: boolean;
  finance: boolean;
}

interface PermissionItem {
  id: string;
  label: string;
  description: string;
  roles: RolePermissions;
  isSensitive?: boolean;
}

const DEFAULT_PERMISSIONS: PermissionItem[] = [
  {
    id: "view_dashboards",
    label: "Visualizar Dashboards",
    description: "Acesso aos gráficos de métricas e KPIs globais.",
    roles: { master: true, moderator: true, finance: true },
  },
  {
    id: "edit_users",
    label: "Editar Utilizadores",
    description: "Capacidade de alterar dados e suspender contas.",
    roles: { master: true, moderator: false, finance: false },
    isSensitive: true,
  },
  {
    id: "approve_courses",
    label: "Aprovar Cursos",
    description: "Acesso à fila de moderação de novos conteúdos.",
    roles: { master: true, moderator: true, finance: false },
  },
  {
    id: "process_payouts",
    label: "Processar Saques",
    description: "Autorização financeira para transferências a tutores.",
    roles: { master: true, moderator: false, finance: true },
    isSensitive: true,
  },
  {
    id: "manage_perms",
    label: "Gerir Permissões",
    description: "Alterar esta matriz e níveis de acesso globais.",
    roles: { master: true, moderator: false, finance: false },
    isSensitive: true,
  },
  {
    id: "system_config",
    label: "Configurações do Sistema",
    description: "Ajustar branding, manutenção e chaves de API.",
    roles: { master: true, moderator: false, finance: false },
    isSensitive: true,
  },
];

const AdminPermissionsPage: React.FC = () => {
  const [permissions, setPermissions] =
    useState<PermissionItem[]>(DEFAULT_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });

  const togglePermission = (
    permissionId: string,
    role: keyof RolePermissions,
  ) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id === permissionId) {
          return {
            ...p,
            roles: {
              ...p.roles,
              [role]: !p.roles[role],
            },
          };
        }
        return p;
      }),
    );
  };

  const showFeedback = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3000);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulação de delay de rede para salvar no backend
    setTimeout(() => {
      setIsSaving(false);
      showFeedback("Políticas de acesso atualizadas com sucesso!");
    }, 1200);
  };

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    // Criamos uma nova cópia do array constante para garantir a atualização do estado
    setPermissions(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
    setIsResetModalOpen(false);
    showFeedback("Configurações padrão restauradas com sucesso!");
  };

  const handleCancelReset = () => {
    setIsResetModalOpen(false);
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Gestão de Permissões
            </h1>
            <p className="text-slate-500 mt-1">
              Configuração fina do Controle de Acesso Baseado em Cargos (RBAC).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
              <Lock className="w-4 h-4 text-brand-accent" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                Protocolo de Segurança Ativo
              </span>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {toast.show && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 size={18} />
            <p className="text-xs font-bold uppercase tracking-tight">
              {toast.msg}
            </p>
          </div>
        )}

        <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-[32px] p-6 flex gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-accent shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h4 className="font-bold text-brand-dark text-sm">
              Aviso de Segurança
            </h4>
            <p className="text-xs text-brand-dark/60 mt-1 leading-relaxed font-medium">
              Alterações nesta matriz entram em vigor imediatamente para todos
              os administradores logados. Permissões marcadas como{" "}
              <span className="text-brand-accent font-black">SENSÍVEIS</span>{" "}
              devem ser restritas apenas ao Admin Master.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-brand-green w-5 h-5" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">
                Matriz de Acesso
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_rgba(14,112,56,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase">
                  Acesso Liberado
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">
                    Funcionalidade
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black text-brand-green uppercase tracking-widest text-center">
                    Admin Master
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black text-brand-accent uppercase tracking-widest text-center">
                    Moderador
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black text-blue-600 uppercase tracking-widest text-center">
                    Financeiro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {permissions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/40 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-start gap-3">
                        {item.isSensitive ? (
                          <div
                            className="mt-0.5 p-1 bg-amber-50 text-amber-600 rounded"
                            title="Sensível"
                          >
                            <Lock size={12} />
                          </div>
                        ) : (
                          <div className="mt-0.5 p-1 bg-slate-50 text-slate-400 rounded">
                            <Info size={12} />
                          </div>
                        )}
                        <div>
                          <p
                            className={`font-bold text-sm ${item.isSensitive ? "text-slate-900" : "text-slate-700"}`}
                          >
                            {item.label}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <PermissionToggle
                        active={item.roles.master}
                        onClick={() => togglePermission(item.id, "master")}
                        color="bg-brand-green"
                      />
                    </td>
                    <td className="px-6 py-6 text-center">
                      <PermissionToggle
                        active={item.roles.moderator}
                        onClick={() => togglePermission(item.id, "moderator")}
                        color="bg-brand-accent"
                      />
                    </td>
                    <td className="px-6 py-6 text-center">
                      <PermissionToggle
                        active={item.roles.finance}
                        onClick={() => togglePermission(item.id, "finance")}
                        color="bg-blue-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95 shadow-sm"
            >
              <RotateCcw size={16} /> Resetar Padrões
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-green text-white font-black uppercase text-[10px] tracking-widest px-10 py-4 rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-green-900/10 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <Save size={18} /> Salvar Alterações na Matriz
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onConfirm={handleConfirmReset}
        onCancel={handleCancelReset}
        title="Restaurar Configurações Padrão"
        message="Atenção: Esta ação irá restaurar todas as permissões para as configurações recomendadas de fábrica. Deseja continuar?"
        confirmText="Restaurar"
        isDangerous={true}
      />
    </AdminLayout>
  );
};

const PermissionToggle = ({
  active,
  onClick,
  color,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
}) => (
  <div className="flex justify-center">
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
        active
          ? `${color} text-white shadow-lg shadow-black/5 border-transparent`
          : "bg-white text-slate-300 hover:text-slate-400 border-slate-100 hover:border-slate-200 shadow-sm"
      }`}
    >
      {active ? (
        <Check size={20} strokeWidth={3} />
      ) : (
        <X size={20} strokeWidth={3} />
      )}
    </button>
  </div>
);

export default AdminPermissionsPage;
