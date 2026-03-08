// src/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCLKe6G0C1SGsePkwOTC7R1ViOhkunY_q4",
  authDomain: "smart-vase-de532.firebaseapp.com",
  projectId: "smart-vase-de532",
  storageBucket: "smart-vase-de532.firebasestorage.app",
  messagingSenderId: "155941724985",
  appId: "1:155941724985:web:088314401da931a8d47ee8",
  measurementId: "G-H1ZN7ZFEGK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
  auth, 
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};