#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const command = args[0];
const targetArg = args.find((arg, index) => index > 0 && !arg.startsWith("-"));

function printHelp() {
  console.log("Akari Docs CLI");
  console.log("");
  console.log("Usage:");
  console.log("  npx akari-docs init [project-name]");
  console.log("");
  console.log("Example:");
  console.log("  npx akari-docs init my-docs");
}

function fail(message) {
  console.error(`\n[akari-docs] ${message}`);
  process.exit(1);
}

if (!command || command === "-h" || command === "--help") {
  printHelp();
  process.exit(0);
}

if (command !== "init") {
  fail(`Unknown command: ${command}`);
}

const targetDir = targetArg || "akari-docs-starter";
const rootDir = process.cwd();
const destinationDir = path.resolve(rootDir, targetDir);
const cliDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(cliDir, "../templates/default");

if (!existsSync(templateDir)) {
  fail("Starter template not found. Reinstall akari-docs and try again.");
}

if (existsSync(destinationDir)) {
  const files = readdirSync(destinationDir);
  if (files.length > 0) {
    fail(`Target directory is not empty: ${targetDir}`);
  }
} else {
  mkdirSync(destinationDir, { recursive: true });
}

cpSync(templateDir, destinationDir, { recursive: true });

const packageJsonPath = path.join(destinationDir, "package.json");
if (existsSync(packageJsonPath)) {
  const packageJsonRaw = readFileSync(packageJsonPath, "utf8");
  const packageJson = packageJsonRaw.replace(/__PROJECT_NAME__/g, path.basename(destinationDir));
  writeFileSync(packageJsonPath, packageJson, "utf8");
}

console.log(`\nAkari-Docs starter created at: ${targetDir}`);
console.log("\nNext steps:");
console.log(`  cd ${targetDir}`);
console.log("  npm install");
console.log("  npm run dev");
