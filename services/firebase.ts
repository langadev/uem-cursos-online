
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyBWRjMA0aQsbo6Cq-yA5xkFp5ny7n6U_2o",
  authDomain: "edu-prime-ead96.firebaseapp.com",
  projectId: "edu-prime-ead96",
  storageBucket: "edu-prime-ead96.appspot.com",
  messagingSenderId: "656150019016",
  appId: "1:656150019016:web:f98b5d49e85105d8689efd"
};

// Inicialização
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
