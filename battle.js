// ---------- 1. 状態変数 ----------
let currentNumber = 0;
let startNumber = 0;
let step = 0;
let combo = 0;
let maxCombo = 0;
let usedPrimesThisRound = []; // ★追加: 今回の数字を分解する際に実際に使った素数を記録（難易度計算用）

const maxHP = 1000;
let currentHP = 1000;
let enemyHP = 1000;

let isStunned = false;
let isPaused = false;


// ステータス定数
const ATK = 10;
const DEF = 10;
const enemyDEF = 10;
const CL = 1;

// スコア（1人プレイ用）
let totalScore = 0;

// タイマー関連
const TIME_LIMIT = 120;
let remainingTime = TIME_LIMIT;
let timerId = null;
let isGameOver = false;

// ---------- DOM要素の取得 ----------
const comboDisplay = document.getElementById('comboNum');
const scoreDisplayValue = document.getElementById('score-value');
const scoreDisplayArea = document.getElementById('score-display');
const primeButtons = document.querySelectorAll('.prime-btn');
const mainArea = document.getElementById('mainArea');
const selfHpRow = document.getElementById('selfHpRow');
const enemyHpRow = document.getElementById('enemyHpRow');
const hpRowsArea = document.getElementById('hp-rows');
const timerValueDisplay = document.getElementById('timerValue');
const resultScreen = document.getElementById('result-screen');
const resultMessage = document.getElementById('resultMessage');
const resultScoreValue = document.getElementById('resultScore'); // ※前回の「resultTotalDamage」を「resultScore」に変更
const resultMaxComboValue = document.getElementById('resultMaxCombo');
const btnRetry = document.getElementById('btn-retry');
const btnToTitle = document.getElementById('btn-to-title');
const soundIconBtn = document.getElementById('soundIconBtn');
const soundPanel = document.getElementById('soundPanel');
const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
const seVolumeSlider = document.getElementById('seVolumeSlider');

const bgmLabel = document.getElementById('bgmLabel');
const seLabel = document.getElementById('seLabel');

const VOLUME_KEY_BGM = 'primeStriker_bgmVolume';
const VOLUME_KEY_SE = 'primeStriker_seVolume';

const bgmAudio = document.getElementById('bgm');
const BGM_VOLUME = 0.5; // 好みに応じて0.0〜1.0で調整

let lastConfig = null;
// ★追加: ハイスコア関連
const HIGH_SCORE_KEY = 'primeStriker_highScore'; // localStorageに保存するキー名
const highScoreValueDisplay = document.getElementById('highScoreValue');
const newRecordBadge = document.getElementById('newRecordBadge');

// localStorageからハイスコアを読み込む（保存が無い場合は0）
function getHighScore() {
  const saved = localStorage.getItem(HIGH_SCORE_KEY);
  const num = parseInt(saved, 10);
  return Number.isNaN(num) ? 0 : num;
}

// ハイスコアをlocalStorageに保存する
function setHighScore(score) {
  localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)));
}

// スタート画面のハイスコア表示を更新する
function updateHighScoreDisplay() {
  if (highScoreValueDisplay) {
    highScoreValueDisplay.textContent = getHighScore();
  }
}

// 今回のスコアがハイスコアを更新したかチェックし、更新があれば保存して true を返す
function checkAndUpdateHighScore(finalScore) {
  const current = getHighScore();
  if (finalScore > current) {
    setHighScore(finalScore);
    return true; // 新記録達成
  }
  return false; // 更新なし
}

// ★追加: ページ読み込み時に一度、スタート画面のハイスコアを表示しておく
updateHighScoreDisplay();

const GameStartSound = new Audio('音声/決定ボタンを押す47.mp3');
const DivdeSuccessSound = new Audio('音声/カーソル移動12.mp3');
const DivdemissSound = new Audio('音声/ビープ音4.mp3');
const ClearSound = new Audio('音声/成功音.mp3');
const EndingSound = new Audio('音声/試合終了のゴング.mp3');

window. allSeAudios = [
  GameStartSound,
  DivdeSuccessSound,
  DivdemissSound,
  ClearSound,
  EndingSound
];
// 早押しなどで再生が競合しエラーになっても、ゲームの他の処理を止めないようにする
function playSe(audio) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 再生エラーは無視する（早押し時の競合などで発生するが、ゲーム進行には影響させない）
      });
    }
  } catch (e) {
    // 念のため例外も握りつぶす
  }
}
// ★追加: 効果音全体の音量を一括変更する
function setSeVolume(volume0to1) {
  if (window.allSeAudios) {
    window.allSeAudios.forEach(audio => {
      audio.volume = volume0to1;
    });
  }
}

