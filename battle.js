// 先頭に追加
import { generateInitialNumber, generateNextNumber, randomInt, randomFloat, DIFFICULTY_CONFIG } from './game.js';

// ★新規追加: シェア用の難易度表示名・ハッシュタグ
const DIFFICULTY_SHARE_INFO = {
  easy: { label: 'EASY', tag: 'EASY' },
  normal: { label: 'NORMAL', tag: 'NORMAL' },
  hard: { label: 'HARD', tag: 'HARD' },
  extreme: { label: 'EXTREME', tag: 'EXTREME' },
};

const GAME_URL = 'https://beeeeach.github.io/Prime-Striker/';
// ---------- 1. 状態変数 ----------
let currentNumber = 0;
let startNumber = 0;
let step = 0;
let combo = 0;
let maxCombo = 0;
let usedPrimesThisRound = []; // ★追加: 今回の数字を分解する際に実際に使った素数を記録（難易度計算用）

let maxHP = 1000;
let currentHP = 1000;
let enemyHP = 1000;

let isStunned = false;
let isPaused = false;
let currentDifficulty = 'easy';

// VS モード用状態変数
let vsMode = false;
let vsRoomId = null;
let vsMyUid = null;
let vsOpponentUid = null;
let vsUnsubscribe = null;



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
const countdownOverlay = document.getElementById('countdownOverlay'); // ★追加
const countdownNumber = document.getElementById('countdownNumber');   // ★追加
const selfHpRow = document.getElementById('selfHpRow');
const enemyHpRow = document.getElementById('enemyHpRow');
const enemyNicknameTag = document.getElementById('enemyNicknameTag'); // ★追加
const enemyRatingRow = document.getElementById('enemyRatingRow');     // ★追加
const enemyRatingValue = document.getElementById('enemyRatingValue'); // ★追加
const hpRowsArea = document.getElementById('hp-rows');
const timerValueDisplay = document.getElementById('timerValue');
const resultScreen = document.getElementById('result-screen');
const resultMessage = document.getElementById('resultMessage');
const resultScoreValue = document.getElementById('resultScore'); // ※前回の「resultTotalDamage」を「resultScore」に変更
const resultMaxComboValue = document.getElementById('resultMaxCombo');
const btnRetry = document.getElementById('btn-retry');
const btnToTitle = document.getElementById('btn-to-title');
const btnShareX = document.getElementById('btn-share-x');
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
const HIGH_SCORE_KEYS = {
  easy: 'primeStriker_highScore_easy',
  normal: 'primeStriker_highScore_normal',
  hard: 'primeStriker_highScore_hard',
  extreme: 'primeStriker_highScore_extreme',
};
const highScoreValueDisplay = document.getElementById('highScoreValue');
const newRecordBadge = document.getElementById('newRecordBadge');

function getHighScore(difficulty) {
  const key = HIGH_SCORE_KEYS[difficulty] || HIGH_SCORE_KEYS.easy;
  const num = parseInt(localStorage.getItem(key), 10);
  return Number.isNaN(num) ? 0 : num;
}

function setHighScore(difficulty, score) {
  const key = HIGH_SCORE_KEYS[difficulty] || HIGH_SCORE_KEYS.easy;
  localStorage.setItem(key, String(Math.floor(score)));
}

function getOverallBestScore() {
  return Math.max(...Object.keys(HIGH_SCORE_KEYS).map(d => getHighScore(d)));
}

function updateHighScoreDisplay() {
  if (highScoreValueDisplay) {
    highScoreValueDisplay.textContent = getOverallBestScore();
  }
}

// ★追加: 難易度選択画面のハイスコアを更新
window.updateDifficultyHighScores = function () {
  Object.keys(HIGH_SCORE_KEYS).forEach(difficulty => {
    const el = document.getElementById(`highScore-${difficulty}`);
    if (el) el.textContent = getHighScore(difficulty);
  });
};

