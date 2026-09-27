var fs = require("fs");

// Fix 1: Add editing-styles to types barrel
var f1 = "e:/video/packages/types/src/public.ts";
var c1 = fs.readFileSync(f1, "utf8");
if (!c1.includes("editing-styles")) {
  c1 = c1.replace(
    'export * from "./editplan.js";',
    'export * from "./editplan.js";\nexport * from "./editing-styles.js";'
  );
  fs.writeFileSync(f1, c1, "utf-8");
  console.log("1. Added editing-styles to types barrel");
} else {
  console.log("1. Already exported");
}

// Fix 2: Remove duplicate EditPlanInput export from editplan.ts
var f2 = "e:/video/packages/rendering/src/editplan.ts";
var c2 = fs.readFileSync(f2, "utf8");
c2 = c2.replace("\nexport { EditPlanInput };\n", "\n");
fs.writeFileSync(f2, c2, "utf-8");
console.log("2. Removed duplicate export");

// Fix 3: Add exports to ffmpeg index
var f3 = "e:/video/packages/ffmpeg/src/index.ts";
var c3 = fs.readFileSync(f3, "utf8");
if (!c3.includes("beats")) {
  c3 += '\nexport { detectBeats, nearestBeat, energyAt, type BeatData } from "./beats.js";\n';
  c3 += 'export { smoothCropKeyframes, buildCropExpression } from "./crop-smooth.js";\n';
  c3 += 'export { detectWordEmphasis, emphasisToAssTags, type WordEmphasis, type EmphasizedWord } from "./dynamic-captions.js";\n';
  fs.writeFileSync(f3, c3, "utf-8");
  console.log("3. Added exports to ffmpeg index");
} else {
  console.log("3. Already exported");
}
