// 📝 TESTE MANUAL - Criar dados de teste no Firebase

// Cole isto no Console (F12) para criar dados de teste

const uid = firebase.auth().currentUser?.uid;
console.log("UID do usuário:", uid);

if (uid) {
  // 1. Criar um curso de teste
  const courseId = "test-course-" + Date.now();
  db.collection("courses")
    .doc(courseId)
    .set({
      title: "Teste - React Avançado",
      description: "Curso de teste para verificar sistema",
      category: "Web Development",
      instructor: "Instrutor Teste",
      imageUrl: "https://via.placeholder.com/400x200?text=Test+Course",
      modules: [
        {
          id: "mod-1",
          title: "Módulo 1",
          lessons: [
            { id: "aula-1", title: "Aula 1" },
            { id: "aula-2", title: "Aula 2" },
            { id: "aula-3", title: "Aula 3" },
          ],
        },
        {
          id: "mod-2",
          title: "Módulo 2",
          lessons: [
            { id: "aula-4", title: "Aula 4" },
            { id: "aula-5", title: "Aula 5" },
          ],
        },
      ],
    })
    .then(() => {
      console.log("✅ Curso criado:", courseId);

      // 2. Criar inscrição do usuário neste curso
      db.collection("enrollments")
        .add({
          user_uid: uid,
          userId: uid,
          course_id: courseId,
          course_title: "Teste - React Avançado",
          enrolled_at: firebase.firestore.Timestamp.now(),
          created_at: firebase.firestore.Timestamp.now(),
          status: "active",
        })
        .then((ref) => {
          console.log("✅ Inscrição criada:", ref.id);

          // 3. Criar algumas aulas concluídas
          db.collection("lesson-completions")
            .add({
              user_uid: uid,
              userId: uid,
              course_id: courseId,
              lesson_id: "aula-1",
              completedAt: firebase.firestore.Timestamp.now(),
              created_at: firebase.firestore.Timestamp.now(),
            })
            .then((ref) => {
              console.log("✅ Aula 1 marcada como concluída:", ref.id);
            });

          db.collection("lesson-completions")
            .add({
              user_uid: uid,
              userId: uid,
              course_id: courseId,
              lesson_id: "aula-2",
              completedAt: firebase.firestore.Timestamp.now(),
              created_at: firebase.firestore.Timestamp.now(),
            })
            .then((ref) => {
              console.log("✅ Aula 2 marcada como concluída:", ref.id);
            });
        });
    })
    .catch((err) => console.error("❌ Erro:", err));
} else {
  console.error("❌ Usuário não autenticado!");
}

console.log("📌 Aguarde 3 segundos e recarregue a página (F5)...");
