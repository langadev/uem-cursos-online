#!/usr/bin/env node
/**
 * Script para limpar categorias iniciais do Firestore
 * Remove as categorias padrão (Design, Liderança, Desenvolvimento, Marketing)
 */

import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

const DEFAULT_CATEGORIES = [
  "Design",
  "Liderança",
  "Desenvolvimento",
  "Marketing",
];

async function cleanInitialCategories() {
  console.log("🧹 Iniciando limpeza de categorias iniciais...\n");

  try {
    const categoriesRef = collection(db, "categories");
    const snapshot = await getDocs(categoriesRef);

    let deleted = 0;
    let skipped = 0;

    for (const document of snapshot.docs) {
      const data = document.data();
      const categoryName = data.name;

      if (DEFAULT_CATEGORIES.includes(categoryName)) {
        await deleteDoc(doc(db, "categories", document.id));
        console.log(`✅ Deletado: "${categoryName}" (ID: ${document.id})`);
        deleted++;
      } else {
        console.log(`⏭️  Pulado: "${categoryName}" (não é categoria padrão)`);
        skipped++;
      }
    }

    console.log("\n📊 RESUMO:");
    console.log("=".repeat(50));
    console.log(`Total deletado: ${deleted}`);
    console.log(`Total pulado: ${skipped}`);

    if (deleted > 0) {
      console.log(
        "\n✅ Limpeza concluída! As categorias iniciais foram removidas.",
      );
      console.log(
        "Agora a página de admin de conteúdos não exibirá categorias iniciais.",
      );
    } else {
      console.log("\nℹ️  Nenhuma categoria inicial encontrada para deletar.");
    }
  } catch (error) {
    console.error("❌ Erro ao limpar categorias:", error);
    process.exit(1);
  }
}

cleanInitialCategories();
