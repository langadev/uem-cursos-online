import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  limit as qbLimit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Award,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  File,
  FileText,
  Image,
  Lock,
  Menu,
  Play,
  PlayCircle,
  Send,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CertificatePaymentModal from "../../components/CertificatePaymentModal";
import MascotReader from "../../components/MascotReader";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";
import { isSupabaseConfigured, supabase } from "../../services/supabase";

// PDF Viewer Imports
import { Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const CoursePlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [course, setCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFinishingLesson, setIsFinishingLesson] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [lastLessonIdFromDb, setLastLessonIdFromDb] = useState("");
  const [isInitialLessonSet, setIsInitialLessonSet] = useState(false);
  const [fallbackModules, setFallbackModules] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [answersByQ, setAnswersByQ] = useState<Record<string, any[]>>({});
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const answersSubsRef = useRef<Record<string, () => void>>({});
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(),
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  // reading/navigation state is now driven by the mascot reader component
  const [exerciseResults, setExerciseResults] = useState<
    Record<string, boolean>
  >({});
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    new Set(),
  );

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  // Mostrar toast notification que desaparece automaticamente
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Controlar leitura de texto (text-to-speech)
  // legacy reading functionality removed; see MascotReader component instead.

  // timer-based gating removed; lessons are now marked complete when the mascot reader finishes (handled below)

  // Cleanup de subscriptions de respostas ao desmontar
  useEffect(() => {
    return () => {
      Object.values(answersSubsRef.current || {}).forEach((u) => {
        try {
          if (typeof u === "function") u();
        } catch {}
      });
      answersSubsRef.current = {};
      // Parar leitura ao desmontar
      window.speechSynthesis.cancel();
    };
  }, []);

  const ensureAbsoluteFileUrl = (val?: string) => {
    const str = (val || "").toString().trim();
    if (!str) return "";

    // Se já é URL absoluta HTTP(S), retorna como está
    if (/^https?:\/\//i.test(str)) {
      return str;
    }

    // Se é uma URL de dados (blob, etc), retorna como está
    if (/^(blob|data):/i.test(str)) {
      return str;
    }

    // Se começa com /, trata como caminho relativo no Firebase Storage
    if (str.startsWith("/")) {
      try {
        const opts: any = (db as any)?.app?.options || {};
        const projectId: string | undefined = opts?.projectId;
        let bucket: string = projectId
          ? `${projectId}.appspot.com`
          : opts?.storageBucket || "";
        if (bucket.endsWith("firebasestorage.app") && projectId) {
          bucket = `${projectId}.appspot.com`;
        }
        if (!bucket) return str;
        const path = encodeURIComponent(str.slice(1));
        const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}`;
        return `${base}?alt=media`;
      } catch (err) {
        console.error("Erro ao construir URL Firebase:", err);
        return str;
      }
    }

    // Se não começa com http(s) nem /, retorna como está
    // (pode ser um ID de doc Google, reference ID, etc)
    return str;
  };

  const getOpenInNewTabUrl = (url?: string) => {
    const str = (url || "").toString().trim();
    if (!str) return "#";

    // URLs do Supabase com token assinado devem ser mantidas intactas
    if (str.includes("supabase.co") && str.includes("token=")) {
      return str;
    }

    // Para outros tipos, tenta garantir URL absoluta
    return ensureAbsoluteFileUrl(url);
  };

  const getDownloadUrl = (url?: string) => {
    const src = ensureAbsoluteFileUrl(url);
    if (!src || src === "#") return "#";

    // Debug: Log qual URL está sendo processada
    console.log("[CoursePlayer] getDownloadUrl input:", url);
    console.log("[CoursePlayer] getDownloadUrl after ensureAbsolute:", src);

    try {
      const u = new URL(src);
      const host = u.hostname;
      const path = u.pathname;

      // Google Docs - exportar como PDF
      if (host.includes("docs.google.com")) {
        const types = ["document", "spreadsheets", "presentation"];
        const t = types.find((ti) => path.includes(`/${ti}/d/`));
        const docId = path.split("/d/")[1]?.split("/")[0];
        if (docId && t) {
          return `https://docs.google.com/${t}/d/${docId}/export?format=pdf`;
        }
      }

      // Google Drive
      if (host.includes("drive.google.com")) {
        let driveId: string | null = null;
        if (path.includes("/file/d/"))
          driveId = path.split("/file/d/")[1]?.split("/")[0] || null;
        if (!driveId) driveId = u.searchParams.get("id");
        if (driveId) {
          return `https://drive.google.com/uc?id=${driveId}&export=download`;
        }
      }

      // Para outras URLs (Supabase, Firebase, etc), retorna como está
      // O navegador já pode fazer o download direto
      return src;
    } catch (err) {
      // Se não conseguir fazer parse como URL, retorna como está
      console.error("Erro ao processar URL para download:", err);
      return src;
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !id || !user?.uid) return;

      // Sanitizar nome do arquivo - remover caracteres especiais
      const sanitizedFileName = file.name
        .normalize("NFD") // Decompor caracteres acentuados
        .replace(/[\u0300-\u036f]/g, "") // Remover diacríticos
        .replace(/[^a-zA-Z0-9._-]/g, "_") // Substituir caracteres especiais por underscore
        .replace(/_{2,}/g, "_"); // Remover underscores múltiplos

      const filePath = `submissions/${id}/${user.uid}/${Date.now()}_${sanitizedFileName}`;
      let publicUrl = "";
      if (isSupabaseConfigured) {
        const { error: upErr } = await supabase.storage
          .from("course-files")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || "application/octet-stream",
          });
        if (upErr) throw upErr;
        publicUrl =
          supabase.storage.from("course-files").getPublicUrl(filePath).data
            .publicUrl || "";
      } else {
        alert("Upload indisponível: Supabase não configurado.");
        return;
      }
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      await addDoc(collection(db, "submissions"), {
        course_id: id,
        lesson_id: currentLessonId || null,
        user_uid: user.uid,
        user_name: user.displayName || "Formando",
        instructor_uid: course?.instructor_uid || course?.creator_uid || null,
        course_title: course?.title || "",
        lesson_title: current?.lesson?.title || "",
        fileName: file.name,
        fileType: file.type || "",
        size: sizeMb,
        url: publicUrl,
        createdAt: serverTimestamp(),
      });
      e.target.value = "";
    } catch (err) {
      console.error("Falha no upload do exercício:", err);
      alert("Não foi possível enviar seu exercício. Tente novamente.");
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
  };

  // Carregar curso e acompanhar em tempo real
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "courses", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setCourse({ id: snap.id, ...snap.data() } as any);
        else setCourse(null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [id]);

  // Replies helpers
  const ensureAnswersSub = (qid: string) => {
    if (answersSubsRef.current[qid]) return;
    try {
      const q = query(
        collection(db, "questions", qid, "answers"),
        orderBy("createdAt", "asc"),
      );
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAnswersByQ((prev) => ({ ...prev, [qid]: list }));
      });
      answersSubsRef.current[qid] = unsub;
    } catch {}
  };
  const toggleReplies = (qid: string) => {
    setOpenReplies((prev) => {
      const open = !prev[qid];
      if (open) ensureAnswersSub(qid);
      else {
        const u = answersSubsRef.current[qid];
        if (u) {
          u();
          delete answersSubsRef.current[qid];
        }
      }
      return { ...prev, [qid]: open };
    });
  };
  const sendReply = async (q: any) => {
    const txt = (replyDraft[q.id] || "").trim();
    if (!txt || !user?.uid) return;
    try {
      await addDoc(collection(db, "questions", q.id, "answers"), {
        text: txt,
        author_uid: user.uid,
        author_name: user.displayName || profile?.full_name || "Estudante",
        author_role: "student",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "questions", q.id), {
        repliesCount: increment(1),
        lastActivity: serverTimestamp(),
      });
      setReplyDraft((prev) => ({ ...prev, [q.id]: "" }));
      setOpenReplies((prev) => ({ ...prev, [q.id]: true }));
      ensureAnswersSub(q.id);
      showToast("Resposta enviada!", "success");
    } catch {
      showToast("Erro ao enviar resposta.", "error");
    }
  };

  // Marcar aula como concluída
  const markLessonAsComplete = async () => {
    if (isFinishingLesson) return;
    if (!user?.uid || !id || !current?.lesson?.id) {
      showToast("Erro ao marcar aula como concluída.", "error");
      return;
    }

    const completedLessonId = current.lesson.id;
    const completedLessonTitle = current.lesson.title;

    try {
      setIsFinishingLesson(true);
      
      // Adicionar registro de conclusão no Firebase
      await addDoc(collection(db, "lesson-completions"), {
        course_id: id,
        lesson_id: completedLessonId,
        user_uid: user.uid,
        user_name: user.displayName || "Formando",
        course_title: course?.title || "",
        lesson_title: completedLessonTitle || "",
        instructor_uid: course?.instructor_uid || course?.creator_uid || null,
        completedAt: serverTimestamp(),
      });

      // Atualizar o estado local
      setCompletedLessons((prev) => {
        const updated = new Set(prev);
        updated.add(completedLessonId);
        return updated;
      });

      // Ir para a próxima aula se existir
      const idx = allLessons.findIndex(
        (x) => x.lesson.id === completedLessonId,
      );
      
      if (idx >= 0 && idx < allLessons.length - 1) {
        setCurrentLessonId(allLessons[idx + 1].lesson.id);
        showToast(
          "Aula concluída com sucesso! Passando para a próxima...",
          "success",
        );
      } else {
        // Se era a última aula
        showToast(
          "Parabéns! Você completou todas as aulas do curso!",
          "success",
        );

        // Se era a última aula, marcar como completo no enrollment
        const newCompleted = new Set(completedLessons);
        newCompleted.add(completedLessonId);
        const newProgress = Math.round(
          (newCompleted.size / allLessons.length) * 100,
        );
        
        if (newProgress === 100) {
          try {
            const enrollmentQ = query(
              collection(db, "enrollments"),
              where("course_id", "==", id),
              where("user_uid", "==", user.uid),
            );
            const enrollmentSnap = await getDocs(enrollmentQ);
            enrollmentSnap.forEach(async (enrollDoc) => {
              await updateDoc(enrollDoc.ref, {
                progress: 100,
                completed: true,
                completedAt: serverTimestamp(),
              });
            });
          } catch (err) {
            console.warn("Erro ao atualizar enrollment com conclusão:", err);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao marcar aula como concluída:", err);
      showToast("Não foi possível marcar a aula como concluída.", "error");
    } finally {
      setIsFinishingLesson(false);
    }
  };

  // Marcar exercício como concluído
  const markExerciseAsComplete = async (exId: string) => {
    if (!id || !user?.uid) return;
    try {
      // Primeiro atualizar estado local para feedback imediato
      setCompletedExercises((prev) => {
        const next = new Set(prev);
        next.add(exId);
        return next;
      });
      setExerciseResults((prev) => ({ ...prev, [exId]: true }));

      // Se é exercício exibido como aula, também marcar como lição completa
      if (current?.lesson?.isExercise) {
        setCompletedLessons((prev) => {
          const updated = new Set(prev);
          updated.add(currentLessonId);
          return updated;
        });
      }

      // Verificar se já existe para evitar duplicatas (opcional, mas bom ter)
      await addDoc(collection(db, "exercise-completions"), {
        course_id: id,
        exercise_id: exId,
        user_uid: user.uid,
        completedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erro ao salvar conclusão de exercício:", err);
    }
  };

  // Verificar inscrição do aluno
  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user?.uid || !id) {
        setIsEnrolled(false);
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
        if (!r.empty) {
            setIsEnrolled(true);
            const data = r.docs[0].data();
            if (data.last_lesson_id) {
                setLastLessonIdFromDb(data.last_lesson_id);
            }
        } else {
            setIsEnrolled(false);
        }
      } catch {
        setIsEnrolled(false);
      }
    };
    checkEnrollment();
  }, [user?.uid, id]);

  // Carregar aulas completadas do aluno para este curso
  useEffect(() => {
    if (!id || !user?.uid) {
      setCompletedLessons(new Set());
      setCompletedExercises(new Set());
      return;
    }
    try {
      const q = query(
        collection(db, "lesson-completions"),
        where("course_id", "==", id),
        where("user_uid", "==", user.uid),
      );
      const unsub = onSnapshot(q, (snap) => {
        const completed = new Set<string>();
        snap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.lesson_id) {
            completed.add(data.lesson_id);
          }
        });
        setCompletedLessons(completed);
      });

      // Carregar exercícios completados
      const exQ = query(
        collection(db, "exercise-completions"),
        where("course_id", "==", id),
        where("user_uid", "==", user.uid),
      );
      const exUnsub = onSnapshot(exQ, (snap) => {
        const completed = new Set<string>();
        const results: Record<string, boolean> = {};
        snap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.exercise_id) {
            completed.add(data.exercise_id);
            results[data.exercise_id] = true;
          }
        });
        setCompletedExercises(completed);
        setExerciseResults((prev) => ({ ...prev, ...results }));
      });

      return () => {
        unsub();
        exUnsub();
      };
    } catch {
      setCompletedLessons(new Set());
      setCompletedExercises(new Set());
    }
  }, [id, user?.uid]);

  // Carregar dúvidas (questions) em tempo real para o curso atual
  useEffect(() => {
    if (!id) return;

    let unsub: (() => void) | null = null;

    const startQuery = (useOrderBy: boolean) => {
      const q = useOrderBy
        ? query(
            collection(db, "questions"),
            where("course_id", "==", id),
            orderBy("createdAt", "desc"),
          )
        : query(collection(db, "questions"), where("course_id", "==", id));

      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setQuestions(list);
        },
        (err) => {
          console.error("Erro na consulta de questões:", err);
          if (useOrderBy) {
            console.log(
              "Tentando consulta sem orderBy (provável falta de índice)...",
            );
            if (unsub) unsub();
            unsub = startQuery(false);
          }
        },
      );
    };

    unsub = startQuery(true);
    return () => {
      if (unsub) unsub();
    };
  }, [id]);

  // Carregar submissões do aluno para este curso
  useEffect(() => {
    if (!id || !user?.uid) {
      setUploadedFiles([]);
      return;
    }
    try {
      const startSubmissionsQuery = (useOrderBy: boolean) => {
        const q = useOrderBy 
          ? query(
              collection(db, "submissions"),
              where("course_id", "==", id),
              where("user_uid", "==", user.uid),
              orderBy("createdAt", "desc"),
            )
          : query(
              collection(db, "submissions"),
              where("course_id", "==", id),
              where("user_uid", "==", user.uid),
            );

        return onSnapshot(q, (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setUploadedFiles(list);
        }, (err) => {
          console.error("Erro na consulta de submissões:", err);
          if (useOrderBy) {
            console.log("Tentando consulta de submissões sem orderBy...");
            unsub = startSubmissionsQuery(false);
          }
        });
      };

      let unsub = startSubmissionsQuery(true);
      return () => unsub();
    } catch (err) {
      console.error("Erro ao configurar listener de submissões:", err);
    }
  }, [id, user?.uid]);

  // Normalizar módulos/aulas do documento
  const normalizedModules = useMemo(() => {
    const raw = (course?.modules ??
      course?.modulos ??
      course?.curriculum ??
      course?.curriculum?.modules ??
      course?.conteudos ??
      course?.conteudo ??
      []) as any;
    const toArray = (val: any) =>
      Array.isArray(val)
        ? val
        : val && typeof val === "object"
          ? Object.values(val)
          : [];
    let modulesArr = toArray(raw);
    if (
      (!modulesArr || modulesArr.length === 0) &&
      Array.isArray((course as any)?.lessons)
    ) {
      modulesArr = [
        { id: "0", title: "Módulo 1", lessons: (course as any).lessons },
      ];
    }
    return modulesArr.map((m: any, mi: number) => {
      const lessonsRaw =
        m?.lessons ?? m?.items ?? m?.contents ?? m?.conteudos ?? [];
      const lessonsArr = toArray(lessonsRaw).map((l: any, li: number) => {
        const id = l?.id ?? `${mi}-${li}`;
        const title = l?.title ?? l?.name ?? l?.titulo ?? `Aula ${li + 1}`;
        const tRaw = (l?.type ?? l?.tipo ?? l?.kind ?? l?.lessonType ?? "")
          .toString()
          .toLowerCase();
        const urlCandidate: string =
          l?.videoUrl ??
          l?.file ??
          l?.fileUrl ??
          l?.documentUrl ??
          l?.url ??
          "";
        const lowerUrl =
          typeof urlCandidate === "string" ? urlCandidate.toLowerCase() : "";
        const isVideoUrl =
          typeof urlCandidate === "string" &&
          (lowerUrl.includes("youtube.com") ||
            lowerUrl.includes("youtu.be") ||
            lowerUrl.endsWith(".mp4") ||
            lowerUrl.endsWith(".webm") ||
            lowerUrl.endsWith(".m3u8"));
        const isDocUrl =
          typeof urlCandidate === "string" &&
          (lowerUrl.endsWith(".pdf") ||
            lowerUrl.endsWith(".doc") ||
            lowerUrl.endsWith(".docx") ||
            lowerUrl.endsWith(".ppt") ||
            lowerUrl.endsWith(".pptx") ||
            lowerUrl.endsWith(".xls") ||
            lowerUrl.endsWith(".xlsx") ||
            lowerUrl.includes("drive.google.com"));
          const isImageUrl =
            typeof urlCandidate === "string" &&
            (lowerUrl.endsWith(".jpg") ||
              lowerUrl.endsWith(".jpeg") ||
              lowerUrl.endsWith(".png") ||
              lowerUrl.endsWith(".gif") ||
              lowerUrl.endsWith(".webp") ||
              lowerUrl.endsWith(".svg"));
          let type: "video" | "text" | "document" | "quiz" | "image" = "text";
          if (tRaw) {
            if (["video", "vídeo", "youtube", "mp4"].includes(tRaw))
              type = "video";
            else if (["image", "imagem", "foto", "photo"].includes(tRaw))
              type = "image";
            else if (
              [
                "document",
                "documento",
                "pdf",
                "doc",
                "docx",
                "ppt",
                "pptx",
                "xls",
                "xlsx",
                "arquivo",
                "file",
              ].includes(tRaw)
            )
              type = "document";
            else if (
              [
                "quiz",
                "questionario",
                "questionário",
                "perguntas",
                "teste",
              ].includes(tRaw)
            )
              type = "quiz";
            else if (
              ["text", "texto", "article", "artigo", "post"].includes(tRaw)
            )
              type = "text";
            else if (isVideoUrl) type = "video";
            else if (isImageUrl) type = "image";
            else if (isDocUrl || l?.file) type = "document";
            else type = "text";
          } else {
            if (isVideoUrl) type = "video";
            else if (isImageUrl) type = "image";
            else if (isDocUrl || l?.file) type = "document";
            else type = "text";
          }
        let content = "";
        if (type === "video")
          content = l?.videoUrl ?? l?.url ?? l?.content ?? "";
        else if (type === "document" || type === "image")
          content =
            l?.file ??
            l?.fileUrl ??
            l?.documentUrl ??
            l?.imageUrl ??
            l?.url ??
            l?.content ??
            "";
        else
          content =
            (typeof l?.texto === "string" ? l.texto : undefined) ??
            (typeof l?.html === "string" ? l.html : undefined) ??
            (typeof l?.body === "string" ? l.body : undefined) ??
            (typeof l?.markdown === "string" ? l.markdown : undefined) ??
            (typeof l?.content === "string" ? l.content : undefined) ??
            "";
        const duration = l?.duration ?? l?.duracao ?? l?.length ?? "";
        return { ...l, id, title, type, content, duration };
      });
      return {
        ...m,
        id: m?.id ?? `${mi}`,
        title: m?.title ?? m?.name ?? m?.titulo ?? `Módulo ${mi + 1}`,
        lessons: lessonsArr,
      };
    });
  }, [course]);

  // Fallback: subcoleções modules/lessons
  useEffect(() => {
    const loadFromSubcollections = async () => {
      if (!id) return;
      if ((normalizedModules?.length ?? 0) > 0) return;
      if ((fallbackModules?.length ?? 0) > 0) return;
      try {
        const modsSnap = await getDocs(
          collection(db, "courses", id, "modules"),
        );
        const modPromises = modsSnap.docs.map(async (md, mi) => {
          const mdl = md.data();
          const lessonsSnap = await getDocs(
            collection(db, "courses", id, "modules", md.id, "lessons"),
          );
          const lessons = lessonsSnap.docs.map((ld, li) => {
            const l = ld.data();
            const tRaw = (l?.type ?? l?.tipo ?? l?.kind ?? l?.lessonType ?? "")
              .toString()
              .toLowerCase();
            const urlCandidate: string =
              l?.videoUrl ??
              l?.file ??
              l?.fileUrl ??
              l?.documentUrl ??
              l?.url ??
              "";
            const lowerUrl =
              typeof urlCandidate === "string"
                ? urlCandidate.toLowerCase()
                : "";
            const isVideoUrl =
              typeof urlCandidate === "string" &&
              (lowerUrl.includes("youtube.com") ||
                lowerUrl.includes("youtu.be") ||
                lowerUrl.endsWith(".mp4") ||
                lowerUrl.endsWith(".webm") ||
                lowerUrl.endsWith(".m3u8"));
            const isDocUrl =
              typeof urlCandidate === "string" &&
              (lowerUrl.endsWith(".pdf") ||
                lowerUrl.endsWith(".doc") ||
                lowerUrl.endsWith(".docx") ||
                lowerUrl.endsWith(".ppt") ||
                lowerUrl.endsWith(".pptx") ||
                lowerUrl.endsWith(".xls") ||
                lowerUrl.endsWith(".xlsx") ||
                lowerUrl.includes("drive.google.com"));
            const isImageUrl =
              typeof urlCandidate === "string" &&
              (lowerUrl.endsWith(".jpg") ||
                lowerUrl.endsWith(".jpeg") ||
                lowerUrl.endsWith(".png") ||
                lowerUrl.endsWith(".gif") ||
                lowerUrl.endsWith(".webp") ||
                lowerUrl.endsWith(".svg"));
            let type: "video" | "text" | "document" | "quiz" | "image" = "text";
            if (tRaw) {
              if (["video", "vídeo", "youtube", "mp4"].includes(tRaw))
                type = "video";
              else if (["image", "imagem", "foto", "photo"].includes(tRaw))
                type = "image";
              else if (
                [
                  "document",
                  "documento",
                  "pdf",
                  "doc",
                  "docx",
                  "ppt",
                  "pptx",
                  "xls",
                  "xlsx",
                  "arquivo",
                  "file",
                ].includes(tRaw)
              )
                type = "document";
              else if (
                [
                  "quiz",
                  "questionario",
                  "questionário",
                  "perguntas",
                  "teste",
                ].includes(tRaw)
              )
                type = "quiz";
              else if (
                ["text", "texto", "article", "artigo", "post"].includes(tRaw)
              )
                type = "text";
              else if (isVideoUrl) type = "video";
              else if (isImageUrl) type = "image";
              else if (isDocUrl || (l as any)?.file) type = "document";
              else type = "text";
            } else {
              if (isVideoUrl) type = "video";
              else if (isImageUrl) type = "image";
              else if (isDocUrl || (l as any)?.file) type = "document";
              else type = "text";
            }
            let content = "";
            if (type === "video")
              content = l?.videoUrl ?? l?.url ?? l?.content ?? "";
            else if (type === "document" || type === "image")
              content =
                (l as any)?.file ??
                (l as any)?.fileUrl ??
                (l as any)?.documentUrl ??
                l?.url ??
                l?.content ??
                "";
            else
              content =
                (typeof (l as any)?.texto === "string"
                  ? (l as any).texto
                  : undefined) ??
                (typeof (l as any)?.html === "string"
                  ? (l as any).html
                  : undefined) ??
                (typeof (l as any)?.body === "string"
                  ? (l as any).body
                  : undefined) ??
                (typeof (l as any)?.markdown === "string"
                  ? (l as any).markdown
                  : undefined) ??
                (typeof l?.content === "string" ? l.content : undefined) ??
                "";
            const duration = l?.duration ?? l?.duracao ?? l?.length ?? "";
            return {
              id: ld.id,
              title: l?.title ?? l?.name ?? l?.titulo ?? `Aula ${li + 1}`,
              type,
              content,
              duration,
            };
          });
          return {
            id: md.id,
            title: mdl?.title ?? mdl?.name ?? mdl?.titulo ?? `Módulo ${mi + 1}`,
            lessons,
          };
        });
        const subs = await Promise.all(modPromises);
        setFallbackModules(subs);
      } catch {
        setFallbackModules([]);
      }
    };
    loadFromSubcollections();
  }, [id, normalizedModules, fallbackModules]);

  const displayModules = useMemo(() => {
    return (normalizedModules?.length ?? 0) > 0
      ? normalizedModules
      : fallbackModules;
  }, [normalizedModules, fallbackModules]);

  // Lista linear de aulas para navegação (agora incluindo exercícios interativos)
  const allLessons = useMemo(() => {
    const out: any[] = [];
    displayModules.forEach((m: any, mi: number) => {
      (m?.lessons || []).forEach((l: any, li: number) => {
        out.push({ moduleIndex: mi, lessonIndex: li, module: m, lesson: l });
        // Adicionar exercícios desta aula como "aulas" fictícias
        const lessonExercises = (course?.interactiveExercises || []).filter(
          (ex: any) => String(ex.lessonId || ex.lesson_id) === String(l.id)
        );
        lessonExercises.forEach((ex: any, ei: number) => {
          out.push({
            moduleIndex: mi,
            lessonIndex: li,
            module: m,
            lesson: {
              id: `ex-${ex.id}`,
              title: ex.title || "Teste da Aula",
              type: "interactive",
              exerciseData: ex,
              isExercise: true,
            },
          });
        });
      });
    });
    return out;
  }, [displayModules, course?.interactiveExercises]);

  // Atribuir aula padrão e abrir primeiro módulo
  useEffect(() => {
    if (allLessons.length > 0 && !isInitialLessonSet) {
      if (lastLessonIdFromDb && allLessons.some(x => x.lesson.id === lastLessonIdFromDb)) {
        setCurrentLessonId(lastLessonIdFromDb);
      } else if (!currentLessonId) {
        const firstVideo =
          allLessons.find(
            (x) => x.lesson?.type === "video" && x.lesson?.content,
          ) || allLessons[0];
        setCurrentLessonId(firstVideo.lesson.id);
      }
      setIsInitialLessonSet(true);
    }
    
    if (openModules.length === 0 && displayModules.length > 0) {
      setOpenModules([displayModules[0]?.id || "0"]);
    }
  }, [allLessons, currentLessonId, displayModules, openModules.length, lastLessonIdFromDb, isInitialLessonSet]);

  // Salvar última aula acessada no enrollment
  useEffect(() => {
    if (!id || !user?.uid || !currentLessonId || !isEnrolled) return;
    
    const saveLastLesson = async () => {
        try {
            const q = query(
                collection(db, "enrollments"),
                where("course_id", "==", id),
                where("user_uid", "==", user.uid)
            );
            const snap = await getDocs(q);
            snap.forEach(async (d) => {
                await updateDoc(d.ref, {
                    last_lesson_id: currentLessonId,
                    last_accessed: serverTimestamp()
                });
            });
        } catch (err) {
            console.warn("Erro ao salvar última aula:", err);
        }
    };
    
    // Debounce de 2 segundos para não sobrecarregar o Firebase
    const timer = setTimeout(saveLastLesson, 2000);
    return () => clearTimeout(timer);
  }, [currentLessonId, id, user?.uid, isEnrolled]);

  const current = useMemo(
    () => allLessons.find((x) => x.lesson.id === currentLessonId) || null,
    [allLessons, currentLessonId],
  );

  // Calcular progresso dinâmico
  const progressPercentage = useMemo(() => {
    const totalLessons = allLessons.length;
    const allExs = Array.isArray(course?.interactiveExercises)
      ? course.interactiveExercises
      : [];
    const totalExs = allExs.length;

    if (totalLessons + totalExs === 0) return 0;

    const lessonsCount = completedLessons.size;
    const exsCount = completedExercises.size;

    return Math.round(
      ((lessonsCount + exsCount) / (totalLessons + totalExs)) * 100,
    );
  }, [
    allLessons.length,
    completedLessons.size,
    course?.interactiveExercises,
    completedExercises.size,
  ]);

  const progressWidth = useMemo(() => {
    return Math.max(5, progressPercentage); // mínimo de 5% para visibilidade
  }, [progressPercentage]);

  // Atualizar progresso no enrollment em tempo real
  useEffect(() => {
    if (!id || !user?.uid || allLessons.length === 0 || !isEnrolled) return;

    const newProgress = Math.round(
      (completedLessons.size / allLessons.length) * 100,
    );

    // Apenas atualizar se o progresso mudou significativamente
    if (newProgress > 0 && newProgress % 10 === 0) {
      (async () => {
        try {
          const enrollmentQ = query(
            collection(db, "enrollments"),
            where("course_id", "==", id),
            where("user_uid", "==", user.uid),
          );
          const enrollmentSnap = await getDocs(enrollmentQ);
          enrollmentSnap.forEach(async (enrollDoc) => {
            const currentData = enrollDoc.data();
            const currentProgress = currentData.progress || 0;

            // Só atualizar se houve progresso
            if (newProgress > currentProgress) {
              await updateDoc(enrollDoc.ref, {
                progress: newProgress,
                lastUpdated: serverTimestamp(),
              });
            }
          });
        } catch (err) {
          console.warn("Erro ao atualizar progresso no enrollment:", err);
        }
      })();
    }
  }, [
    completedLessons.size,
    completedExercises.size,
    allLessons.length,
    id,
    user?.uid,
    isEnrolled,
  ]);

  // Determinar se uma aula está bloqueada (não pode ser acessada)
  const isLessonLocked = (lessonId: string): boolean => {
    // Formato self-directed (adultos): Nenhum bloqueio sequencial. Assistem ao seu critério.
    return false;
  };

  const courseTitle = course?.title || "Curso Completo";

  const ytEmbed = (url?: string) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        const idp = u.pathname.replace("/", "");
        return `https://www.youtube.com/embed/${idp}?rel=0&modestbranding=1&playsinline=1`;
      }
      if (u.hostname.includes("youtube.com")) {
        const vid = u.searchParams.get("v");
        if (vid)
          return `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1&playsinline=1`;
      }
    } catch {}
    return null;
  };

  const getDocViewerUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes("drive.google.com")) {
        return url.includes("/view") ? url.replace("/view", "/preview") : url;
      }
      const lower = url.toLowerCase();
      if (lower.endsWith(".pdf")) return `${url}#toolbar=0`;
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    } catch {
      return url;
    }
  };

  const resolveDocumentViewer = (
    url?: string,
  ): { type: "iframe" | "image" | "embed" | "pdf"; src: string } | null => {
    const src = ensureAbsoluteFileUrl(url);
    if (!src) return null;

    console.log("[resolveDocumentViewer] Input URL:", url);
    console.log("[resolveDocumentViewer] After ensureAbsolute:", src);

    try {
      const u = new URL(src);
      const host = u.hostname;
      const path = u.pathname;
      const lowerPath = path.toLowerCase();

      // Detectar tipo de arquivo pela extensão
      const officeDocExts = [".doc", ".docx"];
      const officePresentationExts = [".ppt", ".pptx"];
      const officeSheetExts = [".xls", ".xlsx"];
      const isOfficeDoc = officeDocExts.some((ext) => lowerPath.endsWith(ext));
      const isOfficePresentation = officePresentationExts.some((ext) =>
        lowerPath.endsWith(ext),
      );
      const isOfficeSheet = officeSheetExts.some((ext) =>
        lowerPath.endsWith(ext),
      );
      const isPdf = lowerPath.endsWith(".pdf");
      const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
      const isImage = imageExts.some((ext) => lowerPath.endsWith(ext));

      console.log("[resolveDocumentViewer] File type:", {
        isPdf,
        isImage,
        isOfficeDoc,
        isOfficePresentation,
        isOfficeSheet,
      });

      // Google Docs
      if (host.includes("docs.google.com")) {
        const types = ["document", "spreadsheets", "presentation"];
        const t = types.find((ti) => path.includes(`/${ti}/d/`));
        if (t) {
          const id = path.split("/d/")[1]?.split("/")[0];
          if (id) {
            if (t === "presentation") {
              return {
                type: "iframe",
                src: `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`,
              };
            }
            const pdfUrl = `https://docs.google.com/${t}/d/${id}/export?format=pdf`;
            return {
              type: "iframe",
              src: `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(pdfUrl)}`,
            };
          }
        }
      }

      // Google Drive
      if (host.includes("drive.google.com")) {
        let id: string | null = null;
        if (path.includes("/file/d/"))
          id = path.split("/file/d/")[1]?.split("/")[0] || null;
        if (!id) id = u.searchParams.get("id");
        if (id) {
          const preview = `https://drive.google.com/file/d/${id}/preview`;
          return { type: "iframe", src: preview };
        }
      }

      // Remove query string se existir (tokens, etc)
      // MAS: URLs assinadas do Supabase PRECISAM do token
      let cleanSrc = src;
      if (!src.includes("supabase.co") || !src.includes("token=")) {
        cleanSrc = src.split("?")[0];
      }

      // Supabase Storage
      if (host.includes("supabase.co")) {
        if (isImage) return { type: "image", src: src }; // Mantém token para imagens

        // PDFs: Usar <embed> nativo - funciona em todos os navegadores
        if (isPdf) {
          console.log("[resolveDocumentViewer] PDF from Supabase:", src);
          return {
            type: "pdf",
            src: src, // Mantém URL com token intacta
          };
        }

        // Office documents: usar Microsoft Office Online Viewer com token preservado
        if (isOfficeDoc || isOfficePresentation || isOfficeSheet) {
          const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`;
          console.log("[resolveDocumentViewer] Office from Supabase:", {
            original: src,
            viewer: viewerUrl,
          });
          return {
            type: "iframe",
            src: viewerUrl,
          };
        }

        return { type: "embed", src: src }; // Mantém token, usa embed
      }

      // Firebase Storage
      if (host.includes("firebasestorage.googleapis.com")) {
        if (isImage) return { type: "image", src: src };

        // PDFs: usar embed nativo
        if (isPdf) {
          return {
            type: "pdf",
            src: src,
          };
        }

        if (isOfficeDoc || isOfficePresentation || isOfficeSheet) {
          return {
            type: "iframe",
            src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`,
          };
        }

        return { type: "embed", src: src };
      }

      // Fallback para qualquer outra URL
      if (isImage) return { type: "image", src: cleanSrc };

      // PDFs: usar embed nativo
      if (isPdf) {
        return {
          type: "pdf",
          src: cleanSrc,
        };
      }

      // Office documents com Microsoft Office Online Viewer
      if (isOfficeDoc || isOfficePresentation || isOfficeSheet) {
        return {
          type: "iframe",
          src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanSrc)}`,
        };
      }

      return { type: "pdf", src: cleanSrc };
    } catch (err) {
      console.error("Erro ao resolver visualizador de documento:", err);
      try {
        const parsed = new URL(src);
        const lowerPath = parsed.pathname.toLowerCase();
        if (lowerPath.endsWith(".pdf")) {
          return {
            type: "pdf",
            src: src,
          };
        }
      } catch {}
      return { type: "pdf", src: src || "" };
    }
  };

  const goPrev = () => {
    if (!current) return;
    const idx = allLessons.findIndex((x) => x.lesson.id === current.lesson.id);
    if (idx > 0) setCurrentLessonId(allLessons[idx - 1].lesson.id);
  };
  const goNext = () => {
    if (!current) return;
    const idx = allLessons.findIndex((x) => x.lesson.id === current.lesson.id);
    if (idx >= 0 && idx < allLessons.length - 1)
      setCurrentLessonId(allLessons[idx + 1].lesson.id);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/aluno/dashboard"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            style={{ color: "#0E7038" }}
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="h-8 w-[1px] bg-gray-200"></div>
          
          <div className="flex flex-col min-w-0">
            <h1
              className="font-black text-[13px] md:text-base truncate max-w-[140px] xs:max-w-[180px] sm:max-w-xs md:max-w-md"
              style={{ color: "#0E7038" }}
            >
              {courseTitle}
            </h1>
            <div
              className="flex items-center gap-1.5 md:gap-2 mt-0.5"
              style={{ color: "#0E7038" }}
            >
              <div className="w-16 md:w-24 h-1 md:h-1.5 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
                <div
                  style={{
                    width: `${progressWidth}%`,
                    backgroundColor: "#0E7038",
                  }}
                  className="h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(14,112,56,0.3)]"
                ></div>
              </div>
              <span className="text-[10px] md:text-xs font-bold" style={{ color: "#0E7038" }}>
                {progressPercentage}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* BOTÃO CONTEÚDOS: Sempre visível, mas etiqueta oculta no mobile para poupar espaço */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
              isSidebarOpen 
                ? "bg-brand-green text-white shadow-md shadow-brand-green/20" 
                : "bg-slate-100 text-brand-green hover:bg-brand-green hover:text-white"
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">
              Conteúdos
            </span>
          </button>

          {/* Certificado no Mobile: Ícone simples */}
          <button
            onClick={() => progressPercentage === 100 && setShowCertificateModal(true)}
            disabled={progressPercentage < 100}
            className={`md:hidden p-2 rounded-xl border transition-all ${
                progressPercentage === 100 
                ? "bg-amber-100 border-amber-200 text-amber-600 shadow-sm" 
                : "bg-gray-50 border-gray-100 text-gray-300 opacity-50"
            }`}
          >
            <Award className="w-5 h-5" />
          </button>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() =>
                progressPercentage === 100 && setShowCertificateModal(true)
              }
              disabled={progressPercentage < 100}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                progressPercentage === 100
                  ? "border-2 text-white cursor-pointer"
                  : "border border-gray-300 cursor-not-allowed"
              }`}
              style={
                progressPercentage === 100
                  ? { backgroundColor: "#0E7038" }
                  : { color: "#9CA3AF" }
              }
            >
              <Award className="w-4 h-4" />
              <span>
                {progressPercentage === 100
                  ? "Emitir Certificado"
                  : "Certificado"}
              </span>
            </button>
            <div
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs text-white"
              style={{ backgroundColor: "#0E7038", borderColor: "#0E7038" }}
            >
              {profile?.full_name
                ? profile.full_name
                    .split(" ")
                    .slice(0, 2)
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                : "U"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video & Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Video Player / Lesson Content */}
          {current?.lesson?.type === "video" && current?.lesson?.content ? (
            <div className="w-full bg-black aspect-video relative group">
              {(() => {
                const yt = ytEmbed(current.lesson.content);
                if (yt) {
                  return (
                    <iframe
                      src={yt}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title="Aula em vídeo"
                    />
                  );
                }
                return (
                  <video
                    src={current.lesson.content}
                    controls
                    className="w-full h-full object-contain bg-black"
                  ></video>
                );
              })()}
            </div>
          ) : current?.lesson?.type === "text" ? (
            <div className="w-full bg-[#f8fafc] min-h-full">
              <div className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-8 pb-32 md:pb-8">
                <MascotReader
                  content={current.lesson.content || ""}
                  onFinished={markLessonAsComplete}
                  mascotUrl={course?.mascotUrl}
                  isFinishing={isFinishingLesson}
                />
              </div>
            </div>
          ) : current?.lesson?.type === "interactive" &&
            current?.lesson?.exerciseData ? (
            <div className="w-full bg-[#f8fafc] min-h-full">
              <div className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-8 pb-32 md:pb-8">
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-brand-green/5 to-brand-green/10 border-l-4 border-brand-green rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-brand-green" />
                      </div>
                      <h2 className="text-2xl font-black text-brand-green">Teste de Aprendizagem</h2>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">Verifique seu conhecimento com este teste interativo sobre o conteúdo que acabou de aprender.</p>
                  </div>
                </div>
                <InteractiveQuiz
                  lesson={current?.lesson}
                  course={course}
                  isFullLesson={true}
                  onExerciseStatusUpdate={(exId: string, ok: boolean, isFinal?: boolean) => {
                    if (ok) {
                      if (isFinal) {
                        markExerciseAsComplete(exId);
                      } else {
                        setExerciseResults((prev) => ({ ...prev, [exId]: true }));
                      }
                    } else {
                      setExerciseResults((prev) => ({ ...prev, [exId]: false }));
                    }
                  }}
                  results={exerciseResults}
                  showToast={showToast}
                  completedList={completedExercises}
                  getDownloadUrl={getDownloadUrl}
                  singleExercise={current?.lesson?.exerciseData}
                />
              </div>
            </div>
          ) : current?.lesson?.type === "document" &&
            current?.lesson?.content ? (
            <div className="w-full bg-slate-50">
              <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    Documento da Aula
                  </h3>
                  <div className="flex items-center gap-2">
                    {current?.lesson?.content &&
                      (() => {
                        console.log(
                          "[CoursePlayer] Document content:",
                          current.lesson.content,
                        );
                        return null;
                      })()}
                    <a
                      href={getDownloadUrl(current.lesson.content)}
                      download
                      className="flex items-center gap-2 text-white bg-brand-green hover:bg-brand-green/90 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-green/20"
                    >
                      <Download className="w-5 h-5" />
                      Baixar o documento
                    </a>
                  </div>
                </div>
                {(() => {
                  const viewer = resolveDocumentViewer(current.lesson.content);
                  return (
                    <div className="w-full h-[50vh] md:h-[70vh] border rounded-xl overflow-hidden shadow-sm bg-slate-50">
                      {viewer ? (
                        viewer.type === "image" ? (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-center p-8">
                            <div className="max-w-full max-h-full overflow-auto">
                              <img
                                src={viewer.src}
                                alt="Documento"
                                className="max-w-full h-auto object-contain mx-auto rounded-lg shadow-sm"
                                onError={() => {
                                  console.error(
                                    "Erro ao carregar imagem:",
                                    viewer.src,
                                  );
                                }}
                              />
                            </div>
                          </div>
                        ) : viewer.type === "pdf" ? (
                          <div className="w-full h-full bg-white">
                            <Worker
                              workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}
                            >
                              <Viewer
                                fileUrl={viewer.src}
                                plugins={[defaultLayoutPluginInstance]}
                                theme="light"
                              />
                            </Worker>
                          </div>
                        ) : (
                          <iframe
                            src={viewer.src}
                            className="w-full h-full border-none"
                            title="Visualização de Documento"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-6">
                          <div className="text-center">
                            <p className="font-semibold mb-2">
                              Não foi possível visualizar este documento
                            </p>
                            <p className="text-sm text-gray-500 mb-4">
                              Faça o download para visualizar o arquivo em seu
                              computador
                            </p>
                            {current?.lesson?.content && (
                              <a
                                href={getDownloadUrl(current.lesson.content)}
                                download
                                className="text-sm font-semibold px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-dark transition-colors inline-block"
                              >
                                ⬇ Baixar Documento
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Supplementary Materials Message for Document Lessons */}
                <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Download className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-blue-900 mb-2">Material de Apoio</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Clique no botão abaixo para descarregar o documento de apoio desta aula.
                      </p>
                      <a
                        href={getDownloadUrl(current.lesson.content)}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descarregar Material de Apoio
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : current?.lesson?.type === "image" && current?.lesson?.content ? (
            <div className="w-full bg-[#f8fafc] flex items-center justify-center p-4 min-h-[60vh]">
              <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-2 group transition-all duration-500">
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src={getDownloadUrl(current.lesson.content)}
                    alt={current.lesson.title || "Imagem da aula"}
                    className="w-full h-auto object-contain max-h-[75vh]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "https://placehold.co/800x600?text=Erro+ao+carregar+imagem";
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent h-20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4 flex items-center justify-between">
                    <h3 className="font-black text-brand-green/80 text-sm uppercase tracking-wide">Conteúdo Visual</h3>
                    <a 
                        href={getDownloadUrl(current.lesson.content)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-brand-green/5 text-brand-green text-xs font-black rounded-xl hover:bg-brand-green hover:text-white transition-all uppercase tracking-tighter"
                    >
                        Abrir Original
                    </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full min-h-[60vh] bg-white flex flex-col items-center justify-center p-8 text-center">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                  <p className="text-gray-500 font-medium italic">Preparando sua aula...</p>
                </div>
              ) : !currentLessonId ? (
                <div className="flex flex-col items-center">
                  <Play className="w-16 h-16 text-gray-200 mb-4" />
                  <h2 className="text-xl font-bold text-gray-700">Bem-vindo ao Player</h2>
                  <p className="text-gray-500">Selecione uma aula na lista ao lado para começar.</p>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-brand-green" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2">
                    Objetivo Alcançado!
                  </h2>
                  <p className="text-gray-500 max-w-md mx-auto mb-10 text-lg">
                    Você concluiu este conteúdo com sucesso. O seu progresso foi guardado e está pronto para o próximo desafio.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      {progressPercentage === 100 && (
                          <button 
                            onClick={() => setShowCertificateModal(true)}
                            className="w-full sm:w-auto px-8 py-3 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-all text-sm uppercase tracking-widest"
                          >
                            Emitir Certificado
                          </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Controls & Tabs */}
          <div className="max-w-5xl mx-auto p-6 md:p-8">
            {/* Lesson Navigation - Buttons Only */}
            <div className="flex items-center justify-end gap-3 mb-8 pb-8 border-b border-gray-200">
                <button
                  onClick={goPrev}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </button>

                {!completedLessons.has(currentLessonId) && (
                  <button
                    onClick={markLessonAsComplete}
                    className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 bg-brand-green hover:bg-brand-dark shadow-brand-green/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Concluir Aula
                  </button>
                )}

                <button
                  onClick={goNext}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 bg-brand-green hover:bg-brand-dark shadow-sm"
                >
                  Próxima <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>

          {/* Supplementary Materials Section */}
          {(() => {
            const materials: any[] = [];
            
            // Coletar materiais do lesson
            if (current?.lesson) {
              const lesson = current.lesson;
              console.log("[CoursePlayer] Lesson data:", lesson);
              const lessonMaterials = lesson.materials || lesson.materiais || lesson.attachments || lesson.anexos || [];
              if (Array.isArray(lessonMaterials)) {
                console.log("[CoursePlayer] Found lesson materials:", lessonMaterials.length);
                materials.push(...lessonMaterials);
              }
            }

            // Coletar do course level também
            if (course) {
              console.log("[CoursePlayer] Course data keys:", Object.keys(course));
              console.log("[CoursePlayer] Course full data:", course);
              const courseMaterials = course.materials || course.materiais || course.supplementary_materials || course.materiaisComplementares || [];
              if (Array.isArray(courseMaterials) && courseMaterials.length > 0) {
                console.log("[CoursePlayer] Found course materials:", courseMaterials.length);
                materials.push(...courseMaterials);
              }
            }

            // Se for texto com JSON, extrair arquivos
            if (current?.lesson?.type === "text" && current?.lesson?.content) {
              try {
                const parsed = JSON.parse(current.lesson.content);
                if (Array.isArray(parsed)) {
                  parsed.forEach((item: any) => {
                    if (item.type === "file" && item.value) {
                      materials.push({
                        title: item.fileName || "Arquivo",
                        url: item.value,
                      });
                    }
                  });
                }
              } catch (e) {}
            }

            // Se for documento, inclua como material
            if (current?.lesson?.type === "document" && current?.lesson?.content) {
              materials.push({
                title: current.lesson.title || "Documento da Aula",
                url: current.lesson.content,
                type: "pdf",
              });
            }

            // Deduplicate by URL
            const uniqueMaterials = materials.filter((m, index, self) => 
              index === self.findIndex(t => (t.url || t.link || t.href) === (m.url || m.link || m.href))
            );

            console.log("[CoursePlayer] Total materials found:", uniqueMaterials.length);

            if (uniqueMaterials.length === 0) {
              console.log("[CoursePlayer] No supplementary materials to display");
              return null;
            }

            return (
              <div className="max-w-5xl mx-auto px-6 md:px-8 py-8 border-t border-gray-200 mt-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-green" />
                  Materiais Complementares
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {uniqueMaterials.map((material: any, idx: number) => {
                    const url = material.url || material.link || material.href || "";
                    const title = material.title || material.name || material.titulo || `Material ${idx + 1}`;
                    const tipo = material.type || material.tipo || "";

                    // Determine file type icon
                    let Icon = Download;
                    let bgClass = "bg-gray-50";
                    if (url.toLowerCase().includes(".pdf")) {
                      Icon = FileText;
                      bgClass = "bg-red-50";
                    } else if (
                      url.toLowerCase().includes(".doc") ||
                      url.toLowerCase().includes(".docx") ||
                      url.toLowerCase().includes(".txt")
                    ) {
                      Icon = FileText;
                      bgClass = "bg-blue-50";
                    } else if (
                      url.toLowerCase().includes(".xls") ||
                      url.toLowerCase().includes(".xlsx")
                    ) {
                      Icon = FileText;
                      bgClass = "bg-green-50";
                    } else if (
                      url.toLowerCase().includes(".jpg") ||
                      url.toLowerCase().includes(".png") ||
                      url.toLowerCase().includes(".gif")
                    ) {
                      Icon = Image;
                      bgClass = "bg-purple-50";
                    } else if (
                      url.toLowerCase().includes(".zip") ||
                      url.toLowerCase().includes(".rar")
                    ) {
                      Icon = Download;
                      bgClass = "bg-yellow-50";
                    }

                    return (
                      <a
                        key={idx}
                        href={getDownloadUrl(url)}
                        download
                        className={`${bgClass} border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all group cursor-pointer`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-lg bg-white group-hover:bg-brand-green/10 transition-colors">
                            <Icon className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-brand-green transition-colors">
                              {title}
                            </p>
                            {tipo && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {tipo}
                              </p>
                            )}
                            {material.size && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {material.size}
                              </p>
                            )}
                          </div>
                          <Download className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </main>

        {/* Right: Sidebar / Playlist */}
        <aside
          className={`
            fixed inset-y-0 right-0 z-30 w-80 bg-slate-50 border-l border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col pt-16 md:pt-0 md:relative md:inset-auto
            ${isSidebarOpen ? "translate-x-0 md:w-80" : "translate-x-full md:w-0 md:overflow-hidden"}
          `}
        >
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-gray-200 rounded-lg transition-colors"
              style={{ color: "#0E7038" }}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-gray-900">Conteúdo do Curso</h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {Array.isArray(displayModules)
                ? displayModules.reduce(
                    (acc: number, m: any) =>
                      acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
                    0,
                  )
                : 0}{" "}
              Aulas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {displayModules.map((module: any, mi: number) => {
              const mId = module.id || String(mi);
              return (
                <div
                  key={mId}
                  className="border-b border-gray-100 last:border-0"
                >
                  <button
                    onClick={() => toggleModule(mId)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="font-bold text-sm text-gray-800 pr-2">
                      {module.title}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${openModules.includes(mId) ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openModules.includes(mId) && (
                    <div className="bg-slate-50">
                      {Array.isArray(module.lessons) &&
                        module.lessons.map((lesson: any, li: number) => {
                          const isActive = lesson.id === currentLessonId;
                          const locked = isLessonLocked(lesson.id);
                          const isCompleted = completedLessons.has(lesson.id);

                          return (
                            <div
                              key={lesson.id || `${mId}-${li}`}
                              onClick={() =>
                                !locked && setCurrentLessonId(lesson.id)
                              }
                              className={`
                                flex items-start gap-3 p-3 pl-4 border-l-4 transition-colors
                                ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                ${isActive ? "border-brand-green bg-green-50/30" : "border-transparent hover:bg-gray-50"}
                              `}
                            >
                              <div className="mt-0.5">
                                {locked ? (
                                  <Lock className="w-4 h-4 text-gray-300" />
                                ) : isActive ? (
                                  <PlayCircle className="w-4 h-4 text-brand-green fill-current" />
                                ) : isCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-brand-green fill-current" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-300" />
                                )}
                              </div>
                              <div>
                                <p
                                  className={`text-sm font-medium mb-1 ${isActive ? "text-brand-green" : "text-gray-700"}`}
                                >
                                  {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  {lesson.type === "video"
                                    ? "Vídeo"
                                    : lesson.type === "text"
                                      ? "Texto"
                                      : lesson.type === "interactive"
                                        ? "🧪 Teste"
                                        : "Documento"}
                                  {lesson.duration
                                    ? ` • ${lesson.duration}`
                                    : ""}
                                  {(() => {
                                    const lessonExs = (
                                      course?.interactiveExercises || []
                                    ).filter(
                                      (ex: any) =>
                                        String(ex.lessonId || ex.lesson_id) ===
                                        String(lesson.id),
                                    );
                                    if (lessonExs.length > 0) {
                                      const allDone = lessonExs.every(
                                        (ex: any) => exerciseResults[ex.id],
                                      );
                                      if (!allDone) {
                                        return (
                                          <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold ml-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                            Exercício pendente
                                          </span>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.05)]">
            <button
                onClick={goPrev}
                disabled={!current || allLessons.findIndex(x => x.lesson.id === current.lesson.id) === 0}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 disabled:opacity-20"
            >
                <ChevronLeft className="w-5 h-5" />
                Anterior
            </button>
            <div className="h-8 w-px bg-gray-100" />
            <button
                onClick={goNext}
                disabled={!current || allLessons.findIndex(x => x.lesson.id === current.lesson.id) === allLessons.length - 1}
                className="flex items-center gap-2 text-sm font-black text-brand-green disabled:opacity-20"
            >
                Próxima
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg font-semibold text-white transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
              toast.type === "success"
                ? "bg-brand-green hover:bg-brand-green/90"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Certificate Payment Modal */}
        <CertificatePaymentModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          courseId={id || ""}
          courseTitle={course?.title || "Curso"}
          onSuccess={() => {
            setShowCertificateModal(false);
            showToast("Certificado submetido! Aguarde confirmação.", "success");
          }}
        />
      </div>
    </div>
  );
};

// --- Sub-components ---

const InteractiveQuiz = ({
  course,
  lesson,
  onExerciseStatusUpdate,
  results,
  showToast,
  completedList,
  getDownloadUrl,
  singleExercise,
  isFullLesson,
}: any) => {
  const list = useMemo(() => {
    // Se é um exercício único (como aula), retorna apenas esse
    if (singleExercise) {
      return [singleExercise];
    }
    const all = Array.isArray(course?.interactiveExercises)
      ? course.interactiveExercises
      : [];
    // Filtrar exercícios por aula
    const currentLessonId = String(lesson?.id || "");
    return all.filter(
      (ex: any) =>
        String(ex.lessonId || ex.lesson_id || "") === currentLessonId,
    );
  }, [course, lesson, singleExercise]);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>(
    results || {},
  );
  const [isFinishing, setIsFinishing] = useState(false);

  // Sincronizar estado checked com results externos se necessário
  useEffect(() => {
    if (results) {
      setChecked((prev) => ({ ...prev, ...results }));
    }
  }, [results]);

  if (!list.length) {
    return (
      <div className="bg-slate-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
        Sem exercícios interativos para esta aula.
      </div>
    );
  }

  const allCompletedInLesson = list.every((ex) => checked[ex.id]);

  const handleFinishTest = async () => {
    setIsFinishing(true);
    try {
      let count = 0;
      for (const ex of list) {
        if (checked[ex.id] && !completedList?.has(ex.id)) {
          if (onExerciseStatusUpdate) onExerciseStatusUpdate(ex.id, true, true);
          count++;
        }
      }
      if (count > 0 || list.every((ex) => completedList?.has(ex.id))) {
        if (showToast) showToast("Avaliação submetida com sucesso!", "success");
      } else if (list.length > 0) {
        if (showToast)
          showToast("Nenhum novo exercício para submeter.", "success");
      }
    } finally {
      setIsFinishing(false);
    }
  };

  const toggleOption = (exId: string, optId: string) => {
    const ex = list.find((e: any) => String(e.id) === String(exId));
    const multi = !!ex?.settings?.multiSelect;

    setAnswers((prev) => {
      const curSelected = prev[exId]?.selected || [];
      let nextSelected: string[];

      if (!multi) {
        nextSelected = [optId];
      } else {
        const cur = new Set<string>(curSelected);
        if (cur.has(optId)) cur.delete(optId);
        else cur.add(optId);
        nextSelected = Array.from(cur);
      }

      return {
        ...prev,
        [exId]: { ...(prev[exId] || {}), selected: nextSelected },
      };
    });

    // Limpar o estado "checked" ao mudar a resposta
    if (checked[exId] !== undefined) {
      setChecked((prev) => {
        const next = { ...prev };
        delete next[exId];
        return next;
      });
      if (onExerciseStatusUpdate) onExerciseStatusUpdate(exId, false);
    }
  };

  const checkQuiz = (ex: any) => {
    const selected: string[] = answers[ex.id]?.selected || [];
    const correct = (ex.quiz?.options || [])
      .filter((o: any) => o.correct)
      .map((o: any) => o.id);
    const ok =
      selected.length === correct.length &&
      selected.every((id: any) => correct.includes(id));
    setChecked((prev) => ({ ...prev, [ex.id]: ok }));
    if (onExerciseStatusUpdate) onExerciseStatusUpdate(ex.id, ok);
  };

  const setDrop = (exId: string, itemId: string, targetId?: string) => {
    setAnswers((prev) => {
      const map = { ...(prev[exId]?.map || {}) };
      map[itemId] = targetId;
      return { ...prev, [exId]: { ...(prev[exId] || {}), map } };
    });

    if (checked[exId] !== undefined) {
      setChecked((prev) => {
        const next = { ...prev };
        delete next[exId];
        return next;
      });
      if (onExerciseStatusUpdate) onExerciseStatusUpdate(exId, false);
    }
  };

  const checkDrag = (ex: any) => {
    const map = answers[ex.id]?.map || {};
    const all = (ex.dragdrop?.items || []).every(
      (i: any) => (map[i.id] || "") === (i.targetId || ""),
    );
    setChecked((prev) => ({ ...prev, [ex.id]: all }));
    if (onExerciseStatusUpdate) onExerciseStatusUpdate(ex.id, all);
  };

  const setTF = (exId: string, stId: string, val: boolean) => {
    setAnswers((prev) => {
      const tf = { ...(prev[exId]?.tf || {}) };
      tf[stId] = val;
      return { ...prev, [exId]: { ...(prev[exId] || {}), tf } };
    });

    if (checked[exId] !== undefined) {
      setChecked((prev) => {
        const next = { ...prev };
        delete next[exId];
        return next;
      });
      if (onExerciseStatusUpdate) onExerciseStatusUpdate(exId, false);
    }
  };
  const checkTF = (ex: any) => {
    const tf = answers[ex.id]?.tf || {};
    const ok = (ex.truefalse?.statements || []).every(
      (s: any) => tf[s.id] === s.answer,
    );
    setChecked((prev) => ({ ...prev, [ex.id]: ok }));
    if (onExerciseStatusUpdate) onExerciseStatusUpdate(ex.id, ok);
  };

  const setBlank = (exId: string, blankId: string, val: string) => {
    setAnswers((prev) => {
      const blanks = { ...(prev[exId]?.blanks || {}) };
      blanks[blankId] = val;
      return { ...prev, [exId]: { ...(prev[exId] || {}), blanks } };
    });

    if (checked[exId] !== undefined) {
      setChecked((prev) => {
        const next = { ...prev };
        delete next[exId];
        return next;
      });
      if (onExerciseStatusUpdate) onExerciseStatusUpdate(exId, false);
    }
  };
  const checkFill = (ex: any) => {
    const blanks = answers[ex.id]?.blanks || {};
    const caseSensitive = !!ex.settings?.caseSensitive;
    const norm = (s: string) =>
      caseSensitive ? s.trim() : s.trim().toLowerCase();
    const ok = (ex.fillblank?.blanks || []).every((b: any) => {
      const val = norm(String(blanks[b.id] || ""));
      const options = (b.answers || []).map((x: string) =>
        norm(String(x || "")),
      );
      return options.includes(val) && val.length > 0;
    });
    setChecked((prev) => ({ ...prev, [ex.id]: ok }));
    if (onExerciseStatusUpdate) onExerciseStatusUpdate(ex.id, ok);
  };

  const resetExercise = (exId: string) => {
    setAnswers((prev) => ({ ...prev, [exId]: {} }));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[exId];
      return next;
    });
    if (onExerciseStatusUpdate) onExerciseStatusUpdate(exId, false);
  };

  return (
    <div className="space-y-6">
      {list.map((ex: any) => (
        <div
          key={ex.id}
          className="bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-900">
                {ex.title ||
                  (ex.type === "quiz"
                    ? "Quiz"
                    : ex.type === "dragdrop" || ex.type === "matching"
                      ? "Arrastar & Soltar / Correspondência"
                      : ex.type === "truefalse"
                        ? "Verdadeiro/Falso"
                        : "Preenchimento")}
              </h4>
              {ex.description ? (
                <p className="text-xs text-gray-500">{ex.description}</p>
              ) : null}
            </div>
            {checked[ex.id] !== undefined && (
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${checked[ex.id] ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                >
                  {checked[ex.id] ? "Correto" : "Tente novamente"}
                </span>
                {!checked[ex.id] && (
                  <button
                    onClick={() => resetExercise(ex.id)}
                    className="text-[10px] font-bold text-gray-400 hover:text-brand-green uppercase"
                  >
                    Reiniciar
                  </button>
                )}
              </div>
            )}
          </div>

          {(ex.imageUrl || ex.image || ex.img) && (
            <div className="bg-gray-100 p-1">
                <img 
                    src={getDownloadUrl(ex.imageUrl || ex.image || ex.img)} 
                    alt="Imagem do exercício"
                    className="w-full h-auto max-h-[300px] object-contain rounded-lg"
                    onError={(e) => { (e.target as any).src = 'https://placehold.co/400x200?text=Imagem+Nao+Encontrada'; }}
                />
            </div>
          )}

          {ex.type === "quiz" && (
            <div className="p-4 space-y-3">
              <div className="font-semibold text-gray-800">
                {ex.quiz?.question || "Pergunta"}
              </div>
              <div className="space-y-2">
                {(ex.quiz?.options || []).map((o: any) => {
                  const selected: string[] = answers[ex.id]?.selected || [];
                  const isSel = selected.includes(o.id);
                  const isMulti = !!ex.settings?.multiSelect;
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSel ? "border-brand-green bg-green-50/40" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
                    >
                      <input
                        type={isMulti ? "checkbox" : "radio"}
                        name={`quiz-${ex.id}`}
                        checked={isSel}
                        onChange={() => toggleOption(ex.id, o.id)}
                        className={isMulti ? "rounded" : "rounded-full"}
                      />
                      <span className="text-sm text-gray-700">{o.text}</span>
                    </label>
                  );
                })}
              </div>
              <div className="pt-3 border-t border-gray-100 mt-2">
                <button
                  onClick={() => {
                    if (ex.type === "quiz") checkQuiz(ex);
                    else if (ex.type === "dragdrop" || ex.type === "matching")
                      checkDrag(ex);
                    else if (ex.type === "truefalse") checkTF(ex);
                    else if (ex.type === "fillblank") checkFill(ex);
                  }}
                  className="bg-[#0E7038] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-md flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verificar Resposta
                </button>
              </div>
            </div>
          )}

          {(ex.type === "dragdrop" || ex.type === "matching") && (
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-700 font-medium">
                {ex.dragdrop?.prompt || "Associe os itens aos alvos."}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-600">Itens</div>
                  {(ex.dragdrop?.items || []).map((i: any) => (
                    <div
                      key={i.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "text/plain",
                          JSON.stringify({ exId: ex.id, itemId: i.id }),
                        )
                      }
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-move"
                    >
                      {i.text}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-600">Alvos</div>
                  {(ex.dragdrop?.targets || []).map((t: any) => {
                    const assignedItems = Object.entries(
                      answers[ex.id]?.map || {},
                    )
                      .filter(([_, tgt]) => tgt === t.id)
                      .map(([k]) => k);
                    return (
                      <div
                        key={t.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          try {
                            const data = JSON.parse(
                              e.dataTransfer.getData("text/plain"),
                            );
                            setDrop(data.exId, data.itemId, t.id);
                          } catch {}
                        }}
                        className="p-3 bg-slate-50 border border-gray-200 rounded-lg min-h-[60px]"
                      >
                        <div className="text-xs font-bold text-gray-700 mb-2">
                          {t.label}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {assignedItems.map((iid) => {
                            const item = (ex.dragdrop?.items || []).find(
                              (x: any) => x.id === iid,
                            );
                            return (
                              <span
                                key={iid}
                                className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded"
                              >
                                {item?.text || iid}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const data = JSON.parse(
                          e.dataTransfer.getData("text/plain"),
                        );
                        setDrop(data.exId, data.itemId, undefined);
                      } catch {}
                    }}
                    className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg min-h-[60px]"
                  >
                    <div className="text-xs text-gray-500">
                      Solte aqui para remover a associação
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 mt-2">
                <button
                  onClick={() => checkDrag(ex)}
                  className="bg-[#0E7038] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-md flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verificar Associação
                </button>
              </div>
            </div>
          )}

          {ex.type === "truefalse" && (
            <div className="p-4 space-y-3">
              {(ex.truefalse?.statements || []).map((s: any) => {
                const val = (answers[ex.id]?.tf || {})[s.id];
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">{s.text}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={`tf-${ex.id}-${s.id}`}
                          checked={val === true}
                          onChange={() => setTF(ex.id, s.id, true)}
                        />{" "}
                        Verdadeiro
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={`tf-${ex.id}-${s.id}`}
                          checked={val === false}
                          onChange={() => setTF(ex.id, s.id, false)}
                        />{" "}
                        Falso
                      </label>
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-gray-100 mt-2">
                <button
                  onClick={() => checkTF(ex)}
                  className="bg-[#0E7038] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-md flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verificar Afirmações
                </button>
              </div>
            </div>
          )}

          {ex.type === "fillblank" && (
            <div className="p-4 space-y-3">
              {ex.fillblank?.prompt && (
                <div className="text-sm text-gray-700">
                  {ex.fillblank.prompt}
                </div>
              )}
              <div className="space-y-2">
                {(ex.fillblank?.blanks || []).map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <label className="text-xs text-gray-600 min-w-[120px]">
                      {b.label || "Resposta"}:
                    </label>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={answers[ex.id]?.blanks?.[b.id] || ""}
                      onChange={(e) => setBlank(ex.id, b.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-gray-100 mt-2">
                <button
                  onClick={() => checkFill(ex)}
                  className="bg-[#0E7038] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-md flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verificar Preenchimento
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {list.length > 0 && (
        <div className="pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleFinishTest}
            disabled={!allCompletedInLesson || isFinishing}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
              allCompletedInLesson && !isFinishing
                ? "bg-brand-green text-white hover:bg-brand-dark shadow-brand-green/20"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isFinishing ? (
              "Enviando..."
            ) : allCompletedInLesson ? (
              <>
                <Send className="w-5 h-5" />
                Submeter Teste Interativo
              </>
            ) : (
              "Conclua todos os exercícios acima"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label }: any) => (
  <button
    onClick={onClick}
    className={`pb-2 md:pb-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex-shrink-0 ${
      active
        ? "border-brand-green text-brand-green"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`}
  >
    {label}
  </button>
);

const MaterialCard = ({ title, type, size, icon }: any) => (
  <div className="flex items-center p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-slate-50 cursor-pointer group">
    <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
      {icon}
    </div>
    <div className="ml-4 flex-1">
      <h4 className="font-bold text-gray-800 text-sm group-hover:text-brand-green transition-colors">
        {title}
      </h4>
      <p className="text-xs text-gray-500">
        {type} {size && `• ${size}`}
      </p>
    </div>
    <Download className="w-5 h-5 text-gray-300 group-hover:text-brand-dark" />
  </div>
);

const Comment = ({
  author,
  date,
  text,
  replies,
  onReplyClick,
  onRepliesClick,
  isRepliesOpen,
  replyValue,
  onReplyChange,
  onReplySubmit,
  answersList,
  lessonTitle,
}: any) => (
  <div className="flex gap-4 group">
    <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center font-bold text-brand-green text-sm flex-shrink-0">
      {author?.charAt ? author.charAt(0) : "A"}
    </div>
    <div className="flex-1">
      <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{author}</span>
            {lessonTitle && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                Aula: {lessonTitle}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">{date}</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
      </div>

      <div className="flex items-center gap-4 mt-2 ml-2">
        <button
          className="text-xs font-bold text-gray-500 hover:text-brand-green transition-colors"
          onClick={onReplyClick}
        >
          Responder
        </button>
        {replies > 0 && (
          <button
            className="text-xs font-bold text-brand-green hover:underline cursor-pointer flex items-center gap-1"
            onClick={onRepliesClick}
          >
            {replies} {replies === 1 ? "resposta" : "respostas"}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${isRepliesOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {isRepliesOpen && (
        <div className="mt-4 space-y-3 ml-2 border-l-2 border-gray-100 pl-4">
          {(answersList || []).map((a: any) => {
            const isInstructor = a.author_role === "instructor";
            return (
              <div
                key={a.id}
                className={`p-3 rounded-xl shadow-sm ${
                  isInstructor
                    ? "bg-brand-green/5 border border-brand-green/10"
                    : "bg-gray-50 border border-gray-100"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold ${isInstructor ? "text-brand-green" : "text-gray-700"}`}
                    >
                      {a.author_name || (isInstructor ? "Equipe" : "Formando")}
                    </span>
                    {isInstructor && (
                      <span className="text-[9px] bg-brand-green text-white px-1.5 py-0.5 rounded-full font-black uppercase">
                        Oficial
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {a.createdAt?.toDate
                      ? a.createdAt.toDate().toLocaleString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
                <div className="text-sm text-gray-700 leading-snug">
                  {a.text}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={replyValue}
              onChange={(e) => onReplyChange?.(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onReplySubmit()}
              placeholder="Escreva sua resposta..."
              className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/10 transition-all shadow-inner"
            />
            <button
              onClick={onReplySubmit}
              className="p-2 bg-brand-green text-white rounded-full hover:bg-brand-dark transition-all active:scale-95 shadow-md flex items-center justify-center flex-shrink-0"
              title="Enviar resposta"
            >
              <Upload className="w-4 h-4 rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default CoursePlayerPage;
