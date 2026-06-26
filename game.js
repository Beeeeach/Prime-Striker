const PRIME_LIST = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

const DIFFICULTY_CONFIG = {
  easy: {
    primes:  [2, 3, 5, 7, 11, 13],
    initMin: 30,    initMax: 150,
    multMin: 1.01,   multMax: 1.2,
  },
  normal: {
    primes:  [2, 3, 5, 7, 11, 13, 17, 19],
    initMin: 500,   initMax: 2000,
    multMin: 1.1,   multMax: 1.5,
  },
  hard: {
    primes:  [2, 3, 5, 7, 11, 13, 17, 19, 23, 29],
    initMin: 3000,  initMax: 8000,
    multMin: 1.3,   multMax: 1.8,
  },
  extreme: {
    primes:  [2, 3, 5, 7, 11, 13, 17, 19, 23, 29],
    initMin: 10000, initMax: 30000,
    multMin: 1.5,   multMax: 2.4,
  },
};

// ★修正：上限をJavaScriptの安全な最大整数（15桁）に引き上げ、7桁以上の生成に対応
const MAX_NUMBER_CAP = Number.MAX_SAFE_INTEGER; 

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function isValidPrimeFactorOnly(n, primes) {
  if (n <= 1) return false;
  let remaining = n;
  for (const p of primes) {
    while (remaining % p === 0) remaining /= p;
  }
  return remaining === 1;
}

// ★修正：第3引数に minLimit を追加し、prev 以下の数が探索されないようにガード
function findClosestValidNumber(target, primes, minLimit = 2) {
  const margin = Math.max(50, Math.ceil(target * 0.5));
  const rangeMin = Math.max(minLimit, Math.floor(target - margin)); // 探索下限を固定
  const rangeMax = Math.ceil(target + margin);

  let best = null;
  let bestDist = Infinity;
  for (let n = rangeMin; n <= rangeMax; n++) {
    if (isValidPrimeFactorOnly(n, primes)) {
      const dist = Math.abs(n - target);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
  }
  return best;
}

// ★修正：失敗時は丸めた不正な数を返さず、一律 null を返して呼び出し元で安全に処理する
function generateSmoothInRange(minVal, maxVal, primes) {
  const MAX_ATTEMPTS = 3000;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let n = 1;
    let overflow = false;
    while (n < minVal) {
      const p = primes[Math.floor(Math.random() * primes.length)];
      n *= p;
      if (n > maxVal * 4) { overflow = true; break; }
    }
    if (!overflow && n >= minVal && n <= maxVal) return n;
  }
  return null; 
}

// 初期数字の生成
function generateInitialNumber(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const { primes, initMin, initMax } = config;

  if (initMax <= 3000) {
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(initMin, initMax);
      if (isValidPrimeFactorOnly(n, primes)) return n;
    }
    return findClosestValidNumber(Math.floor((initMin + initMax) / 2), primes) || initMin;
  }
  
  // ★修正：generateSmoothInRange が null を返したときのフォールバック
  const result = generateSmoothInRange(initMin, initMax, primes);
  if (result) return result;

  let fallback = 1;
  while (fallback < initMin) fallback *= primes[0];
  return fallback;
}

// 次の数字の生成
function generateNextNumber(prev, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const { primes, multMin, multMax } = config;

  const multiplier = randomFloat(multMin, multMax);
  let target = Math.min(Math.floor(prev * multiplier), MAX_NUMBER_CAP);

  // ★修正：ターゲットが前の数以下にならないように安全弁を設置
  if (target <= prev) {
    target = prev + 1;
  }

  // 小さい数向け（★修正：探索下限として prev + 1 を渡す）
  if (target <= 3000) {
    const result = findClosestValidNumber(target, primes, prev + 1);
    if (result && result > prev) return result;
  }

  const margin = Math.max(200, Math.floor(target * 0.25));
  const minVal = Math.max(prev + 1, target - margin);
  let maxVal = Math.min(MAX_NUMBER_CAP, target + margin);

  // ★修正：minVal と maxVal の大小関係が逆転する矛盾を確実に防ぐ
  if (maxVal < minVal) {
    maxVal = minVal + margin;
  }

  // 正常な範囲であれば乱数生成を試みる
  if (minVal <= maxVal) {
    const result = generateSmoothInRange(minVal, maxVal, primes);
    if (result && result > prev && result <= MAX_NUMBER_CAP) return result;
  }

  // ★修正：【確実なフォールバック処理】
  // ランダム生成が失敗した場合は「前の数 × 最小の素数」を返す。
  // これにより、必ず指定の素数だけで構成され、かつ確実に前より大きな数字になることが保証されます。
  let fallback = prev * primes[0];
  if (fallback > MAX_NUMBER_CAP) {
    return prev; // 万が一、上限の限界に達した場合の安全弁
  }
  return fallback;
}

export { generateInitialNumber, generateNextNumber, randomInt, randomFloat, DIFFICULTY_CONFIG };