// 難易度選択画面の各ボタンにベストスコアを反映（menu.jsからも呼べるようwindowに公開）
window.resetAllHighScores = function () {
  Object.keys(HIGH_SCORE_KEYS).forEach(difficulty => {
    const key = HIGH_SCORE_KEYS[difficulty];
    localStorage.removeItem(key);

    // 難易度選択画面の表示をリセット
    const el = document.getElementById(`highScore-${difficulty}`);
    if (el) el.textContent = '0';
  });

  // スタート画面のハイスコア表示もリセット
  updateHighScoreDisplay();
};

function checkAndUpdateHighScore(finalScore) {
  const current = getHighScore(currentDifficulty);
  if (finalScore > current) {
    setHighScore(currentDifficulty, finalScore);

    // ★追加: ログインユーザーならグローバルランキングにも送信
    (async () => {
      try {
        const { submitScoreToLeaderboard } = await import('./firebase.js');
        await submitScoreToLeaderboard(currentDifficulty, finalScore);
      } catch (e) {
        console.error('ランキング送信エラー:', e);
      }
    })();

    return true;
  }
  return false;
}

// ★追加: ページ読み込み時に一度、スタート画面のハイスコアを表示しておく
updateHighScoreDisplay();
document.addEventListener('DOMContentLoaded', () => {
  window.updateDifficultyHighScores();
});

const GameStartSound = new Audio('音声/start.mp3');
const DivdeSuccessSound = new Audio('音声/divide.mp3');
const DivdemissSound = new Audio('音声/miss.mp3');
const ClearSound = new Audio('音声/clear.mp3');
const EndingSound = new Audio('音声/ending.mp3');
const CountdownTickSound = new Audio('音声/countdown.mp3')

window.allSeAudios = [
  GameStartSound,
  DivdeSuccessSound,
  DivdemissSound,
  ClearSound,
  EndingSound,
  CountdownTickSound,
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

// ★新規追加: 3,2,1,GO! のカウントダウンを表示し、終わったらコールバックを呼ぶ
function runCountdown(onComplete) {
  if (!countdownOverlay || !countdownNumber) {
    onComplete();
    return;
  }

  const steps = ['3', '2', '1', 'GO!'];
  let index = 0;

  countdownOverlay.classList.add('is-visible');
  primeButtons.forEach(btn => btn.disabled = true);

  function showNext() {
    if (index >= steps.length) {
      // ★変更: カウントダウン完了後にオーバーレイを消してBGMを鳴らしてからコールバック
      countdownOverlay.classList.remove('is-visible');
      playBgm(); // ★移動: ここで初めてBGMを開始する
      onComplete();
      return;
    }

    const value = steps[index];
    countdownNumber.textContent = value;
    countdownNumber.classList.toggle('is-go', value === 'GO!');

    // ★追加: 表示内容に合わせて効果音を鳴らす
    if (value === 'GO!') {
      playSe(GameStartSound);
    } else {
      playSe(CountdownTickSound);
    }

    countdownNumber.style.animation = 'none';
    void countdownNumber.offsetWidth;
    countdownNumber.style.animation = '';

    index++;
    setTimeout(showNext, 1000);
  }

  showNext();
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
window.startBattle = function (config) {
  lastConfig = config;
  vsMode = config.mode === 'vs'; // ★変更: 先にvsModeを確定させる
  currentDifficulty = vsMode ? 'hard' : (config.difficulty || 'easy'); // ★変更: 確定後のvsModeを使って判定


  maxHP = vsMode ? 30000 : 1000;

  const isSolo = !vsMode;

  if (isSolo) {
    hpRowsArea.classList.add('is-hidden');
    scoreDisplayArea.classList.remove('is-hidden');
    document.querySelector('.timer-row')?.style.removeProperty('display');
    pauseBtn?.classList.remove('is-hidden');
  } else {
    hpRowsArea.classList.remove('is-hidden');
    scoreDisplayArea.classList.add('is-hidden');
    document.querySelector('.timer-row')?.style.setProperty('display', 'none');
    pauseBtn?.classList.add('is-hidden');
  }

  initGame(currentDifficulty);

  if (vsMode) {
    initVsBattle(config); // ★追加
  }

  requestAnimationFrame(() => {
    fitNumberFontSize();
  });
};

window.stopBattle = function () {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  isGameOver = true;
  vsMode = false;
  if (vsUnsubscribe) {  // ★追加: Firebaseリスナー解除
    vsUnsubscribe();
    vsUnsubscribe = null;
  }
  stopBgm();
};
function updatePrimeButtons() {
  const config = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.easy;
  const activeSet = new Set(config.primes);
  const controlArea = document.getElementById('controlArea');

  primeButtons.forEach(btn => {
    const p = parseInt(btn.dataset.prime, 10);
    btn.style.display = activeSet.has(p) ? '' : 'none';
  });

  // EASYは3列、それ以外は5列
  if (controlArea) {
    controlArea.style.gridTemplateColumns =
      config.primes.length <= 6 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)';
  }
}

// 引数として difficulty を受け取るように変更
function initGame(difficulty) {

  // 引数で指定された難易度、指定がなければ現在の難易度を使う
  currentDifficulty = difficulty || currentDifficulty;

  // ★修正：generateInitialNumber に難易度を明示的に渡す
  // （もしgame.jsの仕様が generateInitialNumber(currentDifficulty) であればこのように書き換えます）
  startNumber = generateInitialNumber(currentDifficulty);

  currentNumber = startNumber;
  updateEnemyInfoUI(null, null);
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

  // ここで確実に hard のボタンが配置されます
  updatePrimeButtons();

  updateNumberUI();
  updateHPUI();
  updateEnemyHPUI();
  updateComboUI();
  updateScoreUI();
  updateTimerUI();

  primeButtons.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('is-correct', 'is-wrong');
  });

  if (timerId) {
    clearInterval(timerId);
  }
  hideResultScreen();
  runCountdown(() => {
    primeButtons.forEach(btn => btn.disabled = false);
    if (!vsMode) startTimer();
  });
}

