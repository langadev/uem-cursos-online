import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
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

const CATEGORIES = ["Técnico", "Carreira", "Projetos", "Geral"];

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
    if (!uid) return "Utilizador";
    try {
      const userRef = doc(db, "profiles", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data().full_name || "Utilizador";
      }
      return "Utilizador";
    } catch (error) {
      console.error("Erro ao buscar nome do usuário:", error);
      return "Utilizador";
    }
  };

  // Carregar tópicos da comunidade
  useEffect(() => {
    if (!user?.uid) {
      setTopics([]);
      return;
    }

    try {
      const q = query(collection(db, "community-topics"));
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
            author:
              data?.user_name || data?.author || authorName || "Utilizador",
            authorUid: uid,
            avatar:
              data?.avatar ||
              `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
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
  }, [user?.uid, profile?.full_name]);

  // Carregar respostas quando selecionar um tópico
  useEffect(() => {
    if (!selectedTopic) {
      setReplies([]);
      return;
    }

    setLoadingReplies(true);
    try {
      const q = query(
        collection(db, "community-replies"),
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
            author:
              data?.user_name || data?.author || authorName || "Utilizador",
            authorUid: uid,
            avatar:
              data?.avatar ||
              `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
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
      const authorName = profile?.full_name || user.displayName || "Utilizador";
      await addDoc(collection(db, "community-topics"), {
        title: newTopic.title.trim(),
        content: newTopic.content.trim(),
        category: newTopic.category,
        user_uid: user.uid,
        authorUid: user.uid,
        user_name: authorName,
        author: authorName,
        avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
        createdAt: serverTimestamp(),
        replies_count: 0,
        likes: 0,
        likedBy: [],
      });

      setIsCreateModalOpen(false);
      setNewTopic({ title: "", category: "Geral", content: "" });
      showToast("✓ Tópico criado com sucesso!", "success");
    } catch (err) {
      console.error("Falha ao criar tópico:", err);
      showToast("Erro ao publicar o tópico. Tente novamente.", "error");
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedTopic || !newReply.trim()) {
      showToast("Escreva uma resposta!", "error");
      return;
    }

    setIsAddingReply(true);
    try {
      const authorName = profile?.full_name || user.displayName || "Utilizador";
      await addDoc(collection(db, "community-replies"), {
        topic_id: selectedTopic.id,
        content: newReply.trim(),
        user_uid: user.uid,
        authorUid: user.uid,
        user_name: authorName,
        author: authorName,
        avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      });

      const topicRef = doc(db, "community-topics", selectedTopic.id);
      await updateDoc(topicRef, {
        replies_count: (selectedTopic.replies || 0) + 1,
      });

      setNewReply("");
      showToast("✓ Resposta adicionada!", "success");
    } catch (err) {
      console.error("Erro ao adicionar resposta:", err);
      showToast("Erro ao enviar a resposta. Tente novamente.", "error");
    } finally {
      setIsAddingReply(false);
    }
  };

  const handleLikeTopic = async (topic: Topic) => {
    if (!user?.uid) return;
    try {
      const topicRef = doc(db, "community-topics", topic.id);
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
      showToast(newLiked ? "❤️ Gostou!" : "Deixou de gostar", "success");
    } catch (err) {
      console.error("Erro ao curtir tópico:", err);
      showToast("Erro ao curtir tópico", "error");
    }
  };

  const handleLikeReply = async (reply: Reply) => {
    if (!user?.uid || !selectedTopic) return;
    try {
      const replyRef = doc(db, "community-replies", reply.id);
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
      showToast(newLiked ? "❤️ Gostou!" : "Deixou de gostar", "success");
    } catch (err) {
      console.error("Erro ao curtir resposta:", err);
      showToast("Erro ao curtir resposta", "error");
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-brand-green" />
              Comunidade dos Inscritos
            </h1>
            <p className="text-gray-500 mt-2">
              Compartilhe conhecimento, tire dúvidas e discuta com colegas sobre
              os cursos.
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
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                Categorias
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory("Todas")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === "Todas"
                      ? "bg-brand-green text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  Todas ({topics.length})
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                      selectedCategory === cat
                        ? "bg-brand-green text-white"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                      {topics.filter((t) => t.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-brand-dark to-brand-green p-6 rounded-2xl text-white shadow-xl">
              <TrendingUp className="w-8 h-8 text-brand-accent mb-3" />
              <h3 className="font-bold text-lg mb-2">Participe!</h3>
              <p className="text-sm text-white/80 mb-4">
                Faça perguntas, compartilhe suas experiências e ajude colegas!
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs font-bold bg-white text-brand-green px-4 py-2 rounded-lg hover:bg-brand-accent transition-all w-full"
              >
                Criar Tópico Agora
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
                placeholder="Pesquisar discussões..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
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
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-brand-green/30 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
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
                    <span className="text-xs text-gray-400">{topic.date}</span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-green transition-colors">
                    {topic.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {topic.content}
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={topic.avatar}
                        className="w-8 h-8 rounded-full border border-gray-100"
                        alt={topic.author}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {topic.author}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MessageCircle className="w-4 h-4" />
                        <span className="font-bold">{topic.replies}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeTopic(topic);
                        }}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                          topic.liked
                            ? "bg-red-50 text-red-600"
                            : "hover:bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${topic.liked ? "fill-current" : ""}`}
                        />
                        <span className="font-bold">{topic.likes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">
                  Nenhuma discussão encontrada
                </p>
                <p className="text-gray-500 text-sm">
                  Seja o primeiro a iniciar uma discussão!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">
                  Novo Tópico de Discussão
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateTopic} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Título
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Qual é sua pergunta ou comentário?"
                    value={newTopic.title}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, title: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={newTopic.category}
                    onChange={(e) =>
                      setNewTopic({
                        ...newTopic,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    required
                    placeholder="Descreva sua dúvida ou compartilhe sua experiência..."
                    value={newTopic.content}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, content: e.target.value })
                    }
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreatingTopic}
                    className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTopic}
                    className="flex-1 py-3 bg-brand-green text-white font-bold rounded-lg hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingTopic ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal - WhatsApp Style */}
        {isDetailModalOpen && selectedTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 sticky top-0 z-10">
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider inline-block ${
                      selectedTopic.category === "Técnico"
                        ? "bg-blue-50 text-blue-600"
                        : selectedTopic.category === "Projetos"
                          ? "bg-purple-50 text-purple-600"
                          : selectedTopic.category === "Carreira"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedTopic.category}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-2 truncate">
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
                  className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Topic Content */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {selectedTopic.content}
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <img
                    src={selectedTopic.avatar}
                    className="w-8 h-8 rounded-full border border-gray-100 flex-shrink-0"
                    alt={selectedTopic.author}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">
                      {selectedTopic.author}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedTopic.date}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLikeTopic(selectedTopic)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                      selectedTopic.liked
                        ? "bg-red-50 text-red-600"
                        : "hover:bg-white text-gray-600"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${selectedTopic.liked ? "fill-current" : ""}`}
                    />
                    <span className="text-xs font-bold">
                      {selectedTopic.likes}
                    </span>
                  </button>
                </div>
              </div>

              {/* Replies - Chat Style */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-white">
                {loadingReplies ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-green"></div>
                  </div>
                ) : replies.length > 0 ? (
                  replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3 group">
                      <img
                        src={reply.avatar}
                        className="w-8 h-8 rounded-full border border-gray-100 flex-shrink-0"
                        alt={reply.author}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 rounded-lg px-4 py-3">
                          <p className="font-bold text-gray-900 text-sm">
                            {reply.author}
                          </p>
                          <p className="text-gray-700 text-sm mt-1 break-words">
                            {reply.content}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-gray-500">{reply.date}</p>
                          <button
                            onClick={() => handleLikeReply(reply)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${
                              reply.liked
                                ? "text-red-600"
                                : "text-gray-600 hover:text-brand-green"
                            }`}
                          >
                            <Heart
                              className={`w-3 h-3 ${reply.liked ? "fill-current" : ""}`}
                            />
                            <span className="font-bold">{reply.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">
                      Nenhuma resposta ainda. Seja o primeiro!
                    </p>
                  </div>
                )}
              </div>

              {/* Reply Input - Chat Style */}
              <form
                onSubmit={handleAddReply}
                className="px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0"
              >
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Enviar mensagem..."
                    className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-full focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isAddingReply || !newReply.trim()}
                    className="flex items-center justify-center w-10 h-10 bg-brand-green text-white rounded-full hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-6 py-4 rounded-xl shadow-lg font-medium text-white text-sm transition-all duration-300 transform ${
                toast.type === "success" ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

export default CommunityPage;
