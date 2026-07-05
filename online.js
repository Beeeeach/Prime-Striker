// online.js
import { loginWithGoogle, logout, onAuthChanged, getCurrentUser as getFirebaseUser } from './firebase.js';

// ============ 画面要素 ============
const loginScreen = document.getElementById('login-screen');
const startScreen = document.getElementById('start-screen');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnGuestLogin = document.getElementById('btn-guest-login');
const highScoreValueDisplay = document.getElementById('highScoreValue');

// ============ 状態 ============
let currentUser = null; // ログイン中のユーザー（ゲストはnull）

// ============ 画面切り替え ============
function showScreen(showEl, hideEl) {
  hideEl?.classList.remove('active');
  showEl?.classList.add('active');
}

// ============ ログイン後の初期化 ============
function onLoggedIn(user) {
  currentUser = user;
  console.log('ログイン済み:', user.displayName);
  showScreen(startScreen, loginScreen);

  // スタート画面のハイスコア表示を更新
  if (typeof window.updateHighScoreDisplay === 'function') {
    window.updateHighScoreDisplay();
  }
}

// ============ ゲストとして続ける ============
function onGuest() {
  currentUser = null;
  showScreen(startScreen, loginScreen);

  if (typeof window.updateHighScoreDisplay === 'function') {
    window.updateHighScoreDisplay();
  }
}

// ============ イベントリスナー ============
btnGoogleLogin?.addEventListener('click', async () => {
  const user = await loginWithGoogle();
  if (user) onLoggedInWithUI(user);
});

btnGuestLogin?.addEventListener('click', () => {
  onGuest();
});

// ============ 認証状態の監視 ============
// ページ読み込み時にすでにログイン済みならスキップ
onAuthChanged((user) => {
  if (user) {
    onLoggedInWithUI(user);
  }
  // ログアウト状態はログイン画面のままにする（何もしない）
});

// ============ 外部から使えるようにエクスポート ============
export function getOnlineUser() {
  return currentUser;
}
// ============ ユーザー情報の表示 ============
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const btnLogout = document.getElementById('btn-logout');

function updateUserInfoUI(user, nickname = null) {
  if (!userInfo) return;
  if (user) {
    userInfo.classList.remove('is-hidden');
    if (userAvatar) userAvatar.src = user.photoURL || '';
    if (userName) userName.textContent = nickname || user.displayName || 'プレイヤー';
  } else {
    userInfo.classList.add('is-hidden');
  }
}

// ログイン・ゲスト時にUI更新
const _onLoggedIn = onLoggedIn;
async function onLoggedInWithUI(user) {
  _onLoggedIn(user);

  try {
    const { initUserIfNeeded, getUserData } = await import('./firebase.js');
    await initUserIfNeeded(user.uid, user.displayName);
    const data = await getUserData(user.uid);

    // Firebaseに保存されたニックネームがあればそちらを使う
    const nickname = data?.displayName || user.displayName || 'Player';
    updateUserInfoUI(user, nickname);
    updateRatingDisplay(data?.rating ?? 1200);

    // 初回ログイン（ニックネーム未設定）の場合はニックネーム設定画面へ
    if (!data?.nicknameSet) {
      showNicknameModal(user);
    }
  } catch (e) {
    console.error('ユーザー初期化エラー:', e);
  }
}

btnLogout?.addEventListener('click', async () => {
  await logout();
  currentUser = null;
  updateUserInfoUI(null);
  showScreen(loginScreen, startScreen);
});
// ============ マッチング画面の要素 ============
const matchingScreen = document.getElementById('matching-screen');
const btnRandomMatch = document.getElementById('btn-random-match');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const roomCodeInput = document.getElementById('room-code-input');
const waitingBox = document.getElementById('waiting-box');
const waitingText = document.getElementById('waiting-text');
const waitingRoomCode = document.getElementById('waiting-room-code');
const btnCancelMatch = document.getElementById('btn-cancel-match');
const btnBackFromMatching = document.getElementById('btn-back-to-start-from-matching');

