// online.js
import { loginWithGoogle, logout, onAuthChanged, getCurrentUser } from './firebase.js';

// ============ 画面要素 ============
const loginScreen     = document.getElementById('login-screen');
const startScreen     = document.getElementById('start-screen');
const btnGoogleLogin  = document.getElementById('btn-google-login');
const btnGuestLogin   = document.getElementById('btn-guest-login');
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
export function getCurrentUser() {
  return currentUser;
}
// ============ ユーザー情報の表示 ============
const userInfo   = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName   = document.getElementById('user-name');
const btnLogout  = document.getElementById('btn-logout');

function updateUserInfoUI(user) {
  if (!userInfo) return;
  if (user) {
    userInfo.classList.remove('is-hidden');
    if (userAvatar) userAvatar.src = user.photoURL || '';
    if (userName)   userName.textContent = user.displayName || 'プレイヤー';
  } else {
    userInfo.classList.add('is-hidden');
  }
}

// ログイン・ゲスト時にUI更新
const _onLoggedIn = onLoggedIn;
function onLoggedInWithUI(user) {
  _onLoggedIn(user);
  updateUserInfoUI(user);
}

btnLogout?.addEventListener('click', async () => {
  await logout();
  currentUser = null;
  updateUserInfoUI(null);
  showScreen(loginScreen, startScreen);
});
// ============ マッチング画面の要素 ============
const matchingScreen        = document.getElementById('matching-screen');
const btnRandomMatch        = document.getElementById('btn-random-match');
const btnCreateRoom         = document.getElementById('btn-create-room');
const btnJoinRoom           = document.getElementById('btn-join-room');
const roomCodeInput         = document.getElementById('room-code-input');
const waitingBox            = document.getElementById('waiting-box');
const waitingText           = document.getElementById('waiting-text');
const waitingRoomCode       = document.getElementById('waiting-room-code');
const btnCancelMatch        = document.getElementById('btn-cancel-match');
const btnBackFromMatching   = document.getElementById('btn-back-to-start-from-matching');

let currentRoomId = null;
let roomListener  = null;

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
function onMatchFound(roomId, roomData) {
  detachRoomListener();
  currentRoomId = roomId;
  hideWaiting();

  // game-screenに切り替えてオンライン対戦開始
  const gameScreen    = document.getElementById('game-screen');
  if (matchingScreen) matchingScreen.classList.remove('active');
  if (gameScreen)     gameScreen.classList.add('active');

  if (typeof window.playBgm === 'function') window.playBgm();
  if (typeof window.startBattle === 'function') {
    window.startBattle({ mode: 'vs', roomId, roomData });
  }
}

// ============ ランダムマッチ ============
async function startRandomMatch() {
  if (!currentUser) { alert('ログインが必要です。'); return; }

  showWaiting('相手を探しています...');

  const { db, ref, get, set, onValue, serverTimestamp, onDisconnect, remove } = await import('./firebase.js');

  const waitingRef = ref(db, 'waiting');
  const snapshot   = await get(waitingRef);

  if (snapshot.exists()) {
    // 待機中のルームがある → 参加
    const waitingData = snapshot.val();
    const roomId      = Object.keys(waitingData)[0];
    const roomRef     = ref(db, `rooms/${roomId}`);

    // 自分の情報を追加してゲーム開始
    await set(ref(db, `rooms/${roomId}/players/${currentUser.uid}`), {
      nickname:      currentUser.displayName || 'Guest',
      avatar:        currentUser.photoURL    || '',
      hp:            1000,
      currentNumber: 0,
      combo:         0,
      connected:     true,
    });

    // 待機リストから削除
    await remove(ref(db, `waiting/${roomId}`));

    // ルームのstatusをplayingに更新
    await set(ref(db, `rooms/${roomId}/status`), 'playing');

    const roomSnapshot = await get(roomRef);
    onMatchFound(roomId, roomSnapshot.val());

  } else {
    // 待機中のルームがない → 新規作成して待機
    const roomCode = generateRoomCode();
    const roomId   = roomCode;
    const roomRef  = ref(db, `rooms/${roomId}`);

    await set(roomRef, {
      status:    'waiting',
      createdAt: serverTimestamp(),
      players: {
        [currentUser.uid]: {
          nickname:      currentUser.displayName || 'Guest',
          avatar:        currentUser.photoURL    || '',
          hp:            1000,
          currentNumber: 0,
          combo:         0,
          connected:     true,
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
        onMatchFound(roomId, data);
      }
    });
  }
}

// ============ ルーム作成（フレンド対戦） ============
async function createRoom() {
  if (!currentUser) { alert('ログインが必要です。'); return; }

  const roomCode = generateRoomCode();
  const roomId   = roomCode;

  const { db, ref, set, onValue, serverTimestamp, onDisconnect } = await import('./firebase.js');
  const roomRef = ref(db, `rooms/${roomId}`);

  await set(roomRef, {
    status:    'waiting',
    createdAt: serverTimestamp(),
    players: {
      [currentUser.uid]: {
        nickname:      currentUser.displayName || 'Guest',
        avatar:        currentUser.photoURL    || '',
        hp:            1000,
        currentNumber: 0,
        combo:         0,
        connected:     true,
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
      onMatchFound(roomId, data);
    }
  });
}

// ============ ルームに参加（フレンド対戦） ============
async function joinRoom(code) {
  if (!currentUser) { alert('ログインが必要です。'); return; }
  if (!code || code.length !== 6) { alert('6桁のコードを入力してください。'); return; }

  const roomId  = code.toUpperCase();
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

  await set(ref(db, `rooms/${roomId}/players/${currentUser.uid}`), {
    nickname:      currentUser.displayName || 'Guest',
    avatar:        currentUser.photoURL    || '',
    hp:            1000,
    currentNumber: 0,
    combo:         0,
    connected:     true,
  });

  await update(roomRef, { status: 'playing' });

  const updatedSnap = await get(roomRef);
  onMatchFound(roomId, updatedSnap.val());
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
btnCreateRoom?.addEventListener('click',  createRoom);
btnJoinRoom?.addEventListener('click',    () => joinRoom(roomCodeInput?.value));
btnCancelMatch?.addEventListener('click', cancelMatch);
btnBackFromMatching?.addEventListener('click', async () => {
  await cancelMatch();
  showScreen(startScreen, matchingScreen);
});

// ============ 外部公開 ============
window.getCurrentOnlineUser = () => currentUser;
window.currentRoomId        = () => currentRoomId;

export { currentUser };
