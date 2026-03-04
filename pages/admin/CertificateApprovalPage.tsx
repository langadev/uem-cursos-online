import {
    collection,
    doc,
    limit,
    onSnapshot,
    query,
    Timestamp,
    updateDoc
} from "firebase/firestore";
import { AlertCircle, Check, Clock, Filter, Search, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../layouts/AdminLayout";
import { db } from "../../services/firebase";

interface Certificate {
  id: string;
  certificate_id?: string;
  student_uid: string;
  student_name: string;
  course_id: string;
  course_title: string;
  status: "pending" | "confirmed" | "rejected";
  payment_method: "m-pesa" | "e-mola" | "bank";
  transaction_id: string;
  submitted_at: Timestamp;
  confirmed_at?: Timestamp;
  rejection_reason?: string;
  instructor_uid?: string;
}

const CertificateApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "confirmed" | "rejected"
  >("pending");
  const [searchCertificateId, setSearchCertificateId] = useState("");
  const [searchStudentName, setSearchStudentName] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      loadCertificates();
    }
  }, [user]);

  const loadCertificates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const certificatesRef = collection(db, "certificates");
      const q = query(certificatesRef, limit(500));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const certs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Certificate[];

          setCertificates(certs);
          setLoading(false);
        },
        (err) => {
          console.error("Erro ao escutar certificados:", err);
          setError("Erro ao carregar certificados");
          setLoading(false);
        },
      );

      // Cleanup
      return () => {
        unsub();
      };
    } catch (err) {
      console.error("Erro ao iniciar escuta de certificados:", err);
      setError("Erro ao iniciar carregamento de certificados");
      setLoading(false);
    }
  };

  const handleConfirm = async (certId: string) => {
    try {
      const certRef = doc(db, "certificates", certId);
      await updateDoc(certRef, {
        status: "confirmed",
        confirmed_at: Timestamp.now(),
      });
      setError("");
    } catch (err) {
      console.error("Erro ao confirmar certificado:", err);
      setError("Erro ao confirmar certificado");
    }
  };

  const handleReject = async (certId: string) => {
    if (!rejectionReason.trim()) {
      setError("Por favor, insira um motivo para a rejeição");
      return;
    }

    try {
      const certRef = doc(db, "certificates", certId);
      await updateDoc(certRef, {
        status: "rejected",
        rejection_reason: rejectionReason,
      });
      setRejectingId(null);
      setRejectionReason("");
      setError("");
    } catch (err) {
      console.error("Erro ao rejeitar certificado:", err);
      setError("Erro ao rejeitar certificado");
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    // Filtrar por status
    if (filter !== "all" && cert.status !== filter) return false;

    // Filtrar por ID do certificado (busca case-insensitive)
    if (searchCertificateId.trim()) {
      if (
        !cert.certificate_id
          ?.toLowerCase()
          .includes(searchCertificateId.toLowerCase())
      ) {
        return false;
      }
    }

    // Filtrar por nome do formando (busca case-insensitive)
    if (searchStudentName.trim()) {
      if (
        !cert.student_name
          .toLowerCase()
          .includes(searchStudentName.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  });

  const pendingCount = certificates.filter(
    (c) => c.status === "pending",
  ).length;
  const confirmedCount = certificates.filter(
    (c) => c.status === "confirmed",
  ).length;
  const rejectedCount = certificates.filter(
    (c) => c.status === "rejected",
  ).length;

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "m-pesa":
        return "M-Pesa";
      case "e-mola":
        return "E-Mola";
      case "bank":
        return "Transferência Bancária";
      default:
        return method;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "À Espera";
      case "confirmed":
        return "Confirmado";
      case "rejected":
        return "Rejeitado";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 border-l-4 border-amber-400 shadow-sm hover:shadow-md";
      case "confirmed":
        return "bg-emerald-50 border-l-4 border-emerald-400 shadow-sm hover:shadow-md";
      case "rejected":
        return "bg-red-50 border-l-4 border-red-400 shadow-sm hover:shadow-md";
      default:
        return "bg-gray-50 border-l-4 border-gray-400";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "confirmed":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-amber-600" />;
      case "confirmed":
        return <Check className="w-5 h-5 text-emerald-600" />;
      case "rejected":
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">
              Aprovação de Certificados
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Revise e aprove as requisições de certificado dos estudantes
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => setFilter("pending")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">À Espera</p>
                  <p className="text-4xl font-bold text-amber-600 mt-2">
                    {pendingCount}
                  </p>
                </div>
                <div className="bg-amber-100 rounded-full p-3">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
              </div>
            </div>

            <div
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => setFilter("confirmed")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Confirmados
                  </p>
                  <p className="text-4xl font-bold text-emerald-600 mt-2">
                    {confirmedCount}
                  </p>
                </div>
                <div className="bg-emerald-100 rounded-full p-3">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
            </div>

            <div
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => setFilter("rejected")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Rejeitados
                  </p>
                  <p className="text-4xl font-bold text-red-600 mt-2">
                    {rejectedCount}
                  </p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <X className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total</p>
                  <p className="text-4xl font-bold text-blue-600 mt-2">
                    {certificates.length}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <AlertCircle className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Filtrer e Buscar
              </h2>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Estado:</p>
              <div className="flex gap-2 flex-wrap">
                {["all", "pending", "confirmed", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === status
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {status === "all" && "Todos"}
                    {status === "pending" && "À Espera"}
                    {status === "confirmed" && "Confirmados"}
                    {status === "rejected" && "Rejeitados"}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por ID do Certificado (ex: 12345)..."
                  value={searchCertificateId}
                  onChange={(e) => setSearchCertificateId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome do formando..."
                  value={searchStudentName}
                  onChange={(e) => setSearchStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(searchCertificateId || searchStudentName) && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    setSearchCertificateId("");
                    setSearchStudentName("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* Results Info */}
          <div className="mb-4 text-gray-600 text-sm">
            <span className="font-semibold">{filteredCertificates.length}</span>{" "}
            de <span className="font-semibold">{certificates.length}</span>{" "}
            certificado(s)
          </div>

          {/* Certificates List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 text-lg">
                Carregando certificados...
              </p>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                {filter === "pending"
                  ? "Nenhum certificado à espera de confirmação"
                  : "Nenhum certificado encontrado com esses critérios"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className={`border rounded-xl p-6 transition-all ${getStatusColor(
                    cert.status,
                  )}`}
                >
                  {/* Row 1: Header com Status e ID */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(cert.status)}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {cert.student_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {cert.course_title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {cert.certificate_id && (
                        <div className="text-right bg-white bg-opacity-60 px-3 py-2 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 font-medium">
                            Cert. ID
                          </p>
                          <p className="text-lg font-bold text-gray-900 font-mono">
                            {cert.certificate_id}
                          </p>
                        </div>
                      )}
                      <span
                        className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${getStatusBadgeColor(
                          cert.status,
                        )}`}
                      >
                        {getStatusLabel(cert.status)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Detalhes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200 border-opacity-40">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">
                        Método de Pagamento
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {getPaymentMethodLabel(cert.payment_method)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">
                        ID Transação
                      </p>
                      <p className="text-sm font-mono font-semibold text-gray-900 mt-1">
                        {cert.transaction_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">
                        Submetido em
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {cert.submitted_at
                          ?.toDate?.()
                          .toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    {cert.confirmed_at && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">
                          Confirmado em
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {cert.confirmed_at
                            .toDate()
                            .toLocaleDateString("pt-PT")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Motivo Rejeição (se houver) */}
                  {cert.rejection_reason && (
                    <div className="mb-4 p-3 bg-red-100 rounded-lg border border-red-300">
                      <p className="text-sm text-red-800">
                        <strong>Motivo da Rejeição:</strong>{" "}
                        {cert.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* Row 4: Actions */}
                  {cert.status === "pending" ? (
                    !rejectingId || rejectingId !== cert.id ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleConfirm(cert.id)}
                          className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-semibold flex items-center justify-center gap-2"
                        >
                          <Check className="w-5 h-5" />
                          Aprovar Certificado
                        </button>
                        <button
                          onClick={() => setRejectingId(cert.id)}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
                        >
                          <X className="w-5 h-5" />
                          Rejeitar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Motivo da rejeição (obrigatório)"
                          className="w-full px-4 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                          rows={3}
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReject(cert.id)}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold"
                          >
                            Confirmar Rejeição
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason("");
                            }}
                            className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-sm text-gray-600 italic">
                      Certificado {getStatusLabel(cert.status).toLowerCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default CertificateApprovalPage;
