import{M as A,B as k,x as y,F as m,y as h,U as D,i as o,z as u,E as _,b as v,I as F,J as c,p as Q,D as T,K as V,N as L,X as C,Y as G,V as B,Z as I}from"./three.module.D_35xrYu.js";var p={uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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

		}`};class g{constructor(){this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}}const N=new y(-1,1,1,-1,0,1),S=new k;S.setAttribute("position",new m([-1,3,0,-1,-1,0,3,-1,0],3));S.setAttribute("uv",new m([0,2,0,0,2,0],2));class E{constructor(e){this._mesh=new A(S,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,N)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class w extends g{constructor(e,r){super(),this.textureID=r!==void 0?r:"tDiffuse",e instanceof h?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=D.clone(e.uniforms),this.material=new h({defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new E(this.material)}render(e,r,a){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=a.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(r),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}}class b extends g{constructor(e,r){super(),this.scene=e,this.camera=r,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,r,a){const t=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let i,l;this.inverse?(i=0,l=1):(i=1,l=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(t.REPLACE,t.REPLACE,t.REPLACE),s.buffers.stencil.setFunc(t.ALWAYS,i,4294967295),s.buffers.stencil.setClear(l),s.buffers.stencil.setLocked(!0),e.setRenderTarget(a),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(r),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(t.EQUAL,1,4294967295),s.buffers.stencil.setOp(t.KEEP,t.KEEP,t.KEEP),s.buffers.stencil.setLocked(!0)}}class j extends g{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class X{constructor(e,r){if(this.renderer=e,r===void 0){const a={minFilter:v,magFilter:v,format:_},t=e.getSize(new o);this._pixelRatio=e.getPixelRatio(),this._width=t.width,this._height=t.height,r=new u(this._width*this._pixelRatio,this._height*this._pixelRatio,a),r.texture.name="EffectComposer.rt1"}else this._pixelRatio=1,this._width=r.width,this._height=r.height;this.renderTarget1=r,this.renderTarget2=r.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],p===void 0&&console.error("THREE.EffectComposer relies on CopyShader"),w===void 0&&console.error("THREE.EffectComposer relies on ShaderPass"),this.copyPass=new w(p),this.clock=new F}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,r){this.passes.splice(r,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const r=this.passes.indexOf(e);r!==-1&&this.passes.splice(r,1)}isLastEnabledPass(e){for(let r=e+1;r<this.passes.length;r++)if(this.passes[r].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const r=this.renderer.getRenderTarget();let a=!1;for(let t=0,s=this.passes.length;t<s;t++){const i=this.passes[t];if(i.enabled!==!1){if(i.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),i.render(this.renderer,this.writeBuffer,this.readBuffer,e,a),i.needsSwap){if(a){const l=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(l.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(l.EQUAL,1,4294967295)}this.swapBuffers()}b!==void 0&&(i instanceof b?a=!0:i instanceof j&&(a=!1))}}this.renderer.setRenderTarget(r)}reset(e){if(e===void 0){const r=this.renderer.getSize(new o);this._pixelRatio=this.renderer.getPixelRatio(),this._width=r.width,this._height=r.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,r){this._width=e,this._height=r;const a=this._width*this._pixelRatio,t=this._height*this._pixelRatio;this.renderTarget1.setSize(a,t),this.renderTarget2.setSize(a,t);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(a,t)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}}new y(-1,1,1,-1,0,1);const P=new k;P.setAttribute("position",new m([-1,3,0,-1,-1,0,3,-1,0],3));P.setAttribute("uv",new m([0,2,0,0,2,0],2));class H extends g{constructor(e,r,a,t,s){super(),this.scene=e,this.camera=r,this.overrideMaterial=a,this.clearColor=t,this.clearAlpha=s!==void 0?s:0,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new c}render(e,r,a){const t=e.autoClear;e.autoClear=!1;let s,i;this.overrideMaterial!==void 0&&(i=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor&&(e.getClearColor(this._oldClearColor),s=e.getClearAlpha(),e.setClearColor(this.clearColor,this.clearAlpha)),this.clearDepth&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:a),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor&&e.setClearColor(this._oldClearColor,s),this.overrideMaterial!==void 0&&(this.scene.overrideMaterial=i),e.autoClear=t}}class f extends g{constructor(e,r,a,t){super(),this.renderScene=r,this.renderCamera=a,this.selectedObjects=t!==void 0?t:[],this.visibleEdgeColor=new c(1,1,1),this.hiddenEdgeColor=new c(.1,.04,.02),this.edgeGlow=0,this.usePatternTexture=!1,this.edgeThickness=1,this.edgeStrength=3,this.downSampleRatio=2,this.pulsePeriod=0,this._visibilityCache=new Map,this.resolution=e!==void 0?new o(e.x,e.y):new o(256,256);const s={minFilter:v,magFilter:v,format:_},i=Math.round(this.resolution.x/this.downSampleRatio),l=Math.round(this.resolution.y/this.downSampleRatio);this.maskBufferMaterial=new Q({color:16777215}),this.maskBufferMaterial.side=T,this.renderTargetMaskBuffer=new u(this.resolution.x,this.resolution.y,s),this.renderTargetMaskBuffer.texture.name="OutlinePass.mask",this.renderTargetMaskBuffer.texture.generateMipmaps=!1,this.depthMaterial=new V,this.depthMaterial.side=T,this.depthMaterial.depthPacking=L,this.depthMaterial.blending=C,this.prepareMaskMaterial=this.getPrepareMaskMaterial(),this.prepareMaskMaterial.side=T,this.prepareMaskMaterial.fragmentShader=R(this.prepareMaskMaterial.fragmentShader,this.renderCamera),this.renderTargetDepthBuffer=new u(this.resolution.x,this.resolution.y,s),this.renderTargetDepthBuffer.texture.name="OutlinePass.depth",this.renderTargetDepthBuffer.texture.generateMipmaps=!1,this.renderTargetMaskDownSampleBuffer=new u(i,l,s),this.renderTargetMaskDownSampleBuffer.texture.name="OutlinePass.depthDownSample",this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps=!1,this.renderTargetBlurBuffer1=new u(i,l,s),this.renderTargetBlurBuffer1.texture.name="OutlinePass.blur1",this.renderTargetBlurBuffer1.texture.generateMipmaps=!1,this.renderTargetBlurBuffer2=new u(Math.round(i/2),Math.round(l/2),s),this.renderTargetBlurBuffer2.texture.name="OutlinePass.blur2",this.renderTargetBlurBuffer2.texture.generateMipmaps=!1,this.edgeDetectionMaterial=this.getEdgeDetectionMaterial(),this.renderTargetEdgeBuffer1=new u(i,l,s),this.renderTargetEdgeBuffer1.texture.name="OutlinePass.edge1",this.renderTargetEdgeBuffer1.texture.generateMipmaps=!1,this.renderTargetEdgeBuffer2=new u(Math.round(i/2),Math.round(l/2),s),this.renderTargetEdgeBuffer2.texture.name="OutlinePass.edge2",this.renderTargetEdgeBuffer2.texture.generateMipmaps=!1;const n=4,x=4;this.separableBlurMaterial1=this.getSeperableBlurMaterial(n),this.separableBlurMaterial1.uniforms.texSize.value.set(i,l),this.separableBlurMaterial1.uniforms.kernelRadius.value=1,this.separableBlurMaterial2=this.getSeperableBlurMaterial(x),this.separableBlurMaterial2.uniforms.texSize.value.set(Math.round(i/2),Math.round(l/2)),this.separableBlurMaterial2.uniforms.kernelRadius.value=x,this.overlayMaterial=this.getOverlayMaterial(),p===void 0&&console.error("THREE.OutlinePass relies on CopyShader");const M=p;this.copyUniforms=D.clone(M.uniforms),this.copyUniforms.opacity.value=1,this.materialCopy=new h({uniforms:this.copyUniforms,vertexShader:M.vertexShader,fragmentShader:M.fragmentShader,blending:C,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new c,this.oldClearAlpha=1,this.fsQuad=new E(null),this.tempPulseColor1=new c,this.tempPulseColor2=new c,this.textureMatrix=new G;function R(O,z){var U=z.isPerspectiveCamera?"perspective":"orthographic";return O.replace(/DEPTH_TO_VIEW_Z/g,U+"DepthToViewZ")}}dispose(){this.renderTargetMaskBuffer.dispose(),this.renderTargetDepthBuffer.dispose(),this.renderTargetMaskDownSampleBuffer.dispose(),this.renderTargetBlurBuffer1.dispose(),this.renderTargetBlurBuffer2.dispose(),this.renderTargetEdgeBuffer1.dispose(),this.renderTargetEdgeBuffer2.dispose()}setSize(e,r){this.renderTargetMaskBuffer.setSize(e,r),this.renderTargetDepthBuffer.setSize(e,r);let a=Math.round(e/this.downSampleRatio),t=Math.round(r/this.downSampleRatio);this.renderTargetMaskDownSampleBuffer.setSize(a,t),this.renderTargetBlurBuffer1.setSize(a,t),this.renderTargetEdgeBuffer1.setSize(a,t),this.separableBlurMaterial1.uniforms.texSize.value.set(a,t),a=Math.round(a/2),t=Math.round(t/2),this.renderTargetBlurBuffer2.setSize(a,t),this.renderTargetEdgeBuffer2.setSize(a,t),this.separableBlurMaterial2.uniforms.texSize.value.set(a,t)}changeVisibilityOfSelectedObjects(e){const r=this._visibilityCache;function a(t){t.isMesh&&(e===!0?t.visible=r.get(t):(r.set(t,t.visible),t.visible=e))}for(let t=0;t<this.selectedObjects.length;t++)this.selectedObjects[t].traverse(a)}changeVisibilityOfNonSelectedObjects(e){const r=this._visibilityCache,a=[];function t(i){i.isMesh&&a.push(i)}for(let i=0;i<this.selectedObjects.length;i++)this.selectedObjects[i].traverse(t);function s(i){if(i.isMesh||i.isSprite){let l=!1;for(let n=0;n<a.length;n++)if(a[n].id===i.id){l=!0;break}if(l===!1){const n=i.visible;(e===!1||r.get(i)===!0)&&(i.visible=e),r.set(i,n)}}else(i.isPoints||i.isLine)&&(e===!0?i.visible=r.get(i):(r.set(i,i.visible),i.visible=e))}this.renderScene.traverse(s)}updateTextureMatrix(){this.textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this.textureMatrix.multiply(this.renderCamera.projectionMatrix),this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse)}render(e,r,a,t,s){if(this.selectedObjects.length>0){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const i=e.autoClear;e.autoClear=!1,s&&e.state.buffers.stencil.setTest(!1),e.setClearColor(16777215,1),this.changeVisibilityOfSelectedObjects(!1);const l=this.renderScene.background;if(this.renderScene.background=null,this.renderScene.overrideMaterial=this.depthMaterial,e.setRenderTarget(this.renderTargetDepthBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this.changeVisibilityOfSelectedObjects(!0),this._visibilityCache.clear(),this.updateTextureMatrix(),this.changeVisibilityOfNonSelectedObjects(!1),this.renderScene.overrideMaterial=this.prepareMaskMaterial,this.prepareMaskMaterial.uniforms.cameraNearFar.value.set(this.renderCamera.near,this.renderCamera.far),this.prepareMaskMaterial.uniforms.depthTexture.value=this.renderTargetDepthBuffer.texture,this.prepareMaskMaterial.uniforms.textureMatrix.value=this.textureMatrix,e.setRenderTarget(this.renderTargetMaskBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this.renderScene.overrideMaterial=null,this.changeVisibilityOfNonSelectedObjects(!0),this._visibilityCache.clear(),this.renderScene.background=l,this.fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=this.renderTargetMaskBuffer.texture,e.setRenderTarget(this.renderTargetMaskDownSampleBuffer),e.clear(),this.fsQuad.render(e),this.tempPulseColor1.copy(this.visibleEdgeColor),this.tempPulseColor2.copy(this.hiddenEdgeColor),this.pulsePeriod>0){const n=.625+Math.cos(performance.now()*.01/this.pulsePeriod)*.75/2;this.tempPulseColor1.multiplyScalar(n),this.tempPulseColor2.multiplyScalar(n)}this.fsQuad.material=this.edgeDetectionMaterial,this.edgeDetectionMaterial.uniforms.maskTexture.value=this.renderTargetMaskDownSampleBuffer.texture,this.edgeDetectionMaterial.uniforms.texSize.value.set(this.renderTargetMaskDownSampleBuffer.width,this.renderTargetMaskDownSampleBuffer.height),this.edgeDetectionMaterial.uniforms.visibleEdgeColor.value=this.tempPulseColor1,this.edgeDetectionMaterial.uniforms.hiddenEdgeColor.value=this.tempPulseColor2,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.separableBlurMaterial1,this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=f.BlurDirectionX,this.separableBlurMaterial1.uniforms.kernelRadius.value=this.edgeThickness,e.setRenderTarget(this.renderTargetBlurBuffer1),e.clear(),this.fsQuad.render(e),this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetBlurBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=f.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.separableBlurMaterial2,this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial2.uniforms.direction.value=f.BlurDirectionX,e.setRenderTarget(this.renderTargetBlurBuffer2),e.clear(),this.fsQuad.render(e),this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetBlurBuffer2.texture,this.separableBlurMaterial2.uniforms.direction.value=f.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer2),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.overlayMaterial,this.overlayMaterial.uniforms.maskTexture.value=this.renderTargetMaskBuffer.texture,this.overlayMaterial.uniforms.edgeTexture1.value=this.renderTargetEdgeBuffer1.texture,this.overlayMaterial.uniforms.edgeTexture2.value=this.renderTargetEdgeBuffer2.texture,this.overlayMaterial.uniforms.patternTexture.value=this.patternTexture,this.overlayMaterial.uniforms.edgeStrength.value=this.edgeStrength,this.overlayMaterial.uniforms.edgeGlow.value=this.edgeGlow,this.overlayMaterial.uniforms.usePatternTexture.value=this.usePatternTexture,s&&e.state.buffers.stencil.setTest(!0),e.setRenderTarget(a),this.fsQuad.render(e),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=i}this.renderToScreen&&(this.fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=a.texture,e.setRenderTarget(null),this.fsQuad.render(e))}getPrepareMaskMaterial(){return new h({uniforms:{depthTexture:{value:null},cameraNearFar:{value:new o(.5,.5)},textureMatrix:{value:null}},vertexShader:`#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>

				varying vec4 projTexCoord;
				varying vec4 vPosition;
				uniform mat4 textureMatrix;

				void main() {

					#include <skinbase_vertex>
					#include <begin_vertex>
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					#include <project_vertex>

					vPosition = mvPosition;
					vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
					projTexCoord = textureMatrix * worldPosition;

				}`,fragmentShader:`#include <packing>
				varying vec4 vPosition;
				varying vec4 projTexCoord;
				uniform sampler2D depthTexture;
				uniform vec2 cameraNearFar;

				void main() {

					float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));
					float viewZ = - DEPTH_TO_VIEW_Z( depth, cameraNearFar.x, cameraNearFar.y );
					float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;
					gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);

				}`})}getEdgeDetectionMaterial(){return new h({uniforms:{maskTexture:{value:null},texSize:{value:new o(.5,.5)},visibleEdgeColor:{value:new B(1,1,1)},hiddenEdgeColor:{value:new B(1,1,1)}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform vec2 texSize;
				uniform vec3 visibleEdgeColor;
				uniform vec3 hiddenEdgeColor;

				void main() {
					vec2 invSize = 1.0 / texSize;
					vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
					vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);
					vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);
					vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);
					vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);
					float diff1 = (c1.r - c2.r)*0.5;
					float diff2 = (c3.r - c4.r)*0.5;
					float d = length( vec2(diff1, diff2) );
					float a1 = min(c1.g, c2.g);
					float a2 = min(c3.g, c4.g);
					float visibilityFactor = min(a1, a2);
					vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;
					gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);
				}`})}getSeperableBlurMaterial(e){return new h({defines:{MAX_RADIUS:e},uniforms:{colorTexture:{value:null},texSize:{value:new o(.5,.5)},direction:{value:new o(.5,.5)},kernelRadius:{value:1}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;
				uniform float kernelRadius;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}

				void main() {
					vec2 invSize = 1.0 / texSize;
					float weightSum = gaussianPdf(0.0, kernelRadius);
					vec4 diffuseSum = texture2D( colorTexture, vUv) * weightSum;
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);
					vec2 uvOffset = delta;
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {
						float w = gaussianPdf(uvOffset.x, kernelRadius);
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);
						diffuseSum += ((sample1 + sample2) * w);
						weightSum += (2.0 * w);
						uvOffset += delta;
					}
					gl_FragColor = diffuseSum/weightSum;
				}`})}getOverlayMaterial(){return new h({uniforms:{maskTexture:{value:null},edgeTexture1:{value:null},edgeTexture2:{value:null},patternTexture:{value:null},edgeStrength:{value:1},edgeGlow:{value:1},usePatternTexture:{value:0}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform sampler2D edgeTexture1;
				uniform sampler2D edgeTexture2;
				uniform sampler2D patternTexture;
				uniform float edgeStrength;
				uniform float edgeGlow;
				uniform bool usePatternTexture;

				void main() {
					vec4 edgeValue1 = texture2D(edgeTexture1, vUv);
					vec4 edgeValue2 = texture2D(edgeTexture2, vUv);
					vec4 maskColor = texture2D(maskTexture, vUv);
					vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);
					float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;
					vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;
					vec4 finalColor = edgeStrength * maskColor.r * edgeValue;
					if(usePatternTexture)
						finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);
					gl_FragColor = finalColor;
				}`,blending:I,depthTest:!1,depthWrite:!1,transparent:!0})}}f.BlurDirectionX=new o(1,0);f.BlurDirectionY=new o(0,1);export{X as E,f as O,H as R};