let currentRoomId = null;
let roomListener = null;

// ============ Firebaseからニックネームを取得 ============
async function getMyNickname() {
  try {
    const { getUserData } = await import('./firebase.js');
    const data = await getUserData(currentUser.uid);
    return data?.displayName || currentUser.displayName || 'Player';
  } catch (e) {
    return currentUser.displayName || 'Player';
  }
}
// ============ ルームコード生成（6桁英数字） ============
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============ 待機UIの表示・非表示 ============
function showWaiting(text, roomCode = null) {
  const matchingOptions = document.querySelector('.matching-options');
  if (matchingOptions) matchingOptions.style.display = 'none';
  waitingBox?.classList.remove('is-hidden');
  if (waitingText) waitingText.textContent = text;

  if (roomCode) {
    waitingRoomCode?.classList.remove('is-hidden');
    if (waitingRoomCode) waitingRoomCode.textContent = roomCode;
  } else {
    waitingRoomCode?.classList.add('is-hidden');
  }
}

function hideWaiting() {
  const matchingOptions = document.querySelector('.matching-options');
  if (matchingOptions) matchingOptions.style.display = '';
  waitingBox?.classList.add('is-hidden');
}

// ============ ルームのリスナー解除 ============
function detachRoomListener() {
  if (roomListener) {
    roomListener();
    roomListener = null;
  }
}

// ============ マッチング成立時の処理 ============
function onMatchFound(roomId, roomData, matchType) {
  detachRoomListener();
  currentRoomId = roomId;
  hideWaiting();

  const gameScreen = document.getElementById('game-screen');
  if (matchingScreen) matchingScreen.classList.remove('active');
  if (gameScreen) gameScreen.classList.add('active');

  if (typeof window.playBgm === 'function') window.playBgm();
  if (typeof window.startBattle === 'function') {
    window.startBattle({ mode: 'vs', roomId, roomData, matchType }); // ★追加: matchTypeを渡す
  }
}

// ============ ランダムマッチ ============
async function startRandomMatch() {
  if (!currentUser) { alert('ログインが必要です。'); return; }

  showWaiting('相手を探しています...');

  const { db, ref, get, set, onValue, serverTimestamp, onDisconnect, remove } = await import('./firebase.js');

  const waitingRef = ref(db, 'waiting');
  const snapshot = await get(waitingRef);

  if (snapshot.exists()) {
    // 待機中のルームがある → 参加
    const waitingData = snapshot.val();
    const roomId = Object.keys(waitingData)[0];
    const roomRef = ref(db, `rooms/${roomId}`);

    // 自分の情報を追加してゲーム開始
    await set(ref(db, `rooms/${roomId}/players/${currentUser.uid}`), {
      nickname: nickname,
      avatar: currentUser.photoURL || '',
      hp: 1000,
      currentNumber: 0,
      combo: 0,
      connected: true,
    });

    // 待機リストから削除
    await remove(ref(db, `waiting/${roomId}`));

    // ルームのstatusをplayingに更新
    await set(ref(db, `rooms/${roomId}/status`), 'playing');

    const roomSnapshot = await get(roomRef);
    onMatchFound(roomId, roomSnapshot.val(), 'random');

  } else {
    // 待機中のルームがない → 新規作成して待機
    const roomCode = generateRoomCode();
    const roomId = roomCode;
    const roomRef = ref(db, `rooms/${roomId}`);
    const nickname = await getMyNickname();

    await set(roomRef, {
      status: 'waiting',
      createdAt: serverTimestamp(),
      players: {
        [currentUser.uid]: {
          nickname: nickname,
          avatar: currentUser.photoURL || '',
          hp: 1000,
          currentNumber: 0,
          combo: 0,
          connected: true,
        }
      }
    });

    // 切断時に自動削除
    onDisconnect(roomRef).remove();

    // 待機リストに追加
    await set(ref(db, `waiting/${roomId}`), { uid: currentUser.uid });

    currentRoomId = roomId;

    // 相手が来るのを待つ
    roomListener = onValue(roomRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      if (data.status === 'playing' && data.players &&
        Object.keys(data.players).length >= 2) {
        onMatchFound(roomId, data, 'random');
      }
    });
  }
}

