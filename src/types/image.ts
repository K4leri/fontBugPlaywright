export interface Color {
  r: number;
  g: number;
  b: number;
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
