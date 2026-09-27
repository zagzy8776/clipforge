var fs = require("fs");
var c = fs.readFileSync("e:/video/packages/ai/src/providers/signals.ts", "utf8");
// Fix the stray ) in extractTopic
c = c.replace('trim()??"")', 'trim()??"")');
fs.writeFileSync("e:/video/packages/ai/src/providers/signals.ts", c);
console.log("Fixed. Has stray ):", c.includes('trim()??"")'));
