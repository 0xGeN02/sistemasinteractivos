import express from "express";
import ollama from "ollama";

const router = express.Router();

// Configuración del modelo de Ollama
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

router.post("/generate", async (req, res) => {
  try {
    const { material, numQuestions, difficulty } = req.body;

    if (!material) {
      return res.status(400).json({ error: "Missing material" });
    }

    console.log(
      `Generating ${numQuestions} quiz questions with difficulty: ${difficulty}`
    );
    console.log(`Using Ollama model: ${OLLAMA_MODEL}`);

    const prompt = `Eres un profesor creando un examen de opción múltiple.

Material de estudio:
${material}

Genera EXACTAMENTE ${numQuestions} preguntas de opción múltiple basadas en este material.

Nivel de dificultad: ${difficulty}
${
  difficulty === "easy"
    ? "- Preguntas directas sobre conceptos principales"
    : ""
}
${
  difficulty === "medium"
    ? "- Preguntas que requieren comprensión de conceptos"
    : ""
}
${
  difficulty === "hard"
    ? "- Preguntas que requieren análisis profundo y aplicación de conceptos"
    : ""
}

FORMATO DE RESPUESTA (JSON):
[
  {
    "question": "Texto de la pregunta",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correctAnswer": 0,
    "explanation": "Explicación de por qué esta es la respuesta correcta"
  }
]

REGLAS:
- Devuelve SOLO el array JSON, sin texto adicional
- Cada pregunta debe tener exactamente 4 opciones
- correctAnswer debe ser el índice (0-3) de la opción correcta
- Las preguntas deben cubrir diferentes aspectos del material
- Alterna los tipos de preguntas (definiciones, aplicaciones, comparaciones)
- La explicación debe ser educativa y clara

Responde SOLO con el JSON:`;

    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content;
    console.log("Ollama raw response:", raw);

    let questions;
    try {
      // Intentar parsear directamente
      questions = JSON.parse(raw);
    } catch {
      // Si falla, intentar extraer JSON de markdown o texto envuelto
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON array found in response");
        }
      } catch (error) {
        console.error("Failed to parse Ollama response:", raw);
        return res.status(500).json({
          error: "Failed to generate valid quiz questions",
          raw,
        });
      }
    }

    // Validar formato
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({
        error: "Invalid quiz format - expected non-empty array",
        questions,
      });
    }

    // Validar cada pregunta
    for (const q of questions) {
      if (
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.correctAnswer !== "number" ||
        q.correctAnswer < 0 ||
        q.correctAnswer > 3
      ) {
        return res.status(500).json({
          error: "Invalid question format",
          question: q,
        });
      }
    }

    res.json({ questions });
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

// Endpoint para evaluar respuestas de redacción
router.post("/evaluate", async (req, res) => {
  try {
    const { question, expectedAnswer, userAnswer } = req.body;

    if (!question || !expectedAnswer || !userAnswer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(
      `Evaluating essay answer for question: ${question.substring(0, 50)}...`
    );
    console.log(`Using Ollama model: ${OLLAMA_MODEL}`);

    const prompt = `Eres un evaluador académico. Evalúa la respuesta del estudiante.

PREGUNTA:
${question}

RESPUESTA ESPERADA:
${expectedAnswer}

RESPUESTA DEL ESTUDIANTE:
${userAnswer}

Evalúa si la respuesta es correcta considerando:
1. Incluye los conceptos clave
2. Es precisa y relevante
3. Demuestra comprensión del tema

FORMATO DE RESPUESTA (JSON):
{
  "isCorrect": true o false (true si es al menos 70% correcta),
  "feedback": "comentario específico sobre la respuesta (qué está bien, qué falta)"
}

REGLAS:
- Devuelve SOLO el objeto JSON, sin texto adicional
- Sé constructivo en el feedback
- isCorrect debe ser booleano

Responde SOLO con el JSON:`;

    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content;
    console.log("Ollama evaluation response:", raw);

    let evaluation;
    try {
      // Intentar parsear directamente
      evaluation = JSON.parse(raw);
    } catch {
      // Si falla, intentar extraer JSON
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (error) {
        console.error("Failed to parse evaluation response:", raw);
        return res.status(500).json({
          error: "Failed to evaluate answer",
          raw,
        });
      }
    }

    // Validar formato
    if (typeof evaluation.isCorrect !== "boolean" || !evaluation.feedback) {
      return res.status(500).json({
        error: "Invalid evaluation format",
        evaluation,
      });
    }

    res.json(evaluation);
  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});

export default router;
