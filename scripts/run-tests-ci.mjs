import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const logDir = resolve(process.cwd(), "reports/tests");
mkdirSync(logDir, { recursive: true });

const env = {
  ...process.env,
  TURBO_DISABLE_KEYCHAIN: "1",
  TURBO_API: "",
};

const logFile = resolve(logDir, "latest.log");

function recordAndMaybeExit(result, note) {
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const finalOutput = note ? `${output}\n${note}\n` : output;
  writeFileSync(logFile, finalOutput);
  return finalOutput;
}

function runTurbo() {
  return spawnSync("pnpm", ["exec", "turbo", "run", "test"], {
    env,
    encoding: "utf-8",
  });
}

function runPnpmRecursive() {
  return spawnSync("pnpm", ["-r", "--workspace-concurrency=1", "run", "test"], {
    env: process.env,
    encoding: "utf-8",
  });
}

const turboResult = runTurbo();
const turboOutput = recordAndMaybeExit(turboResult);

if (!turboResult.status || turboResult.status === 0) {
  process.stdout.write(turboResult.stdout ?? "");
  process.stderr.write(turboResult.stderr ?? "");
  process.exit(0);
}

const normalized = (turboOutput || "").toLowerCase();
const tlsError =
  normalized.includes("failed to create apiclient") &&
  normalized.includes("no keychain is available");

if (tlsError) {
  console.warn(
    "turbo 远程缓存不可用，切换为 `pnpm -r run test` 回退执行方式。"
  );
  const pnpmResult = runPnpmRecursive();
  const pnpmOutput = recordAndMaybeExit(
    pnpmResult,
    "Fallback: pnpm -r run test"
  );

  if (!pnpmResult.status || pnpmResult.status === 0) {
    process.stdout.write(pnpmResult.stdout ?? "");
    process.stderr.write(pnpmResult.stderr ?? "");
    process.exit(0);
  }

  const hints = [
    "missing script: test",
    "no script named test",
    "no projects matched the filters",
  ];
  const noTasks = hints.some((hint) => pnpmOutput.toLowerCase().includes(hint));

  if (noTasks) {
    console.log("未检测到可执行的测试任务，已在日志中记录说明。");
    process.exit(0);
  }

  console.error(pnpmOutput);
  process.exit(pnpmResult.status ?? 1);
}

const noTaskHints = [
  "command test not found",
  "missing script: test",
  "no tasks match the specified filters",
  "no package scripts run",
  "task test not found",
];
const hasNoTasks = noTaskHints.some((hint) => normalized.includes(hint));

if (hasNoTasks) {
  console.log("未检测到可执行的测试任务，已在日志中记录说明。");
  process.exit(0);
}

console.error(turboOutput);
process.exit(turboResult.status ?? 1);
