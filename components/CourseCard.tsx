import { Award, Clock, Star } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useBranding } from "../contexts/BrandingContext";
import { Course } from "../types";

interface CourseCardProps {
  course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const { branding } = useBranding();

  const formatReviews = (count: number) => {
    return count > 999 ? `${(count / 1000).toFixed(1)}k` : count;
  };

  return (
    <Link to={`/cursos/${course.id}`} className="block h-full">
      <div className="bg-white rounded-xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full group">

        {/* Image Container */}
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={course.imageUrl}
            alt={course.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />

          {/* Badge: Fundo Verde, Texto Branco, Alinhado à Direita */}
          <div className="absolute top-4 right-4">
            <span
              className="px-3 py-1 text-xs font-bold rounded-md shadow-md text-white bg-emerald-600"
            >
              {course.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <h3
            className="text-lg font-bold mb-2 leading-snug line-clamp-2 group-hover:opacity-80 transition-colors"
            style={{ color: branding.appearance.primaryColor }}
          >
            {course.title}
          </h3>

          <p className="text-sm text-gray-500 mb-4">
            Com{" "}
            <span className="text-gray-700 font-medium">
              {course.instructor}
            </span>
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-between mt-auto mb-4 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1">
              <Star
                className="w-4 h-4 fill-current"
                style={{ color: branding.appearance.accentColor }}
              />
              <span className="text-gray-900 font-bold text-sm">
                {course.rating}
              </span>
              <span className="text-gray-400">
                ({formatReviews(course.reviewCount)})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{course.duration}</span>
            </div>
          </div>

          {/* Certificate Price Info */}
          {course.certificatePrice && course.certificatePrice > 0 && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700 font-medium">
                Certificado: {course.currency || "MZM"}{" "}
                {course.certificatePrice.toLocaleString("pt-BR")}
              </span>
            </div>
          )}

          {/* Relevance Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span style={{ color: branding.appearance.primaryColor }}>
                {course.relevanceScore}% Relevante
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${course.relevanceScore}%`,
                  backgroundColor: branding.appearance.primaryColor,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
