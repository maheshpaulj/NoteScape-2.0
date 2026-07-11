// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // NEXT_PUBLIC_FIREBASE_KEY is required for Firebase Auth (the Clerk →
  // Firebase bridge that security rules depend on); FIREBASE_KEY is kept as
  // a fallback for existing setups.
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_KEY || process.env.FIREBASE_KEY,
  authDomain: "notescape-db.firebaseapp.com",
  projectId: "notescape-db",
  storageBucket: "notescape-db.firebasestorage.app",
  messagingSenderId: "602054643967",
  appId: "1:602054643967:web:a28a6f834e81493673bcca"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Persistent IndexedDB cache: notes and the sidebar render instantly from the
// local copy on revisit (and offline) while Firestore syncs in the background.
// initializeFirestore throws if called twice (e.g. HMR), so fall back to the
// already-initialized instance.
function createDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return getFirestore(app);
  }
}

const db = createDb();

export { db }
