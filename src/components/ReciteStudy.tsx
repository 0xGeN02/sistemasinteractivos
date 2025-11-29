import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card } from "./ui/card";
import { Camera, CameraOff, Video } from "lucide-react";

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
  
  // Estados para cronómetro
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para cámara y análisis de video
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const recognitionRef = useRef<any>(null);

  // Limpiar stream al desmontar componente
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [stream]);

  // Formatear tiempo para el cronómetro
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Iniciar cronómetro
  const startTimer = () => {
    setElapsedTime(0);
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  // Detener cronómetro
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Iniciar/detener cámara
  const toggleCamera = async () => {
    if (cameraEnabled) {
      // Detener cámara
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setCameraEnabled(false);
    } else {
      // Iniciar cámara
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          }, 
          audio: false 
        });
        setStream(mediaStream);
        setCameraEnabled(true);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        setError("No se pudo acceder a la cámara. Verifica los permisos.");
      }
    }
  };

  // Iniciar grabación de video
  const startVideoRecording = () => {
    if (!stream) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Capturar cada segundo
    mediaRecorderRef.current = mediaRecorder;
  };

  // Detener grabación de video y analizar
  const stopVideoRecording = async () => {
    return new Promise<Blob | null>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  };

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
        startTimer(); // Iniciar cronómetro
        
        // Iniciar grabación de video si la cámara está habilitada
        if (cameraEnabled && stream) {
          startVideoRecording();
        }
        
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
        stopTimer(); // Detener cronómetro
        console.log('Reconocimiento de voz finalizado');
        
        // Detener y obtener grabación de video si está habilitada
        let videoBlob: Blob | null = null;
        if (cameraEnabled && mediaRecorderRef.current) {
          videoBlob = await stopVideoRecording();
        }
        
        // Si hay transcripción, enviar a evaluar
        if (finalTranscript.trim()) {
          await evaluateWithOllama(finalTranscript.trim(), elapsedTime, videoBlob);
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

  const evaluateWithOllama = async (text: string, duration: number, videoBlob: Blob | null = null) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("recitedText", text);
      formData.append("expectedText", expectedAnswer);
      formData.append("duration", duration.toString());
      
      // Si hay video, añadirlo al FormData
      if (videoBlob) {
        formData.append("video", videoBlob, "presentation.webm");
      }

      const resp = await fetch("http://localhost:3001/api/recite/evaluate", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(`Error evaluando: ${resp.statusText}`);
      }

      const data = await resp.json();
      console.log("Feedback de Ollama:", data);
      
      // Añadir duración al feedback
      setFeedback({ ...data, duration });
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

      {/* Control de cámara */}
      <div className="mb-4">
        <Button
          size="sm"
          variant={cameraEnabled ? 'default' : 'outline'}
          onClick={toggleCamera}
          disabled={recording}
          className="gap-2"
        >
          {cameraEnabled ? (
            <>
              <Camera className="h-4 w-4" />
              Cámara Activada
            </>
          ) : (
            <>
              <CameraOff className="h-4 w-4" />
              Activar Cámara para Análisis
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          {cameraEnabled 
            ? "La cámara analizará tu lenguaje corporal y expresiones durante la presentación" 
            : "Activa la cámara para recibir feedback sobre tu postura, confianza y nerviosismo"
          }
        </p>
      </div>

      {/* Vista previa de la cámara */}
      {cameraEnabled && (
        <Card className="mb-4 p-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-md rounded-lg"
            />
            {recording && (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                <Video className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">REC</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Cronómetro */}
      {recording && (
        <Card className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Tiempo transcurrido</p>
            <p className="text-4xl font-bold font-mono">
              {formatTime(elapsedTime)}
            </p>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        {!recording ? (
          <Button 
            onClick={startRecording} 
            disabled={isProcessing || !expectedAnswer}
            className="gap-2"
          >
            🎙️ Empezar a hablar
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopRecording} className="gap-2">
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
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Duración */}
                <div className="text-center p-6 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Duración Total</p>
                  <p className="text-5xl font-bold font-mono">
                    {formatTime(feedback.duration || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {feedback.duration < 120 ? "Presentación corta" : 
                     feedback.duration < 300 ? "Duración óptima" : 
                     "Presentación extensa"}
                  </p>
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

              {/* Análisis de video (lenguaje corporal) */}
              {feedback.videoAnalysis && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="font-semibold mb-3 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    📹 Análisis de Lenguaje Corporal y Expresión
                  </p>
                  
                  {/* Confianza */}
                  {feedback.videoAnalysis.confidence && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Nivel de Confianza</span>
                        <span className="text-sm font-bold">{feedback.videoAnalysis.confidence.score}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${(feedback.videoAnalysis.confidence.score / 10) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feedback.videoAnalysis.confidence.description}
                      </p>
                    </div>
                  )}

                  {/* Nerviosismo */}
                  {feedback.videoAnalysis.nervousness && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Nivel de Nerviosismo</span>
                        <span className="text-sm font-bold">{feedback.videoAnalysis.nervousness.score}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${(feedback.videoAnalysis.nervousness.score / 10) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feedback.videoAnalysis.nervousness.description}
                      </p>
                    </div>
                  )}

                  {/* Postura */}
                  {feedback.videoAnalysis.posture && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Postura</p>
                      <p className="text-sm">{feedback.videoAnalysis.posture}</p>
                    </div>
                  )}

                  {/* Contacto visual */}
                  {feedback.videoAnalysis.eyeContact && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Contacto Visual</p>
                      <p className="text-sm">{feedback.videoAnalysis.eyeContact}</p>
                    </div>
                  )}

                  {/* Expresiones faciales */}
                  {feedback.videoAnalysis.facialExpressions && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Expresiones Faciales</p>
                      <p className="text-sm">{feedback.videoAnalysis.facialExpressions}</p>
                    </div>
                  )}

                  {/* Sugerencias */}
                  {feedback.videoAnalysis.suggestions && feedback.videoAnalysis.suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                      <p className="text-sm font-semibold mb-2">💡 Sugerencias para mejorar:</p>
                      <ul className="space-y-1">
                        {feedback.videoAnalysis.suggestions.map((suggestion: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-purple-500">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
