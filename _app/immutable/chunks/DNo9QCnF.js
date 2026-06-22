import{M as D,e as O,a3 as U,d as E,a4 as I,K as _,t as g,U as B,j as f,o as S,p as G,q as w,a5 as $,l as C,V as b,v as J,n as Z,G as ee,E as W,a6 as K}from"./Bk4J8tXJ.js";import{b as te}from"./CPwLOqZt.js";import{_ as ie}from"./C1FmrZbK.js";function me(s){s.traverse(e=>{var t,i;(e instanceof D||e instanceof O)&&((t=e.geometry)==null||t.dispose(),Array.isArray(e.material)?e.material.forEach(a=>a.dispose()):(i=e.material)==null||i.dispose())})}const se=["map","emissiveMap","normalMap","bumpMap","displacementMap","roughnessMap","metalnessMap","specularMap","envMap","alphaMap","aoMap","lightMap","matcap","gradientMap","clearcoatMap","clearcoatNormalMap","clearcoatRoughnessMap"];function L(s){var t;const e=s;for(const i of se)(t=e[i])==null||t.dispose()}function pe(s){s.traverse(e=>{var t;(e instanceof D||e instanceof O||e instanceof U)&&((t=e.geometry)==null||t.dispose(),Array.isArray(e.material)?e.material.forEach(i=>{L(i),i.dispose()}):e.material&&(L(e.material),e.material.dispose()))})}const re=.05;function ae(){return typeof window>"u"||typeof window.matchMedia!="function"?!1:window.matchMedia("(prefers-reduced-motion: reduce)").matches}function ge(s){const e=s.maxDtSec??re,t=s.reducedMotion??ae,i=s.ignoreVisibilityPause??!1;let a=null,r=!1,o=!1,l=null,n=0;const u=()=>{o||(document.hidden?p():r&&(l=null,c()))},c=()=>{a===null&&(a=requestAnimationFrame(d))},d=X=>{if(a=null,o||!r||!i&&te&&document.hidden)return;const P=X/1e3;if(l===null){l=P,c();return}const j=P-l;l=P;const z=t()?0:Math.min(j,e);n+=z,s.onFrame({dt:z,elapsed:n}),r&&c()},h=()=>{r||o||(r=!0,l=null,c())},p=()=>{r=!1,a!==null&&(cancelAnimationFrame(a),a=null)},v=()=>{o||(o=!0,p(),i||document.removeEventListener("visibilitychange",u))};return i||document.addEventListener("visibilitychange",u),{start:h,stop:p,cleanup:v,get running(){return r}}}function ve(){const s=[];let e=!1;return{on(t,i,a,r){t.addEventListener(i,a,r);const o=typeof r=="object"?{capture:r.capture}:r;s.push(()=>t.removeEventListener(i,a,o))},add(t){s.push(t)},cleanup(){if(!e){e=!0;for(let t=s.length-1;t>=0;t--)try{s[t]()}catch(i){console.error("[route-lifecycle] teardown failed",i)}s.length=0}},get disposed(){return e}}}var y={uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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

		}`};class M{constructor(){this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}}const oe=new I(-1,1,1,-1,0,1),A=new E;A.setAttribute("position",new _([-1,3,0,-1,-1,0,3,-1,0],3));A.setAttribute("uv",new _([0,2,0,0,2,0],2));class N{constructor(e){this._mesh=new D(A,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,oe)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class k extends M{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof g?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=B.clone(e.uniforms),this.material=new g({defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new N(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}}class V extends M{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const a=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,l;this.inverse?(o=0,l=1):(o=1,l=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(a.REPLACE,a.REPLACE,a.REPLACE),r.buffers.stencil.setFunc(a.ALWAYS,o,4294967295),r.buffers.stencil.setClear(l),r.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(a.EQUAL,1,4294967295),r.buffers.stencil.setOp(a.KEEP,a.KEEP,a.KEEP),r.buffers.stencil.setLocked(!0)}}class le extends M{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class be{constructor(e,t){if(this.renderer=e,t===void 0){const i={minFilter:w,magFilter:w,format:G},a=e.getSize(new f);this._pixelRatio=e.getPixelRatio(),this._width=a.width,this._height=a.height,t=new S(this._width*this._pixelRatio,this._height*this._pixelRatio,i),t.texture.name="EffectComposer.rt1"}else this._pixelRatio=1,this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],y===void 0&&console.error("THREE.EffectComposer relies on CopyShader"),k===void 0&&console.error("THREE.EffectComposer relies on ShaderPass"),this.copyPass=new k(y),this.clock=new $}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let a=0,r=this.passes.length;a<r;a++){const o=this.passes[a];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(a),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){const l=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(l.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(l.EQUAL,1,4294967295)}this.swapBuffers()}V!==void 0&&(o instanceof V?i=!0:o instanceof le&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new f);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,a=this._height*this._pixelRatio;this.renderTarget1.setSize(i,a),this.renderTarget2.setSize(i,a);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,a)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}}new I(-1,1,1,-1,0,1);const q=new E;q.setAttribute("position",new _([-1,3,0,-1,-1,0,3,-1,0],3));q.setAttribute("uv",new _([0,2,0,0,2,0],2));class xe extends M{constructor(e,t,i,a,r){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=a,this.clearAlpha=r!==void 0?r:0,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new C}render(e,t,i){const a=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==void 0&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor&&(e.getClearColor(this._oldClearColor),r=e.getClearAlpha(),e.setClearColor(this.clearColor,this.clearAlpha)),this.clearDepth&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor&&e.setClearColor(this._oldClearColor,r),this.overrideMaterial!==void 0&&(this.scene.overrideMaterial=o),e.autoClear=a}}const Q={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new C(0)},defaultOpacity:{value:0}},vertexShader:`

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

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class T extends M{constructor(e,t,i,a){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=a,this.resolution=e!==void 0?new f(e.x,e.y):new f(256,256),this.clearColor=new C(0,0,0);const r={minFilter:w,magFilter:w,format:G};this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let o=Math.round(this.resolution.x/2),l=Math.round(this.resolution.y/2);this.renderTargetBright=new S(o,l,r),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const p=new S(o,l,r);p.texture.name="UnrealBloomPass.h"+h,p.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(p);const v=new S(o,l,r);v.texture.name="UnrealBloomPass.v"+h,v.texture.generateMipmaps=!1,this.renderTargetsVertical.push(v),o=Math.round(o/2),l=Math.round(l/2)}Q===void 0&&console.error("THREE.UnrealBloomPass relies on LuminosityHighPassShader");const n=Q;this.highPassUniforms=B.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=a,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new g({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,defines:{}}),this.separableBlurMaterials=[];const u=[3,5,7,9,11];o=Math.round(this.resolution.x/2),l=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(u[h])),this.separableBlurMaterials[h].uniforms.texSize.value=new f(o,l),o=Math.round(o/2),l=Math.round(l/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1,this.compositeMaterial.needsUpdate=!0;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new b(1,1,1),new b(1,1,1),new b(1,1,1),new b(1,1,1),new b(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,y===void 0&&console.error("THREE.UnrealBloomPass relies on CopyShader");const d=y;this.copyUniforms=B.clone(d.uniforms),this.copyUniforms.opacity.value=1,this.materialCopy=new g({uniforms:this.copyUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader,blending:J,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new C,this.oldClearAlpha=1,this.basic=new Z,this.fsQuad=new N(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose()}setSize(e,t){let i=Math.round(e/2),a=Math.round(t/2);this.renderTargetBright.setSize(i,a);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,a),this.renderTargetsVertical[r].setSize(i,a),this.separableBlurMaterials[r].uniforms.texSize.value=new f(i,a),i=Math.round(i/2),a=Math.round(a/2)}render(e,t,i,a,r){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let l=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this.fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=l.texture,this.separableBlurMaterials[n].uniforms.direction.value=T.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[n]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=T.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[n]),e.clear(),this.fsQuad.render(e),l=this.renderTargetsVertical[n];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){return new g({defines:{KERNEL_RADIUS:e,SIGMA:e},uniforms:{colorTexture:{value:null},texSize:{value:new f(.5,.5)},direction:{value:new f(.5,.5)}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}
				void main() {
					vec2 invSize = 1.0 / texSize;
					float fSigma = float(SIGMA);
					float weightSum = gaussianPdf(0.0, fSigma);
					vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianPdf(x, fSigma);
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new g({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},dirtTexture:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform sampler2D dirtTexture;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}T.BlurDirectionX=new f(1,0);T.BlurDirectionY=new f(0,1);function H({count:s=1500,radius:e=200,jitter:t=80,color:i=14542079,size:a=1,opacity:r=.55}={}){const o=new Float32Array(s*3);for(let n=0;n<s;n++){const u=e+Math.random()*t,c=Math.random()*Math.PI*2,d=Math.acos(2*Math.random()-1);o[n*3]=u*Math.sin(d)*Math.cos(c),o[n*3+1]=u*Math.sin(d)*Math.sin(c),o[n*3+2]=u*Math.cos(d)}const l=new E;return l.setAttribute("position",new W(o,3)),new U(l,new K({color:i,size:a,sizeAttenuation:!1,transparent:!0,opacity:r}))}function Te({counts:s,shellRadius:e=1500}){const t=new ee;return t.add(H({count:s.dim,radius:e,jitter:e*(500/1500),size:.9,opacity:.55})),t.add(H({count:s.bright,radius:e*(1400/1500),jitter:e*(600/1500),size:1.6,opacity:.95})),t.add(ne(s.milkyWay,e)),t}function ne(s,e){const t=e*.9666666666666667,i=e*(350/1500),a=new Float32Array(s*3);for(let o=0;o<s;o++){const l=t+Math.random()*i,n=Math.random()*Math.PI*2,u=Math.acos(2*Math.random()-1);a[o*3]=l*Math.sin(u)*Math.cos(n),a[o*3+1]=l*Math.sin(u)*Math.sin(n)*.18,a[o*3+2]=l*Math.cos(u)}const r=new E;return r.setAttribute("position",new W(a,3)),new U(r,new K({color:15788248,size:1.2,sizeAttenuation:!1,transparent:!0,opacity:.45}))}const m={minimal:{tier:"minimal",pixelRatioCap:.75,postEnabled:!1,bloomEnabled:!1,bloomStrength:0,bloomRadius:0,bloomThreshold:1,sphereSegments:12,asteroidBeltParticles:400,kuiperBeltParticles:500,starsDim:600,starsBright:100,starsMilkyWay:400,rimLightEnabled:!1,dofEnabled:!1,filmGrainEnabled:!1,vignetteEnabled:!1,skydomeEnabled:!1,lensFlareEnabled:!1},low:{tier:"low",pixelRatioCap:1,postEnabled:!1,bloomEnabled:!1,bloomStrength:0,bloomRadius:0,bloomThreshold:1,sphereSegments:18,asteroidBeltParticles:800,kuiperBeltParticles:1e3,starsDim:900,starsBright:180,starsMilkyWay:700,rimLightEnabled:!0,dofEnabled:!1,filmGrainEnabled:!1,vignetteEnabled:!1,skydomeEnabled:!1,lensFlareEnabled:!1},medium:{tier:"medium",pixelRatioCap:1.25,postEnabled:!0,bloomEnabled:!0,bloomStrength:.3,bloomRadius:.55,bloomThreshold:.94,sphereSegments:24,asteroidBeltParticles:1200,kuiperBeltParticles:1500,starsDim:1200,starsBright:240,starsMilkyWay:950,rimLightEnabled:!0,dofEnabled:!1,filmGrainEnabled:!0,vignetteEnabled:!0,skydomeEnabled:!1,lensFlareEnabled:!1},high:{tier:"high",pixelRatioCap:2,postEnabled:!0,bloomEnabled:!0,bloomStrength:.35,bloomRadius:.55,bloomThreshold:.92,sphereSegments:32,asteroidBeltParticles:1800,kuiperBeltParticles:2200,starsDim:1500,starsBright:300,starsMilkyWay:1200,rimLightEnabled:!0,dofEnabled:!1,filmGrainEnabled:!0,vignetteEnabled:!0,skydomeEnabled:!0,lensFlareEnabled:!1},cinematic:{tier:"cinematic",pixelRatioCap:2,postEnabled:!0,bloomEnabled:!0,bloomStrength:.42,bloomRadius:.6,bloomThreshold:.9,sphereSegments:48,asteroidBeltParticles:2400,kuiperBeltParticles:2800,starsDim:1800,starsBright:380,starsMilkyWay:1500,rimLightEnabled:!0,dofEnabled:!0,filmGrainEnabled:!0,vignetteEnabled:!0,skydomeEnabled:!0,lensFlareEnabled:!0}},R="orrery.qualityTier";function Y(){if(typeof localStorage>"u")return"auto";const s=localStorage.getItem(R);return s==="auto"||s==null?"auto":s in m?s:"auto"}function Me(s){typeof localStorage>"u"||(s==="auto"?localStorage.removeItem(R):localStorage.setItem(R,s))}function ue(s,e){return e&&s<=1?"minimal":e&&s===2?"low":s===0?"minimal":s===1?"low":s===2?"medium":"high"}let x=null;async function he(){var s;if(x)return x;try{const t=await ie(()=>import("./demhRTyb.js"),[],import.meta.url),i=t.getGPUTier??((s=t.default)==null?void 0:s.getGPUTier);if(!i)throw new Error("detect-gpu missing getGPUTier");const a=await i();x=ue(a.tier,a.isMobile??!1)}catch{x="medium"}return x}const F="orrery.qualityDetected";function Se(s){const e=s==null?void 0:s.searchParams.get("quality");if(e&&e in m)return m[e];const t=Y();if(t!=="auto")return m[t];if(typeof localStorage<"u"){const i=localStorage.getItem(F);if(i&&i in m)return m[i]}return m.medium}function we(s){const e=s==null?void 0:s.searchParams.get("quality");if(e&&e in m)return"url";if(Y()!=="auto")return"user-choice";if(typeof localStorage<"u"){const i=localStorage.getItem(F);if(i&&i in m)return"detect-gpu"}return"fallback"}async function Ce(){const s=await he();typeof localStorage<"u"&&localStorage.setItem(F,s)}const ye=["minimal","low","medium","high","cinematic"];export{ye as A,y as C,be as E,N as F,M as P,xe as R,k as S,T as U,we as a,ge as b,Te as c,pe as d,ve as e,Y as f,H as g,me as h,Ce as k,Se as r,Me as w};
