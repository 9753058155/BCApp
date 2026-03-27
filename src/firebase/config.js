import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD_2kHt53Ny4UCWsMRyPzlvDsBgktRc-y4",
  authDomain: "bcapp-15130.firebaseapp.com",
  projectId: "bcapp-15130",
  storageBucket: "bcapp-15130.appspot.com",
  messagingSenderId: "946729397276",
  appId: "1:946729397276:web:d11068740200b4962643d9"
};

const app = initializeApp(firebaseConfig);

// Use Firestore (Cloud Database)
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- ADD THIS: Secondary instance for Admin tasks ---
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export default app;