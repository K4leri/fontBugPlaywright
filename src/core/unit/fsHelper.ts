import fs from "fs";

export function checkFileExists(filePath: string): void {
  try {
    fs.readFileSync(filePath, "utf8");
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err) {
      const fsError = err as NodeJS.ErrnoException; // Type assertion
      if (fsError.code === "ENOENT") {
        fs.writeFileSync(filePath, JSON.stringify({}), "utf8");
      } else if (fsError.code === "EACCES") {
        console.log("Permission denied");
      } else {
        console.log("Unknown error:", fsError);
      }
    } else {
      console.log("Unknown error:", err);
    }
  }
}
