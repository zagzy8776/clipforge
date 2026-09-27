import { readFileSync, writeFileSync } from "node:fs";
const f = "e:/video/packages/ffmpeg/src/render.ts";
let c = readFileSync(f, "utf-8");
// Find and replace the line with if(between...) using regex
c = c.replace(
  /const parts = rel\.map\(\(s\) => `if\(between\(T[^`]*`\);[\s]*return parts/,
  `// Use gte/lte (no commas) to avoid filter_complex parsing issues\n  const parts = rel.map((s) => \`not(gte(T,\${s.start.toFixed(3)})*lte(T,\${s.end.toFixed(3)}))\`);\n  return parts`,
);
writeFileSync(f, c, "utf-8");
console.log("Done. Contains 'if(between':", c.includes("if(between"));
console.log("Contains 'gte(T':", c.includes("gte(T"));
