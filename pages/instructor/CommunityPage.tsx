import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Filter,
  Heart,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Send,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { db } from "../../services/firebase";

interface Topic {
  id: string;
  title: string;
  author: string;
  authorUid: string;
  avatar: string;
  category: "Didática" | "Plataforma" | "Carreira" | "Geral";
  content: string;
  replies: number;
  likes: number;
  liked: boolean;
  date: string;
  createdAt: Date;
}

interface Reply {
  id: string;
  author: string;
  authorUid: string;
  avatar: string;
  content: string;
  date: string;
  likes: number;
  liked: boolean;
  createdAt: Date;
}

const CATEGORIES = ["Didática", "Plataforma", "Carreira", "Geral"];

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

const CommunityPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: "",
    category: "Geral",
    content: "",
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isAddingReply, setIsAddingReply] = useState(false);

  // Função para buscar nome real do usuário a partir do uid
  const fetchUserName = async (uid: string): Promise<string> => {
    if (!uid) return "Tutor";
    try {
      const userRef = doc(db, "profiles", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data().full_name || "Tutor";
      }
      return "Tutor";
    } catch (error) {
      console.error("Erro ao buscar nome do usuário:", error);
      return "Tutor";
    }
  };

  // Carregar tópicos da comunidade de instrutores
  useEffect(() => {
    if (!user?.uid) {
      setTopics([]);
      return;
    }

    try {
      const q = query(collection(db, "instructor-community-topics"));
      const unsub = onSnapshot(q, async (snap) => {
        const rtf = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
        const toFromNow = (d?: Date | null) => {
          if (!d) return "agora";
          const diffH = Math.round((d.getTime() - Date.now()) / 3600000);
          return rtf.format(diffH, "hour");
        };

        const topicsDataPromises = snap.docs.map(async (doc) => {
          const data = doc.data();
          const createdAt = data?.createdAt?.toDate?.() || new Date();
          // Buscar nome real do autor a partir do uid
          const uid = data?.user_uid || data?.authorUid || "";
          const authorName = await fetchUserName(uid);
          return {
            id: doc.id,
            title: data?.title || "Tópico",
            author: data?.user_name || data?.author || authorName || "Tutor",
            authorUid: uid,
            avatar:
              data?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || "I")}&background=0e7038&color=fff`,
            category: data?.category || "Geral",
            content: data?.content || "",
            replies: data?.replies_count || 0,
            likes: data?.likes || 0,
            liked: data?.likedBy?.includes(user.uid) || false,
            date: toFromNow(createdAt),
            createdAt,
          };
        });

        const topicsList = await Promise.all(topicsDataPromises);
        topicsList.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        setTopics(topicsList);
      });

      return () => unsub();
    } catch (err) {
      console.error("Erro ao carregar tópicos:", err);
    }
  }, [user?.uid]);

  // Carregar respostas quando selecionar um tópico
  useEffect(() => {
    if (!selectedTopic) {
      setReplies([]);
      return;
    }

    setLoadingReplies(true);
    try {
      const q = query(
        collection(db, "instructor-community-replies"),
        where("topic_id", "==", selectedTopic.id),
      );
      const unsub = onSnapshot(q, async (snap) => {
        const rtf = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
        const toFromNow = (d?: Date | null) => {
          if (!d) return "agora";
          const diffH = Math.round((d.getTime() - Date.now()) / 3600000);
          return rtf.format(diffH, "hour");
        };

        const repliesDataPromises = snap.docs.map(async (doc) => {
          const data = doc.data();
          const createdAt = data?.createdAt?.toDate?.() || new Date();
          // Buscar nome real do autor a partir do uid
          const uid = data?.user_uid || data?.authorUid || "";
          const authorName = await fetchUserName(uid);
          return {
            id: doc.id,
            author: data?.user_name || data?.author || authorName || "Tutor",
            authorUid: uid,
            avatar:
              data?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || "I")}&background=0e7038&color=fff`,
            content: data?.content || "",
            date: toFromNow(createdAt),
            likes: data?.likes || 0,
            liked: data?.likedBy?.includes(user?.uid || "") || false,
            createdAt,
          };
        });

        const repliesList = await Promise.all(repliesDataPromises);
        repliesList.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
        setReplies(repliesList);
        setLoadingReplies(false);
      });

      return () => unsub();
    } catch (err) {
      console.error("Erro ao carregar respostas:", err);
      setLoadingReplies(false);
    }
  }, [selectedTopic, user?.uid]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const filteredTopics = useMemo(
    () =>
      topics.filter((t) => {
        const matchesSearch =
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === "Todas" || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [topics, searchQuery, selectedCategory],
  );

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !newTopic.title.trim() || !newTopic.content.trim()) {
      showToast("Preencha todos os campos!", "error");
      return;
    }

    setIsCreatingTopic(true);
    try {
      const name = profile?.full_name || user.displayName || "Tutor";
      await addDoc(collection(db, "instructor-community-topics"), {
        title: newTopic.title.trim(),
        content: newTopic.content.trim(),
        category: newTopic.category,
        user_uid: user.uid,
        authorUid: user.uid,
        user_name: name,
        author: name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0e7038&color=fff`,
        createdAt: serverTimestamp(),
        replies_count: 0,
        likes: 0,
        likedBy: [],
      });

      setIsCreateModalOpen(false);
      setNewTopic({ title: "", category: "Geral", content: "" });
      showToast("✓ Tópico publicado na comunidade!", "success");
    } catch (err) {
      console.error("Falha ao criar tópico:", err);
      showToast("Erro ao publicar o tópico.", "error");
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedTopic || !newReply.trim()) {
      showToast("Escreva uma mensagem!", "error");
      return;
    }

    setIsAddingReply(true);
    try {
      const name = profile?.full_name || user.displayName || "Tutor";
      await addDoc(collection(db, "instructor-community-replies"), {
        topic_id: selectedTopic.id,
        content: newReply.trim(),
        user_uid: user.uid,
        authorUid: user.uid,
        user_name: name,
        author: name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0e7038&color=fff`,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      });

      const topicRef = doc(db, "instructor-community-topics", selectedTopic.id);
      await updateDoc(topicRef, {
        replies_count: (selectedTopic.replies || 0) + 1,
      });

      setNewReply("");
      showToast("✓ Mensagem enviada!", "success");
    } catch (err) {
      console.error("Erro ao adicionar resposta:", err);
      showToast("Erro ao enviar a mensagem.", "error");
    } finally {
      setIsAddingReply(false);
    }
  };

  const handleLikeTopic = async (topic: Topic) => {
    if (!user?.uid) return;
    try {
      const topicRef = doc(db, "instructor-community-topics", topic.id);
      const newLiked = !topic.liked;
      const newLikes = newLiked
        ? (topic.likes || 0) + 1
        : Math.max(0, (topic.likes || 0) - 1);
      const likedBy = newLiked
        ? [...((topic as any).likedBy || []), user.uid]
        : (topic as any).likedBy?.filter((uid: string) => uid !== user.uid) ||
          [];

      await updateDoc(topicRef, {
        likes: newLikes,
        likedBy,
      });
    } catch (err) {
      console.error("Erro ao curtir tópico:", err);
    }
  };

  const handleLikeReply = async (reply: Reply) => {
    if (!user?.uid) return;
    try {
      const replyRef = doc(db, "instructor-community-replies", reply.id);
      const newLiked = !reply.liked;
      const newLikes = newLiked
        ? (reply.likes || 0) + 1
        : Math.max(0, (reply.likes || 0) - 1);
      const likedBy = newLiked
        ? [...((reply as any).likedBy || []), user.uid]
        : (reply as any).likedBy?.filter((uid: string) => uid !== user.uid) ||
          [];

      await updateDoc(replyRef, {
        likes: newLikes,
        likedBy,
      });
    } catch (err) {
      console.error("Erro ao curtir resposta:", err);
    }
  };

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-brand-green" />
              Comunidade de Tutores
            </h1>
            <p className="text-slate-500 mt-2">
              Espaço exclusivo para trocar experiências didáticas, discutir a
              plataforma e colaborar com outros Tutores.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-brand-green hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-900/20"
          >
            <Plus className="w-5 h-5" />
            Novo Tópico
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar: Filtros */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                Filtrar Discussão
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory("Todas")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    selectedCategory === "Todas"
                      ? "bg-brand-green text-white"
                      : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  Todas ({topics.length})
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all flex justify-between items-center ${
                      selectedCategory === cat
                        ? "bg-brand-green text-white"
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${selectedCategory === cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      {topics.filter((t) => t.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-brand-green/20 rounded-full blur-2xl"></div>
              <TrendingUp className="w-8 h-8 text-brand-green mb-3 relative z-10" />
              <h3 className="font-bold text-lg mb-2 relative z-10">
                Dica Tutor
              </h3>
              <p className="text-sm text-slate-400 mb-4 relative z-10">
                Tutores que colaboram na comunidade tendem a ter cursos com 40%
                mais satisfação.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs font-bold bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-all w-full relative z-10"
              >
                Iniciar Discussão
              </button>
            </div>
          </div>

          {/* Main: Topics */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Pesquisar por tema, autor ou conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-green/10 focus:border-brand-green transition-all"
              />
            </div>

            {/* Topics List */}
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setIsDetailModalOpen(true);
                  }}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-green/20 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded shadow-sm uppercase tracking-widest ${
                        topic.category === "Didática"
                          ? "bg-blue-50 text-blue-600"
                          : topic.category === "Plataforma"
                            ? "bg-emerald-50 text-emerald-600"
                            : topic.category === "Carreira"
                              ? "bg-orange-50 text-orange-600"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {topic.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {topic.date}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-brand-green transition-colors">
                    {topic.title}
                  </h3>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {topic.content}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={topic.avatar}
                        className="w-8 h-8 rounded-full border-2 border-slate-50 shadow-sm"
                        alt={topic.author}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">
                          {topic.author}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <MessageCircle className="w-4 h-4" />
                        <span>{topic.replies}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeTopic(topic);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          topic.liked
                            ? "bg-brand-green/10 text-brand-green"
                            : "hover:bg-slate-50 text-slate-400"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${topic.liked ? "fill-current" : ""}`}
                        />
                        <span>{topic.likes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-900 font-bold">
                  Nenhuma discussão encontrada
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Inicie um tema e colabore com seus colegas.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden scale-in-center">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="font-bold text-xl text-slate-900">
                    Nova Discussão Tutor
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Compartilhe sua visão com outros tutores
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateTopic} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Título do Tema
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Como melhorar o engajamento em aulas de TI?"
                    value={newTopic.title}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, title: e.target.value })
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green outline-none transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Categoria
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setNewTopic({ ...newTopic, category: cat })
                        }
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          newTopic.category === cat
                            ? "bg-brand-green border-brand-green text-white shadow-lg shadow-green-900/20"
                            : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Descrição Detalhada
                  </label>
                  <textarea
                    required
                    placeholder="Desenvolva sua ideia ou dúvida aqui..."
                    value={newTopic.content}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, content: e.target.value })
                    }
                    rows={5}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green outline-none transition-all resize-none font-medium"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreatingTopic}
                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTopic}
                    className="flex-1 py-4 bg-brand-green text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-green-900/20 disabled:opacity-50"
                  >
                    {isCreatingTopic ? "Publicando..." : "Publicar agora"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal - Chat Style */}
        {isDetailModalOpen && selectedTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] scale-in-center">
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest inline-block ${
                      selectedTopic.category === "Didática"
                        ? "bg-blue-50 text-blue-600"
                        : selectedTopic.category === "Plataforma"
                          ? "bg-emerald-50 text-emerald-600"
                          : selectedTopic.category === "Carreira"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {selectedTopic.category}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2 truncate">
                    {selectedTopic.title}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedTopic(null);
                    setReplies([]);
                    setNewReply("");
                  }}
                  className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-all ml-4"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Topic Content */}
              <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50">
                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedTopic.content}
                </p>

                <div className="flex items-center gap-4 pt-6 mt-6 border-t border-slate-100">
                  <img
                    src={selectedTopic.avatar}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    alt={selectedTopic.author}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedTopic.author}
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      {selectedTopic.date}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLikeTopic(selectedTopic)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 font-bold text-sm ${
                      selectedTopic.liked
                        ? "bg-brand-green/10 text-brand-green"
                        : "bg-white text-slate-400 hover:text-brand-green"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${selectedTopic.liked ? "fill-current" : ""}`}
                    />
                    <span>{selectedTopic.likes}</span>
                  </button>
                </div>
              </div>

              {/* Replies - Message list */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-white">
                {loadingReplies ? (
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-green border-t-transparent"></div>
                  </div>
                ) : replies.length > 0 ? (
                  replies.map((reply) => (
                    <div key={reply.id} className="flex gap-4 group">
                      <img
                        src={reply.avatar}
                        className="w-10 h-10 rounded-full border-2 border-slate-50 shadow-sm flex-shrink-0"
                        alt={reply.author}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100/50">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-bold text-slate-900 text-sm">
                              {reply.author}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              {reply.date}
                            </p>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed break-words font-medium">
                            {reply.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-2 px-1">
                          <button
                            onClick={() => handleLikeReply(reply)}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase transition-all ${
                              reply.liked
                                ? "text-brand-green"
                                : "text-slate-400 hover:text-brand-green"
                            }`}
                          >
                            <Heart
                              className={`w-3 h-3 ${reply.liked ? "fill-current" : ""}`}
                            />
                            <span>{reply.likes} Curtidas</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold">
                      Nenhuma resposta ainda
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">
                      Seja o primeiro tutor a comentar
                    </p>
                  </div>
                )}
              </div>

              {/* Reply Input */}
              <form
                onSubmit={handleAddReply}
                className="px-8 py-6 border-t border-slate-50 bg-white sticky bottom-0"
              >
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Escreva sua contribuição..."
                    className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green outline-none text-sm font-medium transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isAddingReply || !newReply.trim()}
                    className="flex items-center justify-center w-14 h-14 bg-brand-green text-white rounded-2xl hover:bg-brand-dark transition-all disabled:opacity-50 shadow-lg shadow-green-900/20 active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <div className="fixed bottom-8 right-8 z-50 space-y-3 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-white text-sm transition-all duration-300 transform animate-in slide-in-from-right-full ${
                toast.type === "success"
                  ? "bg-brand-green shadow-green-900/40"
                  : "bg-red-500 shadow-red-900/40"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </InstructorLayout>
  );
};

export default CommunityPage;
