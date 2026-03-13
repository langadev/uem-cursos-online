# 📋 Análise do Sistema de Quizes/Testes - CEMOQE

**Data:** Março 2026  
**Projeto:** CEMOQE-UEM  
**Componentes Principais:** CourseEditorPage, CoursePlayerPage, InteractiveQuiz

---

## 📌 Resumo Executivo

O sistema atual implementa um **sistema completo de exercícios interativos** (quizes, testes, avaliações) integrado aos cursos online. Os exercícios são criados pelos instrutores no editor de cursos e respondidos pelos alunos no player de cursos. O sistema suporta **4 tipos diferentes de exercícios** com feedback imediato e rastreamento automático.

---

## 🎯 Tipos de Exercícios Suportados

### 1️⃣ **Quiz (Múltipla Escolha)**
**Arquivo:** `pages/instructor/CourseEditorPage.tsx` (linhas 991-1018)

**Estrutura de Dados:**
```typescript
{
  type: "quiz",
  title: "Nome do Quiz",
  description?: "Descrição opcional",
  quiz: {
    question: "Qual é a pergunta?",
    options: [
      { id: "opt-1", text: "Opção A", correct: true },
      { id: "opt-2", text: "Opção B", correct: false },
      { id: "opt-3", text: "Opção C", correct: false }
    ]
  },
  settings: {
    multiSelect?: boolean,  // Um ou múltiplas respostas?
    explanation?: string,   // Feedback após resposta
    points?: number,        // Pontuação
    timedSeconds?: number   // Tempo limite (segundos)
  }
}
```

**Como é Criado (Instrutor):**
- Função `setQuizQuestion()` - Define a pergunta
- Função `addQuizOption()` - Adiciona uma nova opção
- Função `setQuizOptionText()` - Edita texto da opção
- Função `toggleQuizOptionCorrect()` - Marca opção como correta
- Função `removeQuizOption()` - Remove opção

**Verificação (Aluno):**
```typescript
const checkQuiz = (ex: any) => {
  const selected: string[] = answers[ex.id]?.selected || [];
  const correct = (ex.quiz?.options || [])
    .filter((o: any) => o.correct)
    .map((o: any) => o.id);
  const ok =
    selected.length === correct.length &&
    selected.every((id: any) => correct.includes(id));
  setChecked((prev) => ({ ...prev, [ex.id]: ok }));
};
```

**Lógica:**
- ✅ Compara quantidade de respostas selecionadas com as corretas
- ✅ Verifica se todas as opções selecionadas estão corretas
- ✅ Resultado: `true` (correto) ou `false` (errado)

---

### 2️⃣ **Verdadeiro/Falso**
**Arquivo:** `pages/instructor/CourseEditorPage.tsx` (linhas 1130-1165)

**Estrutura de Dados:**
```typescript
{
  type: "truefalse",
  title: "Afirmações V/F",
  truefalse: {
    statements: [
      { id: "stmt-1", text: "Afirmação para V/F", answer: true },
      { id: "stmt-2", text: "Outra afirmação", answer: false }
    ]
  }
}
```

**Como é Criado (Instrutor):**
- Função `addTFStatement()` - Adiciona uma afirmação
- Função `setTFStatementText()` - Edita o texto
- Função `toggleTFAnswer()` - Define a resposta correta
- Função `removeTFStatement()` - Remove afirmação

**Verificação (Aluno):**
```typescript
const checkTF = (ex: any) => {
  const tf = answers[ex.id]?.tf || {};
  const ok = (ex.truefalse?.statements || []).every(
    (s: any) => tf[s.id] === s.answer
  );
  setChecked((prev) => ({ ...prev, [ex.id]: ok }));
};
```

**Lógica:**
- ✅ Aluno responde V ou F para cada afirmação
- ✅ Todas as respostas devem estar corretas
- ✅ Uma afirmação errada = exercício falhou

---

### 3️⃣ **Preenchimento (Fill in the Blank)**
**Arquivo:** `pages/instructor/CourseEditorPage.tsx`

**Estrutura de Dados:**
```typescript
{
  type: "fillblank",
  title: "Preencha as Lacunas",
  fillblank: {
    prompt: "Complete: A capital de Moçambique é ___ e ___",
    blanks: [
      {
        id: "blank-1",
        label?: "Primeira lacuna",
        answers: ["Maputo", "MAPUTO"] // Aceita múltiplas respostas
      },
      {
        id: "blank-2",
        answers: ["província de Gaza", "Gaza"]
      }
    ]
  },
  settings: {
    caseSensitive?: boolean  // Diferenciar maiúsculas?
  }
}
```

