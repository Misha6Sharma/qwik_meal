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

async function run() {
   const qs = await getDocs(collection(db, "transactions"));
   for(let doc of qs.docs) {
     const data = doc.data();
     console.log(data.id, " - txId:", data.transactionId, " - orderId:", data.orderId);
   }
   process.exit(0);
}
run();
