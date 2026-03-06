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
  Circle,
  Download,
  File,
  FileText,
  Lock,
  Menu,
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "materials" | "uploads" | "comments" | "interactive"
  >("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [course, setCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
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
    if (!user?.uid || !id || !current?.lesson?.id) {
      showToast("Erro ao marcar aula como concluída.", "error");
      return;
    }

    // Verificar se há exercícios pendentes nesta aula
    const lessonExs = (course?.interactiveExercises || []).filter(
      (ex: any) =>
        String(ex.lessonId || ex.lesson_id) === String(current.lesson.id),
    );
    if (lessonExs.length > 0) {
      const pendingExs = lessonExs.filter(
        (ex: any) => !completedExercises.has(ex.id),
      );
      if (pendingExs.length > 0) {
        showToast(
          "Complete os exercícios interativos antes de concluir esta aula.",
          "error",
        );
        setActiveTab("interactive");
        return;
      }
    }

    try {
      // Adicionar registro de conclusão no Firebase
      await addDoc(collection(db, "lesson-completions"), {
        course_id: id,
        lesson_id: current.lesson.id,
        user_uid: user.uid,
        user_name: user.displayName || "Formando",
        course_title: course?.title || "",
        lesson_title: current.lesson.title || "",
        instructor_uid: course?.instructor_uid || course?.creator_uid || null,
        completedAt: serverTimestamp(),
      });

      // Atualizar o estado local
      setCompletedLessons((prev) => {
        const updated = new Set(prev);
        updated.add(current.lesson.id);
        return updated;
      });

      // Ir para a próxima aula se existir
      const idx = allLessons.findIndex(
        (x) => x.lesson.id === current.lesson.id,
      );
      if (idx >= 0 && idx < allLessons.length - 1) {
        setCurrentLessonId(allLessons[idx + 1].lesson.id);
        showToast(
          "Aula concluída com sucesso! Passando para a próxima...",
          "success",
        );
      } else {
        showToast(
          "Parabéns! Você completou todas as aulas do curso!",
          "success",
        );

        // Se era a última aula, marcar como completo no enrollment
        const newCompleted = new Set(completedLessons);
        newCompleted.add(current.lesson.id);
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
        setIsEnrolled(!r.empty);
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
      const q = query(
        collection(db, "submissions"),
        where("course_id", "==", id),
        where("user_uid", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUploadedFiles(list);
      });
      return () => unsub();
    } catch {}
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
        let type: "video" | "text" | "document" | "quiz" = "text";
        if (tRaw) {
          if (["video", "vídeo", "youtube", "mp4"].includes(tRaw))
            type = "video";
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
          else if (isDocUrl || l?.file) type = "document";
          else type = "text";
        } else {
          if (isVideoUrl) type = "video";
          else if (isDocUrl || l?.file) type = "document";
          else type = "text";
        }
        let content = "";
        if (type === "video")
          content = l?.videoUrl ?? l?.url ?? l?.content ?? "";
        else if (type === "document")
          content =
            l?.file ??
            l?.fileUrl ??
            l?.documentUrl ??
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
            let type: "video" | "text" | "document" | "quiz" = "text";
            if (tRaw) {
              if (["video", "vídeo", "youtube", "mp4"].includes(tRaw))
                type = "video";
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
              else if (isDocUrl || (l as any)?.file) type = "document";
              else type = "text";
            } else {
              if (isVideoUrl) type = "video";
              else if (isDocUrl || (l as any)?.file) type = "document";
              else type = "text";
            }
            let content = "";
            if (type === "video")
              content = l?.videoUrl ?? l?.url ?? l?.content ?? "";
            else if (type === "document")
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

  // Lista linear de aulas para navegação
  const allLessons = useMemo(() => {
    const out: any[] = [];
    displayModules.forEach((m: any, mi: number) => {
      (m?.lessons || []).forEach((l: any, li: number) => {
        out.push({ moduleIndex: mi, lessonIndex: li, module: m, lesson: l });
      });
    });
    return out;
  }, [displayModules]);

  // Atribuir aula padrão e abrir primeiro módulo
  useEffect(() => {
    if (!currentLessonId && allLessons.length > 0) {
      const firstVideo =
        allLessons.find(
          (x) => x.lesson?.type === "video" && x.lesson?.content,
        ) || allLessons[0];
      setCurrentLessonId(firstVideo.lesson.id);
    }
    if (openModules.length === 0 && displayModules.length > 0) {
      setOpenModules([displayModules[0]?.id || "0"]);
    }
  }, [allLessons, currentLessonId, displayModules, openModules.length]);

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
    // Primeira aula nunca é bloqueada
    if (allLessons.length > 0 && allLessons[0]?.lesson?.id === lessonId) {
      return false;
    }

    // Encontrar índice da aula atual
    const currentIdx = allLessons.findIndex((x) => x.lesson.id === lessonId);
    if (currentIdx <= 0) return false;

    // Aula anterior deve estar completada para acessar
    const prevLesson = allLessons[currentIdx - 1];
    return !completedLessons.has(prevLesson?.lesson?.id || "");
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
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>
          <div>
            <h1
              className="font-bold text-sm md:text-base truncate max-w-[200px] md:max-w-md"
              style={{ color: "#0E7038" }}
            >
              {courseTitle}
            </h1>
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: "#0E7038" }}
            >
              <span className="hidden md:inline">Progresso:</span>
              <div className="w-24 h-1.5 rounded-full overflow-hidden border border-gray-300 bg-gray-100">
                <div
                  style={{
                    width: `${progressWidth}%`,
                    backgroundColor: "#0E7038",
                  }}
                  className="h-full rounded-full transition-all duration-300"
                ></div>
              </div>
              <span className="font-semibold" style={{ color: "#0E7038" }}>
                {progressPercentage}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            style={{ color: "#0E7038" }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Fechar painel" : "Abrir painel"}
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile: Dropdown para Certificado */}
          <div className="md:hidden relative group">
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
            </button>
          </div>
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
            <div className="w-full bg-slate-50">
              <div className="max-w-4xl mx-auto px-6 py-8">
                {/* a new mascot-driven reader replaces the old article/tts UI */}
                <MascotReader
                  content={current.lesson.content || ""}
                  onFinished={markLessonAsComplete}
                  mascotUrl={course?.mascotUrl}
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
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      ⬇ Baixar
                    </a>
                  </div>
                </div>
                {(() => {
                  const viewer = resolveDocumentViewer(current.lesson.content);
                  return (
                    <div className="w-full h-[50vh] md:h-[70vh] border rounded-xl overflow-hidden shadow-sm bg-slate-50">
                      {viewer ? (
                        viewer.type === "image" ? (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                            <img
                              src={viewer.src}
                              alt="Documento"
                              className="max-w-full max-h-full object-contain"
                              onError={() => {
                                console.error(
                                  "Erro ao carregar imagem:",
                                  viewer.src,
                                );
                              }}
                            />
                          </div>
                        ) : viewer.type === "pdf" ? (
                          <div className="w-full h-full bg-white">
                            <Worker
                              workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}
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
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-black relative">
              <div className="absolute inset-0 flex items-center justify-center text-white/80">
                Selecione uma aula
              </div>
            </div>
          )}

          {/* Controls & Tabs */}
          <div className="max-w-5xl mx-auto p-6 md:p-8">
            {/* Lesson Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {current?.lesson?.title || "Aula"}
                </h2>
                <p className="text-gray-500 text-sm">
                  {current
                    ? `Módulo ${current.moduleIndex + 1} • Aula ${current.lessonIndex + 1}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
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
                  disabled={!completedLessons.has(currentLessonId)}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 bg-brand-green hover:bg-brand-dark shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Próxima <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-3 md:gap-6 border-b border-gray-200 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <TabButton
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
                label="Visão Geral"
              />
              <TabButton
                active={activeTab === "materials"}
                onClick={() => setActiveTab("materials")}
                label="Materiais Complementares"
              />
              <TabButton
                active={activeTab === "uploads"}
                onClick={() => setActiveTab("uploads")}
                label="Enviar Exercícios"
              />
              <TabButton
                active={activeTab === "comments"}
                onClick={() => setActiveTab("comments")}
                label={`Dúvidas (${questions.length})`}
              />
              <TabButton
                active={activeTab === "interactive"}
                onClick={() => setActiveTab("interactive")}
                label="Exercícios Interativos"
              />
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === "overview" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="prose text-gray-600 max-w-none">
                    {(() => {
                      const l: any = current?.lesson || {};
                      const desc = (l.overview ??
                        l.description ??
                        l.descricao ??
                        l.resumo ??
                        l.summary ??
                        l.cardDescription ??
                        l.fullDescription ??
                        course?.fullDescription ??
                        course?.cardDescription ??
                        "") as string;
                      const c = String(desc || "");
                      if (!c)
                        return (
                          <p className="text-gray-400">
                            Sem descrição para esta aula.
                          </p>
                        );
                      const isHtml = /<[^>]+>/.test(c);

                      if (isHtml)
                        return (
                          <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: c }}
                          />
                        );
                      return <div className="whitespace-pre-wrap">{c}</div>;
                    })()}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-full text-brand-green shadow-sm">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-brand-dark">
                          Status da Aula
                        </span>
                        <span className="text-xs text-gray-500">
                          {completedLessons.has(current?.lesson?.id || "")
                            ? "Parabéns! Você já concluiu esta aula."
                            : "Você ainda não marcou esta aula como concluída."}
                        </span>
                      </div>
                    </div>
                    {completedLessons.has(current?.lesson?.id || "") && (
                      <span className="text-xs font-black text-brand-green bg-green-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                        ✓ Aula Concluída
                      </span>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "materials" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {(() => {
                    const lesson = current?.lesson || {};
                    const courseLevel = course || {};

                    // 1. Extrair materiais definidos na lição ou curso
                    let mats = [
                      ...((lesson.materials ??
                        lesson.materiais ??
                        lesson.attachments ??
                        lesson.anexos ??
                        courseLevel.materials ??
                        courseLevel.materiais ??
                        []) as any[]),
                    ];

                    // 2. Extrair materiais dos blocos de conteúdo nativo (se for texto)
                    if (lesson.type === "text" && lesson.content) {
                      try {
                        const blocks = JSON.parse(lesson.content);
                        if (Array.isArray(blocks)) {
                          const fileBlocks = blocks
                            .filter((b: any) => b.type === "file" && b.value)
                            .map((b: any) => ({
                              title: b.fileName || "Ficheiro da Aula",
                              url: b.value,
                              type: (
                                b.value.split(".").pop() || "FILE"
                              ).toUpperCase(),
                            }));
                          mats = [...mats, ...fileBlocks];
                        }
                      } catch (e) {}
                    }

                    // 3. Adicionar o próprio conteúdo se a lição for do tipo 'document'
                    if (lesson.type === "document" && lesson.content) {
                      mats.push({
                        title: lesson.title || "Documento da Aula",
                        url: lesson.content,
                        type: (
                          lesson.content.split(".").pop() || "PDF"
                        ).toUpperCase(),
                      });
                    }

                    if (mats.length === 0) {
                      return (
                        <div className="text-sm text-gray-400 py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          Sem materiais complementares para esta aula.
                        </div>
                      );
                    }

                    // Remover duplicatas por URL
                    const uniqueMats = mats.filter(
                      (v, i, a) => a.findIndex((t) => t.url === v.url) === i,
                    );

                    return uniqueMats.map((m: any, idx: number) => {
                      const title =
                        m?.title ??
                        m?.name ??
                        m?.titulo ??
                        `Material ${idx + 1}`;
                      const type =
                        m?.type ??
                        m?.tipo ??
                        (m?.url?.split(".").pop()?.toUpperCase() || "ARQUIVO");
                      const size = m?.size ?? m?.tamanho ?? "";
                      const url = m?.url ?? m?.link ?? m?.href ?? "";
                      const ext = (url || "").toLowerCase();
                      const icon = ext.includes(".pdf") ? (
                        <FileText className="w-5 h-5 text-red-500" />
                      ) : (
                        <Download className="w-5 h-5 text-blue-500" />
                      );
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <MaterialCard
                            title={title}
                            type={type}
                            size={size}
                            icon={icon}
                          />
                        </a>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === "uploads" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div
                    className="bg-slate-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-green hover:bg-green-50/30 transition-all group cursor-pointer"
                    onClick={handleUploadClick}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-green group-hover:text-white transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Clique ou arraste seu arquivo
                    </h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">
                      Envie seus exercícios práticos ou prints do seu progresso
                      para correção ou feedback. (PNG, JPG, PDF, FIG, ZIP)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-1">
                      Seus Envios ({uploadedFiles.length})
                    </h4>
                    {uploadedFiles.length > 0 ? (
                      uploadedFiles.map((file: any) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center p-4 bg-slate-50 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow"
                        >
                          <div className="p-2.5 bg-brand-light rounded-lg">
                            <File className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <h5 className="font-bold text-gray-800 text-sm truncate">
                              {file.fileName}
                            </h5>
                            <p className="text-xs text-gray-400">
                              {file.size} •{" "}
                              {file.createdAt?.toDate
                                ? file.createdAt.toDate().toLocaleString()
                                : ""}
                            </p>
                          </div>
                          <Download className="w-4 h-4 text-gray-400" />
                        </a>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-400">
                          Nenhum arquivo enviado ainda.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-bold">
                      {(user?.displayName || "A")[0]}
                    </div>
                    <div className="flex-1">
                      <div className="relative group">
                        <textarea
                          className="w-full border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green transition-all bg-white shadow-sm resize-none"
                          placeholder="Tem alguma dúvida sobre esta aula? Pergunte aqui e a comunidade irá ajudar..."
                          rows={3}
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                        ></textarea>
                        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                          <span className="text-[10px] text-gray-400 font-medium">
                            Pressione Enter ↵ para enviar
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={async () => {
                            if (!newQuestion.trim() || !id || !user?.uid)
                              return;
                            try {
                              await addDoc(collection(db, "questions"), {
                                course_id: id,
                                lesson_id: currentLessonId || null,
                                user_uid: user.uid,
                                user_name:
                                  user.displayName ||
                                  profile?.full_name ||
                                  "Formando",
                                instructor_uid:
                                  course?.instructor_uid ||
                                  course?.creator_uid ||
                                  null,
                                course_title: course?.title || "",
                                lesson_title: current?.lesson?.title || "",
                                text: newQuestion.trim(),
                                status: "pending",
                                createdAt: serverTimestamp(),
                              });
                              setNewQuestion("");
                              showToast(
                                "Sua dúvida foi enviada com sucesso!",
                                "success",
                              );
                            } catch (e) {
                              showToast(
                                "Não foi possível enviar sua dúvida.",
                                "error",
                              );
                            }
                          }}
                          className="bg-brand-green text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand-dark transition-all shadow-lg hover:shadow-brand-green/20 active:scale-95 flex items-center gap-2"
                        >
                          Publicar Pergunta
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {questions.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400">
                        Nenhuma dúvida registrada ainda. Seja o primeiro a
                        perguntar!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        // Separar questões da lição atual e outras
                        const lessonQuestions = questions.filter(
                          (q) => q.lesson_id === currentLessonId,
                        );
                        const otherQuestions = questions.filter(
                          (q) => q.lesson_id !== currentLessonId,
                        );

                        return (
                          <>
                            {lessonQuestions.length > 0 && (
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
                                  Nesta Aula
                                </h4>
                                {lessonQuestions.map((q: any) => (
                                  <Comment
                                    key={q.id}
                                    author={q.user_name || "Formando"}
                                    date={
                                      q.createdAt?.toDate
                                        ? q.createdAt.toDate().toLocaleString()
                                        : ""
                                    }
                                    text={q.text}
                                    replies={
                                      q.repliesCount ||
                                      answersByQ[q.id]?.length ||
                                      0
                                    }
                                    onReplyClick={() => {
                                      if (!openReplies[q.id])
                                        toggleReplies(q.id);
                                    }}
                                    onRepliesClick={() => toggleReplies(q.id)}
                                    isRepliesOpen={!!openReplies[q.id]}
                                    replyValue={replyDraft[q.id] || ""}
                                    onReplyChange={(v: string) =>
                                      setReplyDraft((prev) => ({
                                        ...prev,
                                        [q.id]: v,
                                      }))
                                    }
                                    onReplySubmit={() => sendReply(q)}
                                    answersList={answersByQ[q.id] || []}
                                  />
                                ))}
                              </div>
                            )}

                            {otherQuestions.length > 0 && (
                              <div className="space-y-4 pt-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                  Outras Dúvidas do Curso
                                </h4>
                                {otherQuestions.map((q: any) => (
                                  <Comment
                                    key={q.id}
                                    author={q.user_name || "Formando"}
                                    date={
                                      q.createdAt?.toDate
                                        ? q.createdAt.toDate().toLocaleString()
                                        : ""
                                    }
                                    text={q.text}
                                    replies={
                                      q.repliesCount ||
                                      answersByQ[q.id]?.length ||
                                      0
                                    }
                                    onReplyClick={() => {
                                      if (!openReplies[q.id])
                                        toggleReplies(q.id);
                                    }}
                                    onRepliesClick={() => toggleReplies(q.id)}
                                    isRepliesOpen={!!openReplies[q.id]}
                                    replyValue={replyDraft[q.id] || ""}
                                    onReplyChange={(v: string) =>
                                      setReplyDraft((prev) => ({
                                        ...prev,
                                        [q.id]: v,
                                      }))
                                    }
                                    onReplySubmit={() => sendReply(q)}
                                    answersList={answersByQ[q.id] || []}
                                    lessonTitle={q.lesson_title}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "interactive" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <InteractiveQuiz
                    lesson={current?.lesson}
                    course={course}
                    onExerciseStatusUpdate={(
                      exId: string,
                      ok: boolean,
                      isFinal?: boolean,
                    ) => {
                      if (ok) {
                        if (isFinal) {
                          markExerciseAsComplete(exId);
                        } else {
                          setExerciseResults((prev) => ({
                            ...prev,
                            [exId]: true,
                          }));
                        }
                      } else {
                        setExerciseResults((prev) => ({
                          ...prev,
                          [exId]: false,
                        }));
                      }
                    }}
                    results={exerciseResults}
                    showToast={showToast}
                    completedList={completedExercises}
                  />
                </div>
              )}
            </div>
          </div>
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
}: any) => {
  const list = useMemo(() => {
    const all = Array.isArray(course?.interactiveExercises)
      ? course.interactiveExercises
      : [];
    // Filtrar exercícios por aula
    const currentLessonId = String(lesson?.id || "");
    return all.filter(
      (ex: any) =>
        String(ex.lessonId || ex.lesson_id || "") === currentLessonId,
    );
  }, [course, lesson]);

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
              className="p-2 bg-brand-green text-white rounded-full hover:bg-brand-dark transition-all active:scale-95 shadow-md"
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
