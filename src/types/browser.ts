export interface BrowserOptions {
  browserType: "chromium" | "firefox" | "webkit";
  headless: boolean;
  threads: number;
  onlyRead: boolean;
}
