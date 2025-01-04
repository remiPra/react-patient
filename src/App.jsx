import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar'
import Home from './pages/Home';
import PatientDetails from './pages/PatientDetails';
import NewPatient from './pages/NewPatient';
import SearchPatient from './pages/SearchPatient';
import MedicalAssistant from './pages/MedicalAssistant';
import ImageContainer from './components/ImageContainer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPatient />} />
            <Route path="/patient/new" element={<NewPatient />} />
            <Route path="/patient/:id" element={<PatientDetails />} />
            <Route path="/pathology/:id" element={<MedicalAssistant />} />
            <Route path='imageanalyser' element={<ImageContainer/>}/>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;