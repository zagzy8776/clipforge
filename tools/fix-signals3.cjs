var fs = require("fs");
var c = fs.readFileSync("e:/video/packages/ai/src/providers/signals.ts", "utf8");
var lines = c.split("\n");
// Line 46 (index 45) has a stray ) after the empty string fallback in extractTopic
lines[45] = 'export function extractTopic(text:string):string{const f=text.split(/[.!?]/)[0]?.trim()??"");return f.length>80?f.slice(0,77)+"...":f}';
fs.writeFileSync("e:/video/packages/ai/src/providers/signals.ts", lines.join("\n"));
console.log("Fixed line 46:", lines[45].slice(80, 95));
