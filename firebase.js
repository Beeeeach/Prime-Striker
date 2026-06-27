// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getDatabase, ref, set, get, push, onValue, onDisconnect, serverTimestamp, remove, update, runTransaction }
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
// ============ ユーザーデータ管理 ============
export async function getUserData(uid) {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);
  return snap.exists() ? snap.val() : null;
}

export async function initUserIfNeeded(uid, displayName) {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    await set(userRef, {
      displayName: displayName || 'Player',
      rating:      DEFAULT_RATING,
      wins:        0,
      losses:      0,
      winStreak:   0,
      createdAt:   serverTimestamp(),
    });
  }
}

export async function updateUserStats(uid, isWin, newRating) {
  const userRef = ref(db, `users/${uid}`);
  const snap    = await get(userRef);
  if (!snap.exists()) return;
  const data = snap.val();
  await update(userRef, {
    rating:    newRating,
    wins:      isWin ? (data.wins    || 0) + 1 : (data.wins    || 0),
    losses:    isWin ? (data.losses  || 0)     : (data.losses  || 0) + 1,
    winStreak: isWin ? (data.winStreak || 0) + 1 : 0,
  });
}

const DEFAULT_RATING = 1200;

export { db, ref, set, get, push, onValue, onDisconnect, serverTimestamp, remove, update, runTransaction,
         getUserData, initUserIfNeeded, updateUserStats };
