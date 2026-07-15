/**
 * Gravitational-lensing black-hole scene for /explore v2 (Slice 6).
 *
 * A full-screen geodesic ray-tracer: every fragment traces a light ray backward
 * through the Schwarzschild metric (a = −1.5·h²·r̂/r⁵), so the accretion disk's
 * far side bends up over the shadow and under the bottom — the wrap is emergent
 * physics, not painted. Matches the approved Slice-0 mock. Per-hole spin sets the
 * disk's inner edge; inclination sets the camera tilt; framing scales the hole
 * down + shifts it up on narrow screens. Step count is tier-scaled; the caller
 * shows a static fallback on the lowest tiers.
 *
 * WebGL builder — coverage-excluded (see vite.config.ts). The pure GR / framing
 * math lives in black-hole-visual.ts (unit-tested).
 */
import * as THREE from 'three';
import type { BlackHole } from '$lib/data';
import { framingFor } from './black-hole-visual';

export interface BlackHoleScene {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  /** Advance the disk rotation (seconds). */
  update(dtSeconds: number): void;
  /** Toggle the curvature lens (lensed spacetime grid), 0..1. */
  setCurvature(v: number): void;
  /** Resize + re-frame. w/h are CSS pixels; pixelRatio is the shared renderer's
   *  device-pixel ratio (gl_FragCoord runs over the physical drawing buffer). */
  setSize(w: number, h: number, pixelRatio: number): void;
  dispose(): void;
}

/** Ray-march steps per quality tier — the heaviest knob. */
export function stepsForTier(tier: string): number {
  // The camera sits ~30 units out; a ray must march far enough (steps × dt) to
  // reach the hole, so the floor can't drop below ~150 or rays never arrive.
  switch (tier) {
    case 'cinematic':
      return 260;
    case 'high':
      return 220;
    case 'medium':
      return 185;
    default:
      return 155; // low — still reaches the hole; 'minimal' uses the static fallback
  }
}

