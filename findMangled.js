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

async function findMangaledOrders() {
     const snapshot = await getDocs(collection(db, 'orders'));
     let orders = snapshot.docs.map(doc => Object.assign(doc.data(), { _docId: doc.id }));
     
     const missingFields = orders.filter(o => !o.createdAt || !o.items);
     console.log('Orders missing createdAt or items:', missingFields.length);
     console.log(missingFields.map(o => o._docId));
     process.exit(0);
}
findMangaledOrders();
