
import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CourseCard from './CourseCard';
import { Course } from '../types';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';

const RecommendedSection: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'courses'), where('isActive', '==', true), limit(12));
    const unsub = onSnapshot(q, (snap) => {
      const list: Course[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          title: data?.title || 'Sem título',
          instructor: data?.instructor || '',
          category: data?.category || 'Geral',
          rating: typeof data?.rating === 'number' ? data.rating : 0,
          reviewCount: typeof data?.reviewCount === 'number' ? data.reviewCount : 0,
          duration: data?.duration || '0h',
          relevanceScore: typeof data?.relevanceScore === 'number' ? data.relevanceScore : 0,
          imageUrl: data?.imageUrl || 'https://images.unsplash.com/photo-1529101091764-c3526daf38fe?w=800&q=80&auto=format&fit=crop',
          badgeColor: data?.badgeColor || 'bg-stone-100 text-stone-800',
          isActive: data?.isActive !== false,
        } as Course;
      });
      // Ordena por relevância e limita a 8 itens
      list.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      setCourses(list.slice(0, 8));
      setLoading(false);
    }, (err) => {
      console.error('Failed to load courses', err);
      setLoading(false);
    });
    return () => unsub();
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
        
        <Link to="/cursos" className="flex items-center gap-1 text-brand-green font-semibold hover:gap-2 transition-all">
          Ver todos
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => (
             <div key={i} className="h-96 bg-gray-100 rounded-xl animate-pulse"></div>
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
