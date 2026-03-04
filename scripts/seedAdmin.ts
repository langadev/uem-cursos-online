/**
 * Script para criar um utilizador Admin no Firestore
 * Execute: npx ts-node scripts/seedAdmin.ts
 */

import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    updateProfile,
} from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBWRjMA0aQsbo6Cq-yA5xkFp5ny7n6U_2o",
  authDomain: "edu-prime-ead96.firebaseapp.com",
  projectId: "edu-prime-ead96",
  storageBucket: "edu-prime-ead96.appspot.com",
  messagingSenderId: "656150019016",
  appId: "1:656150019016:web:f98b5d49e85105d8689efd",
};

// Dados do Admin
const adminData = {
  email: "admin@eduprimes.mz",
  password: "AdminEduPrime@2024",
  full_name: "Administrador Principal",
};

async function seedAdmin() {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log("🔄 Criando utilizador admin...");

    // Criar utilizador no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminData.email,
      adminData.password,
    );

    const user = userCredential.user;
    console.log("✅ Utilizador criado no Firebase Auth:", user.uid);

    // Atualizar nome do utilizador
    await updateProfile(user, {
      displayName: adminData.full_name,
    });
    console.log("✅ Nome atualizado");

    // Criar documento de perfil no Firestore com role de admin
    const profileRef = doc(db, "profiles", user.uid);
    await setDoc(profileRef, {
      id: user.uid,
      uid: user.uid,
      email: adminData.email,
      full_name: adminData.full_name,
      role: "admin", // ← IMPORTANTE: Define como admin
      status: "Ativo",
      avatar_url: null,
      providers: ["password"],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    console.log("✅ Perfil de admin criado no Firestore");

    console.log("\n" + "=".repeat(60));
    console.log("🎉 ADMIN CRIADO COM SUCESSO!");
    console.log("=".repeat(60));
    console.log("\n📧 Email: " + adminData.email);
    console.log("🔐 Senha: " + adminData.password);
    console.log("🆔 UID: " + user.uid);
    console.log(
      "\n✨ Você pode agora fazer login em http://localhost:5173/login",
    );
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erro ao criar admin:", error.message);
    if (error.code === "auth/email-already-in-use") {
      console.log(
        "\n⚠️  O email já está registado. Tente outro email ou delete o utilizador do Firebase Console.",
      );
    }
    process.exit(1);
  }
}

seedAdmin();
