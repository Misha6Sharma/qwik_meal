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

async function run() {
  const order = {
    id: "ORD-TEST-1234",
    userId: "guest",
    items: [ {
        menuItem: { id: "item1", name: "Food", price: 100 },
        quantity: 1,
        customization: ""
    } ],
    totalAmount: 100,
    status: "PROCESSING",
    paymentStatus: "PAID",
    createdAt: new Date().toISOString()
  };
  
  try {
     const cleaned = JSON.parse(JSON.stringify(order));
     await setDoc(doc(db, "orders", order.id), cleaned, { merge: true });
     console.log("SUCCESS");
  } catch(e) {
     console.error("FAIL", e);
  }
}
run();
