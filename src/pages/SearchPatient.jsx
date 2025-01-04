import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';

function SearchPatient() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSearchChange = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (!value.trim()) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Récupérer tous les patients depuis Firestore
            const patientsRef = collection(db, 'patients');
            const patientsSnapshot = await getDocs(patientsRef);

            // Convertir les documents en tableau d'objets
            const allPatients = patientsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filtrer les patients côté client
            const filteredPatients = allPatients.filter(patient => {
                const nomLower = patient.nom?.toLowerCase() || '';
                const prenomLower = patient.prenom?.toLowerCase() || '';
                const telephone = patient.telephone || '';

                // Vérifier si le terme de recherche est inclus dans le nom, prénom ou téléphone
                return (
                    nomLower.includes(value.toLowerCase()) ||
                    prenomLower.includes(value.toLowerCase()) ||
                    telephone.includes(value)
                );
            });

            setSearchResults(filteredPatients);
        } catch (error) {
            console.error("Erreur lors de la recherche :", error);
            setError("Une erreur s'est produite lors de la recherche.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Rechercher un patient</h1>

            {/* Champ de recherche */}
            <div className="flex gap-4 mb-6">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Rechercher par nom, prénom ou téléphone"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Affichage des erreurs */}
            {error && (
                <p className="text-center text-red-600 mb-4">{error}</p>
            )}

            {/* Résultats de la recherche */}
            <div className="space-y-4">
                {searchResults.map(patient => (
                    <div key={patient.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
                        <h3 className="text-lg font-semibold mb-2">{patient.nom} {patient.prenom}</h3>
                        <p className="text-gray-600">Téléphone : {patient.telephone}</p>
                        <p className="text-gray-600 mb-3">Email : {patient.email}</p>
                        <button
                            onClick={() => navigate(`/patient/${patient.id}`)}
                            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            Voir détails
                        </button>
                    </div>
                ))}

                {/* Aucun résultat trouvé */}
                {searchResults.length === 0 && searchTerm && !isLoading && (
                    <p className="text-center text-gray-600">Aucun patient trouvé.</p>
                )}
            </div>
        </div>
    );
}

export default SearchPatient;