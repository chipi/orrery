import{P as C,C as w,F as _,E as y,R as b,U as k}from"./BR6FrT9D.js";import{p as v,n as o,q as h,r as D,D as m,s as P,N as x,t as g,U as E,u as p,v as O,V as M,w as R}from"./DAKoEnMW.js";class u extends C{constructor(e,i,t,a){super(),this.renderScene=i,this.renderCamera=t,this.selectedObjects=a!==void 0?a:[],this.visibleEdgeColor=new v(1,1,1),this.hiddenEdgeColor=new v(.1,.04,.02),this.edgeGlow=0,this.usePatternTexture=!1,this.patternTexture=null,this.edgeThickness=1,this.edgeStrength=3,this.downSampleRatio=2,this.pulsePeriod=0,this._visibilityCache=new Map,this._selectionCache=new Set,this.resolution=e!==void 0?new o(e.x,e.y):new o(256,256);const r=Math.round(this.resolution.x/this.downSampleRatio),s=Math.round(this.resolution.y/this.downSampleRatio);this.renderTargetMaskBuffer=new h(this.resolution.x,this.resolution.y),this.renderTargetMaskBuffer.texture.name="OutlinePass.mask",this.renderTargetMaskBuffer.texture.generateMipmaps=!1,this.depthMaterial=new D,this.depthMaterial.side=m,this.depthMaterial.depthPacking=P,this.depthMaterial.blending=x,this.prepareMaskMaterial=this._getPrepareMaskMaterial(),this.prepareMaskMaterial.side=m,this.prepareMaskMaterial.fragmentShader=c(this.prepareMaskMaterial.fragmentShader,this.renderCamera),this.renderTargetDepthBuffer=new h(this.resolution.x,this.resolution.y,{type:g}),this.renderTargetDepthBuffer.texture.name="OutlinePass.depth",this.renderTargetDepthBuffer.texture.generateMipmaps=!1,this.renderTargetMaskDownSampleBuffer=new h(r,s,{type:g}),this.renderTargetMaskDownSampleBuffer.texture.name="OutlinePass.depthDownSample",this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps=!1,this.renderTargetBlurBuffer1=new h(r,s,{type:g}),this.renderTargetBlurBuffer1.texture.name="OutlinePass.blur1",this.renderTargetBlurBuffer1.texture.generateMipmaps=!1,this.renderTargetBlurBuffer2=new h(Math.round(r/2),Math.round(s/2),{type:g}),this.renderTargetBlurBuffer2.texture.name="OutlinePass.blur2",this.renderTargetBlurBuffer2.texture.generateMipmaps=!1,this.edgeDetectionMaterial=this._getEdgeDetectionMaterial(),this.renderTargetEdgeBuffer1=new h(r,s,{type:g}),this.renderTargetEdgeBuffer1.texture.name="OutlinePass.edge1",this.renderTargetEdgeBuffer1.texture.generateMipmaps=!1,this.renderTargetEdgeBuffer2=new h(Math.round(r/2),Math.round(s/2),{type:g}),this.renderTargetEdgeBuffer2.texture.name="OutlinePass.edge2",this.renderTargetEdgeBuffer2.texture.generateMipmaps=!1;const n=4,f=4;this.separableBlurMaterial1=this._getSeparableBlurMaterial(n),this.separableBlurMaterial1.uniforms.texSize.value.set(r,s),this.separableBlurMaterial1.uniforms.kernelRadius.value=1,this.separableBlurMaterial2=this._getSeparableBlurMaterial(f),this.separableBlurMaterial2.uniforms.texSize.value.set(Math.round(r/2),Math.round(s/2)),this.separableBlurMaterial2.uniforms.kernelRadius.value=f,this.overlayMaterial=this._getOverlayMaterial();const l=w;this.copyUniforms=E.clone(l.uniforms),this.materialCopy=new p({uniforms:this.copyUniforms,vertexShader:l.vertexShader,fragmentShader:l.fragmentShader,blending:x,depthTest:!1,depthWrite:!1}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new v,this.oldClearAlpha=1,this._fsQuad=new _(null),this.tempPulseColor1=new v,this.tempPulseColor2=new v,this.textureMatrix=new O;function c(T,S){const B=S.isPerspectiveCamera?"perspective":"orthographic";return T.replace(/DEPTH_TO_VIEW_Z/g,B+"DepthToViewZ")}}dispose(){this.renderTargetMaskBuffer.dispose(),this.renderTargetDepthBuffer.dispose(),this.renderTargetMaskDownSampleBuffer.dispose(),this.renderTargetBlurBuffer1.dispose(),this.renderTargetBlurBuffer2.dispose(),this.renderTargetEdgeBuffer1.dispose(),this.renderTargetEdgeBuffer2.dispose(),this.depthMaterial.dispose(),this.prepareMaskMaterial.dispose(),this.edgeDetectionMaterial.dispose(),this.separableBlurMaterial1.dispose(),this.separableBlurMaterial2.dispose(),this.overlayMaterial.dispose(),this.materialCopy.dispose(),this._fsQuad.dispose()}setSize(e,i){this.renderTargetMaskBuffer.setSize(e,i),this.renderTargetDepthBuffer.setSize(e,i);let t=Math.round(e/this.downSampleRatio),a=Math.round(i/this.downSampleRatio);this.renderTargetMaskDownSampleBuffer.setSize(t,a),this.renderTargetBlurBuffer1.setSize(t,a),this.renderTargetEdgeBuffer1.setSize(t,a),this.separableBlurMaterial1.uniforms.texSize.value.set(t,a),t=Math.round(t/2),a=Math.round(a/2),this.renderTargetBlurBuffer2.setSize(t,a),this.renderTargetEdgeBuffer2.setSize(t,a),this.separableBlurMaterial2.uniforms.texSize.value.set(t,a)}render(e,i,t,a,r){if(this.selectedObjects.length>0){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const s=e.autoClear;e.autoClear=!1,r&&e.state.buffers.stencil.setTest(!1),e.setClearColor(16777215,1),this._updateSelectionCache(),this._changeVisibilityOfSelectedObjects(!1);const n=this.renderScene.background,f=this.renderScene.overrideMaterial;if(this.renderScene.background=null,this.renderScene.overrideMaterial=this.depthMaterial,e.setRenderTarget(this.renderTargetDepthBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this._changeVisibilityOfSelectedObjects(!0),this._visibilityCache.clear(),this._updateTextureMatrix(),this._changeVisibilityOfNonSelectedObjects(!1),this.renderScene.overrideMaterial=this.prepareMaskMaterial,this.prepareMaskMaterial.uniforms.cameraNearFar.value.set(this.renderCamera.near,this.renderCamera.far),this.prepareMaskMaterial.uniforms.depthTexture.value=this.renderTargetDepthBuffer.texture,this.prepareMaskMaterial.uniforms.textureMatrix.value=this.textureMatrix,e.setRenderTarget(this.renderTargetMaskBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this._changeVisibilityOfNonSelectedObjects(!0),this._visibilityCache.clear(),this._selectionCache.clear(),this.renderScene.background=n,this.renderScene.overrideMaterial=f,this._fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=this.renderTargetMaskBuffer.texture,e.setRenderTarget(this.renderTargetMaskDownSampleBuffer),e.clear(),this._fsQuad.render(e),this.tempPulseColor1.copy(this.visibleEdgeColor),this.tempPulseColor2.copy(this.hiddenEdgeColor),this.pulsePeriod>0){const l=.625+Math.cos(performance.now()*.01/this.pulsePeriod)*.75/2;this.tempPulseColor1.multiplyScalar(l),this.tempPulseColor2.multiplyScalar(l)}this._fsQuad.material=this.edgeDetectionMaterial,this.edgeDetectionMaterial.uniforms.maskTexture.value=this.renderTargetMaskDownSampleBuffer.texture,this.edgeDetectionMaterial.uniforms.texSize.value.set(this.renderTargetMaskDownSampleBuffer.width,this.renderTargetMaskDownSampleBuffer.height),this.edgeDetectionMaterial.uniforms.visibleEdgeColor.value=this.tempPulseColor1,this.edgeDetectionMaterial.uniforms.hiddenEdgeColor.value=this.tempPulseColor2,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.separableBlurMaterial1,this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=u.BlurDirectionX,this.separableBlurMaterial1.uniforms.kernelRadius.value=this.edgeThickness,e.setRenderTarget(this.renderTargetBlurBuffer1),e.clear(),this._fsQuad.render(e),this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetBlurBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=u.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.separableBlurMaterial2,this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial2.uniforms.direction.value=u.BlurDirectionX,e.setRenderTarget(this.renderTargetBlurBuffer2),e.clear(),this._fsQuad.render(e),this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetBlurBuffer2.texture,this.separableBlurMaterial2.uniforms.direction.value=u.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer2),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.overlayMaterial,this.overlayMaterial.uniforms.maskTexture.value=this.renderTargetMaskBuffer.texture,this.overlayMaterial.uniforms.edgeTexture1.value=this.renderTargetEdgeBuffer1.texture,this.overlayMaterial.uniforms.edgeTexture2.value=this.renderTargetEdgeBuffer2.texture,this.overlayMaterial.uniforms.patternTexture.value=this.patternTexture,this.overlayMaterial.uniforms.edgeStrength.value=this.edgeStrength,this.overlayMaterial.uniforms.edgeGlow.value=this.edgeGlow,this.overlayMaterial.uniforms.usePatternTexture.value=this.usePatternTexture,r&&e.state.buffers.stencil.setTest(!0),e.setRenderTarget(t),this._fsQuad.render(e),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=s}this.renderToScreen&&(this._fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=t.texture,e.setRenderTarget(null),this._fsQuad.render(e))}_updateSelectionCache(){const e=this._selectionCache;function i(t){t.isMesh&&e.add(t)}e.clear();for(let t=0;t<this.selectedObjects.length;t++)this.selectedObjects[t].traverse(i)}_changeVisibilityOfSelectedObjects(e){const i=this._visibilityCache;for(const t of this._selectionCache)e===!0?t.visible=i.get(t):(i.set(t,t.visible),t.visible=e)}_changeVisibilityOfNonSelectedObjects(e){const i=this._visibilityCache,t=this._selectionCache;function a(r){if(r.isPoints||r.isLine||r.isLine2)e===!0?r.visible=i.get(r):(i.set(r,r.visible),r.visible=e);else if((r.isMesh||r.isSprite)&&!t.has(r)){const s=r.visible;(e===!1||i.get(r)===!0)&&(r.visible=e),i.set(r,s)}}this.renderScene.traverse(a)}_updateTextureMatrix(){this.textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this.textureMatrix.multiply(this.renderCamera.projectionMatrix),this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse)}_getPrepareMaskMaterial(){return new p({uniforms:{depthTexture:{value:null},cameraNearFar:{value:new o(.5,.5)},textureMatrix:{value:null}},vertexShader:`#include <batching_pars_vertex>
				#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>

				varying vec4 projTexCoord;
				varying vec4 vPosition;
				uniform mat4 textureMatrix;

				void main() {

					#include <batching_vertex>
					#include <skinbase_vertex>
					#include <begin_vertex>
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					#include <project_vertex>

					vPosition = mvPosition;

					vec4 worldPosition = vec4( transformed, 1.0 );

					#ifdef USE_INSTANCING

						worldPosition = instanceMatrix * worldPosition;

					#endif

					worldPosition = modelMatrix * worldPosition;

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

				}`})}_getEdgeDetectionMaterial(){return new p({uniforms:{maskTexture:{value:null},texSize:{value:new o(.5,.5)},visibleEdgeColor:{value:new M(1,1,1)},hiddenEdgeColor:{value:new M(1,1,1)}},vertexShader:`varying vec2 vUv;

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
				}`})}_getSeparableBlurMaterial(e){return new p({defines:{MAX_RADIUS:e},uniforms:{colorTexture:{value:null},texSize:{value:new o(.5,.5)},direction:{value:new o(.5,.5)},kernelRadius:{value:1}},vertexShader:`varying vec2 vUv;

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
					float sigma = kernelRadius/2.0;
					float weightSum = gaussianPdf(0.0, sigma);
					vec4 diffuseSum = texture2D( colorTexture, vUv) * weightSum;
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);
					vec2 uvOffset = delta;
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {
						float x = kernelRadius * float(i) / float(MAX_RADIUS);
						float w = gaussianPdf(x, sigma);
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);
						diffuseSum += ((sample1 + sample2) * w);
						weightSum += (2.0 * w);
						uvOffset += delta;
					}
					gl_FragColor = diffuseSum/weightSum;
				}`})}_getOverlayMaterial(){return new p({uniforms:{maskTexture:{value:null},edgeTexture1:{value:null},edgeTexture2:{value:null},patternTexture:{value:null},edgeStrength:{value:1},edgeGlow:{value:1},usePatternTexture:{value:0}},vertexShader:`varying vec2 vUv;

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
				}`,blending:R,depthTest:!1,depthWrite:!1,transparent:!0})}}u.BlurDirectionX=new o(1,0);u.BlurDirectionY=new o(0,1);const U={edgeStrength:4,edgeGlow:.4,edgeThickness:1.5,visibleEdgeColor:5164484,hiddenEdgeColor:2247240};function V(d){const{renderer:e,scene:i,camera:t,width:a,height:r}=d,s={...U,...d.options},n=new y(e);n.setSize(a,r);const f=d.pixelRatioCap??2;n.setPixelRatio(Math.min(window.devicePixelRatio,f)),n.addPass(new b(i,t));const l=new u(new o(a,r),i,t);l.edgeStrength=s.edgeStrength,l.edgeGlow=s.edgeGlow,l.edgeThickness=s.edgeThickness,l.visibleEdgeColor.setHex(s.visibleEdgeColor),l.hiddenEdgeColor.setHex(s.hiddenEdgeColor),n.addPass(l);let c=null;return d.bloom&&(c=new k(new o(a,r),d.bloom.strength,d.bloom.radius,d.bloom.threshold),n.addPass(c)),{composer:n,outlinePass:l,bloomPass:c}}export{V as c};
