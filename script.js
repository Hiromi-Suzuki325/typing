let questions = [];
let currentQuestion = null;
let currentInput = "";
let currentIndex = 0;
let score = 0;
let startTime;
let timerInterval;
let isComposing = false;
let compositionText = "";
let isGameStarting = false;
let lastElapsed = 0;

const TIME_LIMIT = 60; // タイムリミット（秒）
const LEVEL_LABELS = {
  1: "初級",
  2: "中級",
  3: "上級",
  4: "達人",
};

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
const activeLevelEl = document.getElementById("active-level");
const progressBarEl = document.getElementById("progress-bar");
const nextKeyEl = document.querySelector("#next-key span");
const questionDisplayEl = document.getElementById("question-display");
const questionCategoryEl = document.getElementById("question-category");

function showScreen(screen) {
  startScreen.classList.add("hidden");
  countdownScreen.classList.add("hidden");
  typingScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function loadQuestions(level) {
  const file = `data/questions_level${level}.json`;
  const fetchJson = (path) => fetch(path, { cache: "no-store" }).then((r) => r.json());

  return fetch(file, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        console.error(`Failed to load level ${level}, falling back to level 1`);
        return fetchJson("data/questions_level1.json");
      }
      return res.json();
    })
    .catch((err) => {
      console.error("Error loading questions:", err);
      return fetchJson("data/questions_level1.json");
    });
}

function prepareQuestion() {
  if (questions.length === 0) {
    finishGame();
    return;
  }
  currentQuestion = questions.shift();
  currentInput = currentQuestion.input.toLowerCase();
  currentIndex = 0;
  skipOptionalSpaces();
  renderQuestion();
}

function renderQuestion() {
  questionDisplayEl.textContent = currentQuestion.display;
  questionCategoryEl.textContent = currentQuestion.categoryLabel;
  questionEl.classList.toggle("long", currentInput.length > 54);
  questionEl.innerHTML = "";
  for (let i = 0; i < currentInput.length; i++) {
    const span = document.createElement("span");
    span.textContent = currentInput[i];
    if (i < currentIndex) {
      span.className = "correct";
    } else if (i === currentIndex) {
      span.className = "current";
    }
    questionEl.appendChild(span);
  }
  debugLog(
    `Rendered question: ${currentInput}, Current index: ${currentIndex}`
  );
  updateProgress();
  updateNextKey();
}

function startGame() {
  if (isGameStarting) return;
  isGameStarting = true;
  score = 0;
  lastElapsed = 0;
  currentQuestion = null;
  currentInput = "";
  currentIndex = 0;
  scoreEl.textContent = "0";
  timerEl.textContent = "0.0";
  questionDisplayEl.textContent = "問題を読み込み中";
  questionCategoryEl.textContent = "FP3級";
  updateProgress();
  updateNextKey();

  const level = getSelectedLevel();
  activeLevelEl.textContent = LEVEL_LABELS[level] || LEVEL_LABELS[1];

  loadQuestions(level)
    .then((data) => {
      questions = shuffle(normalizeQuestions(data, level));
      showScreen(countdownScreen);
      startCountdown(3);
    })
    .catch((err) => {
      console.error("Failed to start game:", err);
      isGameStarting = false;
      questionDisplayEl.textContent = "問題データの読み込みに失敗しました";
      showScreen(startScreen);
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
      isGameStarting = false;
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
    lastElapsed = elapsed;
    timerEl.textContent = Math.min(elapsed, TIME_LIMIT).toFixed(1);
    if (elapsed >= TIME_LIMIT) finishGame();
  }, 100);
}

function finishGame() {
  clearInterval(timerInterval);
  isGameStarting = false;
  timerEl.textContent = Math.min(lastElapsed, TIME_LIMIT).toFixed(1);
  finalScoreEl.textContent = `スコア: ${score}`;
  clearNextKey();
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
  clearNextKey();
  showScreen(startScreen);
});

function updateProgress() {
  if (!progressBarEl || currentInput.length === 0) {
    progressBarEl.style.width = "0%";
    return;
  }

  const progress = (currentIndex / currentInput.length) * 100;
  progressBarEl.style.width = `${progress}%`;
}

