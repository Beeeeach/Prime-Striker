(function () {
  "use strict";

  const startScreen = document.getElementById("start-screen");
  const gameScreen = document.getElementById("game-screen");

  const btnSolo = document.getElementById("btn-solo");
  const btnVs = document.getElementById("btn-vs");
  const btnBackToTitle = document.getElementById("btn-back-to-title");

  function switchScreen(showEl, hideEl) {
    hideEl.classList.remove("active");
    showEl.classList.add("active");
  }

  function startSoloMode() {
    switchScreen(gameScreen, startScreen);
    if (typeof window.startBattle === "function") {
      window.startBattle({ mode: "solo" });
    } else {
      console.warn("[menu.js] battle.js の startBattle() が見つかりません。");
    }
  }

  function startVsMode() {
    alert("2人対戦（オンライン）モードは現在準備中です。");
  }

  function backToTitle() {
    if (typeof window.stopBattle === "function") {
      window.stopBattle();
    }
    switchScreen(startScreen, gameScreen);
  }

  btnSolo.addEventListener("click", startSoloMode);
  btnVs.addEventListener("click", startVsMode);
  btnBackToTitle.addEventListener("click", backToTitle);

  window.onGameOver = function (result) {
    // ゲームオーバー後に少し余韻を残してから戻る
    setTimeout(() => {
        backToTitle();
    }, 3000);
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!startScreen.classList.contains("active") && !gameScreen.classList.contains("active")) {
      startScreen.classList.add("active");
    }
  });
})();
