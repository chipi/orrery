/**
 * BoldArrow — a cinematic force/vector arrow.
 *
 * `THREE.ArrowHelper` draws its shaft as a 1-px `LINE` primitive, which WebGL
 * caps at one device pixel: fine when the subject fills the frame, but thin and
 * washed-out against a bright sky or a wide orbital view. BoldArrow draws a real
 * thick cylinder shaft + cone head (unlit `MeshBasicMaterial`, so the colour
 * stays pure regardless of scene lighting) as an always-on-top overlay, so
 * every force vector across /fly reads boldly.
 *
 * Drop-in for ArrowHelper: same constructor signature plus `setDirection` /
 * `setLength` / `setColor`, and it's a `THREE.Object3D` so `.position` /
 * `.visible` / `scene.add(...)` all work unchanged.
 */
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export class BoldArrow extends THREE.Object3D {
  private readonly shaft: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly shaftMat: THREE.MeshBasicMaterial;
  private readonly headMat: THREE.MeshBasicMaterial;
  private label: THREE.Sprite | null = null;
  private tipY = 1;

  constructor(
    dir: THREE.Vector3 = UP,
    origin: THREE.Vector3 = new THREE.Vector3(),
    length = 1,
    color: THREE.ColorRepresentation = 0xffffff,
    headLength = length * 0.3,
    headWidth = length * 0.11,
    overlay = true,
  ) {
    super();
    const matOpts: THREE.MeshBasicMaterialParameters = {
      color,
      transparent: true,
      depthTest: !overlay,
      depthWrite: !overlay,
    };
    this.shaftMat = new THREE.MeshBasicMaterial(matOpts);
    this.headMat = new THREE.MeshBasicMaterial({ ...matOpts });
    // Unit geometries along +Y; scale + offset applied in setLength().
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16), this.shaftMat);
    this.head = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 22), this.headMat);
    if (overlay) {
      this.renderOrder = 999;
      this.shaft.renderOrder = 999;
      this.head.renderOrder = 999;
    }
    this.add(this.shaft, this.head);
    this.position.copy(origin);
    this.setLength(length, headLength, headWidth);
    this.setDirection(dir);
  }

  /** Set the total length; head stays a fixed fraction so the arrow keeps its
   *  proportions as the vector magnitude changes frame-to-frame. */
  setLength(length: number, headLength = length * 0.28, headWidth = length * 0.16): void {
    const shaftLen = Math.max(1e-4, length - headLength);
    const shaftRadius = Math.max(1e-4, headWidth * 0.36); // chunky, slimmer than the head
    this.shaft.scale.set(shaftRadius, shaftLen, shaftRadius);
    this.shaft.position.y = shaftLen / 2;
    this.head.scale.set(headWidth, headLength, headWidth);
    this.head.position.y = shaftLen + headLength / 2;
    // Keep the tip label just past the head, sized relative to the arrow.
    this.tipY = shaftLen + headLength;
    if (this.label) {
      this.label.position.y = this.tipY + headWidth * 1.6;
      const s = headWidth * 4.6;
      this.label.scale.set(s * 4, s, 1);
    }
  }

  /** Attach a short always-facing text label at the arrow tip (e.g. "GRAVITY").
   *  The sprite is a child so it inherits position + orientation. */
  setLabel(text: string, color = '#eaf3ff'): void {
    if (this.label) {
      this.remove(this.label);
      (this.label.material as THREE.SpriteMaterial).map?.dispose();
      (this.label.material as THREE.SpriteMaterial).dispose();
    }
    const W = 256;
    const H = 64;
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '700 34px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(3,6,14,0.92)';
      ctx.strokeText(text, W / 2, H / 2);
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, H / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    sprite.renderOrder = 1000;
    this.label = sprite;
    this.add(sprite);
  }

  /** Orient the arrow (built along +Y) to point along `dir`. */
  setDirection(dir: THREE.Vector3): void {
    this.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
  }

  setColor(color: THREE.ColorRepresentation): void {
    this.shaftMat.color.set(color);
    this.headMat.color.set(color);
  }

  dispose(): void {
    this.shaft.geometry.dispose();
    this.head.geometry.dispose();
    this.shaftMat.dispose();
    this.headMat.dispose();
  }
}
