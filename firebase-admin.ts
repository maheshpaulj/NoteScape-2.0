import { initializeApp, getApps, App, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Check if Firebase service key is available
const serviceKeyString = process.env.FIREBASE_SERVICE_KEY;

if (!serviceKeyString) {
  console.warn("FIREBASE_SERVICE_KEY environment variable is not set. Firebase admin features will be disabled.");
}

let app: App;

if (getApps().length === 0 && serviceKeyString) {
  try {
    const serviceKey = JSON.parse(serviceKeyString);
    app = initializeApp({
      credential: cert(serviceKey),
    });
  } catch (error) {
    console.error("Failed to parse Firebase service key:", error);
    console.warn("Firebase admin will not be initialized. Check your FIREBASE_SERVICE_KEY format.");
    // Initialize without credentials for development
    app = initializeApp();
  }
} else if (getApps().length === 0) {
  // Initialize without credentials for development when no service key is provided
  app = initializeApp();
} else {
  app = getApp();
}

const adminDb = getFirestore(app);

export { app as adminApp, adminDb };