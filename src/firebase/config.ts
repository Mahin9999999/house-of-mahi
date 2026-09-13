import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyC6XtHomMNSLF33-s-WzqyMnBOUJLU2820",
  authDomain: "houseofmahi.firebaseapp.com",
  projectId: "houseofmahi",
  storageBucket: "houseofmahi.appspot.com",
  messagingSenderId: "455966279427",
  appId: "1:455966279427:web:ec46a04b527c8c1ba8cb36"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