const VERT = /* glsl */ `
  out vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  in vec2 vUv; out vec4 O;
  uniform vec2 uRes; uniform float uScale; uniform float uYOff;
  uniform float uTime; uniform float uCamY; uniform float uDiskIn;
  uniform float uCurvature; // 0..1 — the spacetime-grid (curvature) lens
  const float HORIZON = 1.0;
  const float DISK_OUT = 14.0;
  const float PI = 3.14159265;

  // Equatorial spacetime grid — radial rings + angular spokes drawn where a ray
  // crosses the y=0 plane. Because the crossing point is post-lensing, the grid
  // bends around the hole exactly as the geodesics do — the curvature made
  // visible (honest, not a rubber-sheet cartoon). Rings bunch up toward the hole.
  float gridLine(float rc, float az){
    float ring = abs(fract(rc * 0.5) - 0.5);          // radial rings every 2 units
    float spoke = abs(fract(az / PI * 6.0) - 0.5);     // 12 spokes
    float lw = 0.02 + 0.02 * rc;                        // thicker lines far out
    float g = smoothstep(lw, 0.0, ring) + smoothstep(0.06, 0.0, spoke) * 0.7;
    return clamp(g, 0.0, 1.0) * smoothstep(0.6, 4.0, rc); // fade in from the core
  }

  float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  vec3 starBG(vec3 d){
    float lon=atan(d.z,d.x), lat=asin(clamp(d.y,-1.0,1.0));
    vec2 uv=vec2(lon*0.5,lat); vec3 col=vec3(0.0);
    for(float L=0.0;L<2.0;L++){
      float sc=30.0+L*52.0; vec2 g=uv*sc; vec2 id=floor(g); vec2 f=fract(g)-0.5;
      float r=h21(id+L*17.3);
      if(r>0.94){ float b=(r-0.94)/0.06; float dd=length(f); float s=smoothstep(0.5,0.0,dd)*b;
        col+=mix(vec3(.7,.8,1.0),vec3(1.0,.9,.78),h21(id+3.0))*s*0.9; }
    }
    return col;
  }
  vec3 diskColor(float r, vec3 pos, vec3 vel){
    float t=clamp((r-uDiskIn)/(DISK_OUT-uDiskIn),0.0,1.0);
    vec3 hot=vec3(1.0,.99,.96), mid=vec3(1.0,.9,.72), cool=vec3(1.0,.72,.44);
    vec3 c = t<0.4 ? mix(hot,mid,t*2.5) : mix(mid,cool,(t-0.4)*1.67);
    float fall=(1.6/(0.35+r*0.16))*(0.35+0.65*pow(1.0-t,1.3));
    float az=atan(pos.z,pos.x) + uTime*0.35;              // slow disk rotation
    float wisp=0.9+0.1*sin(az*4.0-r*1.1);
    vec3 orb=normalize(vec3(-pos.z,0.0,pos.x));
    float dopp=0.5+0.5*dot(orb,normalize(-vel));
    float beam=mix(0.7,1.5,dopp);
    return c*fall*wisp*beam;
  }
  vec3 trace(vec2 uv){
    vec3 cam=vec3(0.0,uCamY,-30.0), tgt=vec3(0.0);
    vec3 fwd=normalize(tgt-cam), rt=normalize(cross(fwd,vec3(0,1,0))), up=cross(rt,fwd);
    float fov=0.3;
    vec3 pos=cam, vel=normalize(fwd+uv.x*fov*rt+uv.y*fov*up);
    vec3 hvec=cross(pos,vel); float h2=dot(hvec,hvec);
    vec3 acc=vec3(0.0); float trans=1.0; float dt=0.18; bool hor=false;
    for(int i=0;i<STEP_COUNT;i++){
      float r=length(pos);
      if(r<HORIZON){ hor=true; break; }
      if(r>70.0) break;
      vec3 a=-1.5*h2*pos/pow(r,5.0);
      vec3 npos=pos+vel*dt+0.5*a*dt*dt, nvel=vel+a*dt;
      if(pos.y*npos.y<0.0){
        float f=pos.y/(pos.y-npos.y); vec3 cp=mix(pos,npos,f);
        float rc=length(vec2(cp.x,cp.z));
        if(rc>uDiskIn && rc<DISK_OUT){
          float edge=smoothstep(uDiskIn,uDiskIn+0.5,rc)*smoothstep(DISK_OUT,DISK_OUT-2.5,rc);
          vec3 dcol=diskColor(rc,cp,nvel)*edge; float op=0.6;
          acc+=trans*dcol*op; trans*=(1.0-op);
        }
        // Curvature lens — the lensed equatorial grid (teal), extends past the disk.
        if(uCurvature>0.001 && rc>uDiskIn && rc<DISK_OUT+6.0){
          float gl=gridLine(rc, atan(cp.z,cp.x));
          acc+=trans*vec3(0.3,0.85,0.82)*gl*uCurvature*0.9;
        }
      }
      pos=npos; vel=nvel; if(trans<0.02) break;
    }
    if(!hor) acc+=trans*starBG(normalize(vel));
    return acc;
  }
  void main(){
    // Use the quad's 0..1 varying (resolution-independent) rather than
    // gl_FragCoord, so framing matches regardless of the shared renderer's
    // pixel ratio. Aspect from uRes (w/h in any consistent unit).
    vec2 uv=vUv-0.5; uv.x*=uRes.x/uRes.y;
    vec3 col=trace(uv*uScale + vec2(0.0,uYOff))*1.25;
    col=col/(col+1.0); col=pow(col,vec3(0.9));
    O=vec4(col,1.0);
  }
`;

/**
 * Build the black-hole scene (fullscreen geodesic-lensing quad + ortho camera).
 * Rendered by /explore's shared renderer via `renderer.render(scene, camera)` —
 * the same path the Milky Way + BodyScene use. `setSize` re-frames for the
 * viewport (scales the hole down + shifts it up on mobile). uTime drives the
 * slow disk rotation via `update`.
 */
export function createBlackHoleScene(hole: BlackHole, tier = 'high'): BlackHoleScene {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Spin sets the disk inner edge (higher spin → smaller ISCO → disk hugs closer).
  const diskIn = 2.6 - 0.8 * Math.min(1, Math.max(0, hole.spin));
  // Camera stays near edge-on (the iconic Interstellar/Gargantua framing that was
  // approved); the object's inclination adds a small, capped tilt for variety.
  const camY = 1.0 + Math.min(4, hole.inclination_deg * 0.12);

  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uScale: { value: 1.0 },
    uYOff: { value: 0.0 },
    uTime: { value: 0.0 },
    uCamY: { value: camY },
    uDiskIn: { value: diskIn },
    uCurvature: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG.replace('STEP_COUNT', String(stepsForTier(tier))),
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  return {
    scene,
    camera,
    update(dt) {
      uniforms.uTime.value += dt;
    },
    setCurvature(v) {
      uniforms.uCurvature.value = Math.min(1, Math.max(0, v));
    },
    setSize(w, h, pixelRatio) {
      const W = Math.max(1, w);
      // uRes is device pixels (gl_FragCoord space over the physical drawing buffer).
      uniforms.uRes.value.set(W * pixelRatio, Math.max(1, h) * pixelRatio);
      const f = framingFor(W);
      uniforms.uScale.value = f.scale;
      uniforms.uYOff.value = f.yOffset;
    },
    dispose() {
      quad.geometry.dispose();
      material.dispose();
    },
  };
}
