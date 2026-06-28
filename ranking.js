// ranking.js

const rankingModal   = document.getElementById('ranking-modal');
const btnRanking      = document.getElementById('btn-ranking');
const rankingCloseBtn = document.getElementById('rankingCloseBtn');
const rankingTabs     = document.getElementById('rankingTabs');
const rankingList     = document.getElementById('rankingList');

let currentRankType = 'easy';
const cache = {}; // タブ切り替えごとに毎回Firebaseへ取りに行かないための簡易キャッシュ

window.clearRankingCache = function() {
  Object.keys(cache).forEach(key => delete cache[key]);
};

// モーダルの開閉
if (btnRanking && rankingModal) {
  btnRanking.addEventListener('click', () => {
    rankingModal.classList.add('is-open');
    loadRanking(currentRankType);
  });
}

if (rankingCloseBtn && rankingModal) {
  rankingCloseBtn.addEventListener('click', () => {
    rankingModal.classList.remove('is-open');
  });
}

rankingModal?.addEventListener('click', (e) => {
  if (e.target === rankingModal) {
    rankingModal.classList.remove('is-open');
  }
});

// タブ切り替え
rankingTabs?.querySelectorAll('.ranking-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    rankingTabs.querySelectorAll('.ranking-tab').forEach((t) => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    currentRankType = tab.dataset.rankType;
    loadRanking(currentRankType);
  });
});

// ランキングデータの読み込み
async function loadRanking(type) {
  rankingList.innerHTML = '<p class="ranking-loading">読み込み中...</p>';

  try {
    if (cache[type]) {
      renderRanking(cache[type], type);
      return;
    }

    const { getTopScores, getTopRatings, getCurrentUser } = await import('./firebase.js');

    const items = await getTopScores(type, 10);

    cache[type] = items;
    renderRanking(items, type);
  } catch (e) {
    console.error('ランキング取得エラー:', e);
    rankingList.innerHTML = '<p class="ranking-empty">読み込みに失敗しました。</p>';
  }
}

// ランキングの描画
async function renderRanking(items, type) {
  if (!items || items.length === 0) {
    rankingList.innerHTML = '<p class="ranking-empty">まだランキングデータがありません。</p>';
    return;
  }

  const { getCurrentUser } = await import('./firebase.js');
  const user = getCurrentUser();
  const myUid = user ? user.uid : null;

  const rows = items.map((item, index) => {
    const rank = index + 1;
    const isMe = item.uid === myUid;
    const value = type === 'rating' ? (item.rating ?? 1200) : (item.score ?? 0);
    const rankClass = rank === 1 ? 'is-top1' : rank === 2 ? 'is-top2' : rank === 3 ? 'is-top3' : '';

    return `
    <div class="ranking-row ${isMe ? 'is-me' : ''}">
        <span class="ranking-rank ${rankClass}">${rank}</span>
        <span class="ranking-nickname">${escapeHtml(item.displayName || 'Player')}</span>
        <span class="ranking-value">${value}</span>
    </div>
    `;
  }).join('');

  rankingList.innerHTML = rows;
}

// XSS対策（ニックネームはユーザー入力由来のため）
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
