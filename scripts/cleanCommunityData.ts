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
  apiKey: process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.VITE_FIREBASE_APP_ID || "",
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
