import express from "express";
import ollama from "ollama";

const router = express.Router();

router.post("/evaluate", async (req, res) => {
  try {
    const { recitedText, expectedText } = req.body;

    if (!recitedText || !expectedText) {
      return res
        .status(400)
        .json({ error: "Missing recitedText or expectedText" });
    }

    const prompt = `
Eres un profesor experto en comprensión y memorización. 

Compara el texto recitado por el estudiante con el texto original del temario.

Devuelve SOLO un JSON con la siguiente estructura (MUY IMPORTANTE):

{
  "accuracy": number (0-100),
  "missingParts": string[], 
  "incorrectParts": string[],
  "summary": string
}

TEMARIO ORIGINAL:
${expectedText}

RECITACIÓN DEL ESTUDIANTE:
${recitedText}
    `;

    const response = await ollama.chat({
      model: "llama3.1",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content;

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      json = { raw, error: "LLM did not return valid JSON" };
    }

    res.json(json);
  } catch (error) {
    console.error("LLM Error:", error);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

export default router;
