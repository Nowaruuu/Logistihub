import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback config since we are moving to MySQL backend
const firebaseConfig = {
  projectId: "dummy-project",
  appId: "1:111111111:web:111111",
  apiKey: "dummy-key",
  authDomain: "dummy.firebaseapp.com",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
