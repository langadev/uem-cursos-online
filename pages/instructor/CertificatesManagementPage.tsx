import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    query,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { AlertCircle, Check, Clock, Search, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import InstructorLayout from "../../layouts/InstructorLayout";
import { cacheService } from "../../services/cacheService";
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
}

interface CourseData {
  id: string;
  title: string;
}

const CertificatesManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<{ [key: string]: CourseData }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "confirmed" | "rejected"
  >("pending");
  const [searchTransactionId, setSearchTransactionId] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const instructorCoursesRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadCoursesAndCertificates();
    }
  }, [user]);

  // Carrega cursos primeiro, depois certados para esses cursos
  const loadCoursesAndCertificates = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. Obter cursos do instrutor (cache para rapidez)
      const cacheKey = `instructor_courses_${user.uid}`;
      let instructorCourses: string[] = [];

      const cached: any = cacheService.get(cacheKey);
      if (cached) {
        instructorCourses = cached;
      } else {
        const coursesRef = collection(db, "courses");
        const q = query(coursesRef, where("instructor_uid", "==", user.uid));
        const snapshot = await getDocs(q);

        instructorCourses = snapshot.docs.map((doc) => doc.id);
        const coursesMap: { [key: string]: CourseData } = {};

        snapshot.docs.forEach((doc) => {
          coursesMap[doc.id] = {
            id: doc.id,
            title: doc.data().title,
          };
        });

        setCourses(coursesMap);
        // Cache com TTL de 60 minutos
        cacheService.set(cacheKey, instructorCourses, 60);
      }

      instructorCoursesRef.current = new Set(instructorCourses);

      // 2. Escutar certificados APENAS desses cursos
      const certificatesRef = collection(db, "certificates");
      if (instructorCourses.length > 0) {
        // Dividir em chunks de 10 para evitar limitações do Firestore
        const chunks = [];
        for (let i = 0; i < instructorCourses.length; i += 10) {
          chunks.push(instructorCourses.slice(i, i + 10));
        }

        // Criar queries para cada chunk
        const unsubscribers: Array<() => void> = [];

        for (const chunk of chunks) {
          const q = query(
            certificatesRef,
            where("course_id", "in", chunk),
            limit(100),
          );

          const unsub = onSnapshot(
            q,
            (snapshot) => {
              const certs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Certificate[];

              // Mesclar com certificados anteriores
              setCertificates((prev) => {
                const map = new Map(prev.map((c) => [c.id, c]));
                certs.forEach((c) => map.set(c.id, c));
                return Array.from(map.values());
              });

              setLoading(false);
            },
            (err) => {
              console.error("Erro ao escutar certificados:", err);
              setLoading(false);
            },
          );

          unsubscribers.push(unsub);
        }

        // Cleanup
        return () => {
          unsubscribers.forEach((unsub) => unsub());
        };
      } else {
        // Sem cursos, sem certificados
        setCertificates([]);
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
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
    } catch (err) {
      console.error("Erro ao rejeitar certificado:", err);
      setError("Erro ao rejeitar certificado");
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    // Filtrar por status
    if (filter !== "all" && cert.status !== filter) return false;

    // Filtrar por ID de transação (busca case-insensitive)
    if (searchTransactionId.trim()) {
      return cert.transaction_id
        .toLowerCase()
        .includes(searchTransactionId.toLowerCase());
    }

    return true;
  });

  const pendingCount = certificates.filter(
    (c) => c.status === "pending",
  ).length;
  const confirmedCount = certificates.filter(
    (c) => c.status === "confirmed",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 border-yellow-200";
      case "confirmed":
        return "bg-green-50 border-green-200";
      case "rejected":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "confirmed":
        return <Check className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Certificados</h1>
          <p className="text-gray-600 mt-2">
            Gerencie as requisições de certificado dos seus estudantes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">À Espera de Confirmação</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {pendingCount}
                </p>
              </div>
              <Clock className="w-12 h-12 text-yellow-100" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Confirmados</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {confirmedCount}
                </p>
              </div>
              <Check className="w-12 h-12 text-green-100" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {certificates.length}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-blue-100" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            {["all", "pending", "confirmed", "rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {status === "all" && "Todos"}
                {status === "pending" && "À Espera"}
                {status === "confirmed" && "Confirmados"}
                {status === "rejected" && "Rejeitados"}
              </button>
            ))}
          </div>

          {/* Search by Transaction ID */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Procurar por ID de Transação..."
              value={searchTransactionId}
              onChange={(e) => setSearchTransactionId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Certificates List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Carregando certificados...</div>
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {filter === "pending"
                ? "Sem requisições de certificado pendentes"
                : "Sem certificados com este status"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCertificates.map((cert) => (
              <div
                key={cert.id}
                className={`border rounded-lg p-6 ${getStatusColor(cert.status)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">{getStatusIcon(cert.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {cert.student_name}
                          </h3>
                          <p className="text-gray-600 mt-1">
                            {cert.course_title}
                          </p>
                        </div>
                        {cert.certificate_id && (
                          <div className="text-right ml-4">
                            <p className="text-xs text-gray-500">
                              ID do Certificado
                            </p>
                            <p className="text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                              {cert.certificate_id}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Método de Pagamento</p>
                          <p className="font-medium text-gray-900">
                            {getPaymentMethodLabel(cert.payment_method)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">ID da Transação</p>
                          <p className="font-medium text-gray-900">
                            {cert.transaction_id}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Submetido em</p>
                          <p className="font-medium text-gray-900">
                            {cert.submitted_at
                              ?.toDate?.()
                              .toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        {cert.confirmed_at && (
                          <div>
                            <p className="text-gray-600">Confirmado em</p>
                            <p className="font-medium text-gray-900">
                              {cert.confirmed_at
                                .toDate()
                                .toLocaleDateString("pt-PT")}
                            </p>
                          </div>
                        )}
                      </div>
                      {cert.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                          <p className="text-sm text-red-800">
                            <strong>Motivo da Rejeição:</strong>{" "}
                            {cert.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {cert.status === "pending" && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-300">
                    <button
                      onClick={() => handleConfirm(cert.id)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Confirmar Pagamento
                    </button>
                    <button
                      onClick={() => setRejectingId(cert.id)}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Rejeitar
                    </button>
                  </div>
                )}

                {rejectingId === cert.id && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Motivo da rejeição (obrigatório)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(cert.id)}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        Confirmar Rejeição
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
};

export default CertificatesManagementPage;
