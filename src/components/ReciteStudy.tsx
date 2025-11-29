import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export default function ReciteStudy({ expectedAnswer }: { expectedAnswer: string }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorderRef.current = mediaRecorder;
    chunks.current = [];

    mediaRecorder.ondataavailable = (e) => chunks.current.push(e.data);

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks.current, { type: "audio/webm" });
      await sendAudioToWhisper(audioBlob);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendAudioToWhisper = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      // Enviar el material esperado para comparación inmediata
      if (expectedAnswer) {
        formData.append("expectedText", expectedAnswer);
      }

      const resp = await fetch("http://localhost:3001/whisper", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(`Error sending audio: ${resp.statusText}`);
      }

      const data = await resp.json();
      console.log("Server response:", data);
      
      setTranscript(data.transcription);
      
      // Si hay feedback, mostrarlo
      if (data.feedback) {
        setFeedback(data.feedback);
        setShowFeedbackModal(true);
      } else {
        setError("No se pudo obtener feedback del servidor");
      }

      return data.transcription;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      console.error("Error processing audio:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Recitar Temario</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Graba tu explicación del temario y recibe feedback instantáneo con IA
      </p>

      <div className="flex gap-3">
        {!recording ? (
          <Button 
            onClick={startRecording} 
            disabled={isProcessing || !expectedAnswer}
          >
            🎙️ Empezar a grabar
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopRecording}>
            ⏹️ Detener grabación
          </Button>
        )}
      </div>

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
