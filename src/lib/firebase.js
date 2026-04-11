import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: แทนที่ด้วย Config จาก Firebase Console ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyC4eDlSgpzjWAVzWF93D7uityK-OhIkRag",
  authDomain: "inspire-72132.firebaseapp.com",
  projectId: "inspire-72132",
  storageBucket: "inspire-72132.firebasestorage.app",
  messagingSenderId: "132170895840",
  appId: "1:132170895840:web:a816b00b4a3f46d9879b85",
  measurementId: "G-H3TTRJN2L9",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
