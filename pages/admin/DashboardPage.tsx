import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  GraduationCap,
  History,
  MoreVertical,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { db } from "../../services/firebase";

interface DashboardStats {
  totalStudents: number;
  activeTutors: number;
  totalRevenue: number;
  publishedCourses: number;
  pendingApprovals: any[];
  recentLogs: any[];
}

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeTutors: 0,
    totalRevenue: 0,
    publishedCourses: 0,
    pendingApprovals: [],
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [allLogs, setAllLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Total de Estudantes (profiles com role=student)
        const studentQuery = query(
          collection(db, "profiles"),
          where("role", "==", "student"),
        );
        const studentSnap = await getDocs(studentQuery);
        const totalStudents = studentSnap.size;

        // Total de Tutores Ativos (profiles com role=instructor e status=Ativo)
        const instructorQuery = query(
          collection(db, "profiles"),
          where("role", "==", "instructor"),
          where("status", "==", "Ativo"),
        );
        const instructorSnap = await getDocs(instructorQuery);
        const activeTutors = instructorSnap.size;

        // Cursos Publicados
        const courseQuery = query(
          collection(db, "courses"),
          limit(100), // Limita para performance
        );
        const courseSnap = await getDocs(courseQuery);
        const publishedCourses = courseSnap.size;

        // Aprovações Pendentes (instructors com status=pending)
        const pendingQuery = query(
          collection(db, "profiles"),
          where("role", "==", "instructor"),
          where("status", "==", "pending"),
          limit(5),
        );
        const pendingSnap = await getDocs(pendingQuery);
        const pendingApprovals = pendingSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Total de Receita - Calcula apenas de certificados pagos (certificatePaid = true)
        let totalRevenue = 0;
        try {
          const paidEnrollmentsQuery = query(
            collection(db, "enrollments"),
            where("certificatePaid", "==", true),
            limit(500),
          );
          const paidEnrollmentsSnap = await getDocs(paidEnrollmentsQuery);

          for (const enrollmentDoc of paidEnrollmentsSnap.docs) {
            const enrollmentData = enrollmentDoc.data();
            const certificatePrice =
              Number(enrollmentData.certificatePrice || 0) || 0;
            totalRevenue += certificatePrice;
          }
        } catch (error) {
          console.error("Erro ao calcular receita de certificados:", error);
        }

        // Logs Recentes
        let recentLogs: any[] = [];
        let allLogsData: any[] = [];
        try {
          // Buscar TODOS os logs
          const allLogsQuery = query(
            collection(db, "admin_logs"),
            orderBy("timestamp", "desc"),
            limit(500), // Limita para performance
          );
          const allLogsSnap = await getDocs(allLogsQuery);
          allLogsData = allLogsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Pegar apenas os primeiros 5 para o dashboard
          recentLogs = allLogsData.slice(0, 5);
        } catch (error) {
          console.log("Logs ainda não disponíveis:", error);
          recentLogs = [];
          allLogsData = [];
        }

        console.log("Dashboard data fetched:", {
          totalStudents,
          activeTutors,
          totalRevenue,
          publishedCourses,
          pendingApprovals: pendingApprovals.length,
          recentLogs: recentLogs.length,
          totalLogs: allLogsData.length,
        });

        // Validar que totalRevenue é um número válido
        if (isNaN(totalRevenue)) {
          console.warn("Total revenue is NaN, setting to 0");
          totalRevenue = 0;
        }

        setAllLogs(allLogsData);
        setStats({
          totalStudents,
          activeTutors,
          totalRevenue,
          publishedCourses,
          pendingApprovals,
          recentLogs,
        });
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome & Global Status */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Visão Geral da Rede
            </h1>
            <p className="text-slate-500 mt-1">
              Bem-vindo ao Backoffice. Controle central do ecossistema UEM
              Cursos online.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-brand-light/50 rounded-xl flex items-center justify-center text-brand-green">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Crescimento Mês
                </p>
                <p className="text-lg font-black text-brand-green leading-none">
                  +24.5%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdminStatCard
            label="Total Estudantes"
            value={loading ? "..." : stats.totalStudents.toLocaleString()}
            subValue={`+${Math.floor(stats.totalStudents * 0.023)}k este mês`}
            icon={<Users className="text-blue-600" />}
          />
          <AdminStatCard
            label="Tutores Ativos"
            value={loading ? "..." : stats.activeTutors}
            subValue={`${stats.pendingApprovals.length} pendentes`}
            icon={<GraduationCap className="text-brand-green" />}
          />
          <AdminStatCard
            label="Volume Bruto (GMV)"
            value={
              loading
                ? "..."
                : `MZM ${isNaN(stats.totalRevenue) ? "0" : (stats.totalRevenue / 1000).toFixed(0)}k`
            }
            subValue={
              isNaN(stats.totalRevenue)
                ? "Comissão: MZM 0"
                : `Comissão: MZM ${Math.floor(stats.totalRevenue * 0.15).toLocaleString()}`
            }
            icon={<DollarSign className="text-brand-accent" />}
          />
          <AdminStatCard
            label="Cursos em Vitrine"
            value={loading ? "..." : stats.publishedCourses}
            subValue="85% Taxa de aprovação"
            icon={<ShieldCheck className="text-emerald-500" />}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pending Approvals */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Clock size={18} className="text-amber-500" />
                  Aprovações Pendentes ({stats.pendingApprovals.length})
                </h3>
                <button className="text-xs font-bold text-brand-green hover:underline">
                  Ver fila completa
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-6 text-center text-slate-400">
                    Carregando...
                  </div>
                ) : stats.pendingApprovals.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    Nenhuma aprovação pendente
                  </div>
                ) : (
                  stats.pendingApprovals.map((approval) => (
                    <ApprovalRow
                      key={approval.id}
                      name={approval.full_name}
                      type="Tutor"
                      detail={approval.bio || "Sem descrição"}
                      date="Pendente"
                    />
                  ))
                )}
              </div>
            </div>

            {/* System Alerts */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex gap-4">
                <AlertCircle className="text-red-600 shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-red-900 text-sm">
                    Denúncia de Conteúdo
                  </h4>
                  <p className="text-xs text-red-700/70 mt-1 leading-relaxed">
                    3 usuários reportaram o curso "Dropshipping Express" por
                    conteúdo enganoso.
                  </p>
                  <button className="mt-4 text-[10px] font-black uppercase text-red-600 bg-white px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                    Revisar Agora
                  </button>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex gap-4">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">
                    Backup Concluído
                  </h4>
                  <p className="text-xs text-emerald-700/70 mt-1 leading-relaxed">
                    A sincronização do banco de dados foi feita com sucesso.
                  </p>
                  <p className="mt-4 text-[10px] font-black text-emerald-600 uppercase">
                    Há 45 minutos
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Insights Sidebar */}
          <div className="space-y-6">
            <div className="bg-brand-dark rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-green/30 rounded-full blur-3xl"></div>
              <h3 className="text-lg font-bold mb-6">
                Receita da Plataforma (15%)
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-1">
                    Este Mês
                  </p>
                  <p className="text-3xl font-black">
                    {loading
                      ? "..."
                      : `MZM ${isNaN(stats.totalRevenue) ? "0" : (stats.totalRevenue * 0.15).toLocaleString("pt-MZ", { maximumFractionDigits: 0 })}`}
                  </p>
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">
                      Meta de Vendas
                    </p>
                    <p className="text-sm font-bold">85% Atingida</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">
                      Novos Assinantes
                    </p>
                    <p className="text-sm font-bold">+412</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-6">
                Logs de Atividade
              </h4>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center text-slate-400 text-sm">
                    Carregando logs...
                  </div>
                ) : stats.recentLogs.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm">
                    Nenhum log disponível
                  </div>
                ) : (
                  stats.recentLogs.map((log) => (
                    <LogItem
                      key={log.id}
                      text={log.action || "Ação do sistema"}
                      details={log.details}
                      targetUser={log.targetUserName}
                      time={
                        log.timestamp
                          ?.toDate?.()
                          ?.toLocaleTimeString?.("pt-MZ") || "Recentemente"
                      }
                    />
                  ))
                )}
              </div>
              <button
                onClick={() => setShowAllLogs(true)}
                className="w-full mt-8 py-3 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-xl hover:bg-slate-100 transition-all"
              >
                Ver Logs do Sistema ({allLogs.length})
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Logs do Sistema */}
        {showAllLogs && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[32px] p-8 text-left shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-green/10 p-3 rounded-xl">
                    <History className="text-brand-green" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                      Logs do Sistema
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Histórico completo de atividades
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllLogs(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 duration-200"
                >
                  <X size={24} />
                </button>
              </div>

              {allLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                    Nenhum log registado ainda
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-sm">
                            {log.action}
                          </p>
                          {log.targetUserName && (
                            <p className="text-xs text-slate-600 mt-1">
                              <span className="font-bold">Utilizador:</span>{" "}
                              {log.targetUserName} ({log.targetUserRole})
                            </p>
                          )}
                          {log.details && (
                            <p className="text-xs text-slate-500 mt-2 italic bg-white p-2 rounded-lg border border-slate-100">
                              {log.details}
                            </p>
                          )}
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="text-[10px] font-black text-slate-500 uppercase">
                            {log.timestamp
                              ?.toDate?.()
                              ?.toLocaleString?.("pt-MZ") ||
                              log.createdAt?.slice(0, 10) ||
                              "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const AdminStatCard = ({ label, value, subValue, icon }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-brand-light/50 transition-colors">
        {icon}
      </div>
      <button className="p-2 text-slate-300 hover:text-slate-500">
        <MoreVertical size={16} />
      </button>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <h3 className="text-2xl font-black text-slate-900">{value}</h3>
      <p className="text-xs font-bold text-brand-green mt-1">{subValue}</p>
    </div>
  </div>
);

const ApprovalRow = ({ name, type, detail, date }: any) => (
  <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
        {name.charAt(0)}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800">{name}</p>
          <span
            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
              type === "Curso"
                ? "bg-brand-light text-brand-green"
                : "bg-brand-accent/10 text-brand-accent"
            }`}
          >
            {type}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">{detail}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-slate-400 font-medium">{date}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-2 bg-white text-emerald-500 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors shadow-sm"
          title="Aprovar"
        >
          <CheckCircle2 size={16} />
        </button>
        <button
          className="p-2 bg-white text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
          title="Rejeitar"
        >
          <XCircle size={16} />
        </button>
      </div>
    </div>
  </div>
);

const LogItem = ({ text, details, targetUser, time }: any) => (
  <div className="flex justify-between items-start gap-4 p-3 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors">
    <div className="flex-1">
      <p className="text-xs text-slate-700 font-bold leading-tight">{text}</p>
      {targetUser && (
        <p className="text-[9px] text-slate-500 font-medium mt-1">
          Utilizador: {targetUser}
        </p>
      )}
      {details && (
        <p className="text-[9px] text-slate-400 font-medium mt-1 italic">
          {details}
        </p>
      )}
    </div>
    <span className="text-[10px] text-slate-400 font-black whitespace-nowrap">
      {time}
    </span>
  </div>
);

export default AdminDashboardPage;
