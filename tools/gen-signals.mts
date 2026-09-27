import { writeFileSync } from "node:fs";

const lines: string[] = [];
lines.push("/**");
lines.push(" * Lexical signal extraction v2. Deterministic, narrative-arc-aware.");
lines.push(" */");
lines.push('const HOOK_PAT = /^(nobody|everyone|the biggest|here.s the thing|what most|you need to|let me tell|the truth is|i learned|the secret|most people|here.s what|listen|stop|imagine|i never|i didn.t|the problem|what i|i want to tell|today i|truth be told|but here)/i;');

writeFileSync("e:/video/packages/ai/src/providers/signals.ts", lines.join("\n") + "\n");
console.log("started");
