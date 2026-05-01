import { buildLatticeFromTokens } from "./engine/buildLattice.js";
import { TypingMachine } from "./engine/typingMachine.js";

let questions = [];
let currentQuestion = null;
let currentLattice = [];
let machine = null;
let pastInput = [];
let score = 0;
let totalChars = 0;
let totalMistypes = 0;
let startTime;
let timerInterval;
let isComposing = false;
let compositionText = "";
let isGameStarting = false;
let lastElapsed = 0;

const DEFAULT_TIME_LIMIT = 60; // タイムリミット（秒）
const TIME_LIMITS_BY_LEVEL = {
  2: 70,
  3: 80,
  4: 90,
};
let currentTimeLimit = DEFAULT_TIME_LIMIT;
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
const finalCharsEl = document.getElementById("final-chars");
const finalSpeedEl = document.getElementById("final-speed");
const finalMistypeRateEl = document.getElementById("final-mistype-rate");
const retryBtn = document.getElementById("retry");
const activeLevelEl = document.getElementById("active-level");
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
  const file = `data/v2/questions_level${level}.json`;
  const fetchJson = (path) => fetch(path, { cache: "no-store" }).then((r) => r.json());

  return fetch(file, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load v2 level ${level}: ${res.status}`);
      }
      return res.json();
    })
    .catch((err) => {
      console.error("Error loading questions:", err);
      return fetchJson("data/v2/questions_level1.json");
    });
}

function prepareQuestion() {
  if (questions.length === 0) {
    finishGame();
    return;
  }
  currentQuestion = questions.shift();
  currentLattice = buildLatticeFromTokens(currentQuestion.tokens);
  machine = new TypingMachine(currentLattice);
  pastInput = [];
  renderQuestion();
}

function renderQuestion() {
  questionDisplayEl.textContent = currentQuestion.display;
  questionCategoryEl.textContent = currentQuestion.categoryLabel;
  questionEl.innerHTML = "";

  const { moraDone } = machine?.getProgress() || { moraDone: 0 };
  renderTypingGuideSpans(moraDone);
  debugLog(`Rendered question: ${currentQuestion.display}, mora: ${moraDone}`);
  updateNextKey();
}

function getTypingGuideText(tokens) {
  return tokens.map(getTypingGuideTokenText).join("");
}

function getTypingGuideTokenText(token) {
  if (token.kind === "raw") return token.text;
  if (token.yomi) return token.yomi;
  return token.text;
}

function renderTypingGuideSpans(moraDone) {
  const latticeByToken = new Map();
  currentLattice.forEach((entry, latticeIndex) => {
    const tokenIndex = entry.displayRange?.tokenIndex;
    if (tokenIndex === undefined) return;
    if (!latticeByToken.has(tokenIndex)) latticeByToken.set(tokenIndex, []);
    latticeByToken.get(tokenIndex).push({ entry, latticeIndex });
  });

  currentQuestion.tokens.forEach((token, tokenIndex) => {
    const entries = latticeByToken.get(tokenIndex);
    if (!entries || entries.length === 0) {
      appendTypingGuideSpan(getTypingGuideTokenText(token), getSkippedTokenClass(tokenIndex, moraDone));
      return;
    }

    for (const item of entries) {
      appendTypingGuideSpan(getLatticeGuideText(item.entry), getLatticeSpanClass(item.latticeIndex, moraDone));
    }
  });
}

function appendTypingGuideSpan(text, className = "") {
  if (!text) return;
  const span = document.createElement("span");
  span.textContent = text;
  if (className) span.className = className;
  questionEl.appendChild(span);
}

function getLatticeGuideText(entry) {
  if (entry.kind === "raw") return entry.text;
  return entry.mora;
}

function getLatticeSpanClass(latticeIndex, moraDone) {
  if (latticeIndex < moraDone) return "correct";
  if (latticeIndex === moraDone) return "current";
  return "";
}

function getSkippedTokenClass(tokenIndex, moraDone) {
  const previous = [...currentLattice]
    .reverse()
    .find((entry) => entry.displayRange?.tokenIndex < tokenIndex);
  if (!previous) return moraDone === 0 ? "current" : "";

  const previousIndex = currentLattice.indexOf(previous);
  return previousIndex < moraDone ? "correct" : "";
}

function startGame() {
  if (isGameStarting) return;
  isGameStarting = true;
  score = 0;
  totalChars = 0;
  totalMistypes = 0;
  lastElapsed = 0;
  currentQuestion = null;
  currentLattice = [];
  machine = null;
  pastInput = [];
  scoreEl.textContent = "0";
  timerEl.textContent = "0.0";
  questionDisplayEl.textContent = "問題を読み込み中";
  questionCategoryEl.textContent = "FP3級";
  updateNextKey();

  const level = getSelectedLevel();
  currentTimeLimit = getTimeLimit(level);
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
    timerEl.textContent = Math.min(elapsed, currentTimeLimit).toFixed(1);
    if (elapsed >= currentTimeLimit) finishGame();
  }, 100);
}

function finishGame() {
  clearInterval(timerInterval);
  isGameStarting = false;
  const elapsedSec = Math.min(lastElapsed, currentTimeLimit);
  timerEl.textContent = elapsedSec.toFixed(1);
  finalScoreEl.textContent = `スコア: ${score}`;
  finalCharsEl.textContent = totalChars;
  // 経過秒が0でも0除算を避ける
  const speed = elapsedSec > 0 ? totalChars / elapsedSec : 0;
  finalSpeedEl.textContent = speed.toFixed(1);
  finalMistypeRateEl.textContent = getMistypeRate().toFixed(1);
  clearNextKey();
  showScreen(resultScreen);
}

function getMistypeRate() {
  const attempts = totalChars + totalMistypes;
  return attempts > 0 ? (totalMistypes / attempts) * 100 : 0;
}

function getSelectedLevel() {
  const radios = document.querySelectorAll('input[name="difficulty"]');
  for (const r of radios) {
    if (r.checked) return r.value;
  }
  return "1";
}

function getTimeLimit(level) {
  return TIME_LIMITS_BY_LEVEL[Number(level)] || DEFAULT_TIME_LIMIT;
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

function updateNextKey() {
  clearNextKey();
  if (!nextKeyEl || !machine) return;

  const nextChars = [...machine.getNextChars()];
  if (nextChars.length === 0) {
    nextKeyEl.textContent = "-";
    return;
  }

  nextKeyEl.textContent = nextChars.map((char) => char.toUpperCase()).join("/");

  nextChars.forEach((char) => {
    const vk = findVirtualKey(getVirtualKeyName(char));
    if (vk) vk.classList.add("next");
  });
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

function getScoreValue() {
  return machine ? machine.getProgress().moraTotal : 0;
}

function handleTypingChar(inputChar) {
  if (!machine || inputChar === " ") return;

  const char = inputChar.toLowerCase();
  if (!machine.step(char)) {
    totalMistypes += 1;
    return;
  }

  pastInput.push(char);
  totalChars += 1;

  if (machine.isComplete()) {
    score += getScoreValue();
    scoreEl.textContent = score;
    prepareQuestion();
  } else {
    renderQuestion();
  }
}

function handleBackspace() {
  if (!machine || pastInput.length === 0) return;
  pastInput.pop();
  machine.reset();
  for (const char of pastInput) machine.step(char);
  renderQuestion();
}

function normalizeQuestions(data, level) {
  if (!Array.isArray(data)) {
    throw new Error(`questions_level${level}.json must be an array`);
  }

  return data.map((question, index) => {
    if (typeof question === "string") {
      throw new Error(`question must be tokenized object: ${index + 1}`);
    }

    if (!question.display || !Array.isArray(question.tokens)) {
      throw new Error(`question is missing display or tokens: ${index + 1}`);
    }

    return {
      ...question,
      id:
        question.id ||
        `question_${level}_${String(index + 1).padStart(3, "0")}`,
      level: Number(question.level || level),
      display: String(question.display),
      tokens: question.tokens,
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
      handleBackspace();
    } else if (e.key === "Escape") {
      finishGame();
    }
    // Handle normal single‑character input (Option 2: roman letter per keystroke)
    else if (e.key.length === 1) {
      handleTypingChar(e.key);
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
    for (const inputChar of e.data) {
      handleTypingChar(inputChar);
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
