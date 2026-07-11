<!-- Sensory-layer glyph (PRD-017 §7.1 — "combined waveform-and-compass glyph").
     A compass needle (gyro / tilt) crossed by a waveform (sound), sharing the
     AudioWaveIcon's wave language so the two nav controls read as a family.
     Inline SVG, currentColor, so it renders consistently across font stacks. -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
  }
  let { size = 16, class: cls = '' }: Props = $props();
</script>

<svg viewBox="0 0 16 16" width={size} height={size} class={cls} aria-hidden="true">
  <!-- Compass needle — vertical diamond, the "tilt/orient" half. -->
  <path d="M8 1.5 L9.7 8 L8 14.5 L6.3 8 Z" fill="currentColor" opacity="0.55" />
  <!-- Waveform — the "sound" half, drawn over the needle's waist. -->
  <path
    d="M1 8 Q 3 5, 5 8 T 9 8 T 13 8 T 15 8"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
  />
</svg>
