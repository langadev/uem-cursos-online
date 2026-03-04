import {
    addDoc,
    collection,
    doc,
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    BookOpen,
    Clock,
    MessageCircle,
    Search,
    Send,
    User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { db } from "../../services/firebase";

const QuestionsPage: React.FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setQuestions([]);
      return;
    }
    const qRef = query(
      collection(db, "questions"),
      where("instructor_uid", "==", user.uid),
    );
    const unsub = onSnapshot(qRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => {
        const ad = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bd = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bd - ad;
      });
      setQuestions(list);
      if (!activeQuestion && list.length) setActiveQuestion(list[0]);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!activeQuestion?.id) {
      setAnswers([]);
      return;
    }
    try {
      const q = query(
        collection(db, "questions", activeQuestion.id, "answers"),
        orderBy("createdAt", "asc"),
      );
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAnswers(list);
      });
      return () => unsub();
    } catch {}
  }, [activeQuestion?.id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !activeQuestion?.id || !user?.uid) return;
    try {
      await addDoc(collection(db, "questions", activeQuestion.id, "answers"), {
        text: reply.trim(),
        author_uid: user.uid,
        author_role: "instructor",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "questions", activeQuestion.id), {
        status: "answered",
        repliesCount: increment(1),
        lastReplyAt: serverTimestamp(),
      });
      setReply("");
    } catch {}
  };

  const filtered = questions.filter((q) =>
    (q.text || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Dúvidas dos Formandos
          </h1>
          <p className="text-slate-500 mt-1">
            Interaja e ajude seus formandos a superarem os desafios do curso.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Questions List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar dúvida..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-green/10 transition-all"
              />
            </div>

            <div className="space-y-3">
              {filtered.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestion(q)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    activeQuestion?.id === q.id
                      ? "bg-brand-green text-white border-brand-green shadow-lg shadow-green-900/20"
                      : "bg-white border-gray-100 hover:border-gray-200 text-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        activeQuestion?.id === q.id
                          ? "bg-white/20 text-white"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      {q.status === "pending" ? "Pendente" : "Respondida"}
                    </span>
                    <span
                      className={`text-[10px] ${activeQuestion?.id === q.id ? "text-white/70" : "text-slate-400"}`}
                    >
                      {q.createdAt?.toDate
                        ? q.createdAt.toDate().toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm truncate">{q.text}</h4>
                  <p
                    className={`text-[10px] mt-1 ${activeQuestion?.id === q.id ? "text-white/60" : "text-slate-400"}`}
                  >
                    {q.user_name || "Formando"} • {q.course_title || ""}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Question Details / Reply Panel */}
          <div className="lg:col-span-2">
            {activeQuestion ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-gray-50 bg-slate-50/50">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm text-brand-green">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {activeQuestion.user_name || "Formando"}
                      </h3>
                      <p className="text-xs text-slate-400">Formando</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-brand-green" />{" "}
                      {activeQuestion.course_title || ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />{" "}
                      {activeQuestion.lesson_title || ""}
                    </div>
                  </div>
                </div>

                <div className="p-8 flex-1 space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative">
                    <div className="absolute -top-3 left-6 bg-white px-2 py-0.5 border border-slate-100 rounded text-[9px] font-black uppercase text-slate-400">
                      Pergunta
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {activeQuestion.text}
                    </p>
                  </div>

                  {answers.length > 0 && (
                    <div className="space-y-3">
                      {answers.map((a) => (
                        <div
                          key={a.id}
                          className="border border-gray-100 bg-white rounded-xl p-4"
                        >
                          <div className="text-xs text-slate-400 mb-1">
                            {a.author_role === "instructor"
                              ? "Instrutor"
                              : "Formando"}{" "}
                            •{" "}
                            {a.createdAt?.toDate
                              ? a.createdAt.toDate().toLocaleString()
                              : ""}
                          </div>
                          <div className="text-sm text-slate-700">{a.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendReply} className="space-y-4">
                    <label className="text-sm font-bold text-slate-800">
                      Sua Resposta
                    </label>
                    <textarea
                      rows={6}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Digite aqui sua explicação para o formando..."
                      className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-green/20 focus:bg-white transition-all resize-none"
                    ></textarea>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-400">
                        Respostas rápidas ajudam a manter a nota de instrutor
                        alta.
                      </p>
                      <button className="flex items-center gap-2 bg-brand-green text-white font-bold px-8 py-2.5 rounded-xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/10">
                        <Send size={16} /> Enviar Resposta
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="h-full bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-4">
                  <MessageCircle size={32} />
                </div>
                <h3 className="font-bold text-slate-900">
                  Nenhuma dúvida selecionada
                </h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  Selecione uma pergunta ao lado para ver os detalhes e
                  responder ao seu formando.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
};

export default QuestionsPage;
