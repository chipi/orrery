const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_app/immutable/chunks/CnAOLUfO.js","_app/immutable/chunks/DyLoAM9G.js","_app/immutable/chunks/-PQCUPu_.js","_app/immutable/chunks/CLlzdnaO.js","_app/immutable/chunks/UiN9JBgE.js","_app/immutable/chunks/DsmkTYyx.js","_app/immutable/chunks/DL9XElOa.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/C6xMTq_g.js","_app/immutable/chunks/C9MNIcAw.js","_app/immutable/chunks/C_esfiZE.js","_app/immutable/chunks/BhGDwwuT.js","_app/immutable/chunks/D_unIhzV.js","_app/immutable/chunks/Dw51lpYg.js","_app/immutable/chunks/CktIJssj.js","_app/immutable/chunks/BwboGgoo.js","_app/immutable/chunks/DayBpKoh.js","_app/immutable/chunks/DPkAswfZ.js","_app/immutable/chunks/7FuMDnnU.js","_app/immutable/chunks/CtLvQEZy.js","_app/immutable/chunks/CBahchdG.js","_app/immutable/chunks/CH8QV1VJ.js","_app/immutable/chunks/B9x5SMCS.js","_app/immutable/chunks/-UyI9lYi.js","_app/immutable/chunks/Ds101zI5.js","_app/immutable/chunks/B0XwC4Ot.js","_app/immutable/chunks/DUbQrKN4.js","_app/immutable/chunks/BVHyKRY2.js","_app/immutable/chunks/B0s5kzqy.js","_app/immutable/chunks/BcMdW1Rq.js","_app/immutable/chunks/Bv6SoQKO.js","_app/immutable/assets/feedback.DSDG94aB.css"])))=>i.map(i=>d[i]);
import{a1 as ia,$ as yt,a2 as dt,a3 as Be,a4 as oa,x as ht,y as Ut,V as ge,X as la,a5 as Ie,U as Ct,m as ca,a6 as Ne,M as da,a7 as Ke,a8 as ua,Y as fa,a9 as va}from"./DsmkTYyx.js";import"./CWj6FrbW.js";import{p as Ue,G as o,I as i,d as p,g as v,t as C,b,e as Ce,J as Me,c as F,a as de,a_ as Oe,f as ze,s as Pe,aZ as le,K as wt}from"./-PQCUPu_.js";import{d as Je,s as u,a as De}from"./C_esfiZE.js";import{i as W}from"./Dw51lpYg.js";import{e as ut,i as ma}from"./Ci9jAvAB.js";import{s as ke}from"./CktIJssj.js";import{s as pt}from"./BwboGgoo.js";import{s as Ve}from"./DPkAswfZ.js";import{p as _e}from"./CtLvQEZy.js";import{e as ha,a as pa,b as _a,w as ga,c as ba,d as xa,f as ya,g as wa,h as Sa,i as ka,t as Aa,j as Ma,k as Ea,l as Ta,m as Ba,n as Pa,o as za,p as Ua,q as Ca,r as La,s as Ra,u as Da,v as Ka,x as Oa,y as qa,z as Fa,A as Ga,B as ja,C as Ha,D as Wa,E as Ia,F as Na,G as Va,H as Xa,I as Ja,J as Ya,K as Qa,L as Za,M as $a,N as en,O as tn,P as an,Q as St,R as nn,S as sn,T as rn,U as on,V as ln,W as cn,X as dn}from"./CduTa6yt.js";import{o as Ye}from"./B9x5SMCS.js";import{o as un}from"./CbIbQ2PN.js";import{b as Lt}from"./7FuMDnnU.js";import{b as Rt}from"./Ds101zI5.js";import"./B0XwC4Ot.js";import{_ as ft}from"./Bv6SoQKO.js";import{C as vt}from"./DyLoAM9G.js";import{a as kt}from"./D5R871Gt.js";import{a as st}from"./BHZMUTyl.js";import{P as fn}from"./DL9XElOa.js";import{S as vn}from"./Bl6iVfL_.js";const At=new ht,je=new ge;class Dt extends ia{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],s=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],a=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(a),this.setAttribute("position",new yt(e,3)),this.setAttribute("uv",new yt(s,2))}applyMatrix4(e){const s=this.attributes.instanceStart,a=this.attributes.instanceEnd;return s!==void 0&&(s.applyMatrix4(e),a.applyMatrix4(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let s;e instanceof Float32Array?s=e:Array.isArray(e)&&(s=new Float32Array(e));const a=new dt(s,6,1);return this.setAttribute("instanceStart",new Be(a,3,0)),this.setAttribute("instanceEnd",new Be(a,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let s;e instanceof Float32Array?s=e:Array.isArray(e)&&(s=new Float32Array(e));const a=new dt(s,6,1);return this.setAttribute("instanceColorStart",new Be(a,3,0)),this.setAttribute("instanceColorEnd",new Be(a,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new oa(e.geometry)),this}fromLineSegments(e){const s=e.geometry;return this.setPositions(s.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ht);const e=this.attributes.instanceStart,s=this.attributes.instanceEnd;e!==void 0&&s!==void 0&&(this.boundingBox.setFromBufferAttribute(e),At.setFromBufferAttribute(s),this.boundingBox.union(At))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ut),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,s=this.attributes.instanceEnd;if(e!==void 0&&s!==void 0){const a=this.boundingSphere.center;this.boundingBox.getCenter(a);let n=0;for(let g=0,T=e.count;g<T;g++)je.fromBufferAttribute(e,g),n=Math.max(n,a.distanceToSquared(je)),je.fromBufferAttribute(s,g),n=Math.max(n,a.distanceToSquared(je));this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}Ne.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new ca},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Ie.line={uniforms:Ct.merge([Ne.common,Ne.fog,Ne.line]),vertexShader:`
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
		`};class Kt extends la{constructor(e){super({type:"LineMaterial",uniforms:Ct.clone(Ie.line.uniforms),vertexShader:Ie.line.vertexShader,fragmentShader:Ie.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const rt=new Ke,Mt=new ge,Et=new ge,ae=new Ke,ne=new Ke,ve=new Ke,it=new ge,ot=new fa,se=new ua,Tt=new ge,He=new ht,We=new Ut,me=new Ke;let he,Ae;function Bt(d,e,s){return me.set(0,0,-e,1).applyMatrix4(d.projectionMatrix),me.multiplyScalar(1/me.w),me.x=Ae/s.width,me.y=Ae/s.height,me.applyMatrix4(d.projectionMatrixInverse),me.multiplyScalar(1/me.w),Math.abs(Math.max(me.x,me.y))}function mn(d,e){const s=d.matrixWorld,a=d.geometry,n=a.attributes.instanceStart,g=a.attributes.instanceEnd,T=Math.min(a.instanceCount,n.count);for(let l=0,t=T;l<t;l++){se.start.fromBufferAttribute(n,l),se.end.fromBufferAttribute(g,l),se.applyMatrix4(s);const m=new ge,B=new ge;he.distanceSqToSegment(se.start,se.end,B,m),B.distanceTo(m)<Ae*.5&&e.push({point:B,pointOnLine:m,distance:he.origin.distanceTo(B),object:d,face:null,faceIndex:l,uv:null,uv1:null})}}function hn(d,e,s){const a=e.projectionMatrix,g=d.material.resolution,T=d.matrixWorld,l=d.geometry,t=l.attributes.instanceStart,m=l.attributes.instanceEnd,B=Math.min(l.instanceCount,t.count),x=-e.near;he.at(1,ve),ve.w=1,ve.applyMatrix4(e.matrixWorldInverse),ve.applyMatrix4(a),ve.multiplyScalar(1/ve.w),ve.x*=g.x/2,ve.y*=g.y/2,ve.z=0,it.copy(ve),ot.multiplyMatrices(e.matrixWorldInverse,T);for(let r=0,j=B;r<j;r++){if(ae.fromBufferAttribute(t,r),ne.fromBufferAttribute(m,r),ae.w=1,ne.w=1,ae.applyMatrix4(ot),ne.applyMatrix4(ot),ae.z>x&&ne.z>x)continue;if(ae.z>x){const h=ae.z-ne.z,_=(ae.z-x)/h;ae.lerp(ne,_)}else if(ne.z>x){const h=ne.z-ae.z,_=(ne.z-x)/h;ne.lerp(ae,_)}ae.applyMatrix4(a),ne.applyMatrix4(a),ae.multiplyScalar(1/ae.w),ne.multiplyScalar(1/ne.w),ae.x*=g.x/2,ae.y*=g.y/2,ne.x*=g.x/2,ne.y*=g.y/2,se.start.copy(ae),se.start.z=0,se.end.copy(ne),se.end.z=0;const X=se.closestPointToPointParameter(it,!0);se.at(X,Tt);const J=va.lerp(ae.z,ne.z,X),ee=J>=-1&&J<=1,c=it.distanceTo(Tt)<Ae*.5;if(ee&&c){se.start.fromBufferAttribute(t,r),se.end.fromBufferAttribute(m,r),se.start.applyMatrix4(T),se.end.applyMatrix4(T);const h=new ge,_=new ge;he.distanceSqToSegment(se.start,se.end,_,h),s.push({point:_,pointOnLine:h,distance:he.origin.distanceTo(_),object:d,face:null,faceIndex:r,uv:null,uv1:null})}}}class pn extends da{constructor(e=new Dt,s=new Kt({color:Math.random()*16777215})){super(e,s),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,s=e.attributes.instanceStart,a=e.attributes.instanceEnd,n=new Float32Array(2*s.count);for(let T=0,l=0,t=s.count;T<t;T++,l+=2)Mt.fromBufferAttribute(s,T),Et.fromBufferAttribute(a,T),n[l]=l===0?0:n[l-1],n[l+1]=n[l]+Mt.distanceTo(Et);const g=new dt(n,2,1);return e.setAttribute("instanceDistanceStart",new Be(g,1,0)),e.setAttribute("instanceDistanceEnd",new Be(g,1,1)),this}raycast(e,s){const a=this.material.worldUnits,n=e.camera;if(n===null&&!a&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),a===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;const g=e.params.Line2!==void 0&&e.params.Line2.threshold||0;he=e.ray;const T=this.matrixWorld,l=this.geometry,t=this.material;Ae=t.linewidth+g,l.boundingSphere===null&&l.computeBoundingSphere(),We.copy(l.boundingSphere).applyMatrix4(T);let m;if(a)m=Ae*.5;else{const x=Math.max(n.near,We.distanceToPoint(he.origin));m=Bt(n,x,t.resolution)}if(We.radius+=m,he.intersectsSphere(We)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),He.copy(l.boundingBox).applyMatrix4(T);let B;if(a)B=Ae*.5;else{const x=Math.max(n.near,He.distanceToPoint(he.origin));B=Bt(n,x,t.resolution)}He.expandByScalar(B),he.intersectsBox(He)!==!1&&(a?mn(this,s):hn(this,n,s))}onBeforeRender(e){const s=this.material.uniforms;s&&s.resolution&&(e.getViewport(rt),this.material.uniforms.resolution.value.set(rt.z,rt.w))}}class _n extends Dt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const s=e.length-3,a=new Float32Array(2*s);for(let n=0;n<s;n+=3)a[2*n]=e[n],a[2*n+1]=e[n+1],a[2*n+2]=e[n+2],a[2*n+3]=e[n+3],a[2*n+4]=e[n+4],a[2*n+5]=e[n+5];return super.setPositions(a),this}setColors(e){const s=e.length-3,a=new Float32Array(2*s);for(let n=0;n<s;n+=3)a[2*n]=e[n],a[2*n+1]=e[n+1],a[2*n+2]=e[n+2],a[2*n+3]=e[n+3],a[2*n+4]=e[n+4],a[2*n+5]=e[n+5];return super.setColors(a),this}setFromPoints(e){const s=e.length-1,a=new Float32Array(6*s);for(let n=0;n<s;n++)a[6*n]=e[n].x,a[6*n+1]=e[n].y,a[6*n+2]=e[n].z||0,a[6*n+3]=e[n+1].x,a[6*n+4]=e[n+1].y,a[6*n+5]=e[n+1].z||0;return super.setPositions(a),this}fromLine(e){const s=e.geometry;return this.setPositions(s.attributes.position.array),this}}class xs extends pn{constructor(e=new _n,s=new Kt({color:Math.random()*16777215})){super(e,s),this.isLine2=!0,this.type="Line2"}}const lt=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function ys(d){for(let e=0;e<lt.length-1;e++){const[s,a]=lt[e],[n,g]=lt[e+1];if(d>=s&&d<=n)return a+(d-s)/(n-s)*(g-a)}return 512}function Pt(d){return 8.5+5.2*Math.log10(1+d/200)}function ws(d,e){return d+(Pt(e)-Pt(0))}var gn=F('<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>'),bn=F('<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>'),xn=F('<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>'),yn=F('<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>'),wn=F('<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>');function Ss(d,e){Ue(e,!0);let s=_e(e,"highlightRegime",3,null),a=_e(e,"anchorBottomPx",3,80);function n(c){return c==null?0:typeof c=="number"?c:(c[0]+c[1])/2}function g(c){return c.altitude_km!=null?n(c.altitude_km):n(c.distance_au)}let T=Me(()=>e.order?e.order.map(c=>e.regimes.find(h=>h.id===c)).filter(c=>c!=null):[...e.regimes].sort((c,h)=>g(h)-g(c)));function l(c){if(typeof c=="number")return c>=1e3?`${(c/1e3).toFixed(0)},000 km`:`${c} km`;const[h,_]=c,R=D=>D>=1e3?`${(D/1e3).toFixed(0)}k`:`${D}`;return`${R(h)}-${R(_)} km`}function t(c){const h=_=>_<10?_.toFixed(1):_<1e3?_.toFixed(0):_<1e4?`${(_/1e3).toFixed(1)}k`:`${(_/1e3).toFixed(0)}k`;return typeof c=="number"?`${h(c)} AU`:`${h(c[0])}-${h(c[1])} AU`}function m(c){return c.altitude_km!=null?l(c.altitude_km):c.distance_au!=null?t(c.distance_au):""}var B=wn();let x;var r=o(B),j=o(r,!0);i(r);var H=p(r,2),X=o(H);ut(X,17,()=>v(T),c=>c.id,(c,h)=>{var _=xn(),R=o(_);let D,$;var N=o(R);{var A=S=>{var K=gn();b(S,K)},O=S=>{var K=bn();b(S,K)};W(N,S=>{v(h).id===s()?S(A):S(O,-1)})}var re=p(N,2),ce=o(re,!0);i(re);var L=p(re,2),U=o(L,!0);i(L),i(R),i(_),C(S=>{D=pt(R,1,"band svelte-1v3z2gg",null,D,{"band--highlighted":v(h).id===s()}),ke(R,"aria-current",v(h).id===s()?"true":void 0),$=Ve(R,"",$,{"--regime-color":v(h).color}),u(ce,v(h).short??v(h).id),u(U,S)},[()=>m(v(h))]),De("click",R,()=>e.onSelect(v(h).id)),b(c,_)});var J=p(X,2);{var ee=c=>{const h=Me(()=>e.surfaceAnchor??{label:_a(),value:"0 km"});var _=yn(),R=p(o(_),2),D=o(R,!0);i(R);var $=p(R,2),N=o($,!0);i($),i(_),C(()=>{u(D,v(h).label),u(N,v(h).value)}),b(c,_)};W(J,c=>{e.surfaceAnchor!==null&&c(ee)})}i(H),i(B),C((c,h)=>{ke(B,"aria-label",c),x=Ve(B,"",x,{"--ruler-bottom":`${a()??""}px`}),u(j,h)},[()=>ha(),()=>pa()]),b(d,B),Ce()}Je(["click"]);const ks={mercury:{diameterKm:4880,diameterRatioEarth:.38,surfaceGravityG:.38,atmoBar:0,atmoComposition:"Na · K · O · H exosphere (trace)",surfaceTempK:440,maxWindMs:0,escapeKms:4.3,surfaceKind:"rocky",radiation:"extreme"},venus:{diameterKm:12104,diameterRatioEarth:.95,surfaceGravityG:.91,atmoBar:92,atmoComposition:"CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck",surfaceTempK:737,maxWindMs:1,escapeKms:10.4,surfaceKind:"rocky",radiation:"shielded"},earth:{diameterKm:12742,diameterRatioEarth:1,surfaceGravityG:1,atmoBar:1,atmoComposition:"N₂ 78% · O₂ 21% · Ar 0.9%",surfaceTempK:288,maxWindMs:50,escapeKms:11.2,surfaceKind:"rocky-liquid",radiation:"shielded"},moon:{diameterKm:3474,diameterRatioEarth:.273,surfaceGravityG:.165,atmoBar:0,atmoComposition:"He · Ar · Na exosphere (trace)",surfaceTempK:250,maxWindMs:0,escapeKms:2.38,surfaceKind:"rocky",radiation:"high"},mars:{diameterKm:6779,diameterRatioEarth:.53,surfaceGravityG:.38,atmoBar:.006,atmoComposition:"CO₂ 95% · N₂ 2.8% · Ar 2%",surfaceTempK:210,maxWindMs:30,escapeKms:5,surfaceKind:"rocky",radiation:"high"},jupiter:{diameterKm:139820,diameterRatioEarth:10.97,surfaceGravityG:2.53,atmoBar:1,atmoComposition:"H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds",surfaceTempK:165,maxWindMs:100,escapeKms:59.5,surfaceKind:"gas-giant",radiation:"extreme"},saturn:{diameterKm:116460,diameterRatioEarth:9.14,surfaceGravityG:1.07,atmoBar:1,atmoComposition:"H₂ 96% · He 3% · CH₄/NH₃ clouds",surfaceTempK:134,maxWindMs:500,escapeKms:35.5,surfaceKind:"gas-giant",radiation:"high"},uranus:{diameterKm:50724,diameterRatioEarth:3.98,surfaceGravityG:.89,atmoBar:1,atmoComposition:"H₂ 83% · He 15% · CH₄ 2.3%",surfaceTempK:76,maxWindMs:250,escapeKms:21.3,surfaceKind:"ice-giant",radiation:"moderate"},neptune:{diameterKm:49244,diameterRatioEarth:3.86,surfaceGravityG:1.14,atmoBar:1,atmoComposition:"H₂ 80% · He 19% · CH₄ 1.5%",surfaceTempK:72,maxWindMs:580,escapeKms:23.5,surfaceKind:"ice-giant",radiation:"moderate"},pluto:{diameterKm:2376,diameterRatioEarth:.19,surfaceGravityG:.06,atmoBar:1e-6,atmoComposition:"N₂ + CH₄ + CO (~10 μbar, sublimates)",surfaceTempK:44,maxWindMs:0,escapeKms:1.2,surfaceKind:"rocky-ice",radiation:"shielded"}},mt=8.317,Sn=299792.458*60;function zt(d,e=1){return{fromSunMin:d*mt,fromEarthMin:Math.abs(d-e)*mt}}function kn(d,e){return{fromSunMin:d*mt,fromEarthMin:e/Sn}}const As={earth:{rotationHours:23.93,lightTime:zt(1)},moon:{rotationHours:655.7,lightTime:kn(1,384400)},mars:{rotationHours:24.62,lightTime:zt(1.524)}},Xe={mars:{core:"#fff1e6",bright:"#ff9a4d",mid:"#ff6a2e",deep:"#c8371a",glowRGB:"255,122,60"},earth:{core:"#ecffff",bright:"#7fe0ff",mid:"#3aa0ff",deep:"#2b6cff",glowRGB:"90,190,255"},moon:{core:"#ffffff",bright:"#e6ebf5",mid:"#c1c6d4",deep:"#9298aa",glowRGB:"205,213,233"}};var An=F('<span class="wave-hint svelte-njfz5t"> </span>'),Mn=F('<div role="button" tabindex="0"><canvas class="wave-canvas svelte-njfz5t"></canvas> <div class="wave-caption svelte-njfz5t"><span class="wave-cue svelte-njfz5t" aria-hidden="true"><!></span> <!></div></div>');function En(d,e){Ue(e,!0);const s={earth:{amp:1,rolloff:.15,noise:.2,caption:()=>wa(),src:"audio/atmosphere/earth-wind.mp3"},mars:{amp:.55,rolloff:.78,noise:.14,caption:()=>ya(),src:"audio/atmosphere/mars-wind.mp3"},moon:{amp:0,rolloff:1,noise:0,caption:()=>xa(),src:null}},a=Me(()=>s[e.bodyKey]??null);let n=Pe(null),g=Pe(!1),T=Pe(!1),l=()=>{};Ye(()=>{var P;if(!v(n)||!v(a))return;const x=v(n),r=x.getContext("2d");if(!r)return;const j=v(a),H=Xe[e.bodyKey]??Xe.earth,X=typeof window<"u"&&((P=window.matchMedia)==null?void 0:P.call(window,"(prefers-reduced-motion: reduce)").matches),J=f=>`rgba(${H.glowRGB},${f})`,ee=f=>Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,f))),.55);let c=null,h=null,_=null,R=null,D=null;const $=()=>{try{D==null||D.stop()}catch{}D=null,de(g,!1)};l=async()=>{if(j.src){if(v(g))return $();try{if(c||(c=new AudioContext,h=c.createAnalyser(),h.fftSize=128,h.smoothingTimeConstant=.75,h.connect(c.destination),_=new Uint8Array(h.frequencyBinCount)),await c.resume(),!R){de(T,!0);const f=await fetch(`${Rt}/${j.src}`);R=await c.decodeAudioData(await f.arrayBuffer()),de(T,!1)}D=c.createBufferSource(),D.buffer=R,D.connect(h),D.onended=()=>{de(g,!1),D=null},D.start(),de(g,!0)}catch{de(T,!1),de(g,!1)}}};const N=()=>{const f=x.clientWidth||300,M=x.clientHeight||74;return{w:f,h:M,mid:M/2,maxA:M/2*.9}},A=()=>{const f=window.devicePixelRatio||1,{w:M,h:G}=N();x.width=Math.round(M*f),x.height=Math.round(G*f),r.setTransform(f,0,0,f,0,0)};A();const O=new ResizeObserver(A);O.observe(x);const re=(f,M,G,Y,oe)=>{if(v(g)&&_&&_.length){const ue=Math.min(_.length-1,Math.floor(f*_.length));return .12+.95*(_[ue]/255)}return .55+.45*Math.sin(M*Y+f*G*Math.PI*2+oe)*Math.sin(M*.7+f*3)},ce=()=>{const{w:f,h:M,mid:G}=N();r.clearRect(0,0,f,M),r.save(),r.shadowColor=J(.8),r.shadowBlur=8,r.strokeStyle=H.core,r.globalAlpha=.85,r.lineWidth=1.4,r.beginPath(),r.moveTo(3,G),r.lineTo(f-3,G),r.stroke(),r.restore()},L=f=>{const{w:M,h:G,mid:Y,maxA:oe}=N();r.clearRect(0,0,M,G),v(g)&&h&&_&&h.getByteFrequencyData(_);const ue=[{hue:H.deep,a:.22,sc:1,fx:2.1,sp:1.1,ph:0},{hue:H.mid,a:.28,sc:.78,fx:3.3,sp:1.7,ph:1.7},{hue:H.bright,a:.34,sc:.55,fx:4.9,sp:2.3,ph:3.1}];r.save(),r.globalCompositeOperation="lighter";for(const y of ue){const E=[];for(let k=0;k<=M;k+=3){const V=k/M,I=oe*y.sc*j.amp*ee(V)*Math.max(0,re(V,f,y.fx,y.sp,y.ph));E.push([k,Y-I])}r.beginPath(),E.forEach(([k,V],I)=>I===0?r.moveTo(k,V):r.lineTo(k,V));for(let k=E.length-1;k>=0;k--)r.lineTo(E[k][0],Y+(Y-E[k][1]));r.closePath(),r.fillStyle=y.hue,r.globalAlpha=y.a,r.fill()}r.restore(),r.save(),r.shadowColor=J(.9),r.shadowBlur=8,r.strokeStyle=H.core,r.lineWidth=1.2,r.globalAlpha=.9,r.beginPath();for(let y=0;y<=M;y+=3){const E=y/M,k=v(g)?re(E,f,0,0,0):.6+.4*Math.sin(f*2.2+E*9),V=.5*oe*j.amp*ee(E)*k;y===0?r.moveTo(y,Y-V):r.lineTo(y,Y-V)}r.stroke(),r.restore()},U=f=>j.amp===0?ce():L(f);let S=0,K=!1;if(X&&!v(g)){U(.9);const f=()=>{K||(v(g)&&U(performance.now()/1e3),S=requestAnimationFrame(f))};S=requestAnimationFrame(f)}else{const f=performance.now(),M=()=>{K||(U((performance.now()-f)/1e3),S=requestAnimationFrame(M))};S=requestAnimationFrame(M)}return()=>{K=!0,cancelAnimationFrame(S),O.disconnect(),$(),c==null||c.close().catch(()=>{})}});var t=Oe(),m=ze(t);{var B=x=>{var r=Mn();let j;var H=o(r);Lt(H,A=>de(n,A),()=>v(n));var X=p(H,2),J=o(X),ee=o(J);{var c=A=>{var O=le("◎");b(A,O)},h=A=>{var O=le("···");b(A,O)},_=A=>{var O=le("⏸");b(A,O)},R=A=>{var O=le("▶");b(A,O)};W(ee,A=>{v(a).src?v(T)?A(h,1):v(g)?A(_,2):A(R,-1):A(c)})}i(J);var D=p(J),$=p(D);{var N=A=>{var O=An(),re=o(O);i(O),C(ce=>u(re,`· ${ce??""}`),[()=>v(g)?Sa():ka()]),b(A,O)};W($,A=>{v(a).src&&A(N)})}i(X),i(r),C((A,O)=>{j=pt(r,1,"wave-tile svelte-njfz5t",null,j,{silent:!v(a).src}),ke(r,"aria-label",A),u(D,` ${O??""} `)},[()=>v(a).src?ga():ba(),()=>v(a).caption()]),De("click",r,()=>l()),De("keydown",r,A=>{(A.key==="Enter"||A.key===" ")&&(A.preventDefault(),l())}),b(x,r)};W(m,x=>{v(a)&&x(B)})}b(d,t),Ce()}Je(["click","keydown"]);var Tn=F('<div class="tiles svelte-157rl9q" aria-hidden="true"><canvas class="tiles-canvas svelte-157rl9q"></canvas></div>');function Bn(d,e){Ue(e,!0);let s=_e(e,"rotationHours",3,null),a=Pe(null);Ye(()=>{var ce;if(!v(a)||!e.stats)return;const l=v(a),t=l.getContext("2d");if(!t)return;const m=e.stats,B=Xe[e.bodyKey]??Xe.earth,x=typeof window<"u"&&((ce=window.matchMedia)==null?void 0:ce.call(window,"(prefers-reduced-motion: reduce)").matches),r=L=>`rgba(${B.glowRGB},${L})`,j=s()!=null?Math.min(45,Math.max(3.5,Math.abs(s())/4)):null,H=s()==null?"—":Math.abs(s())<48?`${Math.abs(s()).toFixed(1)} h`:`${(Math.abs(s())/24).toFixed(1)} d`,X=Math.min(.92,Math.max(.18,.34/Math.max(.05,m.surfaceGravityG))),J=Math.min(1,Math.max(0,(m.surfaceTempK-90)/230)),ee=m.atmoBar<=0?0:Math.min(1,Math.max(0,(Math.log10(m.atmoBar)+3)/3)),c=m.atmoBar===0?Aa():m.atmoBar<.01?`${(m.atmoBar*1e3).toFixed(0)} mbar`:m.atmoBar<10?`${m.atmoBar.toFixed(1)} bar`:`${m.atmoBar.toFixed(0)} bar`,h=()=>{const L=window.devicePixelRatio||1,U=l.clientWidth||300,S=l.clientHeight||58;l.width=Math.round(U*L),l.height=Math.round(S*L),t.setTransform(L,0,0,L,0,0)};h();const _=new ResizeObserver(h);_.observe(l);const R=(L,U,S,K,P=7)=>{t.fillStyle=K,t.font=`${P}px "Space Mono", monospace`,t.textAlign="center",t.fillText(L,U,S)},D=(L,U,S,K)=>{const P=L+U/2,f=S*.46,M=Math.min(U,S)*.26;R("SPIN",P,9,r(.65),6),t.strokeStyle=r(.35),t.lineWidth=1,t.beginPath(),t.arc(P,f,M,0,Math.PI*2),t.stroke(),t.strokeStyle=r(.5),t.beginPath(),t.moveTo(P,f-M),t.lineTo(P,f-M+3),t.stroke();const G=-Math.PI/2+(j?K/j*Math.PI*2:0);t.save(),t.shadowColor=r(.9),t.shadowBlur=5,t.strokeStyle=B.bright,t.lineWidth=1.4,t.beginPath(),t.moveTo(P,f),t.lineTo(P+Math.cos(G)*M*.82,f+Math.sin(G)*M*.82),t.stroke(),t.restore(),t.fillStyle=B.core,t.beginPath(),t.arc(P,f,1.6,0,Math.PI*2),t.fill(),R(H,P,S-3,"rgba(255,255,255,0.7)",7)},$=(L,U,S,K)=>{const P=L+U/2,f=S*.78,M=15;R("GRAV",P,9,r(.65),6),t.strokeStyle=r(.25),t.lineWidth=1,t.beginPath(),t.moveTo(P-U*.28,f),t.lineTo(P+U*.28,f),t.stroke();const G=2.2,Y=K%G/G,oe=4*Y*(1-Y),ue=f-oe*X*(f-M);t.save(),t.shadowColor=r(.9),t.shadowBlur=6,t.fillStyle=B.bright,t.beginPath(),t.arc(P,ue,2.6,0,Math.PI*2),t.fill(),t.restore(),R(`${m.surfaceGravityG.toFixed(2)} g`,P,S-3,"rgba(255,255,255,0.7)",7)},N=(L,U,S)=>{const K=L+U/2,P=L+U*.16,f=U*.68;R("AIR",K,9,r(.65),6);const M=S*.36,G=t.createLinearGradient(P,0,P+f,0);G.addColorStop(0,"rgba(90,150,255,0.85)"),G.addColorStop(.5,"rgba(220,220,220,0.7)"),G.addColorStop(1,"rgba(255,110,60,0.9)"),t.fillStyle=G,t.fillRect(P,M,f,4);const Y=P+J*f;t.fillStyle=B.core,t.beginPath(),t.moveTo(Y,M-3),t.lineTo(Y-2.5,M-.5),t.lineTo(Y+2.5,M-.5),t.closePath(),t.fill();const oe=S*.56;t.strokeStyle=r(.25),t.lineWidth=3,t.beginPath(),t.moveTo(P,oe),t.lineTo(P+f,oe),t.stroke(),t.strokeStyle=B.bright,t.beginPath(),t.moveTo(P,oe),t.lineTo(P+Math.max(2,ee*f),oe),t.stroke(),R(`${m.surfaceTempK} K · ${c}`,K,S-3,"rgba(255,255,255,0.7)",7)},A=L=>{const U=l.clientWidth||300,S=l.clientHeight||58;t.clearRect(0,0,U,S);const K=U/3;t.strokeStyle="rgba(255,255,255,0.08)",t.lineWidth=1;for(const P of[K,K*2])t.beginPath(),t.moveTo(P,6),t.lineTo(P,S-12),t.stroke();D(0,K,S,L),$(K,K,S,L),N(K*2,K,S)};let O=0,re=!1;if(x)A(.55);else{const L=performance.now(),U=()=>{re||(A((performance.now()-L)/1e3),O=requestAnimationFrame(U))};O=requestAnimationFrame(U)}return()=>{re=!0,cancelAnimationFrame(O),_.disconnect()}});var n=Oe(),g=ze(n);{var T=l=>{var t=Tn(),m=o(t);Lt(m,B=>de(a,B),()=>v(a)),i(t),b(l,t)};W(g,l=>{e.stats&&l(T)})}b(d,n),Ce()}var Pn=F('<div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> <!></span></div>'),zn=F('<div><div class="scan-eyebrow svelte-1k90nq4" aria-hidden="true"> </div> <!> <div class="scan-decor" aria-hidden="true"><!> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value scan-value-wrap svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <!></div></div>');function Ms(d,e){Ue(e,!0);let s=_e(e,"rotationHours",3,null),a=_e(e,"lightTime",3,null),n=_e(e,"focusGate",3,!0),g=_e(e,"placement",3,"bottom-center"),T=_e(e,"inline",3,!1),l=Pe(!1);Ye(()=>{const x=un("planet-stats",r=>{de(l,r,!0)});return()=>x==null?void 0:x()});var t=Oe(),m=ze(t);{var B=x=>{var r=zn();let j;var H=o(r),X=o(H,!0);i(H);var J=p(H,2);{let w=Me(()=>e.bodyLabel.toLowerCase());En(J,{get bodyKey(){return v(w)}})}var ee=p(J,2),c=o(ee);{let w=Me(()=>e.bodyLabel.toLowerCase());Bn(c,{get bodyKey(){return v(w)},get stats(){return e.stats},get rotationHours(){return s()}})}var h=p(c,2),_=o(h),R=o(_,!0);i(_);var D=p(_,2),$=o(D);i(D),i(h);var N=p(h,2),A=o(N),O=o(A,!0);i(A);var re=p(A,2),ce=o(re,!0);i(re),i(N);var L=p(N,2),U=o(L),S=o(U,!0);i(U);var K=p(U,2),P=o(K,!0);i(K),i(L);var f=p(L,2),M=o(f),G=o(M,!0);i(M);var Y=p(M,2),oe=o(Y,!0);i(Y),i(f);var ue=p(f,2),y=o(ue),E=o(y,!0);i(y);var k=p(y,2),V=o(k,!0);i(k),i(ue);var I=p(ue,2),Q=o(I),te=o(Q,!0);i(Q);var be=p(Q,2),pe=o(be);{var Ee=w=>{var z=le();C((q,Re)=>u(z,`${q??""}
            ${Re??""}`),[()=>Math.abs(s())<48?`${Math.abs(s()).toFixed(2)} h`:`${(Math.abs(s())/24).toFixed(1)} d`,()=>s()<0?`· ${Ga()}`:""]),b(w,z)};W(pe,w=>{s()!==null&&w(Ee)})}i(be),i(I);var xe=p(I,2),ye=o(xe),Le=o(ye,!0);i(ye);var fe=p(ye,2),Z=o(fe);i(fe),i(xe);var ie=p(xe,2),we=o(ie),qe=o(we,!0);i(we);var gt=p(we,2),Ot=o(gt);i(gt),i(ie);var Qe=p(ie,2),Ze=o(Qe),qt=o(Ze,!0);i(Ze);var bt=p(Ze,2),Ft=o(bt);{var Gt=w=>{var z=le();C(q=>u(z,q),[()=>ja()]),b(w,z)},jt=w=>{var z=le();C(q=>u(z,q),[()=>Ha()]),b(w,z)},Ht=w=>{var z=le();C(q=>u(z,q),[()=>Wa()]),b(w,z)},Wt=w=>{var z=le();C(q=>u(z,q),[()=>Ia()]),b(w,z)},It=w=>{var z=le();C(q=>u(z,q),[()=>Na()]),b(w,z)};W(Ft,w=>{e.stats.surfaceKind==="rocky"?w(Gt):e.stats.surfaceKind==="rocky-liquid"?w(jt,1):e.stats.surfaceKind==="rocky-ice"?w(Ht,2):e.stats.surfaceKind==="gas-giant"?w(Wt,3):w(It,-1)})}i(bt),i(Qe);var $e=p(Qe,2),et=o($e),Nt=o(et,!0);i(et);var xt=p(et,2),Vt=o(xt);{var Xt=w=>{var z=le();C(q=>u(z,q),[()=>Va()]),b(w,z)},Jt=w=>{var z=le();C(q=>u(z,q),[()=>Xa()]),b(w,z)},Yt=w=>{var z=le();C(q=>u(z,q),[()=>Ja()]),b(w,z)},Qt=w=>{var z=le();C(q=>u(z,q),[()=>Ya()]),b(w,z)};W(Vt,w=>{e.stats.radiation==="shielded"?w(Xt):e.stats.radiation==="moderate"?w(Jt,1):e.stats.radiation==="high"?w(Yt,2):w(Qt,-1)})}i(xt),i($e);var Zt=p($e,2);{var $t=w=>{var z=Pn(),q=o(z),Re=o(q,!0);i(q);var Fe=p(q,2),Ge=o(Fe),tt=p(Ge);{var at=Se=>{var Te=le();C(nt=>u(Te,`· ${nt??""}`),[()=>a().fromEarthMin<60?en({value:a().fromEarthMin.toFixed(1)}):tn({value:(a().fromEarthMin/60).toFixed(2)})]),b(Se,Te)};W(tt,Se=>{a().fromEarthMin!==null&&a().fromEarthMin>0&&Se(at)})}i(Fe),i(z),C((Se,Te)=>{u(Re,Se),u(Ge,`${Te??""} `)},[()=>Qa(),()=>a().fromSunMin<60?Za({value:a().fromSunMin.toFixed(1)}):$a({value:(a().fromSunMin/60).toFixed(2)})]),b(w,z)};W(Zt,w=>{a()&&w($t)})}i(ee),i(r),C((w,z,q,Re,Fe,Ge,tt,at,Se,Te,nt,ea,ta,aa,na,sa,ra)=>{j=pt(r,1,"tactical-scan svelte-1k90nq4",null,j,{"above-altitude":g()==="above-altitude"&&!T(),inline:T()}),u(X,w),u(R,z),u($,`${q??""} g`),u(O,Re),u(ce,Fe),u(S,Ge),u(P,e.stats.atmoComposition),u(G,tt),u(oe,at),u(E,Se),u(V,Te),u(te,nt),u(Le,ea),u(Z,`${ta??""} km`),u(qe,aa),u(Ot,`${na??""} km/s`),u(qt,sa),u(Nt,ra)},[()=>Ma({planet:e.bodyLabel}),()=>Ea(),()=>e.stats.surfaceGravityG.toFixed(2),()=>Ta(),()=>e.stats.atmoBar===0?Ba():e.stats.atmoBar<.01?`${(e.stats.atmoBar*1e3).toFixed(2)} mbar`:e.stats.atmoBar<10?`${e.stats.atmoBar.toFixed(2)} bar`:`${e.stats.atmoBar.toFixed(0)} bar`,()=>Pa(),()=>za(),()=>Ua({k:e.stats.surfaceTempK.toString(),c:(e.stats.surfaceTempK-273).toFixed(0)}),()=>Ca(),()=>e.stats.maxWindMs===0?La():Ra({ms:e.stats.maxWindMs.toString()}),()=>Da(),()=>Ka(),()=>e.stats.diameterKm.toLocaleString(),()=>Oa(),()=>e.stats.escapeKms.toFixed(1),()=>qa(),()=>Fa()]),b(x,r)};W(m,x=>{e.stats&&(T()||v(l)&&n())&&x(B)})}b(d,t),Ce()}function Un(d){const{capacitorPlatform:e,isNative:s,hasWebXR:a}=d;return s&&e==="ios"?"iphone-wrapped":s&&e==="android"?"android-wrapped":!s&&e==="web"&&a?"android-web":"unsupported"}function _t(){return typeof navigator>"u"?"unsupported":Un({capacitorPlatform:vt.getPlatform(),isNative:vt.isNativePlatform(),hasWebXR:"xr"in navigator&&!!navigator.xr})}function Cn(){return typeof navigator>"u"?!1:!vt.isNativePlatform()&&/iPad|iPhone|iPod/.test(navigator.userAgent)}async function Ln(){var e;const d=_t();if(d==="unsupported")return!1;if(d==="iphone-wrapped")return!0;try{return await((e=navigator.xr)==null?void 0:e.isSessionSupported("immersive-ar"))??!1}catch{return!1}}function Rn(d,e){return d!=="unsupported"?"enabled":e?"ios-fallback":"hidden"}async function Es(){switch(_t()){case"android-web":case"android-wrapped":return(await ft(async()=>{const{createWebXrBackend:d}=await import("./CnAOLUfO.js");return{createWebXrBackend:d}},__vite__mapDeps([0,1,2]))).createWebXrBackend();case"iphone-wrapped":return(await ft(async()=>{const{createArkitBackend:d}=await import("./CLlzdnaO.js");return{createArkitBackend:d}},__vite__mapDeps([3,1,2]))).createArkitBackend();default:return null}}var Dn=F('<button type="button" class="enter-ar svelte-50q8yt"> </button>'),Kn=F('<a class="enter-ar ios-fallback svelte-50q8yt" target="_blank" rel="noopener noreferrer external"> </a>');function Ts(d,e){Ue(e,!0);let s=Pe("hidden");Ye(async()=>{const t=Rn(_t(),Cn());if(t!=="enabled"){de(s,t,!0);return}de(s,await Ln()?"enabled":"hidden",!0)});const a="https://apps.apple.com/app/orrery";var n=Oe(),g=ze(n);{var T=t=>{var m=Dn(),B=o(m,!0);i(m),C((x,r)=>{ke(m,"aria-label",x),u(B,r)},[()=>an(),()=>St()]),De("click",m,function(...x){var r;(r=e.onEnter)==null||r.apply(this,x)}),b(t,m)},l=t=>{var m=Kn();ke(m,"href",a);var B=o(m,!0);i(m),C((x,r)=>{ke(m,"title",x),u(B,r)},[()=>nn(),()=>St()]),b(t,m)};W(g,t=>{v(s)==="enabled"?t(T):v(s)==="ios-fallback"&&t(l,1)})}b(d,n),Ce()}Je(["click"]);let ct=null;async function On(d,e){await st.load();const s=d==="explore"?"/explore":`/${d}`,a=st.byId(e)??st.forRoute(s).find(n=>n.persona==="guide");a&&(kt.loadEpisode(a),kt.play())}async function Bs(d){if(ct||typeof document>"u")return!1;const e=document.createElement("canvas");e.className="ar-canvas",e.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;z-index:9997;background:transparent;",document.body.appendChild(e);const{createArScene:s}=await ft(async()=>{const{createArScene:T}=await import("./UiN9JBgE.js");return{createArScene:T}},__vite__mapDeps([4,5,6,7,2,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,1,29,30,31])),a=()=>{e.remove(),ct=null},n=s(d,e,{onExit:a,playNarration:T=>void On(d,T)});return await n.start()?(ct={canvas:e,stop:n.stop},!0):(a(),!1)}var qn=F('<div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div>'),Fn=F('<p class="editorial svelte-1je9b37"> </p>'),Gn=F('<div class="story svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <p class="story-text svelte-1je9b37"> </p></div>'),jn=F('<button type="button" class="resident-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></button>'),Hn=F('<span class="resident-label"> </span>'),Wn=F('<li class="svelte-1je9b37"><span class="agency-dot svelte-1je9b37" aria-hidden="true"></span> <!></li>'),In=F('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="residents svelte-1je9b37"></ul></div>'),Nn=F('<a class="firsts-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></a>'),Vn=F('<span class="firsts-label"> </span>'),Xn=F('<li class="svelte-1je9b37"><span class="firsts-year svelte-1je9b37"> </span> <!></li>'),Jn=F('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="firsts svelte-1je9b37"></ul></div>'),Yn=F('<div class="science-block svelte-1je9b37"><h3 class="library-heading svelte-1je9b37"> </h3> <!></div>'),Qn=F('<div class="head svelte-1je9b37"><div class="kind-row svelte-1je9b37"><span class="kind svelte-1je9b37"> </span></div> <div class="name svelte-1je9b37"> </div> <div class="stat-row svelte-1je9b37"><div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div> <!></div></div> <!> <!> <!> <!> <!>',1);function Ps(d,e){Ue(e,!0);let s=_e(e,"selectableIds",19,()=>new Set);function a(l){if(typeof l=="number")return l>=1e3?`${l.toLocaleString("en-US")} km`:`${l} km`;const t=m=>m.toLocaleString("en-US");return`${t(l[0])} - ${t(l[1])} km`}function n(l){const t=m=>m>=1e3?m.toLocaleString("en-US"):m.toString();return typeof l=="number"?`${t(l)} AU`:`${t(l[0])} - ${t(l[1])} AU`}function g(l){return l.altitude_km!=null?a(l.altitude_km):l.distance_au!=null?n(l.distance_au):""}function T(l){switch(l){case"NASA":case"SpaceX":return"#3b82f6";case"ROSCOSMOS":return"#ef4444";case"CNSA":return"#dc2626";case"ISRO":return"#f97316";case"JAXA":return"#1d4ed8";case"ESA":case"Arianespace":return"#1d4ed8";case"UAESA":return"#00732F";default:return"rgba(255,255,255,0.5)"}}{let l=Me(()=>{var t;return((t=e.regime)==null?void 0:t.name)??""});fn(d,{get open(){return e.open},get onClose(){return e.onClose},get title(){return v(l)},zIndex:28,children:(t,m)=>{var B=Oe(),x=ze(B);{var r=j=>{var H=Qn(),X=ze(H);let J;var ee=o(X),c=o(ee),h=o(c,!0);i(c),i(ee);var _=p(ee,2),R=o(_,!0);i(_);var D=p(_,2),$=o(D),N=o($),A=o(N,!0);i(N);var O=p(N,2),re=o(O,!0);i(O),i($);var ce=p($,2);{var L=y=>{var E=qn(),k=o(E),V=o(k,!0);i(k);var I=p(k,2),Q=o(I,!0);i(I),i(E),C(te=>{u(V,te),u(Q,e.regime.firsts[0].year)},[()=>rn()]),b(y,E)};W(ce,y=>{e.regime.firsts&&e.regime.firsts.length>0&&y(L)})}i(D),i(X);var U=p(X,2);{var S=y=>{var E=Fn(),k=o(E,!0);i(E),C(()=>u(k,e.regime.comparison)),b(y,E)};W(U,y=>{e.regime.comparison&&y(S)})}var K=p(U,2);{var P=y=>{var E=Gn(),k=o(E),V=o(k,!0);i(k);var I=p(k,2),Q=o(I,!0);i(I),i(E),C(te=>{u(V,te),u(Q,e.regime.story)},[()=>on()]),b(y,E)};W(K,y=>{e.regime.story&&y(P)})}var f=p(K,2);{var M=y=>{var E=In(),k=o(E),V=o(k,!0);i(k);var I=p(k,2);ut(I,21,()=>e.regime.residents,Q=>Q.id,(Q,te)=>{const be=Me(()=>s().has(v(te).id)&&e.onResidentClick!=null);var pe=Wn(),Ee=o(pe);let xe;var ye=p(Ee,2);{var Le=Z=>{var ie=jn(),we=o(ie);wt(),i(ie),C(()=>u(we,`${v(te).label??""} `)),De("click",ie,()=>{var qe;return(qe=e.onResidentClick)==null?void 0:qe.call(e,v(te).id)}),b(Z,ie)},fe=Z=>{var ie=Hn(),we=o(ie,!0);i(ie),C(()=>u(we,v(te).label)),b(Z,ie)};W(ye,Z=>{v(be)?Z(Le):Z(fe,-1)})}i(pe),C(Z=>xe=Ve(Ee,"",xe,Z),[()=>({background:T(v(te).agency)})]),b(Q,pe)}),i(I),i(E),C(Q=>u(V,Q),[()=>ln()]),b(y,E)};W(f,y=>{e.regime.residents&&e.regime.residents.length>0&&y(M)})}var G=p(f,2);{var Y=y=>{var E=Jn(),k=o(E),V=o(k,!0);i(k);var I=p(k,2);ut(I,21,()=>e.regime.firsts,ma,(Q,te)=>{var be=Xn(),pe=o(be),Ee=o(pe,!0);i(pe);var xe=p(pe,2);{var ye=fe=>{var Z=Nn(),ie=o(Z);wt(),i(Z),C(()=>{ke(Z,"href",`${Rt??""}/missions?id=${v(te).mission_id??""}`),u(ie,`${v(te).label??""} `)}),b(fe,Z)},Le=fe=>{var Z=Vn(),ie=o(Z,!0);i(Z),C(()=>u(ie,v(te).label)),b(fe,Z)};W(xe,fe=>{v(te).mission_id?fe(ye):fe(Le,-1)})}i(be),C(()=>u(Ee,v(te).year)),b(Q,be)}),i(I),i(E),C(Q=>u(V,Q),[()=>cn()]),b(y,E)};W(G,y=>{e.regime.firsts&&e.regime.firsts.length>0&&y(Y)})}var oe=p(G,2);{var ue=y=>{var E=Yn(),k=o(E),V=o(k,!0);i(k);var I=p(k,2);vn(I,{get tab(){return e.regime.science_link.tab},get section(){return e.regime.science_link.section}}),i(E),C(Q=>u(V,Q),[()=>dn()]),b(y,E)};W(oe,y=>{e.regime.science_link&&y(ue)})}C((y,E)=>{J=Ve(X,"",J,{"--regime-color":e.regime.color}),u(h,e.regime.short??e.regime.id),u(R,e.regime.name??e.regime.id),u(A,y),u(re,E)},[()=>sn(),()=>g(e.regime)]),b(j,H)};W(x,j=>{e.regime&&j(r)})}b(t,B)},$$slots:{default:!0}})}Ce()}Je(["click"]);export{Xe as B,Ts as E,_n as L,Ss as O,ks as P,Ps as R,As as S,Ms as T,Kt as a,xs as b,ys as c,zt as d,ws as e,mt as f,Es as g,Bs as l};
