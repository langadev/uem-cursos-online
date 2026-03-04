/**
 * Script para testar o sistema de branding dinâmico
 * Execute: npx tsx scripts/testBranding.ts
 */

import { initializeApp } from "firebase/app";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBWRjMA0aQsbo6Cq-yA5xkFp5ny7n6U_2o",
  authDomain: "edu-prime-ead96.firebaseapp.com",
  projectId: "edu-prime-ead96",
  storageBucket: "edu-prime-ead96.appspot.com",
  messagingSenderId: "656150019016",
  appId: "1:656150019016:web:f98b5d49e85105d8689efd",
};

const BRANDING_EXAMPLES = {
  eduPrimePadrao: {
    appearance: {
      platformName: "UEM Cursos online",
      institutionName: "UEM Cursos online Academy Group",
      applicationName: "UEM Cursos online LMS Portal",
      primaryColor: "#0E7038",
      accentColor: "#EAB308",
      fontFamily: "Inter",
      logoUrl: "/logo-plataforma.png",
    },
    system: {
      maintenanceMode: false,
      publicSignups: true,
      dynamicCache: true,
    },
    security: {
      require2FA: true,
      auditLogs: true,
      limitedSessions: false,
    },
  },
  universidadeAzul: {
    appearance: {
      platformName: "Universidade Online",
      institutionName: "Universidade Federal Azul",
      applicationName: "Portal Acadêmico UFA",
      primaryColor: "#1e40af", // Azul vibrante
      accentColor: "#06b6d4", // Cyan
      fontFamily: "Roboto",
      logoUrl: "",
    },
    system: {
      maintenanceMode: false,
      publicSignups: true,
      dynamicCache: true,
    },
    security: {
      require2FA: true,
      auditLogs: true,
      limitedSessions: false,
    },
  },
  escolaPurpura: {
    appearance: {
      platformName: "Escola Digital",
      institutionName: "Escola Técnica Púrpura",
      applicationName: "Plataforma EAD Púrpura",
      primaryColor: "#9333ea", // Púrpura
      accentColor: "#ec4899", // Pink
      fontFamily: "Poppins",
      logoUrl: "",
    },
    system: {
      maintenanceMode: false,
      publicSignups: true,
      dynamicCache: true,
    },
    security: {
      require2FA: false,
      auditLogs: true,
      limitedSessions: false,
    },
  },
  centroCursosCoral: {
    appearance: {
      platformName: "Cursos Online",
      institutionName: "Centro de Cursos Coral",
      applicationName: "Academia Coral",
      primaryColor: "#dc2626", // Vermelho
      accentColor: "#f59e0b", // Âmbar
      fontFamily: "Montserrat",
      logoUrl: "",
    },
    system: {
      maintenanceMode: false,
      publicSignups: true,
      dynamicCache: true,
    },
    security: {
      require2FA: false,
      auditLogs: false,
      limitedSessions: true,
    },
  },
};

async function testBranding(brandName: keyof typeof BRANDING_EXAMPLES) {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const brandingConfig = BRANDING_EXAMPLES[brandName];

    console.log(`\n🎨 Testando branding: ${brandName}`);
    console.log("=" + "=".repeat(59));

    await setDoc(
      doc(db, "settings", "system"),
      {
        ...brandingConfig,
        updatedAt: serverTimestamp(),
      },
      { merge: false },
    );

    console.log("✅ Branding aplicado com sucesso!");
    console.log(`\n📋 Detalhes:`);
    console.log(`   Instituição: ${brandingConfig.appearance.institutionName}`);
    console.log(`   Aplicação: ${brandingConfig.appearance.applicationName}`);
    console.log(`   Cor Primária: ${brandingConfig.appearance.primaryColor}`);
    console.log(`   Cor de Acento: ${brandingConfig.appearance.accentColor}`);
    console.log(`   Tipografia: ${brandingConfig.appearance.fontFamily}`);
    console.log(
      `\n💡 Visite: http://localhost:3000 para ver as mudanças em tempo real!`,
    );
    console.log("=" + "=".repeat(59) + "\n");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erro ao testar branding:", error.message);
    process.exit(1);
  }
}

// Testar com o primeiro branding (UEM Cursos online padrão)
const brandingToTest = process.argv[2] || "eduPrimePadrao";
if (!(brandingToTest in BRANDING_EXAMPLES)) {
  console.log("❌ Branding não encontrado. Opções disponíveis:");
  Object.keys(BRANDING_EXAMPLES).forEach((key) => console.log(`   - ${key}`));
  process.exit(1);
}

testBranding(brandingToTest as keyof typeof BRANDING_EXAMPLES);