// ===================================================
// 3. ボタン押下処理
// ===================================================
function onPrimeClick(p, btn) {
  if (isStunned || isGameOver || isPaused) return;
  if (navigator.vibrate) navigator.vibrate(18);

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

  // ダメージ計算
  let damage = maxHP * 0.02; // ミスで2%減少
  currentHP -= damage;
  if (currentHP < 0) currentHP = 0;

  updateHPUI();
  updateComboUI();

  mainArea.classList.add('is-stunned');

  // ★変更: Soloモードの場合はHP0によるゲームオーバーを発生させない
  // （HP表示自体は対戦モード用に残るが、1人プレイ中は無視する）
  if (vsMode) {
    healOpponent(50);  // ミス時に相手を回復
    pushMyState();
  }

  if (vsMode && currentHP <= 0) {
    vsMode ? handleVsGameOver('lose') : handleGameOver();
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
  // ★変更: スコア計算を「使った素数の難易度」基準に変更
  // 大きい素数（17, 19, 23, 29など）を使うほど高評価になり、
  // 単純な2の繰り返しだけでは高得点にならないようにする
  const difficultySum = usedPrimesThisRound.reduce((sum, p) => sum + p, 0);
  const comboMultiplier = 1 + combo * 0.05; // ★変更: コンボの影響は0.1→0.05に弱め、「少しだけ」反映する程度にする

  let addedScore = Math.floor((difficultySum * 12 + step * 5) * comboMultiplier);

  if (!vsMode) {
    totalScore += addedScore;
  } else {
    dealDamageToOpponent(addedScore); // 相手にダメージ
    pushMyState();                    // 自分の状態を同期
  }

  showDamageFloat(addedScore); // ★追加

  combo++;
  if (combo > maxCombo) {
    maxCombo = combo;
  }

  // 次の問題へ
  startNumber = generateNextNumber(startNumber, currentDifficulty);
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
    if (isPaused || isGameOver) return;
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

  // ★追加: ゲームオーバー時に一時停止状態を強制解除
  isPaused = false;
  if (pauseOverlay) {
    pauseOverlay.classList.remove('is-visible');
  }

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

  const isNewRecord = checkAndUpdateHighScore(totalScore);

  if (isNewRecord) {
    import('./firebase.js').then(({ submitScoreToLeaderboard }) => {
      submitScoreToLeaderboard(currentDifficulty, totalScore);
    });
  }

  if (typeof window.updateDifficultyHighScores === 'function') {
    window.updateDifficultyHighScores();
  }

  // ★追加: EXP付与
  let gainedExp = calcSoloExp(totalScore, currentDifficulty);
  if (isNewRecord) gainedExp += 20; // 新記録ボーナス
  (async () => {
    try {
      const { updateUserExp } = await import('./firebase.js');
      const { getCurrentUser } = await import('./firebase.js');
      const user = getCurrentUser();
      if (user) {
        const expResult = await updateUserExp(user.uid, gainedExp);
        showResultScreen(message, isNewRecord, null, { gainedExp, expResult });
        return;
      }
    } catch (e) {
      console.error('EXP更新エラー:', e);
    }
    showResultScreen(message, isNewRecord);
  })();

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

function updateEnemyInfoUI(nickname, rating) {
  if (enemyNicknameTag) {
    enemyNicknameTag.textContent = nickname || 'ENEMY';
  }
  if (enemyRatingRow && enemyRatingValue) {
    if (rating !== undefined && rating !== null) {
      enemyRatingValue.textContent = rating;
      enemyRatingRow.classList.remove('is-hidden');
    } else {
      enemyRatingRow.classList.add('is-hidden');
    }
  }
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
function showResultScreen(message, isNewRecord, ratingData = null, expData = null) {
  if (!resultScreen) return;
  if (resultMessage) resultMessage.textContent = message;
  if (resultScoreValue) resultScoreValue.textContent = Math.floor(totalScore);
  if (resultMaxComboValue) resultMaxComboValue.textContent = maxCombo;

  // ★追加: 新記録の場合のみバッジを表示
  if (newRecordBadge) {
    newRecordBadge.classList.toggle('is-hidden', !isNewRecord);
  }
  // ★追加: Soloモード（VSモードでない）の時だけXシェアボタンを表示
  if (btnShareX) {
    btnShareX.classList.toggle('is-hidden', vsMode);
  }


  // ===== レーティング表示（VSモードのみ） =====
  const ratingSection = document.getElementById('resultRatingSection');
  if (ratingSection) {
    if (ratingData) {
      ratingSection.classList.remove('is-hidden');

      const beforeEl = document.getElementById('ratingBefore');
      const afterEl = document.getElementById('ratingAfter');
      const diffEl = document.getElementById('ratingDiff');
      const bonusesEl = document.getElementById('ratingBonuses');

      if (beforeEl) beforeEl.textContent = ratingData.before;
      if (afterEl) afterEl.textContent = ratingData.before; // アニメ前は変化前の値
      if (diffEl) {
        const sign = ratingData.change >= 0 ? '+' : '';
        diffEl.textContent = `${sign}${ratingData.change}`;
        diffEl.className = `rating-diff ${ratingData.change >= 0 ? 'is-positive' : 'is-negative'}`;
      }
      if (bonusesEl) {
        bonusesEl.innerHTML = ratingData.bonuses
          .map(b => `<span class="rating-bonus-tag">${b}</span>`)
          .join('');
      }

      // カウントアップアニメーション
      setTimeout(() => animateRating(ratingData.before, ratingData.after), 600);
    } else {
      ratingSection.classList.add('is-hidden');
    }
  }
  // ★追加: EXP表示
  const expSection = document.getElementById('resultExpSection');
  if (expSection) {
    if (expData) {
      expSection.classList.remove('is-hidden');
      const gainedEl = document.getElementById('resultExpGained');
      const barEl = document.getElementById('resultExpBar');
      const levelEl = document.getElementById('resultExpLevel');
      const levelUpEl = document.getElementById('resultLevelUp');

      if (gainedEl) gainedEl.textContent = `+${expData.gainedExp} EXP`;
      if (levelEl) levelEl.textContent = `Lv. ${expData.expResult?.newLevel ?? 1}`;

      if (expData.expResult?.leveledUp) {
        levelUpEl?.classList.remove('is-hidden');
      } else {
        levelUpEl?.classList.add('is-hidden');
      }

      // EXPバーのアニメーション
      setTimeout(() => {
        if (barEl && expData.expResult) {
          import('./firebase.js').then(({ calcRequiredExp }) => {
            const required = calcRequiredExp(expData.expResult.newLevel);
            const pct = Math.min(100, (expData.expResult.newExp / required) * 100);
            barEl.style.width = `${pct}%`;
          });
        }
      }, 300);
    } else {
      expSection.classList.add('is-hidden');
    }
  }
  resultScreen.classList.add('is-visible');
}
// ★新規追加: Xでシェアする
function shareResultToX(isNewRecord) {
  const info = DIFFICULTY_SHARE_INFO[currentDifficulty] || DIFFICULTY_SHARE_INFO.easy;
  const scoreText = Math.floor(totalScore);

  const headline = isNewRecord
    ? `【NEW RECORD更新！】`
    : `【Prime Striker】`;

  const text =
    `${headline}
難易度: ${info.label}
スコア: ${scoreText}
最大コンボ: ${maxCombo}

#PrimeStriker #${info.tag}`;

  const params = new URLSearchParams({
    text: text,
    url: GAME_URL,
  });

  const shareUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
  window.open(shareUrl, '_blank', 'noopener,noreferrer');
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
if (btnShareX) {
  btnShareX.addEventListener('click', () => {
    const isNewRecord = newRecordBadge && !newRecordBadge.classList.contains('is-hidden');
    shareResultToX(isNewRecord);
  });
}
// ★新規追加
if (btnRetry) {
  btnRetry.addEventListener('click', () => {
    // 自動タイトル遷移をキャンセル
    if (typeof window.cancelAutoReturn === 'function') {
      window.cancelAutoReturn();
    }

    if (lastConfig && lastConfig.mode === 'vs') {
      hideResultScreen();
      if (typeof window.retryVsMatch === 'function') {
        window.retryVsMatch(lastConfig);
      }
    } else if (lastConfig) {
      window.startBattle(lastConfig);
    } else {
      initGame();
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
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');

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
if (pauseBtn) pauseBtn.addEventListener('click', () => togglePause());
if (resumeBtn) resumeBtn.addEventListener('click', () => resume());

// ★変更: Easyモード専用のキー配置（画面のボタンが6個・3列のため、それに合わせた配置にする）
const KEY_TO_PRIME_EASY = {
  'a': 2, 's': 3, 'd': 5,
  'z': 7, 'x': 11, 'c': 13
};

// 通常モード（Normal/Hard/Extreme）用のキー配置（10個・5列のまま）
const KEY_TO_PRIME_NORMAL = {
  'a': 2, 's': 3, 'd': 5, 'f': 7, 'g': 11,
  'z': 13, 'x': 17, 'c': 19, 'v': 23, 'b': 29
};

// ★追加: 現在の難易度に応じて使用するキーマップを返す
function getCurrentKeyMap() {
  return currentDifficulty === 'easy' ? KEY_TO_PRIME_EASY : KEY_TO_PRIME_NORMAL;
}

document.addEventListener('keydown', (e) => {
  // ESCで一時停止
  if (e.key === 'Escape') {
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen && gameScreen.classList.contains('active') && !isGameOver) {
      e.preventDefault();
      pause();
    }
    return;
  }

  // Enterで再開
  if (e.key === 'Enter') {
    if (isPaused) {
      e.preventDefault();
      resume();
    }
    return;
  }

  // 素数ボタンのキー操作（一時停止中・ゲームオーバー中は無効）
  if (isPaused || isGameOver) return;

  const keyMap = getCurrentKeyMap();
  const prime = keyMap[e.key.toLowerCase()];
  if (prime === undefined) return;

  // 対応するボタンを探してクリックと同じ処理を実行
  const btn = [...primeButtons].find(b => parseInt(b.dataset.prime, 10) === prime);
  if (btn && !btn.disabled) {
    btn.classList.add('is-pressed');
    setTimeout(() => btn.classList.remove('is-pressed'), 120);
    onPrimeClick(prime, btn);
  }
});
// 変更後
function showDamageFloat(score) {
  const el = document.createElement('div');
  el.className = 'damage-float';
  el.textContent = `+${score}!`;

  // スコアに応じてサイズ・色を変化
  let fontSize, color, shadow;
  if (score >= 500) {
    fontSize = '52px';
    color = '#ff3868';
    shadow = '0 0 18px rgba(255,56,104,0.9), 0 2px 4px rgba(0,0,0,0.8)';
  } else if (score >= 200) {
    fontSize = '40px';
    color = '#ffb627';
    shadow = '0 0 14px rgba(255,182,39,0.9), 0 2px 4px rgba(0,0,0,0.8)';
  } else if (score >= 100) {
    fontSize = '32px';
    color = '#ffb627';
    shadow = '0 0 10px rgba(255,182,39,0.7), 0 2px 4px rgba(0,0,0,0.8)';
  } else {
    fontSize = '22px';
    color = '#e8edf7';
    shadow = '0 2px 4px rgba(0,0,0,0.8)';
  }

  el.style.fontSize = fontSize;
  el.style.color = color;
  el.style.textShadow = shadow;

  const container = document.getElementById('mainArea');
  if (!container) return;

  const containerW = container.clientWidth;
  const spawnX = randomInt(containerW * 0.2, containerW * 0.75);

  el.style.left = `${spawnX}px`;
  el.style.top = '55%';

  container.appendChild(el);

  el.addEventListener('animationend', () => el.remove());
}
// 末尾に追加
export { initGame, handleGameOver, updateHPUI, updateEnemyHPUI };
// ===================================================
// VS モード：Firebaseとのリアルタイム同期
// ===================================================

// VS バトルの初期化
async function initVsBattle(config) {
  vsRoomId = config.roomId;
  const { getCurrentUser: getUser } = await import('./firebase.js');
  const user = getUser();
  if (!user) return;

  vsMyUid = user.uid;
  const playerUids = Object.keys(config.roomData.players);
  vsOpponentUid = playerUids.find(uid => uid !== vsMyUid);

  if (!vsOpponentUid) {
    console.error('相手が見つかりません');
    return;
  }

  // ★追加: roomData内にすでにある相手のニックネームを即時表示（レーティングはまだ無いので一旦非表示）
  const opponentRoomInfo = config.roomData.players[vsOpponentUid];
  updateEnemyInfoUI(opponentRoomInfo?.nickname, null);

  // ★追加: Firebaseのユーザーデータから相手の現在のレーティングを取得して表示
  try {
    const { getUserData } = await import('./firebase.js');
    const opponentUserData = await getUserData(vsOpponentUid);
    updateEnemyInfoUI(
      opponentRoomInfo?.nickname,
      opponentUserData?.rating ?? 1200
    );
  } catch (e) {
    console.error('相手のレーティング取得エラー:', e);
  }

  // 自分の初期状態を送信
  await pushMyState();

  // 相手の状態を監視開始
  listenToOpponent();

  // 切断時に自分の状態を更新
  const { db, ref, onDisconnect, update } = await import('./firebase.js');
  onDisconnect(ref(db, `rooms/${vsRoomId}/players/${vsMyUid}`))
    .update({ connected: false });
}

// 自分の状態をFirebaseに送信
async function pushMyState() {
  if (!vsMode || !vsRoomId || !vsMyUid) return;
  const { db, ref, update } = await import('./firebase.js');
  await update(ref(db, `rooms/${vsRoomId}/players/${vsMyUid}`), {
    hp: currentHP,
    currentNumber: currentNumber,
    combo: combo,
    connected: true,
  });
}

// 相手の状態をリアルタイムで監視
// 相手の状態（および自分の被ダメージ）をリアルタイムで監視
async function listenToOpponent() {
  const { db, ref, onValue } = await import('./firebase.js');

  // --- 1. 相手のデータを監視（既存の処理） ---
  const opponentRef = ref(db, `rooms/${vsRoomId}/players/${vsOpponentUid}`);
  const unsubOpponent = onValue(opponentRef, (snap) => {
    const data = snap.val();
    if (!data) return;

    enemyHP = data.hp ?? 30000;
    updateEnemyHPUI();

    const enemyNumEl = document.getElementById('enemyCurrentNumber');
    if (enemyNumEl) enemyNumEl.textContent = data.currentNumber || '---';

    const enemyComboEl = document.getElementById('enemyCombo');
    if (enemyComboEl) enemyComboEl.textContent = data.combo || 0;

    if (data.hp <= 0 && !isGameOver) {
      handleVsGameOver('win');
    }

    if (data.connected === false && !isGameOver) {
      handleVsGameOver('win_disconnect');
    }
  });

  // --- 2. ★新規追加: 自分のデータを監視（相手からの攻撃・回復の反映用） ---
  const myRef = ref(db, `rooms/${vsRoomId}/players/${vsMyUid}`);
  const unsubMyState = onValue(myRef, (snap) => {
    const data = snap.val();
    if (!data) return;

    // Firebase側で書き換えられた自分のHPをローカル変数に適用
    if (data.hp !== undefined) {
      currentHP = data.hp;
      updateHPUI(); // 画面のHPバーを更新！

      // 自分のHPが0以下になっていたら負け処理
      if (currentHP <= 0 && !isGameOver) {
        handleVsGameOver('lose');
      }
    }
  });

  // リスナー解除用の関数をまとめる
  vsUnsubscribe = () => {
    unsubOpponent();
    unsubMyState(); // ★追加
  };
}

// 相手にダメージを与える
async function dealDamageToOpponent(damage) {
  if (!vsRoomId || !vsOpponentUid) return;
  const { db, ref, runTransaction, update } = await import('./firebase.js');

  const opponentHpRef = ref(db, `rooms/${vsRoomId}/players/${vsOpponentUid}/hp`);

  const result = await runTransaction(opponentHpRef, (currentHp) => {
    if (currentHp === null) return 30000; // 初期値
    return Math.max(0, currentHp - damage);
  });

  const newHp = result.snapshot.val();

  if (newHp <= 0) {
    await update(ref(db, `rooms/${vsRoomId}`), {
      status: 'finished',
      winner: vsMyUid,
    });
  }
}

// ミス時に相手を回復させる
async function healOpponent(amount) {
  if (!vsRoomId || !vsOpponentUid) return;
  const { db, ref, runTransaction } = await import('./firebase.js');

  const opponentHpRef = ref(db, `rooms/${vsRoomId}/players/${vsOpponentUid}/hp`);

  await runTransaction(opponentHpRef, (currentHp) => {
    if (currentHp === null) return 30000;
    return Math.min(maxHP, currentHp + amount);
  });
}

// VS ゲームオーバー処理
async function handleVsGameOver(result) {
  if (isGameOver) return;
  isGameOver = true;

  if (timerId) { clearInterval(timerId); timerId = null; }
  stopBgm();
  primeButtons.forEach(btn => btn.disabled = true);
  if (vsUnsubscribe) { vsUnsubscribe(); vsUnsubscribe = null; }

  if (vsRoomId) {
    const { db, ref, update } = await import('./firebase.js');
    await update(ref(db, `rooms/${vsRoomId}`), { status: 'finished' });
  }

  const isWin = result === 'win' || result === 'win_disconnect';

  // ===== レーティング計算 =====
  let ratingData = null;
  try {
    const { getUserData, updateUserStats } = await import('./firebase.js');
    const { calcRatingChange } = await import('./rating.js');

    const [myData, opponentData] = await Promise.all([
      getUserData(vsMyUid),
      getUserData(vsOpponentUid),
    ]);

    if (myData && opponentData) {
      const myRating = myData.rating ?? 1200;
      const opponentRating = opponentData.rating ?? 1200;
      const winStreak = isWin ? (myData.winStreak ?? 0) : 0;

      const { change, newRating, bonuses } = calcRatingChange(
        myRating, opponentRating, isWin,
        isWin ? currentHP : 0,
        winStreak
      );

      await updateUserStats(vsMyUid, isWin, newRating);

      ratingData = { before: myRating, after: newRating, change, bonuses };
    }
  } catch (e) {
    console.error('レーティング更新エラー:', e);
  }

  const messages = {
    win: 'YOU WIN! 🎉',
    lose: 'YOU LOSE...',
    win_disconnect: 'WIN（相手が切断）',
  };

  let vsGainedExp = 0;
  try {
    const { updateUserExp } = await import('./firebase.js');
    const isUpset = ratingData
      ? (isWin && ratingData.before < ratingData.after - 30)
      : false;
    vsGainedExp = calcVsExp(isWin, isUpset);
    const expResult = await updateUserExp(vsMyUid, vsGainedExp);
    playSe(EndingSound);
    showResultScreen(messages[result] || 'FINISH!', false, ratingData, { gainedExp: vsGainedExp, expResult });
    return;
  } catch (e) {
    console.error('VS EXP更新エラー:', e);
  }

  playSe(EndingSound);
  showResultScreen(messages[result] || 'FINISH!', false, ratingData);
}

// ===================================================
// EXP・レベル計算
// ===================================================
function calcSoloExp(score, difficulty) {
  let baseExp;
  if (score < 500) baseExp = 5;
  else if (score < 1000) baseExp = 15;
  else if (score < 2000) baseExp = 25;
  else if (score < 4000) baseExp = 40;
  else if (score < 6000) baseExp = 55;
  else if (score < 8000) baseExp = 70;
  else if (score < 10000) baseExp = 85;
  else if (score < 15000) baseExp = 100;
  else if (score < 20000) baseExp = 120;
  else if (score < 30000) baseExp = 140;
  else if (score < 50000) baseExp = 165;
  else if (score < 80000) baseExp = 190;
  else if (score < 100000) baseExp = 215;
  else baseExp = 250;

  const multipliers = { easy: 1.0, normal: 1.3, hard: 1.6, extreme: 2.0 };
  const mult = multipliers[difficulty] || 1.0;
  return Math.floor(baseExp * mult);
}

function calcVsExp(isWin, isUpset = false) {
  let exp = isWin ? 60 : 20;
  if (isWin && isUpset) exp += 30;
  return exp;
}
function animateRating(from, to) {
  const el = document.getElementById('ratingAfter');
  if (!el) return;
  const duration = 1000;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

window.updateMyRatingDisplay = async function () {
  const ratingDisplayEl = document.getElementById('userRatingValue');
  if (!ratingDisplayEl) return;

  try {
    const { getCurrentUser, getUserData } = await import('./firebase.js');
    const user = getCurrentUser();
    if (!user) return; // ログインしていない場合は何もしない

    const userData = await getUserData(user.uid);
    ratingDisplayEl.textContent = userData?.rating ?? 1200;
  } catch (e) {
    console.error('レーティング表示の更新エラー:', e);
  }
};
;