**Verificação (Aluno):**
```typescript
const checkFill = (ex: any) => {
  const blanks = answers[ex.id]?.blanks || {};
  const caseSensitive = !!ex.settings?.caseSensitive;
  const norm = (s: string) =>
    caseSensitive ? s.trim() : s.trim().toLowerCase();
  const ok = (ex.fillblank?.blanks || []).every((b: any) => {
    const val = norm(String(blanks[b.id] || ""));
    const options = (b.answers || []).map((x: string) => norm(String(x || "")));
    return options.includes(val) && val.length > 0;
  });
  setChecked((prev) => ({ ...prev, [ex.id]: ok }));
};
```

**Lógica:**
- ✅ Suporta múltiplas respostas corretas por lacuna
- ✅ Opcionalmente case-sensitive
- ✅ Cada lacuna deve ser preenchida corretamente
- ✅ Ignora espaços em branco extras

---

### 4️⃣ **Arrastar & Soltar (Drag & Drop)**
**Arquivo:** `pages/instructor/CourseEditorPage.tsx`

**Estrutura de Dados:**
```typescript
{
  type: "dragdrop",
  title: "Arraste os Itens Corretos",
  dragdrop: {
    prompt: "Associe os conceitos:",
    targets: [
      { id: "target-1", label: "Zona A" },
      { id: "target-2", label: "Zona B" }
    ],
    items: [
      { id: "item-1", text: "Item 1", targetId: "target-1" },
      { id: "item-2", text: "Item 2", targetId: "target-2" }
    ]
  }
}
```

**Verificação (Aluno):**
```typescript
const checkDrag = (ex: any) => {
  const map = answers[ex.id]?.map || {};
  const all = (ex.dragdrop?.items || []).every(
    (i: any) => (map[i.id] || "") === (i.targetId || "")
  );
  setChecked((prev) => ({ ...prev, [ex.id]: all }));
};
```

**Lógica:**
- ✅ Aluno arrasta cada item para sua zona correta
- ✅ Cada item deve estar no alvo correto
- ✅ Ordem não importa, apenas correspondência correta

---

## 🗄️ Armazenamento de Dados

### **Localização no Firebase:**

```
Firestore
└── courses
    ├── [course-id]
    │   ├── title
    │   ├── modules[]
    │   ├── interactiveExercises[]  ← QUIZES AQUI
    │   └── ...outros campos
    │
    ├── exercise-completions
    │   └── {course_id, exercise_id, user_uid, completedAt}
    │
    └── submissions
        └── {course_id, lesson_id, user_uid, fileName, url}
```

### **Salvamento de Exercícios:**

**Arquivo:** `pages/instructor/CourseEditorPage.tsx` (linhas 750-805)

```typescript
const payload: any = {
  creator_uid: user.uid,
  instructor_uid: user.uid,
  title: formData.title,
  modules: formData.modules,
  interactiveExercises: Array.isArray(formData.interactiveExercises)
    ? formData.interactiveExercises
    : [],
  // ... mais campos
  updatedAt: serverTimestamp(),
};

// Salvar no Firebase
if (id) {
  await updateDoc(doc(db, "courses", id), payload);
} else {
  const ref = collection(db, "courses");
  await addDoc(ref, { ...payload, createdAt: serverTimestamp() });
}
```

---

## 🎮 Fluxo de Resposta do Aluno

### **1. Carregamento dos Exercícios**
```typescript
// CoursePlayerPage.tsx - InteractiveQuiz component
const list = useMemo(() => {
  const all = Array.isArray(course?.interactiveExercises)
    ? course.interactiveExercises
    : [];
  // Filtrar por aula atual
  const currentLessonId = String(lesson?.id || "");
  return all.filter(
    (ex: any) =>
      String(ex.lessonId || ex.lesson_id || "") === currentLessonId
  );
}, [course, lesson]);
```

### **2. Interface de Resposta**
```typescript
// Quiz example
const toggleOption = (exId: string, optId: string) => {
  const ex = list.find((e: any) => String(e.id) === String(exId));
  const multi = !!ex?.settings?.multiSelect;
  
  setAnswers((prev) => {
    const curSelected = prev[exId]?.selected || [];
    let nextSelected: string[];
    
    if (!multi) {
      nextSelected = [optId];  // Single choice
    } else {
      const cur = new Set<string>(curSelected);
      if (cur.has(optId)) cur.delete(optId);
      else cur.add(optId);
      nextSelected = Array.from(cur);
    }
    
    return {
      ...prev,
      [exId]: { ...(prev[exId] || {}), selected: nextSelected },
    };
  });
};
```

