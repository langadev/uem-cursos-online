import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import {
    Activity,
    Ban,
    Check,
    CheckCircle,
    ChevronDown,
    Clock,
    Filter,
    History,
    LayoutGrid,
    MessageSquare,
    Search,
    Send,
    TrendingUp,
    UserCheck,
    X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { db } from "../../services/firebase";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  course: string;
  progress: number;
  lastActivity: string;
  engagement: "dedicated" | "normal" | "at_risk";
  status: "active" | "blocked";
}

const MyStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeChat, setActiveChat] = useState<Student | null>(null);

  // Estados dos Filtros
  const [filterCourse, setFilterCourse] = useState("Todos os Cursos");
  const [filterStatus, setFilterStatus] = useState("Qualquer Status");

  // Cursos do instrutor -> Inscrições desses cursos (com fallback para creator_uid)
  useEffect(() => {
    if (!user?.uid) {
      setStudents([]);
      return;
    }
    let enrollUnsubs: Array<() => void> = [];
    let fallbackUnsub: (() => void) | null = null;
    let fallbackNameUnsub: (() => void) | null = null;
    let subsUnsub: (() => void) | null = null;
    let fallbackEnrollUnsubs: Array<() => void> = [];

    const subscribeEnrollments = (courseDocs: any[]) => {
      // Limpa observadores anteriores
      enrollUnsubs.forEach((fn) => fn());
      enrollUnsubs = [];
      if (subsUnsub) {
        subsUnsub();
        subsUnsub = null;
      }
      fallbackEnrollUnsubs.forEach((fn) => fn());
      fallbackEnrollUnsubs = [];

      const courseMap: Record<string, string> = {};
      const courseIds: string[] = [];
      courseDocs.forEach((d) => {
        courseIds.push(d.id);
        courseMap[d.id] = (d.data() as any)?.title || "Curso";
      });
      if (courseIds.length === 0) {
        setStudents([]);
        return;
      }

      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);

      // Assinatura única de submissões do instrutor (sem orderBy para evitar índice composto)
      subsUnsub = onSnapshot(
        query(
          collection(db, "submissions"),
          where("instructor_uid", "==", user.uid),
        ),
        (s) => {
          const latestByUser = new Map<string, any>();
          s.docs.forEach((d) => {
            const data: any = { id: d.id, ...d.data() };
            const uid = data.user_uid;
            const ts = data?.createdAt?.toDate
              ? data.createdAt.toDate().getTime()
              : 0;
            const cur = latestByUser.get(uid);
            if (!cur || ts > (cur.ts || 0)) latestByUser.set(uid, { ts, data });
          });
          setStudents((prev) =>
            prev.map((p) => {
              const entry = latestByUser.get(p.id);
              if (entry && entry.data?.createdAt?.toDate) {
                return {
                  ...p,
                  lastActivity: new Intl.DateTimeFormat("pt-PT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(entry.data.createdAt.toDate()),
                };
              }
              return p;
            }),
          );
        },
      );

      chunks.forEach((ids) => {
        const qA = query(
          collection(db, "enrollments"),
          where("course_id", "in", ids),
        );
        const qB = query(
          collection(db, "enrollments"),
          where("courseId", "in", ids),
        );

        const handleSnap = async (enrSnap: any) => {
          const records = enrSnap.docs.map((d: any) => {
            const raw: any = d.data();
            return {
              id: d.id,
              ...raw,
              course_id: raw.course_id || raw.courseId,
              user_uid: raw.user_uid || raw.userId || raw.uid,
            };
          });
          const byUser: Record<string, any> = {};
          for (const rec of records) {
            byUser[rec.user_uid] = rec;
          }

          // Carregar perfis em background sem bloquear UI
          const userIds = Object.keys(byUser);
          const cacheKey = `student_profiles_batch_${userIds.length}`;

          // Renderizar imediatamente com dados básicos
          const basicProfiles = userIds.map((uid) => {
            const enr = byUser[uid];
            const course = courseMap[enr.course_id] || "Curso";
            const lastDate = enr?.enrolledAt?.toDate
              ? enr.enrolledAt.toDate()
              : enr?.createdAt?.toDate
                ? enr.createdAt.toDate()
                : null;
            const lastActivity = lastDate
              ? new Intl.DateTimeFormat("pt-PT", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(lastDate)
              : "";
            return {
              id: uid,
              name: "Formando",
              email: "",
              avatar: "https://i.pravatar.cc/150?u=" + uid,
              course,
              progress: 0,
              lastActivity,
              engagement: "normal" as const,
              status: "active" as const,
            } as Student;
          });
          setStudents(basicProfiles);

          // Carregar perfis em background (máximo 10 por vez para evitar excesso de queries)
          const loadProfilesInBatches = async () => {
            const profileMap = new Map<string, any>();

            for (let i = 0; i < userIds.length; i += 10) {
              const batch = userIds.slice(i, i + 10);
              const profiles = await Promise.all(
                batch.map(async (uid) => {
                  try {
                    const ps = await getDoc(doc(db, "profiles", uid));
                    if (ps.exists()) {
                      const pd: any = ps.data();
                      return {
                        uid,
                        name: pd?.full_name || "Formando",
                        email: pd?.email || "",
                        avatar:
                          pd?.avatar_url ||
                          "https://i.pravatar.cc/150?u=" + uid,
                      };
                    }
                  } catch {}
                  return {
                    uid,
                    name: "Formando",
                    email: "",
                    avatar: "https://i.pravatar.cc/150?u=" + uid,
                  };
                }),
              );

              profiles.forEach((p) => profileMap.set(p.uid, p));

              // Atualizar UI com profiles carregados até agora
              setStudents((prev) =>
                prev.map((student) => {
                  const profile = profileMap.get(student.id);
                  return profile
                    ? {
                        ...student,
                        name: profile.name,
                        email: profile.email,
                        avatar: profile.avatar,
                      }
                    : student;
                }),
              );
            }
          };

          // Carregar em background sem bloquear
          loadProfilesInBatches().catch((err) =>
            console.error("Erro ao carregar perfis:", err),
          );
        };

        const uA = onSnapshot(qA, handleSnap);
        const uB = onSnapshot(qB, handleSnap);
        enrollUnsubs.push(uA);
        enrollUnsubs.push(uB);
      });
    };

    // Fallback: inscrever-se diretamente pelas inscrições que têm o nome do instrutor (dados legados)
    const subscribeEnrollmentsByInstructorNames = (names: string[]) => {
      enrollUnsubs.forEach((fn) => fn());
      enrollUnsubs = [];
      if (subsUnsub) {
        subsUnsub();
        subsUnsub = null;
      }
      fallbackEnrollUnsubs.forEach((fn) => fn());
      fallbackEnrollUnsubs = [];

      if (!names || names.length === 0) {
        setStudents([]);
        return;
      }

      const qA = query(
        collection(db, "enrollments"),
        where("instructor", "in", names),
      );
      const qB = query(
        collection(db, "enrollments"),
        where("instructorName", "in", names),
      );

      const handleSnap = async (snap: any) => {
        const records = snap.docs
          .map((d: any) => {
            const raw: any = d.data();
            const uid = raw.user_uid || raw.userId || raw.uid;
            const courseId = raw.course_id || raw.courseId;
            return {
              id: d.id,
              ...raw,
              user_uid: uid,
              course_id: courseId,
            };
          })
          .filter((r: any) => !!r.user_uid);

        const byUser: Record<string, any> = {};
        for (const rec of records) {
          byUser[rec.user_uid] = rec;
        }

        // Renderizar imediatamente com dados básicos
        const userIds = Object.keys(byUser);
        const basicProfiles = userIds.map((uid) => {
          const enr = byUser[uid];
          const course = enr?.course_title || "Curso";
          const lastDate = enr?.enrolledAt?.toDate
            ? enr.enrolledAt.toDate()
            : enr?.createdAt?.toDate
              ? enr.createdAt.toDate()
              : null;
          const lastActivity = lastDate
            ? new Intl.DateTimeFormat("pt-PT", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(lastDate)
            : "";
          return {
            id: uid,
            name: "Formando",
            email: "",
            avatar: "https://i.pravatar.cc/150?u=" + uid,
            course,
            progress: 0,
            lastActivity,
            engagement: "normal" as const,
            status: "active" as const,
          } as Student;
        });
        setStudents(basicProfiles);

        // Carregar perfis em background (máximo 10 por vez)
        const loadProfilesInBatches = async () => {
          const profileMap = new Map<string, any>();

          for (let i = 0; i < userIds.length; i += 10) {
            const batch = userIds.slice(i, i + 10);
            const profiles = await Promise.all(
              batch.map(async (uid) => {
                try {
                  const ps = await getDoc(doc(db, "profiles", uid));
                  if (ps.exists()) {
                    const pd: any = ps.data();
                    return {
                      uid,
                      name: pd?.full_name || "Formando",
                      email: pd?.email || "",
                      avatar:
                        pd?.avatar_url || "https://i.pravatar.cc/150?u=" + uid,
                    };
                  }
                } catch {}
                return {
                  uid,
                  name: "Formando",
                  email: "",
                  avatar: "https://i.pravatar.cc/150?u=" + uid,
                };
              }),
            );

            profiles.forEach((p) => profileMap.set(p.uid, p));

            // Atualizar UI com profiles carregados até agora
            setStudents((prev) =>
              prev.map((student) => {
                const profile = profileMap.get(student.id);
                return profile
                  ? {
                      ...student,
                      name: profile.name,
                      email: profile.email,
                      avatar: profile.avatar,
                    }
                  : student;
              }),
            );
          }
        };

        // Carregar em background sem bloquear
        loadProfilesInBatches().catch((err) =>
          console.error("Erro ao carregar perfis:", err),
        );
      };

      const u1 = onSnapshot(qA, handleSnap);
      const u2 = onSnapshot(qB, handleSnap);
      fallbackEnrollUnsubs.push(u1);
      fallbackEnrollUnsubs.push(u2);
    };

    const primaryUnsub = onSnapshot(
      query(collection(db, "courses"), where("instructor_uid", "==", user.uid)),
      (snap) => {
        if (snap.empty) {
          // Fallback 1: cursos onde o usuário é criador
          if (fallbackUnsub) {
            fallbackUnsub();
            fallbackUnsub = null;
          }
          fallbackUnsub = onSnapshot(
            query(
              collection(db, "courses"),
              where("creator_uid", "==", user.uid),
            ),
            (snap2) => {
              if (snap2.empty) {
                // Fallback 2: cursos por nome do instrutor (para dados antigos)
                const possibleNames = Array.from(
                  new Set([(user.displayName || "").trim()].filter(Boolean)),
                );
                if (fallbackNameUnsub) {
                  fallbackNameUnsub();
                  fallbackNameUnsub = null;
                }
                if (possibleNames.length > 0) {
                  fallbackNameUnsub = onSnapshot(
                    query(
                      collection(db, "courses"),
                      where("instructor", "in", possibleNames),
                    ),
                    (snap3) => {
                      if (snap3.empty) {
                        // Sem cursos vinculados; tenta diretamente pelas inscrições do instrutor (legado)
                        subscribeEnrollmentsByInstructorNames(possibleNames);
                      } else {
                        subscribeEnrollments(snap3.docs);
                      }
                    },
                  );
                } else {
                  // Último fallback: tentar diretamente pelas inscrições
                  if (possibleNames.length > 0)
                    subscribeEnrollmentsByInstructorNames(possibleNames);
                  else subscribeEnrollments([]);
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
      enrollUnsubs.forEach((fn) => fn());
      primaryUnsub();
      if (fallbackUnsub) fallbackUnsub();
      if (fallbackNameUnsub) fallbackNameUnsub();
      fallbackEnrollUnsubs.forEach((fn) => fn());
      if (subsUnsub) subsUnsub();
    };
  }, [user?.uid]);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse =
      filterCourse === "Todos os Cursos" || s.course.includes(filterCourse);
    const matchesStatus =
      filterStatus === "Qualquer Status" ||
      (filterStatus === "Ativos" && s.status === "active") ||
      (filterStatus === "Bloqueados" && s.status === "blocked");

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const toggleStudentStatus = (id: string) => {
    setStudents(
      students.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "active" ? "blocked" : "active" }
          : s,
      ),
    );
    if (selectedStudent?.id === id) {
      setSelectedStudent((prev) =>
        prev
          ? { ...prev, status: prev.status === "active" ? "blocked" : "active" }
          : null,
      );
    }
  };

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Meus Formandos
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie inscritos, acompanhe o progresso e interaja diretamente.
            </p>
          </div>
          <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-brand-light/50 text-brand-green rounded-xl flex items-center justify-center">
              <UserCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Total Ativos
              </p>
              <p className="text-xl font-black text-slate-900 leading-none">
                {students.filter((s) => s.status === "active").length}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar - Redesigned with custom Selects */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou e-mail do formando..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              className="w-full sm:w-64"
              value={filterCourse}
              onValueChange={setFilterCourse}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-brand-green" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectPopover>
                <SelectListBox>
                  <SelectItem value="Todos os Cursos">
                    Todos os Cursos
                  </SelectItem>
                  {Array.from(new Set(students.map((s) => s.course))).map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ),
                  )}
                </SelectListBox>
              </SelectPopover>
            </Select>

            <Select
              className="w-full sm:w-48"
              value={filterStatus}
              onValueChange={setFilterStatus}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-green" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectPopover>
                <SelectListBox>
                  <SelectItem value="Qualquer Status">
                    Qualquer Status
                  </SelectItem>
                  <SelectItem value="Ativos">Ativos</SelectItem>
                  <SelectItem value="Bloqueados">Bloqueados</SelectItem>
                </SelectListBox>
              </SelectPopover>
            </Select>
          </div>
        </div>

        {/* Students Table List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Estudante
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Curso & Progresso
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Engajamento
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/30 transition-colors group"
                  >
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={student.avatar}
                            className="w-11 h-11 rounded-xl border-2 border-white shadow-sm"
                            alt={student.name}
                          />
                          <div
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${student.status === "active" ? "bg-emerald-500" : "bg-red-500"}`}
                          ></div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="max-w-[220px]">
                        <p className="text-xs font-black text-slate-700 truncate mb-2 uppercase tracking-tight">
                          {student.course}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-700 ${student.progress === 100 ? "bg-emerald-500" : "bg-brand-green"}`}
                              style={{ width: `${student.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-black text-slate-900">
                            {student.progress}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase w-fit border ${
                            student.engagement === "dedicated"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : student.engagement === "at_risk"
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-blue-50 text-blue-600 border-blue-100"
                          }`}
                        >
                          <Activity size={10} />
                          {student.engagement === "dedicated"
                            ? "Dedicado"
                            : student.engagement === "at_risk"
                              ? "Em Risco"
                              : "Normal"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          Visto: {student.lastActivity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="p-3 text-slate-400 hover:text-brand-green bg-white hover:bg-brand-green/5 border border-transparent hover:border-brand-green/10 rounded-xl transition-all shadow-sm"
                          title="Ver Histórico Completo"
                        >
                          <History size={18} />
                        </button>
                        <button
                          onClick={() => setActiveChat(student)}
                          className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 bg-white border border-transparent hover:border-blue-100 rounded-xl transition-all shadow-sm"
                          title="Chat Direto"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button
                          onClick={() => toggleStudentStatus(student.id)}
                          className={`p-3 rounded-xl transition-all shadow-sm border ${
                            student.status === "blocked"
                              ? "text-emerald-500 bg-emerald-50 border-emerald-100"
                              : "text-slate-400 bg-white hover:text-red-500 hover:bg-red-50 hover:border-red-100 border-transparent"
                          }`}
                          title={
                            student.status === "blocked"
                              ? "Desbloquear Formando"
                              : "Bloquear Formando"
                          }
                        >
                          {student.status === "blocked" ? (
                            <CheckCircle size={18} />
                          ) : (
                            <Ban size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Mostrando {filteredStudents.length} de {students.length} inscritos
            </p>
            <div className="flex gap-2">
              <button className="px-6 h-10 text-xs font-black uppercase text-slate-300 bg-white border border-slate-200 rounded-xl cursor-not-allowed">
                Anterior
              </button>
              <button className="px-6 h-10 text-xs font-black uppercase text-brand-green bg-white border border-brand-green/20 rounded-xl hover:bg-brand-green hover:text-white transition-all shadow-sm">
                Próximo
              </button>
            </div>
          </div>
        </div>

        {/* Student Detail Modal (Remains mostly same but with visual tweaks) */}
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedStudent.avatar}
                    className="w-14 h-14 rounded-2xl border-2 border-white shadow-md"
                  />
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">
                      {selectedStudent.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">
                      {selectedStudent.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2.5 text-slate-400 hover:text-slate-900 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:rotate-90"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Clock size={14} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Tempo Acadêmico
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                      14h 25m
                    </p>
                  </div>
                  <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <TrendingUp size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Fator Evolução
                      </span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">+12%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest border-l-4 border-brand-green pl-3">
                    Linha do Tempo
                  </h4>
                  <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    <HistoryItem
                      title="Concluiu: Tipografia Avançada"
                      date="Hoje, 10:45"
                    />
                    <HistoryItem
                      title="Iniciou Módulo de UI Design"
                      date="Ontem, 16:20"
                    />
                    <HistoryItem
                      title="Quiz: Avaliação Teórica (9.5)"
                      date="22 Out, 14:00"
                      highlight
                    />
                    <HistoryItem
                      title="Upload de Projeto: Branding"
                      date="20 Out, 11:30"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-50 bg-slate-50/30">
                <button
                  onClick={() => {
                    setActiveChat(selectedStudent);
                    setSelectedStudent(null);
                  }}
                  className="w-full bg-brand-green text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl hover:bg-brand-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-900/10 active:scale-95"
                >
                  <MessageSquare size={18} /> Iniciar Diálogo Direto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Chat UI */}
        {activeChat && (
          <div className="fixed bottom-0 right-0 md:right-8 z-[110] w-full md:w-[400px] bg-white border border-slate-200 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom duration-500">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between rounded-t-[32px]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={activeChat.avatar}
                    className="w-10 h-10 rounded-2xl border-2 border-slate-800"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-black leading-tight uppercase tracking-tight">
                    {activeChat.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Formando Verificado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveChat(null)}
                className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="h-[380px] overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
              <div className="flex justify-center mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase bg-white border border-slate-200 px-4 py-1 rounded-full">
                  Histórico da Aula
                </span>
              </div>
              <ChatMessage
                text="Professor, a aula de Auto-Layout está incrível! Mas tenho uma dúvida sobre as constraints."
                isMine={false}
                time="10:30"
              />
              <ChatMessage
                text="Oi! Que bom que gostou. Pode mandar sua dúvida, estou aqui para ajudar."
                isMine={true}
                time="10:35"
              />
              <ChatMessage
                text="Como faço para manter o padding fixo no mobile sem quebrar o componente?"
                isMine={false}
                time="10:36"
              />
            </div>

            <div className="p-6 bg-white border-t border-slate-100">
              <form
                className="flex items-center gap-3"
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="text"
                  placeholder="Sua resposta aqui..."
                  className="flex-1 h-12 bg-slate-100 border-transparent focus:bg-white focus:border-brand-green border-2 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none transition-all"
                />
                <button className="w-12 h-12 bg-brand-green text-white rounded-2xl flex items-center justify-center hover:bg-brand-dark shadow-lg shadow-green-900/10 active:scale-90 transition-all">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </InstructorLayout>
  );
};

// --- Custom Internal Components ---

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
      className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all shadow-sm"
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-brand-green" : ""}`}
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
    <div className="absolute top-full mt-2 left-0 z-[100] w-full min-w-[12rem] overflow-hidden rounded-2xl border border-slate-100 bg-white text-slate-950 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      {children}
    </div>
  );
};

const SelectListBox = ({ children }: any) => {
  return <div className="p-1.5">{children}</div>;
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
      className={`relative flex w-full cursor-default select-none items-center rounded-xl py-3.5 pl-4 pr-10 text-xs font-bold outline-none transition-all ${
        isSelected
          ? "bg-brand-green text-white"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span className="truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-3 flex h-4 w-4 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
};

const HistoryItem = ({ title, date, highlight }: any) => (
  <div className="relative pl-7">
    <div
      className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${highlight ? "bg-brand-accent" : "bg-slate-200"}`}
    ></div>
    <div className="flex flex-col">
      <span
        className={`text-xs font-black uppercase tracking-tight ${highlight ? "text-brand-dark" : "text-slate-700"}`}
      >
        {title}
      </span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {date}
      </span>
    </div>
  </div>
);

const ChatMessage = ({ text, isMine, time }: any) => (
  <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
    <div
      className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold leading-relaxed ${
        isMine
          ? "bg-brand-green text-white rounded-tr-none shadow-lg shadow-green-900/10"
          : "bg-white text-slate-700 border border-slate-100 shadow-sm rounded-tl-none"
      }`}
    >
      {text}
    </div>
    <span className="text-[9px] font-black text-slate-400 mt-2 px-2 uppercase tracking-widest">
      {time}
    </span>
  </div>
);

export default MyStudentsPage;
