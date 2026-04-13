import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBc5QwF0LZo73U3sDSoes-dBnkzDq_e0rU",
  authDomain: "lab-t2.firebaseapp.com",
  projectId: "lab-t2",
  storageBucket: "lab-t2.firebasestorage.app",
  messagingSenderId: "710410563686",
  appId: "1:710410563686:web:4795c9f2dc66bba6633da7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore for saving user profiles, explicitly forcing long polling
// to bypass WebSocket dropping issues common in Expo Go React Native apps.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
