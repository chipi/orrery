import{B as e,F as t,I as n,M as r,N as i,O as a,P as o,R as s,U as c,Y as l,_t as u,a as d,b as f,ct as p,gt as m,l as h,nt as g,p as _,r as v,rt as y,st as b,tt as x,ut as S,xt as C,y as w,z as T}from"./zEB-6H-K.js";import{s as E}from"./8ZqPXzNn.js";import"./xihTtKlq.js";import{A as D,B as O,C as k,D as A,E as ee,F as j,I as te,L as ne,M as re,N as ie,O as ae,P as oe,R as se,S as ce,T as le,V as ue,_ as de,a as M,b as fe,c as pe,d as me,f as he,g as ge,h as _e,i as ve,j as ye,k as be,l as xe,m as Se,n as Ce,o as we,p as Te,r as Ee,s as De,t as Oe,u as ke,v as Ae,w as je,x as Me,y as Ne,z as Pe}from"./BBHGD8lv.js";import{A as N,C as P,Dt as Fe,Et as Ie,H as Le,O as Re,Ot as F,P as ze,U as Be,W as Ve,ht as He,jt as Ue,k as I,kt as L,n as R,pt as We,r as z,s as B}from"./Q63TN4Lo.js";import{i as Ge}from"./DKXTjKwD2.js";import{a as Ke,o as qe,s as Je}from"./CiWAQd6w2.js";var V=new B,H=new F,Ye=class extends Re{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new P([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new P([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new I(t,6,1);return this.setAttribute(`instanceStart`,new N(n,3,0)),this.setAttribute(`instanceEnd`,new N(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new I(t,6,1);return this.setAttribute(`instanceColorStart`,new N(n,3,0)),this.setAttribute(`instanceColorEnd`,new N(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Ue(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new B);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),V.setFromBufferAttribute(t),this.boundingBox.union(V))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new He),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)H.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(H)),H.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(H));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}};z.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Fe},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},R.line={uniforms:Ie.merge([z.common,z.fog,z.line]),vertexShader:`
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
		`};var U=class extends We{constructor(e){super({type:`LineMaterial`,uniforms:Ie.clone(R.line.uniforms),vertexShader:R.line.vertexShader,fragmentShader:R.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return`WORLD_UNITS`in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return`USE_DASH`in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return`USE_ALPHA_TO_COVERAGE`in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE=``:delete this.defines.USE_ALPHA_TO_COVERAGE)}},Xe=new L,W=new F,G=new F,K=new L,q=new L,J=new L,Ze=new F,Qe=new Be,Y=new ze,$e=new F,et=new B,X=new He,Z=new L,Q,$;function tt(e,t,n){return Z.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),Z.multiplyScalar(1/Z.w),Z.x=$/n.width,Z.y=$/n.height,Z.applyMatrix4(e.projectionMatrixInverse),Z.multiplyScalar(1/Z.w),Math.abs(Math.max(Z.x,Z.y))}function nt(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,a=r.attributes.instanceEnd,o=Math.min(r.instanceCount,i.count);for(let r=0,s=o;r<s;r++){Y.start.fromBufferAttribute(i,r),Y.end.fromBufferAttribute(a,r),Y.applyMatrix4(n);let o=new F,s=new F;Q.distanceSqToSegment(Y.start,Y.end,s,o),s.distanceTo(o)<$*.5&&t.push({point:s,pointOnLine:o,distance:Q.origin.distanceTo(s),object:e,face:null,faceIndex:r,uv:null,uv1:null})}}function rt(e,t,n){let r=t.projectionMatrix,i=e.material.resolution,a=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,c=o.attributes.instanceEnd,l=Math.min(o.instanceCount,s.count),u=-t.near;Q.at(1,J),J.w=1,J.applyMatrix4(t.matrixWorldInverse),J.applyMatrix4(r),J.multiplyScalar(1/J.w),J.x*=i.x/2,J.y*=i.y/2,J.z=0,Ze.copy(J),Qe.multiplyMatrices(t.matrixWorldInverse,a);for(let t=0,o=l;t<o;t++){if(K.fromBufferAttribute(s,t),q.fromBufferAttribute(c,t),K.w=1,q.w=1,K.applyMatrix4(Qe),q.applyMatrix4(Qe),K.z>u&&q.z>u)continue;if(K.z>u){let e=K.z-q.z,t=(K.z-u)/e;K.lerp(q,t)}else if(q.z>u){let e=q.z-K.z,t=(q.z-u)/e;q.lerp(K,t)}K.applyMatrix4(r),q.applyMatrix4(r),K.multiplyScalar(1/K.w),q.multiplyScalar(1/q.w),K.x*=i.x/2,K.y*=i.y/2,q.x*=i.x/2,q.y*=i.y/2,Y.start.copy(K),Y.start.z=0,Y.end.copy(q),Y.end.z=0;let o=Y.closestPointToPointParameter(Ze,!0);Y.at(o,$e);let l=Le.lerp(K.z,q.z,o),d=l>=-1&&l<=1,f=Ze.distanceTo($e)<$*.5;if(d&&f){Y.start.fromBufferAttribute(s,t),Y.end.fromBufferAttribute(c,t),Y.start.applyMatrix4(a),Y.end.applyMatrix4(a);let r=new F,i=new F;Q.distanceSqToSegment(Y.start,Y.end,i,r),n.push({point:i,pointOnLine:r,distance:Q.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}var it=class extends Ve{constructor(e=new Ye,t=new U({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)W.fromBufferAttribute(t,e),G.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+W.distanceTo(G);let i=new I(r,2,1);return e.setAttribute(`instanceDistanceStart`,new N(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new N(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;if(r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;Q=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;$=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),X.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?$*.5:tt(r,Math.max(r.near,X.distanceToPoint(Q.origin)),s.resolution),X.radius+=c,Q.intersectsSphere(X)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),et.copy(o.boundingBox).applyMatrix4(a);let l;l=n?$*.5:tt(r,Math.max(r.near,et.distanceToPoint(Q.origin)),s.resolution),et.expandByScalar(l),Q.intersectsBox(et)!==!1&&(n?nt(this,t):rt(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(Xe),this.material.uniforms.resolution.value.set(Xe.z,Xe.w))}},at=class extends Ye{constructor(){super(),this.isLineGeometry=!0,this.type=`LineGeometry`}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setColors(n),this}setFromPoints(e){let t=e.length-1,n=new Float32Array(6*t);for(let r=0;r<t;r++)n[6*r]=e[r].x,n[6*r+1]=e[r].y,n[6*r+2]=e[r].z||0,n[6*r+3]=e[r+1].x,n[6*r+4]=e[r+1].y,n[6*r+5]=e[r+1].z||0;return super.setPositions(n),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}},ot=class extends it{constructor(e=new at,t=new U({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type=`Line2`}},st=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function ct(e){for(let t=0;t<st.length-1;t++){let[n,r]=st[t],[i,a]=st[t+1];if(e>=n&&e<=i)return r+(e-n)/(i-n)*(a-r)}return 512}function lt(e){return 8.5+5.2*Math.log10(1+e/200)}function ut(e,t){return e+(lt(t)-lt(0))}var dt=n(`<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>`),ft=n(`<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>`),pt=n(`<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>`),mt=n(`<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>`),ht=n(`<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>`);function gt(t,n){u(n,!0);let s=d(n,`highlightRegime`,3,null),p=d(n,`anchorBottomPx`,3,80);function h(e){return e==null?0:typeof e==`number`?e:(e[0]+e[1])/2}function g(e){return e.altitude_km==null?h(e.distance_au):h(e.altitude_km)}let v=S(()=>n.order?n.order.map(e=>n.regimes.find(t=>t.id===e)).filter(e=>e!=null):[...n.regimes].sort((e,t)=>g(t)-g(e)));function b(e){if(typeof e==`number`)return e>=1e3?`${(e/1e3).toFixed(0)},000 km`:`${e} km`;let[t,n]=e,r=e=>e>=1e3?`${(e/1e3).toFixed(0)}k`:`${e}`;return`${r(t)}-${r(n)} km`}function T(e){let t=e=>e<10?e.toFixed(1):e<1e3?e.toFixed(0):e<1e4?`${(e/1e3).toFixed(1)}k`:`${(e/1e3).toFixed(0)}k`;return typeof e==`number`?`${t(e)} AU`:`${t(e[0])}-${t(e[1])} AU`}function E(e){return e.altitude_km==null?e.distance_au==null?``:T(e.distance_au):b(e.altitude_km)}var D=ht();let k;var A=x(D),ee=x(A,!0);C(A);var j=y(A,2),te=x(j);a(te,17,()=>c(v),e=>e.id,(t,a)=>{var u=pt(),d=x(u);let p,m;var h=x(d),g=e=>{o(e,dt())},v=e=>{o(e,ft())};r(h,e=>{c(a).id===s()?e(g):e(v,-1)});var b=y(h,2),S=x(b,!0);C(b);var T=y(b,2),D=x(T,!0);C(T),C(d),C(u),l(e=>{p=f(d,1,`band svelte-1v3z2gg`,null,p,{"band--highlighted":c(a).id===s()}),_(d,`aria-current`,c(a).id===s()?`true`:void 0),m=w(d,``,m,{"--regime-color":c(a).color}),i(S,c(a).short??c(a).id),i(D,e)},[()=>E(c(a))]),e(`click`,d,()=>n.onSelect(c(a).id)),o(t,u)});var ne=y(te,2),re=e=>{let t=S(()=>n.surfaceAnchor??{label:Pe(),value:`0 km`});var r=mt(),a=y(x(r),2),s=x(a,!0);C(a);var u=y(a,2),d=x(u,!0);C(u),C(r),l(()=>{i(s,c(t).label),i(d,c(t).value)}),o(e,r)};r(ne,e=>{n.surfaceAnchor!==null&&e(re)}),C(j),C(D),l((e,t)=>{_(D,`aria-label`,e),k=w(D,``,k,{"--ruler-bottom":`${p()??``}px`}),i(ee,t)},[()=>O(),()=>ue()]),o(t,D),m()}T([`click`]);var _t={mercury:{diameterKm:4880,diameterRatioEarth:.38,surfaceGravityG:.38,atmoBar:0,atmoComposition:`Na · K · O · H exosphere (trace)`,surfaceTempK:440,maxWindMs:0,escapeKms:4.3,surfaceKind:`rocky`,radiation:`extreme`},venus:{diameterKm:12104,diameterRatioEarth:.95,surfaceGravityG:.91,atmoBar:92,atmoComposition:`CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck`,surfaceTempK:737,maxWindMs:1,escapeKms:10.4,surfaceKind:`rocky`,radiation:`shielded`},earth:{diameterKm:12742,diameterRatioEarth:1,surfaceGravityG:1,atmoBar:1,atmoComposition:`N₂ 78% · O₂ 21% · Ar 0.9%`,surfaceTempK:288,maxWindMs:50,escapeKms:11.2,surfaceKind:`rocky-liquid`,radiation:`shielded`},moon:{diameterKm:3474,diameterRatioEarth:.273,surfaceGravityG:.165,atmoBar:0,atmoComposition:`He · Ar · Na exosphere (trace)`,surfaceTempK:250,maxWindMs:0,escapeKms:2.38,surfaceKind:`rocky`,radiation:`high`},mars:{diameterKm:6779,diameterRatioEarth:.53,surfaceGravityG:.38,atmoBar:.006,atmoComposition:`CO₂ 95% · N₂ 2.8% · Ar 2%`,surfaceTempK:210,maxWindMs:30,escapeKms:5,surfaceKind:`rocky`,radiation:`high`},jupiter:{diameterKm:139820,diameterRatioEarth:10.97,surfaceGravityG:2.53,atmoBar:1,atmoComposition:`H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds`,surfaceTempK:165,maxWindMs:100,escapeKms:59.5,surfaceKind:`gas-giant`,radiation:`extreme`},saturn:{diameterKm:116460,diameterRatioEarth:9.14,surfaceGravityG:1.07,atmoBar:1,atmoComposition:`H₂ 96% · He 3% · CH₄/NH₃ clouds`,surfaceTempK:134,maxWindMs:500,escapeKms:35.5,surfaceKind:`gas-giant`,radiation:`high`},uranus:{diameterKm:50724,diameterRatioEarth:3.98,surfaceGravityG:.89,atmoBar:1,atmoComposition:`H₂ 83% · He 15% · CH₄ 2.3%`,surfaceTempK:76,maxWindMs:250,escapeKms:21.3,surfaceKind:`ice-giant`,radiation:`moderate`},neptune:{diameterKm:49244,diameterRatioEarth:3.86,surfaceGravityG:1.14,atmoBar:1,atmoComposition:`H₂ 80% · He 19% · CH₄ 1.5%`,surfaceTempK:72,maxWindMs:580,escapeKms:23.5,surfaceKind:`ice-giant`,radiation:`moderate`},pluto:{diameterKm:2376,diameterRatioEarth:.19,surfaceGravityG:.06,atmoBar:1e-6,atmoComposition:`N₂ + CH₄ + CO (~10 μbar, sublimates)`,surfaceTempK:44,maxWindMs:0,escapeKms:1.2,surfaceKind:`rocky-ice`,radiation:`shielded`}},vt=8.317,yt=299792.458*60;function bt(e,t=1){return{fromSunMin:e*vt,fromEarthMin:Math.abs(e-t)*vt}}function xt(e,t){return{fromSunMin:e*vt,fromEarthMin:t/yt}}var St={earth:{rotationHours:23.93,lightTime:bt(1)},moon:{rotationHours:655.7,lightTime:xt(1,384400)},mars:{rotationHours:24.62,lightTime:bt(1.524)},venus:{rotationHours:5832.5,lightTime:bt(.723)}},Ct={mars:{core:`#fff1e6`,bright:`#ff9a4d`,mid:`#ff6a2e`,deep:`#c8371a`,glowRGB:`255,122,60`},earth:{core:`#ecffff`,bright:`#7fe0ff`,mid:`#3aa0ff`,deep:`#2b6cff`,glowRGB:`90,190,255`},moon:{core:`#ffffff`,bright:`#e6ebf5`,mid:`#c1c6d4`,deep:`#9298aa`,glowRGB:`205,213,233`}},wt=n(`<span class="wave-hint svelte-njfz5t"> </span>`),Tt=n(`<div role="button" tabindex="0"><canvas class="wave-canvas svelte-njfz5t"></canvas> <div class="wave-caption svelte-njfz5t"><span class="wave-cue svelte-njfz5t" aria-hidden="true"><!></span> <!></div></div>`);function Et(n,a){u(a,!0);let d={earth:{amp:1,rolloff:.15,noise:.2,caption:()=>pe(),src:`audio/atmosphere/earth-wind.mp3`},mars:{amp:.55,rolloff:.78,noise:.14,caption:()=>De(),src:`audio/atmosphere/mars-wind.mp3`},moon:{amp:0,rolloff:1,noise:0,caption:()=>we(),src:null}},w=S(()=>d[a.bodyKey]??null),T=p(null),D=p(!1),O=p(!1),k=()=>{};v(()=>{if(!c(T)||!c(w))return;let e=c(T),t=e.getContext(`2d`);if(!t)return;let n=c(w),r=Ct[a.bodyKey]??Ct.earth,i=typeof window<`u`&&window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches,o=e=>`rgba(${r.glowRGB},${e})`,s=e=>Math.sin(Math.PI*Math.min(1,Math.max(0,e)))**.55,l=null,u=null,d=null,f=null,p=null,m=()=>{try{p?.stop()}catch{}p=null,b(D,!1)};k=async()=>{if(n.src){if(c(D))return m();try{if(l||(l=new AudioContext,u=l.createAnalyser(),u.fftSize=128,u.smoothingTimeConstant=.75,u.connect(l.destination),d=new Uint8Array(u.frequencyBinCount)),await l.resume(),!f){b(O,!0);let e=await fetch(`${E}/${n.src}`);f=await l.decodeAudioData(await e.arrayBuffer()),b(O,!1)}p=l.createBufferSource(),p.buffer=f,p.connect(u),p.onended=()=>{b(D,!1),p=null},p.start(),b(D,!0)}catch{b(O,!1),b(D,!1)}}};let h=()=>{let t=e.clientWidth||300,n=e.clientHeight||74;return{w:t,h:n,mid:n/2,maxA:n/2*.9}},g=()=>{let n=window.devicePixelRatio||1,{w:r,h:i}=h();e.width=Math.round(r*n),e.height=Math.round(i*n),t.setTransform(n,0,0,n,0,0)};g();let _=new ResizeObserver(g);_.observe(e);let v=(e,t,n,r,i)=>{if(c(D)&&d&&d.length){let t=Math.min(d.length-1,Math.floor(e*d.length));return .12+.95*(d[t]/255)}return .55+.45*Math.sin(t*r+e*n*Math.PI*2+i)*Math.sin(t*.7+e*3)},y=()=>{let{w:e,h:n,mid:i}=h();t.clearRect(0,0,e,n),t.save(),t.shadowColor=o(.8),t.shadowBlur=8,t.strokeStyle=r.core,t.globalAlpha=.85,t.lineWidth=1.4,t.beginPath(),t.moveTo(3,i),t.lineTo(e-3,i),t.stroke(),t.restore()},x=e=>{let{w:i,h:a,mid:l,maxA:f}=h();t.clearRect(0,0,i,a),c(D)&&u&&d&&u.getByteFrequencyData(d);let p=[{hue:r.deep,a:.22,sc:1,fx:2.1,sp:1.1,ph:0},{hue:r.mid,a:.28,sc:.78,fx:3.3,sp:1.7,ph:1.7},{hue:r.bright,a:.34,sc:.55,fx:4.9,sp:2.3,ph:3.1}];t.save(),t.globalCompositeOperation=`lighter`;for(let r of p){let a=[];for(let t=0;t<=i;t+=3){let o=t/i,c=f*r.sc*n.amp*s(o)*Math.max(0,v(o,e,r.fx,r.sp,r.ph));a.push([t,l-c])}t.beginPath(),a.forEach(([e,n],r)=>r===0?t.moveTo(e,n):t.lineTo(e,n));for(let e=a.length-1;e>=0;e--)t.lineTo(a[e][0],l+(l-a[e][1]));t.closePath(),t.fillStyle=r.hue,t.globalAlpha=r.a,t.fill()}t.restore(),t.save(),t.shadowColor=o(.9),t.shadowBlur=8,t.strokeStyle=r.core,t.lineWidth=1.2,t.globalAlpha=.9,t.beginPath();for(let r=0;r<=i;r+=3){let a=r/i,o=c(D)?v(a,e,0,0,0):.6+.4*Math.sin(e*2.2+a*9),u=.5*f*n.amp*s(a)*o;r===0?t.moveTo(r,l-u):t.lineTo(r,l-u)}t.stroke(),t.restore()},S=e=>n.amp===0?y():x(e),C=0,A=!1;if(i&&!c(D)){S(.9);let e=()=>{A||(c(D)&&S(performance.now()/1e3),C=requestAnimationFrame(e))};C=requestAnimationFrame(e)}else{let e=performance.now(),t=()=>{A||(S((performance.now()-e)/1e3),C=requestAnimationFrame(t))};C=requestAnimationFrame(t)}return()=>{A=!0,cancelAnimationFrame(C),_.disconnect(),m(),l?.close().catch(()=>{})}});var A=t(),ee=g(A),j=t=>{var n=Tt();let a;var u=x(n);h(u,e=>b(T,e),()=>c(T));var d=y(u,2),p=x(d),m=x(p),g=e=>{o(e,s(`◎`))},v=e=>{o(e,s(`···`))},S=e=>{o(e,s(`⏸`))},E=e=>{o(e,s(`▶`))};r(m,e=>{c(w).src?c(O)?e(v,1):c(D)?e(S,2):e(E,-1):e(g)}),C(p);var A=y(p),ee=y(A),j=e=>{var t=wt(),n=x(t);C(t),l(e=>i(n,`· ${e??``}`),[()=>c(D)?ve():M()]),o(e,t)};r(ee,e=>{c(w).src&&e(j)}),C(d),C(n),l((e,t)=>{a=f(n,1,`wave-tile svelte-njfz5t`,null,a,{silent:!c(w).src}),_(n,`aria-label`,e),i(A,` ${t??``} `)},[()=>c(w).src?Ee():Ce(),()=>c(w).caption()]),e(`click`,n,()=>k()),e(`keydown`,n,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),k())}),o(t,n)};r(ee,e=>{c(w)&&e(j)}),o(n,A),m()}T([`click`,`keydown`]);var Dt=n(`<div class="tiles svelte-157rl9q" aria-hidden="true"><canvas class="tiles-canvas svelte-157rl9q"></canvas></div>`);function Ot(e,n){u(n,!0);let i=d(n,`rotationHours`,3,null),a=p(null);v(()=>{if(!c(a)||!n.stats)return;let e=c(a),t=e.getContext(`2d`);if(!t)return;let r=n.stats,o=Ct[n.bodyKey]??Ct.earth,s=typeof window<`u`&&window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches,l=e=>`rgba(${o.glowRGB},${e})`,u=i()==null?null:Math.min(45,Math.max(3.5,Math.abs(i())/4)),d=i()==null?`—`:Math.abs(i())<48?`${Math.abs(i()).toFixed(1)} h`:`${(Math.abs(i())/24).toFixed(1)} d`,f=Math.min(.92,Math.max(.18,.34/Math.max(.05,r.surfaceGravityG))),p=Math.min(1,Math.max(0,(r.surfaceTempK-90)/230)),m=r.atmoBar<=0?0:Math.min(1,Math.max(0,(Math.log10(r.atmoBar)+3)/3)),h=r.atmoBar===0?Oe():r.atmoBar<.01?`${(r.atmoBar*1e3).toFixed(0)} mbar`:r.atmoBar<10?`${r.atmoBar.toFixed(1)} bar`:`${r.atmoBar.toFixed(0)} bar`,g=()=>{let n=window.devicePixelRatio||1,r=e.clientWidth||300,i=e.clientHeight||58;e.width=Math.round(r*n),e.height=Math.round(i*n),t.setTransform(n,0,0,n,0,0)};g();let _=new ResizeObserver(g);_.observe(e);let v=(e,n,r,i,a=7)=>{t.fillStyle=i,t.font=`${a}px "Space Mono", monospace`,t.textAlign=`center`,t.fillText(e,n,r)},y=(e,n,r,i)=>{let a=e+n/2,s=r*.46,c=Math.min(n,r)*.26;v(`SPIN`,a,9,l(.65),6),t.strokeStyle=l(.35),t.lineWidth=1,t.beginPath(),t.arc(a,s,c,0,Math.PI*2),t.stroke(),t.strokeStyle=l(.5),t.beginPath(),t.moveTo(a,s-c),t.lineTo(a,s-c+3),t.stroke();let f=-Math.PI/2+(u?i/u*Math.PI*2:0);t.save(),t.shadowColor=l(.9),t.shadowBlur=5,t.strokeStyle=o.bright,t.lineWidth=1.4,t.beginPath(),t.moveTo(a,s),t.lineTo(a+Math.cos(f)*c*.82,s+Math.sin(f)*c*.82),t.stroke(),t.restore(),t.fillStyle=o.core,t.beginPath(),t.arc(a,s,1.6,0,Math.PI*2),t.fill(),v(d,a,r-3,`rgba(255,255,255,0.7)`,7)},b=(e,n,i,a)=>{let s=e+n/2,c=i*.78;v(`GRAV`,s,9,l(.65),6),t.strokeStyle=l(.25),t.lineWidth=1,t.beginPath(),t.moveTo(s-n*.28,c),t.lineTo(s+n*.28,c),t.stroke();let u=2.2,d=a%u/u,p=c-4*d*(1-d)*f*(c-15);t.save(),t.shadowColor=l(.9),t.shadowBlur=6,t.fillStyle=o.bright,t.beginPath(),t.arc(s,p,2.6,0,Math.PI*2),t.fill(),t.restore(),v(`${r.surfaceGravityG.toFixed(2)} g`,s,i-3,`rgba(255,255,255,0.7)`,7)},x=(e,n,i)=>{let a=e+n/2,s=e+n*.16,c=n*.68;v(`AIR`,a,9,l(.65),6);let u=i*.36,d=t.createLinearGradient(s,0,s+c,0);d.addColorStop(0,`rgba(90,150,255,0.85)`),d.addColorStop(.5,`rgba(220,220,220,0.7)`),d.addColorStop(1,`rgba(255,110,60,0.9)`),t.fillStyle=d,t.fillRect(s,u,c,4);let f=s+p*c;t.fillStyle=o.core,t.beginPath(),t.moveTo(f,u-3),t.lineTo(f-2.5,u-.5),t.lineTo(f+2.5,u-.5),t.closePath(),t.fill();let g=i*.56;t.strokeStyle=l(.25),t.lineWidth=3,t.beginPath(),t.moveTo(s,g),t.lineTo(s+c,g),t.stroke(),t.strokeStyle=o.bright,t.beginPath(),t.moveTo(s,g),t.lineTo(s+Math.max(2,m*c),g),t.stroke(),v(`${r.surfaceTempK} K · ${h}`,a,i-3,`rgba(255,255,255,0.7)`,7)},S=n=>{let r=e.clientWidth||300,i=e.clientHeight||58;t.clearRect(0,0,r,i);let a=r/3;t.strokeStyle=`rgba(255,255,255,0.08)`,t.lineWidth=1;for(let e of[a,a*2])t.beginPath(),t.moveTo(e,6),t.lineTo(e,i-12),t.stroke();y(0,a,i,n),b(a,a,i,n),x(a*2,a,i)},C=0,w=!1;if(s)S(.55);else{let e=performance.now(),t=()=>{w||(S((performance.now()-e)/1e3),C=requestAnimationFrame(t))};C=requestAnimationFrame(t)}return()=>{w=!0,cancelAnimationFrame(C),_.disconnect()}});var s=t(),l=g(s),f=e=>{var t=Dt();h(x(t),e=>b(a,e),()=>c(a)),C(t),o(e,t)};r(l,e=>{n.stats&&e(f)}),o(e,s),m()}var kt=n(`<div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> <!></span></div>`),At=n(`<div><div class="scan-eyebrow svelte-1k90nq4" aria-hidden="true"> </div> <!> <div class="scan-decor" aria-hidden="true"><!> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value scan-value-wrap svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <!></div></div>`);function jt(e,n){u(n,!0);let a=d(n,`rotationHours`,3,null),h=d(n,`lightTime`,3,null),_=d(n,`focusGate`,3,!0),w=d(n,`placement`,3,`bottom-center`),T=d(n,`inline`,3,!1),E=p(!1);v(()=>{let e=Ge(`planet-stats`,e=>{b(E,e,!0)});return()=>e?.()});var O=t(),ue=g(O),M=e=>{var t=At();let u;var d=x(t),p=x(d,!0);C(d);var m=y(d,2);{let e=S(()=>n.bodyLabel.toLowerCase());Et(m,{get bodyKey(){return c(e)}})}var g=y(m,2),_=x(g);{let e=S(()=>n.bodyLabel.toLowerCase());Ot(_,{get bodyKey(){return c(e)},get stats(){return n.stats},get rotationHours(){return a()}})}var v=y(_,2),b=x(v),E=x(b,!0);C(b);var O=y(b,2),ue=x(O);C(O),C(v);var M=y(v,2),pe=x(M),ve=x(pe,!0);C(pe);var Ce=y(pe,2),we=x(Ce,!0);C(Ce),C(M);var Ee=y(M,2),De=x(Ee),Oe=x(De,!0);C(De);var Pe=y(De,2),N=x(Pe,!0);C(Pe),C(Ee);var P=y(Ee,2),Fe=x(P),Ie=x(Fe,!0);C(Fe);var Le=y(Fe,2),Re=x(Le,!0);C(Le),C(P);var F=y(P,2),ze=x(F),Be=x(ze,!0);C(ze);var Ve=y(ze,2),He=x(Ve,!0);C(Ve),C(F);var Ue=y(F,2),I=x(Ue),L=x(I,!0);C(I);var R=y(I,2),We=x(R),z=e=>{var t=s();l((e,n)=>i(t,`${e??``}
            ${n??``}`),[()=>Math.abs(a())<48?`${Math.abs(a()).toFixed(2)} h`:`${(Math.abs(a())/24).toFixed(1)} d`,()=>a()<0?`· ${Te()}`:``]),o(e,t)};r(We,e=>{a()!==null&&e(z)}),C(R),C(Ue);var B=y(Ue,2),Ge=x(B),Ke=x(Ge,!0);C(Ge);var qe=y(Ge,2),Je=x(qe);C(qe),C(B);var V=y(B,2),H=x(V),Ye=x(H,!0);C(H);var U=y(H,2),Xe=x(U);C(U),C(V);var W=y(V,2),G=x(W),K=x(G,!0);C(G);var q=y(G,2),J=x(q),Ze=e=>{var t=s();l(e=>i(t,e),[()=>k()]),o(e,t)},Qe=e=>{var t=s();l(e=>i(t,e),[()=>ce()]),o(e,t)},Y=e=>{var t=s();l(e=>i(t,e),[()=>Me()]),o(e,t)},$e=e=>{var t=s();l(e=>i(t,e),[()=>fe()]),o(e,t)},et=e=>{var t=s();l(e=>i(t,e),[()=>Ne()]),o(e,t)};r(J,e=>{n.stats.surfaceKind===`rocky`?e(Ze):n.stats.surfaceKind===`rocky-liquid`?e(Qe,1):n.stats.surfaceKind===`rocky-ice`?e(Y,2):n.stats.surfaceKind===`gas-giant`?e($e,3):e(et,-1)}),C(q),C(W);var X=y(W,2),Z=x(X),Q=x(Z,!0);C(Z);var $=y(Z,2),tt=x($),nt=e=>{var t=s();l(e=>i(t,e),[()=>Ae()]),o(e,t)},rt=e=>{var t=s();l(e=>i(t,e),[()=>de()]),o(e,t)},it=e=>{var t=s();l(e=>i(t,e),[()=>ge()]),o(e,t)},at=e=>{var t=s();l(e=>i(t,e),[()=>_e()]),o(e,t)};r(tt,e=>{n.stats.radiation===`shielded`?e(nt):n.stats.radiation===`moderate`?e(rt,1):n.stats.radiation===`high`?e(it,2):e(at,-1)}),C($),C(X);var ot=y(X,2),st=e=>{var t=kt(),n=x(t),a=x(n,!0);C(n);var c=y(n,2),u=x(c),d=y(u),f=e=>{var t=s();l(e=>i(t,`· ${e??``}`),[()=>h().fromEarthMin<60?ke({value:h().fromEarthMin.toFixed(1)}):xe({value:(h().fromEarthMin/60).toFixed(2)})]),o(e,t)};r(d,e=>{h().fromEarthMin!==null&&h().fromEarthMin>0&&e(f)}),C(c),C(t),l((e,t)=>{i(a,e),i(u,`${t??``} `)},[()=>A(),()=>h().fromSunMin<60?he({value:h().fromSunMin.toFixed(1)}):me({value:(h().fromSunMin/60).toFixed(2)})]),o(e,t)};r(ot,e=>{h()&&e(st)}),C(g),C(t),l((e,r,a,o,s,c,l,d,m,h,g,_,v,y,b,x,S)=>{u=f(t,1,`tactical-scan svelte-1k90nq4`,null,u,{"above-altitude":w()===`above-altitude`&&!T(),inline:T()}),i(p,e),i(E,r),i(ue,`${a??``} g`),i(ve,o),i(we,s),i(Oe,c),i(N,n.stats.atmoComposition),i(Ie,l),i(Re,d),i(Be,m),i(He,h),i(L,g),i(Ke,_),i(Je,`${v??``} km`),i(Ye,y),i(Xe,`${b??``} km/s`),i(K,x),i(Q,S)},[()=>se({planet:n.bodyLabel}),()=>ne(),()=>n.stats.surfaceGravityG.toFixed(2),()=>te(),()=>n.stats.atmoBar===0?ee():n.stats.atmoBar<.01?`${(n.stats.atmoBar*1e3).toFixed(2)} mbar`:n.stats.atmoBar<10?`${n.stats.atmoBar.toFixed(2)} bar`:`${n.stats.atmoBar.toFixed(0)} bar`,()=>j(),()=>oe(),()=>Se({k:n.stats.surfaceTempK.toString(),c:(n.stats.surfaceTempK-273).toFixed(0)}),()=>ie(),()=>n.stats.maxWindMs===0?le():je({ms:n.stats.maxWindMs.toString()}),()=>re(),()=>ye(),()=>n.stats.diameterKm.toLocaleString(),()=>D(),()=>n.stats.escapeKms.toFixed(1),()=>be(),()=>ae()]),o(e,t)};r(ue,e=>{n.stats&&(T()||c(E)&&_())&&e(M)}),o(e,O),m()}var Mt=n(`<button type="button" class="enter-sky svelte-y5xq5p" aria-label="Point your phone at the sky to find the Sun, Moon and planets">SKY</button>`);function Nt(n,i){u(i,!0);let a=p(`hidden`);v(async()=>{b(a,Je(await Ke(),qe()),!0)});var s=t(),l=g(s),d=t=>{var n=Mt();e(`click`,n,function(...e){i.onEnter?.apply(this,e)}),o(t,n)};r(l,e=>{c(a)===`enabled`&&e(d)}),o(n,s),m()}T([`click`]);export{_t as a,gt as c,ot as d,at as f,vt as i,ut as l,jt as n,St as o,U as p,Ct as r,bt as s,Nt as t,ct as u};