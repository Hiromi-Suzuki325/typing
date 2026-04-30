import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const requiredKeys = ["id", "level", "category", "display", "input", "tags"];
const allowedCategories = new Set([
  "life_planning",
  "risk_management",
  "financial_assets",
  "tax_planning",
  "real_estate",
  "inheritance",
]);
const minCounts = new Map([
  [1, 300],
  [2, 240],
  [3, 180],
  [4, 120],
]);
const inputPattern = /^[a-z ]+$/;

const seenIds = new Set();
const errors = [];
const counts = new Map();
const categoryCounts = new Map();

for (const [level, minCount] of minCounts) {
  const file = path.join(rootDir, "data", `questions_level${level}.json`);
  let data;

  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(rootDir, file)}: JSON parse failed: ${error.message}`);
    continue;
  }

  if (!Array.isArray(data)) {
    errors.push(`${path.relative(rootDir, file)}: root must be an array`);
    continue;
  }

  counts.set(level, data.length);
  categoryCounts.set(level, new Map());
  if (data.length < minCount) {
    errors.push(`level ${level}: expected at least ${minCount}, got ${data.length}`);
  }

  data.forEach((question, index) => {
    const location = `level ${level} item ${index + 1}`;

    if (!question || typeof question !== "object" || Array.isArray(question)) {
      errors.push(`${location}: item must be an object`);
      return;
    }

    for (const key of requiredKeys) {
      if (!(key in question)) errors.push(`${location}: missing key "${key}"`);
    }

    if (typeof question.id !== "string" || question.id.length === 0) {
      errors.push(`${location}: id must be a non-empty string`);
    } else if (seenIds.has(question.id)) {
      errors.push(`${location}: duplicate id "${question.id}"`);
    } else {
      seenIds.add(question.id);
    }

    if (question.level !== level) {
      errors.push(`${location}: level must be ${level}`);
    }

    if (!allowedCategories.has(question.category)) {
      errors.push(`${location}: invalid category "${question.category}"`);
    } else {
      const levelCategoryCounts = categoryCounts.get(level);
      levelCategoryCounts.set(
        question.category,
        (levelCategoryCounts.get(question.category) || 0) + 1
      );
    }

    if (typeof question.display !== "string" || question.display.trim().length === 0) {
      errors.push(`${location}: display must be a non-empty string`);
    }

    if (typeof question.input !== "string" || !inputPattern.test(question.input)) {
      errors.push(`${location}: input must match ${inputPattern}`);
    } else {
      if (question.input !== question.input.trim()) {
        errors.push(`${location}: input must not have leading or trailing spaces`);
      }
      if (question.input.includes("  ")) {
        errors.push(`${location}: input must not contain repeated spaces`);
      }
    }

    if (!Array.isArray(question.tags) || question.tags.some((tag) => typeof tag !== "string")) {
      errors.push(`${location}: tags must be an array of strings`);
    }
  });

  for (const category of allowedCategories) {
    const count = categoryCounts.get(level).get(category) || 0;
    if (count === 0) {
      errors.push(`level ${level}: missing category "${category}"`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  [...counts]
    .map(([level, count]) => `level ${level}: ${count}`)
    .join("\n")
);
console.log(`total: ${[...counts.values()].reduce((sum, count) => sum + count, 0)}`);
console.log("verification passed");
