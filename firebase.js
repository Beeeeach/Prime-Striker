// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getDatabase, ref, set, get, push, onValue, onDisconnect, serverTimestamp, remove, update }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCByxgFHw7I1rhXlwpK5dXFrO7ZDW4JBiE",
  authDomain: "prime-striker.firebaseapp.com",
  databaseURL: "https://prime-striker-default-rtdb.firebaseio.com",
  projectId: "prime-striker",
  storageBucket: "prime-striker.firebasestorage.app",
  messagingSenderId: "836887049132",
  appId: "1:836887049132:web:32bf277f10c8810c004009"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Googleログイン
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (e) {
    console.error('ログインエラー:', e);
    return null;
  }
}

// ログアウト
export async function logout() {
  await signOut(auth);
}

// 認証状態の監視
export function onAuthChanged(callback) {
  onAuthStateChanged(auth, callback);
}

// 現在のユーザー取得
export function getCurrentUser() {
  return auth.currentUser;
}

export { db, ref, set, get, push, onValue, onDisconnect, serverTimestamp, remove, update };
