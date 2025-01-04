import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParams } from 'react-router-dom';
import VoiceRecorder from '../components/VoiceRecorder';
import axios from 'axios';

const MedicalAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [patientContext, setPatientContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const {id} =  useParams()
  const patientId = id

  // Charger les données du patient
  useEffect(() => {
    const fetchPatientContext = async () => {
      if (!patientId) return;

      try {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        
        if (!patientDoc.exists()) {
          console.log('Patient non trouvé');
          return;
        }

        const patientData = patientDoc.data();
        setPatientContext({
          patient: patientData,
          consultations: []
        });

      } catch (error) {
        console.error('Erreur lors de la récupération du patient:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientContext();
  }, [patientId]);

  // Envoyer un message à l'assistant
  const sendMessage = async () => {
    if (!input.trim()) return; // Ne rien faire si l'input est vide

    try {
      setIsSending(true);

      // Ajouter le message de l'utilisateur
      const userMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput(''); // Réinitialiser l'input

      // Envoyer le message à l'API Groq
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: "mixtral-8x7b-32768", // Modèle Groq à utiliser
          messages: [
            { role: "system", content: `Vous êtes un assistant médical. Voici les informations du patient : ${JSON.stringify(patientContext)}` },
            ...messages,
            userMessage
          ],
          max_tokens: 150,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          },
        }
      );

      // Ajouter la réponse de l'assistant
      const assistantMessage = { role: "assistant", content: response.data.choices[0].message.content };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erreur lors de la communication avec Groq:', error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Désolé, une erreur s'est produite. Veuillez réessayer." }]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!patientContext) {
    return <div>Patient non trouvé</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Section "Rémi Pradère" (1/4 de l'écran sur desktop, cachée sur mobile) */}
      <div className="hidden md:block md:w-1/4 bg-white p-6 border-r border-gray-200">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">{patientContext.patient.prenom} {patientContext.patient.nom}</h2>
          <p className="text-gray-600">Né(e) le : {patientContext.patient.dateNaissance}</p>
        </div>
        
        {/* Résumé du dossier */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Résumé du dossier</h3>
          <p className="text-gray-700">{patientContext.patient.notes || "Aucune note particulière"}</p>
        </div>
      </div>

      {/* Section "Assistant d'analyse pathologique" (3/4 de l'écran sur desktop, pleine largeur sur mobile) */}
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">Assistant d'analyse pathologique</h3>
        
        {/* Historique des messages */}
        <div className="h-[calc(80vh-200px)] overflow-y-auto mb-4 p-4 bg-white border rounded-lg">
          {messages.map((message, index) => (
            <div 
              key={index}
              className={`mb-4 p-3 rounded-lg ${
                message.role === "user" 
                  ? "bg-blue-100 ml-auto max-w-[80%]" 
                  : "bg-gray-100 mr-auto max-w-[80%]"
              }`}
            >
              <p className="text-gray-800">{message.content}</p>
            </div>
          ))}
        </div>

        {/* Zone de saisie */}
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question sur le dossier du patient..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()} // Envoyer le message avec la touche Entrée
            />
            <VoiceRecorder onTranscriptionComplete={(text) => setInput(text)} />
            <button
              onClick={sendMessage}
              disabled={isSending}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalAssistant;