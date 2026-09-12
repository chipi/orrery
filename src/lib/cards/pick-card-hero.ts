/**
 * Card hero selection (#547) — the card's hero band is ~1.6:1 and crops with
 * object-fit: cover, so an extreme-aspect source (rover panoramas run 7:1)
 * shows only terrain: the hardware the card is ABOUT gets cropped out or was
 * never in frame (operator report 2026-09-11: "Perseverance card shows only
 * dune, no hardware"). Panel galleries lead with panoramas deliberately —
 * they're great in the wide panel header — so the card picks its own hero:
 * the first gallery image whose shape can actually survive the band crop.
 */

/** Aspect window a source must fall in to hero the card. Portraits and
 *  everything up to moderately-wide landscape crop fine into the band;
 *  beyond ~2.2:1 a cover-crop discards most of the frame. */
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 2.2;

/** How many gallery candidates to probe before giving up — bounds image
 *  loads (probed files are the gallery the panel fetches anyway, so these
 *  are warm-cache in practice). */
const MAX_PROBES = 4;

export type AspectProber = (url: string) => Promise<number | null>;

/** Browser prober: decode enough of the image to read its natural size. */
const probeAspect: AspectProber = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null);
    img.onerror = () => resolve(null);
    img.src = url;
  });

/**
 * First gallery image with a card-compatible aspect; falls back to the
 * gallery lead when nothing qualifies (all-panorama galleries keep their
 * pre-existing behaviour rather than losing the hero entirely).
 */
export async function pickCardHero(
  gallery: string[],
  probe: AspectProber = probeAspect,
): Promise<string | undefined> {
  for (const url of gallery.slice(0, MAX_PROBES)) {
    const aspect = await probe(url);
    if (aspect !== null && aspect >= MIN_ASPECT && aspect <= MAX_ASPECT) return url;
  }
  return gallery[0];
}
