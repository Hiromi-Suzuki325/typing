let questions = [];
let currentQuestion = "";
let currentIndex = 0;
let score = 0;
let startTime;
let timerInterval;
let isComposing = false;
let compositionText = "";

const TIME_LIMIT = 60; // タイムリミット（秒）

const startScreen = document.getElementById("start-screen");
const countdownScreen = document.getElementById("countdown-screen");
const typingScreen = document.getElementById("typing-screen");
const resultScreen = document.getElementById("result-screen");
const countdownEl = document.getElementById("countdown");
const questionEl = document.getElementById("question");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("final-score");
const retryBtn = document.getElementById("retry");

function showScreen(screen) {
  startScreen.classList.add("hidden");
  countdownScreen.classList.add("hidden");
  typingScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function loadQuestions(level) {
  const file = `data/questions_level${level}.json`;
  return fetch(file)
    .then((res) => {
      if (!res.ok) {
        console.error(`Failed to load level ${level}, falling back to level 1`);
        return fetch("data/questions_level1.json").then((r) => r.json());
      }
      return res.json();
    })
    .catch((err) => {
      console.error("Error loading questions:", err);
      return fetch("data/questions_level1.json").then((r) => r.json());
    });
}

function prepareQuestion() {
  if (questions.length === 0) {
    finishGame();
    return;
  }
  // Keep questions in lowercase Roman characters for easy per‑keystroke comparison
  currentQuestion = questions.shift().toLowerCase();
  currentIndex = 0;
  renderQuestion();
}

function renderQuestion() {
  questionEl.innerHTML = "";
  for (let i = 0; i < currentQuestion.length; i++) {
    const span = document.createElement("span");
    span.textContent = currentQuestion[i];
    if (i < currentIndex) {
      span.className = "correct";
    } else if (i === currentIndex) {
      span.className = "current";
    }
    questionEl.appendChild(span);
  }
  debugLog(
    `Rendered question: ${currentQuestion}, Current index: ${currentIndex}`
  );
}

function startGame() {
  score = 0;
  scoreEl.textContent = "0";
  timerEl.textContent = "0.0";
  loadQuestions(getSelectedLevel()).then((data) => {
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
    if (elapsed >= TIME_LIMIT) finishGame();
  }, 100);
}

function finishGame() {
  clearInterval(timerInterval);
  timerEl.textContent = TIME_LIMIT.toFixed(1); // タイムアップ時にタイマーを固定表示
  finalScoreEl.textContent = `スコア: ${score}`;
  showScreen(resultScreen);
}

function getSelectedLevel() {
  const radios = document.querySelectorAll('input[name="difficulty"]');
  for (const r of radios) {
    if (r.checked) return r.value;
  }
  return "1";
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

retryBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

// デバッグ用の関数
function debugLog(message) {
  console.log(message);
}

// IMEの状態を確認する関数
function isIMEAvailable() {
  return "webkit" in window && "InputMethodContext" in window.webkit;
}

document.addEventListener("keydown", (e) => {
  debugLog(`Keydown event: key=${e.key}, code=${e.code}`);

  if (!typingScreen.classList.contains("hidden")) {
    debugLog("Typing screen is active");

    // IMEの処理中は通常のキー入力を無視
    if (isComposing) {
      debugLog("IME is composing, ignoring keydown");
      return;
    }

    if (e.key === "Process" || e.key === "Unidentified") {
      isComposing = true;
      debugLog("IME composition started");
      return;
    }

    if (e.key === "Backspace") {
      if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
      }
    } else if (e.key === "Escape") {
      finishGame();
    }
    // Handle normal single‑character input (Option 2: roman letter per keystroke)
    else if (e.key.length === 1) {
      const inputChar = e.key.toLowerCase();
      if (inputChar === currentQuestion[currentIndex]) {
        currentIndex++;
        if (currentIndex === currentQuestion.length) {
          score += currentQuestion.length;
          scoreEl.textContent = score;
          prepareQuestion();
        } else {
          renderQuestion();
        }
      }
    }
  } else if (!startScreen.classList.contains("hidden")) {
    debugLog("Start screen is active");
    if (e.code === "Space") {
      debugLog("Starting game...");
      startGame();
    }
  }
});

// 日本語入力の開始
document.addEventListener("compositionstart", (e) => {
  debugLog("Composition start");
  isComposing = true;
  compositionText = "";
});

// 日本語入力の更新
document.addEventListener("compositionupdate", (e) => {
  debugLog(`Composition update: ${e.data}`);
  compositionText = e.data;
});

// 日本語入力の確定
document.addEventListener("compositionend", (e) => {
  debugLog(`Composition end: ${e.data}`);
  isComposing = false;

  if (!typingScreen.classList.contains("hidden")) {
    const input = e.data;
    debugLog(
      `Comparing composition: '${input}' with '${currentQuestion[currentIndex]}'`
    );

    // 入力された文字が現在の文字と一致するか確認
    if (input === currentQuestion[currentIndex]) {
      debugLog("Correct input!");
      currentIndex++;
      if (currentIndex === currentQuestion.length) {
        score += currentQuestion.length;
        scoreEl.textContent = score;
        prepareQuestion();
      } else {
        renderQuestion();
      }
    } else {
      debugLog("Incorrect input!");
    }
  }

  compositionText = "";
});

// 入力中の文字を表示
document.addEventListener("input", (e) => {
  if (!typingScreen.classList.contains("hidden")) {
    debugLog(`Input event: ${e.data}`);
    if (isComposing) {
      compositionText = e.data;
      debugLog(`Current composition: ${compositionText}`);
    }
  }
});

// フォーカス時のIME状態をリセット
document.addEventListener("focus", () => {
  isComposing = false;
  compositionText = "";
  debugLog("Focus event: IME state reset");
});

// ブラー時のIME状態をリセット
document.addEventListener("blur", () => {
  isComposing = false;
  compositionText = "";
  debugLog("Blur event: IME state reset");
});

// 画面の初期化を確認
window.addEventListener("load", () => {
  debugLog("Window loaded");
  debugLog(`Start screen exists: ${!!startScreen}`);
  debugLog(`Typing screen exists: ${!!typingScreen}`);
  debugLog(`Question element exists: ${!!questionEl}`);
});

// --- バーチャルキーボードのハイライト処理 ---
document.addEventListener("keydown", (e) => {
  const key = e.key === " " ? "space" : e.key.toLowerCase();
  const vk = document.querySelector(`.vk-key[data-key="${key}"]`);
  if (vk) vk.classList.add("pressed");
});
document.addEventListener("keyup", (e) => {
  const key = e.key === " " ? "space" : e.key.toLowerCase();
  const vk = document.querySelector(`.vk-key[data-key="${key}"]`);
  if (vk) vk.classList.remove("pressed");
});
