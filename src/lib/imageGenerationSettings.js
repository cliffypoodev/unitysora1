export const MAX_IMAGE_SEED = 2147483647;

export const IMAGE_ASPECT_RATIOS = [
  { id: "1:1", label: "Square · 1:1", orientation: "square" },
  { id: "16:9", label: "Landscape · 16:9", orientation: "landscape" },
  { id: "9:16", label: "Portrait · 9:16", orientation: "portrait" },
  { id: "4:3", label: "Landscape · 4:3", orientation: "landscape" },
  { id: "3:4", label: "Portrait · 3:4", orientation: "portrait" },
];

export const IMAGE_OUTPUT_SIZES = [
  { id: "standard", label: "Standard · Faster" },
  { id: "large", label: "Large · More detail" },
];

export const IMAGE_QUALITY_PRESETS = [
  { id: "fast", label: "Fast" },
  { id: "balanced", label: "Balanced" },
  { id: "maximum", label: "Maximum" },
];

const DIMENSIONS = {
  flux: {
    standard: {
      "1:1": [1024, 1024],
      "16:9": [1280, 720],
      "9:16": [720, 1280],
      "4:3": [1024, 768],
      "3:4": [768, 1024],
    },
    large: {
      "1:1": [1536, 1536],
      "16:9": [1536, 864],
      "9:16": [864, 1536],
      "4:3": [1536, 1152],
      "3:4": [1152, 1536],
    },
  },
  nsfw: {
    standard: {
      "1:1": [1536, 1536],
      "16:9": [2016, 1152],
      "9:16": [1152, 2016],
      "4:3": [1728, 1344],
      "3:4": [1344, 1728],
    },
    large: {
      "1:1": [2048, 2048],
      "16:9": [2304, 1296],
      "9:16": [1296, 2304],
      "4:3": [2048, 1536],
      "3:4": [1536, 2048],
    },
  },
};

const STEPS = {
  flux: { fast: 2, balanced: 4, maximum: 8 },
  nsfw: { fast: 20, balanced: 28, maximum: 40 },
};

const PROVIDERS = {
  flux: {
    space: "black-forest-labs/FLUX.1-schnell",
    model: "FLUX.1 Schnell",
  },
  nsfw: {
    space: "IbarakiDouji/WAI-NSFW-illustrious-SDXL",
    model: "WAI NSFW illustrious SDXL v17",
  },
};

export function getImageGenerationSettings({
  aspectRatio = "1:1",
  outputSize = "standard",
  quality = "balanced",
  nsfw = false,
} = {}) {
  const providerKey = nsfw ? "nsfw" : "flux";
  const safeAspectRatio = IMAGE_ASPECT_RATIOS.some((item) => item.id === aspectRatio) ? aspectRatio : "1:1";
  const safeOutputSize = IMAGE_OUTPUT_SIZES.some((item) => item.id === outputSize) ? outputSize : "standard";
  const safeQuality = IMAGE_QUALITY_PRESETS.some((item) => item.id === quality) ? quality : "balanced";
  const [width, height] = DIMENSIONS[providerKey][safeOutputSize][safeAspectRatio];
  const orientation =
    IMAGE_ASPECT_RATIOS.find((item) => item.id === safeAspectRatio)?.orientation || "square";

  return {
    providerKey,
    width,
    height,
    resolution: `${width}x${height}`,
    aspectRatio: safeAspectRatio,
    orientation,
    outputSize: safeOutputSize,
    quality: safeQuality,
    steps: STEPS[providerKey][safeQuality],
    ...PROVIDERS[providerKey],
  };
}
