import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FaCloudUploadAlt } from 'react-icons/fa';

const UploadZone = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      
      if (items) {
        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              onUploadComplete(file);
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onUploadComplete]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onUploadComplete(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      onUploadComplete(file);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className={`relative flex flex-col items-center justify-center w-full h-48 p-6 
          border-2 border-dashed rounded-lg transition-all cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <FaCloudUploadAlt className="w-12 h-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Glissez vos photos ici, collez (Ctrl+V) ou cliquez pour sélectionner
        </p>
        <input 
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

const ImageAnalyzer = () => {
  const [image, setImage] = useState(null); // Pour stocker l'image sélectionnée
  const [question, setQuestion] = useState(''); // Pour stocker la question
  const [response, setResponse] = useState(''); // Pour stocker la réponse de l'API
  const [loading, setLoading] = useState(false); // Pour gérer l'état de chargement
  const [error, setError] = useState(null); // Pour gérer les erreurs

  // Convertir l'image en base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result.split(',')[1]; // Extraire la partie base64
          resolve(base64Data);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Envoyer l'image et la question à l'API
  const analyzeImage = async () => {
    if (!image) {
      setError('Veuillez sélectionner une image');
      return;
    }

    if (!question.trim()) {
      setError('Veuillez poser une question');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Clé API non trouvée');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Convertir l'image en base64
      const base64Image = await fileToBase64(image);

      // Envoyer l'image et la question à l'API
      const result = await model.generateContent([
        { text: question },
        {
          inlineData: {
            data: base64Image,
            mimeType: image.type,
          },
        },
      ]);

      if (!result.response) {
        throw new Error('Aucune réponse reçue de l\'API');
      }

      const response = await result.response;
      const text = response.text();
      setResponse(text);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Analyse d'image avec Gemini Flash 2.0</h1>

      {/* Sélectionner une image */}
      <UploadZone onUploadComplete={setImage} />

      {/* Aperçu de l'image */}
      {image && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Image sélectionnée :</h2>
          <img
            src={URL.createObjectURL(image)}
            alt="Preview"
            className="max-w-full h-48 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Poser une question */}
      <div className="mt-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Posez votre question sur l'image..."
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Bouton pour lancer l'analyse */}
      <div className="mt-4">
        <button
          onClick={analyzeImage}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyse en cours...' : 'Analyser'}
        </button>
      </div>

      {/* Afficher la réponse ou les erreurs */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Réponse :</h2>
          <p className="text-gray-800">{response}</p>
        </div>
      )}
    </div>
  );
};

export default ImageAnalyzer;