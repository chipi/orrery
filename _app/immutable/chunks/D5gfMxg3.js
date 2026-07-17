import{B as e,F as t,I as n,M as r,N as i,O as a,P as o,R as s,U as c,Y as l,_t as u,a as d,b as f,bt as p,ct as m,gt as h,l as g,nt as _,p as v,r as y,rt as b,st as x,tt as S,ut as C,xt as w,y as T,z as E}from"./zEB-6H-K.js";import{s as D}from"./CZaXDlEh.js";import"./xihTtKlq.js";import{A as O,B as k,C as A,D as j,E as M,F as ee,G as N,H as P,I as te,K as ne,L as re,M as ie,N as ae,O as oe,P as se,R as ce,S as le,T as ue,U as de,V as fe,W as F,X as pe,_ as me,a as he,b as ge,c as _e,d as ve,f as ye,g as be,h as xe,i as Se,j as Ce,k as we,l as Te,m as Ee,n as De,o as Oe,p as ke,r as Ae,s as je,t as Me,u as Ne,v as Pe,w as Fe,x as Ie,y as Le,z as Re}from"./Bw8_dNlP.js";import{A as ze,B as Be,E as I,R as Ve,St as L,T as R,bt as He,ct as Ue,lt as We,n as Ge,o as z,t as B,w as Ke,wt as qe,xt as V,y as H,yt as U,z as Je}from"./7sssqGyv.js";import{i as Ye}from"./DpOoYdTa.js";import{r as Xe}from"./DRLu9PfV.js";import{a as Ze,o as Qe,s as $e}from"./BdwFTTVG2.js";import{t as et}from"./DqSgkhYb2.js";var tt=new z,W=new V,nt=class extends Ke{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new H([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new H([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new R(t,6,1);return this.setAttribute(`instanceStart`,new I(n,3,0)),this.setAttribute(`instanceEnd`,new I(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new R(t,6,1);return this.setAttribute(`instanceColorStart`,new I(n,3,0)),this.setAttribute(`instanceColorEnd`,new I(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new qe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new z);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),tt.setFromBufferAttribute(t),this.boundingBox.union(tt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new We),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)W.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(W)),W.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(W));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}};Ge.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new He},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},B.line={uniforms:U.merge([Ge.common,Ge.fog,Ge.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var rt=class extends Ue{constructor(e){super({type:`LineMaterial`,uniforms:U.clone(B.line.uniforms),vertexShader:B.line.vertexShader,fragmentShader:B.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return`WORLD_UNITS`in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return`USE_DASH`in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return`USE_ALPHA_TO_COVERAGE`in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE=``:delete this.defines.USE_ALPHA_TO_COVERAGE)}},it=new L,at=new V,G=new V,K=new L,q=new L,J=new L,ot=new V,st=new Je,Y=new ze,ct=new V,lt=new z,X=new We,Z=new L,Q,$;function ut(e,t,n){return Z.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),Z.multiplyScalar(1/Z.w),Z.x=$/n.width,Z.y=$/n.height,Z.applyMatrix4(e.projectionMatrixInverse),Z.multiplyScalar(1/Z.w),Math.abs(Math.max(Z.x,Z.y))}function dt(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,a=r.attributes.instanceEnd,o=Math.min(r.instanceCount,i.count);for(let r=0,s=o;r<s;r++){Y.start.fromBufferAttribute(i,r),Y.end.fromBufferAttribute(a,r),Y.applyMatrix4(n);let o=new V,s=new V;Q.distanceSqToSegment(Y.start,Y.end,s,o),s.distanceTo(o)<$*.5&&t.push({point:s,pointOnLine:o,distance:Q.origin.distanceTo(s),object:e,face:null,faceIndex:r,uv:null,uv1:null})}}function ft(e,t,n){let r=t.projectionMatrix,i=e.material.resolution,a=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,c=o.attributes.instanceEnd,l=Math.min(o.instanceCount,s.count),u=-t.near;Q.at(1,J),J.w=1,J.applyMatrix4(t.matrixWorldInverse),J.applyMatrix4(r),J.multiplyScalar(1/J.w),J.x*=i.x/2,J.y*=i.y/2,J.z=0,ot.copy(J),st.multiplyMatrices(t.matrixWorldInverse,a);for(let t=0,o=l;t<o;t++){if(K.fromBufferAttribute(s,t),q.fromBufferAttribute(c,t),K.w=1,q.w=1,K.applyMatrix4(st),q.applyMatrix4(st),K.z>u&&q.z>u)continue;if(K.z>u){let e=K.z-q.z,t=(K.z-u)/e;K.lerp(q,t)}else if(q.z>u){let e=q.z-K.z,t=(q.z-u)/e;q.lerp(K,t)}K.applyMatrix4(r),q.applyMatrix4(r),K.multiplyScalar(1/K.w),q.multiplyScalar(1/q.w),K.x*=i.x/2,K.y*=i.y/2,q.x*=i.x/2,q.y*=i.y/2,Y.start.copy(K),Y.start.z=0,Y.end.copy(q),Y.end.z=0;let o=Y.closestPointToPointParameter(ot,!0);Y.at(o,ct);let l=Ve.lerp(K.z,q.z,o),d=l>=-1&&l<=1,f=ot.distanceTo(ct)<$*.5;if(d&&f){Y.start.fromBufferAttribute(s,t),Y.end.fromBufferAttribute(c,t),Y.start.applyMatrix4(a),Y.end.applyMatrix4(a);let r=new V,i=new V;Q.distanceSqToSegment(Y.start,Y.end,i,r),n.push({point:i,pointOnLine:r,distance:Q.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}var pt=class extends Be{constructor(e=new nt,t=new rt({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)at.fromBufferAttribute(t,e),G.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+at.distanceTo(G);let i=new R(r,2,1);return e.setAttribute(`instanceDistanceStart`,new I(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new I(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;if(r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;Q=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;$=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),X.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?$*.5:ut(r,Math.max(r.near,X.distanceToPoint(Q.origin)),s.resolution),X.radius+=c,Q.intersectsSphere(X)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),lt.copy(o.boundingBox).applyMatrix4(a);let l;l=n?$*.5:ut(r,Math.max(r.near,lt.distanceToPoint(Q.origin)),s.resolution),lt.expandByScalar(l),Q.intersectsBox(lt)!==!1&&(n?dt(this,t):ft(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(it),this.material.uniforms.resolution.value.set(it.z,it.w))}},mt=class extends nt{constructor(){super(),this.isLineGeometry=!0,this.type=`LineGeometry`}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setColors(n),this}setFromPoints(e){let t=e.length-1,n=new Float32Array(6*t);for(let r=0;r<t;r++)n[6*r]=e[r].x,n[6*r+1]=e[r].y,n[6*r+2]=e[r].z||0,n[6*r+3]=e[r+1].x,n[6*r+4]=e[r+1].y,n[6*r+5]=e[r+1].z||0;return super.setPositions(n),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}},ht=class extends pt{constructor(e=new mt,t=new rt({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type=`Line2`}},gt=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function _t(e){for(let t=0;t<gt.length-1;t++){let[n,r]=gt[t],[i,a]=gt[t+1];if(e>=n&&e<=i)return r+(e-n)/(i-n)*(a-r)}return 512}function vt(e){return 8.5+5.2*Math.log10(1+e/200)}function yt(e,t){return e+(vt(t)-vt(0))}var bt=n(`<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>`),xt=n(`<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>`),St=n(`<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>`),Ct=n(`<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>`),wt=n(`<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>`);function Tt(t,n){u(n,!0);let s=d(n,`highlightRegime`,3,null),p=d(n,`anchorBottomPx`,3,80);function m(e){return e==null?0:typeof e==`number`?e:(e[0]+e[1])/2}function g(e){return e.altitude_km==null?m(e.distance_au):m(e.altitude_km)}let _=C(()=>n.order?n.order.map(e=>n.regimes.find(t=>t.id===e)).filter(e=>e!=null):[...n.regimes].sort((e,t)=>g(t)-g(e)));function y(e){if(typeof e==`number`)return e>=1e3?`${(e/1e3).toFixed(0)},000 km`:`${e} km`;let[t,n]=e,r=e=>e>=1e3?`${(e/1e3).toFixed(0)}k`:`${e}`;return`${r(t)}-${r(n)} km`}function x(e){let t=e=>e<10?e.toFixed(1):e<1e3?e.toFixed(0):e<1e4?`${(e/1e3).toFixed(1)}k`:`${(e/1e3).toFixed(0)}k`;return typeof e==`number`?`${t(e)} AU`:`${t(e[0])}-${t(e[1])} AU`}function E(e){return e.altitude_km==null?e.distance_au==null?``:x(e.distance_au):y(e.altitude_km)}var D=wt();let O;var k=S(D),A=S(k,!0);w(k);var j=b(k,2),M=S(j);a(M,17,()=>c(_),e=>e.id,(t,a)=>{var u=St(),d=S(u);let p,m;var h=S(d),g=e=>{o(e,bt())},_=e=>{o(e,xt())};r(h,e=>{c(a).id===s()?e(g):e(_,-1)});var y=b(h,2),x=S(y,!0);w(y);var C=b(y,2),D=S(C,!0);w(C),w(d),w(u),l(e=>{p=f(d,1,`band svelte-1v3z2gg`,null,p,{"band--highlighted":c(a).id===s()}),v(d,`aria-current`,c(a).id===s()?`true`:void 0),m=T(d,``,m,{"--regime-color":c(a).color}),i(x,c(a).short??c(a).id),i(D,e)},[()=>E(c(a))]),e(`click`,d,()=>n.onSelect(c(a).id)),o(t,u)});var ee=b(M,2),P=e=>{let t=C(()=>n.surfaceAnchor??{label:F(),value:`0 km`});var r=Ct(),a=b(S(r),2),s=S(a,!0);w(a);var u=b(a,2),d=S(u,!0);w(u),w(r),l(()=>{i(s,c(t).label),i(d,c(t).value)}),o(e,r)};r(ee,e=>{n.surfaceAnchor!==null&&e(P)}),w(j),w(D),l((e,t)=>{v(D,`aria-label`,e),O=T(D,``,O,{"--ruler-bottom":`${p()??``}px`}),i(A,t)},[()=>N(),()=>ne()]),o(t,D),h()}E([`click`]);var Et={mercury:{diameterKm:4880,diameterRatioEarth:.38,surfaceGravityG:.38,atmoBar:0,atmoComposition:`Na · K · O · H exosphere (trace)`,surfaceTempK:440,maxWindMs:0,escapeKms:4.3,surfaceKind:`rocky`,radiation:`extreme`},venus:{diameterKm:12104,diameterRatioEarth:.95,surfaceGravityG:.91,atmoBar:92,atmoComposition:`CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck`,surfaceTempK:737,maxWindMs:1,escapeKms:10.4,surfaceKind:`rocky`,radiation:`shielded`},earth:{diameterKm:12742,diameterRatioEarth:1,surfaceGravityG:1,atmoBar:1,atmoComposition:`N₂ 78% · O₂ 21% · Ar 0.9%`,surfaceTempK:288,maxWindMs:50,escapeKms:11.2,surfaceKind:`rocky-liquid`,radiation:`shielded`},moon:{diameterKm:3474,diameterRatioEarth:.273,surfaceGravityG:.165,atmoBar:0,atmoComposition:`He · Ar · Na exosphere (trace)`,surfaceTempK:250,maxWindMs:0,escapeKms:2.38,surfaceKind:`rocky`,radiation:`high`},mars:{diameterKm:6779,diameterRatioEarth:.53,surfaceGravityG:.38,atmoBar:.006,atmoComposition:`CO₂ 95% · N₂ 2.8% · Ar 2%`,surfaceTempK:210,maxWindMs:30,escapeKms:5,surfaceKind:`rocky`,radiation:`high`},jupiter:{diameterKm:139820,diameterRatioEarth:10.97,surfaceGravityG:2.53,atmoBar:1,atmoComposition:`H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds`,surfaceTempK:165,maxWindMs:100,escapeKms:59.5,surfaceKind:`gas-giant`,radiation:`extreme`},saturn:{diameterKm:116460,diameterRatioEarth:9.14,surfaceGravityG:1.07,atmoBar:1,atmoComposition:`H₂ 96% · He 3% · CH₄/NH₃ clouds`,surfaceTempK:134,maxWindMs:500,escapeKms:35.5,surfaceKind:`gas-giant`,radiation:`high`},uranus:{diameterKm:50724,diameterRatioEarth:3.98,surfaceGravityG:.89,atmoBar:1,atmoComposition:`H₂ 83% · He 15% · CH₄ 2.3%`,surfaceTempK:76,maxWindMs:250,escapeKms:21.3,surfaceKind:`ice-giant`,radiation:`moderate`},neptune:{diameterKm:49244,diameterRatioEarth:3.86,surfaceGravityG:1.14,atmoBar:1,atmoComposition:`H₂ 80% · He 19% · CH₄ 1.5%`,surfaceTempK:72,maxWindMs:580,escapeKms:23.5,surfaceKind:`ice-giant`,radiation:`moderate`},pluto:{diameterKm:2376,diameterRatioEarth:.19,surfaceGravityG:.06,atmoBar:1e-6,atmoComposition:`N₂ + CH₄ + CO (~10 μbar, sublimates)`,surfaceTempK:44,maxWindMs:0,escapeKms:1.2,surfaceKind:`rocky-ice`,radiation:`shielded`}},Dt=8.317,Ot=299792.458*60;function kt(e,t=1){return{fromSunMin:e*Dt,fromEarthMin:Math.abs(e-t)*Dt}}function At(e,t){return{fromSunMin:e*Dt,fromEarthMin:t/Ot}}var jt={earth:{rotationHours:23.93,lightTime:kt(1)},moon:{rotationHours:655.7,lightTime:At(1,384400)},mars:{rotationHours:24.62,lightTime:kt(1.524)}},Mt={mars:{core:`#fff1e6`,bright:`#ff9a4d`,mid:`#ff6a2e`,deep:`#c8371a`,glowRGB:`255,122,60`},earth:{core:`#ecffff`,bright:`#7fe0ff`,mid:`#3aa0ff`,deep:`#2b6cff`,glowRGB:`90,190,255`},moon:{core:`#ffffff`,bright:`#e6ebf5`,mid:`#c1c6d4`,deep:`#9298aa`,glowRGB:`205,213,233`}},Nt=n(`<span class="wave-hint svelte-njfz5t"> </span>`),Pt=n(`<div role="button" tabindex="0"><canvas class="wave-canvas svelte-njfz5t"></canvas> <div class="wave-caption svelte-njfz5t"><span class="wave-cue svelte-njfz5t" aria-hidden="true"><!></span> <!></div></div>`);function Ft(n,a){u(a,!0);let d={earth:{amp:1,rolloff:.15,noise:.2,caption:()=>_e(),src:`audio/atmosphere/earth-wind.mp3`},mars:{amp:.55,rolloff:.78,noise:.14,caption:()=>je(),src:`audio/atmosphere/mars-wind.mp3`},moon:{amp:0,rolloff:1,noise:0,caption:()=>Oe(),src:null}},p=C(()=>d[a.bodyKey]??null),T=m(null),E=m(!1),O=m(!1),k=()=>{};y(()=>{if(!c(T)||!c(p))return;let e=c(T),t=e.getContext(`2d`);if(!t)return;let n=c(p),r=Mt[a.bodyKey]??Mt.earth,i=typeof window<`u`&&window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches,o=e=>`rgba(${r.glowRGB},${e})`,s=e=>Math.sin(Math.PI*Math.min(1,Math.max(0,e)))**.55,l=null,u=null,d=null,f=null,m=null,h=()=>{try{m?.stop()}catch{}m=null,x(E,!1)};k=async()=>{if(n.src){if(c(E))return h();try{if(l||(l=new AudioContext,u=l.createAnalyser(),u.fftSize=128,u.smoothingTimeConstant=.75,u.connect(l.destination),d=new Uint8Array(u.frequencyBinCount)),await l.resume(),!f){x(O,!0);let e=await fetch(`${D}/${n.src}`);f=await l.decodeAudioData(await e.arrayBuffer()),x(O,!1)}m=l.createBufferSource(),m.buffer=f,m.connect(u),m.onended=()=>{x(E,!1),m=null},m.start(),x(E,!0)}catch{x(O,!1),x(E,!1)}}};let g=()=>{let t=e.clientWidth||300,n=e.clientHeight||74;return{w:t,h:n,mid:n/2,maxA:n/2*.9}},_=()=>{let n=window.devicePixelRatio||1,{w:r,h:i}=g();e.width=Math.round(r*n),e.height=Math.round(i*n),t.setTransform(n,0,0,n,0,0)};_();let v=new ResizeObserver(_);v.observe(e);let y=(e,t,n,r,i)=>{if(c(E)&&d&&d.length){let t=Math.min(d.length-1,Math.floor(e*d.length));return .12+.95*(d[t]/255)}return .55+.45*Math.sin(t*r+e*n*Math.PI*2+i)*Math.sin(t*.7+e*3)},b=()=>{let{w:e,h:n,mid:i}=g();t.clearRect(0,0,e,n),t.save(),t.shadowColor=o(.8),t.shadowBlur=8,t.strokeStyle=r.core,t.globalAlpha=.85,t.lineWidth=1.4,t.beginPath(),t.moveTo(3,i),t.lineTo(e-3,i),t.stroke(),t.restore()},S=e=>{let{w:i,h:a,mid:l,maxA:f}=g();t.clearRect(0,0,i,a),c(E)&&u&&d&&u.getByteFrequencyData(d);let p=[{hue:r.deep,a:.22,sc:1,fx:2.1,sp:1.1,ph:0},{hue:r.mid,a:.28,sc:.78,fx:3.3,sp:1.7,ph:1.7},{hue:r.bright,a:.34,sc:.55,fx:4.9,sp:2.3,ph:3.1}];t.save(),t.globalCompositeOperation=`lighter`;for(let r of p){let a=[];for(let t=0;t<=i;t+=3){let o=t/i,c=f*r.sc*n.amp*s(o)*Math.max(0,y(o,e,r.fx,r.sp,r.ph));a.push([t,l-c])}t.beginPath(),a.forEach(([e,n],r)=>r===0?t.moveTo(e,n):t.lineTo(e,n));for(let e=a.length-1;e>=0;e--)t.lineTo(a[e][0],l+(l-a[e][1]));t.closePath(),t.fillStyle=r.hue,t.globalAlpha=r.a,t.fill()}t.restore(),t.save(),t.shadowColor=o(.9),t.shadowBlur=8,t.strokeStyle=r.core,t.lineWidth=1.2,t.globalAlpha=.9,t.beginPath();for(let r=0;r<=i;r+=3){let a=r/i,o=c(E)?y(a,e,0,0,0):.6+.4*Math.sin(e*2.2+a*9),u=.5*f*n.amp*s(a)*o;r===0?t.moveTo(r,l-u):t.lineTo(r,l-u)}t.stroke(),t.restore()},C=e=>n.amp===0?b():S(e),w=0,A=!1;if(i&&!c(E)){C(.9);let e=()=>{A||(c(E)&&C(performance.now()/1e3),w=requestAnimationFrame(e))};w=requestAnimationFrame(e)}else{let e=performance.now(),t=()=>{A||(C((performance.now()-e)/1e3),w=requestAnimationFrame(t))};w=requestAnimationFrame(t)}return()=>{A=!0,cancelAnimationFrame(w),v.disconnect(),h(),l?.close().catch(()=>{})}});var A=t(),j=_(A),M=t=>{var n=Pt();let a;var u=S(n);g(u,e=>x(T,e),()=>c(T));var d=b(u,2),m=S(d),h=S(m),_=e=>{o(e,s(`◎`))},y=e=>{o(e,s(`···`))},C=e=>{o(e,s(`⏸`))},D=e=>{o(e,s(`▶`))};r(h,e=>{c(p).src?c(O)?e(y,1):c(E)?e(C,2):e(D,-1):e(_)}),w(m);var A=b(m),j=b(A),M=e=>{var t=Nt(),n=S(t);w(t),l(e=>i(n,`· ${e??``}`),[()=>c(E)?Se():he()]),o(e,t)};r(j,e=>{c(p).src&&e(M)}),w(d),w(n),l((e,t)=>{a=f(n,1,`wave-tile svelte-njfz5t`,null,a,{silent:!c(p).src}),v(n,`aria-label`,e),i(A,` ${t??``} `)},[()=>c(p).src?Ae():De(),()=>c(p).caption()]),e(`click`,n,()=>k()),e(`keydown`,n,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),k())}),o(t,n)};r(j,e=>{c(p)&&e(M)}),o(n,A),h()}E([`click`,`keydown`]);var It=n(`<div class="tiles svelte-157rl9q" aria-hidden="true"><canvas class="tiles-canvas svelte-157rl9q"></canvas></div>`);function Lt(e,n){u(n,!0);let i=d(n,`rotationHours`,3,null),a=m(null);y(()=>{if(!c(a)||!n.stats)return;let e=c(a),t=e.getContext(`2d`);if(!t)return;let r=n.stats,o=Mt[n.bodyKey]??Mt.earth,s=typeof window<`u`&&window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches,l=e=>`rgba(${o.glowRGB},${e})`,u=i()==null?null:Math.min(45,Math.max(3.5,Math.abs(i())/4)),d=i()==null?`—`:Math.abs(i())<48?`${Math.abs(i()).toFixed(1)} h`:`${(Math.abs(i())/24).toFixed(1)} d`,f=Math.min(.92,Math.max(.18,.34/Math.max(.05,r.surfaceGravityG))),p=Math.min(1,Math.max(0,(r.surfaceTempK-90)/230)),m=r.atmoBar<=0?0:Math.min(1,Math.max(0,(Math.log10(r.atmoBar)+3)/3)),h=r.atmoBar===0?Me():r.atmoBar<.01?`${(r.atmoBar*1e3).toFixed(0)} mbar`:r.atmoBar<10?`${r.atmoBar.toFixed(1)} bar`:`${r.atmoBar.toFixed(0)} bar`,g=()=>{let n=window.devicePixelRatio||1,r=e.clientWidth||300,i=e.clientHeight||58;e.width=Math.round(r*n),e.height=Math.round(i*n),t.setTransform(n,0,0,n,0,0)};g();let _=new ResizeObserver(g);_.observe(e);let v=(e,n,r,i,a=7)=>{t.fillStyle=i,t.font=`${a}px "Space Mono", monospace`,t.textAlign=`center`,t.fillText(e,n,r)},y=(e,n,r,i)=>{let a=e+n/2,s=r*.46,c=Math.min(n,r)*.26;v(`SPIN`,a,9,l(.65),6),t.strokeStyle=l(.35),t.lineWidth=1,t.beginPath(),t.arc(a,s,c,0,Math.PI*2),t.stroke(),t.strokeStyle=l(.5),t.beginPath(),t.moveTo(a,s-c),t.lineTo(a,s-c+3),t.stroke();let f=-Math.PI/2+(u?i/u*Math.PI*2:0);t.save(),t.shadowColor=l(.9),t.shadowBlur=5,t.strokeStyle=o.bright,t.lineWidth=1.4,t.beginPath(),t.moveTo(a,s),t.lineTo(a+Math.cos(f)*c*.82,s+Math.sin(f)*c*.82),t.stroke(),t.restore(),t.fillStyle=o.core,t.beginPath(),t.arc(a,s,1.6,0,Math.PI*2),t.fill(),v(d,a,r-3,`rgba(255,255,255,0.7)`,7)},b=(e,n,i,a)=>{let s=e+n/2,c=i*.78;v(`GRAV`,s,9,l(.65),6),t.strokeStyle=l(.25),t.lineWidth=1,t.beginPath(),t.moveTo(s-n*.28,c),t.lineTo(s+n*.28,c),t.stroke();let u=2.2,d=a%u/u,p=c-4*d*(1-d)*f*(c-15);t.save(),t.shadowColor=l(.9),t.shadowBlur=6,t.fillStyle=o.bright,t.beginPath(),t.arc(s,p,2.6,0,Math.PI*2),t.fill(),t.restore(),v(`${r.surfaceGravityG.toFixed(2)} g`,s,i-3,`rgba(255,255,255,0.7)`,7)},x=(e,n,i)=>{let a=e+n/2,s=e+n*.16,c=n*.68;v(`AIR`,a,9,l(.65),6);let u=i*.36,d=t.createLinearGradient(s,0,s+c,0);d.addColorStop(0,`rgba(90,150,255,0.85)`),d.addColorStop(.5,`rgba(220,220,220,0.7)`),d.addColorStop(1,`rgba(255,110,60,0.9)`),t.fillStyle=d,t.fillRect(s,u,c,4);let f=s+p*c;t.fillStyle=o.core,t.beginPath(),t.moveTo(f,u-3),t.lineTo(f-2.5,u-.5),t.lineTo(f+2.5,u-.5),t.closePath(),t.fill();let g=i*.56;t.strokeStyle=l(.25),t.lineWidth=3,t.beginPath(),t.moveTo(s,g),t.lineTo(s+c,g),t.stroke(),t.strokeStyle=o.bright,t.beginPath(),t.moveTo(s,g),t.lineTo(s+Math.max(2,m*c),g),t.stroke(),v(`${r.surfaceTempK} K · ${h}`,a,i-3,`rgba(255,255,255,0.7)`,7)},S=n=>{let r=e.clientWidth||300,i=e.clientHeight||58;t.clearRect(0,0,r,i);let a=r/3;t.strokeStyle=`rgba(255,255,255,0.08)`,t.lineWidth=1;for(let e of[a,a*2])t.beginPath(),t.moveTo(e,6),t.lineTo(e,i-12),t.stroke();y(0,a,i,n),b(a,a,i,n),x(a*2,a,i)},C=0,w=!1;if(s)S(.55);else{let e=performance.now(),t=()=>{w||(S((performance.now()-e)/1e3),C=requestAnimationFrame(t))};C=requestAnimationFrame(t)}return()=>{w=!0,cancelAnimationFrame(C),_.disconnect()}});var s=t(),l=_(s),f=e=>{var t=It();g(S(t),e=>x(a,e),()=>c(a)),w(t),o(e,t)};r(l,e=>{n.stats&&e(f)}),o(e,s),h()}var Rt=n(`<div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> <!></span></div>`),zt=n(`<div><div class="scan-eyebrow svelte-1k90nq4" aria-hidden="true"> </div> <!> <div class="scan-decor" aria-hidden="true"><!> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value scan-value-wrap svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <!></div></div>`);function Bt(e,n){u(n,!0);let a=d(n,`rotationHours`,3,null),p=d(n,`lightTime`,3,null),g=d(n,`focusGate`,3,!0),v=d(n,`placement`,3,`bottom-center`),T=d(n,`inline`,3,!1),E=m(!1);y(()=>{let e=Xe(`planet-stats`,e=>{x(E,e,!0)});return()=>e?.()});var D=t(),k=_(D),N=e=>{var t=zt();let u;var d=S(t),m=S(d,!0);w(d);var h=b(d,2);{let e=C(()=>n.bodyLabel.toLowerCase());Ft(h,{get bodyKey(){return c(e)}})}var g=b(h,2),_=S(g);{let e=C(()=>n.bodyLabel.toLowerCase());Lt(_,{get bodyKey(){return c(e)},get stats(){return n.stats},get rotationHours(){return a()}})}var y=b(_,2),x=S(y),E=S(x,!0);w(x);var D=b(x,2),k=S(D);w(D),w(y);var N=b(y,2),P=S(N),ne=S(P,!0);w(P);var de=b(P,2),fe=S(de,!0);w(de),w(N);var F=b(N,2),pe=S(F),he=S(pe,!0);w(pe);var _e=b(pe,2),Se=S(_e,!0);w(_e),w(F);var De=b(F,2),Oe=S(De),Ae=S(Oe,!0);w(Oe);var je=b(Oe,2),Me=S(je,!0);w(je),w(De);var Re=b(De,2),ze=S(Re),Be=S(ze,!0);w(ze);var I=b(ze,2),Ve=S(I,!0);w(I),w(Re);var L=b(Re,2),R=S(L),He=S(R,!0);w(R);var Ue=b(R,2),We=S(Ue),Ge=e=>{var t=s();l((e,n)=>i(t,`${e??``}
            ${n??``}`),[()=>Math.abs(a())<48?`${Math.abs(a()).toFixed(2)} h`:`${(Math.abs(a())/24).toFixed(1)} d`,()=>a()<0?`· ${ke()}`:``]),o(e,t)};r(We,e=>{a()!==null&&e(Ge)}),w(Ue),w(L);var z=b(L,2),B=S(z),Ke=S(B,!0);w(B);var qe=b(B,2),V=S(qe);w(qe),w(z);var H=b(z,2),U=S(H),Je=S(U,!0);w(U);var Ye=b(U,2),Xe=S(Ye);w(Ye),w(H);var Ze=b(H,2),Qe=S(Ze),$e=S(Qe,!0);w(Qe);var et=b(Qe,2),tt=S(et),W=e=>{var t=s();l(e=>i(t,e),[()=>A()]),o(e,t)},nt=e=>{var t=s();l(e=>i(t,e),[()=>le()]),o(e,t)},rt=e=>{var t=s();l(e=>i(t,e),[()=>Ie()]),o(e,t)},it=e=>{var t=s();l(e=>i(t,e),[()=>ge()]),o(e,t)},at=e=>{var t=s();l(e=>i(t,e),[()=>Le()]),o(e,t)};r(tt,e=>{n.stats.surfaceKind===`rocky`?e(W):n.stats.surfaceKind===`rocky-liquid`?e(nt,1):n.stats.surfaceKind===`rocky-ice`?e(rt,2):n.stats.surfaceKind===`gas-giant`?e(it,3):e(at,-1)}),w(et),w(Ze);var G=b(Ze,2),K=S(G),q=S(K,!0);w(K);var J=b(K,2),ot=S(J),st=e=>{var t=s();l(e=>i(t,e),[()=>Pe()]),o(e,t)},Y=e=>{var t=s();l(e=>i(t,e),[()=>me()]),o(e,t)},ct=e=>{var t=s();l(e=>i(t,e),[()=>be()]),o(e,t)},lt=e=>{var t=s();l(e=>i(t,e),[()=>xe()]),o(e,t)};r(ot,e=>{n.stats.radiation===`shielded`?e(st):n.stats.radiation===`moderate`?e(Y,1):n.stats.radiation===`high`?e(ct,2):e(lt,-1)}),w(J),w(G);var X=b(G,2),Z=e=>{var t=Rt(),n=S(t),a=S(n,!0);w(n);var c=b(n,2),u=S(c),d=b(u),f=e=>{var t=s();l(e=>i(t,`· ${e??``}`),[()=>p().fromEarthMin<60?Ne({value:p().fromEarthMin.toFixed(1)}):Te({value:(p().fromEarthMin/60).toFixed(2)})]),o(e,t)};r(d,e=>{p().fromEarthMin!==null&&p().fromEarthMin>0&&e(f)}),w(c),w(t),l((e,t)=>{i(a,e),i(u,`${t??``} `)},[()=>j(),()=>p().fromSunMin<60?ye({value:p().fromSunMin.toFixed(1)}):ve({value:(p().fromSunMin/60).toFixed(2)})]),o(e,t)};r(X,e=>{p()&&e(Z)}),w(g),w(t),l((e,r,a,o,s,c,l,d,p,h,g,_,y,b,x,S,C)=>{u=f(t,1,`tactical-scan svelte-1k90nq4`,null,u,{"above-altitude":v()===`above-altitude`&&!T(),inline:T()}),i(m,e),i(E,r),i(k,`${a??``} g`),i(ne,o),i(fe,s),i(he,c),i(Se,n.stats.atmoComposition),i(Ae,l),i(Me,d),i(Be,p),i(Ve,h),i(He,g),i(Ke,_),i(V,`${y??``} km`),i(Je,b),i(Xe,`${x??``} km/s`),i($e,S),i(q,C)},[()=>ce({planet:n.bodyLabel}),()=>re(),()=>n.stats.surfaceGravityG.toFixed(2),()=>te(),()=>n.stats.atmoBar===0?M():n.stats.atmoBar<.01?`${(n.stats.atmoBar*1e3).toFixed(2)} mbar`:n.stats.atmoBar<10?`${n.stats.atmoBar.toFixed(2)} bar`:`${n.stats.atmoBar.toFixed(0)} bar`,()=>ee(),()=>se(),()=>Ee({k:n.stats.surfaceTempK.toString(),c:(n.stats.surfaceTempK-273).toFixed(0)}),()=>ae(),()=>n.stats.maxWindMs===0?ue():Fe({ms:n.stats.maxWindMs.toString()}),()=>ie(),()=>Ce(),()=>n.stats.diameterKm.toLocaleString(),()=>O(),()=>n.stats.escapeKms.toFixed(1),()=>we(),()=>oe()]),o(e,t)};r(k,e=>{n.stats&&(T()||c(E)&&g())&&e(N)}),o(e,D),h()}var Vt=n(`<button type="button" class="enter-sky svelte-y5xq5p" aria-label="Point your phone at the sky to find the Sun, Moon and planets">SKY</button>`);function Ht(n,i){u(i,!0);let a=m(`hidden`);y(async()=>{x(a,$e(await Ze(),Qe()),!0)});var s=t(),l=_(s),d=t=>{var n=Vt();e(`click`,n,function(...e){i.onEnter?.apply(this,e)}),o(t,n)};r(l,e=>{c(a)===`enabled`&&e(d)}),o(n,s),h()}E([`click`]);var Ut=n(`<div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div>`),Wt=n(`<p class="editorial svelte-1je9b37"> </p>`),Gt=n(`<div class="story svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <p class="story-text svelte-1je9b37"> </p></div>`),Kt=n(`<button type="button" class="resident-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></button>`),qt=n(`<span class="resident-label"> </span>`),Jt=n(`<li class="svelte-1je9b37"><span class="agency-dot svelte-1je9b37" aria-hidden="true"></span> <!></li>`),Yt=n(`<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="residents svelte-1je9b37"></ul></div>`),Xt=n(`<a class="firsts-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></a>`),Zt=n(`<span class="firsts-label"> </span>`),Qt=n(`<li class="svelte-1je9b37"><span class="firsts-year svelte-1je9b37"> </span> <!></li>`),$t=n(`<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="firsts svelte-1je9b37"></ul></div>`),en=n(`<div class="science-block svelte-1je9b37"><h3 class="library-heading svelte-1je9b37"> </h3> <!></div>`),tn=n(`<div class="head svelte-1je9b37"><div class="kind-row svelte-1je9b37"><span class="kind svelte-1je9b37"> </span></div> <div class="name svelte-1je9b37"> </div> <div class="stat-row svelte-1je9b37"><div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div> <!></div></div> <!> <!> <!> <!> <!>`,1);function nn(n,s){u(s,!0);let f=d(s,`selectableIds`,19,()=>new Set);function m(e){if(typeof e==`number`)return e>=1e3?`${e.toLocaleString(`en-US`)} km`:`${e} km`;let t=e=>e.toLocaleString(`en-US`);return`${t(e[0])} - ${t(e[1])} km`}function g(e){let t=e=>e>=1e3?e.toLocaleString(`en-US`):e.toString();return typeof e==`number`?`${t(e)} AU`:`${t(e[0])} - ${t(e[1])} AU`}function y(e){return e.altitude_km==null?e.distance_au==null?``:g(e.distance_au):m(e.altitude_km)}function x(e){switch(e){case`NASA`:case`SpaceX`:return`#3b82f6`;case`ROSCOSMOS`:return`#ef4444`;case`CNSA`:return`#dc2626`;case`ISRO`:return`#f97316`;case`JAXA`:return`#1d4ed8`;case`ESA`:case`Arianespace`:return`#1d4ed8`;case`UAESA`:return`#00732F`;default:return`rgba(255,255,255,0.5)`}}{let u=C(()=>s.regime?.name??``);Ye(n,{get open(){return s.open},get onClose(){return s.onClose},get title(){return c(u)},zIndex:28,children:(n,u)=>{var d=t(),m=_(d),h=t=>{var n=tn(),u=_(n);let d;var m=S(u),h=S(m),g=S(h,!0);w(h),w(m);var E=b(m,2),O=S(E,!0);w(E);var A=b(E,2),j=S(A),M=S(j),ee=S(M,!0);w(M);var N=b(M,2),te=S(N,!0);w(N),w(j);var ne=b(j,2),re=e=>{var t=Ut(),n=S(t),r=S(n,!0);w(n);var a=b(n,2),c=S(a,!0);w(a),w(t),l(e=>{i(r,e),i(c,s.regime.firsts[0].year)},[()=>k()]),o(e,t)};r(ne,e=>{s.regime.firsts&&s.regime.firsts.length>0&&e(re)}),w(A),w(u);var ie=b(u,2),ae=e=>{var t=Wt(),n=S(t,!0);w(t),l(()=>i(n,s.regime.comparison)),o(e,t)};r(ie,e=>{s.regime.comparison&&e(ae)});var oe=b(ie,2),se=e=>{var t=Gt(),n=S(t),r=S(n,!0);w(n);var a=b(n,2),c=S(a,!0);w(a),w(t),l(e=>{i(r,e),i(c,s.regime.story)},[()=>P()]),o(e,t)};r(oe,e=>{s.regime.story&&e(se)});var ce=b(oe,2),le=t=>{var n=Yt(),u=S(n),d=S(u,!0);w(u);var m=b(u,2);a(m,21,()=>s.regime.residents,e=>e.id,(t,n)=>{let a=C(()=>f().has(c(n).id)&&s.onResidentClick!=null);var u=Jt(),d=S(u);let m;var h=b(d,2),g=t=>{var r=Kt(),a=S(r);p(),w(r),l(()=>i(a,`${c(n).label??``} `)),e(`click`,r,()=>s.onResidentClick?.(c(n).id)),o(t,r)},_=e=>{var t=qt(),r=S(t,!0);w(t),l(()=>i(r,c(n).label)),o(e,t)};r(h,e=>{c(a)?e(g):e(_,-1)}),w(u),l(e=>m=T(d,``,m,e),[()=>({background:x(c(n).agency)})]),o(t,u)}),w(m),w(n),l(e=>i(d,e),[()=>fe()]),o(t,n)};r(ce,e=>{s.regime.residents&&s.regime.residents.length>0&&e(le)});var ue=b(ce,2),F=e=>{var t=$t(),n=S(t),c=S(n,!0);w(n);var u=b(n,2);a(u,20,()=>s.regime.firsts,e=>e,(e,t)=>{var n=Qt(),a=S(n),s=S(a,!0);w(a);var c=b(a,2),u=e=>{var n=Xt(),r=S(n);p(),w(n),l(()=>{v(n,`href`,`${D??``}/missions?id=${t.mission_id??``}`),i(r,`${t.label??``} `)}),o(e,n)},d=e=>{var n=Zt(),r=S(n,!0);w(n),l(()=>i(r,t.label)),o(e,n)};r(c,e=>{t.mission_id?e(u):e(d,-1)}),w(n),l(()=>i(s,t.year)),o(e,n)}),w(u),w(t),l(e=>i(c,e),[()=>Re()]),o(e,t)};r(ue,e=>{s.regime.firsts&&s.regime.firsts.length>0&&e(F)});var me=b(ue,2),he=e=>{var t=en(),n=S(t),r=S(n,!0);w(n),et(b(n,2),{get tab(){return s.regime.science_link.tab},get section(){return s.regime.science_link.section}}),w(t),l(e=>i(r,e),[()=>pe()]),o(e,t)};r(me,e=>{s.regime.science_link&&e(he)}),l((e,t)=>{d=T(u,``,d,{"--regime-color":s.regime.color}),i(g,s.regime.short??s.regime.id),i(O,s.regime.name??s.regime.id),i(ee,e),i(te,t)},[()=>de(),()=>y(s.regime)]),o(t,n)};r(m,e=>{s.regime&&e(h)}),o(n,d)},$$slots:{default:!0}})}h()}E([`click`]);export{Dt as a,kt as c,_t as d,ht as f,Mt as i,Tt as l,rt as m,Ht as n,Et as o,mt as p,Bt as r,jt as s,nn as t,yt as u};