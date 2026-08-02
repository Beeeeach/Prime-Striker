// tutorial.js
import { getCurrentUser, getUserData } from './firebase.js';

// ============ チュートリアルの完了フラグ管理 ============
const TUTORIAL_KEY = 'primeStriker_tutorialCompleted';

export function isTutorialCompleted() {
    return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

export function markTutorialCompleted() {
    localStorage.setItem(TUTORIAL_KEY, 'true');
}

// ============ チュートリアルを表示すべきか判定 ============
export async function shouldShowTutorial(user) {
    if (isTutorialCompleted()) return false;

    if (user) {
        try {
            const data = await getUserData(user.uid);
            if (data?.tutorialCompleted) {
                markTutorialCompleted();
                return false;
            }
        } catch (e) { }
    }
    return true;
}

// ============ Firebase側にも完了フラグを保存 ============
export async function saveTutorialCompletedToFirebase() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        const { db, ref, update } = await import('./firebase.js');
        await update(ref(db, `users/${user.uid}`), { tutorialCompleted: true });
    } catch (e) {
        console.error('チュートリアル完了フラグ保存エラー:', e);
    }
}

// ============ チュートリアルのステップ定義 ============
const STEPS = [
    {
        type: 'explain',
        icon: '🎮',
        title: 'Prime Strikerへようこそ！',
        body: 'このゲームは「素因数分解」を使って戦うパズルゲームです。画面に表示された数字を素因数に分解してスコアを稼ぎましょう！',
    },
    {
        type: 'explain',
        icon: '🔢',
        title: '素因数分解とは？',
        body: '素因数分解とは、ある数を素数（2・3・5・7…）だけの掛け算で表すことです。',
        example: { number: 12, steps: ['12 ÷ 2 = 6', '6 ÷ 2 = 3', '3 ÷ 3 = 1', '→ 12 = 2 × 2 × 3'] },
    },
    {
        type: 'interactive',
        icon: '👆',
        title: '実際にやってみよう！',
        body: '「6」を素因数分解してみましょう。まず「2」を押して6を割ってください。',
        targetNumber: 6,
        primes: [2, 3, 5],
    },
    {
        type: 'explain',
        icon: '⭐',
        title: 'スコアの仕組み',
        body: 'スコアは「使った素数の大きさ」で決まります。17・19・23・29のような大きな素数を使うほど高得点！2や3だけでは高得点になりません。',
        scoreExample: true,
    },
    {
        type: 'explain',
        icon: '🔥',
        title: 'コンボとミス',
        body: '正解し続けるとコンボが増え、スコアにボーナスが加算されます。間違った素数を選ぶとミスとなり、コンボがリセットされ、しばらく操作できなくなります。',
    },
    {
        type: 'explain',
        icon: '⚔️',
        title: '対戦モード',
        body: '2人対戦モードでは、素因数分解のたびに相手にダメージを与えます。先に相手のHPを0にした方が勝利！ミスすると相手が回復するので注意しましょう。',
    },
    {
        type: 'finish',
        icon: '🚀',
        title: '準備完了！',
        body: 'チュートリアルは以上です。ソロモードで練習してから対戦に挑戦しましょう！',
    },
];

// ============ チュートリアル制御 ============
let currentStep = 0;
let interactiveDone = false;
let interactiveNumber = 0;

const tutorialScreen = document.getElementById('tutorial-screen');
const stepIcon = document.getElementById('tutorial-icon');
const stepTitle = document.getElementById('tutorial-title');
const stepBody = document.getElementById('tutorial-body');
const stepExample = document.getElementById('tutorial-example');
const stepInteractive = document.getElementById('tutorial-interactive');
const stepScoreEx = document.getElementById('tutorial-score-example');
const btnNext = document.getElementById('tutorial-next');
const btnSkip = document.getElementById('tutorial-skip');
const progressDots = document.getElementById('tutorial-progress');
const interactiveNum = document.getElementById('tutorial-interactive-number');
const interactiveBtns = document.getElementById('tutorial-interactive-btns');
const interactiveMsg = document.getElementById('tutorial-interactive-msg');

export function startTutorial() {
    currentStep = 0;
    interactiveDone = false;
    tutorialScreen?.classList.add('active');
    renderStep(0);
}