// ★追加: BGMの音量を変更する
function setBgmVolumeLevel(volume0to1) {
  if (bgmAudio) {
    bgmAudio.volume = volume0to1;
  }
}

// ★追加: 保存されている音量をlocalStorageから読み込み、初期適用する
function loadVolumeSettings() {
  const savedBgm = localStorage.getItem(VOLUME_KEY_BGM);
  const savedSe = localStorage.getItem(VOLUME_KEY_SE);

  const bgmPercent = savedBgm !== null ? parseInt(savedBgm, 10) : 50;
  const sePercent = savedSe !== null ? parseInt(savedSe, 10) : 80;

  if (bgmVolumeSlider) bgmVolumeSlider.value = bgmPercent;
  if (seVolumeSlider) seVolumeSlider.value = sePercent;

  setBgmVolumeLevel(bgmPercent / 100);
  setSeVolume(sePercent / 100);

  updateMuteLabel(bgmLabel, bgmPercent); // ★追加: 起動時にも反映
  updateMuteLabel(seLabel, sePercent);   // ★追加: 起動時にも反映
}

// ★追加: アイコンクリックでパネルの開閉
if (soundIconBtn && soundPanel) {
  soundIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    soundPanel.classList.toggle('is-open');
  });

  // パネル外をクリックしたら閉じる
  document.addEventListener('click', (e) => {
    if (!soundPanel.contains(e.target) && e.target !== soundIconBtn) {
      soundPanel.classList.remove('is-open');
    }
  });
}

if (bgmVolumeSlider) {
  bgmVolumeSlider.addEventListener('input', () => {
    const percent = parseInt(bgmVolumeSlider.value, 10);
    setBgmVolumeLevel(percent / 100);
    localStorage.setItem(VOLUME_KEY_BGM, String(percent));
    updateMuteLabel(bgmLabel, percent); // ★追加
  });
}

if (seVolumeSlider) {
  seVolumeSlider.addEventListener('input', () => {
    const percent = parseInt(seVolumeSlider.value, 10);
    setSeVolume(percent / 100);
    localStorage.setItem(VOLUME_KEY_SE, String(percent));
    updateMuteLabel(seLabel, percent); // ★追加
  });
}

// ★新規追加: 音量が0ならラベルに斜線(is-mutedクラス)を付ける
function updateMuteLabel(labelEl, percent) {
  if (!labelEl) return;
  labelEl.classList.toggle('is-muted', percent === 0);
}

// ★追加: ページ読み込み時に保存済みの音量を復元
loadVolumeSettings();

// ===================================================
// フォントサイズ調整ロジック
// ===================================================
function fitNumberFontSize() {
  const el = document.getElementById('currentNumber');
  if (!el) return;

  const container = el.closest('.main-area');
  if (!container) return;

  // コンテナが表示されていない場合は計算をスキップ（または次フレームで再試行）
  if (container.clientWidth === 0) {
    requestAnimationFrame(fitNumberFontSize);
    return;
  }

  const containerStyle = getComputedStyle(container);
  const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
  const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
  const maxWidth = container.clientWidth - paddingLeft - paddingRight - 32; // 余白を少し多めに確保

  const maxFontSize = 140;
  const minFontSize = 32;

  // 1. まず最大サイズに設定して幅を測る
  el.style.fontSize = `${maxFontSize}px`;
  const currentWidth = el.scrollWidth;

  // 2. 幅がオーバーしている場合のみ縮小計算を行う
  if (currentWidth > maxWidth) {
    let fontSize = Math.floor(maxFontSize * (maxWidth / currentWidth));
    fontSize = Math.max(minFontSize, fontSize);
    el.style.fontSize = `${fontSize}px`;
  }
}
function playBgm() {
  if (!bgmAudio) return;
  // ★削除: bgmAudio.volume = BGM_VOLUME; → スライダーで設定済みの音量を維持するため削除
  bgmAudio.currentTime = 0;

  const playPromise = bgmAudio.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.warn('BGMの再生がブロックされました:', err);
    });
  }
}

// ★新規追加: BGM停止
function stopBgm() {
  if (!bgmAudio) return;
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
}

// Webフォント読み込み完了時に再計算
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    fitNumberFontSize();
  });
}

// ウィンドウリサイズ時にも再計算
window.addEventListener('resize', fitNumberFontSize);


// ===================================================
// 2. ゲーム開始・停止処理
// ===================================================
window.startBattle = function(config) {
  lastConfig = config;
  const isSolo = config.mode === 'solo';
  
  if (isSolo) {
    hpRowsArea.classList.add('is-hidden');
    scoreDisplayArea.classList.remove('is-hidden');
  } else {
    hpRowsArea.classList.remove('is-hidden');
    scoreDisplayArea.classList.add('is-hidden');
  }

  initGame();
  playBgm(); // ★追加: ゲーム開始と同時にBGM再生

  requestAnimationFrame(() => {
    fitNumberFontSize();
  });
};

