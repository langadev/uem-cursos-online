import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    ArrowRight,
    Award,
    Heart,
    Loader,
    MessageSquare,
    Plus,
    Send,
    Share2,
    Trophy,
    X
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import { db } from "../services/firebase";

interface CommunityTopic {
  id: string;
  title: string;
  author: string;
  authorUid: string;
  authorName: string;
  category: string;
  replies: number;
  likes: number;
  date: string;
  userLiked?: boolean;
}

interface PopularCourse {
  id: string;
  title: string;
  instructor_name: string;
  category: string;
  image_url?: string;
  total_students?: number;
}

interface Contributor {
  id: string;
  name: string;
  avatar: string;
  authorUid: string;
  likes: number;
}

interface Reply {
  id: string;
  author: string;
  authorUid: string;
  authorName: string;
  content: string;
  date: string;
  likes: number;
  userLiked?: boolean;
  createdAt: Date;
}

const CommunityPage: React.FC = () => {
  const { branding } = useBranding();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | null>(
    null,
  );
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: "",
    category: "Geral",
    content: "",
  });
  const [newReply, setNewReply] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isAddingReply, setIsAddingReply] = useState(false);

  const fetchUserName = async (uid: string): Promise<string> => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data().full_name || userSnap.data().name || "Usuário";
      }
      return "Usuário";
    } catch (error) {
      return "Usuário";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar tópicos recentes da comunidade
        const topicsQuery = query(
          collection(db, "community-topics"),
          orderBy("createdAt", "desc"),
          limit(6),
        );
        const topicsSnap = await getDocs(topicsQuery);
        const topicsDataPromises = topicsSnap.docs.map(async (doc) => {
          const data = doc.data();
          const authorName = await fetchUserName(data.authorUid || "");
          return {
            id: doc.id,
            title: data.title || "Sem título",
            author: data.author || authorName || "Usuário",
            authorUid: data.authorUid || "",
            authorName: authorName,
            category: data.category || "Geral",
            replies: data.replies || 0,
            likes: data.likes || 0,
            date:
              data.createdAt?.toDate?.()?.toLocaleDateString("pt-PT") ||
              new Date().toLocaleDateString("pt-PT"),
            userLiked: user?.uid
              ? (data.likedBy || []).includes(user.uid)
              : false,
          };
        });
        const topicsData = await Promise.all(topicsDataPromises);
        setTopics(topicsData);

        // Buscar contribuidores por likes (top 4)
        const topicsAllQuery = query(
          collection(db, "community-topics"),
          orderBy("likes", "desc"),
          limit(4),
        );
        const contributorsSnap = await getDocs(topicsAllQuery);
        const contributorsDataPromises = contributorsSnap.docs.map(
          async (doc, index) => {
            const data = doc.data();
            const authorName = await fetchUserName(data.authorUid || "");
            return {
              id: doc.id,
              name: authorName,
              avatar: `https://i.pravatar.cc/150?img=${10 + index}`,
              authorUid: data.authorUid || "",
              likes: data.likes || 0,
            };
          },
        );
        const contributorsData = await Promise.all(contributorsDataPromises);
        setContributors(contributorsData);
      } catch (error) {
        console.log("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        collection(db, "community-replies"),
        where("topic_id", "==", selectedTopic.id),
        orderBy("createdAt", "asc"),
      );
      const unsubscribe = onSnapshot(q, async (snap) => {
        const repliesDataPromises = snap.docs.map(async (doc) => {
          const data = doc.data();
          const authorName = await fetchUserName(data.authorUid || "");
          return {
            id: doc.id,
            author: data.author || authorName || "Usuário",
            authorUid: data.authorUid || "",
            authorName: authorName,
            content: data.content || "",
            date:
              data.createdAt?.toDate?.()?.toLocaleDateString("pt-PT") ||
              new Date().toLocaleDateString("pt-PT"),
            likes: data.likes || 0,
            userLiked: user?.uid
              ? (data.likedBy || []).includes(user.uid)
              : false,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          };
        });
        const repliesData = await Promise.all(repliesDataPromises);
        setReplies(repliesData);
        setLoadingReplies(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.log("Erro ao carregar respostas:", error);
      setLoadingReplies(false);
    }
  }, [selectedTopic, user?.uid]);

  const handleLike = async (
    topicId: string,
    currentLikes: number,
    userLiked: boolean,
  ) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const topicRef = doc(db, "community-topics", topicId);
      const topicSnap = await getDoc(topicRef);
      const likedBy = topicSnap.data()?.likedBy || [];

      let newLikedBy;
      if (userLiked) {
        newLikedBy = likedBy.filter((uid: string) => uid !== user.uid);
      } else {
        newLikedBy = [...likedBy, user.uid];
      }

      await updateDoc(topicRef, {
        likes: newLikedBy.length,
        likedBy: newLikedBy,
      });

      // Atualizar estado local
      setTopics(
        topics.map((topic) =>
          topic.id === topicId
            ? { ...topic, likes: newLikedBy.length, userLiked: !userLiked }
            : topic,
        ),
      );
    } catch (error) {
      console.log("Erro ao dar like:", error);
    }
  };

  const handleCreateTopic = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!newTopic.title.trim() || !newTopic.content.trim()) {
      alert("Por favor, preencha título e conteúdo");
      return;
    }

    try {
      setIsCreatingTopic(true);
      const topicData = {
        title: newTopic.title,
        category: newTopic.category,
        content: newTopic.content,
        author: profile?.full_name || profile?.name || "Usuário",
        authorUid: user.uid,
        authorName: profile?.full_name || profile?.name || "Usuário",
        replies: 0,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "community-topics"), topicData);

      setNewTopic({ title: "", category: "Geral", content: "" });
      setIsCreateModalOpen(false);

      // Recarregar tópicos
      const topicsQuery = query(
        collection(db, "community-topics"),
        orderBy("createdAt", "desc"),
        limit(6),
      );
      const topicsSnap = await getDocs(topicsQuery);
      const topicsDataPromises = topicsSnap.docs.map(async (doc) => {
        const data = doc.data();
        const authorName = await fetchUserName(data.authorUid || "");
        return {
          id: doc.id,
          title: data.title || "Sem título",
          author: data.author || authorName || "Usuário",
          authorUid: data.authorUid || "",
          authorName: authorName,
          category: data.category || "Geral",
          replies: data.replies || 0,
          likes: data.likes || 0,
          date:
            data.createdAt?.toDate?.()?.toLocaleDateString("pt-PT") ||
            new Date().toLocaleDateString("pt-PT"),
          userLiked: user?.uid
            ? (data.likedBy || []).includes(user.uid)
            : false,
        };
      });
      const topicsData = await Promise.all(topicsDataPromises);
      setTopics(topicsData);
    } catch (error) {
      console.log("Erro ao criar tópico:", error);
      alert("Erro ao criar tópico");
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleAddReply = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!newReply.trim()) {
      alert("Por favor, escreva um comentário");
      return;
    }

    if (!selectedTopic) return;

    try {
      setIsAddingReply(true);
      const replyData = {
        topic_id: selectedTopic.id,
        author: profile?.full_name || profile?.name || "Usuário",
        authorUid: user.uid,
        authorName: profile?.full_name || profile?.name || "Usuário",
        content: newReply,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "community-replies"), replyData);

      // Atualizar replies count do tópico
      const topicRef = doc(db, "community-topics", selectedTopic.id);
      await updateDoc(topicRef, {
        replies: (selectedTopic.replies || 0) + 1,
      });

      setNewReply("");
    } catch (error) {
      console.log("Erro ao adicionar reply:", error);
      alert("Erro ao adicionar comentário");
    } finally {
      setIsAddingReply(false);
    }
  };

  const handleLikeReply = async (
    replyId: string,
    currentLikes: number,
    userLiked: boolean,
  ) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const replyRef = doc(db, "community-replies", replyId);
      const replySnap = await getDoc(replyRef);
      const likedBy = replySnap.data()?.likedBy || [];

      let newLikedBy;
      if (userLiked) {
        newLikedBy = likedBy.filter((uid: string) => uid !== user.uid);
      } else {
        newLikedBy = [...likedBy, user.uid];
      }

      await updateDoc(replyRef, {
        likes: newLikedBy.length,
        likedBy: newLikedBy,
      });
    } catch (error) {
      console.log("Erro ao dar like em reply:", error);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Hero Section */}
      <section
        style={{ backgroundColor: branding.appearance.primaryColor }}
        className="text-white py-20 px-6"
      >
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 mb-6">
            <Award
              style={{ color: branding.appearance.accentColor }}
              className="w-4 h-4"
            />
            <span className="text-sm tracking-wide font-medium">
              Comunidade Global
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Aprender é melhor{" "}
            <span style={{ color: branding.appearance.accentColor }}>
              juntos
            </span>
          </h1>

          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Conecte-se com milhares de estudantes, compartilhe projetos, tire
            dúvidas e cresça profissionalmente em nossa comunidade exclusiva.
          </p>

          <button
            onClick={() =>
              user ? setIsCreateModalOpen(true) : navigate("/login")
            }
            style={{ backgroundColor: branding.appearance.accentColor }}
            className="text-black font-bold py-3.5 px-8 rounded-xl shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar Tópico
          </button>
        </div>
      </section>

      {/* Stats Banner */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-24">
          <div className="text-center">
            <p
              className="text-3xl font-bold"
              style={{ color: branding.appearance.primaryColor }}
            >
              +1k
            </p>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
              Membros Ativos
            </p>
          </div>
          <div className="text-center">
            <p
              className="text-3xl font-bold"
              style={{ color: branding.appearance.primaryColor }}
            >
              {topics.length}
            </p>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
              Tópicos Recentes
            </p>
          </div>
          <div className="text-center">
            <p
              className="text-3xl font-bold"
              style={{ color: branding.appearance.primaryColor }}
            >
              100+
            </p>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
              Discussões Ativas
            </p>
          </div>
        </div>
      </div>

      {/* Forum Categories */}
      <div className="max-w-7xl mx-auto px-6 mt-16 mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Fóruns de Discussão
          </h2>
          <a
            href="#"
            style={{ color: branding.appearance.primaryColor }}
            className="font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ForumCard
            branding={branding}
            icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
            title="Dúvidas Técnicas"
            description="Espaço para perguntas sobre aulas, códigos e ferramentas."
            activeCount="Discussões ativas"
            color="bg-blue-50"
          />
          <ForumCard
            branding={branding}
            icon={<Share2 className="w-6 h-6 text-purple-600" />}
            title="Showcase de Projetos"
            description="Compartilhe seu portfólio e receba feedback da comunidade."
            activeCount="Portfólios compartilhados"
            color="bg-purple-50"
          />
          <ForumCard
            branding={branding}
            icon={<Trophy className="w-6 h-6 text-orange-600" />}
            title="Carreira e Vagas"
            description="Dicas de currículo, preparação para entrevistas e oportunidades."
            activeCount="Oportunidades abertas"
            color="bg-orange-50"
          />
        </div>
      </div>

      {/* Recent Topics Section */}
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div
              className="inline-flex items-center gap-2 font-bold mb-4"
              style={{ color: branding.appearance.primaryColor }}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Tópicos da Comunidade</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Discussões Recentes
            </h2>
          </div>
          <a
            href="#"
            style={{ color: branding.appearance.primaryColor }}
            className="font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader
              className="w-8 h-8 animate-spin"
              style={{ color: branding.appearance.primaryColor }}
            />
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Nenhum tópico na comunidade ainda. Seja o primeiro a iniciar uma
              discussão!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3
                      onClick={() => {
                        setSelectedTopic(topic);
                        setIsDetailModalOpen(true);
                      }}
                      className="font-bold text-gray-900 group-hover:text-gray-700 line-clamp-2 mb-2 text-sm leading-tight cursor-pointer hover:underline"
                    >
                      {topic.title}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      por {topic.authorName || topic.author}
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: `${branding.appearance.primaryColor}10`,
                      color: branding.appearance.primaryColor,
                    }}
                    className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ml-2"
                  >
                    {topic.category}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedTopic(topic);
                        setIsDetailModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">{topic.replies}</span>
                    </button>
                    <button
                      onClick={() =>
                        handleLike(
                          topic.id,
                          topic.likes,
                          topic.userLiked || false,
                        )
                      }
                      className="flex items-center gap-1.5 text-xs transition-colors"
                      style={{
                        color: topic.userLiked
                          ? branding.appearance.primaryColor
                          : "#gray",
                      }}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={
                          topic.userLiked
                            ? branding.appearance.primaryColor
                            : "none"
                        }
                        style={{
                          color: topic.userLiked
                            ? branding.appearance.primaryColor
                            : "#d1d5db",
                        }}
                      />
                      <span className="font-medium">{topic.likes}</span>
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">{topic.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Contributors */}
      <div className="max-w-7xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Top Contribuidores do Mês
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {contributors.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Nenhum contribuidor ainda.</p>
            </div>
          ) : (
            contributors.map((contributor) => (
              <div
                key={contributor.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <img
                  src={contributor.avatar}
                  alt={contributor.name}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                />
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {contributor.name}
                  </p>
                  <p
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: branding.appearance.primaryColor }}
                  >
                    <Heart className="w-3 h-3 fill-current" />{" "}
                    {contributor.likes} Likes
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Topic Detail Modal */}
      {isDetailModalOpen && selectedTopic && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedTopic.title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {selectedTopic.authorName || selectedTopic.author}
                  </span>
                  <span>•</span>
                  <span>{selectedTopic.date}</span>
                  <span
                    style={{ color: branding.appearance.primaryColor }}
                    className="font-medium"
                  >
                    {selectedTopic.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedTopic(null);
                  setReplies([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Replies */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4">
                  Comentários ({replies.length})
                </h3>

                {loadingReplies ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader
                      className="w-6 h-6 animate-spin"
                      style={{ color: branding.appearance.primaryColor }}
                    />
                  </div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {replies.map((reply) => (
                      <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {reply.authorName || reply.author}
                            </p>
                            <p className="text-xs text-gray-500">
                              {reply.date}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm mb-3">
                          {reply.content}
                        </p>
                        <button
                          onClick={() =>
                            handleLikeReply(
                              reply.id,
                              reply.likes,
                              reply.userLiked || false,
                            )
                          }
                          className="flex items-center gap-1.5 text-xs transition-colors"
                          style={{
                            color: reply.userLiked
                              ? branding.appearance.primaryColor
                              : "#9ca3af",
                          }}
                        >
                          <Heart
                            className="w-3 h-3"
                            fill={
                              reply.userLiked
                                ? branding.appearance.primaryColor
                                : "none"
                            }
                            style={{
                              color: reply.userLiked
                                ? branding.appearance.primaryColor
                                : "#d1d5db",
                            }}
                          />
                          <span className="font-medium">{reply.likes}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reply Input */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-end gap-3">
                <input
                  type="text"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !isAddingReply) {
                      handleAddReply();
                    }
                  }}
                  placeholder={
                    user
                      ? "Escreva um comentário..."
                      : "Faça login para comentar"
                  }
                  disabled={!user || isAddingReply}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-green disabled:bg-gray-100"
                />
                <button
                  onClick={handleAddReply}
                  disabled={isAddingReply || !newReply.trim()}
                  style={{ backgroundColor: branding.appearance.primaryColor }}
                  className="p-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Topic Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Criar Novo Tópico
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={newTopic.title}
                  onChange={(e) =>
                    setNewTopic({ ...newTopic, title: e.target.value })
                  }
                  placeholder="Qual é sua pergunta ou tópico?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-green"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={newTopic.category}
                  onChange={(e) =>
                    setNewTopic({ ...newTopic, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-green"
                >
                  <option>Técnico</option>
                  <option>Carreira</option>
                  <option>Projetos</option>
                  <option>Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Conteúdo
                </label>
                <textarea
                  value={newTopic.content}
                  onChange={(e) =>
                    setNewTopic({ ...newTopic, content: e.target.value })
                  }
                  placeholder="Conte mais detalhes sobre seu tópico..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-green resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTopic}
                disabled={isCreatingTopic}
                style={{ backgroundColor: branding.appearance.primaryColor }}
                className="flex-1 px-4 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isCreatingTopic ? "Criando..." : "Criar Tópico"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const ForumCard = ({
  icon,
  title,
  description,
  activeCount,
  color,
  branding,
}: any) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
    <div
      className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
    >
      {icon}
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{description}</p>
    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      {activeCount}
    </div>
  </div>
);

export default CommunityPage;
