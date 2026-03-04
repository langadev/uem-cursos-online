import { collection, onSnapshot, query, where } from "firebase/firestore";
import { BookOpen, Filter, Loader, Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import CourseCard from "../components/CourseCard";
import { cacheService } from "../services/cacheService";
import { db } from "../services/firebase";
import { Course } from "../types";

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("relevance");
  const CACHE_KEY = "courses_list";
  const CACHE_TTL = 10; // Reduzido para 10 minutos para melhor reatividade
  const ratingsUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    // Tenta recuperar do cache primeiro
    const cachedCourses = cacheService.get<Course[]>(CACHE_KEY);
    if (cachedCourses && cachedCourses.length > 0) {
      setCourses(cachedCourses);
      setLoading(false);
      console.log("Cursos carregados do cache");
    }

    // Carrega categorias do Firebase
    const categoriesRef = collection(db, "categories");
    const unsubCategories = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const categoryList: string[] = ["Todos"];
        snapshot.forEach((doc) => {
          const data = doc.data();
          categoryList.push(data.name);
        });
        setCategories(categoryList.sort());
        console.log("Categorias carregadas:", categoryList);
      },
      (error) => {
        console.error("Erro ao carregar categorias:", error);
      },
    );

    // Listener em tempo real para cursos (atualiza sempre que há mudanças)
    const q = query(collection(db, "courses"), where("isActive", "==", true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Course[] = snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            title: data?.title || "Sem título",
            instructor: data?.instructor || "",
            category: data?.category || "Geral",
            rating: typeof data?.rating === "number" ? data.rating : 0,
            reviewCount:
              typeof data?.reviewCount === "number" ? data.reviewCount : 0,
            duration: data?.duration || "0h",
            relevanceScore:
              typeof data?.relevanceScore === "number"
                ? data.relevanceScore
                : 0,
            imageUrl:
              data?.imageUrl ||
              "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?w=800&q=80&auto=format&fit=crop",
            badgeColor: data?.badgeColor || "bg-stone-100 text-stone-800",
            isActive: data?.isActive !== false,
          } as Course;
        });
        setCourses(list);
        setLoading(false);
        // Salva no cache apenas se houve mudança significativa
        ratingsUpdateTimeRef.current = Date.now();
        cacheService.set(CACHE_KEY, list, CACHE_TTL);
        console.log("Cursos atualizados em tempo real");
      },
      (error) => {
        console.error("Erro ao buscar cursos:", error);
        setLoading(false);
      },
    );
    return () => {
      unsub();
      unsubCategories();
    };
  }, []);

  // Aplica filtros e ordenação
  let filteredCourses = courses.filter((c) => c.isActive !== false);

  // Filtro por categoria
  if (selectedCategory !== "Todos") {
    filteredCourses = filteredCourses.filter(
      (c) => c.category === selectedCategory,
    );
  }

  // Filtro por busca
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredCourses = filteredCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.instructor.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term),
    );
  }

  // Ordenação
  if (sortBy === "recent") {
    // Ordena por relevance score (simulando recentes)
    filteredCourses = [...filteredCourses].sort(
      (a, b) => b.relevanceScore - a.relevanceScore,
    );
  } else if (sortBy === "rating") {
    filteredCourses = [...filteredCourses].sort((a, b) => b.rating - a.rating);
  } else {
    // relevance (padrão)
    filteredCourses = [...filteredCourses].sort(
      (a, b) => b.relevanceScore - a.relevanceScore,
    );
  }

  const allCourses = filteredCourses;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-2 text-brand-green font-semibold text-sm">
            <BookOpen className="w-4 h-4" />
            <span>Catálogo Acadêmico</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">
            Explore Nossos Cursos
          </h1>
          <p className="text-gray-500 max-w-2xl text-lg">
            Descubra trilhas de conhecimento desenhadas para elevar sua
            carreira. Do nível iniciante ao avançado, encontre o conteúdo ideal
            para você.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Search and Filters Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="O que você quer aprender hoje? (ex: Python, Gestão...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green shadow-sm text-gray-700 placeholder-gray-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <button className="flex items-center gap-2 px-6 py-3.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm whitespace-nowrap transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm cursor-pointer outline-none focus:border-brand-green"
            >
              <option value="relevance">Mais Relevantes</option>
              <option value="recent">Mais Recentes</option>
              <option value="rating">Melhor Avaliados</option>
            </select>
          </div>
        </div>

        {/* Categories Tags - Now from database */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-brand-green text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-brand-green hover:text-brand-green"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results Grid */}
        {loading && courses.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader className="w-10 h-10 text-brand-green animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Carregando cursos...</p>
              <p className="text-xs text-gray-400 mt-2">
                Primeira vez pode levar alguns segundos
              </p>
            </div>
          </div>
        ) : allCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {allCourses.map((course, index) => (
              <CourseCard key={`${course.id}-${index}`} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100 text-slate-400">
            Nenhum curso disponível com os filtros selecionados.
          </div>
        )}

        {/* Pagination Placeholder */}
        {allCourses.length > 0 && (
          <div className="mt-12 flex justify-center">
            <button className="px-6 py-2 border border-gray-300 rounded-md text-gray-600 hover:border-brand-green hover:text-brand-green transition-colors">
              Carregar mais cursos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
