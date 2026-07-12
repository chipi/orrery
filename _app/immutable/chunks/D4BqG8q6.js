import{b as Z}from"./CPwLOqZt.js";import{M as L,_ as J,g as z,$ as V,X as v,U,m as d,I as y,Q as C,N as ee,a0 as te,v as E,V as M,Z as se,e as ie,h as G,z as P,u as W,E as N,G as re}from"./DsmkTYyx.js";import{_ as ae}from"./Bv6SoQKO.js";import{r as K}from"./7XfKmyKz.js";import{b as q}from"./Ds101zI5.js";import"./B0XwC4Ot.js";const oe=.05;function le(){return typeof window>"u"||typeof window.matchMedia!="function"?!1:window.matchMedia("(prefers-reduced-motion: reduce)").matches}function ye(i){const e=i.maxDtSec??oe,t=i.reducedMotion??le,s=i.ignoreVisibilityPause??!1;let a=null,r=!1,o=!1,n=null,l=0;const h=()=>{o||(document.hidden?b():r&&(n=null,u()))},u=()=>{a===null&&(a=requestAnimationFrame(c))},c=f=>{if(a=null,o||!r||!s&&Z&&document.hidden)return;const p=f/1e3;if(n===null){n=p,u();return}const D=p-n;n=p;const R=t()?0:Math.min(D,e);l+=R,i.onFrame({dt:R,elapsed:l}),r&&u()},g=()=>{r||o||(r=!0,n=null,u())},b=()=>{r=!1,a!==null&&(cancelAnimationFrame(a),a=null)},A=()=>{o||(o=!0,b(),s||document.removeEventListener("visibilitychange",h))};return s||document.addEventListener("visibilitychange",h),{start:g,stop:b,cleanup:A,get running(){return r}}}function Ce(){const i=[];let e=!1;return{on(t,s,a,r){t.addEventListener(s,a,r);const o=typeof r=="object"?{capture:r.capture}:r;i.push(()=>t.removeEventListener(s,a,o))},add(t){i.push(t)},cleanup(){if(!e){e=!0;for(let t=i.length-1;t>=0;t--)try{i[t]()}catch(s){console.error("[route-lifecycle] teardown failed",s)}i.length=0}},get disposed(){return e}}}const _={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class w{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const ne=new J(-1,1,1,-1,0,1);class ue extends z{constructor(){super(),this.setAttribute("position",new V([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new V([0,2,0,0,2,0],2))}}const he=new ue;class X{constructor(e){this._mesh=new L(he,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,ne)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class fe extends w{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof v?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=U.clone(e.uniforms),this.material=new v({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new X(this.material)}render(e,t,s){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=s.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class O extends w{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,s){const a=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,n;this.inverse?(o=0,n=1):(o=1,n=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(a.REPLACE,a.REPLACE,a.REPLACE),r.buffers.stencil.setFunc(a.ALWAYS,o,4294967295),r.buffers.stencil.setClear(n),r.buffers.stencil.setLocked(!0),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(a.EQUAL,1,4294967295),r.buffers.stencil.setOp(a.KEEP,a.KEEP,a.KEEP),r.buffers.stencil.setLocked(!0)}}class ce extends w{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class _e{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const s=e.getSize(new d);this._width=s.width,this._height=s.height,t=new y(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:C}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new fe(_),this.copyPass.material.blending=ee,this.timer=new te}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());const t=this.renderer.getRenderTarget();let s=!1;for(let a=0,r=this.passes.length;a<r;a++){const o=this.passes[a];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(a),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,s),o.needsSwap){if(s){const n=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}O!==void 0&&(o instanceof O?s=!0:o instanceof ce&&(s=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new d);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const s=this._width*this._pixelRatio,a=this._height*this._pixelRatio;this.renderTarget1.setSize(s,a),this.renderTarget2.setSize(s,a);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(s,a)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Ee extends w{constructor(e,t,s=null,a=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=s,this.clearColor=a,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new E}render(e,t,s){const a=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:s),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=a}}const de={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new E(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class x extends w{constructor(e,t=1,s,a){super(),this.strength=t,this.radius=s,this.threshold=a,this.resolution=e!==void 0?new d(e.x,e.y):new d(256,256),this.clearColor=new E(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new y(r,o,{type:C}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){const c=new y(r,o,{type:C});c.texture.name="UnrealBloomPass.h"+u,c.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(c);const g=new y(r,o,{type:C});g.texture.name="UnrealBloomPass.v"+u,g.texture.generateMipmaps=!1,this.renderTargetsVertical.push(g),r=Math.round(r/2),o=Math.round(o/2)}const n=de;this.highPassUniforms=U.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=a,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new v({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new d(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const h=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=h,this.bloomTintColors=[new M(1,1,1),new M(1,1,1),new M(1,1,1),new M(1,1,1),new M(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=U.clone(_.uniforms),this.blendMaterial=new v({uniforms:this.copyUniforms,vertexShader:_.vertexShader,fragmentShader:_.fragmentShader,premultipliedAlpha:!0,blending:se,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new E,this._oldClearAlpha=1,this._basic=new ie,this._fsQuad=new X(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let s=Math.round(e/2),a=Math.round(t/2);this.renderTargetBright.setSize(s,a);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(s,a),this.renderTargetsVertical[r].setSize(s,a),this.separableBlurMaterials[r].uniforms.invSize.value=new d(1/s,1/a),s=Math.round(s/2),a=Math.round(a/2)}render(e,t,s,a,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=s.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=s.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let n=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[l].uniforms.direction.value=x.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=x.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),n=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(s),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){const t=[],s=e/3;for(let a=0;a<e;a++)t.push(.39894*Math.exp(-.5*a*a/(s*s))/s);return new v({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new d(.5,.5)},direction:{value:new d(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

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

				}`})}_getCompositeMaterial(e){return new v({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

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

				}`})}}x.BlurDirectionX=new d(1,0);x.BlurDirectionY=new d(0,1);const m={minimal:{tier:"minimal",pixelRatioCap:.75,postEnabled:!1,bloomEnabled:!1,bloomStrength:0,bloomRadius:0,bloomThreshold:1,sphereSegments:12,asteroidBeltParticles:400,kuiperBeltParticles:500,starsDim:600,starsBright:100,starsMilkyWay:400,rimLightEnabled:!1,dofEnabled:!1,filmGrainEnabled:!1,vignetteEnabled:!1,skydomeEnabled:!1,lensFlareEnabled:!1},low:{tier:"low",pixelRatioCap:1,postEnabled:!1,bloomEnabled:!1,bloomStrength:0,bloomRadius:0,bloomThreshold:1,sphereSegments:18,asteroidBeltParticles:800,kuiperBeltParticles:1e3,starsDim:900,starsBright:180,starsMilkyWay:700,rimLightEnabled:!0,dofEnabled:!1,filmGrainEnabled:!1,vignetteEnabled:!1,skydomeEnabled:!1,lensFlareEnabled:!1},medium:{tier:"medium",pixelRatioCap:1.25,postEnabled:!0,bloomEnabled:!0,bloomStrength:.3,bloomRadius:.55,bloomThreshold:.94,sphereSegments:24,asteroidBeltParticles:1200,kuiperBeltParticles:1500,starsDim:1200,starsBright:240,starsMilkyWay:950,rimLightEnabled:!0,dofEnabled:!1,filmGrainEnabled:!0,vignetteEnabled:!0,skydomeEnabled:!1,lensFlareEnabled:!1},high:{tier:"high",pixelRatioCap:2,postEnabled:!0,bloomEnabled:!0,bloomStrength:.35,bloomRadius:.55,bloomThreshold:.92,sphereSegments:32,asteroidBeltParticles:1800,kuiperBeltParticles:2200,starsDim:1500,starsBright:300,starsMilkyWay:1200,rimLightEnabled:!0,dofEnabled:!1,filmGrainEnabled:!0,vignetteEnabled:!0,skydomeEnabled:!0,lensFlareEnabled:!1},cinematic:{tier:"cinematic",pixelRatioCap:2,postEnabled:!0,bloomEnabled:!0,bloomStrength:.42,bloomRadius:.6,bloomThreshold:.9,sphereSegments:48,asteroidBeltParticles:2400,kuiperBeltParticles:2800,starsDim:1800,starsBright:380,starsMilkyWay:1500,rimLightEnabled:!0,dofEnabled:!0,filmGrainEnabled:!0,vignetteEnabled:!0,skydomeEnabled:!0,lensFlareEnabled:!0}},F="orrery.qualityTier";function Y(){if(typeof localStorage>"u")return"auto";const i=localStorage.getItem(F);return i==="auto"||i==null?"auto":i in m?i:"auto"}function Be(i){typeof localStorage>"u"||(i==="auto"?localStorage.removeItem(F):localStorage.setItem(F,i))}function me(i,e){return e&&i<=1?"minimal":e&&i===2?"low":i===0?"minimal":i===1?"low":i===2?"medium":"high"}let T=null;async function pe(){var i;if(T)return T;try{const t=await ae(()=>import("./demhRTyb.js"),[]),s=t.getGPUTier??((i=t.default)==null?void 0:i.getGPUTier);if(!s)throw new Error("detect-gpu missing getGPUTier");const a=await s();T=me(a.tier,a.isMobile??!1)}catch{T="medium"}return T}const k="orrery.qualityDetected";function Pe(i){const e=i==null?void 0:i.searchParams.get("quality");if(e&&e in m)return m[e];const t=Y();if(t!=="auto")return m[t];if(typeof localStorage<"u"){const s=localStorage.getItem(k);if(s&&s in m)return m[s]}return m.medium}function Ae(i){const e=i==null?void 0:i.searchParams.get("quality");if(e&&e in m)return"url";if(Y()!=="auto")return"user-choice";if(typeof localStorage<"u"){const s=localStorage.getItem(k);if(s&&s in m)return"detect-gpu"}return"fallback"}async function De(){const i=await pe();typeof localStorage<"u"&&localStorage.setItem(k,i)}const I=["minimal","low","medium","high","cinematic"],S={windowMs:5e3,frameBudgetMs:33.3,sustainedFor:4e3,cooldownMs:3e4};function Re(i){const e=i.windowMs??S.windowMs,t=i.frameBudgetMs??S.frameBudgetMs,s=i.sustainedFor??S.sustainedFor,a=i.cooldownMs??S.cooldownMs,r=i.getNow??(()=>performance.now()),o=[];let n=-1,l=-1,h=-1/0,u=!1;function c(){if(u)return;const f=r();if(n<0){n=f;return}const p=f-n;if(n=f,p>500){l=-1;return}o.push({t:f,dt:p});const D=f-e;for(;o.length>0&&o[0].t<D;)o.shift();if(o.length<5)return;const Q=o.reduce(($,j)=>$+j.dt,0)/o.length;Q>t?(l<0&&(l=f),f-l>=s&&f-h>=a&&(h=f,l=-1,i.onStruggle(Q))):l=-1}function g(){u=!0}function b(){if(o.length<5)return 0;let f=0;for(const p of o)f+=p.dt;return f/o.length}function A(){return h}return{tick:c,stop:g,getAvgFrameMs:b,getLastStruggleAt:A}}function Ue(i){const e=I.indexOf(i);return e<=0?null:I[e-1]}function Fe(i){i.traverse(e=>{var t;(e instanceof L||e instanceof G||e instanceof P)&&((t=e.geometry)==null||t.dispose(),Array.isArray(e.material)?e.material.forEach(s=>{B(s),s.dispose()}):e.material&&(B(e.material),e.material.dispose()))})}const ge=["map","emissiveMap","normalMap","bumpMap","displacementMap","roughnessMap","metalnessMap","specularMap","envMap","alphaMap","aoMap","lightMap","matcap","gradientMap","clearcoatMap","clearcoatNormalMap","clearcoatRoughnessMap"];function B(i){var t;const e=i;for(const s of ge)(t=e[s])==null||t.dispose()}function Le(i){i.traverse(e=>{var t;(e instanceof L||e instanceof G||e instanceof P)&&((t=e.geometry)==null||t.dispose(),Array.isArray(e.material)?e.material.forEach(s=>{B(s),s.dispose()}):e.material&&(B(e.material),e.material.dispose()))})}function H({count:i=1500,radius:e=200,jitter:t=80,color:s=14542079,size:a=1,opacity:r=.55}={}){const o=new Float32Array(i*3);for(let l=0;l<i;l++){const h=e+Math.random()*t,u=Math.random()*Math.PI*2,c=Math.acos(2*Math.random()-1);o[l*3]=h*Math.sin(c)*Math.cos(u),o[l*3+1]=h*Math.sin(c)*Math.sin(u),o[l*3+2]=h*Math.cos(c)}const n=new z;return n.setAttribute("position",new W(o,3)),new P(n,new N({color:s,size:a,sizeAttenuation:!1,transparent:!0,opacity:r}))}function ze({counts:i,shellRadius:e=1500}){const t=new re;return t.add(H({count:i.dim,radius:e,jitter:e*(500/1500),size:.9,opacity:.55})),t.add(H({count:i.bright,radius:e*(1400/1500),jitter:e*(600/1500),size:1.6,opacity:.95})),t.add(ve(i.milkyWay,e)),t}function ve(i,e){const t=e*.9666666666666667,s=e*(350/1500),a=new Float32Array(i*3);for(let o=0;o<i;o++){const n=t+Math.random()*s,l=Math.random()*Math.PI*2,h=Math.acos(2*Math.random()-1);a[o*3]=n*Math.sin(h)*Math.cos(l),a[o*3+1]=n*Math.sin(h)*Math.sin(l)*.18,a[o*3+2]=n*Math.cos(h)}const r=new z;return r.setAttribute("position",new W(a,3)),new P(r,new N({color:15788248,size:1.2,sizeAttenuation:!1,transparent:!0,opacity:.45}))}function ke(i){const e=[];for(const t of K(i)){if(!t.logo)continue;const s=`${q}/logos/${t.logo}`;e.includes(s)||e.push(s)}return e}function Qe(i){const e=[],t=new Set;for(const s of K(i)){if(!s.logo)continue;const a=`${q}/logos/${s.logo}`;t.has(a)||(t.add(a),e.push({path:a,short:s.short,full:s.full}))}return e}export{I as A,_ as C,_e as E,X as F,w as P,Ee as R,fe as S,x as U,Ae as a,Re as b,ze as c,ye as d,Le as e,Ce as f,Y as g,Qe as h,ke as i,Fe as j,De as k,H as l,Ue as n,Pe as r,Be as w};