// ============ ルーム作成（フレンド対戦） ============
async function createRoom() {
  if (!currentUser) { alert('ログインが必要です。'); return; }

  const roomCode = generateRoomCode();
  const roomId = roomCode;

  const { db, ref, set, onValue, serverTimestamp, onDisconnect } = await import('./firebase.js');
  const roomRef = ref(db, `rooms/${roomId}`);
  const nickname = await getMyNickname();

  await set(roomRef, {
    status: 'waiting',
    createdAt: serverTimestamp(),
    players: {
      [currentUser.uid]: {
        nickname: nickname,
        avatar: currentUser.photoURL || '',
        hp: 1000,
        currentNumber: 0,
        combo: 0,
        connected: true,
      }
    }
  });

  onDisconnect(roomRef).remove();

  currentRoomId = roomId;
  showWaiting('友達の参加を待っています...', roomCode);

  // 相手が来るのを待つ
  roomListener = onValue(roomRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    if (data.status === 'playing' && data.players &&
      Object.keys(data.players).length >= 2) {
      onMatchFound(roomId, data, 'room');
    }
  });
}

// ============ ルームに参加（フレンド対戦） ============
async function joinRoom(code) {
  if (!currentUser) { alert('ログインが必要です。'); return; }
  if (!code || code.length !== 6) { alert('6桁のコードを入力してください。'); return; }

  const roomId = code.toUpperCase();
  const { db, ref, get, set, update } = await import('./firebase.js');
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    alert('ルームが見つかりません。コードを確認してください。');
    return;
  }

  const roomData = snapshot.val();
  if (roomData.status !== 'waiting') {
    alert('このルームはすでに対戦中です。');
    return;
  }

  showWaiting('ルームに参加しています...');
  const nickname = await getMyNickname();
  await set(ref(db, `rooms/${roomId}/players/${currentUser.uid}`), {
    nickname: nickname,
    avatar: currentUser.photoURL || '',
    hp: 1000,
    currentNumber: 0,
    combo: 0,
    connected: true,
  });

  await update(roomRef, { status: 'playing' });

  const updatedSnap = await get(roomRef);
  onMatchFound(roomId, updatedSnap.val(), 'room');
}

// ============ マッチングキャンセル ============
async function cancelMatch() {
  detachRoomListener();
  if (currentRoomId) {
    const { db, ref, remove } = await import('./firebase.js');
    await remove(ref(db, `rooms/${currentRoomId}`));
    await remove(ref(db, `waiting/${currentRoomId}`));
    currentRoomId = null;
  }
  hideWaiting();
}

// ============ イベントリスナー ============
btnRandomMatch?.addEventListener('click', startRandomMatch);
btnCreateRoom?.addEventListener('click', createRoom);
btnJoinRoom?.addEventListener('click', () => joinRoom(roomCodeInput?.value));
btnCancelMatch?.addEventListener('click', cancelMatch);
btnBackFromMatching?.addEventListener('click', async () => {
  await cancelMatch();
  showScreen(startScreen, matchingScreen);
});

// ============ 外部公開 ============
window.getCurrentOnlineUser = () => currentUser;
window.currentRoomId = () => currentRoomId;

// ★新規追加: 「もう一度対戦」が押された時に呼ばれる
window.retryVsMatch = async function (lastConfig) {
  // ゲーム画面からマッチング画面に戻す
  const gameScreen = document.getElementById('game-screen');
  gameScreen?.classList.remove('active');
  matchingScreen?.classList.add('active');

  if (lastConfig.matchType === 'room') {
    // ルーム対戦だった場合：同じルームコードで新しいルームを作り直し、再度待機する
    await createRoom();
  } else {
    // ランダムマッチだった場合：新しい相手を探し直す
    await startRandomMatch();
  }
};

