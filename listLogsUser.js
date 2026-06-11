import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection, query, limit } from 'firebase/firestore';

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

async function run() {
   const q = query(collection(db, "campaignLogs"), limit(50));
   const snapshot = await getDocs(q);
   console.log(snapshot.docs.map(doc => doc.data()));
   process.exit(0);
}
run();
