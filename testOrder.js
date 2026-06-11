import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD5hZZJKyZ5098XNG6fAi72YXlrf88EsGQ",
  authDomain: "qwik-meal.firebaseapp.com",
  projectId: "qwik-meal",
  storageBucket: "qwik-meal.firebasestorage.app",
  messagingSenderId: "180794009653",
  appId: "1:180794009653:web:39d40035daa6f539cea97c",
  measurementId: "G-9TWDJQ740X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTest() {
   try {
     console.log('Adding test order');
     await setDoc(doc(db, 'orders', 'TEST-123'), { id: 'TEST-123', status: 'PAID' });
     console.log('Success');
     process.exit(0);
   } catch (e) {
     console.error('Failed', e);
     process.exit(1);
   }
}
addTest();
