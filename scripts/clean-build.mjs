import { rmSync } from "node:fs";
import { resolve } from "node:path";

for (const target of [".next", "out"]) {
  rmSync(resolve(process.cwd(), target), { recursive: true, force: true });
  console.log(`Removed ${target}`);
}
