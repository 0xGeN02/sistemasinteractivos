import { useState } from "react";
import { Mic, Send, RotateCcw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";

interface ReciteStudyProps {
  material: string;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export function ReciteStudy({ material }: ReciteStudyProps) {
  const [recitation, setRecitation] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const evaluateRecitation = async () => {
    if (!recitation.trim()) {
      setError("Por favor, escribe tu respuesta antes de evaluar");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama2",
          prompt: `Eres un evaluador académico. Evalúa la siguiente recitación del estudiante comparándola con el temario proporcionado.

TEMARIO:
${material}

RECITACIÓN DEL ESTUDIANTE:
${recitation}

Por favor proporciona:
1. Una puntuación de 0 a 100
2. Feedback general
3. Fortalezas (lista 3 puntos clave que hizo bien)
4. Áreas de mejora (lista 3 puntos a mejorar)

Formatea la respuesta como JSON válido con las claves: "score", "feedback", "strengths" (array), "improvements" (array)`,
          stream: false,
        }),
      });

      const data = await response.json();
      const result = JSON.parse(data.response);
      setEvaluation(result);
    } catch (err) {
      setError("Error al conectar con el modelo local. Asegúrate de que Ollama esté ejecutándose.");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRecitation("");
    setEvaluation(null);
    setError("");
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="h-5 w-5" />
          <span>Recita el Temario</span>
        </CardTitle>
        <CardDescription>
          Escribe o narra lo que recuerdes del temario para ser evaluado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!evaluation ? (
          <div className="space-y-4">
            <Textarea
              placeholder="Recita aquí lo que recuerdas del temario..."
              value={recitation}
              onChange={(e) => setRecitation(e.target.value)}
              className="min-h-48"
              disabled={loading}
            />
            <Button 
              onClick={evaluateRecitation}
              disabled={loading || !recitation.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Evaluando..." : "Evaluar Recitación"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Tu Puntuación</p>
              <p className="text-4xl font-bold text-primary">{evaluation.score}/100</p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Retroalimentación General</p>
              <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Fortalezas</p>
              <ul className="space-y-1">
                {evaluation.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm flex items-start space-x-2">
                    <Badge variant="secondary" className="mt-0.5">✓</Badge>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Áreas de Mejora</p>
              <ul className="space-y-1">
                {evaluation.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-sm flex items-start space-x-2">
                    <Badge variant="destructive" className="mt-0.5">!</Badge>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={handleReset}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Intentar de Nuevo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
