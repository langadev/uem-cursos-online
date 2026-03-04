import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    where,
} from "firebase/firestore";
import { AlertCircle, Check, Download, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/firebase";

interface CertificatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

type PaymentMethod = "m-pesa" | "e-mola" | "bank";
type CertificateStatus = "pending" | "confirmed" | "rejected";

export interface Certificate {
  id?: string;
  certificate_id?: string;
  student_uid: string;
  student_name: string;
  course_id: string;
  course_title: string;
  status: CertificateStatus;
  payment_method: PaymentMethod;
  transaction_id: string;
  submitted_at: Timestamp;
  confirmed_at?: Timestamp;
  rejection_reason?: string;
  instructor_uid?: string;
}

const CertificatePaymentModal: React.FC<CertificatePaymentModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"summary" | "payment">("summary");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("m-pesa");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [existingCertificate, setExistingCertificate] =
    useState<Certificate | null>(null);
  const [instructorUid, setInstructorUid] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState<string | null>(null);
  const [course, setCourse] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      checkExistingCertificate();
      getInstructorUid();
    }
  }, [isOpen, user, courseId]);

  const getInstructorUid = async () => {
    try {
      const courseRef = doc(db, "courses", courseId);
      const courseSnap = await getDoc(courseRef);
      if (courseSnap.exists()) {
        const courseData = courseSnap.data();
        const uid = courseData?.instructor_uid || null;
        setInstructorUid(uid);
        setCourse(courseData);

        // Buscar nome do tutor/instrutor
        if (uid) {
          try {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const fullName = userSnap.data()?.full_name || "Instrutor";
              console.log("Instrutor encontrado:", fullName, "UID:", uid);
              setInstructorName(fullName);
            } else {
              console.log("Documento do usuário não encontrado para UID:", uid);
            }
          } catch (err) {
            console.error("Erro ao buscar nome do instrutor:", err);
          }
        } else {
          console.log("Nenhum instrutor associado ao curso");
        }
      }
    } catch (err) {
      console.error("Erro ao buscar instrutor do curso:", err);
    }
  };

  const checkExistingCertificate = async () => {
    if (!user) return;

    try {
      const certificatesRef = collection(db, "certificates");
      const q = query(
        certificatesRef,
        where("student_uid", "==", user.uid),
        where("course_id", "==", courseId),
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setExistingCertificate(snapshot.docs[0].data() as Certificate);
      } else {
        setExistingCertificate(null);
      }
    } catch (err) {
      console.error("Erro ao verificar certificado existente:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionId.trim()) {
      setError("Por favor, insira o ID da transação");
      return;
    }

    if (!user || !profile) {
      setError("Utilizador não autenticado");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const certificatesRef = collection(db, "certificates");
      // Gerar ID com 5 dígitos aleatórios (00000-99999)
      const certificateId = String(Math.floor(Math.random() * 100000)).padStart(
        5,
        "0",
      );

      const newCertificate: Certificate = {
        certificate_id: certificateId,
        student_uid: user.uid,
        student_name:
          profile.full_name ||
          profile.name ||
          user?.displayName ||
          user?.email?.split("@")[0] ||
          "Utilizador",
        course_id: courseId,
        course_title: courseTitle,
        status: "pending",
        payment_method: paymentMethod,
        transaction_id: transactionId,
        submitted_at: Timestamp.now(),
        instructor_uid: instructorUid || undefined,
      };

      await addDoc(certificatesRef, newCertificate);

      setSuccess(true);
      setTransactionId("");
      setPaymentMethod("m-pesa");

      // Chamar onSuccess callback após 1.5s
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Erro ao submeter certificado:", err);
      setError("Erro ao submeter dados de pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError("");
    setTransactionId("");
    setPaymentMethod("m-pesa");
    onClose();
  };

  const handleDownloadCertificatePDF = async () => {
    if (!course || !profile) return;

    setIsDownloading(true);
    try {
      // Garantir que temos o nome do instrutor
      let finalInstructorName = instructorName;

      if (!finalInstructorName && instructorUid) {
        try {
          const userRef = doc(db, "users", instructorUid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            finalInstructorName = userSnap.data()?.full_name || "Instrutor";
            console.log("Nome do instrutor carregado:", finalInstructorName);
          }
        } catch (err) {
          console.error("Erro ao buscar nome do instrutor:", err);
          finalInstructorName = "Instrutor";
        }
      }

      console.log("Baixando certificado - Instrutor:", finalInstructorName);

      const totalLessons =
        course?.modules?.reduce(
          (acc: number, m: any) =>
            acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
          0,
        ) || 0;

      // Criar canvas
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 707;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não suportado");

      // Fundo branco
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 1000, 707);

      // Border externo - verde #0E7038
      ctx.strokeStyle = "#0E7038";
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 984, 691);

      // Border interno - dourado #EAB308
      ctx.strokeStyle = "#EAB308";
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, 952, 659);

      // Configurar fontes e cores
      ctx.fillStyle = "#0E7038";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let y = 30;

      // Logo/Escudo da instituição - representado por um círculo com iniciais
      ctx.fillStyle = "#0E7038";
      ctx.beginPath();
      ctx.arc(500, y + 20, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "bold 18px Arial";
      ctx.fillText("UEM", 500, y + 25);

      y += 60;

      // Título da instituição
      ctx.fillStyle = "#0E7038";
      ctx.font = "bold 18px Arial";
      ctx.fillText("Universidade Eduardo Mondlane", 500, y);
      y += 25;

      ctx.font = "14px Arial";
      ctx.fillText("Centro de Cursos Online", 500, y);
      y += 30;

      // Título certificado
      ctx.font = "bold 48px Georgia";
      ctx.fillText("Certificado de Conclusão", 500, y);
      y += 65;

      // Linha divisória
      ctx.strokeStyle = "#EAB308";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(350, y);
      ctx.lineTo(650, y);
      ctx.stroke();
      y += 50;

      // Intro
      ctx.fillStyle = "#0E7038";
      ctx.font = "italic 18px Arial";
      ctx.fillText("Certificamos que", 500, y);
      y += 45;

      // Nome do aluno
      ctx.font = "bold 44px Georgia";
      ctx.fillText(profile?.full_name || "Formando", 500, y);
      y += 65;

      // Descrição - linha 1
      ctx.font = "16px Arial";
      ctx.fillText(
        "concluiu com êxito o programa de especialização em",
        500,
        y,
      );
      y += 35;

      // Título do curso
      ctx.font = "bold 26px Georgia";
      ctx.fillText(course?.title || "Curso", 500, y);
      y += 45;

      // Carga horária
      ctx.font = "14px Arial";
      ctx.fillText(
        `com carga horária total de ${course?.duration || `${totalLessons} aulas`}.`,
        500,
        y,
      );
      y += 70;

      // ID do Certificado - No Meio (Visível)
      ctx.fillStyle = "#0E7038";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Código de Autenticação:", 500, y);
      y += 18;
      ctx.font = "bold 18px monospace";
      ctx.fillStyle = "#EAB308";
      ctx.fillText(existingCertificate?.certificate_id || "00000", 500, y);
      y += 35;

      // Assinaturas - 4 colunas (Instrutor, Diretor, Selo, Data)
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#0E7038";

      const col1 = 150;
      const col2 = 380;
      const col3 = 620;
      const col4 = 850;

      // Linhas para assinatura
      ctx.strokeStyle = "#0E7038";
      ctx.lineWidth = 1;

      // Coluna 1 - Instrutor
      ctx.beginPath();
      ctx.moveTo(col1 - 50, y);
      ctx.lineTo(col1 + 50, y);
      ctx.stroke();

      // Coluna 2 - Diretor
      ctx.beginPath();
      ctx.moveTo(col2 - 50, y);
      ctx.lineTo(col2 + 50, y);
      ctx.stroke();

      // Coluna 3 - Selo
      ctx.beginPath();
      ctx.moveTo(col3 - 50, y);
      ctx.lineTo(col3 + 50, y);
      ctx.stroke();

      // Coluna 4 - Data
      ctx.beginPath();
      ctx.moveTo(col4 - 50, y);
      ctx.lineTo(col4 + 50, y);
      ctx.stroke();

      y += 25;

      // Assinatura 1 - Nome do instrutor
      ctx.font = "11px Arial";
      ctx.fillText(finalInstructorName || "Instrutor", col1, y);
      ctx.font = "9px Arial";
      ctx.fillText("Instrutor do Curso", col1, y + 16);

      // Assinatura 2 - Diretor
      ctx.font = "11px Arial";
      ctx.fillText("_______________________", col2, y);
      ctx.font = "9px Arial";
      ctx.fillText("Diretor do Centro de Cursos", col2, y + 16);

      // Selo de autenticidade
      ctx.font = "bold 24px Arial";
      ctx.fillText("⭐", col3, y - 5);
      ctx.font = "9px Arial";
      ctx.fillText("Selo de Autenticidade", col3, y + 16);

      // Data
      ctx.font = "11px Arial";
      ctx.fillText(new Date().toLocaleDateString("pt-PT"), col4, y);
      ctx.font = "9px Arial";
      ctx.fillText("Data de Emissão", col4, y + 16);

      // Converter canvas para blob e fazer download
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Erro ao gerar certificado");
          setIsDownloading(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Certificado-${course?.title?.replace(/\s+/g, "-")}-${profile?.full_name?.replace(/\s+/g, "-")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsDownloading(false);
        handleClose();
      }, "image/png");
    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao gerar certificado.");
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  // Se existe certificado confirmado, oferecer download direto
  if (existingCertificate?.status === "confirmed") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Certificado Aprovado
          </h3>
          <p className="text-gray-600 text-center mb-6">
            Seu certificado foi verificado e aprovado pelo instrutor. Clique
            abaixo para baixar!
          </p>
          <button
            disabled={isDownloading}
            onClick={handleDownloadCertificatePDF}
            className="w-full bg-brand-green text-white py-2 rounded-lg hover:bg-brand-dark transition font-semibold mb-2 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? "Gerando..." : "Baixar Certificado"}
          </button>
          <button
            onClick={handleClose}
            className="w-full text-gray-600 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Se existe certificado pendente ou rejeitado, mostrar status
  if (existingCertificate) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mb-4">
            {existingCertificate.status === "pending" && (
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    À Espera de Confirmação
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Seu pedido de certificado foi recebido em{" "}
                    {existingCertificate.submitted_at
                      ?.toDate?.()
                      .toLocaleDateString("pt-PT")}
                    . O instrutor em breve confirmará.
                  </p>
                </div>
              </div>
            )}

            {existingCertificate.status === "rejected" && (
              <div className="flex items-start">
                <X className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Certificado Rejeitado
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {existingCertificate.rejection_reason ||
                      "O instrutor rejeitou seu pedido de certificado."}
                  </p>
                  <button
                    onClick={() => {
                      setExistingCertificate(null);
                      setTransactionId("");
                    }}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Método de Pagamento:{" "}
              <span className="font-medium">
                {existingCertificate.payment_method.toUpperCase()}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ID da Transação:{" "}
              <span className="font-medium">
                {existingCertificate.transaction_id}
              </span>
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full mt-6 bg-gray-100 text-gray-900 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixo */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Emitir Certificado
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600">
            Para receber seu certificado de <strong>{courseTitle}</strong>,
            confirme seu pagamento abaixo.
          </p>
        </div>

        {/* Conteúdo - Com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900">
                  Enviado com Sucesso!
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  Seus dados de pagamento foram recebidos. O instrutor
                  confirmará em breve.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("summary")}
              className={`pb-3 px-4 font-medium border-b-2 transition text-sm ${
                activeTab === "summary"
                  ? "border-brand-green text-brand-green"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Resumo
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`pb-3 px-4 font-medium border-b-2 transition text-sm ${
                activeTab === "payment"
                  ? "border-brand-green text-brand-green"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Pagamento
            </button>
          </div>

          {/* Tab: Resumo */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {/* Preço do Certificado */}
              {course?.certificatePrice && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    Valor do Certificado
                  </p>
                  <p className="text-3xl font-bold text-brand-green">
                    {course.certificatePrice} MZM
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    Preço definido pelo instrutor para emissão do certificado
                  </p>
                </div>
              )}

              {/* Resumo do Curso */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Curso</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {courseTitle}
                  </p>
                </div>
                {profile?.full_name && (
                  <div>
                    <p className="text-xs text-gray-600">Formando</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {profile.full_name}
                    </p>
                  </div>
                )}
                {instructorName && (
                  <div>
                    <p className="text-xs text-gray-600">Instrutor</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {instructorName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Método de Pagamento */}
          {activeTab === "payment" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  disabled={loading || success}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="m-pesa">M-Pesa</option>
                  <option value="e-mola">E-Mola</option>
                  <option value="bank">Transferência Bancária</option>
                </select>
              </div>

              {/* Dados de Pagamento por Método */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Dados para Transferência:
                </p>
                {paymentMethod === "m-pesa" && (
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">
                      M-Pesa: <span className="font-bold">846909999</span>
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Faça a transferência para este número e insira o ID da
                      transação abaixo.
                    </p>
                  </div>
                )}
                {paymentMethod === "e-mola" && (
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">
                      E-Mola: <span className="font-bold">(870509214)</span>
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Faça a transferência para este número e insira o ID da
                      transação abaixo.
                    </p>
                  </div>
                )}
                {paymentMethod === "bank" && (
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">
                      BCI:{" "}
                      <span className="font-bold">(000800000971671710113)</span>
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Faça a transferência para esta conta e insira o ID da
                      transação abaixo.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID da Transação
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  disabled={loading || success}
                  placeholder="Ex: TRX123456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cole o ID ou número de referência da sua transação
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> Certifique-se de que o pagamento foi
                  processado antes de enviar os dados. O instrutor confirmará
                  seu pagamento antes de liberar o certificado.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixo */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 space-y-3">
          {activeTab === "summary" && (
            <button
              onClick={() => setActiveTab("payment")}
              className="w-full bg-brand-green text-white py-2 rounded-lg hover:bg-brand-dark transition font-medium"
            >
              Continuar para Pagamento →
            </button>
          )}

          {activeTab === "payment" && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <button
                type="submit"
                disabled={loading || success}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
              >
                {loading
                  ? "Enviando..."
                  : success
                    ? "✓ Enviado"
                    : "Enviar Dados de Pagamento"}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                disabled={loading}
                className="w-full text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                ← Voltar
              </button>
            </form>
          )}

          <button
            onClick={handleClose}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePaymentModal;
