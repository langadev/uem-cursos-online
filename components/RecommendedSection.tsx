import { ArrowRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../services/api";
import { Course } from "../types";
import CourseCard from "./CourseCard";

const RecommendedSection: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const allCourses = await apiClient.fetchAllCourses();

        // Transforma dados da API para o formato do frontend
        const transformedCourses: Course[] = allCourses
          .filter((c) => c.is_active)
          .map(
            (data: any) =>
              ({
                id: data.id,
                title: data.title || "Sem título",
                instructor: data.instructor_name || "Professor",
                category: data.category || "Geral",
                rating: typeof data.rating === "number" ? data.rating : 0,
                reviewCount: 0,
                duration: `${data.duration_hours || 0}h`,
                relevanceScore: data.rating || 0,
                imageUrl:
                  data.image_url ||
                  "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?w=800&q=80&auto=format&fit=crop",
                badgeColor: "bg-stone-100 text-stone-800",
                isActive: true,
              }) as Course,
          );

        // Ordena por relevância e limita a 8 itens
        transformedCourses.sort(
          (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0),
        );
        setCourses(transformedCourses.slice(0, 8));
      } catch (err) {
        console.error("Erro ao carregar cursos recomendados", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark mb-2">
            Recomendado para si
          </h2>
          <p className="text-gray-500">
            Baseado nos seus interesses em tecnologia e liderança.
          </p>
        </div>

        <Link
          to="/cursos"
          className="flex items-center gap-1 text-brand-green font-semibold hover:gap-2 transition-all"
        >
          Ver todos
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-96 bg-gray-100 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {courses.length > 0 ? (
            courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400">
              Nenhum curso recomendado disponível no momento.
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RecommendedSection;
