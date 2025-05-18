let questions = [];
let currentQuestion = '';
let currentIndex = 0;
let score = 0;
let startTime;
let timerInterval;

const startScreen = document.getElementById('start-screen');
const countdownScreen = document.getElementById('countdown-screen');
const typingScreen = document.getElementById('typing-screen');
const resultScreen = document.getElementById('result-screen');
const countdownEl = document.getElementById('countdown');
const questionEl = document.getElementById('question');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const retryBtn = document.getElementById('retry');

function showScreen(screen) {
    startScreen.classList.add('hidden');
    countdownScreen.classList.add('hidden');
    typingScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

function loadQuestions(level) {
    const file = `data/questions_level${level}.json`;
    return fetch(file)
        .then(res => {
            if (!res.ok) throw new Error('failed to load');
            return res.json();
        })
        .catch(err => {
            console.error(err);
            return fetch('data/questions_level1.json').then(r => r.json());
        });
}

function prepareQuestion() {
    if (questions.length === 0) {
        finishGame();
        return;
    }
    currentQuestion = questions.shift();
    currentIndex = 0;
    renderQuestion();
}

function renderQuestion() {
    questionEl.innerHTML = '';
    for (let i = 0; i < currentQuestion.length; i++) {
        const span = document.createElement('span');
        span.textContent = currentQuestion[i];
        if (i < currentIndex) {
            span.className = 'correct';
        } else if (i === currentIndex) {
            span.className = 'current';
        }
        questionEl.appendChild(span);
    }
}

function startGame() {
    score = 0;
    scoreEl.textContent = '0';
    loadQuestions(getSelectedLevel()).then(data => {
        questions = shuffle(data);
        showScreen(countdownScreen);
        startCountdown(3);
    });
}

function startCountdown(count) {
    countdownEl.textContent = count;
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.textContent = count;
        } else {
            clearInterval(interval);
            showScreen(typingScreen);
            startTyping();
        }
    }, 1000);
}

function startTyping() {
    prepareQuestion();
    startTime = performance.now();
    timerInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        timerEl.textContent = elapsed.toFixed(1);
    }, 100);
}

function finishGame() {
    clearInterval(timerInterval);
    finalScoreEl.textContent = `スコア: ${score}`;
    showScreen(resultScreen);
}

function getSelectedLevel() {
    const radios = document.querySelectorAll('input[name="difficulty"]');
    for (const r of radios) {
        if (r.checked) return r.value;
    }
    return '1';
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

retryBtn.addEventListener('click', () => {
    showScreen(startScreen);
});

document.addEventListener('keydown', e => {
    if (!typingScreen.classList.contains('hidden')) {
        if (e.key.length === 1) {
            if (e.key === currentQuestion[currentIndex]) {
                currentIndex++;
                if (currentIndex === currentQuestion.length) {
                    score += currentQuestion.length;
                    scoreEl.textContent = score;
                    prepareQuestion();
                } else {
                    renderQuestion();
                }
            } else {
                // incorrect, mark
            }
        } else if (e.key === 'Backspace') {
            if (currentIndex > 0) {
                currentIndex--;
                renderQuestion();
            }
        } else if (e.key === 'Escape') {
            finishGame();
        }
    } else if (!startScreen.classList.contains('hidden')) {
        if (e.code === 'Space') {
            startGame();
        }
    }
});