function updateNextKey() {
  clearNextKey();
  if (!nextKeyEl || currentInput.length === 0) return;

  const nextChar = getNextRequiredChar();
  if (!nextChar) {
    nextKeyEl.textContent = "-";
    return;
  }

  const key = getVirtualKeyName(nextChar);
  nextKeyEl.textContent = key === "space" ? "Space" : nextChar;

  const vk = findVirtualKey(key);
  if (vk) vk.classList.add("next");
}

function clearNextKey() {
  document.querySelectorAll(".vk-key.next").forEach((key) => {
    key.classList.remove("next");
  });
  if (nextKeyEl) nextKeyEl.textContent = "-";
}

function getVirtualKeyName(key) {
  return key === " " ? "space" : key.toLowerCase();
}

function findVirtualKey(key) {
  return Array.from(document.querySelectorAll(".vk-key")).find(
    (vk) => vk.dataset.key === key
  );
}

function skipOptionalSpaces() {
  while (currentInput[currentIndex] === " ") {
    currentIndex++;
  }
}

function getNextRequiredChar() {
  let index = currentIndex;
  while (currentInput[index] === " ") {
    index++;
  }
  return currentInput[index];
}

function getScoreValue() {
  return currentInput.replaceAll(" ", "").length;
}

function normalizeQuestions(data, level) {
  if (!Array.isArray(data)) {
    throw new Error(`questions_level${level}.json must be an array`);
  }

  return data.map((question, index) => {
    if (typeof question === "string") {
      return {
        id: `legacy_${level}_${String(index + 1).padStart(3, "0")}`,
        level: Number(level),
        category: "legacy",
        categoryLabel: "FP3級",
        display: question,
        input: question,
      };
    }

    if (!question.input || !question.display) {
      throw new Error(`question is missing display or input: ${index + 1}`);
    }

    return {
      ...question,
      id:
        question.id ||
        `question_${level}_${String(index + 1).padStart(3, "0")}`,
      level: Number(question.level || level),
      display: String(question.display),
      input: String(question.input).toLowerCase(),
      categoryLabel: getCategoryLabel(question.category),
    };
  });
}

function getCategoryLabel(category) {
  const labels = {
    life_planning: "ライフプランニング",
    risk_management: "リスク管理",
    financial_assets: "金融資産運用",
    tax_planning: "タックスプランニング",
    real_estate: "不動産",
    inheritance: "相続・事業承継",
    legacy: "FP3級",
  };

  return labels[category] || "FP3級";
}

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
    if (e.key === " " || e.key === "Backspace") e.preventDefault();
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
        while (currentIndex > 0 && currentInput[currentIndex] === " ") {
          currentIndex--;
        }
        renderQuestion();
      }
    } else if (e.key === "Escape") {
      finishGame();
    }
    // Handle normal single‑character input (Option 2: roman letter per keystroke)
    else if (e.key.length === 1) {
      const inputChar = e.key.toLowerCase();
      if (inputChar === " " && currentInput[currentIndex] !== " ") {
        return;
      }
      if (inputChar !== " ") skipOptionalSpaces();
      if (inputChar === currentInput[currentIndex]) {
        currentIndex++;
        skipOptionalSpaces();
        if (currentIndex === currentInput.length) {
          score += getScoreValue();
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
      e.preventDefault();
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
    if (input !== " ") skipOptionalSpaces();
    debugLog(
      `Comparing composition: '${input}' with '${currentInput[currentIndex]}'`
    );

    // 入力された文字が現在の文字と一致するか確認
    if (input === currentInput[currentIndex]) {
      debugLog("Correct input!");
      currentIndex++;
      skipOptionalSpaces();
      if (currentIndex === currentInput.length) {
        score += getScoreValue();
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
  const key = getVirtualKeyName(e.key);
  const vk = findVirtualKey(key);
  if (vk) vk.classList.add("pressed");
});
document.addEventListener("keyup", (e) => {
  const key = getVirtualKeyName(e.key);
  const vk = findVirtualKey(key);
  if (vk) vk.classList.remove("pressed");
});