### **3. Verificação & Feedback**
Quando aluno clica "Verificar Resposta":
1. Sistema compara resposta com gabarito
2. Define `checked[exId] = true/false`
3. Mostra feedback visual:
   - ✅ **Verde "Correto"** - Avanço para próxima
   - ❌ **Vermelho "Tente novamente"** - Botão "Reiniciar"

### **4. Registro de Conclusão**
```typescript
const markExerciseAsComplete = async (exId: string) => {
  if (!id || !user?.uid) return;
  
  setCompletedExercises((prev) => {
    const next = new Set(prev);
    next.add(exId);
    return next;
  });
  
  // Salva no Firebase
  await addDoc(collection(db, "exercise-completions"), {
    course_id: id,
    exercise_id: exId,
    user_uid: user.uid,
    completedAt: serverTimestamp(),
  });
};
```

---

## 📊 Fluxo Completo - Passo a Passo

```
INSTRUTOR
  ↓
1. Abre CourseEditorPage
2. Cria novo exercício via "Adicionar Exercício"
3. Seleciona tipo (Quiz, V/F, Preenchimento, Drag-Drop)
4. Preenche conteúdo específico:
   - Quiz: pergunta + opções + marcar corretas
   - V/F: afirmações + respostas corretas
   - Fill: prompt + lacunas + respostas aceitas
   - Drag: prompt + itens + alvo correto
5. Configura settings (multi-select, case-sensitive, pontos, tempo)
6. Clica "Salvar Curso" → Firebase atualiza campo interactiveExercises
  ↓
ALUNO
  ↓
1. Acessa CoursePlayerPage → Clica em "Exercícios Interativos"
2. InteractiveQuiz carrega exercícios da aula atual
3. Vê todas questões listadas
4. Para cada exercício:
   a. Lê enunciado (e imagem se houver)
   b. Responde de acordo com tipo:
      - Quiz: Marca opções (radio ou checkbox conforme settings)
      - V/F: Seleciona V ou F para cada afirmação
      - Fill: Digita respostas nas lacunas
      - Drag: Arrasta itens para zonas corretas
   c. Clica "Verificar Resposta"
   d. Sistema executa função checkXXX()
   e. Se correto: Verde "Correto" + registra em exercise-completions
      Se errado: Vermelho "Tente novamente" + opção de reiniciar
5. Repete para todos exercícios da aula
6. Progresso atualizado em tempo real
```

---

## ⚙️ Funções Principais do Sistema

### **Lado Instrutor (CourseEditorPage)**

| Função | Propósito | Arquivo |
|---------|-----------|----------|
| `updateExercise()` | Atualizar exercício no formData | L949 |
| `addExercise()` | Criar novo exercício | ~L910 |
| `removeExercise()` | Deletar exercício | L969 |
| `setQuizQuestion()` | Define pergunta | L971 |
| `addQuizOption()` | Adiciona opção | L1001 |
| `toggleQuizOptionCorrect()` | Marca opção correta | L991 |
| `setDragPrompt()` | Define prompt drag | L1026 |
| `addDragTarget()` | Adiciona zona drag | L1041 |

### **Lado Aluno (CoursePlayerPage)**

| Função | Propósito | Arquivo |
|---------|-----------|----------|
| `checkQuiz()` | Valida quiz | L2385 |
| `checkTF()` | Valida V/F | L2439 |
| `checkFill()` | Valida preenchimento | L2464 |
| `checkDrag()` | Valida drag-drop | L2414 |
| `toggleOption()` | Seleciona opção | L2351 |
| `resetExercise()` | Reinicia exercício | ~L2520 |
| `markExerciseAsComplete()` | Registra conclusão | ~L1050 |

---

## 📈 Rastreamento de Progresso

### **Dados Coletados:**

1. **exercise-completions** (Firestore)
   ```javascript
   {
     course_id: "curso-123",
     exercise_id: "ex-456",
     user_uid: "aluno-789",
     completedAt: Timestamp
   }
   ```

2. **exerciseResults** (Estado React)
   ```javascript
   {
     "ex-1": true,   // Correto
     "ex-2": false,  // Errado
     "ex-3": true
   }
   ```

3. **completedExercises** (Set<string>)
   - Rastreia quais exercícios foram completados
   - Usado para calcular progresso geral

### **Cálculo de Progresso:**
```typescript
const progressPercentage = useMemo(() => {
  const totalLessons = allLessons.length;
  const allExs = Array.isArray(course?.interactiveExercises)
    ? course.interactiveExercises
    : [];
  const totalExs = allExs.length;
  
  if (totalLessons + totalExs === 0) return 0;
  
  const lessonsCount = completedLessons.size;
  const exsCount = completedExercises.size;
  
  return Math.round(
    ((lessonsCount + exsCount) / (totalLessons + totalExs)) * 100
  );
}, [allLessons.length, completedLessons.size, ...]);
```

