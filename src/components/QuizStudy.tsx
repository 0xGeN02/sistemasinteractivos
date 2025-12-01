import { useState } from "react";
import { Brain, RotateCcw, AlertCircle, CheckCircle, XCircle, Trophy, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface QuizStudyProps {
  material: string;
}

type ExamType = "test" | "redactar" | "mixto";

interface QuizQuestion {
  question: string;
  type: "test" | "redactar"; // Tipo de pregunta
  options?: string[]; // Solo para tipo test
  correctAnswer?: number; // Solo para tipo test - índice de la respuesta correcta (0-3)
  expectedAnswer?: string; // Solo para tipo redactar - respuesta esperada
  explanation: string;
}

interface QuizResult {
  question: string;
  type: "test" | "redactar";
  options?: string[];
  userAnswer: number | string; // número para test, string para redactar
  correctAnswer: number | string;
  explanation: string;
  isCorrect: boolean;
  feedback?: string; // Feedback específico para preguntas de redacción
}

export function QuizStudy({ material }: QuizStudyProps) {
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const generateQuiz = async (type: ExamType) => {
    setLoading(true);
    setError("");
    setExamType(type);
    
    // Validar que el material no sea un placeholder de PDF
    if (!material || material.includes('[File:') || material.length < 50) {
      setError("No hay suficiente material de texto para generar el quiz. Si subiste un PDF, por favor copia y pega el contenido del material primero.");
      setLoading(false);
      return;
    }

    try {
      let prompt = "";
      
      if (type === "test") {
        prompt = `Basándote en el siguiente temario, genera exactamente 10 preguntas tipo test con 4 opciones cada una.

TEMARIO:
${material}

Formatea la respuesta como un array JSON válido con objetos que tengan las siguientes propiedades:
- "question": la pregunta clara y específica
- "type": "test"
- "options": array con exactamente 4 opciones de respuesta (strings)
- "correctAnswer": índice numérico (0-3) de la opción correcta
- "explanation": explicación breve de por qué esa opción es correcta

IMPORTANTE: Las opciones deben ser plausibles pero solo una debe ser correcta. Varía el orden de las respuestas correctas.

Ejemplo de formato:
[
  {
    "question": "¿Cuál es la capital de Francia?",
    "type": "test",
    "options": ["Londres", "Berlín", "París", "Madrid"],
    "correctAnswer": 2,
    "explanation": "París es la capital de Francia desde 987 d.C."
  }
]

Solo devuelve el JSON válido, sin texto adicional.`;
      } else if (type === "redactar") {
        prompt = `Basándote en el siguiente temario, genera exactamente 10 preguntas de desarrollo/redacción que requieran respuestas elaboradas.

TEMARIO:
${material}

Formatea la respuesta como un array JSON válido con objetos que tengan las siguientes propiedades:
- "question": la pregunta que requiere una respuesta elaborada
- "type": "redactar"
- "expectedAnswer": la respuesta esperada completa y detallada
- "explanation": explicación de los puntos clave que debe incluir la respuesta

Ejemplo de formato:
[
  {
    "question": "Explica el concepto de...",
    "type": "redactar",
    "expectedAnswer": "La respuesta completa esperada...",
    "explanation": "Los puntos clave son..."
  }
]

Solo devuelve el JSON válido, sin texto adicional.`;
      } else {
        // mixto
        prompt = `Basándote en el siguiente temario, genera exactamente 10 preguntas MEZCLADAS: 5 tipo test con opciones múltiples y 5 de desarrollo/redacción.

TEMARIO:
${material}

Formatea la respuesta como un array JSON válido alternando tipos de preguntas.

Para preguntas tipo TEST:
- "question": la pregunta
- "type": "test"
- "options": array con 4 opciones
- "correctAnswer": índice (0-3) de la opción correcta
- "explanation": explicación breve

Para preguntas de REDACCIÓN:
- "question": la pregunta
- "type": "redactar"
- "expectedAnswer": respuesta esperada completa
- "explanation": puntos clave

ALTERNA los tipos de preguntas. Solo devuelve el JSON válido.`;
      }

      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          material: material,
          numQuestions: 10,
          difficulty: "medium",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error en la petición: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validar que tenemos el formato correcto
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("El formato de las preguntas no es válido");
      }

      setQuestions(data.questions);
      setQuizStarted(true);
      console.log("Preguntas generadas:", data.questions);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(`Error al generar el examen: ${errorMsg}. Asegúrate de que Ollama esté ejecutándose.`);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (currentQuestion.type === "test") {
      if (selectedOption === null) {
        setError("Por favor, selecciona una opción");
        return;
      }

      const isCorrect = selectedOption === currentQuestion.correctAnswer;

      const result: QuizResult = {
        question: currentQuestion.question,
        type: "test",
        options: currentQuestion.options,
        userAnswer: selectedOption,
        correctAnswer: currentQuestion.correctAnswer!,
        explanation: currentQuestion.explanation,
        isCorrect,
      };

      setQuizResults([...quizResults, result]);
      setAnswered(true);
      setShowExplanation(true);
      setError("");
    } else {
      // tipo redactar
      if (!textAnswer.trim()) {
        setError("Por favor, escribe una respuesta");
        return;
      }

      setLoading(true);
      try {
        // Evaluar la respuesta con IA
        const response = await fetch("/api/quiz/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: currentQuestion.question,
            expectedAnswer: currentQuestion.expectedAnswer,
            userAnswer: textAnswer,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error evaluando: ${response.statusText}`);
        }

        const evaluation = await response.json();

        const result: QuizResult = {
          question: currentQuestion.question,
          type: "redactar",
          userAnswer: textAnswer,
          correctAnswer: currentQuestion.expectedAnswer!,
          explanation: currentQuestion.explanation,
          isCorrect: evaluation.isCorrect,
          feedback: evaluation.feedback,
        };

        setQuizResults([...quizResults, result]);
        setAnswered(true);
        setShowExplanation(true);
        setError("");
      } catch (err) {
        setError("Error al evaluar la respuesta");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setTextAnswer("");
      setAnswered(false);
      setShowExplanation(false);
      setError("");
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setTextAnswer("");
    setQuizResults([]);
    setAnswered(false);
    setShowExplanation(false);
    setQuizStarted(false);
    setExamType(null);
    setError("");
  };

  const correctAnswers = quizResults.filter(r => r.isCorrect).length;
  const score = quizResults.length > 0 ? Math.round((correctAnswers / quizResults.length) * 100) : 0;

  // Pantalla inicial
  if (!quizStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <span>Examen Personalizado</span>
          </CardTitle>
          <CardDescription>
            Elige el tipo de examen que quieres realizar basado en tu material de estudio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4 rounded-lg">
            <p className="text-sm font-semibold mb-2">📝 Selecciona el tipo de examen:</p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <strong>Test:</strong> 10 preguntas con 4 opciones múltiples</li>
              <li>• <strong>Redactar:</strong> 10 preguntas de desarrollo con respuesta libre</li>
              <li>• <strong>Mixto:</strong> 5 preguntas test + 5 preguntas de redacción</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              onClick={() => generateQuiz("test")}
              disabled={loading}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300"
            >
              <CheckCircle className="h-6 w-6 text-blue-500" />
              <div className="text-center">
                <p className="font-semibold">Test</p>
                <p className="text-xs text-muted-foreground">Opción múltiple</p>
              </div>
            </Button>

            <Button 
              onClick={() => generateQuiz("redactar")}
              disabled={loading}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300"
            >
              <Send className="h-6 w-6 text-green-500" />
              <div className="text-center">
                <p className="font-semibold">Redactar</p>
                <p className="text-xs text-muted-foreground">Respuesta libre</p>
              </div>
            </Button>

            <Button 
              onClick={() => generateQuiz("mixto")}
              disabled={loading}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-300"
            >
              <Brain className="h-6 w-6 text-purple-500" />
              <div className="text-center">
                <p className="font-semibold">Mixto</p>
                <p className="text-xs text-muted-foreground">Test + Redacción</p>
              </div>
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Generando examen...
              </p>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Pantalla de resultados finales
  if (quizResults.length === questions.length) {
    const getScoreMessage = () => {
      if (score >= 90) return { emoji: "🏆", text: "¡Excelente! Dominas el tema", color: "text-yellow-600" };
      if (score >= 70) return { emoji: "🎉", text: "¡Muy bien! Buen nivel de conocimiento", color: "text-green-600" };
      if (score >= 50) return { emoji: "👍", text: "Bien, pero puedes mejorar", color: "text-blue-600" };
      return { emoji: "📚", text: "Sigue estudiando, ¡tú puedes!", color: "text-orange-600" };
    };

    const scoreMessage = getScoreMessage();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Resultados del Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Puntuación principal */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-8 rounded-lg text-center">
            <div className="text-6xl mb-4">{scoreMessage.emoji}</div>
            <p className="text-sm text-muted-foreground mb-2">Puntuación Final</p>
            <p className={`text-5xl font-bold ${scoreMessage.color} mb-2`}>{score}%</p>
            <p className="text-lg font-semibold mb-1">{scoreMessage.text}</p>
            <p className="text-sm text-muted-foreground">
              {correctAnswers} de {quizResults.length} preguntas correctas
            </p>
            
            {/* Barra de progreso visual */}
            <div className="mt-6">
              <Progress value={score} className="h-3" />
            </div>
          </div>

          {/* Resumen de respuestas */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg mb-4">📋 Repaso de Respuestas</h3>
            
            {quizResults.map((result, idx) => (
              <div 
                key={idx} 
                className={`border-2 rounded-lg p-4 space-y-3 transition-all ${
                  result.isCorrect 
                    ? 'border-green-200 bg-green-50 dark:bg-green-950' 
                    : 'border-red-200 bg-red-50 dark:bg-red-950'
                }`}
              >
                {/* Pregunta y estado */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm flex-1">
                    {idx + 1}. {result.question}
                  </p>
                  {result.isCorrect ? (
                    <Badge className="bg-green-500 flex-shrink-0">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Correcto
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex-shrink-0">
                      <XCircle className="h-3 w-3 mr-1" />
                      Incorrecto
                    </Badge>
                  )}
                </div>

                {/* Contenido según tipo */}
                {result.type === "test" && result.options ? (
                  <div className="space-y-2 pl-4">
                    {result.options.map((option, optIdx) => {
                      const isUserAnswer = optIdx === result.userAnswer;
                      const isCorrectAnswer = optIdx === result.correctAnswer;
                      
                      let optionClass = "text-sm p-2 rounded ";
                      if (isCorrectAnswer) {
                        optionClass += "bg-green-100 dark:bg-green-900 font-semibold";
                      } else if (isUserAnswer && !result.isCorrect) {
                        optionClass += "bg-red-100 dark:bg-red-900 line-through";
                      } else {
                        optionClass += "text-muted-foreground";
                      }
                      
                      return (
                        <div key={optIdx} className={optionClass}>
                          {isCorrectAnswer && "✓ "}
                          {isUserAnswer && !isCorrectAnswer && "✗ "}
                          {String.fromCharCode(65 + optIdx)}. {option}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 pl-4">
                    <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded text-sm">
                      <p className="font-semibold mb-1">Tu respuesta:</p>
                      <p>{result.userAnswer}</p>
                    </div>
                    {!result.isCorrect && (
                      <div className="bg-green-50 dark:bg-green-900 p-3 rounded text-sm">
                        <p className="font-semibold mb-1">Respuesta esperada:</p>
                        <p>{result.correctAnswer}</p>
                      </div>
                    )}
                    {result.feedback && (
                      <div className="bg-purple-50 dark:bg-purple-900 p-3 rounded text-sm">
                        <p className="font-semibold mb-1">Feedback:</p>
                        <p>{result.feedback}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Explicación */}
                <div className="pl-4 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Explicación:</strong> {result.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Botón para reintentar */}
          <Button 
            onClick={resetQuiz}
            className="w-full"
            size="lg"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Intentar Nuevo Test
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pantalla de pregunta actual
  if (currentQuestionIndex < questions.length) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                Pregunta {currentQuestionIndex + 1} de {questions.length}
              </CardTitle>
              <Badge variant="secondary">{Math.round(progress)}%</Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pregunta */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 p-6 rounded-lg">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-lg font-semibold leading-relaxed flex-1">{currentQuestion.question}</p>
              <Badge variant={currentQuestion.type === "test" ? "default" : "secondary"}>
                {currentQuestion.type === "test" ? "Test" : "Redactar"}
              </Badge>
            </div>
          </div>

          {/* Contenido según tipo de pregunta */}
          {currentQuestion.type === "test" && currentQuestion.options ? (
            <RadioGroup 
              value={selectedOption?.toString()} 
              onValueChange={(value: string) => setSelectedOption(parseInt(value))}
              disabled={answered}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctAnswer;
                const showResult = answered;
                
                let cardClass = "relative flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ";
                
                if (showResult) {
                  if (isCorrect) {
                    cardClass += "border-green-500 bg-green-50 dark:bg-green-950";
                  } else if (isSelected) {
                    cardClass += "border-red-500 bg-red-50 dark:bg-red-950";
                  } else {
                    cardClass += "border-gray-200 opacity-50";
                  }
                } else {
                  cardClass += isSelected 
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950" 
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50";
                }
                
                return (
                  <div key={idx} className={cardClass}>
                    <RadioGroupItem 
                      value={idx.toString()} 
                      id={`option-${idx}`}
                      className="mt-1"
                      disabled={answered}
                    />
                    <Label 
                      htmlFor={`option-${idx}`} 
                      className="flex-1 cursor-pointer text-sm leading-relaxed"
                    >
                      <span className="font-semibold mr-2">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {option}
                    </Label>
                    
                    {/* Indicadores visuales en respuesta */}
                    {showResult && isCorrect && (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Escribe tu respuesta aquí... Explica de forma detallada y clara."
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                className="min-h-40 resize-y"
                disabled={answered || loading}
              />
              {!answered && (
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Incluye conceptos clave, definiciones y ejemplos para obtener una mejor puntuación
                </p>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Explicación después de responder */}
          {showExplanation && (
            <div className={`p-4 rounded-lg border-2 ${
              quizResults[quizResults.length - 1]?.isCorrect
                ? 'bg-green-50 dark:bg-green-950 border-green-200'
                : 'bg-blue-50 dark:bg-blue-950 border-blue-200'
            }`}>
              <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                💡 Explicación
              </p>
              <p className="text-sm">{currentQuestion.explanation}</p>
              
              {/* Mostrar feedback específico para preguntas de redacción */}
              {currentQuestion.type === "redactar" && quizResults[quizResults.length - 1]?.feedback && (
                <div className="mt-3 pt-3 border-t">
                  <p className="font-semibold text-sm mb-1">📝 Feedback de tu respuesta:</p>
                  <p className="text-sm">{quizResults[quizResults.length - 1].feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          {!answered ? (
            <Button 
              onClick={handleSubmitAnswer}
              disabled={
                loading ||
                (currentQuestion.type === "test" && selectedOption === null) ||
                (currentQuestion.type === "redactar" && !textAnswer.trim())
              }
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Evaluando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirmar Respuesta
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={goToNextQuestion}
              className="w-full"
              size="lg"
            >
              {currentQuestionIndex === questions.length - 1 ? (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Ver Resultados
                </>
              ) : (
                "Siguiente Pregunta →"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
