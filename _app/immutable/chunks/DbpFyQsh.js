import{b as K}from"./CPwLOqZt.js";import{M as U,a4 as G,f as F,a5 as z,F as g,U as R,u as d,x as w,E as C,N as X,a6 as j,w as _,V as M,A as Y,d as q,j as k,i as A,X as H,a0 as O,G as J}from"./DUZ6bAsh.js";import{A as L}from"./DmDmg5ql.js";const Z=.05;function $(){return typeof window>"u"||typeof window.matchMedia!="function"?!1:window.matchMedia("(prefers-reduced-motion: reduce)").matches}function fe(o){const e=o.maxDtSec??Z,t=o.reducedMotion??$,i=o.ignoreVisibilityPause??!1;let r=null,s=!1,a=!1,n=null,l=0;const h=()=>{a||(document.hidden?v():s&&(n=null,u()))},u=()=>{r===null&&(r=requestAnimationFrame(c))},c=f=>{if(r=null,a||!s||!i&&K&&document.hidden)return;const m=f/1e3;if(n===null){n=m,u();return}const P=m-n;n=m;const D=t()?0:Math.min(P,e);l+=D,o.onFrame({dt:D,elapsed:l}),s&&u()},p=()=>{s||a||(s=!0,n=null,u())},v=()=>{s=!1,r!==null&&(cancelAnimationFrame(r),r=null)},B=()=>{a||(a=!0,v(),i||document.removeEventListener("visibilitychange",h))};return i||document.addEventListener("visibilitychange",h),{start:p,stop:v,cleanup:B,get running(){return s}}}function ce(){const o=[];let e=!1;return{on(t,i,r,s){t.addEventListener(i,r,s);const a=typeof s=="object"?{capture:s.capture}:s;o.push(()=>t.removeEventListener(i,r,a))},add(t){o.push(t)},cleanup(){if(!e){e=!0;for(let t=o.length-1;t>=0;t--)try{o[t]()}catch(i){console.error("[route-lifecycle] teardown failed",i)}o.length=0}},get disposed(){return e}}}const S={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class b{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const ee=new G(-1,1,1,-1,0,1);class te extends F{constructor(){super(),this.setAttribute("position",new z([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new z([0,2,0,0,2,0],2))}}const se=new te;class I{constructor(e){this._mesh=new U(se,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,ee)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class ie extends b{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof g?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=R.clone(e.uniforms),this.material=new g({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new I(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class V extends b{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let a,n;this.inverse?(a=0,n=1):(a=1,n=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),s.buffers.stencil.setClear(n),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}}class re extends b{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class de{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new d);this._width=i.width,this._height=i.height,t=new w(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:C}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ie(S),this.copyPass.material.blending=X,this.timer=new j}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let r=0,s=this.passes.length;r<s;r++){const a=this.passes[r];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),a.needsSwap){if(i){const n=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}V!==void 0&&(a instanceof V?i=!0:a instanceof re&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new d);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class me extends b{constructor(e,t,i=null,r=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new _}render(e,t,i){const r=e.autoClear;e.autoClear=!1;let s,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}}const ae={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new _(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class x extends b{constructor(e,t=1,i,r){super(),this.strength=t,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new d(e.x,e.y):new d(256,256),this.clearColor=new _(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new w(s,a,{type:C}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){const c=new w(s,a,{type:C});c.texture.name="UnrealBloomPass.h"+u,c.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(c);const p=new w(s,a,{type:C});p.texture.name="UnrealBloomPass.v"+u,p.texture.generateMipmaps=!1,this.renderTargetsVertical.push(p),s=Math.round(s/2),a=Math.round(a/2)}const n=ae;this.highPassUniforms=R.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new g({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const l=[6,10,14,18,22];s=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new d(1/s,1/a),s=Math.round(s/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const h=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=h,this.bloomTintColors=[new M(1,1,1),new M(1,1,1),new M(1,1,1),new M(1,1,1),new M(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=R.clone(S.uniforms),this.blendMaterial=new g({uniforms:this.copyUniforms,vertexShader:S.vertexShader,fragmentShader:S.fragmentShader,premultipliedAlpha:!0,blending:Y,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new _,this._oldClearAlpha=1,this._basic=new q,this._fsQuad=new I(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new d(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(e,t,i,r,s){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let n=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[l].uniforms.direction.value=x.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=x.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),n=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(i),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=a}_getSeparableBlurMaterial(e){const t=[],i=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(i*i))/i);return new g({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new d(.5,.5)},direction:{value:new d(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {

					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;

					for ( int i = 1; i < KERNEL_RADIUS; i ++ ) {

						float x = float( i );
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * w;

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new g({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}}x.BlurDirectionX=new d(1,0);x.BlurDirectionY=new d(0,1);const T={windowMs:5e3,frameBudgetMs:33.3,sustainedFor:4e3,cooldownMs:3e4};function pe(o){const e=o.windowMs??T.windowMs,t=o.frameBudgetMs??T.frameBudgetMs,i=o.sustainedFor??T.sustainedFor,r=o.cooldownMs??T.cooldownMs,s=o.getNow??(()=>performance.now()),a=[];let n=-1,l=-1,h=-1/0,u=!1;function c(){if(u)return;const f=s();if(n<0){n=f;return}const m=f-n;if(n=f,m>500){l=-1;return}a.push({t:f,dt:m});const P=f-e;for(;a.length>0&&a[0].t<P;)a.shift();if(a.length<5)return;const E=a.reduce((N,W)=>N+W.dt,0)/a.length;E>t?(l<0&&(l=f),f-l>=i&&f-h>=r&&(h=f,l=-1,o.onStruggle(E))):l=-1}function p(){u=!0}function v(){if(a.length<5)return 0;let f=0;for(const m of a)f+=m.dt;return f/a.length}function B(){return h}return{tick:c,stop:p,getAvgFrameMs:v,getLastStruggleAt:B}}function ge(o){const e=L.indexOf(o);return e<=0?null:L[e-1]}function ve(o){o.traverse(e=>{var t;(e instanceof U||e instanceof k||e instanceof A)&&((t=e.geometry)==null||t.dispose(),Array.isArray(e.material)?e.material.forEach(i=>{y(i),i.dispose()}):e.material&&(y(e.material),e.material.dispose()))})}const oe=["map","emissiveMap","normalMap","bumpMap","displacementMap","roughnessMap","metalnessMap","specularMap","envMap","alphaMap","aoMap","lightMap","matcap","gradientMap","clearcoatMap","clearcoatNormalMap","clearcoatRoughnessMap"];function y(o){var t;const e=o;for(const i of oe)(t=e[i])==null||t.dispose()}function Me(o){o.traverse(e=>{var t;(e instanceof U||e instanceof k||e instanceof A)&&((t=e.geometry)==null||t.dispose(),Array.isArray(e.material)?e.material.forEach(i=>{y(i),i.dispose()}):e.material&&(y(e.material),e.material.dispose()))})}function Q({count:o=1500,radius:e=200,jitter:t=80,color:i=14542079,size:r=1,opacity:s=.55}={}){const a=new Float32Array(o*3);for(let l=0;l<o;l++){const h=e+Math.random()*t,u=Math.random()*Math.PI*2,c=Math.acos(2*Math.random()-1);a[l*3]=h*Math.sin(c)*Math.cos(u),a[l*3+1]=h*Math.sin(c)*Math.sin(u),a[l*3+2]=h*Math.cos(c)}const n=new F;return n.setAttribute("position",new H(a,3)),new A(n,new O({color:i,size:r,sizeAttenuation:!1,transparent:!0,opacity:s}))}function xe({counts:o,shellRadius:e=1500}){const t=new J;return t.add(Q({count:o.dim,radius:e,jitter:e*(500/1500),size:.9,opacity:.55})),t.add(Q({count:o.bright,radius:e*(1400/1500),jitter:e*(600/1500),size:1.6,opacity:.95})),t.add(le(o.milkyWay,e)),t}function le(o,e){const t=e*.9666666666666667,i=e*(350/1500),r=new Float32Array(o*3);for(let a=0;a<o;a++){const n=t+Math.random()*i,l=Math.random()*Math.PI*2,h=Math.acos(2*Math.random()-1);r[a*3]=n*Math.sin(h)*Math.cos(l),r[a*3+1]=n*Math.sin(h)*Math.sin(l)*.18,r[a*3+2]=n*Math.cos(h)}const s=new F;return s.setAttribute("position",new H(r,3)),new A(s,new O({color:15788248,size:1.2,sizeAttenuation:!1,transparent:!0,opacity:.45}))}export{S as C,de as E,I as F,b as P,me as R,ie as S,x as U,pe as a,fe as b,xe as c,Me as d,ce as e,ve as f,Q as g,ge as n};
