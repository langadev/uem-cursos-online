import {
    Ban,
    BookOpen,
    Check,
    CheckCircle,
    ExternalLink,
    FileCheck,
    Filter,
    Mail,
    Search,
    Star,
    Users,
    X,
    XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../../components/ConfirmationModal";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

interface TutorApplication {
  id: string;
  name: string;
  email: string;
  specialty: string;
  exp: string;
  date: string;
}

interface ActiveTutor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  courses: number;
  students: string;
  rating: number;
  joinedAt: string;
  status: "Ativo" | "Suspenso";
}

const INITIAL_APPLICATIONS: TutorApplication[] = [];

const INITIAL_TUTORS: ActiveTutor[] = [];

const AdminTutorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] =
    useState<TutorApplication[]>(INITIAL_APPLICATIONS);
  const [tutors, setTutors] = useState<ActiveTutor[]>(INITIAL_TUTORS);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("Todas");
  const [selectedTutor, setSelectedTutor] = useState<ActiveTutor | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);

  useEffect(() => {
    const loadTutors = async () => {
      try {
        setLoading(true);
        const response = await api.get("/users");
        const users = response.data || [];

        // Filter only instructors
        const list = users
          .filter((u: any) => u.role === "instructor")
          .map(
            (data: any) =>
              ({
                id: data.id,
                name: data.full_name || "Tutor",
                email: data.email || "N/A",
                specialty: data.specialty || "—",
                courses: typeof data.courses === "number" ? data.courses : 0,
                students:
                  typeof data.students === "string" ? data.students : "0",
                rating: typeof data.rating === "number" ? data.rating : 0,
                joinedAt: data.created_at
                  ? new Date(data.created_at).toLocaleDateString()
                  : "—",
                status: data.status || "Ativo",
              }) as ActiveTutor,
          );

        setTutors(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Erro ao carregar instrutores:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTutors();
  }, []);

  // Specialties for filter
  const specialties = useMemo(() => {
    const set = new Set(tutors.map((t) => t.specialty));
    return ["Todas", ...Array.from(set)];
  }, [tutors]);

  // Filtered Tutors
  const filteredTutors = useMemo(() => {
    return tutors.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpecialty =
        specialtyFilter === "Todas" || t.specialty === specialtyFilter;
      return matchesSearch && matchesSpecialty;
    });
  }, [tutors, searchQuery, specialtyFilter]);

  const handleApprove = async (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    const newTutor: ActiveTutor = {
      id: `t${Date.now()}`,
      name: app.name,
      email: app.email,
      specialty: app.specialty,
      courses: 0,
      students: "0",
      rating: 0,
      joinedAt: "Agora",
      status: "Ativo",
    };

    setTutors([newTutor, ...tutors]);
    setApplications(applications.filter((a) => a.id !== appId));
  };

  const handleReject = async (appId: string) => {
    setRejectingAppId(appId);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppId) return;

    setApplications(applications.filter((a) => a.id !== rejectingAppId));
    setIsRejectModalOpen(false);
    setRejectingAppId(null);
  };

  const handleCancelReject = () => {
    setIsRejectModalOpen(false);
    setRejectingAppId(null);
  };

  const handleToggleTutorStatus = async (id: string) => {
    const current = tutors.find((t) => t.id === id);
    if (!current) return;
    const newStatus = current.status === "Ativo" ? "Suspenso" : "Ativo";
    try {
      await api.put(`/users/${id}`, { status: newStatus });

      // Update local state
      setTutors(
        tutors.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
      );
    } catch (e) {
      console.error("Erro ao atualizar status do tutor:", e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Gestão de Tutores
            </h1>
            <p className="text-slate-500 mt-1">
              Controle de especialistas e novas candidaturas de ensino.
            </p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <TutorQuickStat
            label="Tutores Ativos"
            value={tutors.filter((t) => t.status === "Ativo").length.toString()}
            color="text-brand-green"
          />
          <TutorQuickStat
            label="Petições Pendentes"
            value={applications.length.toString()}
            color="text-brand-accent"
          />
          <TutorQuickStat
            label="Nota Média da Rede"
            value="4.85"
            color="text-emerald-500"
          />
        </div>

        {/* Applications Section */}
        {applications.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <FileCheck size={18} className="text-brand-green" />
                Candidaturas Pendentes ({applications.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {applications.map((app) => (
                <TutorApplicationRow
                  key={app.id}
                  app={app}
                  onApprove={() => handleApprove(app.id)}
                  onReject={() => handleReject(app.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tutors List Table */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center bg-slate-50/30">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou especialidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 h-11 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-slate-400 w-4 h-4 ml-2" />
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="h-11 px-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-green/5 outline-none cursor-pointer min-w-[180px]"
              >
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Especialista
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Alunos
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Rating
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTutors.length > 0 ? (
                  filteredTutors.map((tutor) => (
                    <TutorTableRow
                      key={tutor.id}
                      tutor={tutor}
                      onViewDetails={() => setSelectedTutor(tutor)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Users size={48} className="mb-4 opacity-10" />
                        <p className="font-bold">Nenhum tutor encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tutor Details Side Panel */}
        {selectedTutor && (
          <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-colors ${selectedTutor.status === "Suspenso" ? "bg-slate-100 text-slate-400" : "bg-brand-light text-brand-green"}`}
                  >
                    {selectedTutor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                      {selectedTutor.name}
                    </h3>
                    <p className="text-xs text-brand-green font-bold uppercase tracking-widest">
                      {selectedTutor.specialty}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTutor(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 bg-white border border-slate-200 rounded-xl"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Membro Desde
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedTutor.joinedAt}
                    </p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Status Atual
                    </p>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold ${selectedTutor.status === "Ativo" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                    >
                      {selectedTutor.status === "Ativo" ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        <Ban size={14} />
                      )}
                      {selectedTutor.status}
                    </span>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest border-l-4 border-brand-green pl-3">
                    Métricas de Performance
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <MetricSmall
                      label="Cursos"
                      value={selectedTutor.courses.toString()}
                      icon={<BookOpen size={12} />}
                    />
                    <MetricSmall
                      label="Formandos"
                      value={selectedTutor.students}
                      icon={<Users size={12} />}
                    />
                    <MetricSmall
                      label="Rating"
                      value={selectedTutor.rating.toString()}
                      icon={<Star size={12} />}
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest border-l-4 border-brand-green pl-3">
                    Contacto Directo
                  </h4>
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-brand-green transition-all">
                    <div className="flex items-center gap-3">
                      <Mail
                        className="text-slate-400 group-hover:text-brand-green"
                        size={18}
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {selectedTutor.email}
                      </span>
                    </div>
                    <ExternalLink
                      size={14}
                      className="text-slate-300 group-hover:text-brand-green"
                    />
                  </div>
                </div>

                {/* History Timeline */}
                <div className="space-y-4 pt-4">
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest border-l-4 border-brand-green pl-3">
                    Actividade Recente
                  </h4>
                  <div className="space-y-4 pl-3">
                    <ActivityItem
                      text="Lançou novo módulo em 'UI Design Pro'"
                      date="Há 3 dias"
                    />
                    <ActivityItem
                      text="Aprovou 15 certificados de conclusão"
                      date="Há 5 dias"
                    />
                    <ActivityItem
                      text="Recebeu avaliação 5.0 (Ricardo M.)"
                      date="Há 1 semana"
                      highlight
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-3 mt-auto">
                <button
                  onClick={() => handleToggleTutorStatus(selectedTutor.id)}
                  className={`flex-1 py-4 border font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-95 ${
                    selectedTutor.status === "Ativo"
                      ? "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                      : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                  }`}
                >
                  {selectedTutor.status === "Ativo"
                    ? "Suspender Acesso"
                    : "Ativar Acesso"}
                </button>
                <button
                  onClick={() =>
                    navigate("/admin/conteudos", {
                      state: { instructorFilter: selectedTutor.name },
                    })
                  }
                  className="flex-1 py-4 bg-brand-green text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-green-900/10 active:scale-95"
                >
                  Ver Cursos ({selectedTutor.courses})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={isRejectModalOpen}
        onConfirm={handleConfirmReject}
        onCancel={handleCancelReject}
        title="Rejeitar Candidatura"
        message="Deseja realmente rejeitar esta candidatura de tutor?"
        confirmText="Rejeitar"
        isDangerous={true}
      />
    </AdminLayout>
  );
};

// --- Sub-components ---

const TutorQuickStat = ({ label, value, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-brand-green transition-colors">
      {label}
    </p>
    <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
  </div>
);

// Added React.FC typing to allow standard props like 'key' in parent lists
const TutorApplicationRow: React.FC<{
  app: TutorApplication;
  onApprove: () => void;
  onReject: () => void;
}> = ({ app, onApprove, onReject }) => (
  <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-brand-green group-hover:text-white transition-all shadow-sm">
        {app.name.charAt(0)}
      </div>
      <div>
        <p className="font-bold text-slate-800 text-sm">{app.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-brand-green font-black uppercase tracking-tight">
            {app.specialty}
          </p>
          <span className="text-slate-300 text-xs">•</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
            {app.exp} exp
          </p>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <span className="text-[10px] text-slate-400 font-black uppercase hidden sm:block">
        {app.date}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onReject}
          className="p-2.5 bg-white text-red-500 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
          title="Rejeitar Candidatura"
        >
          <XCircle size={18} />
        </button>
        <button
          onClick={onApprove}
          className="p-2.5 bg-white text-brand-green border border-emerald-100 rounded-xl hover:bg-brand-green hover:text-white transition-all shadow-sm active:scale-95"
          title="Aprovar Tutor"
        >
          <CheckCircle size={18} />
        </button>
      </div>
    </div>
  </div>
);

// Added React.FC typing to allow standard props like 'key' in parent lists
const TutorTableRow: React.FC<{
  tutor: ActiveTutor;
  onViewDetails: () => void;
}> = ({ tutor, onViewDetails }) => (
  <tr
    className={`hover:bg-slate-50/50 transition-colors group ${tutor.status === "Suspenso" ? "opacity-70 bg-slate-50/30" : ""}`}
  >
    <td className="px-8 py-6">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm group-hover:bg-brand-green group-hover:text-white transition-all ${tutor.status === "Suspenso" ? "bg-slate-200 text-slate-400" : "bg-brand-light/50 text-brand-green"}`}
        >
          {tutor.name.charAt(0)}
        </div>
        <div>
          <p
            className={`font-bold text-sm transition-colors ${tutor.status === "Suspenso" ? "text-slate-400 italic" : "text-slate-800 group-hover:text-brand-green"}`}
          >
            {tutor.name}
          </p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
            {tutor.specialty}
          </p>
        </div>
      </div>
    </td>
    <td className="px-8 py-6">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${tutor.status === "Ativo" ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${tutor.status === "Ativo" ? "bg-emerald-500" : "bg-red-500"}`}
        ></span>
        {tutor.status}
      </span>
    </td>
    <td className="px-8 py-6 text-center">
      <div className="flex flex-col items-center">
        <span className="text-sm font-black text-slate-700">
          {tutor.students}
        </span>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
          Activos
        </span>
      </div>
    </td>
    <td className="px-8 py-6">
      <div className="flex items-center justify-center gap-1 text-brand-accent font-black text-sm bg-amber-50/50 px-2 py-1 rounded-lg w-fit mx-auto border border-amber-100">
        <Star size={14} fill="currentColor" /> {tutor.rating || "S/A"}
      </div>
    </td>
    <td className="px-8 py-6 text-right">
      <button
        onClick={onViewDetails}
        className="text-[10px] font-black uppercase text-brand-green bg-brand-light/50 px-4 py-2 rounded-xl hover:bg-brand-green hover:text-white transition-all shadow-sm"
      >
        Ver Perfil
      </button>
    </td>
  </tr>
);

const MetricSmall = ({ label, value, icon }: any) => (
  <div className="flex flex-col items-center p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
    <div className="text-brand-green mb-1 opacity-60">{icon}</div>
    <p className="text-lg font-black text-slate-800 leading-none">{value}</p>
    <p className="text-[8px] font-black text-slate-400 uppercase mt-1">
      {label}
    </p>
  </div>
);

const ActivityItem = ({ text, date, highlight }: any) => (
  <div className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-brand-green/30 before:rounded-full">
    <p
      className={`text-xs font-bold leading-tight ${highlight ? "text-brand-green" : "text-slate-700"}`}
    >
      {text}
    </p>
    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
      {date}
    </p>
  </div>
);

export default AdminTutorsPage;
