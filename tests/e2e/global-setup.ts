import { execFileSync } from "node:child_process";

export default function setup() {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL!,
        DIRECT_URL: process.env.TEST_DATABASE_URL!,
      },
      stdio: "pipe",
    },
  );
}
