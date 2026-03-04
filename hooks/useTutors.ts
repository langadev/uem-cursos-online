import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { UserProfile } from "../contexts/AuthContext";
import { cacheService } from "../services/cacheService";
import { db } from "../services/firebase";

export interface Tutor {
  id: string;
  uid: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: "student" | "instructor" | "admin";
  status: string;
  course_count?: number;
  avg_rating?: number;
  total_students?: number;
  specialty?: string;
}

export interface TutorWithCourses extends Tutor {
  courses: TutorCourse[];
  bio?: string;
  company?: string;
  specialties?: string[];
  createdAt?: any;
}

export interface TutorCourse {
  id: number;
  title: string;
  category: string;
  duration: string;
  image_url: string;
  rating: number;
  review_count: number;
  relevance_score: number;
  is_active: boolean;
}

export function useTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const CACHE_KEY = "tutors_list";
  const CACHE_TTL = 60; // 60 minutos

  useEffect(() => {
    // Tenta recuperar do cache primeiro
    const cachedTutors = cacheService.get<Tutor[]>(CACHE_KEY);
    if (cachedTutors && cachedTutors.length > 0) {
      setTutors(cachedTutors);
      setLoading(false);
      console.log("Tutores carregados do cache");
    }

    const q = query(
      collection(db, "profiles"),
      where("role", "==", "instructor"),
      where("status", "==", "Ativo"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Mapas para armazenar contadores
        const courseCountMap = new Map<string, number>();
        const studentCountMap = new Map<string, Set<string>>();
        let processedCount = 0;

        // Inicializar mapas para cada instrutor
        snapshot.docs.forEach((docSnap) => {
          studentCountMap.set(docSnap.id, new Set<string>());
        });

        // Para cada instrutor, configura listeners de cursos e inscrições
        snapshot.docs.forEach((docSnap) => {
          const instructorId = docSnap.id;

          // Query de cursos do instrutor
          const coursesQuery = query(
            collection(db, "courses"),
            where("instructor_uid", "==", instructorId),
          );

          const unsubCourses = onSnapshot(coursesQuery, (coursesSnap) => {
            courseCountMap.set(instructorId, coursesSnap.size);

            // Para cada curso, buscar inscrições
            const courseIds = coursesSnap.docs.map((d) => d.id);

            if (courseIds.length === 0) {
              processedCount++;
              if (processedCount === snapshot.docs.length) {
                updateTutorsList();
              }
              return;
            }

            // Dividir em chunks de 10 para evitar limite do Firestore
            const chunks = [];
            for (let i = 0; i < courseIds.length; i += 10) {
              chunks.push(courseIds.slice(i, i + 10));
            }

            let enrollmentProcessed = 0;

            chunks.forEach((chunk) => {
              // Buscar inscrições com course_id
              const enrollQuery1 = query(
                collection(db, "enrollments"),
                where("course_id", "in", chunk),
              );

              onSnapshot(enrollQuery1, (enrollSnap1) => {
                enrollSnap1.docs.forEach((doc) => {
                  const data = doc.data() as Record<string, any>;
                  const studentId = data.user_uid || data.userId;
                  if (studentId) {
                    studentCountMap.get(instructorId)?.add(studentId);
                  }
                });

                // Também buscar com courseId como fallback
                const enrollQuery2 = query(
                  collection(db, "enrollments"),
                  where("courseId", "in", chunk),
                );

                onSnapshot(enrollQuery2, (enrollSnap2) => {
                  enrollSnap2.docs.forEach((doc) => {
                    const data = doc.data() as Record<string, any>;
                    const studentId = data.user_uid || data.userId;
                    if (studentId) {
                      studentCountMap.get(instructorId)?.add(studentId);
                    }
                  });

                  enrollmentProcessed++;
                  if (enrollmentProcessed === chunks.length) {
                    processedCount++;
                    if (processedCount === snapshot.docs.length) {
                      updateTutorsList();
                    }
                  }
                });
              });
            });
          });
        });

        const updateTutorsList = () => {
          const list = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Partial<UserProfile> &
              Record<string, any>;
            const uniqueStudents = studentCountMap.get(docSnap.id)?.size || 0;
            return {
              id: docSnap.id,
              uid: docSnap.id,
              email: data.email || "N/A",
              full_name: data.full_name || "Tutor",
              avatar_url: data.avatar_url || null,
              role: (data.role || "instructor") as
                | "student"
                | "instructor"
                | "admin",
              status: data.status || "Ativo",
              course_count: courseCountMap.get(docSnap.id) || 0,
              avg_rating: data.rating || 0,
              total_students: uniqueStudents,
              specialty: data.specialty || data.area || data.category || "—",
            } as Tutor;
          });
          setTutors(list);
          setError(null);
          setLoading(false);
          // Salva no cache
          cacheService.set(CACHE_KEY, list, CACHE_TTL);
          console.log("Tutores atualizados e cacheados");
        };

        return () => {
          // Cleanup será feito automaticamente
        };
      },
      (err) => {
        console.error("Erro ao buscar tutores:", err);
        setError("Erro ao buscar tutores");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { tutors, loading, error, refetch: () => {} };
}

export function useTutorDetails(uid: string) {
  const [tutor, setTutor] = useState<TutorWithCourses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    // Buscar perfil do tutor
    const tutorDocRef = doc(db, "profiles", uid);
    const tutorUnsubscribe = onSnapshot(
      tutorDocRef,
      (tutorSnap) => {
        if (!tutorSnap.exists()) {
          setError("Tutor não encontrado");
          setLoading(false);
          return;
        }

        const data = tutorSnap.data() as Partial<UserProfile> &
          Record<string, any>;

        // Buscar cursos do instrutor
        const coursesQuery = query(
          collection(db, "courses"),
          where("instructor_uid", "==", uid),
        );

        const coursesUnsubscribe = onSnapshot(
          coursesQuery,
          (coursesSnap) => {
            const courses: TutorCourse[] = coursesSnap.docs.map((courseDoc) => {
              const courseData = courseDoc.data() as Record<string, any>;
              return {
                id: parseInt(courseDoc.id) || 0,
                title: courseData.title || "Sem título",
                category: courseData.category || "Geral",
                duration: courseData.duration || "0h",
                image_url:
                  courseData.imageUrl ||
                  "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?w=400&q=80&auto=format&fit=crop",
                rating: courseData.rating || 0,
                review_count: courseData.reviewCount || 0,
                relevance_score: courseData.relevanceScore || 0,
                is_active:
                  courseData.isActive || courseData.status === "Publicado",
              } as TutorCourse;
            });

            // Contar alunos únicos inscritos em todos os cursos
            const courseIds = coursesSnap.docs.map((d) => d.id);
            if (courseIds.length === 0) {
              const tutorData: TutorWithCourses = {
                id: tutorSnap.id,
                uid: tutorSnap.id,
                email: data.email || "N/A",
                full_name: data.full_name || "Tutor",
                avatar_url: data.avatar_url || null,
                role: (data.role || "instructor") as
                  | "student"
                  | "instructor"
                  | "admin",
                status: data.status || "Ativo",
                course_count: 0,
                avg_rating: data.rating || 0,
                total_students: 0,
                specialty: data.specialty || data.area || "—",
                courses,
                bio:
                  data.bio ||
                  "Instrutor certificado e experiente na plataforma UEM Cursos online.",
                company: data.company || "",
                specialties: data.specialties || [data.specialty || "—"],
                createdAt: data.createdAt,
              };
              setTutor(tutorData);
              setError(null);
              setLoading(false);
              return;
            }

            // Dividir em chunks de 10
            const chunks = [];
            for (let i = 0; i < courseIds.length; i += 10) {
              chunks.push(courseIds.slice(i, i + 10));
            }

            const uniqueStudents = new Set<string>();
            let enrollmentChunksProcessed = 0;

            chunks.forEach((chunk) => {
              // Buscar inscrições com course_id
              const enrollQuery1 = query(
                collection(db, "enrollments"),
                where("course_id", "in", chunk),
              );

              onSnapshot(enrollQuery1, (enrollSnap1) => {
                enrollSnap1.docs.forEach((doc) => {
                  const enrollData = doc.data() as Record<string, any>;
                  const studentId = enrollData.user_uid || enrollData.userId;
                  if (studentId) {
                    uniqueStudents.add(studentId);
                  }
                });

                // Também buscar com courseId como fallback
                const enrollQuery2 = query(
                  collection(db, "enrollments"),
                  where("courseId", "in", chunk),
                );

                onSnapshot(enrollQuery2, (enrollSnap2) => {
                  enrollSnap2.docs.forEach((doc) => {
                    const enrollData = doc.data() as Record<string, any>;
                    const studentId = enrollData.user_uid || enrollData.userId;
                    if (studentId) {
                      uniqueStudents.add(studentId);
                    }
                  });

                  enrollmentChunksProcessed++;
                  if (enrollmentChunksProcessed === chunks.length) {
                    const tutorData: TutorWithCourses = {
                      id: tutorSnap.id,
                      uid: tutorSnap.id,
                      email: data.email || "N/A",
                      full_name: data.full_name || "Tutor",
                      avatar_url: data.avatar_url || null,
                      role: (data.role || "instructor") as
                        | "student"
                        | "instructor"
                        | "admin",
                      status: data.status || "Ativo",
                      course_count: courses.length,
                      avg_rating: data.rating || 0,
                      total_students: uniqueStudents.size,
                      specialty: data.specialty || data.area || "—",
                      courses,
                      bio:
                        data.bio ||
                        "Instrutor certificado e experiente na plataforma UEM Cursos online.",
                      company: data.company || "",
                      specialties: data.specialties || [data.specialty || "—"],
                      createdAt: data.createdAt,
                    };

                    setTutor(tutorData);
                    setError(null);
                    setLoading(false);
                  }
                });
              });
            });
          },
          (err) => {
            console.error("Erro ao buscar cursos:", err);
            setError("Erro ao carregar cursos");
          },
        );

        return () => coursesUnsubscribe();
      },
      (err) => {
        console.error("Erro ao buscar detalhes do tutor:", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar tutor");
        setLoading(false);
      },
    );

    return () => tutorUnsubscribe();
  }, [uid]);

  return { tutor, loading, error };
}
