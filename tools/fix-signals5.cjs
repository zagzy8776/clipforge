var fs = require("fs");
var c = fs.readFileSync("e:/video/packages/ai/src/providers/signals.ts", "utf8");
var lines = c.split("\n");
// Character-by-character fix on line 46 (index 45)
var line = lines[45];
// Find "trim()" and remove the ) after the next "" pair
var ti = line.indexOf("trim()");
if (ti >= 0) {
  var after = line.slice(ti + 6); // after "trim()"
  // after should start with ??""  then )  then ;
  // Remove the extra ) 
  if (after.startsWith('??"")'  )) {
    // This means: ??"" then ) then ;
    // We want: ??"" then ;
    // But the display shows: ??"" followed by ); 
    // Actually just rebuild from parts
    var prefix = line.slice(0, ti + 6); // "...trim()"
    var rest = line.slice(ti + 6); // "??..." 
    console.log("rest starts with:", rest.slice(0, 10));
    // Remove the character at position 4 (the stray ))
    if (rest.length > 4 && rest[4] === ")") {
      rest = rest.slice(0, 4) + rest.slice(5);
      lines[45] = prefix + rest;
      console.log("Fixed!");
    }
  }
}
fs.writeFileSync("e:/video/packages/ai/src/providers/signals.ts", lines.join("\n"));
console.log("line46:", lines[45].slice(75, 100));
