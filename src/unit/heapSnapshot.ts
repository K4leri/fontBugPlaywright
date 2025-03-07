import * as fs from "fs";
import * as v8 from "v8";
import path from "path";
import * as readline from "readline";

export function generateHeapSnapshot() {
  const snapshot = v8.getHeapSnapshot();
  const fileName = `heapdump-${Date.now()}.heapsnapshot`;
  const dumpFolder = path.join(process.cwd(), "debug", "dump");
  const filePath = path.join(dumpFolder, fileName);

  // Create the dump folder if it doesn't exist
  fs.mkdirSync(dumpFolder, { recursive: true });

  const fileStream = fs.createWriteStream(filePath);

  snapshot.pipe(fileStream);
  fileStream.on("finish", () => {
    console.log(`Heap snapshot saved to ${filePath}`);
  });
}

// Create a CLI interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", (input) => {
  if (input === "heapdump") {
    generateHeapSnapshot();
  }
});

console.log('Type "heapdump" to generate a heap snapshot');
