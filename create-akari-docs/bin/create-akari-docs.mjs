#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith("-"));
const targetDir = targetArg || "akari-docs-starter";
const rootDir = process.cwd();
const destinationDir = path.resolve(rootDir, targetDir);
const templateDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../templates/default");

function fail(message) {
  console.error(`\n[create-akari-docs] ${message}`);
  process.exit(1);
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
const packageJsonRaw = readFileSync(packageJsonPath, "utf8");
const packageJson = packageJsonRaw.replace(/__PROJECT_NAME__/g, path.basename(destinationDir));
writeFileSync(packageJsonPath, packageJson, "utf8");

console.log(`\nAkari-Docs starter created at: ${targetDir}`);
console.log("\nNext steps:");
console.log(`  cd ${targetDir}`);
console.log("  npm install");
console.log("  npm run dev");
