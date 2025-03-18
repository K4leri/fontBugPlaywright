// import util from "util";
import { PNG } from "pngjs";
import {
  ProcessingOptions,
  BackgroundRemovalOptions,
  Color,
} from "../../types/image";

class ImageProcessor {
  // Find the first x-coordinate with a white pixel
  private findFirstWhiteX(
    originalImage: PNG,
    options: ProcessingOptions = {}
  ): number {
    const { colorToKeep, colorThreshold = 10, neighborRadius = 1 } = options;

    const isWhitelooking = colorToKeep === undefined;

    let result = -1;
    for (let x = 0; x < originalImage.width; x++) {
      for (let y = 0; y < originalImage.height; y++) {
        let whiteNeighbors = 0;

        // Check the pixel and its neighbors
        for (let dx = -neighborRadius; dx <= neighborRadius; dx++) {
          for (let dy = -neighborRadius; dy <= neighborRadius; dy++) {
            const nx = x + dx;
            const ny = y + dy;

            if (
              nx >= 0 &&
              nx < originalImage.width &&
              ny >= 0 &&
              ny < originalImage.height
            ) {
              const offset = (ny * originalImage.width + nx) * 4;

              const pixelColor: Color = {
                r: originalImage.data[offset],
                g: originalImage.data[offset + 1],
                b: originalImage.data[offset + 2],
              };

              // isWhitecolor
              if (isWhitelooking) {
                if (
                  pixelColor.r >= 255 - colorThreshold &&
                  pixelColor.g >= 255 - colorThreshold &&
                  pixelColor.b >= 255 - colorThreshold
                ) {
                  whiteNeighbors++;
                }
              } else {
                if (
                  Math.abs(pixelColor.r - colorToKeep.r) <= colorThreshold &&
                  Math.abs(pixelColor.g - colorToKeep.g) <= colorThreshold &&
                  Math.abs(pixelColor.b - colorToKeep.b) <= colorThreshold
                ) {
                  whiteNeighbors++;
                }
              }
            }
          }
        }

        // If enough neighbors are white, consider this pixel part of a white area
        if (whiteNeighbors > 0) {
          return x;
        }
      }
    }

    return result;
  }

  // Crop image to the edges of non-transparent pixels
  private cropToEdges(png: PNG): PNG {
    let minX = png.width;
    let maxX = 0;
    let minY = png.height;
    let maxY = 0;

    // Find the bounding box of non-transparent pixels
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        const a = png.data[idx + 3]; // Alpha channel

        if (a > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Calculate new dimensions
    const newWidth = maxX - minX + 1;
    const newHeight = maxY - minY + 1;

    // Create a new PNG with cropped dimensions
    const croppedPng = new PNG({ width: newWidth, height: newHeight });

    // Copy non-transparent pixels to the new image
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const oldIdx = (png.width * y + x) << 2;
        const newX = x - minX;
        const newY = y - minY;
        const newIdx = (croppedPng.width * newY + newX) << 2;

        croppedPng.data[newIdx] = png.data[oldIdx]; // R
        croppedPng.data[newIdx + 1] = png.data[oldIdx + 1]; // G
        croppedPng.data[newIdx + 2] = png.data[oldIdx + 2]; // B
        croppedPng.data[newIdx + 3] = png.data[oldIdx + 3]; // Alpha
      }
    }

