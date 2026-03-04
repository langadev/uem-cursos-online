import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowRight, Layers, Loader } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../services/firebase";
import { Course } from "../types";

interface CategoryData {
  id: string;
  name: string;
  description?: string;
  courseCount: number;
  bg: string;
  textColor: string;
}

const branding = {
  appearance: {
    primaryColor: "#1a6e3c", // verde escuro do logotipo
    accentColor: "#89a022",
  },
};

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load all active courses to count by category
    const qCourses = query(
      collection(db, "courses"),
      where("isActive", "==", true),
    );
    const qCategories = collection(db, "categories");

    const unsubscribeCourses = onSnapshot(
      qCourses,
      (snapshot) => {
        const courses: Course[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          courses.push({
            id: doc.id,
            title: data.title || "Sem título",
            instructor: data.instructor || "",
            category: data.category || "Geral",
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            duration: data.duration || "0h",
            relevanceScore: data.relevanceScore || 0,
            imageUrl: data.imageUrl || "",
            isActive: data.isActive !== false,
          } as Course);
        });

        // Load categories from Firebase and count courses
        onSnapshot(
          qCategories,
          (categorySnapshot) => {
            const coursesByCategory = new Map<string, number>();
            courses.forEach((course) => {
              const count = coursesByCategory.get(course.category) || 0;
              coursesByCategory.set(course.category, count + 1);
            });

            const categoryColors = [
              "bg-blue-50",
              "bg-emerald-50",
              "bg-purple-50",
              "bg-orange-50",
              "bg-cyan-50",
              "bg-pink-50",
              "bg-indigo-50",
              "bg-yellow-50",
            ];

            const textColors = [
              "text-blue-600",
              "text-emerald-600",
              "text-purple-600",
              "text-orange-600",
              "text-cyan-600",
              "text-pink-600",
              "text-indigo-600",
              "text-yellow-600",
            ];

            const categoriesList: CategoryData[] = [];
            let index = 0;
            categorySnapshot.forEach((doc) => {
              const data = doc.data();
              const categoryName = data.name;
              const courseCount = coursesByCategory.get(categoryName) || 0;

              categoriesList.push({
                id: doc.id,
                name: categoryName,
                description: data.description || undefined,
                courseCount: courseCount,
                bg: categoryColors[index % categoryColors.length],
                textColor: textColors[index % textColors.length],
              });
              index++;
            });

            categoriesList.sort((a, b) => b.courseCount - a.courseCount);
            setCategories(categoriesList);
            setLoading(false);
          },
          (error) => {
            console.error("Erro ao carregar categorias:", error);
            setLoading(false);
          },
        );
      },
      (error) => {
        console.error("Erro ao carregar cursos:", error);
        setLoading(false);
      },
    );

    return () => unsubscribeCourses();
  }, []);

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Hero estilo Comunidade/Tutor */}
      <section
        style={{ backgroundColor: branding.appearance.primaryColor }}
        className="py-20 px-6 text-white relative overflow-hidden"
      >
        {/* Partículas decorativas */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <span
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full animate-float"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        {/* Conteúdo central */}
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1 rounded-full mb-6 border border-white/20">
            <Layers className="w-4 h-4" />
            <span className="text-sm tracking-wide font-medium">
              Áreas de Conhecimento
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            O que você quer{" "}
            <span style={{ color: branding.appearance.accentColor }}>
              aprender
            </span>{" "}
            hoje?
          </h1>

          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
            Navegue por nossa seleção de categorias e encontre a trilha perfeita
            para o seu momento profissional.
          </p>
        </div>
      </section>

      {/* Grid de categorias */}
      <div className="max-w-7xl mx-auto px-6 mt-16">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader className="w-10 h-10 text-brand-green animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                Carregando categorias...
              </p>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold uppercase text-sm">
              Nenhuma categoria disponível
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                to="/cursos"
                key={cat.id}
                className={`group flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 bg-white hover:border-brand-green relative overflow-hidden`}
              >
                {/* Icon Background Blob */}
                <div
                  className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-transform group-hover:scale-150 ${cat.bg}`}
                ></div>

                <div
                  className={`w-14 h-14 rounded-xl ${cat.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <span className={`text-2xl font-black ${cat.textColor}`}>
                    {cat.name.charAt(0)}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand-green transition-colors">
                  {cat.name}
                </h3>

                <p className="text-gray-500 text-sm mb-6 flex-grow leading-relaxed">
                  {cat.description ||
                    `Descubra ${cat.courseCount} curso${
                      cat.courseCount !== 1 ? "s" : ""
                    } de qualidade nesta categoria e desenvolva suas habilidades.`}
                </p>

                <div className="border-t border-gray-50 pt-4 mb-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                    Conteúdo Disponível
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-brand-green">
                      {cat.courseCount} curso{cat.courseCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-medium text-gray-400">
                    Explorar
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-green group-hover:text-white transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