---

## 🔍 Análise Crítica - Pontos Fortes

✅ **Sistema bem estruturado:** Cada tipo de exercício tem sua própria função de verificação  
✅ **Múltiplos formatos:** Quiz, V/F, Fill, Drag - cobre vários estilos de aprendizado  
✅ **Flexibilidade:** Settings personalizáveis (multi-select, case-sensitive, tempo)  
✅ **Feedback imediato:** Aluno sabe instantaneamente se acertou  
✅ **Rastreamento automático:** Todos os resultados são salvos no Firebase  
✅ **Progresso dinâmico:** Acompanhamento em tempo real  
✅ **Integração com imagens:** Exercícios podem incluir imagens  

---

## ⚠️ Melhorias Potenciais

### 1. **Feedback Detalhado**
Atualmente: `"Correto"` ou `"Tente novamente"`  
**Sugestão:** Adicionar explicações por resposta
```typescript
explanation?: string;  // Feedback geral
optionFeedback?: {     // Feedback por opção?
  [optionId]: "Por que está errado..."
}
```

### 2. **Sistema de Pontos**
Existe campo `points` mas não é implementado:
```typescript
// Sugestão: registrar pontuação
await addDoc(collection(db, "exercise-completions"), {
  // ... campos atuais
  points: ex.settings?.points || 0,
  score: ok ? ex.settings?.points : 0
});
```

### 3. **Relatórios e Estatísticas**
Faltam páginas de relatórios para instruto sobre desempenho dos alunos

### 4. **Validação de Lacunas**
Fill-blank aceita qualquer string que corresponda - sem validação de formato

### 5. **Limite de Tempo**
Campo `timedSeconds` existe mas não é implementado no player

### 6. **Permissão de Retentativas**
Atualmente aluno pode tentar infinitas vezes. Sugestão: limitar retentativas
```typescript
maxAttempts?: number;  // Campo novo
attemptsLeftBeforeWrong?: number;
```

---

## 🗂️ Arquitetura de Dados (TypeScript)

```typescript
interface InteractiveExercise {
  id: string;
  type: "quiz" | "dragdrop" | "truefalse" | "fillblank" | "matching";
  title: string;
  lessonId?: string;           // ID da aula
  description?: string;
  
  // Conteúdo por tipo
  quiz?: {
    question: string;
    options: InteractiveExerciseOption[];
  };
  dragdrop?: {
    prompt: string;
    targets: InteractiveExerciseTarget[];
    items: InteractiveExerciseItem[];
  };
  truefalse?: {
    statements: TFStatement[];
  };
  fillblank?: {
    prompt: string;
    blanks: FillBlankBlank[];
  };
  
  // Configurações
  settings?: {
    multiSelect?: boolean;
    explanation?: string;
    penalty?: number;        // Dedução por erro
    timedSeconds?: number;   // Limite de tempo
    points?: number;         // Valor do exercício
    caseSensitive?: boolean; // Para fill-blank
  };
}

interface InteractiveExerciseOption {
  id: string;
  text: string;
  correct: boolean;
}

interface TFStatement {
  id: string;
  text: string;
  answer: boolean;  // V=true, F=false
}

interface FillBlankBlank {
  id: string;
  label?: string;
  answers: string[];  // Múltiplas respostas aceitas
}

interface InteractiveExerciseTarget {
  id: string;
  label: string;
}

interface InteractiveExerciseItem {
  id: string;
  text: string;
  targetId?: string;  // Alvo correto
}
```

---

## 📱 Componentes Relacionados

- **[CourseEditorPage.tsx](pages/instructor/CourseEditorPage.tsx)** - Criação/edição de exercícios
- **[CoursePlayerPage.tsx](pages/student/CoursePlayerPage.tsx)** - Resposta de exercícios
- **[InteractiveQuiz.tsx](pages/student/CoursePlayerPage.tsx#InteractiveQuiz)** - Sub-component do player
- **[types.ts](types.ts)** - Definições de tipos

---

## 🎓 Conclusão

O sistema de quizes é **funcional e bem implementado** para um MVP de plataforma educacional. Suporta múltiplos formatos de avaliação com feedback imediato. Opportunities de melhoria existem em **reportagem, validação avançada e limitações de tentativas**, mas a estrutura base é sólida para expansões futuras.

**Status:** ✅ Operacional  
**Complexidade:** ⭐⭐⭐ (Moderada)  
**Manutenibilidade:** ⭐⭐⭐⭐ (Boa)
