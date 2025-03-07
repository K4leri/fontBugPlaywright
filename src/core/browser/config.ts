import { BrowserOptions } from "../../types/browser";
import { Accounts } from "../../types/general";
import settings from "../../../settings.json";
import accounts from "../../../accounts.json";

class Config {
  public options: BrowserOptions;
  public accounts: Accounts[];

  constructor() {
    this.options = settings as BrowserOptions;
    this.accounts = accounts;
  }
}

export const config = new Config();
