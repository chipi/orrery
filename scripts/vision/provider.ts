/**
 * Vision provider abstraction (PRD-018 / RFC-022 §3).
 *
 * Mirrors the PRD-016 TtsProvider pattern: a thin interface so the
 * choice of vision model is config + new impl, not a pipeline rewrite.
 * v2.0 ships an Anthropic Sonnet 4.6 implementation (scripts/vision/
 * anthropic.ts). Future swaps to OpenAI / Google Vision / etc. add
 * a new file under scripts/vision/ and bump the TTS-provider-style
 * env var (TTS_PROVIDER for audio; here, VISION_PROVIDER).
 *
 * The interface is intentionally minimal: one method (score) that
 * takes image bytes + context and returns the structured fields the
 * Image Pipeline v2 needs. Caching, prompt assembly, and per-image
 * orchestration live above this layer (scripts/vision/cache.ts +
 * score-images.ts).
 */

export type VisionCategory =
  | 'spacecraft'
  | 'surface'
  | 'launch'
  | 'orbital'
  | 'hardware'
  | 'people'
  | 'diagram'
  | 'render'
  | 'other';

export interface VisionScoreResult {
  /** 1-10 inclusive. Threshold for selection is >= 5 by default. */
  score: number;
  /** One-sentence description of what's in the frame. Used as alt text. */
  subject: string;
  /** Editorial category. `people` and `diagram` reject for general use. */
  category: VisionCategory;
  /** Crop anchor for sharp variant generation. 0,0 = top-left of source. */
  focal_point: { x: number; y: number };
  /** Non-null when the model refuses the image (low resolution, NSFW, etc.). */
  reject_reason: string | null;
  /**
   * USD cost of this single API call (input + output tokens × model
   * pricing). Recorded by the cost ledger (PRD-018 M12 + S4).
   */
  cost_usd: number;
}

export interface VisionScoreInput {
  imageBytes: Buffer;
  imagePath: string;
  /**
   * Optional context hint (mission name, agency, type, destination,
   * status) injected into the prompt so the model can apply status-
   * aware scoring rules (e.g. PLANNED missions accept renders;
   * FLOWN/ACTIVE missions reject them).
   */
  contextHint?: string;
  /**
   * Recent deny-list entries (from image-curation.json) injected as
   * in-context "avoid this kind of result" examples (PRD-018 M16 +
   * RFC-022 §4). Trimmed to ~5 most recent before being passed here.
   */
  denyListExamples: string[];
}

export interface VisionProvider {
  readonly name: 'anthropic' | 'openai' | 'google';
  readonly model: string;
  score(input: VisionScoreInput): Promise<VisionScoreResult>;
}
