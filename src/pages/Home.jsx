import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';

function Home() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        const patientsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPatients(patientsList);
      } catch (error) {
        console.error("Erreur lors du chargement des patients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Liste des Patients</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <Link
            key={patient.id}
            to={`/patient/${patient.id}`}
            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <h2 className="text-xl font-semibold">
                {patient.nom} {patient.prenom}
              </h2>
              <p className="text-gray-600">{patient.telephone}</p>
              <p className="text-gray-500 text-sm mt-2">
                Né(e) le: {patient.dateNaissance}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {patients.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          Aucun patient enregistré
        </div>
      )}
    </div>
  );
}

export default Home;