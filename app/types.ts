export interface CharacterOption {
  id: string;
  name: string;
  thumbUrl: string; // path to thumbnail
  fullUrl: string; // path to full PNG for API
}

export interface ModelConfig {
  id: string;
  name: string;
  badge: string;
  color: string;
}

export interface ImageResult {
  id: string;
  model: string;
  index: number; // 0-4
  status: "idle" | "generating" | "done" | "error";
  imageData?: string;
  mimeType?: string;
  text?: string;
  error?: string;
  elapsed?: string;
  finishReason?: string;
  safetyRatings?: any[];
}

export const MODELS: ModelConfig[] = [
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Nano Banana 2",
    badge: "Flash 3.1",
    color: "#4ADE80",
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Nano Banana Pro",
    badge: "Pro 3",
    color: "#F59E0B",
  },
  {
    id: "gemini-2.5-flash-image",
    name: "Nano Banana",
    badge: "Flash 2.5",
    color: "#60A5FA",
  },
];

export const IMAGES_PER_MODEL = 5;

// Default characters (place your PNGs in /public/characters/)
export const DEFAULT_CHARACTERS: CharacterOption[] = [
  {
    id: "char-1",
    name: "루비찌",
    thumbUrl: "/characters/char-a.png",
    fullUrl: "/characters/char-a.png",
  },
  {
    id: "char-2",
    name: "책책이",
    thumbUrl: "/characters/char-b.png",
    fullUrl: "/characters/char-b.png",
  },
  {
    id: "char-3",
    name: "푸덕이",
    thumbUrl: "/characters/char-c.png",
    fullUrl: "/characters/char-c.png",
  },
]
;
