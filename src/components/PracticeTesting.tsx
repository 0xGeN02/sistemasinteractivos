import { useState } from "react";
import { Brain, RotateCcw, Send, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

interface PracticeTestingProps {
  material: string;
}

interface Question {
  question: string;
  correctAnswer: string;
  explanation: string;
}

interface TestResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  feedback: string;
  isCorrect: boolean;
}

export function PracticeTesting({ material }: PracticeTestingProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testStarted, setTestStarted] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<TestResult | null>(null);

  const generateQuestions = async () => {
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
          prompt: `Basándote en el siguiente temario, genera exactamente 5 preguntas de práctica con sus respuestas correctas y explicaciones.

TEMARIO:
${material}

Formatea la respuesta como un array JSON válido con objetos que tengan las siguientes propiedades:
- "question": la pregunta
- "correctAnswer": la respuesta correcta esperada
- "explanation": explicación de por qué esa es la respuesta correcta

Ejemplo de formato:
[
  {
    "question": "¿Cuál es..?",
    "correctAnswer": "La respuesta es...",
    "explanation": "Porque..."
  }
]

Solo devuelve el JSON válido, sin texto adicional.`,
          stream: false,
        }),
      });

      const data = await response.json();
      const parsedQuestions = JSON.parse(data.response);
      setQuestions(parsedQuestions);
      setTestStarted(true);
    } catch (err) {
      setError("Error al generar preguntas. Asegúrate de que Ollama esté ejecutándose.");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!userAnswer.trim()) {
      setError("Por favor, escribe una respuesta");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const currentQuestion = questions[currentQuestionIndex];
      
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama2",
          prompt: `Eres un evaluador académico. Evalúa la respuesta del estudiante.

PREGUNTA:
${currentQuestion.question}

RESPUESTA CORRECTA ESPERADA:
${currentQuestion.correctAnswer}

RESPUESTA DEL ESTUDIANTE:
${userAnswer}

Determina si la respuesta es correcta o no, considerando que puede haber variaciones de redacción. Proporciona:
1. Un valor booleano "isCorrect" (true/false)
2. Feedback específico sobre la respuesta

Formatea como JSON con las claves: "isCorrect", "feedback"`,
          stream: false,
        }),
      });

      const data = await response.json();
      const evaluation = JSON.parse(data.response);

      const result: TestResult = {
        question: currentQuestion.question,
        userAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        feedback: evaluation.feedback,
        isCorrect: evaluation.isCorrect,
      };

      setCurrentFeedback(result);
      setTestResults([...testResults, result]);
      setAnswered(true);
    } catch (err) {
      setError("Error al evaluar la respuesta.");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer("");
      setAnswered(false);
      setCurrentFeedback(null);
    }
  };

  const resetTest = () => {
    setCurrentQuestionIndex(0);
    setUserAnswer("");
    setTestResults([]);
    setCurrentFeedback(null);
    setAnswered(false);
    setTestStarted(false);
  };

  const correctAnswers = testResults.filter(r => r.isCorrect).length;
  const score = testResults.length > 0 ? Math.round((correctAnswers / testResults.length) * 100) : 0;

  if (!testStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Prueba de Práctica</span>
          </CardTitle>
          <CardDescription>
            Genera preguntas basadas en tu temario y practica respondiendo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={generateQuestions}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Generando preguntas..." : "Iniciar Prueba"}
          </Button>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  if (testResults.length === questions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultados de la Prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Puntuación Final</p>
            <p className="text-4xl font-bold text-primary mb-2">{score}%</p>
            <p className="text-sm">
              {correctAnswers} de {testResults.length} preguntas correctas
            </p>
          </div>

          <div className="space-y-4">
            {testResults.map((result, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-sm">{result.question}</p>
                  {result.isCorrect ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Correcto
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Incorrecto
                    </Badge>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    <strong>Tu respuesta:</strong> {result.userAnswer}
                  </p>
                  {!result.isCorrect && (
                    <p className="text-muted-foreground">
                      <strong>Respuesta correcta:</strong> {result.correctAnswer}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <strong>Feedback:</strong> {result.feedback}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={resetTest}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Intentar de Nuevo
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (currentQuestionIndex < questions.length) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Pregunta {currentQuestionIndex + 1} de {questions.length}</CardTitle>
              <Badge>{Math.round(progress)}%</Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-6 rounded-lg">
            <p className="text-lg font-semibold">{currentQuestion.question}</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!answered ? (
            <div className="space-y-4">
              <Textarea
                placeholder="Escribe tu respuesta aquí..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="min-h-32"
                disabled={loading}
              />
              <Button 
                onClick={evaluateAnswer}
                disabled={loading || !userAnswer.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Evaluando..." : "Enviar Respuesta"}
              </Button>
            </div>
          ) : currentFeedback && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${currentFeedback.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-start space-x-2 mb-2">
                  {currentFeedback.isCorrect ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <p className="font-semibold text-green-900">¡Correcto!</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <p className="font-semibold text-red-900">Incorrecto</p>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{currentFeedback.feedback}</p>
              </div>

              {!currentFeedback.isCorrect && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Respuesta correcta:</p>
                  <p className="text-sm text-muted-foreground">{currentFeedback.correctAnswer}</p>
                </div>
              )}

              <Button 
                onClick={goToNextQuestion}
                className="w-full"
              >
                {currentQuestionIndex === questions.length - 1 ? "Ver Resultados" : "Siguiente Pregunta"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
