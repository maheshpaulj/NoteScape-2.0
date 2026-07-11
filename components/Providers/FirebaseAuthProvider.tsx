"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { getApp } from "firebase/app";
import "@/firebase"; // ensure the Firebase app is initialized before getApp()
import { getFirebaseToken } from "@/actions/actions";

/**
 * Signs the Firebase client SDK in with a custom token minted from the Clerk
 * session, so Firestore security rules can identify the user
 * (request.auth.uid === user email). Failures are non-fatal: until the rules
 * in firestore.rules are deployed, the app works exactly as before.
 */
export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    try {
      // getAuth throws auth/invalid-api-key when the Firebase apiKey is not
      // exposed to the browser (FIREBASE_KEY must be NEXT_PUBLIC_ for Auth).
      const firebaseAuth = getAuth(getApp());

      if (!isSignedIn) {
        signOut(firebaseAuth).catch(() => {});
        return;
      }

      const email = user?.emailAddresses[0]?.toString();
      if (!email || firebaseAuth.currentUser?.uid === email) return;

      getFirebaseToken()
        .then(({ token }) => signInWithCustomToken(firebaseAuth, token))
        .catch((error) => {
          console.warn("Firebase sign-in skipped:", error?.message ?? error);
        });
    } catch (error) {
      console.warn(
        "Firebase Auth unavailable (set NEXT_PUBLIC_FIREBASE_KEY to enable security rules):",
        (error as Error)?.message ?? error
      );
    }
  }, [isSignedIn, user]);

  return <>{children}</>;
}
