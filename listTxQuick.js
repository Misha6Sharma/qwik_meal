import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';

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

async function inspectLastTx() {
     const snapshot = await getDocs(collection(db, 'transactions'));
     let txs = snapshot.docs.map(doc => doc.data());
     console.log('Total txs:', txs.length);
     console.log('Most recent txs by created At:', txs
         .map(o => ({ id: o.id, orderId: o.orderId, timestamp: o.timestamp }))
         .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
         .slice(0, 10));
     process.exit(0);
}
inspectLastTx();
