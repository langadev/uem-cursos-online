import { initializeApp } from "firebase/app";
import {
    collection,
    doc,
    getDocs,
    getFirestore,
    query,
    updateDoc,
    where,
} from "firebase/firestore";

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

async function migrateData() {
  try {
    console.log("🔄 Iniciando migração de dados...\n");

    // 1. Migrar enrollments
    console.log("📋 Processando enrollments sem instructor_uid...");
    const enrollmentsRef = collection(db, "enrollments");
    const enrollments = await getDocs(enrollmentsRef);

    let enrollmentCount = 0;
    for (const enrollDoc of enrollments.docs) {
      const enrollData = enrollDoc.data();

      // Se não tem instructor_uid, tenta buscar do curso
      if (!enrollData.instructor_uid && enrollData.course_id) {
        const courseRef = doc(db, "courses", enrollData.course_id);
        const courseSnap = await getDocs(
          query(
            collection(db, "courses"),
            where("__name__", "==", enrollData.course_id),
          ),
        );

        if (!courseSnap.empty) {
          const courseData = courseSnap.docs[0].data();
          const instructorUid =
            courseData?.instructor_uid || courseData?.creator_uid;

          if (instructorUid) {
            await updateDoc(doc(db, "enrollments", enrollDoc.id), {
              instructor_uid: instructorUid,
            });
            enrollmentCount++;
            console.log(
              `  ✅ Enrollment ${enrollDoc.id} atualizado com instructor_uid`,
            );
          }
        }
      }
    }
    console.log(`✅ ${enrollmentCount} enrollments atualizados\n`);

    // 2. Migrar lesson-completions
    console.log("📚 Processando lesson-completions sem instructor_uid...");
    const completionsRef = collection(db, "lesson-completions");
    const completions = await getDocs(completionsRef);

    let completionCount = 0;
    for (const compDoc of completions.docs) {
      const compData = compDoc.data();

      // Se não tem instructor_uid, tenta buscar do curso
      if (!compData.instructor_uid && compData.course_id) {
        const courseSnap = await getDocs(
          query(
            collection(db, "courses"),
            where("__name__", "==", compData.course_id),
          ),
        );

        if (!courseSnap.empty) {
          const courseData = courseSnap.docs[0].data();
          const instructorUid =
            courseData?.instructor_uid || courseData?.creator_uid;

          if (instructorUid) {
            await updateDoc(doc(db, "lesson-completions", compDoc.id), {
              instructor_uid: instructorUid,
            });
            completionCount++;
          }
        }
      }
    }
    console.log(`✅ ${completionCount} lesson-completions atualizadas\n`);

    // 3. Migrar certificates
    console.log("🎓 Processando certificates sem instructor_uid...");
    const certificatesRef = collection(db, "certificates");
    const certificates = await getDocs(certificatesRef);

    let certCount = 0;
    for (const certDoc of certificates.docs) {
      const certData = certDoc.data();

      // Se não tem instructor_uid, tenta buscar do curso
      if (!certData.instructor_uid && certData.course_id) {
        const courseSnap = await getDocs(
          query(
            collection(db, "courses"),
            where("__name__", "==", certData.course_id),
          ),
        );

        if (!courseSnap.empty) {
          const courseData = courseSnap.docs[0].data();
          const instructorUid =
            courseData?.instructor_uid || courseData?.creator_uid;

          if (instructorUid) {
            await updateDoc(doc(db, "certificates", certDoc.id), {
              instructor_uid: instructorUid,
            });
            certCount++;
          }
        }
      }
    }
    console.log(`✅ ${certCount} certificates atualizados\n`);

    console.log("🎉 Migração concluída com sucesso!");
    console.log(`\n📊 Resumo:`);
    console.log(`   - Enrollments atualizados: ${enrollmentCount}`);
    console.log(`   - Lesson-completions atualizadas: ${completionCount}`);
    console.log(`   - Certificates atualizados: ${certCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    process.exit(1);
  }
}

migrateData();
