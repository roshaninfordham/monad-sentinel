#!/usr/bin/env tsx
import "dotenv/config";
import { spawn } from "node:child_process";
import ora from "ora";
import chalk from "chalk";
import qrcode from "qrcode-terminal";
import open from "open";

type LaunchContext = {
  prod: boolean;
  deploymentUrl: string;
  dashboardUrl: string;
  joinUrl: string;
  sessionId: string;
  contractAddress: string;
};

const command = process.argv[2] ?? "help";
const prod = process.argv.includes("--prod");

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function appUrl() {
  return env("NEXT_PUBLIC_APP_URL") || env("VERCEL_URL") || "http://localhost:3000";
}

async function run(label: string, cmd: string, args: string[], options: { optional?: boolean } = {}) {
  const spinner = ora(label).start();
  try {
    const result = await runCommand(cmd, args);
    spinner.succeed(label);
    return result;
  } catch (error) {
    if (options.optional) {
      spinner.warn(`${label} skipped`);
      return "";
    }
    spinner.fail(label);
    throw error;
  }
}

async function commandExists(cmd: string) {
  try {
    await runCommand(cmd, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

function runCommand(cmd: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, args, { shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `${cmd} exited with ${code}`));
      }
    });
  });
}

async function checkEnv(requireProd: boolean) {
  const required = requireProd
    ? ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "MONAD_RPC_URL", "GATEWAY_PRIVATE_KEY"]
    : [];
  const missing = required.filter((name) => !env(name));
  if (missing.length) {
    throw new Error(`Missing required env vars for prod launch: ${missing.join(", ")}`);
  }
}

async function checkLogins(requireProd: boolean) {
  if (!requireProd) return;
  await run("Checking Vercel CLI", "vercel", ["--version"]);
  await run("Checking Vercel auth", "vercel", ["whoami"]);
}

async function runTests() {
  await run("Running app checks", "pnpm", ["test"]);
  await run("Building web app", "pnpm", ["build"]);
  if (await commandExists("forge")) {
    await run("Running contract tests", "pnpm", ["contracts:test"]);
  } else {
    console.log(chalk.yellow("forge not found; skipping Solidity tests"));
  }
}

async function deployVercel(requireProd: boolean) {
  if (!requireProd) return "http://localhost:3000";
  const args = ["--yes", "--prod"];
  const stdout = await run("Deploying to Vercel", "vercel", args);
  const url = stdout
    .split(/\s+/)
    .find((part) => part.startsWith("https://") && part.includes(".vercel.app"));
  if (!url) throw new Error("Could not find Vercel deployment URL in CLI output");
  return url;
}

async function createSession(deploymentUrl: string) {
  const response = await fetch(`${deploymentUrl}/api/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      label: "Monad Blitz Live Demo",
      useCase: "pharma",
      viewportMode: "indoor"
    })
  });
  if (!response.ok) {
    throw new Error(`Session creation failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { session?: { id?: string }; joinToken?: string; dashboardToken?: string };
  const sessionId = body.session?.id;
  if (!sessionId) throw new Error("Session response did not include session.id");
  return {
    sessionId,
    dashboardUrl: `${deploymentUrl}/dashboard/${sessionId}${body.dashboardToken ? `?d=${body.dashboardToken}` : ""}`,
    joinUrl: `${deploymentUrl}/s/${sessionId}${body.joinToken ? `?t=${body.joinToken}` : ""}`
  };
}

function printPanel(ctx: LaunchContext) {
  const mode = env("CHAIN_DISABLED") === "false" ? "MONAD TESTNET" : "CHAIN SIMULATION MODE";
  const lines = [
    "Monad Sentinel Live Session",
    `Mode: ${mode}`,
    `Dashboard: ${ctx.dashboardUrl}`,
    `Join URL: ${ctx.joinUrl}`,
    `Contract: ${ctx.contractAddress || "not configured"}`,
    `Session: ${ctx.sessionId}`
  ];
  const width = Math.max(...lines.map((line) => line.length)) + 4;
  console.log(chalk.magenta(`╭${"─".repeat(width)}╮`));
  for (const line of lines) {
    console.log(chalk.magenta("│ ") + line.padEnd(width - 2) + chalk.magenta(" │"));
  }
  console.log(chalk.magenta(`╰${"─".repeat(width)}╯`));
  qrcode.generate(ctx.joinUrl, { small: true });
}

async function launch() {
  await checkEnv(prod);
  await checkLogins(prod);
  await runTests();
  const deploymentUrl = await deployVercel(prod);
  const session = await createSession(deploymentUrl);
  const ctx: LaunchContext = {
    prod,
    deploymentUrl,
    dashboardUrl: session.dashboardUrl,
    joinUrl: session.joinUrl,
    sessionId: session.sessionId,
    contractAddress: env("NEXT_PUBLIC_CONTRACT_ADDRESS")
  };
  printPanel(ctx);
  await open(ctx.dashboardUrl);
  console.log(chalk.cyan("Start the Chain Agent in another terminal with: pnpm agent:dev"));
}

async function dev() {
  await run("Starting local web app", "pnpm", ["dev"]);
}

async function verify() {
  await runTests();
}

async function init() {
  console.log(chalk.cyan("Install and configure once:"));
  console.log("  pnpm install");
  console.log("  vercel login");
  console.log("  supabase login");
  console.log("  cp .env.example .env.local");
}

async function reset() {
  console.log(chalk.yellow("Reset currently clears local build artifacts only."));
  await run("Removing Next build output", "rm", ["-rf", "apps/web/.next"], { optional: true });
}

async function main() {
  if (command === "launch" || command === "ship") return launch();
  if (command === "verify") return verify();
  if (command === "dev") return dev();
  if (command === "init") return init();
  if (command === "reset") return reset();
  console.log("Usage: pnpm sentinel:<init|dev|launch|ship|reset|verify> [--prod]");
}

main().catch((error) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
