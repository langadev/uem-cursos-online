// 🔍 SCRIPT DE DEBUG - Cole no Console do Browser (F12)

console.log("🔍 === DIAGNÓSTICO DE INSCRIÇÕES ===\n");

// 1. Verificar autenticação
const uid = firebase.auth().currentUser?.uid;
console.log("1️⃣ UID do usuário:", uid);

if (!uid) {
  console.error("❌ Usuário não autenticado!");
} else {
  // 2. Verificar inscrições com user_uid
  db.collection("enrollments")
    .where("user_uid", "==", uid)
    .onSnapshot(
      (snap) => {
        console.log("\n2️⃣ Inscrições (user_uid):", snap.size);
        snap.forEach((doc) => {
          console.log("   📝", doc.id, doc.data());
        });
      },
      (err) => {
        console.error("❌ Erro na query user_uid:", err.message);
      },
    );

  // 3. Verificar inscrições com userId
  db.collection("enrollments")
    .where("userId", "==", uid)
    .onSnapshot(
      (snap) => {
        console.log("\n3️⃣ Inscrições (userId):", snap.size);
        snap.forEach((doc) => {
          console.log("   📝", doc.id, doc.data());
        });
      },
      (err) => {
        console.error("❌ Erro na query userId:", err.message);
      },
    );

  // 4. Verificar dados dos cursos
  db.collection("courses")
    .limit(5)
    .onSnapshot(
      (snap) => {
        console.log("\n4️⃣ Cursos no BD:", snap.size);
        snap.forEach((doc) => {
          console.log("   📚", doc.id, "=>", doc.data().title);
        });
      },
      (err) => {
        console.error("❌ Erro ao buscar cursos:", err.message);
      },
    );

  // 5. Verificar submissões
  db.collection("submissions")
    .where("user_uid", "==", uid)
    .limit(5)
    .onSnapshot(
      (snap) => {
        console.log("\n5️⃣ Submissões:", snap.size);
        snap.forEach((doc) => {
          console.log("   📤", doc.id, doc.data());
        });
      },
      (err) => {
        console.error("❌ Erro ao buscar submissões:", err.message);
      },
    );

  // 6. Verificar aulas concluídas
  db.collection("lesson-completions")
    .where("user_uid", "==", uid)
    .limit(5)
    .onSnapshot(
      (snap) => {
        console.log("\n6️⃣ Aulas concluídas:", snap.size);
        snap.forEach((doc) => {
          console.log("   ✅", doc.id, doc.data());
        });
      },
      (err) => {
        console.error("❌ Erro ao buscar aulas concluídas:", err.message);
      },
    );
}

console.log("\n✅ Diagnóstico enviado. Verifique os logs acima ☝️");
