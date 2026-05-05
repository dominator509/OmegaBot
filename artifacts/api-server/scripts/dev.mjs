import { spawn } from "node:child_process";

const env = { PORT: "8080", ...process.env, NODE_ENV: "development" };

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: true,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

await run("corepack", ["pnpm", "run", "build"]);
await run("node", ["--enable-source-maps", "./dist/index.mjs"]);
