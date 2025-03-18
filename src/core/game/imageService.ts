// image.service.ts
import { numbers } from "../../types/general";
import { Page } from "playwright";

export class ImageService {
  constructor(private page: Page) {}

  async makeScreenShot(options = numbers) {
    return await this.page.screenshot({
      clip: options,
      timeout: 1500,
      animations: "disabled",
    });
  }
}
