import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSpeech } from "react-text-to-speech";
import { ChevronRight, ChevronLeft, Volume2, VolumeX, Play, Pause, SkipForward, Headphones } from "lucide-react";

interface MascotReaderProps {
  content: string;
  onFinished?: () => void;
  mascotUrl?: string;
}

const defaultMascot = "https://cdn-icons-png.flaticon.com/512/4140/4140047.png"; // A more "active" looking avatar

export const MascotReader: React.FC<MascotReaderProps> = ({
  content,
  onFinished,
  mascotUrl,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Get system voices once available
  useEffect(() => {
    const handleVoicesChanged = () => {
      setSystemVoices(window.speechSynthesis.getVoices());
    };
    handleVoicesChanged();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }
  }, []);

  // Parse content into slides and bullet points
  const slides = useMemo(() => {
    let raw = content.trim();
    
    try {
      const parsed = JSON.parse(raw);
      const blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
      
      if (Array.isArray(blocks) && blocks.length > 0) {
        const slideGroups: any[] = [];
        let currentSlide: { title: string; points: string[] } | null = null;

        blocks.forEach((block: any) => {
          const type = block.type || 'p';
          const val = block.value || block.text || block.content || "";
          if (!val) return;

          if (type === 'h1' || type === 'h2' || type === 'h3') {
            if (currentSlide) slideGroups.push(currentSlide);
            currentSlide = { title: val, points: [] };
          } else {
            if (!currentSlide) currentSlide = { title: "Resumo da Aula", points: [] };
            currentSlide.points.push(val);
          }
        });
        if (currentSlide) slideGroups.push(currentSlide);
        return slideGroups;
      }
    } catch (e) {}

    const cleaned = raw.replace(/<img[^>]*>/gi, "").replace(/<a[^>]*>(.*?)<\/a>/gi, "").trim();
    const parts = cleaned.split(/(?:\r?\n){2,}/).filter(p => p.trim());
    return parts.map(part => {
      const lines = part.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const title = lines[0].startsWith('#') ? lines[0].replace(/^#+\s*/, '') : null;
      const bodyLines = title ? lines.slice(1) : lines;
      return {
        title: title || (bodyLines.length > 1 ? "Pontos Importantes" : ""),
        points: bodyLines.map(line => line.replace(/^[\s*-+>]+\s*/, '').replace(/^\d+\.\s*/, ''))
      };
    });
  }, [content]);

  const currentSlide = slides[currentSlideIndex];
  const textToSpeak = currentSlide ? `${currentSlide.title}. ${currentSlide.points.join(". ")}` : "";
  const lastSpokenSlideRef = React.useRef<number>(-1);
  
  const bestVoiceURI = useMemo(() => {
    const ptVoices = systemVoices.filter((v: any) => v.lang.startsWith("pt"));
    const neural = ptVoices.find((v: any) => /neural|natural|google|microsoft|duarte|fernanda/i.test(v.name));
    return neural ? neural.voiceURI : (ptVoices[0]?.voiceURI || "");
  }, [systemVoices]);

  const { speechStatus, start, pause, stop } = useSpeech({
    text: textToSpeak,
    lang: "pt-PT",
    voiceURI: bestVoiceURI,
    rate: 0.92, // Slightly slower for even more natural feel
    pitch: 1,
    volume: 1,
  });

  const speechRef = React.useRef({ start, stop, pause });
  useEffect(() => { speechRef.current = { start, stop, pause }; }, [start, stop, pause]);

  useEffect(() => {
    if (!hasInteracted) return;
    if (lastSpokenSlideRef.current === currentSlideIndex) return;
    if (speechRef.current.stop) { try { speechRef.current.stop(); } catch (e) {} }
    
    const timer = setTimeout(() => {
      if (textToSpeak && speechRef.current.start) {
        try { 
          speechRef.current.start(); 
          lastSpokenSlideRef.current = currentSlideIndex;
        } catch (e) { console.error("Speech start failed:", e); }
      }
    }, 850);
    return () => { clearTimeout(timer); };
  }, [currentSlideIndex, textToSpeak, hasInteracted]);

  const isSpeaking = speechStatus === "started";
  if (slides.length === 0) return null;

  return (
    <div className="relative w-full max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-100 h-[680px] flex flex-col md:flex-row font-sans">
      {/* Autoplay Overlay */}
      {!hasInteracted && (
        <div className="absolute inset-0 z-50 bg-[#072d17ef] backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-white">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md">
            <div className="mb-8 relative">
               <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-brand-green rounded-full blur-3xl" />
               <Headphones className="w-24 h-24 text-brand-green relative z-10 mx-auto" strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Experiência Imersiva</h2>
            <p className="text-gray-300 mb-10 text-lg font-medium">Toque para iniciar a leitura assistida pelo seu instrutor virtual.</p>
            <button
              onClick={() => {
                setHasInteracted(true);
                if (textToSpeak && speechRef.current.start) {
                   speechRef.current.start();
                   lastSpokenSlideRef.current = currentSlideIndex;
                }
              }}
              className="px-14 py-5 bg-brand-green hover:bg-white hover:text-brand-green text-white font-black text-xl rounded-full shadow-[0_20px_40px_-10px_rgba(14,112,56,0.5)] transition-all active:scale-95 flex items-center gap-4 mx-auto group"
            >
              <Play className="w-6 h-6 fill-current" />
              COMECAR AGORA
            </button>
          </motion.div>
        </div>
      )}

      {/* Mascot Side - Moving Avatar */}
      <div className="w-full md:w-[30%] bg-[#f8faf9] p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden">
        {/* Animated background patterns for the avatar */}
        <div className="absolute inset-0 opacity-50">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -left-20 w-64 h-64 border-[1px] border-brand-green/20 rounded-full" />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -bottom-20 -right-20 w-80 h-80 border-[1px] border-brand-green/10 rounded-full" />
        </div>

        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: isSpeaking ? [0, 2, -2, 0] : [0, 1, -1, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative z-10"
        >
          {/* Speaking frequency bars */}
          {isSpeaking && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 items-end h-8">
                {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                    <motion.div 
                        key={i}
                        animate={{ height: [`${h*4}px`, `${h*8}px`, `${h*4}px`] }}
                        transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                        className="w-1.5 bg-brand-green rounded-full"
                    />
                ))}
            </div>
          )}
          
          <img
            src={mascotUrl || defaultMascot}
            alt="Mascote"
            className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.1)] relative z-10"
          />
        </motion.div>

        <div className="mt-16 text-center z-10">
            <span className="px-3 py-1 bg-brand-green/10 text-brand-green text-[10px] font-black rounded-full uppercase tracking-widest border border-brand-green/20">Modo Assistido</span>
            <div className="mt-8 flex items-center gap-4">
                <button 
                    onClick={() => isSpeaking ? (pause && pause()) : (start && start())}
                    className="w-14 h-14 bg-white rounded-2xl shadow-xl text-brand-green hover:scale-110 flex items-center justify-center transition-all border border-gray-100"
                >
                    {isSpeaking ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                </button>
            </div>
        </div>
      </div>

      {/* Content Side - Precise Typography & Scrollable */}
      <div className="flex-1 flex flex-col bg-white relative">
        <div className="p-8 md:p-12 pb-4">
            {currentSlide.title && (
                <h3 className="text-xl md:text-2xl font-black text-[#0c2d1c] mb-2 tracking-tight">
                    {currentSlide.title}
                </h3>
            )}
            <div className="h-1 w-16 bg-brand-green rounded-full" />
        </div>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 p-8 pt-0 overflow-y-auto custom-scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {currentSlide.points.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-5 rounded-2xl bg-[#f9fafb] border border-gray-50 hover:border-brand-green/30 transition-all hover:shadow-md group"
                >
                  <div className="mt-1 w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-brand-green shadow-sm group-hover:bg-brand-green group-hover:text-white transition-colors">
                    {i + 1}
                  </div>
                  <p className="text-[14px] md:text-[15px] text-[#4a5568] leading-[1.7] font-medium tracking-tight">
                    {point}
                  </p>
                </motion.div>
              ))}
              {/* Extra space at bottom of scroll */}
              <div className="h-8" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="p-8 bg-white border-t border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="flex -space-x-1">
                    {[...Array(Math.min(slides.length, 5))].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full border border-white ${i <= currentSlideIndex ? 'bg-brand-green' : 'bg-gray-200'}`} />
                    ))}
                </div>
                <span className="text-[12px] font-bold text-gray-400">Página {currentSlideIndex + 1} de {slides.length}</span>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setCurrentSlideIndex(p => Math.max(0, p - 1))}
                    disabled={currentSlideIndex === 0}
                    className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-brand-green disabled:opacity-30 transition-all"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    onClick={() => {
                        if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(p => p + 1);
                        else onFinished?.();
                    }}
                    className="flex items-center gap-3 px-8 py-3.5 bg-brand-green text-white font-black rounded-xl hover:shadow-lg shadow-brand-green/20 transition-all active:scale-95 text-xs tracking-widest uppercase"
                >
                    {currentSlideIndex === slides.length - 1 ? "Concluir" : "Próximo"}
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #0E703830;
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #0E7038;
        }
      `}} />
    </div>
  );
};

export default MascotReader;
