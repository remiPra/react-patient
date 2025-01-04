import { useState } from 'react';
import axios from 'axios';

function VoiceRecorder({ onTranscriptionComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await sendAudioToGroq(blob);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Erreur lors de l'accès au microphone: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendAudioToGroq = async (blob) => {
    if (!blob) return;

    // Vérifier si la clé API est disponible
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;


    if (!apiKey) {
      setError('Clé API Groq non configurée');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('model', 'whisper-large-v3');

      const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      const text = response.data.text;
      onTranscriptionComplete(text);
    } catch (error) {
      console.error('Erreur API:', error);
      setError('Échec de la transcription audio: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-4 py-2 rounded-md ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        disabled={isLoading}
      >
        {isLoading ? 'Transcription...' : isRecording ? 'Arrêter' : 'Dicter'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

export default VoiceRecorder;