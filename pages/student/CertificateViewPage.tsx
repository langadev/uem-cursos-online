import { doc, onSnapshot } from "firebase/firestore";
import { toPng } from "html-to-image";
import {
    Award,
    ChevronLeft,
    Download,
    GraduationCap,
    Loader2,
    Printer,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";

const CertificateViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [course, setCourse] = useState<any | null>(null);
  const [totalLessons, setTotalLessons] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "courses", id), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      setCourse(data ? { id: snap.id, ...data } : null);
      const total = Array.isArray((data as any)?.modules)
        ? (data as any).modules.reduce(
            (acc: number, m: any) =>
              acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
            0,
          )
        : (data as any)?.totalLessons || 0;
      setTotalLessons(total);
    });
    return () => unsub();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (certificateRef.current === null) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(certificateRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2, // High resolution
      });

      const link = document.createElement("a");
      link.download = `Certificado-UEM-${course?.title.replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      alert(
        "Ocorreu um erro ao baixar o certificado. Tente imprimir como PDF.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (!course)
    return (
      <div className="p-20 text-center font-bold">
        Carregando certificado...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center overflow-x-hidden">
      {/* Action Bar (Hidden in Print) */}
      <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 print:hidden">
        <Link
          to="/aluno/certificados"
          className="flex items-center gap-2 text-gray-600 hover:text-brand-dark font-semibold transition-colors"
        >
          <ChevronLeft className="w-5 h-5" /> Voltar para Certificados
        </Link>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 font-bold transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
          <button
            disabled={isDownloading}
            onClick={handleDownloadPng}
            className="flex items-center gap-2 bg-brand-green text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-900/10 hover:bg-brand-dark font-bold transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download PNG
              </>
            )}
          </button>
        </div>
      </div>

      {/* Certificate Container Wrapper - Ensures centered and contained */}
      <div className="w-full flex justify-center py-4 overflow-x-auto">
        {/* Certificate Content */}
        <div
          ref={certificateRef}
          className="bg-white w-[1000px] aspect-[1.414/1] shadow-2xl relative flex flex-col certificate-print-area flex-shrink-0"
        >
          {/* Border System - Outer Brand Green Border */}
          <div className="absolute inset-0 border-[16px] border-brand-green pointer-events-none z-10"></div>

          {/* Main Content Area with padding to accommodate outer border */}
          <div className="m-[16px] flex-1 flex flex-col relative overflow-hidden bg-white">
            {/* Inner Accent Gold Border */}
            <div className="absolute inset-4 border-[3px] border-brand-accent pointer-events-none"></div>

            <div className="flex-1 flex flex-col items-center text-center p-16 relative z-0">
              {/* Background Logo Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                <GraduationCap size={400} />
              </div>

              {/* Header */}
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-brand-dark p-3 rounded-xl shadow-sm">
                  <GraduationCap className="text-white w-10 h-10" />
                </div>
                <span className="text-4xl font-black text-brand-dark tracking-tight">
                  Edu<span className="text-brand-accent">Prime</span>
                </span>
              </div>

              <h1 className="text-5xl font-serif text-brand-dark mb-4 tracking-tighter uppercase font-medium">
                Certificado de Conclusão
              </h1>
              <div className="w-32 h-1 bg-brand-accent mb-10"></div>

              <p
                className="text-xl font-medium mb-4 italic font-sans"
                style={{ color: "#0E7038" }}
              >
                Certificamos que
              </p>
              <h2 className="text-6xl font-bold text-gray-900 mb-8 font-serif leading-none">
                {profile?.full_name ||
                  user?.displayName ||
                  user?.email?.split("@")[0] ||
                  "Utilizador"}
              </h2>

              <p
                className="max-w-2xl leading-relaxed mb-10 font-sans"
                style={{ color: "#0E7038" }}
              >
                <span style={{ fontSize: "1.25rem" }}>
                  concluiu com êxito o programa de especialização em
                </span>{" "}
                <br />
                <strong
                  className="text-3xl block mt-4 font-bold tracking-tight"
                  style={{ color: "#0E7038" }}
                >
                  {course.title}
                </strong>
                <span
                  className="block mt-4 text-lg"
                  style={{ color: "#0E7038" }}
                >
                  com carga horária total de{" "}
                  {course?.duration || `${totalLessons} aulas`}.
                </span>
              </p>

              {/* Bottom Signatures Area */}
              <div className="mt-auto w-full grid grid-cols-3 gap-12 items-end px-10">
                <div className="flex flex-col items-center">
                  <div
                    className="w-full border-b-2 border-gray-200 pb-2 mb-2 italic font-serif text-lg"
                    style={{ color: "#0E7038" }}
                  >
                    Julia Santos
                  </div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[2px]"
                    style={{ color: "#0E7038" }}
                  >
                    Coordenadora Acadêmica
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center mb-2">
                    <div className="absolute inset-0 border-2 border-brand-accent/30 rounded-full animate-pulse"></div>
                    <div className="w-20 h-20 bg-brand-accent rounded-full flex items-center justify-center text-white shadow-xl">
                      <Award size={40} />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[1px]">
                    Selo de Autenticidade
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className="w-full border-b-2 border-gray-200 pb-2 mb-2 font-mono text-lg"
                    style={{ color: "#0E7038" }}
                  >
                    24/10/2024
                  </div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[2px]"
                    style={{ color: "#0E7038" }}
                  >
                    Data de Emissão
                  </p>
                </div>
              </div>

              <div
                className="mt-10 text-[9px] font-mono tracking-widest uppercase"
                style={{ color: "#0E7038" }}
              >
                ID de Autenticação: UEM-
                {Math.random().toString(36).substr(2, 9).toUpperCase()} •
                Verifique em uemcursos.com/verify
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .certificate-print-area {
            box-shadow: none !important;
            width: 100% !important;
            height: auto !important;
            max-width: none !important;
            margin: 0 !important;
            aspect-ratio: 1.414/1 !important;
          }
          .print\\:hidden { display: none !important; }
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default CertificateViewPage;
