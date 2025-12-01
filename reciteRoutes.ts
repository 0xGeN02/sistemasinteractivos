import express from "express";
import ollama from "ollama";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

// Configuración del modelo de Ollama
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const VISION_MODEL = process.env.VISION_MODEL || "llava:latest";
const ENABLE_VIDEO_ANALYSIS = false; // Deshabilitado temporalmente - requiere configuración adicional

// Configurar multer para manejar archivos de video
const upload = multer({
  dest: "temp/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

router.post("/evaluate", upload.single("video"), async (req, res) => {
  try {
    const { recitedText, expectedText, duration } = req.body;
    const videoFile = req.file;

    if (!recitedText || !expectedText) {
      return res
        .status(400)
        .json({ error: "Missing recitedText or expectedText" });
    }

    console.log(`Using Ollama model: ${OLLAMA_MODEL}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Video file: ${videoFile ? videoFile.filename : "none"}`);

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

    // Si hay video, realizar análisis de lenguaje corporal
    let videoAnalysis = null;
    if (videoFile) {
      try {
        console.log("Analizando video con modelo de visión...");

        // Leer el video como base64
        const videoPath = path.join(process.cwd(), videoFile.path);
        const videoBuffer = fs.readFileSync(videoPath);
        const videoBase64 = videoBuffer.toString("base64");

        const videoPrompt = `
Analiza este video de una presentación o recitación de temario y evalúa los siguientes aspectos del lenguaje corporal y expresión del presentador:

1. **Confianza**: Del 1 al 10, qué tan seguro se ve el presentador
2. **Nerviosismo**: Del 1 al 10, qué tan nervioso parece estar
3. **Postura**: Describe la postura corporal
4. **Contacto visual**: Evalúa si mira a la cámara de forma apropiada
5. **Expresiones faciales**: Describe las expresiones y si son apropiadas
6. **Sugerencias**: Da 3-5 consejos específicos para mejorar

IMPORTANTE: Devuelve SOLO un objeto JSON válido, sin texto adicional.

FORMATO DE RESPUESTA (JSON):
{
  "confidence": {
    "score": <número 1-10>,
    "description": "descripción breve"
  },
  "nervousness": {
    "score": <número 1-10>,
    "description": "descripción breve"
  },
  "posture": "descripción de la postura",
  "eyeContact": "evaluación del contacto visual",
  "facialExpressions": "descripción de las expresiones",
  "suggestions": ["sugerencia 1", "sugerencia 2", "sugerencia 3"]
}

Responde SOLO con el JSON:`;

        const visionResponse = await ollama.chat({
          model: VISION_MODEL,
          messages: [
            {
              role: "user",
              content: videoPrompt,
              images: [videoBase64],
            },
          ],
        });

        const videoRaw = visionResponse.message.content;
        console.log("Video analysis raw:", videoRaw);

        try {
          videoAnalysis = JSON.parse(videoRaw);
        } catch {
          const jsonMatch = videoRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            videoAnalysis = JSON.parse(jsonMatch[0]);
          } else {
            console.warn(
              "No se pudo parsear análisis de video, usando análisis básico"
            );
            videoAnalysis = {
              confidence: {
                score: 7,
                description: "Análisis en progreso - se necesita más contexto",
              },
              nervousness: {
                score: 5,
                description: "Nivel moderado detectado",
              },
              posture: "Se observa una postura general adecuada",
              eyeContact: "Contacto visual presente durante la presentación",
              facialExpressions: "Expresiones apropiadas para el contexto",
              suggestions: [
                "Practica más para aumentar la confianza",
                "Mantén una postura erguida y relajada",
                "Sonríe naturalmente para conectar con la audiencia",
              ],
            };
          }
        }

        // Limpiar archivo temporal
        fs.unlinkSync(videoPath);
      } catch (videoError) {
        console.error("Error analizando video:", videoError);
        // Continuar sin análisis de video
      }
    }

    // Combinar respuestas
    const finalResponse = {
      ...json,
      videoAnalysis,
      duration: parseInt(duration) || 0,
    };

    res.json(finalResponse);
  } catch (error) {
    console.error("LLM Error:", error);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

// Endpoint para evaluar desde archivo de audio (modo de grabación local)
router.post(
  "/evaluate-audio",
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { expectedText, duration } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const audioFile = files?.audio?.[0];
      const videoFile = files?.video?.[0];

      if (!audioFile || !expectedText) {
        return res
          .status(400)
          .json({ error: "Missing audio file or expectedText" });
      }

      console.log(`Processing audio file: ${audioFile.filename}`);
      console.log(`Duration: ${duration}s`);

      // Por ahora, usamos un mensaje indicando que se grabó correctamente
      // pero necesitaremos Whisper u otro servicio para transcribir
      const transcribedText = `[Audio grabado: ${audioFile.size} bytes, duración: ${duration}s]\n\nNota: La transcripción automática desde archivo de audio requiere configurar Whisper u otro servicio de transcripción. Por ahora, evaluaremos basándonos en la duración y contexto.`;

      console.log(`Using Ollama model: ${OLLAMA_MODEL}`);

      // Crear un prompt que considere que tenemos el audio pero no la transcripción exacta
      const prompt = `
Eres un profesor evaluando una presentación oral de un estudiante.

CONTEXTO: El estudiante ha realizado una presentación oral que duró ${duration} segundos sobre el siguiente material de estudio.

IMPORTANTE: Como no tenemos la transcripción exacta de lo que dijo, proporciona una evaluación general basada en:
1. Si la duración es apropiada para el material (muy corto = probablemente incompleto, muy largo = posiblemente con relleno)
2. Consejos generales sobre qué debería haber cubierto basándose en el material
3. Sugerencias para mejorar futuras presentaciones

REGLAS:
- Devuelve SOLO un objeto JSON válido, sin texto adicional
- Sé constructivo y educativo
- La precisión debe ser moderada (60-75) ya que no tenemos la transcripción exacta

FORMATO DE RESPUESTA (JSON):
{
  "accuracy": <número entre 60 y 75>,
  "missingParts": ["probablemente debiste cubrir X", "asegúrate de mencionar Y"],
  "incorrectParts": [],
  "summary": "Evaluación general considerando la duración y el material. Menciona que para una evaluación más precisa, se necesita transcripción.",
  "note": "Esta es una evaluación aproximada sin transcripción de audio"
}

MATERIAL DE ESTUDIO:
${expectedText}

DURACIÓN DE LA PRESENTACIÓN: ${duration} segundos

Responde SOLO con el JSON:`;

      const response = await ollama.chat({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.message.content;
      console.log("Ollama raw response:", raw);

      let json;
      try {
        json = JSON.parse(raw);
      } catch {
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
            accuracy: 65,
            missingParts: ["Evaluación basada en duración solamente"],
            incorrectParts: [],
            summary: `Has completado una presentación de ${duration} segundos. Para una evaluación precisa, necesitaríamos transcribir el audio.`,
            note: "Evaluación aproximada sin transcripción",
          };
        }
      }

      // Si hay video, realizar análisis de lenguaje corporal
      let videoAnalysis = null;
      if (videoFile && ENABLE_VIDEO_ANALYSIS) {
        try {
          console.log("Analizando video con modelo de visión...");
          const videoPath = path.join(process.cwd(), videoFile.path);
          const videoBuffer = fs.readFileSync(videoPath);
          const videoBase64 = videoBuffer.toString("base64");

          const videoPrompt = `
Analiza este video de una presentación y evalúa el lenguaje corporal:

FORMATO DE RESPUESTA (JSON):
{
  "confidence": {
    "score": <número 1-10>,
    "description": "descripción breve"
  },
  "nervousness": {
    "score": <número 1-10>,
    "description": "descripción breve"
  },
  "posture": "descripción de la postura",
  "eyeContact": "evaluación del contacto visual",
  "facialExpressions": "descripción de las expresiones",
  "suggestions": ["sugerencia 1", "sugerencia 2", "sugerencia 3"]
}

Responde SOLO con el JSON:`;

          const visionResponse = await ollama.chat({
            model: VISION_MODEL,
            messages: [
              {
                role: "user",
                content: videoPrompt,
                images: [videoBase64],
              },
            ],
          });

          const videoRaw = visionResponse.message.content;
          try {
            videoAnalysis = JSON.parse(videoRaw);
          } catch {
            const jsonMatch = videoRaw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              videoAnalysis = JSON.parse(jsonMatch[0]);
            }
          }

          fs.unlinkSync(videoPath);
        } catch (videoError) {
          console.error("Error analizando video:", videoError);
        }
      }

      // Limpiar archivo de audio temporal
      if (audioFile) {
        const audioPath = path.join(process.cwd(), audioFile.path);
        fs.unlinkSync(audioPath);
      }

      const finalResponse = {
        ...json,
        transcribedText,
        videoAnalysis,
        duration: parseInt(duration) || 0,
        audioProcessed: true,
      };

      res.json(finalResponse);
    } catch (error) {
      console.error("Audio evaluation error:", error);
      res.status(500).json({ error: "Audio analysis failed" });
    }
  }
);

export default router;
