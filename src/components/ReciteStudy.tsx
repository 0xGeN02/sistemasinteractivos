import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export default function ReciteStudy({ expectedAnswer }: { expectedAnswer: string }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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
    console.log("Transcription:", data.transcription);
    
    // Si hay feedback, mostrarlo
    if (data.feedback) {
      setTranscript(data.transcription);
      setFeedback(data.feedback);
      setShowFeedbackModal(true);
    } else {
      setTranscript(data.transcription);
    }

    return data.transcription;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Recitar Temario</h2>

      <div className="flex gap-3">
        {!recording ? (
          <Button onClick={startRecording}>🎙️ Empezar a grabar</Button>
        ) : (
          <Button variant="destructive" onClick={stopRecording}>
            ⏹️ Detener
          </Button>
        )}
      </div>

      {transcript && (
        <p className="mt-4 text-sm opacity-70">
          <strong>Transcripción:</strong> {transcript}
        </p>
      )}

      {/* MODAL FEEDBACK */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado de tu recitación</DialogTitle>
          </DialogHeader>

          {feedback ? (
            <div className="space-y-3">
              <p><strong>Precisión:</strong> {feedback.accuracy}%</p>

              <p><strong>Resumen:</strong> {feedback.summary}</p>

              <p><strong>Partes faltantes:</strong></p>
              <ul className="list-disc ml-5">
                {feedback.missingParts?.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>

              <p><strong>Partes incorrectas:</strong></p>
              <ul className="list-disc ml-5">
                {feedback.incorrectParts?.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Cargando análisis...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
