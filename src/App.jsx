import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar'
import Home from './pages/Home';
import PatientDetails from './pages/PatientDetails';
import NewPatient from './pages/NewPatient';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/patient/new" element={<NewPatient />} />
            <Route path="/patient/:id" element={<PatientDetails />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;