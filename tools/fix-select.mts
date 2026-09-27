import { readFileSync, writeFileSync } from "node:fs";
const f = "e:/video/packages/ffmpeg/src/render.ts";
let c = readFileSync(f, "utf-8");
// Replace the entire buildSelectExpr function body
const oldBody = `  // Use if(between(...),0,1) which is compatible with older ffmpeg builds
  const parts = rel.map((s) => \`if(between(T\\\\,\\\${s.start.toFixed(3)}\\\\,\\\${s.end.toFixed(3)})\\\\,0\\\\,1)\`);
  return parts.join("*");`;
const newBody = `  // Use gte/lte (no commas) to avoid filter_complex parsing issues
  const parts = rel.map((s) => \`not(gte(T,\\\${s.start.toFixed(3)})*lte(T,\\\${s.end.toFixed(3)}))\`);
  return parts.join("*");`;
if (c.includes("if(between")) {
  c = c.replace(oldBody, newBody);
  writeFileSync(f, c, "utf-8");
  console.log("Fixed");
} else {
  console.log("Pattern not found, checking...");
  const idx = c.indexOf("if(between");
  console.log("indexOf:", idx);
  if (idx > -1) console.log("context:", c.substring(idx - 50, idx + 120));
}
