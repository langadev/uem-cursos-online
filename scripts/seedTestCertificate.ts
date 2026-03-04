import { initializeApp } from "firebase/app";
import { addDoc, collection, getDocs, getFirestore, Timestamp } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC_ALP_WI_yZxzU_pCB-E3vO_JrLxQM8rU",
  authDomain: "cemoque-edu.firebaseapp.com",
  projectId: "cemoque-edu",
  storageBucket: "cemoque-edu.appspot.com",
  messagingSenderId: "945405821747",
  appId: "1:945405821747:web:8e87f38fec90c3d3f31fc2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedTestCertificate() {
  try {
    console.log("📋 Criando certificado de teste...");

    // 1. Buscar primeiro curso disponível
    const coursesRef = collection(db, "courses");
    const coursesSnap = await getDocs(coursesRef);

    if (coursesSnap.empty) {
      console.error("❌ Nenhum curso encontrado no banco de dados!");
      process.exit(1);
    }

    const firstCourse = coursesSnap.docs[0].data();
    const courseId = coursesSnap.docs[0].id;
    const courseTitle = firstCourse.title || "Curso";
    const instructorUid = firstCourse.instructor_uid || "unknown-instructor";

    console.log(`✨ Usando curso: ${courseTitle} (ID: ${courseId})`);
    console.log(`👨‍🏫 Instrutor: ${instructorUid}`);

    const certificatesRef = collection(db, "certificates");

    // Certificado de teste com ID de transação específica
    const testCertificate = {
      student_uid: "test-student-uid",
      student_name: "Estudante Teste",
      course_id: courseId,
      course_title: courseTitle,
      status: "pending",
      payment_method: "e-mola",
      transaction_id: "rb321qrfsdb nnggfg",
      submitted_at: Timestamp.fromDate(new Date("2026-02-13")),
      instructor_uid: instructorUid,
    };

    const docRef = await addDoc(certificatesRef, testCertificate);

    console.log("\n✅ Certificado de teste criado com sucesso!");
    console.log(`📝 ID do documento: ${docRef.id}`);
    console.log(`🔍 ID de Transação: rb321qrfsdb nnggfg`);
    console.log(`👤 Estudante: Estudante Teste`);
    console.log(`📚 Curso: ${courseTitle}`);
    console.log(`⏳ Status: Pendente`);
    console.log(`\n👉 O instrutor pode procurar este certificado em: /instrutor/certificados`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar certificado de teste:", error);
    process.exit(1);
  }
}

seedTestCertificate();
