import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

// TODO: แทนที่ด้วย Config จาก Firebase Console ของคุณ
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC4eDlSgpzjWAVzWF93D7uityK-OhIkRag",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "inspire-72132.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "inspire-72132",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "inspire-72132.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "132170895840",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:132170895840:web:a816b00b4a3f46d9879b85",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-H3TTRJN2L9",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = firebaseConfig.databaseURL ? getDatabase(app, firebaseConfig.databaseURL) : null;
export const functions = getFunctions(
  app,
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "asia-southeast1",
);
