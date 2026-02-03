import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCupb3K5FPNH1qblQSbALUztdONukWNBo8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gestion-joda-company.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gestion-joda-company",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gestion-joda-company.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "322749010361",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:322749010361:web:8557224ba6932b0fdde668"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Initialize with error handling
if (typeof window !== 'undefined') {
  console.log('Firebase initialized successfully');
}