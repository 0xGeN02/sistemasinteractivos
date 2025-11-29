import express from "express";
import ollama from "ollama";

const router = express.Router();

// Configuración del modelo de Ollama
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

router.post("/evaluate", async (req, res) => {
  try {
    const { recitedText, expectedText } = req.body;

    if (!recitedText || !expectedText) {
      return res
        .status(400)
        .json({ error: "Missing recitedText or expectedText" });
    }

    console.log(`Using Ollama model: ${OLLAMA_MODEL}`);

    const prompt = `
Eres un profesor experto evaluando la comprensión de un estudiante.

Tu tarea es comparar la explicación del estudiante con el material de estudio original y evaluar:
1. Qué tan bien el estudiante comprende y explica los conceptos
2. Qué conceptos importantes omitió
3. Qué conceptos explicó incorrectamente o de forma imprecisa

REGLAS IMPORTANTES:
- Devuelve SOLO un objeto JSON válido, sin texto adicional
- La precisión (accuracy) debe reflejar qué tan completa y correcta fue la explicación
- Sé constructivo pero honesto en el análisis
- Si el estudiante explicó con sus propias palabras pero correctamente, eso es POSITIVO

FORMATO DE RESPUESTA (JSON):
{
  "accuracy": <número entre 0 y 100>,
  "missingParts": ["concepto 1 que faltó", "concepto 2 que faltó"],
  "incorrectParts": ["error 1 o imprecisión", "error 2"],
  "summary": "Análisis general constructivo de la explicación del estudiante"
}

MATERIAL DE ESTUDIO ORIGINAL:
${expectedText}

EXPLICACIÓN DEL ESTUDIANTE:
${recitedText}

Responde SOLO con el JSON, sin markdown, sin explicaciones adicionales:`;

    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content;
    console.log("Ollama raw response:", raw);

    let json;
    try {
      // Intentar parsear directamente
      json = JSON.parse(raw);
    } catch {
      // Si falla, intentar extraer JSON de markdown o texto envuelto
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          json = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (error) {
        console.error("Failed to parse Ollama response:", raw);
        json = {
          accuracy: 50,
          missingParts: ["No se pudo analizar la respuesta correctamente"],
          incorrectParts: [],
          summary:
            "Hubo un error al procesar la respuesta del modelo de IA. Por favor, intenta de nuevo.",
          raw,
          error: "LLM did not return valid JSON",
        };
      }
    }

    res.json(json);
  } catch (error) {
    console.error("LLM Error:", error);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

export default router;
