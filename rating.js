// rating.js
const DEFAULT_RATING = 1200;
const MIN_RATING = 800;

function getKFactor(rating) {
  if (rating < 1000) return 40;
  if (rating < 1200) return 32;
  if (rating < 1400) return 24;
  return 16;
}

function calcExpected(myRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
}

export function calcRatingChange(myRating, opponentRating, isWin, myHp = 0, winStreak = 0) {
  const K = getKFactor(myRating);
  const expected = calcExpected(myRating, opponentRating);
  const baseChange = K * ((isWin ? 1.0 : 0.0) - expected);

  let multiplier = 1.0;
  const bonuses = [];

  if (isWin) {
    if (opponentRating - myRating >= 100) {
      multiplier += 0.2;
      bonuses.push('⚡ 番狂わせボーナス +20%');
    }
    if (myHp >= 500) {
      multiplier += 0.1;
      bonuses.push('🛡️ 完封ボーナス +10%');
    }
    if (winStreak > 0 && winStreak % 3 === 0) {
      multiplier += 0.15;
      bonuses.push(`🔥 ${winStreak}連勝ボーナス +15%`);
    }
  }

  const change = Math.round(baseChange * multiplier);
  const newRating = Math.max(MIN_RATING, myRating + change);
  const actualChange = newRating - myRating;

  return { change: actualChange, newRating, bonuses };
}

export { DEFAULT_RATING, MIN_RATING };
