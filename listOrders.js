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

async function inspectLastOrder() {
     const snapshot = await getDocs(collection(db, 'orders'));
     let orders = snapshot.docs.map(doc => doc.data());
     console.log('Most recent orders by created At:', orders
         .map(o => ({ id: o.id, created: o.createdAt, status: o.status }))
         .sort((a,b) => new Date(b.created).getTime() - new Date(a.created).getTime())
         .slice(0, 10));
     process.exit(0);
}
inspectLastOrder();
