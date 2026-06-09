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
const realChain = process.argv.includes("--real-chain");

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
  const required = requireProd ? ["NEXT_PUBLIC_SUPABASE_URL"] : [];
  if (realChain) required.push("MONAD_RPC_URL", "GATEWAY_PRIVATE_KEY", "NEXT_PUBLIC_CONTRACT_ADDRESS");
  const missing = required.filter((name) => !env(name));
  if (requireProd && !env("SUPABASE_SECRET_KEY") && !env("SUPABASE_SERVICE_ROLE_KEY")) {
    missing.push("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }
  if (missing.length) {
    throw new Error(`Missing required env vars for prod launch: ${missing.join(", ")}`);
  }
}

async function checkRpcBlockNumber() {
  const rpcUrl = env("MONAD_RPC_URL");
  if (!rpcUrl) throw new Error("MONAD_RPC_URL is not configured");
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })
  });
  const body = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!response.ok || !body.result) {
    throw new Error(body.error?.message ?? `RPC blockNumber failed with HTTP ${response.status}`);
  }
  return Number.parseInt(body.result, 16);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
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
  if (realChain) {
    if (env("CHAIN_DISABLED") !== "false") {
      throw new Error("--real-chain requires CHAIN_DISABLED=false");
    }
    for (const name of ["MONAD_RPC_URL", "GATEWAY_PRIVATE_KEY", "NEXT_PUBLIC_CONTRACT_ADDRESS"]) {
      if (!env(name)) throw new Error(`--real-chain requires ${name}`);
    }
    const spinner = ora("Checking Monad RPC").start();
    const blockNumber = await checkRpcBlockNumber();
    spinner.succeed(`Checking Monad RPC: block ${blockNumber}`);
  }
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

async function doctor() {
  const baseUrl = appUrl().replace(/\/$/, "");
  const checks: Array<[string, () => Promise<string>]> = [
    [
      "Vercel/app reachable",
      async () => {
        const response = await fetch(baseUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return baseUrl;
      }
    ],
    [
      "Create session and tokenized QR",
      async () => {
        const created = await fetchJson<{ session?: { id?: string }; joinToken?: string; dashboardToken?: string }>(`${baseUrl}/api/sessions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label: "Sentinel Doctor", viewportMode: "indoor", useCase: "pharma" })
        });
        const sessionId = created.session?.id;
        if (!sessionId || !created.joinToken || !created.dashboardToken) throw new Error("session response missing token fields");
        const session = await fetchJson<{ joinToken?: string }>(`${baseUrl}/api/session/${sessionId}?d=${created.dashboardToken}`);
        if (session.joinToken !== created.joinToken) throw new Error("dashboard token did not reveal join token");
        return `${baseUrl}/dashboard/${sessionId}?d=${created.dashboardToken}`;
      }
    ],
    [
      "Supabase env present",
      async () => {
        if (!env("NEXT_PUBLIC_SUPABASE_URL")) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");
        if (!env("SUPABASE_SECRET_KEY") && !env("SUPABASE_SERVICE_ROLE_KEY")) throw new Error("Supabase server key missing");
        return "configured";
      }
    ]
  ];

  if (realChain || env("CHAIN_DISABLED") === "false") {
    checks.push(
      [
        "Monad RPC block number",
        async () => {
          const block = await checkRpcBlockNumber();
          return String(block);
        }
      ],
      [
        "Real chain env",
        async () => {
          for (const name of ["NEXT_PUBLIC_CONTRACT_ADDRESS", "GATEWAY_PRIVATE_KEY"]) {
            if (!env(name)) throw new Error(`${name} missing`);
          }
          return env("NEXT_PUBLIC_CONTRACT_ADDRESS");
        }
      ]
    );
  } else {
    checks.push([
      "Chain mode",
      async () => "simulated; explorer links must be disabled"
    ]);
  }

  for (const [label, check] of checks) {
    const spinner = ora(label).start();
    try {
      const detail = await check();
      spinner.succeed(`${label}: ${detail}`);
    } catch (error) {
      spinner.fail(label);
      throw error;
    }
  }
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
  if (command === "doctor") return doctor();
  if (command === "dev") return dev();
  if (command === "init") return init();
  if (command === "reset") return reset();
  console.log("Usage: pnpm sentinel:<init|dev|launch|ship|reset|verify|doctor> [--prod] [--real-chain]");
}

main().catch((error) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
