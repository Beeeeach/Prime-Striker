// ---------- 1. 状態変数 ----------
let currentNumber = 0;
let startNumber = 0;
let step = 0;
let combo = 0;
let maxCombo = 0;

const maxHP = 1000;
let currentHP = 1000;
let enemyHP = 1000;

let isStunned = false;

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

let lastConfig = null;

const GameStartSound = new Audio('音声/決定ボタンを押す47.mp3');
const DivdeSuccessSound = new Audio('音声/カーソル移動12.mp3');
const DivdemissSound = new Audio('音声/ビープ音4.mp3');
const ClearSound = new Audio('音声/成功音.mp3');

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
  
  // 表示の切り替え
  if (isSolo) {
    hpRowsArea.classList.add('is-hidden');
    scoreDisplayArea.classList.remove('is-hidden');
  } else {
    hpRowsArea.classList.remove('is-hidden');
    scoreDisplayArea.classList.add('is-hidden');
  }

  initGame();

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
};

function initGame() {
  GameStartSound .currentTime = 0; 
  GameStartSound .play();
  startNumber = generateInitialNumber();
  currentNumber = startNumber;
  step = 0;
  combo = 0;
  maxCombo = 0
  currentHP = maxHP;
  enemyHP = maxHP;
  totalScore = 0;
  isStunned = false;
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
  if (isStunned || isGameOver) return;

  if (currentNumber % p === 0) {
    // 正解
    currentNumber = Math.floor(currentNumber / p);
    step++;
    
    btn.classList.add('is-correct');
    setTimeout(() => btn.classList.remove('is-correct'), 200);

    if (currentNumber === 1) {
      handleComplete();
      ClearSound .currentTime = 0;
      ClearSound .play();
    } else {
      DivdeSuccessSound .currentTime = 0;
      DivdeSuccessSound .play();
      updateNumberUI();
    }
  } else {
    // 不正解
    DivdemissSound .currentTime = 0;
    DivdemissSound .play();
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
    isStunned = false;
    mainArea.classList.remove('is-stunned');
  }, 500);
}

// ===================================================
// 5. 完了処理
// ===================================================
function handleComplete() {
  // スコア計算
  let addedScore = Math.floor((Math.log2(startNumber) * 100 + step * 50) * (1 + combo * 0.1));
  totalScore += addedScore;
  
  combo++;
  if (combo > maxCombo) { // ★追加
    maxCombo = combo;
  }

  // 次の問題へ
  startNumber = generateNextNumber(startNumber);
  currentNumber = startNumber;
  step = 0;

  updateNumberUI();
  updateComboUI();
  updateScoreUI();
}

// ===================================================
// 6. タイマー処理
// ===================================================
function startTimer() {
  timerId = setInterval(() => {
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

  primeButtons.forEach(btn => {
    btn.disabled = true;
  });

  let message;
  if (remainingTime <= 0) {
    message = 'TIME UP!';
  } else if (currentHP <= 0) {
    message = 'GAME OVER (HP 0)';
  } else {
    message = 'FINISH!';
  }

  showResultScreen(message); // ★ alert()を撤廃し、リザルト画面表示に置き換え

  if (typeof window.onGameOver === 'function') {
    window.onGameOver({ score: totalScore, maxCombo: maxCombo }); // ★maxComboも一緒に渡す
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
function showResultScreen(message) {
  if (!resultScreen) return;
  if (resultMessage) resultMessage.textContent = message;
  if (resultScoreValue) resultScoreValue.textContent = Math.floor(totalScore);
  if (resultMaxComboValue) resultMaxComboValue.textContent = maxCombo;
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
});
