const PRIME_LIST = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function isValidPrimeFactorOnly(n) {
  if (n <= 1) return false;
  let remaining = n;
  for (const p of PRIME_LIST) {
    while (remaining % p === 0) {
      remaining /= p;
    }
  }
  return remaining === 1;
}

function generateInitialNumber() {
  const MAX_ATTEMPTS = 1000;
  let attempts = 0;
  while (attempts < MAX_ATTEMPTS) {
    const n = randomInt(20, 100); // 初期値を少し幅広く
    if (isValidPrimeFactorOnly(n)) return n;
    attempts++;
  }
  return 64;
}

function findClosestValidNumber(target) {
  // ★修正: 固定の ±100 から、ターゲットの大きさに応じた可変の探索範囲に変更
  const rangeMin = Math.max(2, Math.floor(target * 0.5));
  const rangeMax = Math.ceil(target * 1.5);
  
  let closestValue = null;
  let closestDistance = Infinity;

  for (let n = rangeMin; n <= rangeMax; n++) {
    if (n <= 1) continue;
    if (isValidPrimeFactorOnly(n)) {
      const distance = Math.abs(n - target);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestValue = n;
      }
    }
  }
  // 万が一見つからなかった場合のセーフティ
  return closestValue || (Math.floor(target) > 2 ? Math.floor(target) : 64);
}

function generateNextNumber(prev) {
  const multiplier = randomFloat(1.05,1.5); // 徐々に大きく
  const target = prev * multiplier;
  return findClosestValidNumber(target);
}
