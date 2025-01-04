import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    addDoc,
    getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import VoiceRecorder from '../components/VoiceRecorder';

function ImageModal({ imageUrl, onClose }) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="relative max-w-4xl max-h-[90vh]">
                <img
                    src={imageUrl}
                    alt="Vue agrandie"
                    className="max-w-full max-h-[90vh] object-contain"
                    onClick={(e) => e.stopPropagation()}
                />
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

function PatientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNewConsultation, setShowNewConsultation] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedPatient, setEditedPatient] = useState(null);
    const [editingConsultation, setEditingConsultation] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [newConsultation, setNewConsultation] = useState({
        date: new Date().toISOString().split('T')[0],
        compteRendu: '',
        photos: [],
    });

    useEffect(() => {
        const fetchPatientAndConsultations = async () => {
            try {
                setLoading(true);
                const patientDoc = await getDoc(doc(db, 'patients', id));

                if (!patientDoc.exists()) {
                    setError('Patient non trouvé');
                    return;
                }

                const patientData = { id: patientDoc.id, ...patientDoc.data() };
                setPatient(patientData);
                setEditedPatient(patientData);

                const consultationsSnapshot = await getDocs(collection(db, 'patients', id, 'consultations'));
                const consultationsData = consultationsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    photos: doc.data().photos || [], // Assure que photos est toujours un tableau
                }));

                setConsultations(consultationsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
            } catch (err) {
                setError('Erreur lors du chargement: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPatientAndConsultations();
    }, [id]);

    const handleUpdatePatient = async () => {
        try {
            const patientRef = doc(db, 'patients', id);
            await updateDoc(patientRef, {
                nom: editedPatient.nom,
                prenom: editedPatient.prenom,
                dateNaissance: editedPatient.dateNaissance,
                telephone: editedPatient.telephone,
                email: editedPatient.email,
                notes: editedPatient.notes,
            });
            setPatient(editedPatient);
            setIsEditing(false);
        } catch (err) {
            setError('Erreur lors de la mise à jour: ' + err.message);
        }
    };

    const handleDeletePatient = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) return;

        try {
            // Supprimer toutes les photos
            for (const consultation of consultations) {
                if (consultation.photos?.length > 0) {
                    for (const photoUrl of consultation.photos) {
                        try {
                            const photoRef = ref(storage, photoUrl);
                            await deleteObject(photoRef);
                        } catch (err) {
                            console.error('Erreur lors de la suppression de la photo:', err);
                        }
                    }
                }
                await deleteDoc(doc(db, 'patients', id, 'consultations', consultation.id));
            }

            await deleteDoc(doc(db, 'patients', id));
            navigate('/');
        } catch (err) {
            setError('Erreur lors de la suppression: ' + err.message);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            const uploadPromises = files.map(async (file) => {
                const storageRef = ref(storage, `consultations/${id}/${Date.now()}-${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                return getDownloadURL(snapshot.ref);
            });

            const urls = await Promise.all(uploadPromises);

            if (editingConsultation) {
                setEditingConsultation((prev) => ({
                    ...prev,
                    photos: [...(prev.photos || []), ...urls],
                }));
            } else {
                setNewConsultation((prev) => ({
                    ...prev,
                    photos: [...prev.photos, ...urls],
                }));
            }
        } catch (err) {
            setError('Erreur lors du téléchargement des photos: ' + err.message);
        }
    };

    const handleDeletePhoto = async (photoUrl, consultationId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;

        try {
            const photoRef = ref(storage, photoUrl);
            await deleteObject(photoRef);

            if (editingConsultation) {
                const updatedPhotos = editingConsultation.photos.filter((p) => p !== photoUrl);
                await updateDoc(doc(db, 'patients', id, 'consultations', consultationId), {
                    photos: updatedPhotos,
                });

                setEditingConsultation((prev) => ({
                    ...prev,
                    photos: updatedPhotos,
                }));
            }
        } catch (err) {
            setError('Erreur lors de la suppression de la photo: ' + err.message);
        }
    };

    const handleSubmitConsultation = async (e) => {
        e.preventDefault();
        try {
            const consultationData = {
                ...newConsultation,
                photos: newConsultation.photos || [], // Assure que photos est un tableau
            };

            const docRef = await addDoc(collection(db, 'patients', id, 'consultations'), consultationData);
            setConsultations([{ ...consultationData, id: docRef.id }, ...consultations]);
            setShowNewConsultation(false);
            setNewConsultation({
                date: new Date().toISOString().split('T')[0],
                compteRendu: '',
                photos: [],
            });
        } catch (err) {
            setError("Erreur lors de l'ajout de la consultation: " + err.message);
        }
    };

    const handleUpdateConsultation = async (consultationId, updatedData) => {
        try {
            await updateDoc(doc(db, 'patients', id, 'consultations', consultationId), {
                ...updatedData,
                photos: updatedData.photos || [], // Assure que photos est un tableau
            });

            setConsultations((prev) =>
                prev.map((consultation) =>
                    consultation.id === consultationId ? { ...consultation, ...updatedData } : consultation
                )
            );

            setEditingConsultation(null);
        } catch (err) {
            setError('Erreur lors de la mise à jour de la consultation: ' + err.message);
        }
    };

    const handleDeleteConsultation = async (consultationId, photos = []) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette consultation ?')) return;

        try {
            // Supprimer les photos
            for (const photoUrl of photos) {
                try {
                    const photoRef = ref(storage, photoUrl);
                    await deleteObject(photoRef);
                } catch (err) {
                    console.error('Erreur lors de la suppression de la photo:', err);
                }
            }

            await deleteDoc(doc(db, 'patients', id, 'consultations', consultationId));
            setConsultations((prev) => prev.filter((c) => c.id !== consultationId));
        } catch (err) {
            setError('Erreur lors de la suppression de la consultation: ' + err.message);
        }
    };

    if (loading) {
        return <div className="text-center mt-8">Chargement...</div>;
    }

    if (error) {
        return <div className="text-center mt-8 text-red-600">{error}</div>;
    }

    if (!patient) {
        return <div className="text-center mt-8">Patient non trouvé</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* Section Détails du Patient */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                {isEditing ? (
                    <div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                <input
                                    type="text"
                                    value={editedPatient.nom}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, nom: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                                <input
                                    type="text"
                                    value={editedPatient.prenom}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, prenom: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                                <input
                                    type="date"
                                    value={editedPatient.dateNaissance}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, dateNaissance: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                                <input
                                    type="tel"
                                    value={editedPatient.telephone}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, telephone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editedPatient.email}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={editedPatient.notes}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleUpdatePatient}
                                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl font-bold">
                                {patient.prenom} {patient.nom}
                            </h1>
                            <div className="space-x-2">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                                >
                                    Modifier
                                </button>
                                <button
                                    onClick={handleDeletePatient}
                                    className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-600">Date de naissance: {patient.dateNaissance}</p>
                                <p className="text-gray-600">Téléphone: {patient.telephone}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Email: {patient.email}</p>
                                <p className="text-gray-600">Notes: {patient.notes}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section Consultations */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Consultations</h2>
                    <button
                        onClick={() => setShowNewConsultation(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Nouvelle consultation
                    </button>
                </div>

                {showNewConsultation && (
                    <form onSubmit={handleSubmitConsultation} className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={newConsultation.date}
                                onChange={(e) => setNewConsultation({ ...newConsultation, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Compte rendu</label>
                            <div className="flex items-start space-x-2">
                                <textarea
                                    value={newConsultation.compteRendu}
                                    onChange={(e) => setNewConsultation({ ...newConsultation, compteRendu: e.target.value })}
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    required
                                />
                                <VoiceRecorder
                                    onTranscriptionComplete={(text) => {
                                        setNewConsultation((prev) => ({
                                            ...prev,
                                            compteRendu: prev.compteRendu + ' ' + text,
                                        }));
                                    }}
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ajouter des photos</label>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="w-full"
                                accept="image/*"
                            />
                            {newConsultation.photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mt-2">
                                    {newConsultation.photos.map((photo, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={photo}
                                                alt={`Photo ${index + 1}`}
                                                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-75"
                                                onClick={() => setZoomedImage(photo)} // Ouvrir le modal avec cette photo
                                            />
                                            <button
                                                onClick={() =>
                                                    setNewConsultation((prev) => ({
                                                        ...prev,
                                                        photos: prev.photos.filter((p) => p !== photo),
                                                    }))
                                                }
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowNewConsultation(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {consultations.map((consultation) => (
                        <div key={consultation.id} className="bg-white rounded-lg shadow p-6">
                            {editingConsultation?.id === consultation.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={editingConsultation.date}
                                            onChange={(e) =>
                                                setEditingConsultation({
                                                    ...editingConsultation,
                                                    date: e.target.value,
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Compte rendu</label>
                                        <div className="flex items-start space-x-2">
                                            <textarea
                                                value={editingConsultation.compteRendu}
                                                onChange={(e) =>
                                                    setEditingConsultation({
                                                        ...editingConsultation,
                                                        compteRendu: e.target.value,
                                                    })
                                                }
                                                rows="4"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                            <VoiceRecorder
                                                onTranscriptionComplete={(text) => {
                                                    setEditingConsultation({
                                                        ...editingConsultation,
                                                        compteRendu: editingConsultation.compteRendu + ' ' + text,
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            {editingConsultation.photos?.map((photo, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={photo}
                                                        alt={`Photo ${index + 1}`}
                                                        className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-75"
                                                        onClick={() => setZoomedImage(photo)}
                                                    />
                                                    <button
                                                        onClick={() => handleDeletePhoto(photo, consultation.id)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="w-full"
                                            accept="image/*"
                                        />
                                    </div>
                                    <div className="flex justify-end space-x-4">
                                        <button
                                            onClick={() => setEditingConsultation(null)}
                                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleUpdateConsultation(consultation.id, {
                                                    date: editingConsultation.date,
                                                    compteRendu: editingConsultation.compteRendu,
                                                    photos: editingConsultation.photos,
                                                })
                                            }
                                            className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                                        >
                                            Enregistrer
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-semibold">
                                            Consultation du {new Date(consultation.date).toLocaleDateString()}
                                        </h3>
                                        <div className="space-x-2">
                                            <button
                                                onClick={() => setEditingConsultation(consultation)}
                                                className="text-blue-500 hover:text-blue-600"
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                onClick={() => handleDeleteConsultation(consultation.id, consultation.photos)}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-gray-700 mb-4">{consultation.compteRendu}</p>
                                    {consultation.photos && consultation.photos.length > 0 && (
                                        <div className="grid grid-cols-3 gap-4">
                                            {consultation.photos.map((photo, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={photo}
                                                        alt={`Photo ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-75"
                                                        onClick={() => setZoomedImage(photo)} // Ouvrir le modal avec cette photo
                                                    />
                                                    {editingConsultation && (
                                                        <button
                                                            onClick={() => handleDeletePhoto(photo, consultation.id)}
                                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal pour agrandir les photos */}
            {zoomedImage && (
  <ImageModal
    imageUrl={zoomedImage}
    onClose={() => setZoomedImage(null)} // Fermer le modal
  />
)}
        </div>
    );
}

export default PatientDetails;