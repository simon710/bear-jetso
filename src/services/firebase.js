import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to IndexedDB for better mobile support
const persistence = Capacitor.getPlatform() === 'web' ? browserLocalPersistence : indexedDBLocalPersistence;
setPersistence(auth, persistence).catch(err => {
    console.error("Auth persistence error:", err);
});

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
        return signInWithRedirect(auth, googleProvider);
    }
    return signInWithPopup(auth, googleProvider);
};

export const handleRedirectResult = () => {
    return getRedirectResult(auth);
};
export const logout = () => signOut(auth);