function renderStep(index) {
    const step = STEPS[index];
    if (!step) return;

    // アイコン・タイトル・本文
    if (stepIcon) stepIcon.textContent = step.icon;
    if (stepTitle) stepTitle.textContent = step.title;
    if (stepBody) stepBody.textContent = step.body;

    // 例示・インタラクティブ・スコア例を全部隠す
    stepExample?.classList.add('is-hidden');
    stepInteractive?.classList.add('is-hidden');
    stepScoreEx?.classList.add('is-hidden');
    if (btnNext) {
        btnNext.disabled = false;
        btnNext.textContent = index === STEPS.length - 1 ? 'ゲームを始める！' : '次へ →';
    }

    // タイプ別の追加表示
    if (step.type === 'explain' && step.example) {
        stepExample?.classList.remove('is-hidden');
        renderExample(step.example);
    }

    if (step.type === 'explain' && step.scoreExample) {
        stepScoreEx?.classList.remove('is-hidden');
    }

    if (step.type === 'interactive') {
        stepInteractive?.classList.remove('is-hidden');
        interactiveDone = false;
        interactiveNumber = step.targetNumber;
        if (btnNext) btnNext.disabled = true;
        renderInteractive(step);
    }

    if (step.type === 'finish') {
        btnSkip?.classList.add('is-hidden');
    }

    // プログレスドット
    renderProgress(index);
}

function renderExample(example) {
    const numEl = document.getElementById('tutorial-example-number');
    const stepsEl = document.getElementById('tutorial-example-steps');
    if (numEl) numEl.textContent = example.number;
    if (stepsEl) stepsEl.innerHTML = example.steps
        .map(s => `<span class="tutorial-example-step">${s}</span>`)
        .join('');
}

function renderInteractive(step) {
    if (interactiveNum) interactiveNum.textContent = step.targetNumber;
    if (interactiveMsg) {
        interactiveMsg.textContent = step.body;
        interactiveMsg.className = 'tutorial-interactive-msg';
    }
    if (!interactiveBtns) return;

    interactiveBtns.innerHTML = '';
    let remaining = step.targetNumber;

    step.primes.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'tutorial-prime-btn';
        btn.textContent = p;
        btn.addEventListener('click', () => {
            if (remaining % p === 0) {
                remaining = Math.floor(remaining / p);
                btn.classList.add('is-correct');
                setTimeout(() => btn.classList.remove('is-correct'), 200);

                if (interactiveNum) interactiveNum.textContent = remaining;

                if (remaining === 1) {
                    // クリア！
                    interactiveDone = true;
                    if (interactiveMsg) {
                        interactiveMsg.textContent = '✅ 正解！素因数分解できました！';
                        interactiveMsg.classList.add('is-success');
                    }
                    if (btnNext) btnNext.disabled = false;
                    interactiveBtns.querySelectorAll('.tutorial-prime-btn')
                        .forEach(b => b.disabled = true);
                } else {
                    // 途中
                    if (interactiveMsg) {
                        interactiveMsg.textContent = `残り: ${remaining} を素因数分解してください！`;
                    }
                }
            } else {
                btn.classList.add('is-wrong');
                setTimeout(() => btn.classList.remove('is-wrong'), 300);
                if (interactiveMsg) {
                    interactiveMsg.textContent = `❌ ${remaining} は ${p} で割り切れません。別の素数を選んでください。`;
                    interactiveMsg.classList.add('is-error');
                    setTimeout(() => {
                        interactiveMsg.classList.remove('is-error');
                        interactiveMsg.textContent = `${remaining} を割り切れる素数を選んでください。`;
                    }, 1000);
                }
            }
        });
        interactiveBtns.appendChild(btn);
    });
}

function renderProgress(index) {
    if (!progressDots) return;
    progressDots.innerHTML = '';
    STEPS.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = `tutorial-dot ${i === index ? 'is-active' : i < index ? 'is-done' : ''}`;
        progressDots.appendChild(dot);
    });
}

// ============ ボタンイベント ============
btnNext?.addEventListener('click', () => {
    if (currentStep < STEPS.length - 1) {
        currentStep++;
        renderStep(currentStep);
    } else {
        completeTutorial();
    }
});

btnSkip?.addEventListener('click', () => {
    completeTutorial();
});

function completeTutorial() {
    markTutorialCompleted();
    saveTutorialCompletedToFirebase();
    tutorialScreen?.classList.remove('active');
    document.getElementById('start-screen')?.classList.add('active');
}