window.stopBattle = function() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  isGameOver = true;
  stopBgm(); // ★追加: ゲーム中断時にBGM停止
};

function initGame() {
  playSe(GameStartSound);
  startNumber = generateInitialNumber();
  currentNumber = startNumber;
  step = 0;
  combo = 0;
  maxCombo = 0
  usedPrimesThisRound = [];
  currentHP = maxHP;
  enemyHP = maxHP;
  totalScore = 0;
  isStunned = false;
  isPaused = false;
  isGameOver = false;
  remainingTime = TIME_LIMIT;

  updateNumberUI();
  updateHPUI();
  updateEnemyHPUI();
  updateComboUI();
  updateScoreUI();
  updateTimerUI();

  primeButtons.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('is-correct', 'is-wrong');
  });

  if (timerId) {
    clearInterval(timerId);
  }
  hideResultScreen();
  startTimer();
}

// ===================================================
// 3. ボタン押下処理
// ===================================================
function onPrimeClick(p, btn) {
  if (isStunned || isGameOver || isPaused) return;

  if (currentNumber % p === 0) {
    currentNumber = Math.floor(currentNumber / p);
    step++;
    usedPrimesThisRound.push(p);
    
    btn.classList.add('is-correct');
    setTimeout(() => btn.classList.remove('is-correct'), 200);

    if (currentNumber === 1) {
      handleComplete();
      playSe(ClearSound);
    } else {
      playSe(DivdeSuccessSound);
      updateNumberUI();
    }
  } else {
    playSe(DivdemissSound);
    btn.classList.add('is-wrong');
    setTimeout(() => btn.classList.remove('is-wrong'), 200);
    handleMiss();
  }
}

// ===================================================
// 4. ミス処理
// ===================================================
function handleMiss() {
  isStunned = true;
  combo = 0;

  // ダメージ計算（1人プレイでも内部的にHPを減らしてゲームオーバー条件にする）
  let damage = maxHP * 0.1; // ミスで10%減少
  currentHP -= damage;
  if (currentHP < 0) currentHP = 0;

  updateHPUI();
  updateComboUI();

  mainArea.classList.add('is-stunned');

  if (currentHP <= 0) {
    handleGameOver();
    return;
  }

  setTimeout(() => {
    if (!isPaused) {           // 一時停止中はスタン解除しない
      isStunned = false;
      mainArea.classList.remove('is-stunned');
    }
  }, 500);
}

// ===================================================
// 5. 完了処理
// ===================================================
function handleComplete() {
  // ★変更: スコア計算を「使った素数の難易度」基準に変更
  // 大きい素数（17, 19, 23, 29など）を使うほど高評価になり、
  // 単純な2の繰り返しだけでは高得点にならないようにする
  const difficultySum = usedPrimesThisRound.reduce((sum, p) => sum + p, 0);
  const comboMultiplier = 1 + combo * 0.05; // ★変更: コンボの影響は0.1→0.05に弱め、「少しだけ」反映する程度にする

  let addedScore = Math.floor((difficultySum * 12 + step * 5) * comboMultiplier);
  totalScore += addedScore;
  
  combo++;
  if (combo > maxCombo) {
    maxCombo = combo;
  }

  // 次の問題へ
  startNumber = generateNextNumber(startNumber);
  currentNumber = startNumber;
  step = 0;
  usedPrimesThisRound = []; // ★追加: 次のラウンドのためにリセット

  updateNumberUI();
  updateComboUI();
  updateScoreUI();
}

// ===================================================
// 6. タイマー処理
// ===================================================
function startTimer() {
  timerId = setInterval(() => {
    if (isPaused) return;      // 一時停止中はカウントしない

    remainingTime--;
    updateTimerUI();

    if (remainingTime <= 0) {
      handleGameOver();
    }
  }, 1000);
}

function handleGameOver() {
  if (isGameOver) return;
  isGameOver = true;

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  stopBgm(); // ★追加: ゲーム終了（クリア/タイムアップ/HP0）時にBGM停止

  primeButtons.forEach(btn => {
    btn.disabled = true;
  });

  let message;
  if (remainingTime <= 0) {
    playSe(EndingSound);
    message = 'TIME UP!';
  } else if (currentHP <= 0) {
    playSe(EndingSound);
    message = 'GAME OVER (HP 0)';
  } else {
    playSe(EndingSound);
    message = 'FINISH!';
  }

  // ★追加: ハイスコア判定（保存とフラグ取得）
  const isNewRecord = checkAndUpdateHighScore(totalScore);

  showResultScreen(message, isNewRecord); // ★isNewRecordを渡す

  if (typeof window.onGameOver === 'function') {
    window.onGameOver({ score: totalScore, maxCombo: maxCombo, isNewRecord: isNewRecord });
  }
}

