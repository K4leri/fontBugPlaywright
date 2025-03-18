export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface ScreenShotOptiones {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ProcessingOptions {
  colorToKeep?: Color;
  backgroundColorToRemove?: Color;
  colorThreshold?: number;
  neighborRadius?: number;
  paddingWidth?: number;
  paddingHeight?: number;
}

export interface BackgroundRemovalOptions {
  targetColor?: Color;
  tolerance?: number;
  debug?: boolean;
}

// Enum to represent different image types
export enum ImageType {
  Normal = "numbers",
  Clear = "clearNumbers",
  Small = "smallNumbers",
}
