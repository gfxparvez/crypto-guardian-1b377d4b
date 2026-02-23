import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase, ref, set, get, child } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAp6Pk__gW0_fwswuNZZk6EuCVxn32Gpb0",
  authDomain: "gfx-esports-34a7d.firebaseapp.com",
  databaseURL: "https://gfx-esports-34a7d-default-rtdb.firebaseio.com",
  projectId: "gfx-esports-34a7d",
  storageBucket: "gfx-esports-34a7d.firebasestorage.app",
  messagingSenderId: "258385854430",
  appId: "1:258385854430:web:9f1aa7637bac9b4080e74f",
  measurementId: "G-GPV5WBPYWY",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Initialize analytics only if supported (not in SSR)
let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, db, analytics };

// Save wallet metadata (NOT private keys) to Firebase
export const saveWalletMetadata = async (walletId: string, metadata: {
  addresses: Record<string, string>;
  createdAt: number;
}) => {
  try {
    await set(ref(db, `wallets/${walletId}`), metadata);
  } catch (error) {
    console.error("Failed to save wallet metadata:", error);
  }
};

// Get wallet metadata from Firebase
export const getWalletMetadata = async (walletId: string) => {
  try {
    const snapshot = await get(child(ref(db), `wallets/${walletId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Failed to get wallet metadata:", error);
    return null;
  }
};

// Save transaction record
export const saveTransaction = async (walletId: string, tx: {
  coin: string;
  to: string;
  amount: string;
  hash: string;
  timestamp: number;
}) => {
  try {
    const txId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await set(ref(db, `transactions/${walletId}/${txId}`), tx);
  } catch (error) {
    console.error("Failed to save transaction:", error);
  }
};
