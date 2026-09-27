var fs = require("fs");
var c = fs.readFileSync("e:/video/packages/ai/src/providers/signals.ts", "utf8");
// Fix: the extractTopic line has ?? "" ) with stray )
// Replace the broken pattern with correct one
c = c.replace(
  /extractTopic\(text:string\):string\{const f=text\.split\(\[\.!\?\]\/\)\[0\]\?\.trim\(\)\?\?""\);/,
  'extractTopic(text:string):string{const f=text.split(/[.!?]/)[0]?.trim()??"");'
);
// Also check if the fix worked
if (c.includes('trim()??"")')) {
  // Manual fix: find line 46 and replace
  var lines = c.split("\n");
  lines[45] = 'export function extractTopic(text:string):string{const f=text.split(/[.!?]/)[0]?.trim()??"");return f.length>80?f.slice(0,77)+"...":f}';
  c = lines.join("\n");
}
fs.writeFileSync("e:/video/packages/ai/src/providers/signals.ts", c);
console.log("line 46:", c.split("\n")[45]);
