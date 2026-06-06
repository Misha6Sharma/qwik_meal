import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD5hZZJKyZ5098XNG6fAi72YXlrf88EsGQ",
  authDomain: "qwik-meal.firebaseapp.com",
  projectId: "qwik-meal",
  storageBucket: "qwik-meal.firebasestorage.app",
  messagingSenderId: "180794009653",
  appId: "1:180794009653:web:39d40035daa6f539cea97c",
  measurementId: "G-9TWDJQ740X"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
