import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAkQ-Pu5Xz1l-QwIICv8J2HsptSjYhE2d8",
  authDomain: "calyx-meet.firebaseapp.com",
  projectId: "calyx-meet",
  storageBucket: "calyx-meet.firebasestorage.app",
  messagingSenderId: "554595048851",
  appId: "1:554595048851:web:1f75faaf50e456a5e99c66",
  measurementId: "G-VGZWN7XZBQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
