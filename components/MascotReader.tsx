import React, { useEffect, useRef, useState } from "react";

interface MascotReaderProps {
  content: string;
  onFinished?: () => void;
  /** optional URL for mascot image; default uses a placeholder */
  mascotUrl?: string;
}

const defaultMascot = "/mascot.png"; // developer should supply a better asset in public/

// utility to pick the most "human" PT voice currently available
function chooseVoice(): SpeechSynthesisVoice | null {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  // Prefer Portuguese (Portugal) neural/modern voices first
  let candidate = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith("pt-pt") &&
      /google|microsoft|neural|natural/i.test(v.name),
  );
  if (!candidate) {
    candidate = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("pt") &&
        /google|microsoft|neural|natural/i.test(v.name),
    );
  }
  if (!candidate) {
    candidate = voices.find((v) => v.lang.toLowerCase().startsWith("pt"));
  }
  return candidate || null;
}

export const MascotReader: React.FC<MascotReaderProps> = ({
  content,
  onFinished,
  mascotUrl,
}) => {
  const [slides, setSlides] = useState<React.ReactNode[]>([]);
  const [readHistory, setReadHistory] = useState<React.ReactNode[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [estimated, setEstimated] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // when content changes reset
  useEffect(() => {
    setSlides(parseContentToSlides(content));
    setCurrentSlide(0);
    setIsSpeaking(false);
  }, [content]);

  // when slides or current changes, speak
  useEffect(() => {
    if (slides.length === 0) return;
    speakSlide(currentSlide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, currentSlide]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakSlide = (index: number) => {
    setPaused(false);
    window.speechSynthesis.cancel();
    const text = slideText(slides[index]);
    if (!text) {
      advance();
      return;
    }
    // estimate duration in seconds (~0.3s per word)
    const words = text
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean).length;
    const est = Math.ceil(words * 0.3);
    setEstimated(est);
    setElapsed(0);
    // start timer
    if (est > 0) {
      const interval = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= est) {
            clearInterval(interval);
          }
          return e + 1;
        });
      }, 1000);
    }

    const speakNow = () => {
      const u = new SpeechSynthesisUtterance(text);
      const voice = chooseVoice();
      if (voice) u.voice = voice;
      // default to Portuguese Portugal
      u.lang = voice?.lang || "pt-PT";
      u.rate = 0.95;
      u.pitch = 1;
      u.onstart = () => {
        setIsSpeaking(true);
        setPaused(false);
        // reset elapsed (already done)
      };
      u.onend = () => {
        setIsSpeaking(false);
        // record history so user can scroll back
        setReadHistory((h) => [...h, slides[index]]);
        advance();
      };
      u.onerror = () => {
        setIsSpeaking(false);
        // still advance to avoid lock
        setReadHistory((h) => [...h, slides[index]]);
        advance();
      };
      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
    };

    // ensure voices loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      const handler = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
        speakNow();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
    } else {
      speakNow();
    }
  };

  const advance = () => {
    setPaused(false);
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((i) => i + 1);
    } else {
      if (onFinished) onFinished();
    }
  };

  const handleSkip = () => {
    window.speechSynthesis.cancel();
    setPaused(false);
    setCurrentSlide(slides.length - 1);
  };

  return (
    <div className="p-6 bg-white border border-gray-300 rounded-xl space-y-6">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="w-40 flex-shrink-0">
          <img
            src={mascotUrl || defaultMascot}
            alt="Mascote"
            className="w-full h-auto transition-transform duration-200 ease-in-out"
            style={isSpeaking ? { animation: "talk 0.4s infinite" } : undefined}
          />
        </div>
        <div className="flex-1">
          {/* current slide banner, large area similar to video aspect ratio */}
          <div className="bg-white p-6 rounded-xl shadow-lg aspect-video overflow-auto">
            <div className="prose max-w-none">
              {slides[currentSlide] || <em>Sem conteúdo</em>}
            </div>
          </div>
          {/* history of read slides shown below current */}
          {readHistory.length > 0 && (
            <div className="mt-6 bg-gray-100 p-4 rounded-lg space-y-2 max-h-40 overflow-y-auto">
              <strong className="text-sm text-gray-600">Texto já lido:</strong>
              {readHistory.map((s, i) => (
                <div key={i} className="prose max-w-none">
                  {s}
                </div>
              ))}
            </div>
          )}
          {slides.length > 1 && (
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Slide {currentSlide + 1} de {slides.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-sm text-blue-600 hover:underline"
              >
                Pular leitura
              </button>
              <button
                onClick={advance}
                disabled={isSpeaking}
                className="text-sm bg-brand-green text-white px-3 py-1 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function slideText(node: React.ReactNode): string {
  if (typeof node === "string") {
    // strip raw urls
    return node.replace(/https?:\/\/\S+/gi, "");
  }
  if (React.isValidElement(node)) {
    const props: any = node.props || {};
    // skip anchors/links entirely
    if (node.type === "a" || node.type === "link") return "";
    if (typeof props.children === "string") {
      return props.children.replace(/https?:\/\/\S+/gi, "");
    }
    if (Array.isArray(props.children)) {
      return props.children.map(slideText).join(" ");
    }
  }
  return "";
}

function parseContentToSlides(raw: string): React.ReactNode[] {
  // remove image tags and links to avoid showing/reading them
  const cleaned = raw
    .replace(/<img[^>]*>/gi, "")
    .replace(/<a[^>]*>(.*?)<\/a>/gi, "")
    .trim();

  const slides: React.ReactNode[] = [];
  // try JSON blocks
  try {
    const parsed = JSON.parse(cleaned);
    const blocks = Array.isArray(parsed) ? parsed : parsed.blocks || [];
    if (Array.isArray(blocks) && blocks.length > 0) {
      blocks.forEach((block: any, idx: number) => {
        slides.push(renderBlock(block, idx));
      });
      return slides;
    }
  } catch {}

  // fallback: split by two newlines or <p>
  const parts = cleaned
    .split(/(?:\r?\n){2,}|<p[^>]*>/i)
    .map((p) => p.trim())
    .filter((p) => p);
  if (parts.length > 1) {
    parts.forEach((p, i) => {
      slides.push(<div key={i} dangerouslySetInnerHTML={{ __html: p }} />);
    });
    return slides;
  }

  // single slide
  return [<div key="only" dangerouslySetInnerHTML={{ __html: cleaned }} />];
}

function renderBlock(block: any, key: number): React.ReactNode {
  // mimic a subset of CoursePlayerPage rendering logic
  const text = block.value || block.text || block.content || "";
  switch (block.type) {
    case "h1":
      return (
        <h1 key={key} className="text-3xl font-extrabold text-gray-900">
          {text}
        </h1>
      );
    case "h2":
      return (
        <h2 key={key} className="text-2xl font-bold text-gray-800">
          {text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="text-xl font-bold text-gray-800">
          {text}
        </h3>
      );
    case "p":
    default:
      return (
        <p key={key} className="text-gray-700 leading-relaxed">
          {text}
        </p>
      );
  }
}

export default MascotReader;
