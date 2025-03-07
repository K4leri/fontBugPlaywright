import * as fs from "fs";
import * as path from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
// import resemble from "resemblejs";
import logger from "../../unit/logger";

class ImageComparator {
  private bestMatch: number = 0;
  private minMismatchPercentage: number = 100;
  private imagesOfNumbers: Map<number, PNG> = new Map();
  private clearImagesOfNumbers: Map<number, PNG> = new Map();
  public textImageFiles: Map<string, PNG> = new Map();

  constructor() {
    this.loadImages();
  }

  private async loadImages() {
    try {
      this.loadImagesFromDirectory("./images/numbers", this.imagesOfNumbers);
      this.loadImagesFromDirectory(
        "./images/clearNumbers",
        this.clearImagesOfNumbers
      );
      this.loadImagesFromDirectory(
        "./images/general",
        this.textImageFiles,
        false
      );
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  }

  private loadImagesFromDirectory(
    directory: string,
    targetMap: Map<number | string, PNG>,
    parseToInt: boolean = true
  ) {
    try {
      // Resolve the absolute path to the directory
      const absoluteDirectory = path.resolve(process.cwd(), directory);
      logger.debug(`Loading images from directory: ${absoluteDirectory}`);

      const files = fs.readdirSync(absoluteDirectory);
      for (const file of files) {
        const filePath = path.join(absoluteDirectory, file);

        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          continue;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(file, path.extname(file));
        const imagePNG = PNG.sync.read(fileBuffer);

        if (parseToInt) {
          const fileNumber = parseInt(fileName, 10);

          if (isNaN(fileNumber)) {
            console.warn(`Skipping file with invalid number: ${file}`);
            continue;
          }

          targetMap.set(fileNumber, imagePNG);
        } else {
          targetMap.set(fileName, imagePNG);
        }
      }
    } catch (error) {
      console.error(
        `Failed to load images from directory ${directory}:`,
        error
      );
      throw error;
    }
  }

  private writeImageFile(
    buffer: Buffer,
    fileName: string,
    directory: string = "./numbers"
  ) {
    const filePath = path.join(directory, fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer);
    }
  }

  async compareImage(
    screenshot: PNG,
    useClearImages: boolean = true // Default to false (use normal images)
  ) {
    // Determine which map to use based on the boolean option
    const targetMap = useClearImages
      ? this.clearImagesOfNumbers
      : this.imagesOfNumbers;

    const diff = new PNG({
      width: screenshot.width,
      height: screenshot.height,
    });

    // Reset best match tracking for each new comparison
    this.bestMatch = -1;
    this.minMismatchPercentage = 100;

    Array.from(targetMap).forEach(([imageNumber, reference]) => {
      try {
        // Skip comparison if sizes don't match
        if (
          screenshot.width !== reference.width ||
          screenshot.height !== reference.height
        ) {
          return; // Exit early instead of returning a value
        }

        // Perform pixel comparison
        const mismatchedPixels = pixelmatch(
          screenshot.data,
          reference.data,
          diff.data,
          screenshot.width,
          screenshot.height
        );

        const misMatchPercentage =
          (mismatchedPixels / (screenshot.width * screenshot.height)) * 100;

        // Update best match if better
        if (misMatchPercentage < this.minMismatchPercentage) {
          this.minMismatchPercentage = misMatchPercentage;
          this.bestMatch = imageNumber;
        }
      } catch (error) {
        console.error(`Error comparing image ${imageNumber}:`, error);
      }
    });

    // If no good match is found, save the new image to the appropriate directory
    if (this.minMismatchPercentage > 10 || targetMap.size === 0) {
      const newFileName = `${new Date().getTime()}.png`;
      const directory = useClearImages
        ? "./images/clearNumbers"
        : "./images/numbers";
      this.writeImageFile(PNG.sync.write(screenshot), newFileName, directory);
      await this.loadImages(); // Reload images after writing a new file
      throw new Error(`Failed in comparing. Some new picture added`);
    }

    return {
      bestMatch: this.bestMatch,
      mismatchPercentage: this.minMismatchPercentage,
    };
  }
}

export const imageComparator = new ImageComparator();
