var fs = require("fs");
var c = fs.readFileSync("e:/video/packages/ai/src/providers/signals.ts", "utf8");
var lines = c.split("\n");
var broken = lines[45];
// Show the exact characters around the problem
var idx = broken.indexOf('trim()');
var snippet = broken.slice(idx, idx + 20);
console.log("Before:", JSON.stringify(snippet));
// Replace the broken extractTopic with a correct one
var fixed = broken.replace(/trim\(\)\?\?"\)/g, 'trim() ?? ""');
console.log("After:", JSON.stringify(fixed.slice(idx, idx + 20)));
lines[45] = fixed;
fs.writeFileSync("e:/video/packages/ai/src/providers/signals.ts", lines.join("\n"));
console.log("Written");
