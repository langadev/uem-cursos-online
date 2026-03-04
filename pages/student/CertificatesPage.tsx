import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
    Award,
    Check,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Lock,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CertificatePaymentModal, {
    Certificate,
} from "../../components/CertificatePaymentModal";
import { useAuth } from "../../contexts/AuthContext";
import StudentLayout from "../../layouts/StudentLayout";
import { db } from "../../services/firebase";
import { EnrolledCourse } from "../../types";

const CERTIFICATE_DATA: EnrolledCourse[] = [];

const CertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<EnrolledCourse[]>([]);
  const [certMap, setCertMap] = useState<Map<string, Certificate | null>>(
    new Map(),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCourseId, setModalCourseId] = useState<string>("");
  const [modalCourseTitle, setModalCourseTitle] = useState<string>("");

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      return;
    }

    let courseUnsubs: Array<() => void> = [];
    let subsUnsubs: Array<() => void> = [];

    const coursesMap = new Map<string, any>();
    const progressMap = new Map<string, { completed: number; total: number }>();

    const recompute = () => {
      const list: EnrolledCourse[] = [];
      for (const [cid, course] of coursesMap.entries()) {
        const totalLessons = Array.isArray(course?.modules)
          ? course.modules.reduce(
              (acc: number, m: any) =>
                acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
              0,
            )
          : course?.totalLessons || 0;
        const prog = progressMap.get(cid) || {
          completed: 0,
          total: totalLessons,
        };
        const progress =
          totalLessons > 0
            ? Math.min(100, Math.round((prog.completed / totalLessons) * 100))
            : 0;
        list.push({
          id: cid,
          title: course?.title || "Curso",
          category: course?.category || "Geral",
          imageUrl:
            course?.imageUrl ||
            course?.image ||
            "https://via.placeholder.com/320x180.png?text=Curso",
          instructor: course?.instructor || "Tutor",
          progress,
          totalLessons,
          completedLessons: prog.completed,
        } as EnrolledCourse);
      }
      list.sort((a, b) => b.progress - a.progress);
      setItems(list);
    };

    const subscribeByCourse = (courseIds: string[]) => {
      courseUnsubs.forEach((u) => u());
      courseUnsubs = [];
      subsUnsubs.forEach((u) => u());
      subsUnsubs = [];
      if (courseIds.length === 0) {
        setItems([]);
        return;
      }

      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const chunks = chunk(courseIds, 10);

      chunks.forEach((ids) => {
        const qC = query(
          collection(db, "courses"),
          where("__name__", "in", ids),
        );
        const uc = onSnapshot(qC, (snap) => {
          snap.docs.forEach((d) => coursesMap.set(d.id, d.data()));
          recompute();
        });
        courseUnsubs.push(uc);

        const qS = query(
          collection(db, "submissions"),
          where("user_uid", "==", user.uid),
          where("course_id", "in", ids),
        );
        const us = onSnapshot(qS, (snap) => {
          const byCourse = new Map<string, Set<string>>();
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const cid = data?.course_id || data?.courseId;
            const lid = data?.lesson_id || data?.lessonId || d.id;
            if (!cid) return;
            if (!byCourse.has(cid)) byCourse.set(cid, new Set());
            byCourse.get(cid)!.add(String(lid));
          });
          ids.forEach((cid) => {
            const completed = byCourse.get(cid)?.size || 0;
            const total = Array.isArray(coursesMap.get(cid)?.modules)
              ? coursesMap
                  .get(cid)
                  .modules.reduce(
                    (acc: number, m: any) =>
                      acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
                    0,
                  )
              : coursesMap.get(cid)?.totalLessons || 0;
            progressMap.set(cid, { completed, total });
          });
          recompute();
        });
        subsUnsubs.push(us);

        // Procurar aulas marcadas como concluídas (lesson-completions) ✅ NOVO
        const qLC = query(
          collection(db, "lesson-completions"),
          where("user_uid", "==", user.uid),
          where("course_id", "in", ids),
        );
        const ulc = onSnapshot(qLC, (snap) => {
          const byCourse = new Map<string, Set<string>>();
          snap.docs.forEach((d) => {
            const data: any = d.data();
            const cid = data?.course_id;
            const lid = data?.lesson_id;
            if (!cid || !lid) return;
            if (!byCourse.has(cid)) byCourse.set(cid, new Set());
            byCourse.get(cid)!.add(String(lid));
          });
          ids.forEach((cid) => {
            const prevProg = progressMap.get(cid);
            const completed = byCourse.get(cid)?.size || 0;
            const total = Array.isArray(coursesMap.get(cid)?.modules)
              ? coursesMap
                  .get(cid)
                  .modules.reduce(
                    (acc: number, m: any) =>
                      acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
                    0,
                  )
              : coursesMap.get(cid)?.totalLessons || 0;
            // Usar o máximo entre submissions e lesson-completions
            const maxCompleted = Math.max(prevProg?.completed || 0, completed);
            progressMap.set(cid, { completed: maxCompleted, total });
          });
          recompute();
        });
        subsUnsubs.push(ulc);

        // Escutar certificados nesta batch para este estudante
        const qCert = query(
          collection(db, "certificates"),
          where("student_uid", "==", user.uid),
          where("course_id", "in", ids),
        );
        const ucCert = onSnapshot(qCert, (snap) => {
          // Atualiza certMap com últimos documentos (assume 1 por estudante+course)
          setCertMap((prev) => {
            const next = new Map(prev);
            snap.docs.forEach((d) => {
              const data: any = d.data();
              if (!data || !data.course_id) return;
              next.set(data.course_id, { id: d.id, ...data } as Certificate);
            });
            // Garantir nulos para courses sem certificado retornado
            ids.forEach((cid) => {
              if (!next.has(cid)) next.set(cid, null);
            });
            return next;
          });
        });
        subsUnsubs.push(ucCert);
      });
    };

    const handleEnrollSnap = (snap: any) => {
      const ids = new Set<string>();
      snap.docs.forEach((d: any) => {
        const data: any = d.data();
        const cid = data?.course_id || data?.courseId;
        if (cid) ids.add(cid);
      });
      subscribeByCourse(Array.from(ids));
    };

    const u1 = onSnapshot(
      query(collection(db, "enrollments"), where("user_uid", "==", user.uid)),
      handleEnrollSnap,
    );
    const u2 = onSnapshot(
      query(collection(db, "enrollments"), where("userId", "==", user.uid)),
      handleEnrollSnap,
    );
    return () => {
      u1();
      u2();
      courseUnsubs.forEach((u) => u());
      subsUnsubs.forEach((u) => u());
    };
  }, [user?.uid]);

  const completedCount = useMemo(
    () => items.filter((c) => c.progress === 100).length,
    [items],
  );

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Award className="w-8 h-8 text-brand-accent" />
            Meus Certificados
          </h1>
          <p className="text-gray-500 mt-1">
            Conclua seus cursos para desbloquear seus certificados de
            especialização.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-brand-green">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Concluídos</p>
              <p className="text-2xl font-bold text-gray-900">
                {completedCount}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Em Andamento</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.length - completedCount}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {items.map((course) => (
            <CertificateCard
              key={course.id}
              course={course}
              existingCert={certMap.get(course.id)}
              onRequest={(id, title) => {
                setModalCourseId(id);
                setModalCourseTitle(title);
                setModalOpen(true);
              }}
            />
          ))}
        </div>

        <div className="mt-12 p-6 bg-brand-dark/5 rounded-2xl border border-brand-dark/10 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-brand-dark text-white p-3 rounded-full">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-center md:text-left">
            <h4 className="font-bold text-gray-900">
              Precisa de ajuda com seu certificado?
            </h4>
            <p className="text-sm text-gray-600">
              Se você concluiu todas as aulas e o certificado ainda não
              apareceu, entre em contato com nosso suporte.
            </p>
          </div>
          <button className="md:ml-auto px-6 py-2 bg-brand-dark text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors">
            Falar com Suporte
          </button>
        </div>
        {/* Certificate modal (abre para solicitar ou baixar) */}
        {modalOpen && (
          <CertificatePaymentModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            courseId={modalCourseId}
            courseTitle={modalCourseTitle}
            onSuccess={() => {
              setModalOpen(false);
            }}
          />
        )}
      </div>
    </StudentLayout>
  );
};

