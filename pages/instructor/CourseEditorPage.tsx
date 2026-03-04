import {
    ArrowLeft,
    Bold,
    Check,
    CheckCircle,
    ChevronDown,
    File as FileIcon,
    FileText,
    FileUp,
    GripVertical,
    Heading,
    HelpCircle,
    Image as ImageIcon,
    Info,
    Italic,
    Layout,
    Link as LinkIcon,
    List,
    ListOrdered,
    MonitorPlay,
    Plus,
    PlusCircle,
    Plus as PlusIcon,
    Quote,
    Save,
    Trash2,
    Type,
    X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import api from "../../services/api";
import { isSupabaseConfigured, supabase } from "../../services/supabase";

interface Lesson {
  id: string;
  title: string;
  type: "video" | "text" | "document";
  content: string; // URL para vídeo, texto bruto, ou nome do arquivo
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface InteractiveExerciseOption {
  id: string;
  text: string;
  correct: boolean;
}
interface InteractiveExerciseTarget {
  id: string;
  label: string;
}
interface InteractiveExerciseItem {
  id: string;
  text: string;
  targetId?: string;
}
interface TFStatement {
  id: string;
  text: string;
  answer: boolean;
}
interface FillBlankBlank {
  id: string;
  label?: string;
  answers: string[];
}
interface InteractiveExercise {
  id: string;
  type: "quiz" | "dragdrop" | "truefalse" | "fillblank" | "matching";
  title: string;
  lessonId?: string; // ID da aula a que este exercício pertence
  description?: string;
  settings?: {
    multiSelect?: boolean;
    explanation?: string;
    penalty?: number;
    timedSeconds?: number;
    points?: number;
    caseSensitive?: boolean;
  };
  quiz?: { question: string; options: InteractiveExerciseOption[] };
  dragdrop?: {
    prompt: string;
    targets: InteractiveExerciseTarget[];
    items: InteractiveExerciseItem[];
  };
  truefalse?: { statements: TFStatement[] };
  fillblank?: { prompt: string; blanks: FillBlankBlank[] };
}

// Block Content Interfaces
export type BlockType =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "p"
  | "image"
  | "quote"
  | "list"
  | "list-ordered"
  | "file";

export interface ContentBlock {
  id: string;
  type: BlockType;
  value: string;
  emoji?: string;
  iconUrl?: string;
  fileName?: string;
}

const COMMON_EMOJIS = [
  "💡",
  "📝",
  "🎯",
  "🚀",
  "📢",
  "❓",
  "✅",
  "⭐",
  "🔥",
  "💎",
];

const LessonBlockEditor: React.FC<{
  blocksJson: string;
  onChange: (json: string) => void;
  onUploadFile: (file: File) => Promise<string>;
}> = ({ blocksJson, onChange, onUploadFile }) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    try {
      const parsed = JSON.parse(blocksJson);
      return Array.isArray(parsed)
        ? parsed
        : [{ id: "1", type: "p", value: blocksJson }];
    } catch {
      return [{ id: "1", type: "p", value: blocksJson || "" }];
    }
  });

  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(
    null,
  );

  useEffect(() => {
    onChange(JSON.stringify(blocks));
  }, [blocks]);

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, value: string, fileName?: string) => {
    setBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, value, fileName: fileName || b.fileName } : b,
      ),
    );
  };

  const updateEmoji = (id: string, emoji: string, iconUrl?: string) => {
    setBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, emoji, iconUrl: iconUrl ?? "" } : b,
      ),
    );
    setActiveEmojiPicker(null);
  };

  const handleFileUploadInBlock = async (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await onUploadFile(file);
      updateBlock(id, url, file.name);
    } catch (err) {
      console.error("File upload failed:", err);
    }
  };

  const handleMiniIconUpload = async (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await onUploadFile(file);
      updateEmoji(id, "", url);
    } catch (err) {
      console.error("Mini icon upload failed:", err);
    }
  };

  const removeBlock = (id: string) => {
    if (blocks.length === 1) {
      setBlocks([{ id: "1", type: "p", value: "" }]);
      return;
    }
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[index],
    ];
    setBlocks(newBlocks);
  };

  const handleImageUpload = async (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await onUploadFile(file);
      updateBlock(id, url);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  const toggleStyle = (blockId: string, char: string) => {
    const el = document.getElementById(`input-block-${blockId}`) as
      | HTMLTextAreaElement
      | HTMLInputElement;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const text = el.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newVal = `${before}${char}${selection}${char}${after}`;
    updateBlock(blockId, newVal);

    // Reset focus and selection
    setTimeout(() => {
      el.focus();
      const offset = char.length;
      el.setSelectionRange(start + offset, end + offset);
    }, 10);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          onClick={() => addBlock("h1")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <Heading size={14} /> Título 1
        </button>
        <button
          type="button"
          onClick={() => addBlock("h2")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <Heading size={12} /> Título 2
        </button>
        <button
          type="button"
          onClick={() => addBlock("h3")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <Heading size={10} /> Título 3
        </button>
        <button
          type="button"
          onClick={() => addBlock("h4")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <Heading size={8} /> Título 4
        </button>
        <button
          type="button"
          onClick={() => addBlock("p")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <Plus size={14} /> Parágrafo
        </button>
        <button
          type="button"
          onClick={() => addBlock("image")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <ImageIcon size={14} /> Imagem
        </button>
        <button
          type="button"
          onClick={() => addBlock("file")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <FileIcon size={14} /> Ficheiro
        </button>
        <button
          type="button"
          onClick={() => addBlock("quote")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <Quote size={14} /> Citação
        </button>
        <button
          type="button"
          onClick={() => addBlock("list")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <List size={14} /> Bullets
        </button>
        <button
          type="button"
          onClick={() => addBlock("list-ordered")}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:border-brand-green text-xs flex items-center gap-1"
        >
          <ListOrdered size={14} /> Numerada
        </button>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className="group relative bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-brand-green/30 transition-all"
          >
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                disabled={index === 0}
                onClick={() => moveBlock(index, "up")}
                className="p-1 text-gray-400 hover:text-brand-green disabled:opacity-30"
              >
                <ChevronDown size={14} className="rotate-180" />
              </button>
              <GripVertical size={14} className="text-gray-300" />
              <button
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(index, "down")}
                className="p-1 text-gray-400 hover:text-brand-green disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-1">
                {/* Ícone Redondo e Grande no topo direito */}
                <div className="absolute -top-3 -right-3 flex items-center gap-2 z-20">
                  {(block.emoji || block.iconUrl) && (
                    <div className="w-10 h-10 bg-white rounded-full border-2 border-brand-green/10 shadow-xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                      {block.emoji ? (
                        <span className="text-xl">{block.emoji}</span>
                      ) : (
                        <img
                          src={block.iconUrl}
                          className="w-full h-full object-cover"
                          alt="icon"
                        />
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveEmojiPicker(
                          activeEmojiPicker === block.id ? null : block.id,
                        )
                      }
                      className="p-1.5 bg-white border border-gray-100 text-gray-400 hover:text-brand-green hover:border-brand-green rounded-full shadow-sm transition-all"
                      title="Alterar Ícone"
                    >
                      <PlusIcon size={14} />
                    </button>

                    {activeEmojiPicker === block.id && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl p-3 flex flex-col gap-3 w-56 z-[100] animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-wrap gap-2">
                          {COMMON_EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => updateEmoji(block.id, e, "")}
                              className="p-2 hover:bg-gray-50 rounded-lg text-2xl transition-transform hover:scale-125"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-50 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              document
                                .getElementById(`mini-img-${block.id}`)
                                ?.click()
                            }
                            className="w-full text-xs flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-brand-green/10 text-brand-green rounded-xl transition-colors font-bold"
                          >
                            <ImageIcon size={14} /> Upload de Imagem
                          </button>
                          <input
                            id={`mini-img-${block.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleMiniIconUpload(block.id, e)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => updateEmoji(block.id, "", "")}
                          className="w-full text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest pt-1 border-t border-gray-50"
                        >
                          Remover Ícone
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {block.type === "h1" && (
                  <div className="relative group/field">
                    <input
                      id={`input-block-${block.id}`}
                      type="text"
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Título Principal..."
                      className="w-full text-xl font-bold border-none outline-none focus:ring-0 placeholder:text-gray-300 pr-24"
                    />
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "h2" && (
                  <div className="relative group/field">
                    <input
                      id={`input-block-${block.id}`}
                      type="text"
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Subtítulo..."
                      className="w-full text-lg font-bold border-none outline-none focus:ring-0 placeholder:text-gray-300 text-gray-700 pr-24"
                    />
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "h3" && (
                  <div className="relative group/field">
                    <input
                      id={`input-block-${block.id}`}
                      type="text"
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Título nível 3..."
                      className="w-full text-base font-bold border-none outline-none focus:ring-0 placeholder:text-gray-300 text-gray-600 pr-24"
                    />
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "h4" && (
                  <div className="relative group/field">
                    <input
                      id={`input-block-${block.id}`}
                      type="text"
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Título nível 4..."
                      className="w-full text-sm font-bold border-none outline-none focus:ring-0 placeholder:text-gray-300 text-gray-500 pr-24 uppercase tracking-wide"
                    />
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "p" && (
                  <div className="relative group/field">
                    <textarea
                      id={`input-block-${block.id}`}
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Escreva seu parágrafo..."
                      className="w-full text-sm border-none outline-none focus:ring-0 placeholder:text-gray-300 resize-none overflow-hidden min-h-[1.5rem] pr-24"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = target.scrollHeight + "px";
                      }}
                    />
                    <div className="absolute right-12 bottom-0 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity mb-1">
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "quote" && (
                  <div className="border-l-4 border-brand-green pl-4 italic text-gray-600 relative group/field">
                    <textarea
                      id={`input-block-${block.id}`}
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Citação importante..."
                      className="w-full text-sm border-none outline-none focus:ring-0 bg-transparent placeholder:text-gray-300 resize-none overflow-hidden pr-24"
                      rows={1}
                    />
                    <div className="absolute right-12 bottom-0 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity mb-1">
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "list" && (
                  <div className="flex items-start gap-3 relative group/field">
                    <div className="w-2 h-2 rounded-full bg-brand-green shrink-0 mt-1.5" />
                    <textarea
                      id={`input-block-${block.id}`}
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Item da lista..."
                      className="w-full text-sm border-none outline-none focus:ring-0 placeholder:text-gray-300 resize-none overflow-hidden pr-24"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = target.scrollHeight + "px";
                      }}
                    />
                    <div className="absolute right-12 bottom-0 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity mb-1">
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "list-ordered" && (
                  <div className="flex items-start gap-3 relative group/field">
                    <span className="text-brand-green font-bold text-sm min-w-[20px] text-right mt-0.5">
                      {(() => {
                        // Tentar descobrir a posição na lista atual
                        const listBlocks = blocks.filter(
                          (b) => b.type === "list-ordered",
                        );
                        const pos = listBlocks.findIndex(
                          (b) => b.id === block.id,
                        );
                        return pos >= 0 ? `${pos + 1}.` : "1.";
                      })()}
                    </span>
                    <textarea
                      id={`input-block-${block.id}`}
                      value={block.value}
                      onChange={(e) => updateBlock(block.id, e.target.value)}
                      placeholder="Item numerado..."
                      className="w-full text-sm border-none outline-none focus:ring-0 placeholder:text-gray-300 resize-none overflow-hidden pr-24"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = target.scrollHeight + "px";
                      }}
                    />
                    <div className="absolute right-12 bottom-0 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity mb-1">
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "**")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Negrito"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStyle(block.id, "*")}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        title="Itálico"
                      >
                        <Italic size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {block.type === "image" && (
                  <div className="space-y-2 pr-12">
                    {block.value ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-100 shadow-lg max-w-xl mx-auto group">
                        <img
                          src={block.value}
                          alt="Block image"
                          className="w-full h-auto"
                        />
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, "")}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-100 rounded-lg hover:border-brand-green/50 cursor-pointer transition-all"
                        onClick={() =>
                          document
                            .getElementById(`block-img-${block.id}`)
                            ?.click()
                        }
                      >
                        <ImageIcon size={24} className="text-gray-300 mb-2" />
                        <span className="text-xs text-gray-400">
                          Clique para selecionar imagem
                        </span>
                        <input
                          id={`block-img-${block.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(block.id, e)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {block.type === "file" && (
                  <div className="space-y-2 pr-12">
                    {block.value ? (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-brand-green">
                          <FileIcon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">
                            {block.fileName || "Ficheiro"}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-tighter">
                            Download disponível no player
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, "", "")}
                          className="p-1.5 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-100 rounded-lg hover:border-brand-green/50 cursor-pointer transition-all"
                        onClick={() =>
                          document
                            .getElementById(`blk-file-${block.id}`)
                            ?.click()
                        }
                      >
                        <FileUp size={24} className="text-gray-300 mb-2" />
                        <span className="text-xs text-gray-400">
                          Clique para anexar ficheiro (PDF, ZIP, DOCX, etc)
                        </span>
                        <input
                          id={`blk-file-${block.id}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileUploadInBlock(block.id, e)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeBlock(block.id)}
                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CourseEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "basic" | "descriptions" | "curriculum" | "interactive"
  >("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Form State
  const [imageSource, setImageSource] = useState<"local" | "url">("local");
  const [previewImage, setPreviewImage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");

  const [formData, setFormData] = useState({
    title: id ? "UX/UI Design Moderno e Acessível" : "",
    category: "Design",
    cardDescription:
      "Domine as habilidades essenciais para se destacar no mercado de trabalho.",
    fullDescription:
      "Este curso foi meticulosamente planejado para levar você do nível iniciante ao avançado.",
    language: "Português",
    duration: "0",
    learningOutcomes: [] as string[],
    modules: [
      {
        id: "1",
        title: "Módulo 1: Introdução e Configuração",
        lessons: [
          {
            id: "l1",
            title: "Bem-vindo ao curso",
            type: "video",
            content: "https://youtube.com/...",
          },
        ],
      },
    ] as Module[],
    interactiveExercises: [] as InteractiveExercise[],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mostrar toast notification
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Supabase Storage config (bucket deve existir no projeto Supabase)
  const SUPABASE_BUCKET = "course-files";
  const SUPABASE_SIGNED_TTL = 60 * 60 * 24 * 365; // 1 ano

  // Carrega curso da API quando editar
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const response = await api.get(`/courses/${id}`);
        const data = response.data;
        if (data) {
          // Remove "h" da duração se existir
          const duration = data?.duration
            ? data.duration.toString().replace("h", "")
            : "0";
          setFormData({
            title: data?.title || "",
            category: data?.category || "Design",
            cardDescription: data?.cardDescription || data?.description || "",
            fullDescription: data?.fullDescription || data?.description || "",
            language: data?.language || "Português",
            duration: duration,
            learningOutcomes: Array.isArray(data?.learningOutcomes)
              ? data.learningOutcomes
              : [],
            modules: Array.isArray(data?.modules) ? data.modules : [],
            interactiveExercises: Array.isArray(data?.interactiveExercises)
              ? data.interactiveExercises
              : [],
          });
          const imgUrl = data?.image_url || data?.imageUrl || "";
          setImageUrl(imgUrl);
          // Define previewImage com a URL da imagem para exibição
          setPreviewImage(imgUrl);
        }
      } catch (e) {
        console.error("Falha ao carregar curso:", e);
        showToast("Erro ao carregar curso", "error");
      }
    };
    load();
  }, [id]);

  // Validar campos obrigatórios
  const validateForm = (): boolean => {
    if (!formData.title || formData.title.trim().length === 0) {
      showToast("Por favor, preencha o título do curso.", "error");
      return false;
    }
    if (!formData.duration || parseInt(formData.duration) === 0) {
      showToast("Por favor, defina a duração do curso.", "error");
      return false;
    }
    return true;
  };

  const handleSaveClick = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    if (!user?.uid) {
      showToast("Sessão inválida. Entre novamente.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const image = previewImage || imageUrl || "";
      const payload: any = {
        instructor_uid: user.uid,
        title: formData.title || "Sem título",
        category: formData.category || "Geral",
        description: formData.cardDescription || "",
        image_url: image,
        level: "beginner",
        price: 0,
      };

      if (id) {
        // Atualizar curso existente
        await api.put(`/courses/${id}`, payload);
      } else {
        // Criar novo curso
        await api.post("/courses", payload);
      }

      showToast("Curso salvo com sucesso!", "success");
      setTimeout(() => navigate("/instrutor/cursos"), 1500);
    } catch (e) {
      console.error("Erro ao salvar curso:", e);
      showToast("Não foi possível salvar o curso.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const addModule = () => {
    const newModule: Module = {
      id: Date.now().toString(),
      title: "Novo Módulo",
      lessons: [],
    };
    setFormData({ ...formData, modules: [...formData.modules, newModule] });
  };

  const removeModule = (moduleId: string) => {
    setFormData({
      ...formData,
      modules: formData.modules.filter((m) => m.id !== moduleId),
    });
  };

  const addLesson = (moduleId: string, type: "video" | "text" | "document") => {
    const newLesson: Lesson = {
      id: Math.random().toString(36).substr(2, 9),
      title: "Nova Aula",
      type: type,
      content: "",
    };
    setFormData({
      ...formData,
      modules: formData.modules.map((m) =>
        m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m,
      ),
    });
  };

  const updateLesson = (
    moduleId: string,
    lessonId: string,
    field: keyof Lesson,
    value: string,
  ) => {
    setFormData({
      ...formData,
      modules: formData.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId ? { ...l, [field]: value } : l,
              ),
            }
          : m,
      ),
    });
  };

  const addExercise = (
    type: "quiz" | "dragdrop" | "truefalse" | "fillblank" | "matching",
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    let next: InteractiveExercise;
    if (type === "quiz") {
      next = {
        id,
        type: "quiz",
        title: "Novo Quiz",
        description: "",
        settings: { multiSelect: false, points: 10 },
        quiz: {
          question: "",
          options: [
            { id: "o1", text: "Opção 1", correct: false },
            { id: "o2", text: "Opção 2", correct: false },
          ],
        },
      };
    } else if (type === "dragdrop" || type === "matching") {
      next = {
        id,
        type: type === "matching" ? "matching" : "dragdrop",
        title:
          type === "matching"
            ? "Nova Correspondência"
            : "Novo Arrastar & Soltar",
        description: "",
        settings: { points: 10 },
        dragdrop: {
          prompt: "",
          targets: [
            { id: "t1", label: "Alvo 1" },
            { id: "t2", label: "Alvo 2" },
          ],
          items: [
            { id: "i1", text: "Item 1" },
            { id: "i2", text: "Item 2" },
          ],
        },
      };
    } else if (type === "truefalse") {
      next = {
        id,
        type: "truefalse",
        title: "Novo Verdadeiro/Falso",
        description: "",
        settings: { points: 5 },
        truefalse: {
          statements: [{ id: "s1", text: "A afirmação 1", answer: true }],
        },
      };
    } else {
      next = {
        id,
        type: "fillblank",
        title: "Novo Preenchimento",
        description: "",
        settings: { caseSensitive: false, points: 10 },
        fillblank: {
          prompt: "Texto com espaços a preencher",
          blanks: [{ id: "b1", label: "Palavra 1", answers: ["resposta"] }],
        },
      };
    }
    setFormData({
      ...formData,
      interactiveExercises: [...formData.interactiveExercises, next],
    });
  };

  const updateExercise = (
    exerciseId: string,
    patch: Partial<InteractiveExercise>,
  ) => {
    setFormData({
      ...formData,
      interactiveExercises: formData.interactiveExercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, ...patch } : ex,
      ),
    });
  };

  const removeExercise = (exerciseId: string) => {
    setFormData({
      ...formData,
      interactiveExercises: formData.interactiveExercises.filter(
        (ex) => ex.id !== exerciseId,
      ),
    });
  };

  const setQuizQuestion = (exerciseId: string, question: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "quiz") return;
    updateExercise(exerciseId, {
      quiz: { ...(ex.quiz || { question: "", options: [] }), question },
    });
  };
  const setQuizOptionText = (
    exerciseId: string,
    optionId: string,
    text: string,
  ) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "quiz") return;
    const opts = (ex.quiz?.options || []).map((o) =>
      o.id === optionId ? { ...o, text } : o,
    );
    updateExercise(exerciseId, {
      quiz: { ...(ex.quiz || { question: "", options: [] }), options: opts },
    });
  };
  const toggleQuizOptionCorrect = (exerciseId: string, optionId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "quiz") return;
    const opts = (ex.quiz?.options || []).map((o) =>
      o.id === optionId ? { ...o, correct: !o.correct } : o,
    );
    updateExercise(exerciseId, {
      quiz: { ...(ex.quiz || { question: "", options: [] }), options: opts },
    });
  };
  const addQuizOption = (exerciseId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "quiz") return;
    const newOpt: InteractiveExerciseOption = {
      id: Math.random().toString(36).substr(2, 9),
      text: "Nova opção",
      correct: false,
    };
    const opts = [...(ex.quiz?.options || []), newOpt];
    updateExercise(exerciseId, {
      quiz: { ...(ex.quiz || { question: "", options: [] }), options: opts },
    });
  };
  const removeQuizOption = (exerciseId: string, optionId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "quiz") return;
    const opts = (ex.quiz?.options || []).filter((o) => o.id !== optionId);
    updateExercise(exerciseId, {
      quiz: { ...(ex.quiz || { question: "", options: [] }), options: opts },
    });
  };

  const setDragPrompt = (exerciseId: string, prompt: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "dragdrop") return;
    updateExercise(exerciseId, {
      dragdrop: {
        ...(ex.dragdrop || { prompt: "", targets: [], items: [] }),
        prompt,
      },
    });
  };
  const addDragTarget = (exerciseId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "dragdrop") return;
    const t: InteractiveExerciseTarget = {
      id: Math.random().toString(36).substr(2, 9),
      label: "Novo alvo",
    };
    const targets = [...(ex.dragdrop?.targets || []), t];
    updateExercise(exerciseId, {
      dragdrop: {
        ...(ex.dragdrop || { prompt: "", targets: [], items: [] }),
        targets,
      },
    });
  };
  const setDragTargetLabel = (
    exerciseId: string,
    targetId: string,
    label: string,
  ) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "dragdrop") return;
    const targets = (ex.dragdrop?.targets || []).map((t) =>
      t.id === targetId ? { ...t, label } : t,
    );
    updateExercise(exerciseId, {
      dragdrop: {
        ...(ex.dragdrop || { prompt: "", targets: [], items: [] }),
        targets,
      },
    });
  };
  const removeDragTarget = (exerciseId: string, targetId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "dragdrop") return;
    const targets = (ex.dragdrop?.targets || []).filter(
      (t) => t.id !== targetId,
    );
    const items = (ex.dragdrop?.items || []).map((i) =>
      i.targetId === targetId ? { ...i, targetId: undefined } : i,
    );
    updateExercise(exerciseId, {
      dragdrop: {
        ...(ex.dragdrop || { prompt: "", targets: [], items: [] }),
        targets,
        items,
      },
    });
  };
  const addDragItem = (exerciseId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "dragdrop") return;
    const it: InteractiveExerciseItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: "Novo item",
    };
    const items = [...(ex.dragdrop?.items || []), it];
    updateExercise(exerciseId, {
      dragdrop: {
        ...(ex.dragdrop || { prompt: "", targets: [], items: [] }),
        items,
      },
    });
  };
  const setDragItem = (
    exerciseId: string,
    itemId: string,
    patch: Partial<InteractiveExerciseItem>,
  ) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "dragdrop") return;
    const items = (ex.dragdrop?.items || []).map((i) =>
      i.id === itemId ? { ...i, ...patch } : i,
    );
    updateExercise(exerciseId, {
      dragdrop: {
        ...(ex.dragdrop || { prompt: "", targets: [], items: [] }),
        items,
      },
    });
  };
  const removeDragItem = (exerciseId: string, itemId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "dragdrop") return;
    const items = (ex.dragdrop?.items || []).filter((i) => i.id !== itemId);
    updateExercise(exerciseId, {
      dragdrop: {
        ...(ex.dragdrop || { prompt: "", targets: [], items: [] }),
        items,
      },
    });
  };

  // True/False handlers
  const addTFStatement = (exerciseId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "truefalse") return;
    const st: TFStatement = {
      id: Math.random().toString(36).substr(2, 9),
      text: "Nova afirmação",
      answer: true,
    };
    const statements = [...(ex.truefalse?.statements || []), st];
    updateExercise(exerciseId, { truefalse: { statements } });
  };
  const setTFStatementText = (
    exerciseId: string,
    stId: string,
    text: string,
  ) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "truefalse") return;
    const statements = (ex.truefalse?.statements || []).map((s) =>
      s.id === stId ? { ...s, text } : s,
    );
    updateExercise(exerciseId, { truefalse: { statements } });
  };
  const toggleTFStatementAnswer = (exerciseId: string, stId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "truefalse") return;
    const statements = (ex.truefalse?.statements || []).map((s) =>
      s.id === stId ? { ...s, answer: !s.answer } : s,
    );
    updateExercise(exerciseId, { truefalse: { statements } });
  };
  const removeTFStatement = (exerciseId: string, stId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "truefalse") return;
    const statements = (ex.truefalse?.statements || []).filter(
      (s) => s.id !== stId,
    );
    updateExercise(exerciseId, { truefalse: { statements } });
  };

  // Fill in the blanks handlers
  const setFillPrompt = (exerciseId: string, prompt: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "fillblank") return;
    updateExercise(exerciseId, {
      fillblank: { ...(ex.fillblank || { prompt: "", blanks: [] }), prompt },
    });
  };
  const addFillBlank = (exerciseId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "fillblank") return;
    const b: FillBlankBlank = {
      id: Math.random().toString(36).substr(2, 9),
      label: "Novo espaço",
      answers: [""],
    };
    const blanks = [...(ex.fillblank?.blanks || []), b];
    updateExercise(exerciseId, {
      fillblank: { ...(ex.fillblank || { prompt: "", blanks: [] }), blanks },
    });
  };
  const setFillBlankLabel = (
    exerciseId: string,
    blankId: string,
    label: string,
  ) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "fillblank") return;
    const blanks = (ex.fillblank?.blanks || []).map((b) =>
      b.id === blankId ? { ...b, label } : b,
    );
    updateExercise(exerciseId, {
      fillblank: { ...(ex.fillblank || { prompt: "", blanks: [] }), blanks },
    });
  };
  const setFillBlankAnswers = (
    exerciseId: string,
    blankId: string,
    answersCsv: string,
  ) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "fillblank") return;
    const answers = answersCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const blanks = (ex.fillblank?.blanks || []).map((b) =>
      b.id === blankId ? { ...b, answers } : b,
    );
    updateExercise(exerciseId, {
      fillblank: { ...(ex.fillblank || { prompt: "", blanks: [] }), blanks },
    });
  };
  const removeFillBlank = (exerciseId: string, blankId: string) => {
    const ex = formData.interactiveExercises.find((e) => e.id === exerciseId);
    if (!ex || ex.type !== "fillblank") return;
    const blanks = (ex.fillblank?.blanks || []).filter((b) => b.id !== blankId);
    updateExercise(exerciseId, {
      fillblank: { ...(ex.fillblank || { prompt: "", blanks: [] }), blanks },
    });
  };

  const handleLessonFileUpload = async (
    moduleId: string,
    lessonId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      // Restringe formatos: PDF, DOCX, PPTX, XLS, XLSX
      const lower = file.name.toLowerCase();
      const allowed =
        lower.endsWith(".pdf") ||
        lower.endsWith(".docx") ||
        lower.endsWith(".pptx") ||
        lower.endsWith(".xlsx") ||
        lower.endsWith(".xls");
      if (!allowed) {
        showToast(
          "Formato não suportado. Selecione PDF, DOCX, PPTX, XLS ou XLSX.",
          "error",
        );
        return;
      }
      // Feedback rápido
      updateLesson(moduleId, lessonId, "content", file.name);

      const courseId = (id || "temp").toString();

      // Sanitizar nome do arquivo - remover caracteres especiais
      const sanitizedFileName = file.name
        .normalize("NFD") // Decompor caracteres acentuados
        .replace(/[\u0300-\u036f]/g, "") // Remover diacríticos
        .replace(/[^a-zA-Z0-9._-]/g, "_") // Substituir caracteres especiais por underscore
        .replace(/_{2,}/g, "_"); // Remover underscores múltiplos

      const filePath = `courses/${courseId}/lessons/${lessonId}/${Date.now()}_${sanitizedFileName}`;

      if (isSupabaseConfigured) {
        try {
          const { error: upErr } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(filePath, file, {
              upsert: true,
              cacheControl: "3600",
              contentType: file.type || "application/octet-stream",
            });
          if (upErr) throw upErr;

          // SEMPRE usar Signed URL para garantir que funcione
          // (mesmo que o bucket seja privado)
          const { data: signed, error: sErr } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .createSignedUrl(filePath, SUPABASE_SIGNED_TTL);

          if (sErr) {
            console.error("Erro ao criar Signed URL:", sErr);
            throw sErr;
          }

          const url = signed?.signedUrl || "";
          if (url) {
            console.log("[CourseEditor] Lesson file URL:", url);
            updateLesson(moduleId, lessonId, "content", url);
            return;
          }
        } catch (e) {
          console.warn(
            "Supabase upload/sign falhou, usando Firebase Storage como fallback.",
            e,
          );
        }
      }

      // Fallback para Firebase Storage se Supabase não estiver configurado
      const storage = getStorage(app);
      const ref = sRef(storage, filePath);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      updateLesson(moduleId, lessonId, "content", url);
    } catch (err) {
      console.error("Falha ao enviar documento da aula:", err);
      showToast(
        "Não foi possível enviar o documento. Tente novamente.",
        "error",
      );
    }
  };

  return (
    <InstructorLayout>
      <div className="max-w-5xl mx-auto pb-20">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-gray-100 pb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/instrutor/cursos"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {id ? "Editar Curso" : "Criar Novo Curso"}
              </h1>
              <p className="text-slate-500 text-sm">
                Preencha os detalhes fundamentais para os seus formandos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all bg-white">
              Visualizar
            </button>
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-green text-white font-bold px-8 py-2.5 rounded-xl hover:bg-brand-dark transition-all shadow-lg shadow-green-900/10 disabled:opacity-70"
            >
              <Save className="w-4 h-4" />{" "}
              {isSaving ? "Salvando..." : "Salvar Curso"}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-8 mb-10 border-b border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <TabNav
            active={activeTab === "basic"}
            onClick={() => setActiveTab("basic")}
            icon={<Layout size={18} />}
            label="Informações Básicas"
          />
          <TabNav
            active={activeTab === "descriptions"}
            onClick={() => setActiveTab("descriptions")}
            icon={<Type size={18} />}
            label="Descrições & SEO"
          />
          <TabNav
            active={activeTab === "curriculum"}
            onClick={() => setActiveTab("curriculum")}
            icon={<List size={18} />}
            label="Currículo / Aulas"
          />
          <TabNav
            active={activeTab === "interactive"}
            onClick={() => setActiveTab("interactive")}
            icon={<CheckCircle size={18} />}
            label="Exercícios Interativos"
          />
        </div>

        {/* Form Content */}
        <div className="space-y-10 animate-in fade-in duration-500">
          {activeTab === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <InputGroup
                  label="Título do Curso"
                  help="Use um título chamativo e direto."
                >
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ex: Masterizando Figma do Zero"
                    required
                    className="w-full px-4 py-3 bg-[#262626] border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                  />
                </InputGroup>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <Select
                    className="w-full"
                    placeholder="Selecione uma categoria"
                    value={formData.category}
                    onValueChange={(val) =>
                      setFormData({ ...formData, category: val })
                    }
                  >
                    <Label>Categoria</Label>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopover>
                      <SelectListBox>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Desenvolvimento">
                          Desenvolvimento
                        </SelectItem>
                        <SelectItem value="Negócios">Negócios</SelectItem>
                        <SelectItem value="Liderança">Liderança</SelectItem>
                      </SelectListBox>
                    </SelectPopover>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <Select
                    className="w-full"
                    placeholder="Selecione o idioma"
                    value={formData.language}
                    onValueChange={(val) =>
                      setFormData({ ...formData, language: val })
                    }
                  >
                    <Label>Idioma</Label>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopover>
                      <SelectListBox>
                        <SelectItem value="Português">Português</SelectItem>
                        <SelectItem value="Inglês">Inglês</SelectItem>
                        <SelectItem value="Espanhol">Espanhol</SelectItem>
                        <SelectItem value="Francês">Francês</SelectItem>
                      </SelectListBox>
                    </SelectPopover>
                  </Select>

                  <InputGroup
                    label="Duração total do curso"
                    help="Digite apenas o número de horas"
                  >
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.duration.replace("h", "")}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration: e.target.value || "0",
                          })
                        }
                        placeholder="40"
                        min="0"
                        required
                        className="w-full pl-4 pr-12 py-3 bg-[#262626] border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 uppercase">
                        H
                      </div>
                    </div>
                  </InputGroup>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Capa do Curso</Label>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                    <button
                      onClick={() => setImageSource("local")}
                      className={`p-1 rounded ${imageSource === "local" ? "bg-white text-brand-green" : "text-gray-400"}`}
                    >
                      <FileUp size={14} />
                    </button>
                    <button
                      onClick={() => setImageSource("url")}
                      className={`p-1 rounded ${imageSource === "url" ? "bg-white text-brand-green" : "text-gray-400"}`}
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                </div>

                {imageSource === "local" ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video bg-[#262626] border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center group cursor-pointer hover:border-brand-green transition-all relative overflow-hidden"
                  >
                    {previewImage ? (
                      <img
                        src={previewImage}
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                        alt="Preview"
                      />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-brand-green shadow-sm mb-3">
                          <ImageIcon size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase">
                          Carregar arquivo
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleLocalImageUpload}
                      accept="image/*"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="https://imagem.com/capa.jpg"
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          setPreviewImage(e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-[#262626] border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-brand-green/30 outline-none text-xs"
                      />
                      <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    </div>
                    {previewImage && (
                      <div className="aspect-video rounded-xl overflow-hidden border border-gray-800 shadow-inner bg-black">
                        <img
                          src={previewImage}
                          className="w-full h-full object-cover"
                          alt="Preview"
                        />
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 text-center">
                  Recomendado: 1280x720px (16:9)
                </p>
              </div>
            </div>
          )}

          {activeTab === "interactive" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Exercícios Interativos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Crie quizzes e atividades de arrastar & soltar que
                    aparecerão no player na aba "Exercícios Interativos".
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => addExercise("quiz")}
                    className="bg-brand-green text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-dark transition-all shadow-sm"
                  >
                    + Quiz (Múltipla Escolha)
                  </button>
                  <button
                    onClick={() => addExercise("truefalse")}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold hover:border-brand-green hover:text-brand-green transition-all"
                  >
                    + Verdadeiro/Falso
                  </button>
                  <button
                    onClick={() => addExercise("dragdrop")}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold hover:border-brand-green hover:text-brand-green transition-all"
                  >
                    + Arrastar & Soltar
                  </button>
                  <button
                    onClick={() => addExercise("matching")}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold hover:border-brand-green hover:text-brand-green transition-all"
                  >
                    + Correspondência
                  </button>
                  <button
                    onClick={() => addExercise("fillblank")}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold hover:border-brand-green hover:text-brand-green transition-all"
                  >
                    + Preenchimento
                  </button>
                </div>
              </div>

              {formData.interactiveExercises.length === 0 && (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">
                    Nenhum exercício criado ainda.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {formData.interactiveExercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                          <input
                            type="text"
                            value={ex.title}
                            onChange={(e) =>
                              updateExercise(ex.id, { title: e.target.value })
                            }
                            placeholder={
                              ex.type === "quiz"
                                ? "Título do Quiz"
                                : ex.type === "dragdrop" ||
                                    ex.type === "matching"
                                  ? "Título do Arrastar & Soltar/Correspondência"
                                  : ex.type === "truefalse"
                                    ? "Título de Verdadeiro/Falso"
                                    : "Título de Preenchimento"
                            }
                            className="font-bold text-slate-800 bg-transparent outline-none focus:border-b border-brand-green flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Vincular à aula:
                            </span>
                            <select
                              value={ex.lessonId || ""}
                              onChange={(e) =>
                                updateExercise(ex.id, {
                                  lessonId: e.target.value,
                                })
                              }
                              className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-brand-green"
                            >
                              <option value="">(Nenhuma / Geral)</option>
                              {formData.modules.map((m) => (
                                <optgroup key={m.id} label={m.title}>
                                  {m.lessons.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.title}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        </div>
                        <textarea
                          value={ex.description || ""}
                          onChange={(e) =>
                            updateExercise(ex.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Descrição opcional"
                          className="mt-2 w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-green"
                          rows={2}
                        />
                      </div>
                      <button
                        onClick={() => removeExercise(ex.id)}
                        className="text-gray-300 hover:text-red-500 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {ex.type === "quiz" && (
                      <div className="mt-4 space-y-3">
                        <label className="text-xs font-bold text-slate-600">
                          Pergunta
                        </label>
                        <input
                          type="text"
                          value={ex.quiz?.question || ""}
                          onChange={(e) =>
                            setQuizQuestion(ex.id, e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-green"
                          placeholder="Digite a pergunta do quiz"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="col-span-2 flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={!!ex.settings?.multiSelect}
                              onChange={(e) =>
                                updateExercise(ex.id, {
                                  settings: {
                                    ...(ex.settings || {}),
                                    multiSelect: e.target.checked,
                                  },
                                })
                              }
                            />
                            <span>Permitir múltiplas respostas</span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            placeholder="Penalização"
                            value={ex.settings?.penalty || 0}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                settings: {
                                  ...(ex.settings || {}),
                                  penalty: Number(e.target.value || 0),
                                },
                              })
                            }
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                          />
                          <input
                            type="number"
                            min={0}
                            placeholder="Tempo (s)"
                            value={ex.settings?.timedSeconds || 0}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                settings: {
                                  ...(ex.settings || {}),
                                  timedSeconds: Number(e.target.value || 0),
                                },
                              })
                            }
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">
                            Opções
                          </label>
                          {(ex.quiz?.options || []).map((o) => (
                            <div
                              key={o.id}
                              className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg"
                            >
                              <input
                                type="checkbox"
                                checked={o.correct}
                                onChange={() =>
                                  toggleQuizOptionCorrect(ex.id, o.id)
                                }
                              />
                              <input
                                type="text"
                                value={o.text}
                                onChange={(e) =>
                                  setQuizOptionText(ex.id, o.id, e.target.value)
                                }
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-green"
                              />
                              <button
                                onClick={() => removeQuizOption(ex.id, o.id)}
                                className="p-2 text-slate-300 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addQuizOption(ex.id)}
                            className="text-[10px] font-black uppercase text-brand-green hover:underline"
                          >
                            + Adicionar opção
                          </button>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">
                            Explicação (Feedback)
                          </label>
                          <textarea
                            value={ex.settings?.explanation || ""}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                settings: {
                                  ...(ex.settings || {}),
                                  explanation: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">
                              Pontos
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={ex.settings?.points || 10}
                              onChange={(e) =>
                                updateExercise(ex.id, {
                                  settings: {
                                    ...(ex.settings || {}),
                                    points: Number(e.target.value || 0),
                                  },
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(ex.type === "dragdrop" || ex.type === "matching") && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600">
                            Instrução
                          </label>
                          <input
                            type="text"
                            value={ex.dragdrop?.prompt || ""}
                            onChange={(e) =>
                              setDragPrompt(ex.id, e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-green"
                            placeholder="Descreva o que o formando deve fazer"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">
                              Pontos
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={ex.settings?.points || 10}
                              onChange={(e) =>
                                updateExercise(ex.id, {
                                  settings: {
                                    ...(ex.settings || {}),
                                    points: Number(e.target.value || 0),
                                  },
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-600">
                                Alvos
                              </label>
                              <button
                                onClick={() => addDragTarget(ex.id)}
                                className="text-[10px] font-black uppercase text-brand-green hover:underline"
                              >
                                + Adicionar alvo
                              </button>
                            </div>
                            {(ex.dragdrop?.targets || []).map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg"
                              >
                                <input
                                  type="text"
                                  value={t.label}
                                  onChange={(e) =>
                                    setDragTargetLabel(
                                      ex.id,
                                      t.id,
                                      e.target.value,
                                    )
                                  }
                                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-green"
                                />
                                <button
                                  onClick={() => removeDragTarget(ex.id, t.id)}
                                  className="p-2 text-slate-300 hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-600">
                                Itens
                              </label>
                              <button
                                onClick={() => addDragItem(ex.id)}
                                className="text-[10px] font-black uppercase text-brand-green hover:underline"
                              >
                                + Adicionar item
                              </button>
                            </div>
                            {(ex.dragdrop?.items || []).map((i) => (
                              <div
                                key={i.id}
                                className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg"
                              >
                                <input
                                  type="text"
                                  value={i.text}
                                  onChange={(e) =>
                                    setDragItem(ex.id, i.id, {
                                      text: e.target.value,
                                    })
                                  }
                                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-green"
                                />
                                <select
                                  value={i.targetId || ""}
                                  onChange={(e) =>
                                    setDragItem(ex.id, i.id, {
                                      targetId: e.target.value || undefined,
                                    })
                                  }
                                  className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                                >
                                  <option value="">Sem alvo</option>
                                  {(ex.dragdrop?.targets || []).map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => removeDragItem(ex.id, i.id)}
                                  className="p-2 text-slate-300 hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {ex.type === "truefalse" && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">
                              Pontos
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={ex.settings?.points || 5}
                              onChange={(e) =>
                                updateExercise(ex.id, {
                                  settings: {
                                    ...(ex.settings || {}),
                                    points: Number(e.target.value || 0),
                                  },
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">
                            Afirmações
                          </label>
                          {(ex.truefalse?.statements || []).map((s) => (
                            <div
                              key={s.id}
                              className="grid grid-cols-1 md:grid-cols-6 items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg"
                            >
                              <input
                                type="text"
                                value={s.text}
                                onChange={(e) =>
                                  setTFStatementText(
                                    ex.id,
                                    s.id,
                                    e.target.value,
                                  )
                                }
                                className="md:col-span-4 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                              />
                              <div className="md:col-span-1 flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={s.answer}
                                  onChange={() =>
                                    toggleTFStatementAnswer(ex.id, s.id)
                                  }
                                />
                                <span>Verdadeiro?</span>
                              </div>
                              <button
                                onClick={() => removeTFStatement(ex.id, s.id)}
                                className="p-2 text-slate-300 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addTFStatement(ex.id)}
                            className="text-[10px] font-black uppercase text-brand-green hover:underline"
                          >
                            + Adicionar afirmação
                          </button>
                        </div>
                      </div>
                    )}

                    {ex.type === "fillblank" && (
                      <div className="mt-4 space-y-3">
                        <label className="text-xs font-bold text-slate-600">
                          Enunciado / Contexto
                        </label>
                        <textarea
                          value={ex.fillblank?.prompt || ""}
                          onChange={(e) => setFillPrompt(ex.id, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">
                              Case Sensitive
                            </label>
                            <input
                              type="checkbox"
                              checked={!!ex.settings?.caseSensitive}
                              onChange={(e) =>
                                updateExercise(ex.id, {
                                  settings: {
                                    ...(ex.settings || {}),
                                    caseSensitive: e.target.checked,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">
                              Pontos
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={ex.settings?.points || 10}
                              onChange={(e) =>
                                updateExercise(ex.id, {
                                  settings: {
                                    ...(ex.settings || {}),
                                    points: Number(e.target.value || 0),
                                  },
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600">
                            Espaços (respostas aceitas separadas por vírgula)
                          </label>
                          {(ex.fillblank?.blanks || []).map((b) => (
                            <div
                              key={b.id}
                              className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg"
                            >
                              <input
                                type="text"
                                value={b.label || ""}
                                onChange={(e) =>
                                  setFillBlankLabel(ex.id, b.id, e.target.value)
                                }
                                placeholder="Rótulo"
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                              />
                              <input
                                type="text"
                                value={(b.answers || []).join(", ")}
                                onChange={(e) =>
                                  setFillBlankAnswers(
                                    ex.id,
                                    b.id,
                                    e.target.value,
                                  )
                                }
                                placeholder="resposta1, resposta2"
                                className="md:col-span-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                              />
                              <button
                                onClick={() => removeFillBlank(ex.id, b.id)}
                                className="p-2 text-slate-300 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addFillBlank(ex.id)}
                            className="text-[10px] font-black uppercase text-brand-green hover:underline"
                          >
                            + Adicionar espaço
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "descriptions" && (
            <div className="space-y-8">
              <div className="p-6 bg-brand-light/30 border border-brand-green/10 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg text-brand-green shadow-sm">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-dark text-sm">
                    Estratégia de SEO
                  </h4>
                  <p className="text-xs text-brand-dark/60 leading-relaxed mt-1">
                    Descrições bem feitas ajudam seu curso a ser encontrado no
                    Google e na nossa busca interna.
                  </p>
                </div>
              </div>

              <InputGroup label="Descrição Curta (Card)">
                <textarea
                  rows={2}
                  maxLength={120}
                  value={formData.cardDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cardDescription: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/10 outline-none resize-none"
                ></textarea>
                <p className="text-right text-[10px] text-slate-400 mt-1">
                  {formData.cardDescription.length}/120
                </p>
              </InputGroup>

              <InputGroup label="Descrição Completa (Página Detalhada)">
                <textarea
                  rows={8}
                  value={formData.fullDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullDescription: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/10 outline-none resize-none"
                ></textarea>
              </InputGroup>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">
                  O que você aprenderá
                </label>
                <div className="space-y-2">
                  {formData.learningOutcomes.length === 0 && (
                    <div className="text-xs text-slate-400">
                      Adicione os tópicos principais que o formando vai
                      aprender.
                    </div>
                  )}
                  {formData.learningOutcomes.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const arr = [...formData.learningOutcomes];
                          arr[idx] = e.target.value;
                          setFormData({ ...formData, learningOutcomes: arr });
                        }}
                        placeholder={`Ponto de aprendizagem #${idx + 1}`}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/10 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            learningOutcomes: formData.learningOutcomes.filter(
                              (_, i) => i !== idx,
                            ),
                          });
                        }}
                        className="p-2 text-slate-400 hover:text-red-500"
                        aria-label="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        learningOutcomes: [...formData.learningOutcomes, ""],
                      })
                    }
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-green px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-brand-green transition-all active:scale-95 shadow-sm"
                  >
                    <Plus size={14} /> Adicionar item
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "curriculum" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Estructura do Conhecimento
                  </h3>
                  <p className="text-xs text-slate-400">
                    Organize seus módulos e defina o formato de cada aula.
                  </p>
                </div>
                <button
                  onClick={addModule}
                  className="flex items-center gap-2 bg-brand-green text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-dark transition-all shadow-lg shadow-green-900/10 active:scale-95"
                >
                  <PlusCircle size={16} /> Novo Módulo
                </button>
              </div>

              <div className="space-y-6">
                {formData.modules.map((module) => (
                  <div
                    key={module.id}
                    className="border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
                  >
                    <div className="p-5 bg-slate-50/80 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-white border border-gray-200 rounded-lg text-slate-400">
                          <List size={16} />
                        </div>
                        <input
                          type="text"
                          value={module.title}
                          onChange={(e) => {
                            const newModules = formData.modules.map((m) =>
                              m.id === module.id
                                ? { ...m, title: e.target.value }
                                : m,
                            );
                            setFormData({ ...formData, modules: newModules });
                          }}
                          className="font-bold text-slate-800 bg-transparent outline-none focus:border-b border-brand-green w-full max-w-md"
                        />
                      </div>
                      <button
                        onClick={() => removeModule(module.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-5 border border-slate-100 rounded-2xl bg-gray-50/30 space-y-4 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                className={`p-2 rounded-lg ${
                                  lesson.type === "video"
                                    ? "bg-blue-50 text-blue-500"
                                    : lesson.type === "text"
                                      ? "bg-purple-50 text-purple-500"
                                      : "bg-emerald-50 text-emerald-500"
                                }`}
                              >
                                {lesson.type === "video" ? (
                                  <MonitorPlay size={18} />
                                ) : lesson.type === "text" ? (
                                  <FileText size={18} />
                                ) : (
                                  <FileIcon size={18} />
                                )}
                              </div>
                              <input
                                type="text"
                                value={lesson.title}
                                onChange={(e) =>
                                  updateLesson(
                                    module.id,
                                    lesson.id,
                                    "title",
                                    e.target.value,
                                  )
                                }
                                placeholder="Título da Aula"
                                className="font-bold text-slate-700 bg-transparent outline-none text-sm w-full"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newModules = formData.modules.map((m) =>
                                  m.id === module.id
                                    ? {
                                        ...m,
                                        lessons: m.lessons.filter(
                                          (l) => l.id !== lesson.id,
                                        ),
                                      }
                                    : m,
                                );
                                setFormData({
                                  ...formData,
                                  modules: newModules,
                                });
                              }}
                              className="text-gray-300 hover:text-red-400 p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          {lesson.type === "video" && (
                            <div className="flex items-center gap-3">
                              <div className="relative flex-1">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="URL do Vídeo (Youtube, Vimeo, etc)"
                                  value={lesson.content}
                                  onChange={(e) =>
                                    updateLesson(
                                      module.id,
                                      lesson.id,
                                      "content",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-green transition-all"
                                />
                              </div>
                            </div>
                          )}

                          {lesson.type === "text" && (
                            <div className="space-y-4">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Conteúdo da Aula (Leitura Nativa)
                              </label>
                              <LessonBlockEditor
                                blocksJson={lesson.content}
                                onChange={(json) =>
                                  updateLesson(
                                    module.id,
                                    lesson.id,
                                    "content",
                                    json,
                                  )
                                }
                                onUploadFile={async (file) => {
                                  const sanitizedFileName = file.name
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .replace(/[^a-zA-Z0-9._-]/g, "_");
                                  const filePath = `courses/${id || "temp"}/blocks/${Date.now()}_${sanitizedFileName}`;

                                  if (isSupabaseConfigured) {
                                    await supabase.storage
                                      .from(SUPABASE_BUCKET)
                                      .upload(filePath, file);
                                    const { data: signed } =
                                      await supabase.storage
                                        .from(SUPABASE_BUCKET)
                                        .createSignedUrl(
                                          filePath,
                                          SUPABASE_SIGNED_TTL,
                                        );
                                    return signed?.signedUrl || "";
                                  }
                                  return "";
                                }}
                              />
                            </div>
                          )}

                          {lesson.type === "document" && (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                <div className="p-1.5 bg-gray-50 rounded-md">
                                  <FileUp size={16} className="text-gray-400" />
                                </div>
                                <span className="text-xs text-gray-500 font-medium truncate flex-1">
                                  {lesson.content ||
                                    "Nenhum documento selecionado"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.getElementById(
                                      `file-upload-${lesson.id}`,
                                    );
                                    input?.click();
                                  }}
                                  className="text-[10px] font-black uppercase text-brand-green hover:underline"
                                >
                                  Selecionar Ficheiro
                                </button>
                                <input
                                  id={`file-upload-${lesson.id}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleLessonFileUpload(
                                      module.id,
                                      lesson.id,
                                      e,
                                    )
                                  }
                                  accept=".pdf,.docx,.pptx,.xls,.xlsx"
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 italic">
                                Formatos aceites: PDF, DOCX, PPTX, XLS, XLSX.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="pt-2 flex flex-wrap gap-2">
                        <AddLessonBtn
                          icon={<MonitorPlay size={14} />}
                          label="Aula em Vídeo"
                          onClick={() => addLesson(module.id, "video")}
                        />
                        <AddLessonBtn
                          icon={<FileText size={14} />}
                          label="Aula em Texto"
                          onClick={() => addLesson(module.id, "text")}
                        />
                        <AddLessonBtn
                          icon={<FileIcon size={14} />}
                          label="Anexar Documento"
                          onClick={() => addLesson(module.id, "document")}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.modules.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                    <List size={32} />
                  </div>
                  <h3 className="font-bold text-slate-900">
                    Seu currículo está vazio
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Comece adicionando o primeiro módulo do seu curso.
                  </p>
                  <button
                    onClick={addModule}
                    className="bg-brand-green text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto shadow-lg shadow-green-900/10"
                  >
                    <PlusIcon size={18} /> Adicionar Módulo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-green/10 mb-4">
                <Check className="w-6 h-6 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Confirmar Salvamento
              </h2>
              <p className="text-slate-600 mb-6">
                Tem certeza que deseja salvar este curso com as informações
                fornecidas?
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                <p>
                  <span className="font-semibold text-slate-700">Título:</span>{" "}
                  {formData.title}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Duração:</span>{" "}
                  {formData.duration}h
                </p>
                <p>
                  <span className="font-semibold text-slate-700">
                    Categoria:
                  </span>{" "}
                  {formData.category}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 text-slate-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-brand-green text-white rounded-xl hover:bg-brand-dark transition-all font-semibold disabled:opacity-70"
                >
                  {isSaving ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg font-semibold text-white transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === "success"
              ? "bg-green-600 hover:bg-green-700"
              : toast.type === "error"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {toast.message}
        </div>
      )}
    </InstructorLayout>
  );
};

// --- Custom Components ---

const AddLessonBtn = ({ icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-green px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-brand-green transition-all active:scale-95 shadow-sm"
  >
    {icon}
    {label}
  </button>
);

const SelectContext = React.createContext<any>(null);

const Select = ({
  children,
  className,
  value,
  onValueChange,
  placeholder,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, isOpen, setIsOpen, placeholder }}
    >
      <div ref={containerRef} className={`flex flex-col gap-2 ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const Label = ({ children }: any) => {
  return <label className="text-sm font-bold text-slate-700">{children}</label>;
};

const SelectTrigger = ({ children }: any) => {
  const { setIsOpen, isOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/10 focus:border-brand-green transition-all"
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
};

const SelectValue = () => {
  const { value, placeholder } = React.useContext(SelectContext);
  return (
    <span className={!value ? "text-slate-400" : "text-slate-900 font-medium"}>
      {value || placeholder}
    </span>
  );
};

const SelectPopover = ({ children }: any) => {
  const { isOpen } = React.useContext(SelectContext);
  if (!isOpen) return null;
  return (
    <div className="relative">
      <div className="absolute top-2 z-[100] w-full min-w-[8rem] overflow-hidden rounded-xl border border-gray-100 bg-white text-slate-950 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
};

const SelectListBox = ({ children }: any) => {
  return <div className="p-1">{children}</div>;
};

const SelectItem = ({ children, value }: any) => {
  const {
    onValueChange,
    setIsOpen,
    value: selectedValue,
  } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(value);
        setIsOpen(false);
      }}
      className={`relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none hover:bg-slate-50 transition-colors ${
        isSelected
          ? "bg-brand-green/5 text-brand-green font-bold"
          : "text-slate-600"
      }`}
    >
      <span className="truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
};

// --- Sub-components Helper ---

const TabNav = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`pb-4 flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${
      active
        ? "border-brand-green text-brand-green"
        : "border-transparent text-slate-400 hover:text-slate-600"
    }`}
  >
    {icon}
    {label}
  </button>
);

const InputGroup = ({ label, children, help }: any) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      {help && (
        <div className="group relative">
          <HelpCircle size={14} className="text-slate-300 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
            {help}
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

const Edit3 = ({ size, className }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export default CourseEditorPage;
