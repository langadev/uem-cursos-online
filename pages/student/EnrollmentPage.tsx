import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit as qbLimit,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    Loader2,
    PlayCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import StudentLayout from "../../layouts/StudentLayout";
import { db } from "../../services/firebase";

const EnrollmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const ref = doc(db, "courses", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setCourse({ id: snap.id, ...snap.data() });
        } else {
          setCourse(null);
        }
      } catch (e) {
        console.error("Falha ao carregar curso:", e);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const check = async () => {
      if (!user?.uid || !id) {
        setIsEnrolled(false);
        setChecking(false);
        return;
      }
      try {
        const q = query(
          collection(db, "enrollments"),
          where("course_id", "==", id),
          where("user_uid", "==", user.uid),
          qbLimit(1),
        );
        const r = await getDocs(q);
        setIsEnrolled(!r.empty);
      } catch (e) {
        setIsEnrolled(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [user?.uid, id]);

  // Todos os cursos são gratuitos para frequentar
  const isFree = true;

  const handleConfirm = async () => {
    if (!id || !user?.uid) return;
    if (isEnrolled) {
      navigate(`/aluno/sala-de-aula/${id}`);
      return;
    }
    // Sempre permite inscrição gratuita
    try {
      setSubmitting(true);
      await addDoc(collection(db, "enrollments"), {
        course_id: id,
        user_uid: user.uid,
        enrolledAt: serverTimestamp(),
        course_title: course?.title || "",
        instructor: course?.instructor || "",
        instructor_uid: course?.instructor_uid || course?.creator_uid || null,
        imageUrl: course?.imageUrl || "",
        status: "active",
        certificatePaid: false,
        certificatePrice: course?.certificatePrice || 0,
      });
      setIsEnrolled(true);
      navigate(`/aluno/sala-de-aula/${id}`);
    } catch (e) {
      console.error("Erro ao confirmar inscrição:", e);
      alert("Não foi possível concluir a inscrição. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto py-16">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Carregando…</span>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!course) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto py-16">
          <div className="flex items-center gap-3 text-red-600 font-medium">
            <AlertCircle className="w-5 h-5" />
            <span>Curso não encontrado.</span>
          </div>
          <Link
            to="/cursos"
            className="inline-flex items-center gap-2 mt-6 text-brand-green font-bold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar aos cursos
          </Link>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto py-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/cursos" className="hover:text-brand-green font-medium">
            Cursos
          </Link>
          <span>›</span>
          <Link
            to={`/cursos/${course.id}`}
            className="hover:text-brand-green font-medium"
          >
            {course.title}
          </Link>
          <span>›</span>
          <span className="text-gray-700 font-semibold">
            Confirmar Inscrição
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Confirmar Inscrição
            </h1>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900">
                    Este curso é gratuito para frequentar
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Todos os cursos são gratuitos! Clique em "Confirmar
                    Inscrição" para começar. O certificado pode ser pago após
                    completar o curso.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/cursos/${course.id}`}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar ao curso
                </Link>
                <button
                  onClick={handleConfirm}
                  disabled={submitting || checking || !isFree}
                  className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-dark disabled:opacity-70 text-white font-bold px-5 py-2.5 rounded-lg shadow-md shadow-green-900/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Confirmando…
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />{" "}
                      {isEnrolled
                        ? "Ir para a sala de aula"
                        : "Confirmar Inscrição"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <aside>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-gray-100">
                {course?.imageUrl ? (
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    Prévia
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Tutor:{" "}
                  <span className="font-medium text-gray-700">
                    {course.instructor || "Tutor"}
                  </span>
                </p>
                <div className="text-xs text-gray-500">
                  Idioma:{" "}
                  <span className="font-semibold text-gray-700">
                    {course.language || "Português"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Duração:{" "}
                  <span className="font-semibold text-gray-700">
                    {course.duration || "0h"}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StudentLayout>
  );
};

export default EnrollmentPage;
