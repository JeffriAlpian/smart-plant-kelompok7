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
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAG6AttOievBlA5m7Fxj4vQ-_VdUf6vgZ0",
  authDomain: "smart-vase-kelompok7.firebaseapp.com",
  projectId: "smart-vase-kelompok7",
  storageBucket: "smart-vase-kelompok7.firebasestorage.app",
  messagingSenderId: "534571289251",
  appId: "1:534571289251:web:418a22cb6ec6596f504d16",
  measurementId: "G-YTTW7F94E5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

export { 
  auth, 
  db,
  messaging,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};