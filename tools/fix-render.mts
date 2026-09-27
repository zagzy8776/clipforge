import { readFileSync, writeFileSync } from "node:fs";

const file = "e:/video/packages/ffmpeg/src/render.ts";
let content = readFileSync(file, "utf-8");

// Fix the reframe filter: use scale=force_original_aspect_ratio=increase then crop
// Old broken: scale='if(gt(iw/ih,${ar}),ih*${ar},iw)':'if(gt(iw/ih,${ar}),ih,iw/${ar})'
content = content.replace(
  /const ar = plan\.width \/ plan\.height;\n\s*vf\.push\(`scale=.*?\`;\n\s*vf\.push\(`crop=.*?\`\);/,
  `vf.push(\`scale='min(iw,ih*\${plan.width}/plan.height)':min(ih,iw*plan.height/plan.width)',setsar=1\`);\n  vf.push(\`crop=\${plan.width}:\${plan.height}\`);`
);

writeFileSync(file, content, "utf-8");
console.log("Fixed render.ts reframe filter");