// ===================================================
// UI更新関数
// ===================================================
function updateNumberUI() {
  const numberDisplay = document.getElementById("currentNumber");
  if (numberDisplay) {
    numberDisplay.textContent = currentNumber;
    fitNumberFontSize();
  }
}

function updateHPUI() {
  const pct = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
  const fill = document.getElementById('selfHpFill');
  const text = document.getElementById('selfHpText');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${Math.ceil(currentHP)}/${maxHP}`;
}

function updateEnemyHPUI() {
  const pct = Math.max(0, Math.min(100, (enemyHP / maxHP) * 100));
  const fill = document.getElementById('enemyHpFill');
  const text = document.getElementById('enemyHpText');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${Math.ceil(enemyHP)}/${maxHP}`;
}

function updateComboUI() {
  if (comboDisplay) {
    comboDisplay.textContent = combo;
  }
}

function updateScoreUI() {
  if (scoreDisplayValue) {
    scoreDisplayValue.textContent = Math.floor(totalScore);
  }
}
function showResultScreen(message, isNewRecord) {
  if (!resultScreen) return;
  if (resultMessage) resultMessage.textContent = message;
  if (resultScoreValue) resultScoreValue.textContent = Math.floor(totalScore);
  if (resultMaxComboValue) resultMaxComboValue.textContent = maxCombo;

  // ★追加: 新記録の場合のみバッジを表示
  if (newRecordBadge) {
    newRecordBadge.classList.toggle('is-hidden', !isNewRecord);
  }

  resultScreen.classList.add('is-visible');
}

function hideResultScreen() {
  if (!resultScreen) return;
  resultScreen.classList.remove('is-visible');
}

function updateTimerUI() {
  if (timerValueDisplay) {
    timerValueDisplay.textContent = remainingTime;
    if (remainingTime <= 10) {
      timerValueDisplay.classList.add('is-warning');
    } else {
      timerValueDisplay.classList.remove('is-warning');
    }
  }
}


// ===================================================
// 7. ボタンへのイベントリスナー登録
// ===================================================
primeButtons.forEach(btn => {
  const p = parseInt(btn.dataset.prime, 10);
  btn.addEventListener('click', () => {
    onPrimeClick(p, btn);
  });
});
// ★新規追加
if (btnRetry) {
  btnRetry.addEventListener('click', () => {
    if (lastConfig) {
      window.startBattle(lastConfig); // 直前と同じモードで再開
    } else {
      initGame(); // configが無い場合のフォールバック
    }
  });
}

if (btnToTitle) {
  btnToTitle.addEventListener('click', () => {
    window.stopBattle();
    hideResultScreen();
    updateHighScoreDisplay();

    if (typeof window.onGameOver === 'function') {
      // すでにhandleGameOver内で呼ばれているため、ここでは呼ばない
    }
    if (typeof showTitleScreen === 'function') {
      showTitleScreen();
    } else {
      document.getElementById('gameScreen')?.classList.remove('active');
      document.getElementById('start-screen')?.classList.add('active');
    }
  });
}
window.addEventListener('resize', () => {
  fitNumberFontSize();
})
// ===================================================
// 一時停止 / 再開
// ===================================================
const pauseOverlay = document.getElementById('pause-overlay');
const pauseBtn     = document.getElementById('pauseBtn');
const resumeBtn    = document.getElementById('resumeBtn');

function pause() {
  if (isGameOver || isPaused) return;
  isPaused = true;
  pauseOverlay.classList.add('is-visible');
  primeButtons.forEach(btn => btn.disabled = true);
}

function resume() {
  if (!isPaused) return;
  isPaused = false;
  pauseOverlay.classList.remove('is-visible');

  // スタン中でなければボタンを再有効化
  if (!isStunned) {
    primeButtons.forEach(btn => btn.disabled = false);
  }
}

function togglePause() {
  if (isGameOver) return;
  isPaused ? resume() : pause();
}

// ボタンクリック
if (pauseBtn)  pauseBtn.addEventListener('click',  () => togglePause());
if (resumeBtn) resumeBtn.addEventListener('click', () => resume());

// キーボード
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // ゲーム中のみ有効（リザルト表示中は無視）
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen && gameScreen.classList.contains('active') && !isGameOver) {
      e.preventDefault();
      pause();
    }
  }
  if (e.key === 'Enter') {
    if (isPaused) {
      e.preventDefault();
      resume();
    }
  }
});
;
