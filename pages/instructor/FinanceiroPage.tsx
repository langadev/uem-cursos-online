import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Filter,
  MoreVertical,
  TrendingUp,
  Wallet
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { db } from "../../services/firebase";

interface Transaction {
  id: string;
  type: "sale" | "withdrawal";
  description: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "processing";
}

const parsePriceMZM = (val: any): number => {
  if (typeof val === "number") return val;
  const s = (val || "").toString().trim();
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
};

const FinanceiroPage: React.FC = () => {
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const { user } = useAuth();

  const [available, setAvailable] = useState(0);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setAvailable(0);
      setTotal(0);
      setPending(0);
      setTransactions([]);
      return;
    }

    let coursesUnsub: (() => void) | null = null;
    let fallbackUnsub: (() => void) | null = null;
    let nameUnsub: (() => void) | null = null;
    let enrollUnsubs: Array<() => void> = [];

    const subscribeEnrollments = (courseDocs: any[]) => {
      enrollUnsubs.forEach((u) => u());
      enrollUnsubs = [];

      const courseIds: string[] = [];
      const courseMap: Record<
        string,
        { title: string; certificatePrice: number }
      > = {};
      courseDocs.forEach((d) => {
        const data: any = d.data();
        const certificatePrice = parsePriceMZM(data?.certificatePrice || 0);
        courseIds.push(d.id);
        courseMap[d.id] = { title: data?.title || "Curso", certificatePrice };
      });

      if (courseIds.length === 0) {
        setAvailable(0);
        setTotal(0);
        setPending(0);
        setTransactions([]);
        return;
      }

      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);

      const mapById = new Map<string, any>();

      chunks.forEach((ids) => {
        const qA = query(
          collection(db, "enrollments"),
          where("course_id", "in", ids),
        );
        const qB = query(
          collection(db, "enrollments"),
          where("courseId", "in", ids),
        );

        const handleSnap = async (snap: any) => {
          snap.docs.forEach((d: any) => {
            mapById.set(d.id, { id: d.id, ...d.data() });
          });

          const items: Array<{
            ts: Date;
            amount: number;
            course_id: string;
            title: string;
          }> = [];
          Array.from(mapById.values()).forEach((rec: any) => {
            const course_id = rec.course_id || rec.courseId;
            const ts: Date | null = rec?.enrolledAt?.toDate
              ? rec.enrolledAt.toDate()
              : rec?.createdAt?.toDate
                ? rec.createdAt.toDate()
                : null;
            if (!course_id || !ts) return;
            const cm = courseMap[course_id];
            if (!cm || !cm.certificatePrice || !rec.certificatePaid) return; // Apenas certificados pagos
            items.push({
              ts,
              amount: cm.certificatePrice,
              course_id,
              title: cm.title,
            });
          });

          items.sort((a, b) => b.ts.getTime() - a.ts.getTime());
          const txs: Transaction[] = items.slice(0, 100).map((it, idx) => ({
            id: `${it.course_id}-${it.ts.getTime()}-${idx}`,
            type: "sale",
            description: `Certificado vendido: ${it.title}`,
            amount: it.amount,
            date: new Intl.DateTimeFormat("pt-PT", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(it.ts),
            status: "completed",
          }));
          setTransactions(txs);

          const sum = items.reduce((acc, it) => acc + it.amount, 0);
          const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
          const pend = items
            .filter((it) => it.ts.getTime() >= sevenDaysAgo)
            .reduce((acc, it) => acc + it.amount, 0);
          setTotal(sum);
          setPending(pend);
          setAvailable(Math.max(0, sum - pend));
        };

        const u1 = onSnapshot(qA, handleSnap);
        const u2 = onSnapshot(qB, handleSnap);
        enrollUnsubs.push(u1);
        enrollUnsubs.push(u2);
      });
    };

    coursesUnsub = onSnapshot(
      query(collection(db, "courses"), where("instructor_uid", "==", user.uid)),
      (snap) => {
        if (snap.empty) {
          fallbackUnsub = onSnapshot(
            query(
              collection(db, "courses"),
              where("creator_uid", "==", user.uid),
            ),
            (snap2) => {
              if (snap2.empty) {
                const name = (user.displayName || "").trim();
                if (name) {
                  nameUnsub = onSnapshot(
                    query(
                      collection(db, "courses"),
                      where("instructor", "==", name),
                    ),
                    (snap3) => subscribeEnrollments(snap3.docs),
                  );
                } else {
                  subscribeEnrollments([]);
                }
              } else {
                subscribeEnrollments(snap2.docs);
              }
            },
          );
        } else {
          subscribeEnrollments(snap.docs);
        }
      },
    );

    return () => {
      if (coursesUnsub) coursesUnsub();
      if (fallbackUnsub) fallbackUnsub();
      if (nameUnsub) nameUnsub();
      enrollUnsubs.forEach((u) => u());
    };
  }, [user?.uid]);

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Financeiro
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie seus recebimentos, acompanhe seu saldo e solicite saques.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <Download size={18} /> Exportar Extrato
            </button>
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="flex items-center gap-2 bg-brand-green text-white font-bold px-8 py-2.5 rounded-xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/20 active:scale-95"
            >
              <Wallet size={18} /> Solicitar Saque
            </button>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinanceCard
            label="Saldo Disponível"
            value={`MZM ${available.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`}
            icon={<Wallet className="text-brand-green" />}
            description="Pronto para saque imediato"
            accent
          />
          <FinanceCard
            label="Ganhos Totais"
            value={`MZM ${total.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`}
            icon={<TrendingUp className="text-blue-600" />}
            description="Somatório de vendas confirmadas"
          />
          <FinanceCard
            label="Aguardando Liberação"
            value={`MZM ${pending.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`}
            icon={<Clock className="text-amber-500" />}
            description="Vendas dos últimos 7 dias"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <HistoryIcon className="w-5 h-5 text-brand-green" />
                  Histórico de Transações
                </h3>
                <button className="text-xs font-bold text-slate-400 hover:text-brand-green flex items-center gap-1 transition-colors">
                  <Filter size={14} /> Filtrar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Descrição
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Data
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Valor (MZM)
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/30 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${t.type === "sale" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                            >
                              {t.type === "sale" ? (
                                <ArrowUpRight size={16} />
                              ) : (
                                <ArrowDownRight size={16} />
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-700">
                              {t.description}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs font-medium text-slate-400">
                          {t.date}
                        </td>
                        <td
                          className={`px-6 py-5 text-sm font-black ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {t.amount > 0 ? "+" : ""}
                          {t.amount.toLocaleString("pt-MZ", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">
                            <CheckCircle2 size={10} /> {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="w-full py-4 text-xs font-bold text-brand-green hover:bg-brand-light/30 border-t border-slate-50 transition-all flex items-center justify-center gap-2">
                Ver Todas as Transações <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Sidebar: Next Payout & Info */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <DollarSign size={80} />
              </div>
              <h3 className="text-lg font-bold mb-6">
                Próximo Pagamento Automático
              </h3>
              <div className="flex items-end gap-3 mb-8">
                <span className="text-4xl font-black text-brand-accent">
                  05
                </span>
                <span className="text-lg font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                  Novembro
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Banco</span>
                  <span className="font-bold">BCI Moçambique</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Conta Final</span>
                  <span className="font-bold">**** 8292</span>
                </div>
                <div className="h-px bg-white/10 my-2"></div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  As transferências automáticas ocorrem todo dia 05 de cada mês
                  para saldos acima de MZM 5.000,00.
                </p>
              </div>
            </div>

            <div className="bg-brand-light/20 border border-brand-green/10 rounded-3xl p-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-green shadow-sm mb-6">
                <AlertCircle size={24} />
              </div>
              <h4 className="font-bold text-brand-dark mb-2">
                Segurança nos Saques
              </h4>
              <p className="text-xs text-brand-dark/60 leading-relaxed mb-6 font-medium">
                Para sua proteção, todas as solicitações de saque manual passam
                por uma análise de até 48 horas úteis.
              </p>
              <button className="text-xs font-black text-brand-green uppercase tracking-widest hover:underline">
                Saiba mais sobre prazos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal (Simple Mock) */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-brand-light text-brand-green rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Wallet size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Solicitar Saque
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Quanto você deseja retirar hoje?
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Valor do Saque (MZM)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="0,00"
                      className="w-full pl-6 pr-16 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 outline-none transition-all"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      MZM
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  Saldo disponível:{" "}
                  <span className="text-brand-green">MZM 8.450,20</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-4 text-xs font-bold text-slate-500 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert("Solicitação enviada!");
                    setIsWithdrawModalOpen(false);
                  }}
                  className="flex-1 py-4 text-xs font-bold text-white bg-brand-green rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/20 uppercase tracking-widest"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </InstructorLayout>
  );
};

// --- Helper Components ---

const FinanceCard = ({ label, value, icon, description, accent }: any) => (
  <div
    className={`bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4 group transition-all hover:shadow-md ${accent ? "border-brand-green/20" : "border-slate-100"}`}
  >
    <div className="flex justify-between items-start">
      <div
        className={`p-3 rounded-2xl ${accent ? "bg-brand-green/5" : "bg-slate-50"} group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
        <MoreVertical size={18} />
      </button>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <h3
        className={`text-2xl font-black ${accent ? "text-brand-green" : "text-slate-900"}`}
      >
        {value}
      </h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">
        {description}
      </p>
    </div>
  </div>
);

const HistoryIcon = ({ className }: any) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 8v4l3 3" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export default FinanceiroPage;
