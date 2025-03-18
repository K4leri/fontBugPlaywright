import { BrowserOptions } from "../../types/browser";
import settings from "../../../settings.json";

class Config {
  public options: BrowserOptions;

  constructor() {
    this.options = settings as BrowserOptions;
  }
}

export const config = new Config();
