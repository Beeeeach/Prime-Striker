import { getOnlineUser } from './online.js';

(function () {
  "use strict";

  const startScreen = document.getElementById("start-screen");
  const difficultyScreen = document.getElementById("difficulty-screen");
  const matchingScreen   = document.getElementById("matching-screen");
  const gameScreen = document.getElementById("game-screen");

  const btnSolo = document.getElementById("btn-solo");
  const btnVs = document.getElementById("btn-vs");
  const btnBackToTitle = document.getElementById("btn-back-to-title");

  const btnEasy        = document.getElementById("btn-easy");
  const btnNormal      = document.getElementById("btn-normal");
  const btnHard        = document.getElementById("btn-hard");
  const btnExtreme     = document.getElementById("btn-extreme");
  const btnBackToStart = document.getElementById("btn-back-to-start");

  function switchScreen(showEl, hideEl) {
    hideEl.classList.remove("active");
    showEl.classList.add("active");
  }

  function startSoloMode() {
    switchScreen(difficultyScreen, startScreen);
    if (typeof window.updateDifficultyHighScores === "function") {
      window.updateDifficultyHighScores();
    }
  }

  function startWithDifficulty(difficulty) {
    switchScreen(gameScreen, difficultyScreen);
    if (typeof window.playBgm === "function") {
      window.playBgm();
    }
    if (typeof window.startBattle === "function") {
      window.startBattle({ mode: "solo", difficulty });
    }
  }

  function startVsMode() {
  // ゲストはオンライン対戦不可
  if (typeof window.getCurrentOnlineUser === 'function') {
    const user = window.getCurrentOnlineUser();
    if (!user) {
      alert('オンライン対戦にはGoogleログインが必要です。');
      return;
    }
  }
  switchScreen(matchingScreen, startScreen);
}

  function backToStart() {
    switchScreen(startScreen, difficultyScreen);
  }

  function backToTitle() {
  if (typeof window.stopBattle === "function") {
    window.stopBattle();
  }
  difficultyScreen?.classList.remove("active");
  matchingScreen?.classList.remove("active");
  switchScreen(startScreen, gameScreen);
  if (typeof window.updateHighScoreDisplay === "function") {
    window.updateHighScoreDisplay?.();
  }
  if (typeof window.updateMyRatingDisplay === "function") {
    window.updateMyRatingDisplay();
  }
  // ★追加: ランキングキャッシュをクリアして次回開時に再取得
  if (typeof window.clearRankingCache === "function") {
    window.clearRankingCache();
  }
}

  btnSolo.addEventListener("click", startSoloMode);
  btnVs.addEventListener("click", startVsMode);
  btnBackToTitle.addEventListener("click", backToTitle);

  btnEasy?.addEventListener("click",    () => startWithDifficulty("easy"));
  btnNormal?.addEventListener("click",  () => startWithDifficulty("normal"));
  btnHard?.addEventListener("click",    () => startWithDifficulty("hard"));
  btnExtreme?.addEventListener("click", () => startWithDifficulty("extreme"));
  btnBackToStart?.addEventListener("click", backToStart);

  let autoReturnTimer = null;

  window.onGameOver = function (result) {
    autoReturnTimer = setTimeout(() => {
      backToTitle();
    }, 3000);
  };

  // リトライ時にタイマーをキャンセルできるよう公開
  window.cancelAutoReturn = function () {
    if (autoReturnTimer) {
      clearTimeout(autoReturnTimer);
      autoReturnTimer = null;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!startScreen.classList.contains("active") && !gameScreen.classList.contains("active")) {
      startScreen.classList.add("active");
    }
  });
})()

// ★追加: 遊び方モーダルの開閉
const howtoModal = document.getElementById('howto-modal');
const btnHowto = document.getElementById('btn-howto');
const howtoCloseBtn = document.getElementById('howtoCloseBtn');

if (btnHowto && howtoModal) {
  btnHowto.addEventListener('click', () => {
    howtoModal.classList.add('is-open');
  });
}
if (howtoCloseBtn && howtoModal) {
  howtoCloseBtn.addEventListener('click', () => {
    howtoModal.classList.remove('is-open');
  });
}

// ★追加: 設定モーダルの開閉
const settingsModal = document.getElementById('settings-modal');
const btnSettings = document.getElementById('btn-settings');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');

if (btnSettings && settingsModal) {
  btnSettings.addEventListener('click', () => {
    settingsModal.classList.add('is-open');
  });
}
if (settingsCloseBtn && settingsModal) {
  settingsCloseBtn.addEventListener('click', () => {
    settingsModal.classList.remove('is-open');
  });
}

// ★追加: モーダルの背景（外側）をクリックしたら閉じる
[howtoModal, settingsModal].forEach(modal => {
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('is-open');
    }
  });
});

// ★追加: 設定モーダル内の音量スライダーを、battle.js側の既存スライダーと連動させる
const settingsBgmSlider = document.getElementById('settingsBgmSlider');
const settingsSeSlider = document.getElementById('settingsSeSlider');
const existingBgmSlider = document.getElementById('bgmVolumeSlider');
const existingSeSlider = document.getElementById('seVolumeSlider');

// 設定モーダルを開いた時、既存スライダーの現在値を反映する
if (btnSettings) {
  btnSettings.addEventListener('click', () => {
    if (settingsBgmSlider && existingBgmSlider) {
      settingsBgmSlider.value = existingBgmSlider.value;
      updateSettingsMuteLabel(settingsBgmLabel, settingsBgmSlider.value);
    }
    if (settingsSeSlider && existingSeSlider) {
      settingsSeSlider.value = existingSeSlider.value;
      updateSettingsMuteLabel(settingsSeLabel, settingsSeSlider.value);
    }
  });
}

// 設定モーダルのスライダーを動かしたら、既存スライダーにも値を反映してinputイベントを発火させる
const settingsBgmLabel = document.getElementById('settingsBgmLabel');
const settingsSeLabel  = document.getElementById('settingsSeLabel');

function updateSettingsMuteLabel(labelEl, percent) {
  if (!labelEl) return;
  labelEl.classList.toggle('is-muted', parseInt(percent, 10) === 0);
}

if (settingsBgmSlider && existingBgmSlider) {
  settingsBgmSlider.addEventListener('input', () => {
    existingBgmSlider.value = settingsBgmSlider.value;
    existingBgmSlider.dispatchEvent(new Event('input'));
    updateSettingsMuteLabel(settingsBgmLabel, settingsBgmSlider.value);
  });
}
if (settingsSeSlider && existingSeSlider) {
  settingsSeSlider.addEventListener('input', () => {
    existingSeSlider.value = settingsSeSlider.value;
    existingSeSlider.dispatchEvent(new Event('input'));
    updateSettingsMuteLabel(settingsSeLabel, settingsSeSlider.value);
  });
}

// ★追加: ハイスコアリセットボタン
const btnResetHighscore = document.getElementById('btn-reset-highscore');
if (btnResetHighscore) {
  btnResetHighscore.addEventListener('click', () => {
    const confirmed = confirm('すべてのハイスコアをリセットしてもよろしいですか？');
    if (confirmed) {
      // battle.js の window 公開関数を使ってリセット
      if (typeof window.resetAllHighScores === 'function') {
        window.resetAllHighScores();
      }
    }
  });
};
