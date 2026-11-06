import { existsSync } from "node:fs";

/** Load ./.env if present; otherwise rely on the shell, but say so (a common miss is Notepad saving `.env.txt`). */
export function loadEnv(): void {
  if (existsSync(".env")) {
    process.loadEnvFile(".env");
    return;
  }
  const hint = existsSync(".env.txt") ? " Found .env.txt; rename it to .env." : "";
  console.warn(`No .env file in ${process.cwd()}; using shell environment variables.${hint}`);
}
