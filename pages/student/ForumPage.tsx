import {
    addDoc,
    collection,
    onSnapshot,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import {
    Filter,
    MessageCircle,
    MessageSquare,
    MoreHorizontal,
    Plus,
    Reply,
    Search,
    ThumbsUp,
    TrendingUp,
    X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import StudentLayout from "../../layouts/StudentLayout";
import { db } from "../../services/firebase";

interface Topic {
  id: string;
  title: string;
  author: string;
  authorUid: string;
  avatar: string;
  category: "Técnico" | "Carreira" | "Projetos" | "Geral";
  snippet: string;
  replies: number;
  likes: number;
  date: string;
  createdAt: Date;
  content: string;
}

interface Reply {
  id: string;
  author: string;
  authorUid: string;
  avatar: string;
  content: string;
  date: string;
  likes: number;
  createdAt: Date;
}

const CATEGORIES = ["Técnico", "Carreira", "Projetos", "Geral"];

const CommunityPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [newTopic, setNewTopic] = useState({
    title: "",
    category: "Técnico",
    content: "",
  });
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setTopics([]);
      setEnrolledIds([]);
      return;
    }
    let enrollUnsubA: (() => void) | null = null;
    let enrollUnsubB: (() => void) | null = null;
    let qUnsubs: Array<() => void> = [];

    const recompute = (docs: Array<{ id: string; data: any }>) => {
      // Map docs to Topic UI
      const rtf = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
      const toFromNow = (d?: Date | null) => {
        if (!d) return "";
        const diffH = Math.round((d.getTime() - Date.now()) / 3600000);
        return rtf.format(diffH, "hour");
      };
      const mapped: Topic[] = docs.map(({ id, data }) => {
        const created: Date | null = data?.createdAt?.toDate
          ? data.createdAt.toDate()
          : data?.updatedAt?.toDate
            ? data.updatedAt.toDate()
            : null;
        return {
          id,
          title: data?.title || "Tópico",
          author:
            data?.user_name ||
            data?.author ||
            profile?.full_name ||
            user?.displayName ||
            "Utilizador",
          avatar: data?.avatar || "https://i.pravatar.cc/150?img=11",
          category: (data?.category || "Geral") as any,
          snippet:
            (data?.content || data?.body || "").toString().slice(0, 120) +
            "...",
          replies: data?.repliesCount || 0,
          likes: data?.likes || data?.reactions || 0,
          date: toFromNow(created),
        };
      });
      // Sort by created desc if possible
      mapped.sort((a, b) => b.date.localeCompare(a.date));
      setTopics(mapped);
    };

    const subscribeQuestions = (courseIds: string[]) => {
      qUnsubs.forEach((u) => u());
      qUnsubs = [];
      const collected: Array<{ id: string; data: any }> = [];
      const pushAndSet = () => recompute(collected);
      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);
      chunks.forEach((ids) => {
        if (ids.length === 0) return;
        const qQ = query(
          collection(db, "questions"),
          where("course_id", "in", ids),
        );
        const u = onSnapshot(qQ, (snap) => {
          // refresh collected for these ids
          const setIds = new Set(ids);
          for (let i = collected.length - 1; i >= 0; i--) {
            const cid =
              collected[i].data?.course_id || collected[i].data?.courseId;
            if (setIds.has(cid)) collected.splice(i, 1);
          }
          snap.docs.forEach((d) =>
            collected.push({ id: d.id, data: d.data() }),
          );
          pushAndSet();
        });
        qUnsubs.push(u);
      });
      // Include general topics (no course_id)
      const qG = query(
        collection(db, "questions"),
        where("course_id", "==", null as any),
      );
      const ug = onSnapshot(qG, (snap) => {
        for (let i = collected.length - 1; i >= 0; i--) {
          if (collected[i].data?.course_id == null) collected.splice(i, 1);
        }
        snap.docs.forEach((d) => collected.push({ id: d.id, data: d.data() }));
        pushAndSet();
      });
      qUnsubs.push(ug);
    };

    const handleEnroll = (snap: any) => {
      const ids = new Set<string>();
      snap.docs.forEach((d: any) => {
        const data: any = d.data();
        const cid = data?.course_id || data?.courseId;
        if (cid) ids.add(cid);
      });
      const arr = Array.from(ids);
      setEnrolledIds(arr);
      subscribeQuestions(arr);
    };

    enrollUnsubA = onSnapshot(
      query(collection(db, "enrollments"), where("user_uid", "==", user.uid)),
      handleEnroll,
    );
    enrollUnsubB = onSnapshot(
      query(collection(db, "enrollments"), where("userId", "==", user.uid)),
      handleEnroll,
    );

    return () => {
      if (enrollUnsubA) enrollUnsubA();
      if (enrollUnsubB) enrollUnsubB();
      qUnsubs.forEach((u) => u());
    };
  }, [user?.uid]);

  const filteredTopics = useMemo(
    () =>
      topics.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [topics, searchQuery],
  );

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    (async () => {
      try {
        const courseId = enrolledIds[0] || null;
        await addDoc(collection(db, "questions"), {
          title: newTopic.title.trim(),
          content: newTopic.content.trim(),
          category: newTopic.category,
          course_id: courseId,
          user_uid: user.uid,
          user_name: profile?.full_name || "Formando",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          repliesCount: 0,
        });
        setIsModalOpen(false);
        setNewTopic({ title: "", category: "Técnico", content: "" });
      } catch (err) {
        console.error("Falha ao criar tópico", err);
        alert("Não foi possível publicar o tópico.");
      }
    })();
  };

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-brand-green" />
              Fórum da Comunidade
            </h1>
            <p className="text-gray-500 mt-1">
              Troque conhecimento com outros estudantes.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-brand-green hover:bg-brand-dark text-white font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-green-900/10"
          >
            <Plus className="w-5 h-5" />
            Novo Tópico
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Left: Filters/Categories */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                Filtrar por Categoria
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSearchQuery("")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <span className="text-gray-600 group-hover:text-brand-green">
                    Todas
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {filteredTopics.length}
                  </span>
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSearchQuery(cat)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-gray-600 group-hover:text-brand-green">
                      {cat}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {
                        filteredTopics.filter(
                          (t) => t.category === (cat as any),
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-brand-dark to-brand-green p-6 rounded-xl text-white shadow-xl">
              <TrendingUp className="w-8 h-8 text-brand-accent mb-4" />
              <h3 className="font-bold text-lg mb-2">Desafio da Semana</h3>
              <p className="text-sm text-brand-light/80 mb-4 leading-relaxed">
                Compartilhe um bug que você resolveu hoje e como fez isso!
              </p>
              <button className="text-xs font-bold bg-white text-brand-green px-4 py-2 rounded-lg hover:bg-brand-accent hover:text-brand-dark transition-colors">
                Participar agora
              </button>
            </div>
          </div>

          {/* Main: Topics List */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Pesquisar discussões..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-green/10 transition-all text-gray-700"
              />
            </div>

            {/* Topics List */}
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:border-brand-green/30 transition-all group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                          topic.category === "Técnico"
                            ? "bg-blue-50 text-blue-600"
                            : topic.category === "Projetos"
                              ? "bg-purple-50 text-purple-600"
                              : topic.category === "Carreira"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {topic.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {topic.date}
                      </span>
                    </div>
                    <button className="text-gray-300 hover:text-gray-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-green transition-colors leading-tight">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-5 line-clamp-2">
                    {topic.snippet}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={topic.avatar}
                        className="w-8 h-8 rounded-full border border-gray-100"
                        alt={topic.author}
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        {topic.author}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-gray-400">
                      <div className="flex items-center gap-1.5 hover:text-brand-green transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">
                          {topic.replies}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 hover:text-brand-accent transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs font-bold">{topic.likes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">
                  Nenhum tópico encontrado
                </h3>
                <p className="text-gray-500 text-sm">
                  Ajuste seu filtro ou seja o primeiro a postar!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal: New Topic */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-lg">
                  Criar Nova Discussão
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateTopic} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Título do Tópico
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sobre o que você quer falar?"
                    value={newTopic.title}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, title: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={newTopic.category}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, category: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Conteúdo
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Descreva detalhadamente sua dúvida ou comentário..."
                    value={newTopic.content}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, content: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none resize-none"
                  ></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg shadow-green-900/20 transition-all"
                  >
                    Publicar Tópico
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default ForumPage;
