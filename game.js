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

const MAX_NUMBER_CAP = 999999; // 表示上限（6桁）

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// 指定した素数リストだけで n が構成されるか判定
function isValidPrimeFactorOnly(n, primes) {
  if (n <= 1) return false;
  let remaining = n;
  for (const p of primes) {
    while (remaining % p === 0) remaining /= p;
  }
  return remaining === 1;
}

// 小さい数（<=3000）向けの線形探索
function findClosestValidNumber(target, primes) {
  const margin = Math.max(50, Math.ceil(target * 0.5));
  const rangeMin = Math.max(2, Math.floor(target - margin));
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

// 大きい数向け：素数を掛け合わせて [minVal, maxVal] 内の数を生成
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
  // フォールバック：最小素数の累乗で minVal 以上の値を返す
  let fallback = 1;
  while (fallback < minVal) fallback *= primes[0];
  return Math.min(fallback, maxVal);
}

// 初期数字の生成
function generateInitialNumber(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const { primes, initMin, initMax } = config;

  if (initMax <= 3000) {
    // 小さい範囲はランダム試行
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(initMin, initMax);
      if (isValidPrimeFactorOnly(n, primes)) return n;
    }
    return findClosestValidNumber(Math.floor((initMin + initMax) / 2), primes) || initMin;
  }
  return generateSmoothInRange(initMin, initMax, primes);
}

// 次の数字の生成
function generateNextNumber(prev, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const { primes, multMin, multMax } = config;

  const multiplier = randomFloat(multMin, multMax);
  const target = Math.min(Math.floor(prev * multiplier), MAX_NUMBER_CAP);

  if (target <= 3000) {
    const result = findClosestValidNumber(target, primes);
    if (result) return result;
  }

  const margin = Math.max(200, Math.floor(target * 0.25));
  const minVal = Math.max(prev+1, target - margin);
  const maxVal = Math.min(MAX_NUMBER_CAP, target + margin);
  return generateSmoothInRange(minVal, maxVal, primes);
}

export { generateInitialNumber, generateNextNumber, randomInt, randomFloat, DIFFICULTY_CONFIG };
