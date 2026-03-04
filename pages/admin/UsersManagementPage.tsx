import {
    CheckCircle,
    CheckCircle2,
    Copy,
    Database,
    Edit,
    Eye,
    EyeOff,
    Fingerprint,
    Loader2,
    Lock,
    Mail,
    Search,
    Shield,
    Trash2,
    UserPlus,
    X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { UserProfile } from "../../contexts/AuthContext";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student" as "student" | "instructor" | "admin",
    status: "Ativo" as "Ativo" | "Suspenso",
  });

  // Carregar utilizadores do MySQL
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        console.log(
          "🔵 [UsersManagementPage] Iniciando carregamento de utilizadores...",
        );
        const response = await api.get("/users");
        const usersList = response.data || [];
        console.log(
          "✅ [UsersManagementPage] Utilizadores carregados:",
          usersList.length,
          usersList,
        );
        setUsers(
          usersList.sort((a: UserProfile, b: UserProfile) =>
            (a.full_name || "").localeCompare(b.full_name || ""),
          ),
        );
      } catch (error) {
        console.error(
          "❌ [UsersManagementPage] Erro ao carregar utilizadores:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;

    setActionLoading(true);

    try {
      if (editingUser) {
        // Fluxo de Edição
        const updateData = {
          full_name: formData.full_name,
          role: formData.role,
          status: formData.status,
        };

        await api.put(`/users/${editingUser.id}`, updateData);
        triggerSuccess("Utilizador atualizado!");
      } else {
        // Fluxo de Novo Registo
        const newUserData = {
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          status: formData.status,
        };

        const response = await api.post("/users", newUserData);
        console.log("Novo utilizador criado:", response.data);
        triggerSuccess("Novo acesso criado com sucesso!");
      }

      setIsUserModalOpen(false);

      // Recarregar lista de utilizadores
      const response = await api.get("/users");
      const usersList = response.data || [];
      setUsers(
        usersList.sort((a: UserProfile, b: UserProfile) =>
          (a.full_name || "").localeCompare(b.full_name || ""),
        ),
      );
    } catch (error: any) {
      console.error("Erro:", error);
      alert(
        error.response?.data?.message ||
          error.message ||
          "Erro ao processar gravação.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateDefaultPassword = (name: string) => {
    const firstName = name.split(" ")[0].replace(/[^a-zA-Z]/g, "");
    return firstName ? `UEM${firstName}@2024` : "UEM@2024@";
  };

  const handleOpenModal = (user?: UserProfile) => {
    setShowPassword(false);
    setActionLoading(false);
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: "••••••••",
        role: user.role,
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "student",
        status: "Ativo",
      });
    }
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.delete(`/users/${id}`);

      setDeleteConfirmId(null);
      triggerSuccess("Registo removido.");

      // Recarregar lista de utilizadores
      const response = await api.get("/users");
      const usersList = response.data || [];
      setUsers(
        usersList.sort((a: UserProfile, b: UserProfile) =>
          (a.full_name || "").localeCompare(b.full_name || ""),
        ),
      );
    } catch (error: any) {
      console.error("Erro ao eliminar:", error);
      alert(error.response?.data?.message || "Erro ao eliminar.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = searchQuery.toLowerCase();
      const name = (user.full_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const matchesSearch = name.includes(search) || email.includes(search);

      const roleMap: any = {
        student: "Formandos",
        instructor: "Tutores",
        admin: "Admins",
      };
      const matchesRole =
        roleFilter === "Todos" || roleMap[user.role] === roleFilter;
      const matchesStatus =
        statusFilter === "Todos" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12 relative">
        {/* Banner de Sucesso flutuante */}
        {successMessage && (
          <div className="fixed top-24 right-8 z-[200] animate-in slide-in-from-right duration-500">
            <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/20">
              <CheckCircle size={20} className="text-emerald-100" />
              <span className="font-black uppercase text-[10px] tracking-widest">
                {successMessage}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Gestão de Utilizadores
            </h1>
            <p className="text-slate-500 font-medium">
              Controle total da base de dados ({users.length} registos).
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-brand-green text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-green-900/10 active:scale-95"
          >
            <UserPlus size={18} /> Novo Utilizador
          </button>
        </div>

        {/* Toolbar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pesquisar por Nome ou E-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-14 bg-white border border-slate-200 rounded-[20px] text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-14 px-4 bg-white border border-slate-200 rounded-[20px] text-xs font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer shadow-sm"
          >
            <option value="Todos">Todos os Cargos</option>
            <option value="Formandos">Formandos</option>
            <option value="Tutores">Tutores</option>
            <option value="Admins">Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-14 px-4 bg-white border border-slate-200 rounded-[20px] text-xs font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer shadow-sm"
          >
            <option value="Todos">Qualquer Status</option>
            <option value="Ativo">Ativos</option>
            <option value="Suspenso">Suspensos</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-48 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-brand-green" />
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                A carregar registos...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Utilizador
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Cargo / Status
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Status da BD
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/40 transition-colors group"
                      >
                        <td className="px-8 py-7">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border shadow-inner ${user.status === "Ativo" ? "bg-brand-light/40 text-brand-green border-brand-green/5" : "bg-slate-100 text-slate-300"}`}
                            >
                              {user.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 leading-tight">
                                {user.full_name}
                              </p>
                              <p className="text-xs text-slate-400 font-bold">
                                {user.email}
                              </p>
                              <button
                                onClick={() => copyToClipboard(user.uid)}
                                className="mt-1 flex items-center gap-1.5 text-[9px] font-black text-slate-300 hover:text-brand-green uppercase"
                              >
                                <Fingerprint size={10} />{" "}
                                {user.uid.substring(0, 12)}...
                                {copiedId === user.uid ? (
                                  <CheckCircle2
                                    size={10}
                                    className="text-brand-green"
                                  />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-7">
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${
                                user.role === "admin"
                                  ? "bg-brand-accent/10 text-brand-dark border-brand-accent/20"
                                  : user.role === "instructor"
                                    ? "bg-brand-light text-brand-green border-brand-green/20"
                                    : "bg-blue-50 text-blue-600 border-blue-100"
                              }`}
                            >
                              <Shield size={10} />{" "}
                              {user.role === "admin"
                                ? "Admin"
                                : user.role === "instructor"
                                  ? "Tutor"
                                  : "Formando"}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase ${user.status === "Ativo" ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {user.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Database size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              Online
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-7 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(user)}
                              className="p-3 text-slate-400 hover:text-brand-green bg-white border border-slate-100 rounded-xl transition-all shadow-sm active:scale-90"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(user.id)}
                              className="p-3 text-slate-400 hover:text-red-600 bg-white border border-slate-100 rounded-xl shadow-sm transition-all active:scale-90"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-40 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="bg-slate-50 p-8 rounded-full">
                            <Search size={42} className="text-slate-200" />
                          </div>
                          <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
                            Vazio
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Utilizador corrigido para evitar travamentos */}
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-brand-green p-3 rounded-2xl text-white">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter">
                      {editingUser ? "Editar Acesso" : "Novo Acesso"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      Base de Dados MySQL
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-3 text-slate-300 hover:text-slate-900 transition-all hover:rotate-90"
                >
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-6 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green outline-none shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    E-mail de Login
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                      size={18}
                    />
                    <input
                      type="email"
                      required
                      disabled={!!editingUser}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full pl-14 pr-6 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green outline-none disabled:opacity-50 shadow-sm"
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Senha de Acesso
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            password: generateDefaultPassword(
                              formData.full_name,
                            ),
                          })
                        }
                        className="text-[9px] font-black text-brand-green uppercase hover:underline"
                      >
                        Resetar Padrão
                      </button>
                    </div>
                    <div className="relative">
                      <Lock
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                        size={18}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full pl-14 pr-12 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green outline-none shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Cargo
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as any,
                        })
                      }
                      className="w-full px-5 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-900 focus:bg-white outline-none cursor-pointer shadow-sm"
                    >
                      <option value="student">Aluno</option>
                      <option value="instructor">Tutor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as any,
                        })
                      }
                      className="w-full px-5 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-900 focus:bg-white outline-none cursor-pointer shadow-sm"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 h-16 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 rounded-3xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 h-16 bg-brand-green text-white font-black uppercase text-[10px] tracking-widest rounded-3xl hover:bg-brand-dark shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : editingUser ? (
                      "Atualizar"
                    ) : (
                      "Salvar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Eliminar */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[48px] p-12 text-center shadow-2xl border border-slate-100">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
                Eliminar Registo?
              </h3>
              <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">
                A remoção deste utilizador é definitiva.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  disabled={actionLoading}
                  onClick={() => handleDeleteUser(deleteConfirmId)}
                  className="h-14 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-3xl shadow-xl shadow-red-900/20"
                >
                  {actionLoading ? "A eliminar..." : "Confirmar"}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setDeleteConfirmId(null)}
                  className="h-14 bg-slate-50 text-slate-400 font-black uppercase text-xs tracking-widest rounded-3xl"
                >
                  Desistir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UsersManagementPage;
