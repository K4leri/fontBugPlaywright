// image.service.ts
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { FileType, numbers, textOnBord } from "../../types/general";
import { imageComparator } from "../image/imageComperator";
import Methods from "../browser/methods";
import logger from "../../unit/logger";

export class ImageService {
  constructor(private methods: Methods) {}

  private getImageTypeComparing(type: FileType) {
    switch (type) {
      case "приемСтавок":
        return imageComparator.textImageFiles.get("ПриемСтавок")!;
      case "ИдетИгра":
        return imageComparator.textImageFiles.get("ИдетИгра")!;
      case "ВыиграшПо":
        return imageComparator.textImageFiles.get("ВыиграшПо")!;
      case "37":
        return imageComparator.textImageFiles.get("37")!;
      default:
        throw new Error(`There is no variant to choose: ${type}`);
    }
  }

  async makeFullScreenShot() {
    const buffer = await this.methods.page
      .screenshot({
        timeout: 5000,
        animations: "disabled",
      })
      .catch(() => {
        logger.warn(`Не смог сделать скринщот полного экрана`, {
          threadId: this.methods.threadId,
        });
      });

    if (buffer) {
      this.methods.writeToFile(buffer, "fullPage");
    }
  }

  async makeScreenShot(
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    } = numbers
  ) {
    return await this.methods.page.screenshot({
      clip: options,
      timeout: 5000,
      animations: "disabled",
    });
  }

  // async determineCurrentStage() {
  //   const screenshotBuffer = await this.makeScreenShot();
  //   const result1 = await this.compareImages("приемСтавок", screenshotBuffer);
  //   if (result1.misMatchPercentage <= 10) return "приемСтавок";

  //   const result2 = await this.compareImages("ИдетИгра", screenshotBuffer);
  //   if (result2.misMatchPercentage <= 10) return "ИдетИгра";

  //   const result3 = await this.compareImages("ВыиграшПо", screenshotBuffer);
  //   if (result3.misMatchPercentage <= 10) return "ВыиграшПо";

  //   return "common";
  // }

  async compareImages(type: FileType, screenshotBuffer?: Buffer) {
    const buffer = screenshotBuffer || (await this.makeScreenShot(textOnBord));
    const img2 = this.getImageTypeComparing(type);

    const img1 = PNG.sync.read(buffer);
    const diff = new PNG({ width: img1.width, height: img1.height });
    const mismatchedPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      img1.width,
      img1.height
    );

    return (mismatchedPixels / (img1.width * img1.height)) * 100;
  }

  async waitForImageMatch(type: FileType, timeoutMs: number = 60000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const misMatchPercentage = await this.compareImages(type);
      if (misMatchPercentage >= 10) {
        logger.debug(`Закончил ожидать "${type}" с: ${misMatchPercentage}`, {
          threadId: this.methods.threadId,
        });
        return;
      }
      await this.methods.sleep(500);
    }

    throw new Error(`Timeout reached for "${type}". Exiting wait loop`);
  }
}