const CertificateCard: React.FC<{
  course: EnrolledCourse;
  onRequest: (id: string, title: string) => void;
  existingCert?: Certificate | null;
}> = ({ course, onRequest, existingCert }) => {
  const isCompleted = course.progress === 100;
  const navigate = useNavigate();

  return (
    <div
      className={`bg-white rounded-2xl border ${isCompleted ? "border-brand-green/20" : "border-gray-100"} shadow-sm overflow-hidden flex flex-col sm:flex-row transition-all hover:shadow-md`}
    >
      <div className="w-full sm:w-48 h-40 sm:h-auto relative flex-shrink-0">
        <img
          src={course.imageUrl}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 ${isCompleted ? "opacity-100" : "opacity-0"} transition-opacity`}
        >
          {isCompleted && (
            <Award className="w-12 h-12 text-brand-accent drop-shadow-lg" />
          )}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {course.category}
          </span>
          {isCompleted ? (
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Disponível
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Bloqueado
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-4 leading-tight">
          {course.title}
        </h3>

        <div className="mt-auto space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span
                className={
                  isCompleted ? "text-brand-green" : "text-brand-green"
                }
                style={{ color: "#0E7038" }}
              >
                {isCompleted ? "Concluído" : `${course.progress}% de Progresso`}
              </span>
              <span style={{ color: "#0E7038" }}>
                {course.completedLessons}/{course.totalLessons} Aulas
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${isCompleted ? "bg-brand-green" : "bg-brand-accent"}`}
                style={{ width: `${course.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              disabled={!isCompleted}
              onClick={() => navigate(`/aluno/certificado/${course.id}`)}
              className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
              ${
                isCompleted
                  ? "bg-brand-dark text-white hover:bg-black shadow-lg shadow-black/10"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
            `}
            >
              {isCompleted ? (
                <>
                  <Download className="w-4 h-4" />
                  Baixar Certificado
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Certificado Indisponível
                </>
              )}
            </button>

            {/* Solicitar / Gerir pagamento */}
            <button
              onClick={() => onRequest(course.id, course.title)}
              disabled={!isCompleted}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${isCompleted ? "bg-brand-green text-white hover:bg-brand-dark" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              {existingCert?.status === "confirmed" ? (
                <>
                  <Download className="w-4 h-4" />
                  Baixar / Gerir Certificado
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Solicitar Certificado
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificatesPage;

// Modal render colocado no final do arquivo para manter componente principal limpo
