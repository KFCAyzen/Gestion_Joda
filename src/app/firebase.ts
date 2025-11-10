import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCupb3K5FPNH1qblQSbALUztdONukWNBo8",
  authDomain: "gestion-joda-company.firebaseapp.com",
  projectId: "gestion-joda-company",
  storageBucket: "gestion-joda-company.firebasestorage.app",
  messagingSenderId: "322749010361",
  appId: "1:322749010361:web:8557224ba6932b0fdde668",
  measurementId: "G-DJPGEDJYHD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;