// ============ レーティング表示 ============
function updateRatingDisplay(rating) {
  const el = document.getElementById('userRatingValue');
  if (el) el.textContent = rating;
}
// ============ ニックネーム設定 ============
const nicknameModal = document.getElementById('nickname-modal');
const nicknameInput = document.getElementById('nickname-input');
const btnNicknameSave = document.getElementById('btn-nickname-save');

function showNicknameModal(user) {
  // スタート画面を隠してニックネーム設定画面を表示
  startScreen?.classList.remove('active');
  nicknameModal?.classList.add('active');

  // Googleアカウント名をデフォルト値として入れる
  if (nicknameInput) nicknameInput.value = user.displayName || '';
}

async function saveNickname(user) {
  const nickname = nicknameInput?.value?.trim();
  if (!nickname || nickname.length < 2) {
    alert('2文字以上で入力してください。');
    return;
  }

  try {
    const { updateNickname, getUserData, update, ref, db } = await import('./firebase.js');
    await updateNickname(user.uid, nickname);

    // nicknameSetフラグを立てる
    const { db: database, ref: dbRef, update: dbUpdate } = await import('./firebase.js');
    const { getDatabase } = await import('https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js');
    const { ref: r, update: u } = await import('./firebase.js');
    await u(r(db, `users/${user.uid}`), { nicknameSet: true });

    // UIを更新
    if (userName) userName.textContent = nickname;

    // スタート画面に戻る
    nicknameModal?.classList.remove('active');
    startScreen?.classList.add('active');

  } catch (e) {
    console.error('ニックネーム保存エラー:', e);
    alert('保存に失敗しました。もう一度お試しください。');
  }
}

btnNicknameSave?.addEventListener('click', () => {
  const user = getFirebaseUser();
  if (user) saveNickname(user);
});

// ============ 設定モーダルからのニックネーム変更 ============
const settingsNicknameInput = document.getElementById('settings-nickname-input');
const btnSettingsNicknameSave = document.getElementById('btn-settings-nickname-save');
const settingsNicknameHint = document.getElementById('settings-nickname-hint');

btnSettingsNicknameSave?.addEventListener('click', async () => {
  const user = getFirebaseUser();
  if (!user) return;

  const nickname = settingsNicknameInput?.value?.trim();
  if (!nickname || nickname.length < 2) {
    if (settingsNicknameHint) {
      settingsNicknameHint.textContent = '⚠️ 2文字以上で入力してください。';
      settingsNicknameHint.style.color = 'var(--enemy-color)';
    }
    return;
  }

  try {
    const { updateNickname, db, ref, update } = await import('./firebase.js');
    await updateNickname(user.uid, nickname);
    await update(ref(db, `users/${user.uid}`), { nicknameSet: true });

    if (userName) userName.textContent = nickname;
    if (settingsNicknameHint) {
      settingsNicknameHint.textContent = '✅ 変更しました！';
      settingsNicknameHint.style.color = 'var(--self-color)';
    }
  } catch (e) {
    console.error('ニックネーム変更エラー:', e);
    if (settingsNicknameHint) {
      settingsNicknameHint.textContent = '⚠️ 保存に失敗しました。';
      settingsNicknameHint.style.color = 'var(--enemy-color)';
    }
  }
});

// 設定モーダルを開いたとき現在のニックネームを入力欄に反映
const btnSettings = document.getElementById('btn-settings');
btnSettings?.addEventListener('click', async () => {
  const user = getFirebaseUser();
  if (!user || !settingsNicknameInput) return;
  try {
    const { getUserData } = await import('./firebase.js');
    const data = await getUserData(user.uid);
    settingsNicknameInput.value = data?.displayName || user.displayName || '';
  } catch (e) { }
})
// ============ マイページ ============
const mypageModal = document.getElementById('mypage-modal');
const mypageCloseBtn = document.getElementById('mypageCloseBtn');

