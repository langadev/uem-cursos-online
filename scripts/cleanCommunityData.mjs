import { initializeApp } from "firebase/app";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
} from "firebase/firestore";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDQmJH3P-qD8z9nKzXsVvU9XzXx9xXxXxX",
  authDomain: "cemoqe-cursos-online.firebaseapp.com",
  projectId: "cemoqe-cursos-online",
  storageBucket: "cemoqe-cursos-online.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanCommunityData() {
  try {
    console.log("🧹 Iniciando limpeza de dados da comunidade...\n");

    // Delete all community replies
    console.log("📝 Deletando replies...");
    const repliesSnapshot = await getDocs(collection(db, "community-replies"));
    let repliesDeleted = 0;
    for (const docSnapshot of repliesSnapshot.docs) {
      await deleteDoc(doc(db, "community-replies", docSnapshot.id));
      repliesDeleted++;
    }
    console.log(`✅ ${repliesDeleted} replies deletados\n`);

    // Delete all community topics
    console.log("📌 Deletando topics...");
    const topicsSnapshot = await getDocs(collection(db, "community-topics"));
    let topicsDeleted = 0;
    for (const docSnapshot of topicsSnapshot.docs) {
      await deleteDoc(doc(db, "community-topics", docSnapshot.id));
      topicsDeleted++;
    }
    console.log(`✅ ${topicsDeleted} topics deletados\n`);

    console.log("🎉 Limpeza concluída com sucesso!");
    console.log(`Total deletado: ${repliesDeleted + topicsDeleted} documentos`);
  } catch (error) {
    console.error("❌ Erro durante limpeza:", error);
    process.exit(1);
  }
}

cleanCommunityData();
