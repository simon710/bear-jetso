import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, indexedDBLocalPersistence, browserLocalPersistence, signInWithCredential } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

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
        try {
            // 1. 使用原生插件進行 Google 登入
            const result = await FirebaseAuthentication.signInWithGoogle();

            // 2. 獲取 ID Token 並建立 Firebase 憑證以同步 Web SDK 狀態
            if (result.credential) {
                const credential = GoogleAuthProvider.credential(result.credential.idToken);
                return await signInWithCredential(auth, credential);
            }
            return result.user;
        } catch (error) {
            console.error("Native Google login error:", error);
            throw error;
        }
    }
    // 網頁環境維持 Popup
    return signInWithPopup(auth, googleProvider);
};

export const handleRedirectResult = () => {
    return getRedirectResult(auth);
};
export const logout = () => signOut(auth);