// user-infoをタップでマイページを開く
userInfo?.addEventListener('click', () => {
  openMyPage();
});

mypageCloseBtn?.addEventListener('click', () => {
  mypageModal?.classList.remove('is-open');
});

mypageModal?.addEventListener('click', (e) => {
  if (e.target === mypageModal) mypageModal.classList.remove('is-open');
});

async function openMyPage() {
  if (!currentUser) return;
  mypageModal?.classList.add('is-open');

  // プロフィール
  const avatarEl = document.getElementById('mypage-avatar');
  const nicknameEl = document.getElementById('mypage-nickname');
  const titleEl = document.getElementById('mypage-title');
  const ratingEl = document.getElementById('mypage-rating');

  if (avatarEl) avatarEl.src = currentUser.photoURL || '';

  try {
    const { getUserData } = await import('./firebase.js');
    const data = await getUserData(currentUser.uid);

    const nickname = data?.displayName || currentUser.displayName || 'Player';
    const rating = data?.rating ?? 1200;
    const wins = data?.wins ?? 0;
    const losses = data?.losses ?? 0;
    const winStreak = data?.winStreak ?? 0;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    if (nicknameEl) nicknameEl.textContent = nickname;
    if (ratingEl) ratingEl.textContent = rating;

    // 称号
    const rankTitle = getRankTitle(rating);
    if (titleEl) titleEl.textContent = rankTitle;

    // 戦績
    const winsEl = document.getElementById('mypage-wins');
    const lossesEl = document.getElementById('mypage-losses');
    const winrateEl = document.getElementById('mypage-winrate');
    const streakEl = document.getElementById('mypage-streak');
    const totalEl = document.getElementById('mypage-total-games');

    if (winsEl) winsEl.textContent = wins;
    if (lossesEl) lossesEl.textContent = losses;
    if (winrateEl) winrateEl.textContent = `${winRate}%`;
    if (streakEl) streakEl.textContent = winStreak;
    if (totalEl) totalEl.textContent = total;

  } catch (e) {
    console.error('マイページ取得エラー:', e);
  }

  // ベストスコア（localStorage から）
  const HIGH_SCORE_KEYS = {
    easy: 'primeStriker_highScore_easy',
    normal: 'primeStriker_highScore_normal',
    hard: 'primeStriker_highScore_hard',
    extreme: 'primeStriker_highScore_extreme',
  };

  const scores = {};
  let maxScore = 0;
  Object.entries(HIGH_SCORE_KEYS).forEach(([diff, key]) => {
    const s = parseInt(localStorage.getItem(key), 10) || 0;
    scores[diff] = s;
    if (s > maxScore) maxScore = s;
  });

  // ベストスコア表示
  const bestOverallEl = document.getElementById('mypage-best-overall');
  if (bestOverallEl) bestOverallEl.textContent = maxScore.toLocaleString();

  Object.entries(scores).forEach(([diff, score]) => {
    const valEl = document.getElementById(`mypage-score-${diff}`);
    const barEl = document.getElementById(`mypage-bar-${diff}`);
    if (valEl) valEl.textContent = score.toLocaleString();
    if (barEl) {
      // アニメーション用に少し遅延させてからwidthを設定
      setTimeout(() => {
        barEl.style.width = maxScore > 0 ? `${(score / maxScore) * 100}%` : '0%';
      }, 100);
    }
  });
}

// 称号を返す関数
function getRankTitle(rating) {
  if (rating >= 1600) return '👑 素因数分解王';
  if (rating >= 1400) return '⚡ 素数の達人';
  if (rating >= 1200) return '🔥 因数分解師';
  if (rating >= 1000) return '🌱 素数探索者';
  return '📖 見習い計算士';
};