    return croppedPng;
  }

  // Remove background color from the image
  private removeBackgroundColor(
    png: PNG,
    options: BackgroundRemovalOptions = {}
  ): PNG {
    const { targetColor = { r: 19, g: 18, b: 24 }, tolerance = 10 } = options;
    const processedPng = new PNG({ width: png.width, height: png.height });
    processedPng.data = Buffer.alloc(png.width * png.height * 4, 0);

    for (let i = 0; i < png.data.length; i += 4) {
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      const a = png.data[i + 3];

      const isBackground =
        Math.abs(r - targetColor.r) <= tolerance &&
        Math.abs(g - targetColor.g) <= tolerance &&
        Math.abs(b - targetColor.b) <= tolerance;

      if (!isBackground && a > 0) {
        processedPng.data.set(png.data.subarray(i, i + 4), i);
      }
    }

    return processedPng;
  }

  // Add padding around non-transparent pixels
  private addPaddingAroundNonTransparentPixels(
    png: PNG,
    widthPadding: number = 30,
    heightPadding: number = 10
  ): PNG {
    // Find the bounds of non-transparent pixels
    let minX = png.width;
    let maxX = 0;
    let minY = png.height;
    let maxY = 0;

    // Find the bounding box of non-transparent pixels
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        const a = png.data[idx + 3]; // Alpha channel

        if (a > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Calculate new dimensions with padding
    const newWidth = maxX - minX + 1 + widthPadding * 2;
    const newHeight = maxY - minY + 1 + heightPadding * 2;

    // Create a new PNG with expanded dimensions
    const paddedPng = new PNG({
      width: newWidth,
      height: newHeight,
    });

    // Initialize the new PNG with fully transparent pixels
    paddedPng.data = Buffer.alloc(newWidth * newHeight * 4, 0);

    // Copy non-transparent pixels to the new position with padding
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const oldIdx = (png.width * y + x) << 2;
        const newX = x - minX + widthPadding;
        const newY = y - minY + heightPadding;
        const newIdx = (paddedPng.width * newY + newX) << 2;

        const a = png.data[oldIdx + 3];
        if (a > 0) {
          paddedPng.data[newIdx] = png.data[oldIdx]; // R
          paddedPng.data[newIdx + 1] = png.data[oldIdx + 1]; // G
          paddedPng.data[newIdx + 2] = png.data[oldIdx + 2]; // B
          paddedPng.data[newIdx + 3] = a; // Alpha
        }
      }
    }

    return paddedPng;
  }

  // crop to first white pixel
  private cropImageToFirstPixel(originalImage: PNG, startX: number): PNG {
    // Calculate the new width after cropping
    const newWidth = originalImage.width - startX;

    // Create a new PNG object with the cropped dimensions
    const croppedPng = new PNG({
      width: newWidth,
      height: originalImage.height,
    });

    // Copy pixel data from the original image, starting from startX
    for (let y = 0; y < originalImage.height; y++) {
      for (let x = 0; x < newWidth; x++) {
        const oldOffset = (y * originalImage.width + (x + startX)) * 4;
        const newOffset = (y * newWidth + x) * 4;

        // Copy RGBA values
        croppedPng.data[newOffset] = originalImage.data[oldOffset]; // R
        croppedPng.data[newOffset + 1] = originalImage.data[oldOffset + 1]; // G
        croppedPng.data[newOffset + 2] = originalImage.data[oldOffset + 2]; // B
        croppedPng.data[newOffset + 3] = originalImage.data[oldOffset + 3]; // A
      }
    }

    return croppedPng;
  }

  // underDev
  resizeImage(image: PNG, scaleFactor: number): PNG {
    // Calculate new dimensions
    const newWidth = Math.round(image.width * scaleFactor);
    const newHeight = Math.round(image.height * scaleFactor);

    // Create a new PNG for the resized image
    const resizedImage = new PNG({ width: newWidth, height: newHeight });

    // Map pixels from the original image to the resized image
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        // Calculate the corresponding pixel in the original image
        const origX = Math.floor(x / scaleFactor);
        const origY = Math.floor(y / scaleFactor);

        // Get the pixel index in the original image
        const origIdx = (origY * image.width + origX) << 2;

        // Get the pixel index in the resized image
        const resizedIdx = (y * newWidth + x) << 2;

        // Copy RGBA values
        resizedImage.data[resizedIdx] = image.data[origIdx]; // R
        resizedImage.data[resizedIdx + 1] = image.data[origIdx + 1]; // G
        resizedImage.data[resizedIdx + 2] = image.data[origIdx + 2]; // B
        resizedImage.data[resizedIdx + 3] = image.data[origIdx + 3]; // A
      }
    }

    return resizedImage;
  }

  /**
   * Processes an image by performing the following steps:
   * 1. Finds the first white pixel in the image.
   * 2. Crops the image to the first white pixel.
   * 3. Removes the background color.
   * 4. Crops the image to the edges of non-transparent pixels.
   * 5. Optionally adds padding around the non-transparent pixels.
   *
   * @param buffer - The input image buffer (PNG format).
   * @param options - Optional processing options:
   *   - `paddingWidth`: The width of the padding to add (in pixels).
   *   - `paddingHeight`: The height of the padding to add (in pixels).
   * @returns A Promise that resolves to the processed image buffer.
   * @throws Throws an error if no white pixels are found in the image.
   */
  public processImage(png: PNG, options: ProcessingOptions = {}): PNG {
    // Find the first white pixel
    const startX = this.findFirstWhiteX(png, options);

    if (startX === -1) {
      throw new Error(
        `No ${options.colorToKeep ? options.colorToKeep : "white"} pixels found`
      );
    }

    // Crop the image to the first white pixel
    const croppedImage = this.cropImageToFirstPixel(png, startX);

    // Remove background
    const imageWithoutBackground = this.removeBackgroundColor(croppedImage);

    // Crop to the edges of non-transparent pixels
    const finalImage = this.cropToEdges(imageWithoutBackground);

    // Add padding (if needed)
    if (options.paddingWidth || options.paddingHeight) {
      const paddedImage = this.addPaddingAroundNonTransparentPixels(
        finalImage,
        options.paddingWidth,
        options.paddingHeight
      );
      return paddedImage;
    }

    return finalImage;
  }
}

export const imageProcessor = new ImageProcessor();
