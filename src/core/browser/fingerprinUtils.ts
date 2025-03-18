import fs from "fs";
import path from "path";
import { FingerprintGenerator } from "fingerprint-generator";

class FingerprintManager {
  private projectRoot: string;
  private headersDir: string;
  private fingerprintsDir: string;
  private fingerprintCache: Map<number, any>; // Cache for generated fingerprints

  constructor() {
    this.projectRoot = process.cwd();
    this.headersDir = path.join(this.projectRoot, "state", "headers");
    this.fingerprintsDir = path.join(this.projectRoot, "state", "fingerprints");
    this.fingerprintCache = new Map();

    // Ensure directories exist
    fs.mkdirSync(this.headersDir, { recursive: true });
    fs.mkdirSync(this.fingerprintsDir, { recursive: true });
  }

  /**
   * Gets or generates a fingerprint for a given thread ID.
   * Prioritizes reading from files if they exist.
   */
  async getFingerprint(
    threadId: number
  ): Promise<{ fingerprint: any; headers: any }> {
    // Check cache first
    if (this.fingerprintCache.has(threadId)) {
      return this.fingerprintCache.get(threadId);
    }

    // Try to read from files
    const savedFingerprint = this.readFingerprint(threadId);
    if (savedFingerprint) {
      // Add to cache
      this.fingerprintCache.set(threadId, savedFingerprint);
      return savedFingerprint;
    }

    // Generate new fingerprint if files don't exist
    const fingerprintGenerator = new FingerprintGenerator({
      devices: ["desktop"],
      operatingSystems: ["windows"],
      browsers: ["chrome"],
      screen: {
        minHeight: 1080,
        maxHeight: 1080,
        minWidth: 1920,
        maxWidth: 1920,
      },
    });

    const { fingerprint, headers } = fingerprintGenerator.getFingerprint();

    // Save to files
    this.writeFingerprint(threadId, fingerprint, headers);

    // Add to cache
    this.fingerprintCache.set(threadId, { fingerprint, headers });

    return { fingerprint, headers };
  }

  /**
   * Writes fingerprint and headers to files.
   */
  private writeFingerprint(
    threadId: number,
    fingerprint: any,
    headers: any
  ): void {
    const fingerprintPath = path.join(this.fingerprintsDir, `${threadId}.json`);
    const headersPath = path.join(this.headersDir, `${threadId}.json`);

    fs.writeFileSync(fingerprintPath, JSON.stringify(fingerprint, null, 2));
    fs.writeFileSync(headersPath, JSON.stringify(headers, null, 2));
  }

  /**
   * Reads fingerprint and headers from files.
   */
  readFingerprint(threadId: number): { fingerprint: any; headers: any } | null {
    const fingerprintPath = path.join(this.fingerprintsDir, `${threadId}.json`);
    const headersPath = path.join(this.headersDir, `${threadId}.json`);

    if (!fs.existsSync(fingerprintPath) || !fs.existsSync(headersPath)) {
      return null; // Files don't exist
    }

    try {
      const fingerprint = JSON.parse(fs.readFileSync(fingerprintPath, "utf-8"));
      const headers = JSON.parse(fs.readFileSync(headersPath, "utf-8"));
      return { fingerprint, headers };
    } catch (error) {
      console.error("Error reading fingerprint files:", error);
      return null;
    }
  }

  /**
   * Deletes fingerprint and headers files.
   */
  deleteFingerprint(threadId: number): void {
    const fingerprintPath = path.join(this.fingerprintsDir, `${threadId}.json`);
    const headersPath = path.join(this.headersDir, `${threadId}.json`);

    if (fs.existsSync(fingerprintPath)) {
      fs.unlinkSync(fingerprintPath);
    }

    if (fs.existsSync(headersPath)) {
      fs.unlinkSync(headersPath);
    }

    // Remove from cache
    this.fingerprintCache.delete(threadId);
  }

  /**
   * Clears all fingerprints (files and cache).
   */
  clearAllFingerprints(): void {
    // Delete all files in the directories
    fs.readdirSync(this.fingerprintsDir).forEach((file) => {
      fs.unlinkSync(path.join(this.fingerprintsDir, file));
    });

    fs.readdirSync(this.headersDir).forEach((file) => {
      fs.unlinkSync(path.join(this.headersDir, file));
    });

    // Clear the cache
    this.fingerprintCache.clear();
  }
}

export const fingerprintManager = new FingerprintManager();
