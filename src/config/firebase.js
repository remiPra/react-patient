import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8v-5iRPEbY74_JeCrTfe9HFZCzrau9c4",
  authDomain: "react-patient.firebaseapp.com",
  projectId: "react-patient",
  storageBucket: "react-patient.firebasestorage.app",
  messagingSenderId: "464169411659",
  appId: "1:464169411659:web:4aa052abb2850d256519ce",
  measurementId: "G-Z4MYYE1R7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);
export const db = getFirestore()
