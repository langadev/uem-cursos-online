import {
    AlertCircle,
    CheckCircle,
    ChevronRight,
    Clock,
    Edit2,
    Eye,
    EyeOff,
    Filter,
    FolderPlus,
    Layers,
    Plus,
    Power,
    Search,
    Trash2,
    TrendingUp,
    User,
    X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import { Course } from "../../types";

interface Category {
  id: string;
  name: string;
  description?: string;
  count: number;
  color: string;
}

interface CourseDeletionRequest {
  id: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
}

const INITIAL_CATEGORIES: Category[] = [];

const ContentManagementPage: React.FC = () => {
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<
    CourseDeletionRequest[]
  >([]);
  const [expandedDeleteRequest, setExpandedDeleteRequest] = useState<
    string | null
  >(null);
  const [deletionRequestsTab, setDeletionRequestsTab] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [allDeletionRequests, setAllDeletionRequests] = useState<
    CourseDeletionRequest[]
  >([]);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    action: "approve" | "reject";
    requestId: string;
    courseId: string;
    courseTitle: string;
  } | null>(null);
  const [courseApprovalModal, setCourseApprovalModal] = useState<{
    action: "approve" | "reject";
    courseId: string;
    courseTitle: string;
    instructor: string;
  } | null>(null);
  const [approvalTab, setApprovalTab] = useState<
    "pending" | "approved" | "rejected"
  >("pending");

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDescription, setNewCatDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseData, setEditingCourseData] = useState({
    category: "",
    certificatePrice: 0,
  });

  // New Course Form State
  const [newCourse, setNewCourse] = useState({
    title: "",
    instructor: "",
    category: "",
    certificatePrice: 0,
  });

  // Helper para mostrar toast
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Função auxiliar para recalcular contagens
  const updateCategoryCounts = (
    coursesList: Course[],
    categoriesList: Category[],
  ) => {
    const updated = categoriesList.map((cat) => ({
      ...cat,
      count: coursesList.filter((c) => c.category === cat.name).length,
    }));
    return updated;
  };

  // Load courses and categories from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load courses
        const coursesResponse = await api.get("/courses");
        const coursesList = (coursesResponse.data || []).map(
          (data: any) =>
            ({
              id: data.id,
              title: data.title || "Sem título",
              instructor: data.instructor || "Sem tutor",
              category: data.category || "Geral",
              rating: data.rating || 0,
              reviewCount: data.reviewCount || 0,
              duration: data.duration || "0h",
              relevanceScore: data.relevanceScore || 80,
              imageUrl: data.imageUrl || "",
              isActive: data.isActive !== false,
              badgeColor: data.badgeColor || "bg-stone-100 text-stone-800",
              approvalStatus: data.approvalStatus || "pending",
            }) as Course,
        );

        setCourses(coursesList);
        setCategories(updateCategoryCounts(coursesList, INITIAL_CATEGORIES));
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        showToast("Erro ao carregar cursos", "error");
      }
    };

    loadData();
  }, []);

  const updateFirebaseCourses = (updatedList: Course[]) => {
    setCourses(updatedList);
  };

  const handleApproveDeletionRequest = async (
    requestId: string,
    courseId: string,
    courseTitle: string,
  ) => {
    try {
      // Delete course via API
      await api.delete(`/courses/${courseId}`);

      showToast(
        `✅ Curso "${courseTitle}" foi excluído permanentemente!`,
        "success",
      );

      // Remove from local state
      setCourses(courses.filter((c) => c.id !== courseId));
      setExpandedDeleteRequest(null);
      setConfirmationModal(null);
    } catch (error) {
      console.error("Erro ao aprovar exclusão:", error);
      showToast("Erro ao aprovar exclusão do curso.", "error");
      setConfirmationModal(null);
    }
  };

  const handleRejectDeletionRequest = async (
    requestId: string,
    courseTitle: string,
  ) => {
    try {
      const courseId = allDeletionRequests.find(
        (r) => r.id === requestId,
      )?.courseId;
      if (courseId) {
        // Reativar o curso
        await updateDoc(doc(db, "courses", courseId), {
          status: "Publicado",
          isActive: true,
          updatedAt: serverTimestamp(),
        });
      }

      // Atualizar status da solicitação
      await updateDoc(doc(db, "courseDeletionRequests", requestId), {
        status: "rejected",
        rejectionReason: "Rejeitado pelo administrador",
      });

      showToast(
        `✗ Solicitação de "${courseTitle}" foi rejeitada. Curso reativado!`,
        "success",
      );
      setExpandedDeleteRequest(null);
      setConfirmationModal(null);
    } catch (error) {
      console.error("Erro ao rejeitar exclusão:", error);
      showToast("Erro ao rejeitar solicitação.", "error");
      setConfirmationModal(null);
    }
  };

  // Handle navigation from other pages (like Tutors)
  useEffect(() => {
    if (location.state?.instructorFilter) {
      setSearchQuery(location.state.instructorFilter);
    }
  }, [location]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory || course.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  const filteredDeletionRequests = useMemo(() => {
    return allDeletionRequests.filter(
      (request) => request.status === deletionRequestsTab,
    );
  }, [allDeletionRequests, deletionRequestsTab]);

  const filteredCoursesByApproval = useMemo(() => {
    return courses.filter((course) => course.approvalStatus === approvalTab);
  }, [courses, approvalTab]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      if (editingCategoryId) {
        // Editar categoria existente
        await updateDoc(doc(db, "categories", editingCategoryId), {
          name: newCatName,
          description: newCatDescription,
          updatedAt: serverTimestamp(),
        });
        console.log(`✓ Categoria "${newCatName}" foi atualizada com sucesso!`);
        alert(`✅ Categoria "${newCatName}" atualizada com sucesso!`);
        setEditingCategoryId(null);
      } else {
        // Criar nova categoria - salvar em localStorage
        const newCat: Category = {
          id: `cat_${Date.now()}`,
          name: newCatName,
          description: newCatDescription,
          count: 0,
          color: "bg-slate-100 text-slate-700",
        };
        setCategories([...categories, newCat]);
        console.log(`✓ Categoria "${newCatName}" foi criada com sucesso!`);
        alert(`✅ Categoria "${newCatName}" criada com sucesso!`);
      }

      setNewCatName("");
      setNewCatDescription("");
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      alert(`❌ Erro ao salvar categoria: ${error}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const categoryToDelete = categories.find((c) => c.id === id);
      const categoryName = categoryToDelete?.name || "Categoria";

      // Remove from local state
      setCategories(categories.filter((c) => c.id !== id));

      console.log(`✓ Categoria "${categoryName}" foi removida.`);
      alert(`✅ Categoria "${categoryName}" removida com sucesso!`);
      setDeletingCategoryId(null);
    } catch (error) {
      console.error("Erro ao deletar categoria:", error);
      alert(`❌ Erro ao remover categoria: ${error}`);
    }
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCatName(category.name);
    setNewCatDescription(category.description || "");
    setIsCategoryModalOpen(true);
  };

  const handleCleanEmptyCategories = async () => {
    try {
      const emptyCategories = categories.filter((cat) => cat.count === 0);

      if (emptyCategories.length === 0) {
        alert("✓ Não há categorias vazias para remover!");
        return;
      }

      const confirmDelete = window.confirm(
        `Tem certeza que deseja remover ${emptyCategories.length} categoria(s) vazia(s)?\n\n${emptyCategories.map((c) => `• ${c.name}`).join("\n")}`,
      );

      if (!confirmDelete) return;

      for (const cat of emptyCategories) {
        console.log(`✓ Categoria vazia removida: "${cat.name}"`);
      }

      // Remove empty categories from local state
      setCategories(categories.filter((c) => c.count > 0));

      alert(
        `✅ ${emptyCategories.length} categoria(s) vazia(s) foram removidas com sucesso!`,
      );
    } catch (error) {
      console.error("Erro ao limpar categorias vazias:", error);
      alert("❌ Erro ao remover categorias vazias.");
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title.trim()) return;

    try {
      // Create course via API
      const response = await api.post("/courses", {
        title: newCourse.title,
        instructor: newCourse.instructor || "UEM Cursos online Tutor",
        category: newCourse.category,
        rating: 5.0,
        reviewCount: 0,
        duration: "0h",
        relevanceScore: 0,
        certificatePrice: Number(newCourse.certificatePrice) || 0,
        imageUrl: `https://picsum.photos/seed/${Math.random()}/800/600`,
        isActive: true,
        badgeColor: "bg-stone-100 text-stone-800",
        status: "Rascunho",
      });

      showToast("✅ Curso criado com sucesso!", "success");
      setIsCourseModalOpen(false);
      setNewCourse({
        title: "",
        instructor: "",
        category: "",
        certificatePrice: 0,
      });
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      showToast("Erro ao criar curso", "error");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await api.delete(`/courses/${id}`);
      setDeleteConfirmId(null);
      setCourses(courses.filter((c) => c.id !== id));
      showToast("Curso removido com sucesso", "success");
    } catch (error) {
      console.error("Erro ao deletar curso:", error);
      showToast("Erro ao remover curso", "error");
    }
  };

  const handleApproveCourse = async (courseId: string, courseTitle: string) => {
    try {
      await api.put(`/courses/${courseId}`, {
        approvalStatus: "approved",
      });
      showToast(
        `✅ Curso "${courseTitle}" foi aprovado com sucesso!`,
        "success",
      );
      setCourseApprovalModal(null);
    } catch (error) {
      console.error("Erro ao aprovar curso:", error);
      showToast("Erro ao aprovar curso.", "error");
      setCourseApprovalModal(null);
    }
  };

  const handleRejectCourse = async (courseId: string, courseTitle: string) => {
    try {
      await updateDoc(doc(db, "courses", courseId), {
        approvalStatus: "rejected",
        updatedAt: serverTimestamp(),
      });
      showToast(`✗ Curso "${courseTitle}" foi rejeitado.`, "success");
      setCourseApprovalModal(null);
    } catch (error) {
      console.error("Erro ao rejeitar curso:", error);
      showToast("Erro ao rejeitar curso.", "error");
      setCourseApprovalModal(null);
    }
  };

  const toggleCourseStatus = async (id: string) => {
    // Verificar se tem uma solicitação de exclusão pendente
    const hasPendingDeletion = deletionRequests.some(
      (r) => r.courseId === id && r.status === "pending",
    );

    if (hasPendingDeletion) {
      alert(
        "Este curso tem uma solicitação de exclusão pendente. Rejeite a solicitação primeiro para reativá-lo.",
      );
      return;
    }

    try {
      const course = courses.find((c) => c.id === id);
      if (course) {
        await updateDoc(doc(db, "courses", id), {
          isActive: !course.isActive,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const openEditCourseModal = (course: Course) => {
    setEditingCourseId(course.id);
    setEditingCourseData({
      category: course.category || "",
      certificatePrice: course.certificatePrice || 0,
    });
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourseId) return;

    try {
      await updateDoc(doc(db, "courses", editingCourseId), {
        category: editingCourseData.category,
        certificatePrice: Number(editingCourseData.certificatePrice),
        updatedAt: serverTimestamp(),
      });

      showToast("✅ Curso atualizado com sucesso!", "success");
      setEditingCourseId(null);
    } catch (error) {
      console.error("Erro ao atualizar curso:", error);
      showToast("Erro ao atualizar curso.", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Gestão de Conteúdos
            </h1>
            <p className="text-slate-500 mt-1">
              Controle total sobre o catálogo de cursos e taxonomia da
              plataforma.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <FolderPlus size={18} /> Nova Categoria
            </button>
            <button
              onClick={() => setIsCourseModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-green text-white font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/10 active:scale-95"
            >
              <Plus size={18} /> Novo Curso
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar: Categories */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2">
                  <Layers size={16} className="text-brand-green" /> Categorias
                </h3>
                <span className="text-[10px] font-black text-slate-300 uppercase">
                  {categories.length} Total
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group ${!selectedCategory ? "bg-brand-green text-white shadow-lg shadow-green-900/20" : "hover:bg-slate-50 text-slate-600"}`}
                >
                  <span className="text-xs font-bold">Todas as Áreas</span>
                  <ChevronRight
                    size={14}
                    className={
                      !selectedCategory
                        ? "text-white"
                        : "text-slate-300 group-hover:text-brand-green"
                    }
                  />
                </button>

                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`flex-1 flex items-center justify-between p-3.5 rounded-2xl transition-all ${selectedCategory === cat.name ? "bg-brand-green text-white shadow-lg shadow-green-900/20" : "hover:bg-slate-50 text-slate-600"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold">{cat.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${selectedCategory === cat.name ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-brand-green/10 group-hover:text-brand-green"}`}
                      >
                        {cat.count}
                      </span>
                    </button>
                    <button
                      onClick={() => openEditCategory(cat)}
                      className={`p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${selectedCategory === cat.name ? "bg-white/20 text-white hover:bg-white/30" : "bg-slate-100 text-slate-400 hover:text-blue-500 hover:bg-blue-50"}`}
                      title="Editar categoria"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingCategoryId(cat.id)}
                      className={`p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${selectedCategory === cat.name ? "bg-white/20 text-white hover:bg-white/30" : "bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50"}`}
                      title="Deletar categoria"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50">
                <div className="bg-brand-light/30 rounded-2xl p-4 flex gap-3 mb-4">
                  <AlertCircle
                    size={16}
                    className="text-brand-green shrink-0"
                  />
                  <p className="text-[10px] font-bold text-brand-dark leading-tight">
                    Categorias vazias são ocultadas da vitrine pública
                    automaticamente.
                  </p>
                </div>

                {categories.some((c) => c.count === 0) && (
                  <button
                    onClick={handleCleanEmptyCategories}
                    className="w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                  >
                    🗑️ Limpar Vazias (
                    {categories.filter((c) => c.count === 0).length})
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp size={80} />
              </div>
              <h4 className="text-sm font-black uppercase tracking-widest text-brand-accent mb-4">
                Dica de Gestão
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Cursos com "Design" no título convertem 15% mais em buscas
                orgânicas este mês.
              </p>
            </div>
          </div>

          {/* Main: Courses Table */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center bg-slate-50/30">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Pesquisar por título do curso ou nome do tutor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-slate-300 w-4 h-4" />
                  <select className="h-12 bg-white border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-600 outline-none cursor-pointer">
                    <option>Mais Recentes</option>
                    <option>Maior Rating</option>
                    <option>Preço (Crescente)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Conteúdo
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <tr
                          key={course.id}
                          className={`hover:bg-slate-50/40 transition-colors group ${!course.isActive ? "bg-slate-50/30" : ""}`}
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <img
                                  src={course.imageUrl}
                                  className={`w-16 h-10 rounded-xl object-cover shadow-sm transition-opacity ${!course.isActive ? "opacity-40 grayscale" : ""}`}
                                  alt=""
                                />
                                {!course.isActive && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <EyeOff
                                      size={14}
                                      className="text-slate-900"
                                    />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p
                                  className={`font-bold text-sm transition-colors ${course.isActive ? "text-slate-900 group-hover:text-brand-green" : "text-slate-400 italic"}`}
                                >
                                  {course.title}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                  Tutor: {course.instructor}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                course.isActive
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : "bg-slate-100 text-slate-400 border border-slate-200"
                              }`}
                            >
                              {course.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2 transition-opacity">
                              <button
                                onClick={() => openEditCourseModal(course)}
                                className="p-2.5 bg-white text-slate-400 hover:text-blue-600 border border-slate-100 rounded-xl transition-all shadow-sm"
                                title="Editar Score e Categoria"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => toggleCourseStatus(course.id)}
                                className={`p-2.5 rounded-xl border transition-all shadow-sm active:scale-95 ${
                                  course.isActive
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                                    : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                }`}
                                title={
                                  course.isActive
                                    ? "Desativar da Vitrine"
                                    : "Ativar na Vitrine"
                                }
                              >
                                <Power size={18} />
                              </button>
                              <a
                                href={`#/cursos/${course.id}`}
                                target="_blank"
                                className="p-2.5 bg-white text-slate-400 hover:text-blue-500 border border-slate-100 rounded-xl transition-all shadow-sm"
                                title="Ver Página Pública"
                              >
                                <Eye size={18} />
                              </a>
                              <button
                                onClick={() => setDeleteConfirmId(course.id)}
                                className="p-2.5 bg-white text-slate-400 hover:text-red-500 border border-slate-100 rounded-xl transition-all shadow-sm"
                                title="Remover Curso"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">
                              Nenhum curso encontrado
                            </p>
                            <button
                              onClick={() => {
                                setSearchQuery("");
                                setSelectedCategory(null);
                              }}
                              className="mt-4 text-[10px] font-black uppercase text-brand-green hover:underline"
                            >
                              Limpar Filtros
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Mostrando {filteredCourses.length} de {courses.length}{" "}
                  conteúdos cadastrados
                </p>
                <div className="flex gap-2">
                  <button className="px-6 h-10 text-[10px] font-black uppercase text-slate-300 bg-white border border-slate-200 rounded-xl cursor-not-allowed transition-all">
                    Anterior
                  </button>
                  <button className="px-6 h-10 text-[10px] font-black uppercase text-brand-green bg-white border border-brand-green/20 rounded-xl hover:bg-brand-green hover:text-white transition-all shadow-sm">
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Nova Categoria */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                  {editingCategoryId ? "Editar Categoria" : "Criar Categoria"}
                </h3>
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryId(null);
                    setNewCatName("");
                  }}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Inteligência Artificial"
                    className="w-full px-5 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={newCatDescription}
                    onChange={(e) => setNewCatDescription(e.target.value)}
                    placeholder="Ex: Aprenda os fundamentos e aplicações de IA no mercado atual"
                    maxLength={200}
                    rows={3}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 outline-none transition-all resize-none"
                  />
                  <p className="text-[10px] text-slate-400 ml-1">
                    {newCatDescription.length}/200 caracteres
                  </p>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryModalOpen(false);
                      setEditingCategoryId(null);
                      setNewCatName("");
                      setNewCatDescription("");
                    }}
                    className="flex-1 h-14 text-xs font-black uppercase text-slate-400 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-14 bg-brand-green text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-green-900/10"
                  >
                    {editingCategoryId ? "Salvar Alterações" : "Confirmar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Novo Curso */}
        {isCourseModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                  Novo Curso
                </h3>
                <button
                  onClick={() => setIsCourseModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:rotate-90"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCourse} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Título do Conteúdo
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCourse.title}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, title: e.target.value })
                    }
                    placeholder="Ex: Maestria em Backend com Node.js"
                    className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nome do Tutor
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                    <input
                      type="text"
                      required
                      value={newCourse.instructor}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          instructor: e.target.value,
                        })
                      }
                      placeholder="Ex: Carlos Mendes"
                      className="w-full pl-11 pr-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Categoria
                    </label>
                    <select
                      value={newCourse.category}
                      onChange={(e) =>
                        setNewCourse({ ...newCourse, category: e.target.value })
                      }
                      className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-brand-green"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      💰 Preço do Certificado (MZM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newCourse.certificatePrice || 0}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          certificatePrice: Number(e.target.value),
                        })
                      }
                      className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-green"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCourseModalOpen(false)}
                    className="flex-1 h-14 text-xs font-black uppercase text-slate-400 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-14 bg-brand-green text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-green-900/10"
                  >
                    Publicar Agora
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirmação de Exclusão de Categoria */}
        {deletingCategoryId && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[340px] rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                Remover categoria?
              </h3>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium px-2">
                Esta ação é irreversível. A categoria será removida, mas os
                cursos nela contidos serão preservados.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingCategoryId(null)}
                  className="flex-1 h-11 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteCategory(deletingCategoryId)}
                  className="flex-1 h-11 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95"
                >
                  Sim, remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirmação de Exclusão de Curso */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[340px] rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                Remover curso?
              </h3>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium px-2">
                Esta ação é irreversível e o conteúdo será retirado da vitrine
                pública.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 h-11 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                >
                  Manter
                </button>
                <button
                  onClick={() => handleDeleteCourse(deleteConfirmId)}
                  className="flex-1 h-11 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95"
                >
                  Sim, remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deletion Requests Section */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Trash2 size={28} className="text-red-500" />
                  Solicitações de Exclusão de Cursos
                </h2>
                <p className="text-xs text-slate-400 mt-2">
                  Gerencie as solicitações de exclusão de cursos feitas pelos
                  tutores
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-100 pb-6">
              {(["pending", "approved", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDeletionRequestsTab(tab)}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative ${
                    deletionRequestsTab === tab
                      ? "text-brand-green"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab === "pending"
                    ? "Pendentes"
                    : tab === "approved"
                      ? "Aprovadas"
                      : "Rejeitadas"}
                  {deletionRequestsTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-green rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Deletion Requests List */}
            {filteredDeletionRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={48} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">
                  {deletionRequestsTab === "pending"
                    ? "Nenhuma solicitação pendente"
                    : deletionRequestsTab === "approved"
                      ? "Nenhuma solicitação aprovada"
                      : "Nenhuma solicitação rejeitada"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeletionRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="font-black text-slate-900 text-sm mb-2">
                          {request.courseTitle}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Tutor:{" "}
                          <span className="font-bold text-slate-700">
                            {request.instructorName}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Solicitado em:{" "}
                          <span className="font-bold text-slate-700">
                            {new Date(request.requestedAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === "pending" && (
                          <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            Pendente
                          </span>
                        )}
                        {request.status === "approved" && (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle size={14} /> Aprovada
                          </span>
                        )}
                        {request.status === "rejected" && (
                          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <X size={14} /> Rejeitada
                          </span>
                        )}
                      </div>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                          onClick={() =>
                            setConfirmationModal({
                              action: "reject",
                              requestId: request.id,
                              courseId: request.courseId,
                              courseTitle: request.courseTitle,
                            })
                          }
                          className="flex-1 h-10 bg-red-50 text-red-600 border border-red-200 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-100 transition-all active:scale-95"
                        >
                          Rejeitar
                        </button>
                        <button
                          onClick={() =>
                            setConfirmationModal({
                              action: "approve",
                              requestId: request.id,
                              courseId: request.courseId,
                              courseTitle: request.courseTitle,
                            })
                          }
                          className="flex-1 h-10 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                        >
                          Aprovar & Deletar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Confirmação de Aprovação/Rejeição */}
        {confirmationModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[340px] rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
              <div
                className={`w-12 h-12 ${
                  confirmationModal.action === "approve"
                    ? "bg-emerald-50 text-emerald-500"
                    : "bg-red-50 text-red-500"
                } rounded-2xl flex items-center justify-center mx-auto mb-6`}
              >
                {confirmationModal.action === "approve" ? (
                  <CheckCircle size={24} />
                ) : (
                  <X size={24} />
                )}
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                {confirmationModal.action === "approve"
                  ? "Aprovar Exclusão?"
                  : "Rejeitar Solicitação?"}
              </h3>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium px-2">
                {confirmationModal.action === "approve"
                  ? `O curso "${confirmationModal.courseTitle}" será deletado permanentemente. Esta ação não poderá ser desfeita.`
                  : `A solicitação será rejeitada e o curso "${confirmationModal.courseTitle}" será reativado.`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmationModal(null)}
                  className="flex-1 h-11 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmationModal.action === "approve") {
                      handleApproveDeletionRequest(
                        confirmationModal.requestId,
                        confirmationModal.courseId,
                        confirmationModal.courseTitle,
                      );
                    } else {
                      handleRejectDeletionRequest(
                        confirmationModal.requestId,
                        confirmationModal.courseTitle,
                      );
                    }
                  }}
                  className={`flex-1 h-11 ${
                    confirmationModal.action === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20"
                      : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
                  } text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all active:scale-95`}
                >
                  {confirmationModal.action === "approve"
                    ? "Sim, Deletar"
                    : "Sim, Rejeitar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar Curso */}
        {editingCourseId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                  Editar Curso
                </h3>
                <button
                  onClick={() => setEditingCourseId(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleEditCourse} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Categoria
                  </label>
                  <select
                    value={editingCourseData.category}
                    onChange={(e) =>
                      setEditingCourseData({
                        ...editingCourseData,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all"
                  >
                    <option value="">Selecionar categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    💰 Preço do Certificado (MZM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingCourseData.certificatePrice || 0}
                    onChange={(e) =>
                      setEditingCourseData({
                        ...editingCourseData,
                        certificatePrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-green"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingCourseId(null)}
                    className="flex-1 h-11 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-brand-green text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-brand-dark shadow-lg shadow-brand-green/20 transition-all active:scale-95"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-[200] px-6 py-3 rounded-xl font-bold text-sm shadow-lg animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3 ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ContentManagementPage;
