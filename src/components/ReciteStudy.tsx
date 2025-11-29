import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

// Declarar tipo para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ReciteStudy({ expectedAnswer }: { expectedAnswer: string }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'es-ES' | 'en-US' | 'mixed'>('mixed');

  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      // Verificar si el navegador soporta Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configuración del idioma
      const lang = language === 'mixed' ? 'es-ES' : language;
      recognition.lang = lang;
      recognition.continuous = true; // Escuchar continuamente
      recognition.interimResults = true; // Resultados parciales en tiempo real
      recognition.maxAlternatives = 3; // Obtener alternativas para mejorar términos técnicos
      
      console.log(`Reconocimiento iniciado en idioma: ${lang}${language === 'mixed' ? ' (modo mixto)' : ''}`);

      let finalTranscript = '';

      recognition.onstart = () => {
        setRecording(true);
        setError(null);
        setTranscript('');
        console.log('Reconocimiento de voz iniciado');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }
        
        // Mostrar transcripción en tiempo real
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        setError(`Error: ${event.error}`);
        setRecording(false);
      };

      recognition.onend = async () => {
        setRecording(false);
        console.log('Reconocimiento de voz finalizado');
        
        // Si hay transcripción, enviar a evaluar
        if (finalTranscript.trim()) {
          await evaluateWithOllama(finalTranscript.trim());
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Error iniciando reconocimiento:', err);
      setError('Error al iniciar el reconocimiento de voz');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const evaluateWithOllama = async (text: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const resp = await fetch("http://localhost:3001/api/recite/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recitedText: text,
          expectedText: expectedAnswer,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Error evaluando: ${resp.statusText}`);
      }

      const data = await resp.json();
      console.log("Feedback de Ollama:", data);
      
      setFeedback(data);
      setShowFeedbackModal(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      console.error("Error evaluando con Ollama:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Recitar Temario</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Habla y explica el temario - la IA transcribirá y evaluará tu explicación en tiempo real
      </p>

      {/* Selector de idioma */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium">Idioma de reconocimiento:</label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={language === 'mixed' ? 'default' : 'outline'}
            onClick={() => setLanguage('mixed')}
            disabled={recording}
          >
            🌍 Mixto (ES+EN)
          </Button>
          <Button
            size="sm"
            variant={language === 'es-ES' ? 'default' : 'outline'}
            onClick={() => setLanguage('es-ES')}
            disabled={recording}
          >
            🇪🇸 Español
          </Button>
          <Button
            size="sm"
            variant={language === 'en-US' ? 'default' : 'outline'}
            onClick={() => setLanguage('en-US')}
            disabled={recording}
          >
            🇬🇧 English
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        {!recording ? (
          <Button 
            onClick={startRecording} 
            disabled={isProcessing || !expectedAnswer}
          >
            🎙️ Empezar a hablar
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopRecording}>
            ⏹️ Detener y evaluar
          </Button>
        )}
      </div>

      {recording && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg animate-pulse">
          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Escuchando... habla ahora
          </p>
        </div>
      )}

      {!expectedAnswer && (
        <p className="mt-4 text-sm text-yellow-600 dark:text-yellow-500">
          ⚠️ Necesitas agregar material de estudio primero
        </p>
      )}

      {isProcessing && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🤖 Procesando audio y analizando con IA...
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            ❌ Error: {error}
          </p>
        </div>
      )}

      {transcript && !isProcessing && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-semibold mb-2">📝 Transcripción:</p>
          <p className="text-sm opacity-70">{transcript}</p>
        </div>
      )}

      {/* MODAL FEEDBACK */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">📊 Resultado de tu recitación</DialogTitle>
          </DialogHeader>

          {feedback ? (
            <div className="space-y-6">
              {/* Precisión */}
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Precisión General</p>
                <p className="text-5xl font-bold">
                  {feedback.accuracy || 0}%
                </p>
                <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                    style={{ width: `${feedback.accuracy || 0}%` }}
                  />
                </div>
              </div>

              {/* Resumen */}
              {feedback.summary && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    💬 Análisis General
                  </p>
                  <p className="text-sm">{feedback.summary}</p>
                </div>
              )}

              {/* Partes faltantes */}
              {feedback.missingParts && feedback.missingParts.length > 0 && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <p className="font-semibold mb-2 flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    ⚠️ Conceptos que faltaron ({feedback.missingParts.length})
                  </p>
                  <ul className="space-y-1">
                    {feedback.missingParts.map((p: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-orange-500">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Partes incorrectas */}
              {feedback.incorrectParts && feedback.incorrectParts.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="font-semibold mb-2 flex items-center gap-2 text-red-700 dark:text-red-300">
                    ❌ Conceptos incorrectos o imprecisos ({feedback.incorrectParts.length})
                  </p>
                  <ul className="space-y-1">
                    {feedback.incorrectParts.map((p: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mensaje de éxito */}
              {feedback.accuracy >= 80 && (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <p className="text-2xl mb-2">🎉</p>
                  <p className="font-semibold text-green-700 dark:text-green-300">
                    ¡Excelente trabajo!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Tienes un muy buen dominio del temario
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Cargando análisis...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
