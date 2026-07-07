// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getDatabase, ref, set, get, push, onValue, onDisconnect, serverTimestamp, remove, update, runTransaction, query, orderByChild, limitToLast }
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
// ニックネームを更新する
export async function updateNickname(uid, nickname) {
  const userRef = ref(db, `users/${uid}`);
  await update(userRef, { displayName: nickname });
}

export async function initUserIfNeeded(uid, displayName) {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    await set(userRef, {
      displayName: displayName || 'Player',
      rating: DEFAULT_RATING,
      wins: 0,
      losses: 0,
      winStreak: 0,
      exp: 0,
      level: 1,
      createdAt: serverTimestamp(),
    });
  }
}

export async function updateUserStats(uid, isWin, newRating) {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) return;
  const data = snap.val();
  await update(userRef, {
    rating: newRating,
    wins: isWin ? (data.wins || 0) + 1 : (data.wins || 0),
    losses: isWin ? (data.losses || 0) : (data.losses || 0) + 1,
    winStreak: isWin ? (data.winStreak || 0) + 1 : 0,
  });
}
// EXPとレベルを更新する
export async function updateUserExp(uid, gainedExp) {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) return null;

  const data = snap.val();
  let currentExp = data.exp ?? 0;
  let currentLevel = data.level ?? 1;

  currentExp += gainedExp;

  // レベルアップ処理
  let leveledUp = false;
  let levelsGained = 0;
  while (currentLevel < 99) {
    const required = calcRequiredExp(currentLevel);
    if (currentExp >= required) {
      currentExp -= required;
      currentLevel++;
      leveledUp = true;
      levelsGained++;
    } else {
      break;
    }
  }

  await update(userRef, {
    exp: currentExp,
    level: currentLevel,
  });

  return { newLevel: currentLevel, newExp: currentExp, leveledUp, levelsGained };
}

// レベルアップに必要なEXPを計算
export function calcRequiredExp(level) {
  return Math.floor(100 * level * Math.pow(1.2, level - 1));
}

const DEFAULT_RATING = 1200;

// ===================================================
// ランキング機能
// ===================================================

// 新記録をランキング（leaderboards）に送信する。ログインユーザーのみ対象。
export async function submitScoreToLeaderboard(difficulty, score) {
  const user = getCurrentUser();
  if (!user) return;

  const scoreRef = ref(db, `leaderboards/${difficulty}/${user.uid}`);
  const snap = await get(scoreRef);
  const existingScore = snap.exists() ? (snap.val().score ?? 0) : 0;

  if (score > existingScore) {
    // Firebaseのusersコレクションからニックネームを取得
    const userData = await getUserData(user.uid);
    const nickname = userData?.displayName || user.displayName || 'Player';

    await set(scoreRef, {
      displayName: nickname,
      score: Math.floor(score),
      updatedAt: serverTimestamp(),
    });
  }
}

// 指定難易度のハイスコア上位を取得する
export async function getTopScores(difficulty, limitCount = 10) {
  const scoresQuery = query(
    ref(db, `leaderboards/${difficulty}`),
    orderByChild('score'),
    limitToLast(limitCount)
  );
  const snap = await get(scoresQuery);
  if (!snap.exists()) return [];

  const list = [];
  snap.forEach((child) => {
    list.push({ uid: child.key, ...child.val() });
  });
  return list.sort((a, b) => b.score - a.score);
}

// レーティング上位を取得する
export async function getTopRatings(limitCount = 10) {
  const ratingQuery = query(
    ref(db, 'users'),
    orderByChild('rating'),
    limitToLast(limitCount)
  );
  const snap = await get(ratingQuery);
  if (!snap.exists()) return [];

  const list = [];
  snap.forEach((child) => {
    list.push({ uid: child.key, ...child.val() });
  });
  return list.sort((a, b) => (b.rating ?? DEFAULT_RATING) - (a.rating ?? DEFAULT_RATING));
}

export { db, ref, set, get, push, onValue, onDisconnect, serverTimestamp, remove, update, runTransaction, query, orderByChild, limitToLast, updateUserExp };
