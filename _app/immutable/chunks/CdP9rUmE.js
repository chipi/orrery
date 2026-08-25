import{Dt as e,Q as t,W as n,ft as r,pt as i,tt as a,w as o}from"./Q63TN4Lo.js";function s(e){return e<700?{scale:2.15,yOffset:-.55}:{scale:1,yOffset:0}}function c(e){switch(e){case`cinematic`:return 260;case`high`:return 220;case`medium`:return 185;default:return 155}}var l=`
  out vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,u=`
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
`;function d(d,f=`high`){let p=new r,m=new t(-1,1,1,-1,0,1),h=2.6-.8*Math.min(1,Math.max(0,d.spin)),g=1+Math.min(4,d.inclination_deg*.12),_={uRes:{value:new e(1,1)},uScale:{value:1},uYOff:{value:0},uTime:{value:0},uCamY:{value:g},uDiskIn:{value:h},uCurvature:{value:0}},v=new i({glslVersion:o,uniforms:_,vertexShader:l,fragmentShader:u.replace(`STEP_COUNT`,String(c(f))),depthTest:!1,depthWrite:!1}),y=new n(new a(2,2),v);return y.frustumCulled=!1,p.add(y),{scene:p,camera:m,update(e){_.uTime.value+=e},setCurvature(e){_.uCurvature.value=Math.min(1,Math.max(0,e))},setSize(e,t,n){let r=Math.max(1,e);_.uRes.value.set(r*n,Math.max(1,t)*n);let i=s(r);_.uScale.value=i.scale,_.uYOff.value=i.yOffset},dispose(){y.geometry.dispose(),v.dispose()}}}export{d as createBlackHoleScene,c as stepsForTier};