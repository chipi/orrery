const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_app/immutable/chunks/DUFRl97Y.js","_app/immutable/chunks/Cn0vh-Bc.js","_app/immutable/chunks/BpWGNCGv.js","_app/immutable/chunks/DUo68cZG.js","_app/immutable/chunks/D95lW1Ed.js","_app/immutable/chunks/DUZ6bAsh.js","_app/immutable/chunks/Dtih9zdv.js","_app/immutable/chunks/BHsOndvw.js","_app/immutable/chunks/BbeNRzl4.js","_app/immutable/chunks/CHEu2MNX.js","_app/immutable/chunks/B0XwC4Ot.js","_app/immutable/chunks/7mk2TFnf.js","_app/immutable/chunks/DbpFyQsh.js","_app/immutable/chunks/CPwLOqZt.js","_app/immutable/chunks/DmDmg5ql.js","_app/immutable/chunks/Bv6SoQKO.js","_app/immutable/chunks/XIgoAO8U.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DdAW_0EA.js","_app/immutable/chunks/CbQ5P7iv.js","_app/immutable/chunks/4-47NKPp.js","_app/immutable/chunks/C2Q9kMI2.js","_app/immutable/chunks/Xj6meh5r.js","_app/immutable/chunks/Co5Gl554.js","_app/immutable/chunks/B79LgCJy.js","_app/immutable/chunks/BYFaZ8LE.js","_app/immutable/chunks/DT7rFlVh.js","_app/immutable/chunks/DT4DP4DU.js","_app/immutable/chunks/Dpti9oy3.js","_app/immutable/chunks/D07fj58g.js","_app/immutable/chunks/-UyI9lYi.js","_app/immutable/chunks/DUbQrKN4.js","_app/immutable/chunks/BVHyKRY2.js","_app/immutable/chunks/B0s5kzqy.js","_app/immutable/chunks/BcMdW1Rq.js","_app/immutable/assets/feedback.DSDG94aB.css"])))=>i.map(i=>d[i]);
import{a7 as ia,a5 as yt,a8 as dt,a9 as Be,aa as oa,Z as ht,_ as zt,V as ge,F as la,ab as Ne,U as Ct,u as ca,ac as Ve,M as da,ad as Oe,ae as ua,I as fa,af as va}from"./DUZ6bAsh.js";import"./CWj6FrbW.js";import{p as Ce,aN as i,aO as r,d as h,g as v,t as U,b,e as Ue,aP as Me,c as q,a as de,aT as Fe,f as ze,s as Pe,aV as le,aQ as wt}from"./BpWGNCGv.js";import{d as Qe,s as f,a as Ke}from"./BbeNRzl4.js";import{i as W}from"./C2Q9kMI2.js";import{e as ut,i as ma}from"./CwT4KfCE.js";import{s as Ae}from"./Xj6meh5r.js";import{s as pt}from"./Co5Gl554.js";import{s as Xe}from"./BYFaZ8LE.js";import{p as _e}from"./DT4DP4DU.js";import{e as ha,a as pa,b as _a,w as ga,c as ba,d as xa,f as ya,g as wa,h as Sa,i as Aa,t as ka,j as Ma,k as Ea,l as Ta,m as Ba,n as Pa,o as za,p as Ca,q as Ua,r as La,s as Ra,u as Da,v as Ka,x as Oa,y as Fa,z as qa,A as Ga,B as ja,C as Ha,D as Wa,E as Ia,F as Na,G as Va,H as Xa,I as Ja,J as Qa,K as Ya,L as Za,M as $a,N as en,O as tn,P as an,Q as nn,R as sn,S as rn,T as on,U as ln,V as cn,W as dn}from"./CM9neoqH.js";import{o as Ye}from"./BHsOndvw.js";import{o as un}from"./DZvyoDej.js";import{b as Ut}from"./DT7rFlVh.js";import{b as Lt}from"./Dtih9zdv.js";import"./B0XwC4Ot.js";import{_ as ft}from"./Bv6SoQKO.js";import{C as vt}from"./Cn0vh-Bc.js";import{a as St}from"./D2uCW_lI.js";import{a as rt}from"./BWTiaYql.js";import{P as fn}from"./XIgoAO8U.js";import{S as vn}from"./ClyfjkLk.js";const At=new ht,He=new ge;class Rt extends ia{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],a=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new yt(e,3)),this.setAttribute("uv",new yt(a,2))}applyMatrix4(e){const a=this.attributes.instanceStart,n=this.attributes.instanceEnd;return a!==void 0&&(a.applyMatrix4(e),n.applyMatrix4(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let a;e instanceof Float32Array?a=e:Array.isArray(e)&&(a=new Float32Array(e));const n=new dt(a,6,1);return this.setAttribute("instanceStart",new Be(n,3,0)),this.setAttribute("instanceEnd",new Be(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let a;e instanceof Float32Array?a=e:Array.isArray(e)&&(a=new Float32Array(e));const n=new dt(a,6,1);return this.setAttribute("instanceColorStart",new Be(n,3,0)),this.setAttribute("instanceColorEnd",new Be(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new oa(e.geometry)),this}fromLineSegments(e){const a=e.geometry;return this.setPositions(a.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ht);const e=this.attributes.instanceStart,a=this.attributes.instanceEnd;e!==void 0&&a!==void 0&&(this.boundingBox.setFromBufferAttribute(e),At.setFromBufferAttribute(a),this.boundingBox.union(At))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new zt),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,a=this.attributes.instanceEnd;if(e!==void 0&&a!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let s=0;for(let p=0,B=e.count;p<B;p++)He.fromBufferAttribute(e,p),s=Math.max(s,n.distanceToSquared(He)),He.fromBufferAttribute(a,p),s=Math.max(s,n.distanceToSquared(He));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}Ve.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new ca},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Ne.line={uniforms:Ct.merge([Ve.common,Ve.fog,Ve.line]),vertexShader:`
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
		`};class Dt extends la{constructor(e){super({type:"LineMaterial",uniforms:Ct.clone(Ne.line.uniforms),vertexShader:Ne.line.vertexShader,fragmentShader:Ne.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const it=new Oe,kt=new ge,Mt=new ge,ae=new Oe,ne=new Oe,ve=new Oe,ot=new ge,lt=new fa,se=new ua,Et=new ge,We=new ht,Ie=new zt,me=new Oe;let he,ke;function Tt(c,e,a){return me.set(0,0,-e,1).applyMatrix4(c.projectionMatrix),me.multiplyScalar(1/me.w),me.x=ke/a.width,me.y=ke/a.height,me.applyMatrix4(c.projectionMatrixInverse),me.multiplyScalar(1/me.w),Math.abs(Math.max(me.x,me.y))}function mn(c,e){const a=c.matrixWorld,n=c.geometry,s=n.attributes.instanceStart,p=n.attributes.instanceEnd,B=Math.min(n.instanceCount,s.count);for(let l=0,t=B;l<t;l++){se.start.fromBufferAttribute(s,l),se.end.fromBufferAttribute(p,l),se.applyMatrix4(a);const g=new ge,k=new ge;he.distanceSqToSegment(se.start,se.end,k,g),k.distanceTo(g)<ke*.5&&e.push({point:k,pointOnLine:g,distance:he.origin.distanceTo(k),object:c,face:null,faceIndex:l,uv:null,uv1:null})}}function hn(c,e,a){const n=e.projectionMatrix,p=c.material.resolution,B=c.matrixWorld,l=c.geometry,t=l.attributes.instanceStart,g=l.attributes.instanceEnd,k=Math.min(l.instanceCount,t.count),w=-e.near;he.at(1,ve),ve.w=1,ve.applyMatrix4(e.matrixWorldInverse),ve.applyMatrix4(n),ve.multiplyScalar(1/ve.w),ve.x*=p.x/2,ve.y*=p.y/2,ve.z=0,ot.copy(ve),lt.multiplyMatrices(e.matrixWorldInverse,B);for(let o=0,j=k;o<j;o++){if(ae.fromBufferAttribute(t,o),ne.fromBufferAttribute(g,o),ae.w=1,ne.w=1,ae.applyMatrix4(lt),ne.applyMatrix4(lt),ae.z>w&&ne.z>w)continue;if(ae.z>w){const m=ae.z-ne.z,_=(ae.z-w)/m;ae.lerp(ne,_)}else if(ne.z>w){const m=ne.z-ae.z,_=(ne.z-w)/m;ne.lerp(ae,_)}ae.applyMatrix4(n),ne.applyMatrix4(n),ae.multiplyScalar(1/ae.w),ne.multiplyScalar(1/ne.w),ae.x*=p.x/2,ae.y*=p.y/2,ne.x*=p.x/2,ne.y*=p.y/2,se.start.copy(ae),se.start.z=0,se.end.copy(ne),se.end.z=0;const X=se.closestPointToPointParameter(ot,!0);se.at(X,Et);const J=va.lerp(ae.z,ne.z,X),ee=J>=-1&&J<=1,d=ot.distanceTo(Et)<ke*.5;if(ee&&d){se.start.fromBufferAttribute(t,o),se.end.fromBufferAttribute(g,o),se.start.applyMatrix4(B),se.end.applyMatrix4(B);const m=new ge,_=new ge;he.distanceSqToSegment(se.start,se.end,_,m),a.push({point:_,pointOnLine:m,distance:he.origin.distanceTo(_),object:c,face:null,faceIndex:o,uv:null,uv1:null})}}}class pn extends da{constructor(e=new Rt,a=new Dt({color:Math.random()*16777215})){super(e,a),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,a=e.attributes.instanceStart,n=e.attributes.instanceEnd,s=new Float32Array(2*a.count);for(let B=0,l=0,t=a.count;B<t;B++,l+=2)kt.fromBufferAttribute(a,B),Mt.fromBufferAttribute(n,B),s[l]=l===0?0:s[l-1],s[l+1]=s[l]+kt.distanceTo(Mt);const p=new dt(s,2,1);return e.setAttribute("instanceDistanceStart",new Be(p,1,0)),e.setAttribute("instanceDistanceEnd",new Be(p,1,1)),this}raycast(e,a){const n=this.material.worldUnits,s=e.camera;if(s===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;const p=e.params.Line2!==void 0&&e.params.Line2.threshold||0;he=e.ray;const B=this.matrixWorld,l=this.geometry,t=this.material;ke=t.linewidth+p,l.boundingSphere===null&&l.computeBoundingSphere(),Ie.copy(l.boundingSphere).applyMatrix4(B);let g;if(n)g=ke*.5;else{const w=Math.max(s.near,Ie.distanceToPoint(he.origin));g=Tt(s,w,t.resolution)}if(Ie.radius+=g,he.intersectsSphere(Ie)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),We.copy(l.boundingBox).applyMatrix4(B);let k;if(n)k=ke*.5;else{const w=Math.max(s.near,We.distanceToPoint(he.origin));k=Tt(s,w,t.resolution)}We.expandByScalar(k),he.intersectsBox(We)!==!1&&(n?mn(this,a):hn(this,s,a))}onBeforeRender(e){const a=this.material.uniforms;a&&a.resolution&&(e.getViewport(it),this.material.uniforms.resolution.value.set(it.z,it.w))}}class _n extends Rt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const a=e.length-3,n=new Float32Array(2*a);for(let s=0;s<a;s+=3)n[2*s]=e[s],n[2*s+1]=e[s+1],n[2*s+2]=e[s+2],n[2*s+3]=e[s+3],n[2*s+4]=e[s+4],n[2*s+5]=e[s+5];return super.setPositions(n),this}setColors(e){const a=e.length-3,n=new Float32Array(2*a);for(let s=0;s<a;s+=3)n[2*s]=e[s],n[2*s+1]=e[s+1],n[2*s+2]=e[s+2],n[2*s+3]=e[s+3],n[2*s+4]=e[s+4],n[2*s+5]=e[s+5];return super.setColors(n),this}setFromPoints(e){const a=e.length-1,n=new Float32Array(6*a);for(let s=0;s<a;s++)n[6*s]=e[s].x,n[6*s+1]=e[s].y,n[6*s+2]=e[s].z||0,n[6*s+3]=e[s+1].x,n[6*s+4]=e[s+1].y,n[6*s+5]=e[s+1].z||0;return super.setPositions(n),this}fromLine(e){const a=e.geometry;return this.setPositions(a.attributes.position.array),this}}class ws extends pn{constructor(e=new _n,a=new Dt({color:Math.random()*16777215})){super(e,a),this.isLine2=!0,this.type="Line2"}}const ct=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function Ss(c){for(let e=0;e<ct.length-1;e++){const[a,n]=ct[e],[s,p]=ct[e+1];if(c>=a&&c<=s)return n+(c-a)/(s-a)*(p-n)}return 512}function Bt(c){return 8.5+5.2*Math.log10(1+c/200)}function As(c,e){return c+(Bt(e)-Bt(0))}var gn=q('<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>'),bn=q('<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>'),xn=q('<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>'),yn=q('<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>'),wn=q('<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>');function ks(c,e){Ce(e,!0);let a=_e(e,"highlightRegime",3,null),n=_e(e,"anchorBottomPx",3,80);function s(d){return d==null?0:typeof d=="number"?d:(d[0]+d[1])/2}function p(d){return d.altitude_km!=null?s(d.altitude_km):s(d.distance_au)}let B=Me(()=>e.order?e.order.map(d=>e.regimes.find(m=>m.id===d)).filter(d=>d!=null):[...e.regimes].sort((d,m)=>p(m)-p(d)));function l(d){if(typeof d=="number")return d>=1e3?`${(d/1e3).toFixed(0)},000 km`:`${d} km`;const[m,_]=d,R=D=>D>=1e3?`${(D/1e3).toFixed(0)}k`:`${D}`;return`${R(m)}-${R(_)} km`}function t(d){const m=_=>_<10?_.toFixed(1):_<1e3?_.toFixed(0):_<1e4?`${(_/1e3).toFixed(1)}k`:`${(_/1e3).toFixed(0)}k`;return typeof d=="number"?`${m(d)} AU`:`${m(d[0])}-${m(d[1])} AU`}function g(d){return d.altitude_km!=null?l(d.altitude_km):d.distance_au!=null?t(d.distance_au):""}var k=wn();let w;var o=i(k),j=i(o,!0);r(o);var H=h(o,2),X=i(H);ut(X,17,()=>v(B),d=>d.id,(d,m)=>{var _=xn(),R=i(_);let D,$;var N=i(R);{var M=S=>{var K=gn();b(S,K)},O=S=>{var K=bn();b(S,K)};W(N,S=>{v(m).id===a()?S(M):S(O,-1)})}var re=h(N,2),ce=i(re,!0);r(re);var L=h(re,2),C=i(L,!0);r(L),r(R),r(_),U(S=>{D=pt(R,1,"band svelte-1v3z2gg",null,D,{"band--highlighted":v(m).id===a()}),Ae(R,"aria-current",v(m).id===a()?"true":void 0),$=Xe(R,"",$,{"--regime-color":v(m).color}),f(ce,v(m).short??v(m).id),f(C,S)},[()=>g(v(m))]),Ke("click",R,()=>e.onSelect(v(m).id)),b(d,_)});var J=h(X,2);{var ee=d=>{const m=Me(()=>e.surfaceAnchor??{label:_a(),value:"0 km"});var _=yn(),R=h(i(_),2),D=i(R,!0);r(R);var $=h(R,2),N=i($,!0);r($),r(_),U(()=>{f(D,v(m).label),f(N,v(m).value)}),b(d,_)};W(J,d=>{e.surfaceAnchor!==null&&d(ee)})}r(H),r(k),U((d,m)=>{Ae(k,"aria-label",d),w=Xe(k,"",w,{"--ruler-bottom":`${n()??""}px`}),f(j,m)},[()=>ha(),()=>pa()]),b(c,k),Ue()}Qe(["click"]);const Ms={mercury:{diameterKm:4880,diameterRatioEarth:.38,surfaceGravityG:.38,atmoBar:0,atmoComposition:"Na · K · O · H exosphere (trace)",surfaceTempK:440,maxWindMs:0,escapeKms:4.3,surfaceKind:"rocky",radiation:"extreme"},venus:{diameterKm:12104,diameterRatioEarth:.95,surfaceGravityG:.91,atmoBar:92,atmoComposition:"CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck",surfaceTempK:737,maxWindMs:1,escapeKms:10.4,surfaceKind:"rocky",radiation:"shielded"},earth:{diameterKm:12742,diameterRatioEarth:1,surfaceGravityG:1,atmoBar:1,atmoComposition:"N₂ 78% · O₂ 21% · Ar 0.9%",surfaceTempK:288,maxWindMs:50,escapeKms:11.2,surfaceKind:"rocky-liquid",radiation:"shielded"},moon:{diameterKm:3474,diameterRatioEarth:.273,surfaceGravityG:.165,atmoBar:0,atmoComposition:"He · Ar · Na exosphere (trace)",surfaceTempK:250,maxWindMs:0,escapeKms:2.38,surfaceKind:"rocky",radiation:"high"},mars:{diameterKm:6779,diameterRatioEarth:.53,surfaceGravityG:.38,atmoBar:.006,atmoComposition:"CO₂ 95% · N₂ 2.8% · Ar 2%",surfaceTempK:210,maxWindMs:30,escapeKms:5,surfaceKind:"rocky",radiation:"high"},jupiter:{diameterKm:139820,diameterRatioEarth:10.97,surfaceGravityG:2.53,atmoBar:1,atmoComposition:"H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds",surfaceTempK:165,maxWindMs:100,escapeKms:59.5,surfaceKind:"gas-giant",radiation:"extreme"},saturn:{diameterKm:116460,diameterRatioEarth:9.14,surfaceGravityG:1.07,atmoBar:1,atmoComposition:"H₂ 96% · He 3% · CH₄/NH₃ clouds",surfaceTempK:134,maxWindMs:500,escapeKms:35.5,surfaceKind:"gas-giant",radiation:"high"},uranus:{diameterKm:50724,diameterRatioEarth:3.98,surfaceGravityG:.89,atmoBar:1,atmoComposition:"H₂ 83% · He 15% · CH₄ 2.3%",surfaceTempK:76,maxWindMs:250,escapeKms:21.3,surfaceKind:"ice-giant",radiation:"moderate"},neptune:{diameterKm:49244,diameterRatioEarth:3.86,surfaceGravityG:1.14,atmoBar:1,atmoComposition:"H₂ 80% · He 19% · CH₄ 1.5%",surfaceTempK:72,maxWindMs:580,escapeKms:23.5,surfaceKind:"ice-giant",radiation:"moderate"},pluto:{diameterKm:2376,diameterRatioEarth:.19,surfaceGravityG:.06,atmoBar:1e-6,atmoComposition:"N₂ + CH₄ + CO (~10 μbar, sublimates)",surfaceTempK:44,maxWindMs:0,escapeKms:1.2,surfaceKind:"rocky-ice",radiation:"shielded"}},mt=8.317,Sn=299792.458*60;function Pt(c,e=1){return{fromSunMin:c*mt,fromEarthMin:Math.abs(c-e)*mt}}function An(c,e){return{fromSunMin:c*mt,fromEarthMin:e/Sn}}const Es={earth:{rotationHours:23.93,lightTime:Pt(1)},moon:{rotationHours:655.7,lightTime:An(1,384400)},mars:{rotationHours:24.62,lightTime:Pt(1.524)}},Je={mars:{core:"#fff1e6",bright:"#ff9a4d",mid:"#ff6a2e",deep:"#c8371a",glowRGB:"255,122,60"},earth:{core:"#ecffff",bright:"#7fe0ff",mid:"#3aa0ff",deep:"#2b6cff",glowRGB:"90,190,255"},moon:{core:"#ffffff",bright:"#e6ebf5",mid:"#c1c6d4",deep:"#9298aa",glowRGB:"205,213,233"}};var kn=q('<span class="wave-hint svelte-njfz5t"> </span>'),Mn=q('<div role="button" tabindex="0"><canvas class="wave-canvas svelte-njfz5t"></canvas> <div class="wave-caption svelte-njfz5t"><span class="wave-cue svelte-njfz5t" aria-hidden="true"><!></span> <!></div></div>');function En(c,e){Ce(e,!0);const a={earth:{amp:1,rolloff:.15,noise:.2,caption:()=>wa(),src:"audio/atmosphere/earth-wind.mp3"},mars:{amp:.55,rolloff:.78,noise:.14,caption:()=>ya(),src:"audio/atmosphere/mars-wind.mp3"},moon:{amp:0,rolloff:1,noise:0,caption:()=>xa(),src:null}},n=Me(()=>a[e.bodyKey]??null);let s=Pe(null),p=Pe(!1),B=Pe(!1),l=()=>{};Ye(()=>{var P;if(!v(s)||!v(n))return;const w=v(s),o=w.getContext("2d");if(!o)return;const j=v(n),H=Je[e.bodyKey]??Je.earth,X=typeof window<"u"&&((P=window.matchMedia)==null?void 0:P.call(window,"(prefers-reduced-motion: reduce)").matches),J=u=>`rgba(${H.glowRGB},${u})`,ee=u=>Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,u))),.55);let d=null,m=null,_=null,R=null,D=null;const $=()=>{try{D==null||D.stop()}catch{}D=null,de(p,!1)};l=async()=>{if(j.src){if(v(p))return $();try{if(d||(d=new AudioContext,m=d.createAnalyser(),m.fftSize=128,m.smoothingTimeConstant=.75,m.connect(d.destination),_=new Uint8Array(m.frequencyBinCount)),await d.resume(),!R){de(B,!0);const u=await fetch(`${Lt}/${j.src}`);R=await d.decodeAudioData(await u.arrayBuffer()),de(B,!1)}D=d.createBufferSource(),D.buffer=R,D.connect(m),D.onended=()=>{de(p,!1),D=null},D.start(),de(p,!0)}catch{de(B,!1),de(p,!1)}}};const N=()=>{const u=w.clientWidth||300,E=w.clientHeight||74;return{w:u,h:E,mid:E/2,maxA:E/2*.9}},M=()=>{const u=window.devicePixelRatio||1,{w:E,h:G}=N();w.width=Math.round(E*u),w.height=Math.round(G*u),o.setTransform(u,0,0,u,0,0)};M();const O=new ResizeObserver(M);O.observe(w);const re=(u,E,G,Q,oe)=>{if(v(p)&&_&&_.length){const ue=Math.min(_.length-1,Math.floor(u*_.length));return .12+.95*(_[ue]/255)}return .55+.45*Math.sin(E*Q+u*G*Math.PI*2+oe)*Math.sin(E*.7+u*3)},ce=()=>{const{w:u,h:E,mid:G}=N();o.clearRect(0,0,u,E),o.save(),o.shadowColor=J(.8),o.shadowBlur=8,o.strokeStyle=H.core,o.globalAlpha=.85,o.lineWidth=1.4,o.beginPath(),o.moveTo(3,G),o.lineTo(u-3,G),o.stroke(),o.restore()},L=u=>{const{w:E,h:G,mid:Q,maxA:oe}=N();o.clearRect(0,0,E,G),v(p)&&m&&_&&m.getByteFrequencyData(_);const ue=[{hue:H.deep,a:.22,sc:1,fx:2.1,sp:1.1,ph:0},{hue:H.mid,a:.28,sc:.78,fx:3.3,sp:1.7,ph:1.7},{hue:H.bright,a:.34,sc:.55,fx:4.9,sp:2.3,ph:3.1}];o.save(),o.globalCompositeOperation="lighter";for(const x of ue){const T=[];for(let A=0;A<=E;A+=3){const V=A/E,I=oe*x.sc*j.amp*ee(V)*Math.max(0,re(V,u,x.fx,x.sp,x.ph));T.push([A,Q-I])}o.beginPath(),T.forEach(([A,V],I)=>I===0?o.moveTo(A,V):o.lineTo(A,V));for(let A=T.length-1;A>=0;A--)o.lineTo(T[A][0],Q+(Q-T[A][1]));o.closePath(),o.fillStyle=x.hue,o.globalAlpha=x.a,o.fill()}o.restore(),o.save(),o.shadowColor=J(.9),o.shadowBlur=8,o.strokeStyle=H.core,o.lineWidth=1.2,o.globalAlpha=.9,o.beginPath();for(let x=0;x<=E;x+=3){const T=x/E,A=v(p)?re(T,u,0,0,0):.6+.4*Math.sin(u*2.2+T*9),V=.5*oe*j.amp*ee(T)*A;x===0?o.moveTo(x,Q-V):o.lineTo(x,Q-V)}o.stroke(),o.restore()},C=u=>j.amp===0?ce():L(u);let S=0,K=!1;if(X&&!v(p)){C(.9);const u=()=>{K||(v(p)&&C(performance.now()/1e3),S=requestAnimationFrame(u))};S=requestAnimationFrame(u)}else{const u=performance.now(),E=()=>{K||(C((performance.now()-u)/1e3),S=requestAnimationFrame(E))};S=requestAnimationFrame(E)}return()=>{K=!0,cancelAnimationFrame(S),O.disconnect(),$(),d==null||d.close().catch(()=>{})}});var t=Fe(),g=ze(t);{var k=w=>{var o=Mn();let j;var H=i(o);Ut(H,M=>de(s,M),()=>v(s));var X=h(H,2),J=i(X),ee=i(J);{var d=M=>{var O=le("◎");b(M,O)},m=M=>{var O=le("···");b(M,O)},_=M=>{var O=le("⏸");b(M,O)},R=M=>{var O=le("▶");b(M,O)};W(ee,M=>{v(n).src?v(B)?M(m,1):v(p)?M(_,2):M(R,-1):M(d)})}r(J);var D=h(J),$=h(D);{var N=M=>{var O=kn(),re=i(O);r(O),U(ce=>f(re,`· ${ce??""}`),[()=>v(p)?Sa():Aa()]),b(M,O)};W($,M=>{v(n).src&&M(N)})}r(X),r(o),U((M,O)=>{j=pt(o,1,"wave-tile svelte-njfz5t",null,j,{silent:!v(n).src}),Ae(o,"aria-label",M),f(D,` ${O??""} `)},[()=>v(n).src?ga():ba(),()=>v(n).caption()]),Ke("click",o,()=>l()),Ke("keydown",o,M=>{(M.key==="Enter"||M.key===" ")&&(M.preventDefault(),l())}),b(w,o)};W(g,w=>{v(n)&&w(k)})}b(c,t),Ue()}Qe(["click","keydown"]);var Tn=q('<div class="tiles svelte-157rl9q" aria-hidden="true"><canvas class="tiles-canvas svelte-157rl9q"></canvas></div>');function Bn(c,e){Ce(e,!0);let a=_e(e,"rotationHours",3,null),n=Pe(null);Ye(()=>{var ce;if(!v(n)||!e.stats)return;const l=v(n),t=l.getContext("2d");if(!t)return;const g=e.stats,k=Je[e.bodyKey]??Je.earth,w=typeof window<"u"&&((ce=window.matchMedia)==null?void 0:ce.call(window,"(prefers-reduced-motion: reduce)").matches),o=L=>`rgba(${k.glowRGB},${L})`,j=a()!=null?Math.min(45,Math.max(3.5,Math.abs(a())/4)):null,H=a()==null?"—":Math.abs(a())<48?`${Math.abs(a()).toFixed(1)} h`:`${(Math.abs(a())/24).toFixed(1)} d`,X=Math.min(.92,Math.max(.18,.34/Math.max(.05,g.surfaceGravityG))),J=Math.min(1,Math.max(0,(g.surfaceTempK-90)/230)),ee=g.atmoBar<=0?0:Math.min(1,Math.max(0,(Math.log10(g.atmoBar)+3)/3)),d=g.atmoBar===0?ka():g.atmoBar<.01?`${(g.atmoBar*1e3).toFixed(0)} mbar`:g.atmoBar<10?`${g.atmoBar.toFixed(1)} bar`:`${g.atmoBar.toFixed(0)} bar`,m=()=>{const L=window.devicePixelRatio||1,C=l.clientWidth||300,S=l.clientHeight||58;l.width=Math.round(C*L),l.height=Math.round(S*L),t.setTransform(L,0,0,L,0,0)};m();const _=new ResizeObserver(m);_.observe(l);const R=(L,C,S,K,P=7)=>{t.fillStyle=K,t.font=`${P}px "Space Mono", monospace`,t.textAlign="center",t.fillText(L,C,S)},D=(L,C,S,K)=>{const P=L+C/2,u=S*.46,E=Math.min(C,S)*.26;R("SPIN",P,9,o(.65),6),t.strokeStyle=o(.35),t.lineWidth=1,t.beginPath(),t.arc(P,u,E,0,Math.PI*2),t.stroke(),t.strokeStyle=o(.5),t.beginPath(),t.moveTo(P,u-E),t.lineTo(P,u-E+3),t.stroke();const G=-Math.PI/2+(j?K/j*Math.PI*2:0);t.save(),t.shadowColor=o(.9),t.shadowBlur=5,t.strokeStyle=k.bright,t.lineWidth=1.4,t.beginPath(),t.moveTo(P,u),t.lineTo(P+Math.cos(G)*E*.82,u+Math.sin(G)*E*.82),t.stroke(),t.restore(),t.fillStyle=k.core,t.beginPath(),t.arc(P,u,1.6,0,Math.PI*2),t.fill(),R(H,P,S-3,"rgba(255,255,255,0.7)",7)},$=(L,C,S,K)=>{const P=L+C/2,u=S*.78,E=15;R("GRAV",P,9,o(.65),6),t.strokeStyle=o(.25),t.lineWidth=1,t.beginPath(),t.moveTo(P-C*.28,u),t.lineTo(P+C*.28,u),t.stroke();const G=2.2,Q=K%G/G,oe=4*Q*(1-Q),ue=u-oe*X*(u-E);t.save(),t.shadowColor=o(.9),t.shadowBlur=6,t.fillStyle=k.bright,t.beginPath(),t.arc(P,ue,2.6,0,Math.PI*2),t.fill(),t.restore(),R(`${g.surfaceGravityG.toFixed(2)} g`,P,S-3,"rgba(255,255,255,0.7)",7)},N=(L,C,S)=>{const K=L+C/2,P=L+C*.16,u=C*.68;R("AIR",K,9,o(.65),6);const E=S*.36,G=t.createLinearGradient(P,0,P+u,0);G.addColorStop(0,"rgba(90,150,255,0.85)"),G.addColorStop(.5,"rgba(220,220,220,0.7)"),G.addColorStop(1,"rgba(255,110,60,0.9)"),t.fillStyle=G,t.fillRect(P,E,u,4);const Q=P+J*u;t.fillStyle=k.core,t.beginPath(),t.moveTo(Q,E-3),t.lineTo(Q-2.5,E-.5),t.lineTo(Q+2.5,E-.5),t.closePath(),t.fill();const oe=S*.56;t.strokeStyle=o(.25),t.lineWidth=3,t.beginPath(),t.moveTo(P,oe),t.lineTo(P+u,oe),t.stroke(),t.strokeStyle=k.bright,t.beginPath(),t.moveTo(P,oe),t.lineTo(P+Math.max(2,ee*u),oe),t.stroke(),R(`${g.surfaceTempK} K · ${d}`,K,S-3,"rgba(255,255,255,0.7)",7)},M=L=>{const C=l.clientWidth||300,S=l.clientHeight||58;t.clearRect(0,0,C,S);const K=C/3;t.strokeStyle="rgba(255,255,255,0.08)",t.lineWidth=1;for(const P of[K,K*2])t.beginPath(),t.moveTo(P,6),t.lineTo(P,S-12),t.stroke();D(0,K,S,L),$(K,K,S,L),N(K*2,K,S)};let O=0,re=!1;if(w)M(.55);else{const L=performance.now(),C=()=>{re||(M((performance.now()-L)/1e3),O=requestAnimationFrame(C))};O=requestAnimationFrame(C)}return()=>{re=!0,cancelAnimationFrame(O),_.disconnect()}});var s=Fe(),p=ze(s);{var B=l=>{var t=Tn(),g=i(t);Ut(g,k=>de(n,k),()=>v(n)),r(t),b(l,t)};W(p,l=>{e.stats&&l(B)})}b(c,s),Ue()}var Pn=q('<div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> <!></span></div>'),zn=q('<div><div class="scan-eyebrow svelte-1k90nq4" aria-hidden="true"> </div> <!> <div class="scan-decor" aria-hidden="true"><!> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value scan-value-wrap svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <!></div></div>');function Ts(c,e){Ce(e,!0);let a=_e(e,"rotationHours",3,null),n=_e(e,"lightTime",3,null),s=_e(e,"focusGate",3,!0),p=_e(e,"placement",3,"bottom-center"),B=_e(e,"inline",3,!1),l=Pe(!1);Ye(()=>{const w=un("planet-stats",o=>{de(l,o,!0)});return()=>w==null?void 0:w()});var t=Fe(),g=ze(t);{var k=w=>{var o=zn();let j;var H=i(o),X=i(H,!0);r(H);var J=h(H,2);{let y=Me(()=>e.bodyLabel.toLowerCase());En(J,{get bodyKey(){return v(y)}})}var ee=h(J,2),d=i(ee);{let y=Me(()=>e.bodyLabel.toLowerCase());Bn(d,{get bodyKey(){return v(y)},get stats(){return e.stats},get rotationHours(){return a()}})}var m=h(d,2),_=i(m),R=i(_,!0);r(_);var D=h(_,2),$=i(D);r(D),r(m);var N=h(m,2),M=i(N),O=i(M,!0);r(M);var re=h(M,2),ce=i(re,!0);r(re),r(N);var L=h(N,2),C=i(L),S=i(C,!0);r(C);var K=h(C,2),P=i(K,!0);r(K),r(L);var u=h(L,2),E=i(u),G=i(E,!0);r(E);var Q=h(E,2),oe=i(Q,!0);r(Q),r(u);var ue=h(u,2),x=i(ue),T=i(x,!0);r(x);var A=h(x,2),V=i(A,!0);r(A),r(ue);var I=h(ue,2),Y=i(I),te=i(Y,!0);r(Y);var be=h(Y,2),pe=i(be);{var Ee=y=>{var z=le();U((F,Re)=>f(z,`${F??""}
            ${Re??""}`),[()=>Math.abs(a())<48?`${Math.abs(a()).toFixed(2)} h`:`${(Math.abs(a())/24).toFixed(1)} d`,()=>a()<0?`· ${Ga()}`:""]),b(y,z)};W(pe,y=>{a()!==null&&y(Ee)})}r(be),r(I);var xe=h(I,2),ye=i(xe),Le=i(ye,!0);r(ye);var fe=h(ye,2),Z=i(fe);r(fe),r(xe);var ie=h(xe,2),we=i(ie),qe=i(we,!0);r(we);var gt=h(we,2),Ot=i(gt);r(gt),r(ie);var Ze=h(ie,2),$e=i(Ze),Ft=i($e,!0);r($e);var bt=h($e,2),qt=i(bt);{var Gt=y=>{var z=le();U(F=>f(z,F),[()=>ja()]),b(y,z)},jt=y=>{var z=le();U(F=>f(z,F),[()=>Ha()]),b(y,z)},Ht=y=>{var z=le();U(F=>f(z,F),[()=>Wa()]),b(y,z)},Wt=y=>{var z=le();U(F=>f(z,F),[()=>Ia()]),b(y,z)},It=y=>{var z=le();U(F=>f(z,F),[()=>Na()]),b(y,z)};W(qt,y=>{e.stats.surfaceKind==="rocky"?y(Gt):e.stats.surfaceKind==="rocky-liquid"?y(jt,1):e.stats.surfaceKind==="rocky-ice"?y(Ht,2):e.stats.surfaceKind==="gas-giant"?y(Wt,3):y(It,-1)})}r(bt),r(Ze);var et=h(Ze,2),tt=i(et),Nt=i(tt,!0);r(tt);var xt=h(tt,2),Vt=i(xt);{var Xt=y=>{var z=le();U(F=>f(z,F),[()=>Va()]),b(y,z)},Jt=y=>{var z=le();U(F=>f(z,F),[()=>Xa()]),b(y,z)},Qt=y=>{var z=le();U(F=>f(z,F),[()=>Ja()]),b(y,z)},Yt=y=>{var z=le();U(F=>f(z,F),[()=>Qa()]),b(y,z)};W(Vt,y=>{e.stats.radiation==="shielded"?y(Xt):e.stats.radiation==="moderate"?y(Jt,1):e.stats.radiation==="high"?y(Qt,2):y(Yt,-1)})}r(xt),r(et);var Zt=h(et,2);{var $t=y=>{var z=Pn(),F=i(z),Re=i(F,!0);r(F);var Ge=h(F,2),je=i(Ge),at=h(je);{var nt=Se=>{var Te=le();U(st=>f(Te,`· ${st??""}`),[()=>n().fromEarthMin<60?en({value:n().fromEarthMin.toFixed(1)}):tn({value:(n().fromEarthMin/60).toFixed(2)})]),b(Se,Te)};W(at,Se=>{n().fromEarthMin!==null&&n().fromEarthMin>0&&Se(nt)})}r(Ge),r(z),U((Se,Te)=>{f(Re,Se),f(je,`${Te??""} `)},[()=>Ya(),()=>n().fromSunMin<60?Za({value:n().fromSunMin.toFixed(1)}):$a({value:(n().fromSunMin/60).toFixed(2)})]),b(y,z)};W(Zt,y=>{n()&&y($t)})}r(ee),r(o),U((y,z,F,Re,Ge,je,at,nt,Se,Te,st,ea,ta,aa,na,sa,ra)=>{j=pt(o,1,"tactical-scan svelte-1k90nq4",null,j,{"above-altitude":p()==="above-altitude"&&!B(),inline:B()}),f(X,y),f(R,z),f($,`${F??""} g`),f(O,Re),f(ce,Ge),f(S,je),f(P,e.stats.atmoComposition),f(G,at),f(oe,nt),f(T,Se),f(V,Te),f(te,st),f(Le,ea),f(Z,`${ta??""} km`),f(qe,aa),f(Ot,`${na??""} km/s`),f(Ft,sa),f(Nt,ra)},[()=>Ma({planet:e.bodyLabel}),()=>Ea(),()=>e.stats.surfaceGravityG.toFixed(2),()=>Ta(),()=>e.stats.atmoBar===0?Ba():e.stats.atmoBar<.01?`${(e.stats.atmoBar*1e3).toFixed(2)} mbar`:e.stats.atmoBar<10?`${e.stats.atmoBar.toFixed(2)} bar`:`${e.stats.atmoBar.toFixed(0)} bar`,()=>Pa(),()=>za(),()=>Ca({k:e.stats.surfaceTempK.toString(),c:(e.stats.surfaceTempK-273).toFixed(0)}),()=>Ua(),()=>e.stats.maxWindMs===0?La():Ra({ms:e.stats.maxWindMs.toString()}),()=>Da(),()=>Ka(),()=>e.stats.diameterKm.toLocaleString(),()=>Oa(),()=>e.stats.escapeKms.toFixed(1),()=>Fa(),()=>qa()]),b(w,o)};W(g,w=>{e.stats&&(B()||v(l)&&s())&&w(k)})}b(c,t),Ue()}function Cn(c){const{capacitorPlatform:e,isNative:a,hasWebXR:n}=c;return a&&e==="ios"?"iphone-wrapped":a&&e==="android"?"android-wrapped":!a&&e==="web"&&n?"android-web":"unsupported"}function _t(){return typeof navigator>"u"?"unsupported":Cn({capacitorPlatform:vt.getPlatform(),isNative:vt.isNativePlatform(),hasWebXR:"xr"in navigator&&!!navigator.xr})}function Un(){return typeof navigator>"u"?!1:!vt.isNativePlatform()&&/iPad|iPhone|iPod/.test(navigator.userAgent)}async function Ln(){var e;const c=_t();if(c==="unsupported")return!1;if(c==="iphone-wrapped")return!0;try{return await((e=navigator.xr)==null?void 0:e.isSessionSupported("immersive-ar"))??!1}catch{return!1}}function Rn(c,e){return c!=="unsupported"?"enabled":e?"ios-fallback":"hidden"}async function Bs(){switch(_t()){case"android-web":case"android-wrapped":return(await ft(async()=>{const{createWebXrBackend:c}=await import("./DUFRl97Y.js");return{createWebXrBackend:c}},__vite__mapDeps([0,1,2]))).createWebXrBackend();case"iphone-wrapped":return(await ft(async()=>{const{createArkitBackend:c}=await import("./DUo68cZG.js");return{createArkitBackend:c}},__vite__mapDeps([3,1,2]))).createArkitBackend();default:return null}}var Dn=q('<button type="button" class="enter-ar svelte-50q8yt">AR</button>'),Kn=q('<a class="enter-ar ios-fallback svelte-50q8yt" target="_blank" rel="noopener noreferrer external">AR</a>');function Ps(c,e){Ce(e,!0);let a=Pe("hidden");Ye(async()=>{const t=Rn(_t(),Un());if(t!=="enabled"){de(a,t,!0);return}de(a,await Ln()?"enabled":"hidden",!0)});const n="https://apps.apple.com/app/orrery";var s=Fe(),p=ze(s);{var B=t=>{var g=Dn();U(k=>Ae(g,"aria-label",k),[()=>an()]),Ke("click",g,function(...k){var w;(w=e.onEnter)==null||w.apply(this,k)}),b(t,g)},l=t=>{var g=Kn();Ae(g,"href",n),U(k=>Ae(g,"title",k),[()=>nn()]),b(t,g)};W(p,t=>{v(a)==="enabled"?t(B):v(a)==="ios-fallback"&&t(l,1)})}b(c,s),Ue()}Qe(["click"]);let De=null;const On={explore:"the Solar System",earth:"Earth",moon:"the Moon",mars:"Mars"};function Kt(c,e,a){c.remove(),e.remove(),a.remove(),document.documentElement.classList.remove("ar-active")}async function Fn(c,e){await rt.load();const a=c==="explore"?"/explore":`/${c}`,n=rt.byId(e)??rt.forRoute(a).find(s=>s.persona==="guide");n&&(St.loadEpisode(n),St.play())}async function zs(c){if(De||typeof document>"u")return!1;const e=document.createElement("canvas");e.className="ar-canvas",e.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;z-index:9997;background:transparent;",document.body.appendChild(e);const a=document.createElement("button");a.type="button",a.className="ar-exit-btn",a.textContent="Exit AR",a.onclick=()=>qn(),document.body.appendChild(a);const n=document.createElement("div");n.className="ar-hint",n.textContent=`Point at a surface and tap to place ${On[c]}`,document.body.appendChild(n),document.documentElement.classList.add("ar-active");const{createArScene:s}=await ft(async()=>{const{createArScene:t}=await import("./D95lW1Ed.js");return{createArScene:t}},__vite__mapDeps([4,5,6,7,2,8,9,10,11,12,13,14,1,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35])),p=()=>{Kt(e,a,n),De=null},B=s(c,e,{onExit:p,playNarration:t=>void Fn(c,t),onPlaced:()=>n.remove()});return await B.start()?(De={canvas:e,exitBtn:a,hint:n,stop:B.stop},!0):(p(),!1)}function qn(){const c=De;De=null,c&&(c.stop(),Kt(c.canvas,c.exitBtn,c.hint))}var Gn=q('<div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div>'),jn=q('<p class="editorial svelte-1je9b37"> </p>'),Hn=q('<div class="story svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <p class="story-text svelte-1je9b37"> </p></div>'),Wn=q('<button type="button" class="resident-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></button>'),In=q('<span class="resident-label"> </span>'),Nn=q('<li class="svelte-1je9b37"><span class="agency-dot svelte-1je9b37" aria-hidden="true"></span> <!></li>'),Vn=q('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="residents svelte-1je9b37"></ul></div>'),Xn=q('<a class="firsts-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></a>'),Jn=q('<span class="firsts-label"> </span>'),Qn=q('<li class="svelte-1je9b37"><span class="firsts-year svelte-1je9b37"> </span> <!></li>'),Yn=q('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="firsts svelte-1je9b37"></ul></div>'),Zn=q('<div class="science-block svelte-1je9b37"><h3 class="library-heading svelte-1je9b37"> </h3> <!></div>'),$n=q('<div class="head svelte-1je9b37"><div class="kind-row svelte-1je9b37"><span class="kind svelte-1je9b37"> </span></div> <div class="name svelte-1je9b37"> </div> <div class="stat-row svelte-1je9b37"><div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div> <!></div></div> <!> <!> <!> <!> <!>',1);function Cs(c,e){Ce(e,!0);let a=_e(e,"selectableIds",19,()=>new Set);function n(l){if(typeof l=="number")return l>=1e3?`${l.toLocaleString("en-US")} km`:`${l} km`;const t=g=>g.toLocaleString("en-US");return`${t(l[0])} - ${t(l[1])} km`}function s(l){const t=g=>g>=1e3?g.toLocaleString("en-US"):g.toString();return typeof l=="number"?`${t(l)} AU`:`${t(l[0])} - ${t(l[1])} AU`}function p(l){return l.altitude_km!=null?n(l.altitude_km):l.distance_au!=null?s(l.distance_au):""}function B(l){switch(l){case"NASA":case"SpaceX":return"#3b82f6";case"ROSCOSMOS":return"#ef4444";case"CNSA":return"#dc2626";case"ISRO":return"#f97316";case"JAXA":return"#1d4ed8";case"ESA":case"Arianespace":return"#1d4ed8";case"UAESA":return"#00732F";default:return"rgba(255,255,255,0.5)"}}{let l=Me(()=>{var t;return((t=e.regime)==null?void 0:t.name)??""});fn(c,{get open(){return e.open},get onClose(){return e.onClose},get title(){return v(l)},zIndex:28,children:(t,g)=>{var k=Fe(),w=ze(k);{var o=j=>{var H=$n(),X=ze(H);let J;var ee=i(X),d=i(ee),m=i(d,!0);r(d),r(ee);var _=h(ee,2),R=i(_,!0);r(_);var D=h(_,2),$=i(D),N=i($),M=i(N,!0);r(N);var O=h(N,2),re=i(O,!0);r(O),r($);var ce=h($,2);{var L=x=>{var T=Gn(),A=i(T),V=i(A,!0);r(A);var I=h(A,2),Y=i(I,!0);r(I),r(T),U(te=>{f(V,te),f(Y,e.regime.firsts[0].year)},[()=>rn()]),b(x,T)};W(ce,x=>{e.regime.firsts&&e.regime.firsts.length>0&&x(L)})}r(D),r(X);var C=h(X,2);{var S=x=>{var T=jn(),A=i(T,!0);r(T),U(()=>f(A,e.regime.comparison)),b(x,T)};W(C,x=>{e.regime.comparison&&x(S)})}var K=h(C,2);{var P=x=>{var T=Hn(),A=i(T),V=i(A,!0);r(A);var I=h(A,2),Y=i(I,!0);r(I),r(T),U(te=>{f(V,te),f(Y,e.regime.story)},[()=>on()]),b(x,T)};W(K,x=>{e.regime.story&&x(P)})}var u=h(K,2);{var E=x=>{var T=Vn(),A=i(T),V=i(A,!0);r(A);var I=h(A,2);ut(I,21,()=>e.regime.residents,Y=>Y.id,(Y,te)=>{const be=Me(()=>a().has(v(te).id)&&e.onResidentClick!=null);var pe=Nn(),Ee=i(pe);let xe;var ye=h(Ee,2);{var Le=Z=>{var ie=Wn(),we=i(ie);wt(),r(ie),U(()=>f(we,`${v(te).label??""} `)),Ke("click",ie,()=>{var qe;return(qe=e.onResidentClick)==null?void 0:qe.call(e,v(te).id)}),b(Z,ie)},fe=Z=>{var ie=In(),we=i(ie,!0);r(ie),U(()=>f(we,v(te).label)),b(Z,ie)};W(ye,Z=>{v(be)?Z(Le):Z(fe,-1)})}r(pe),U(Z=>xe=Xe(Ee,"",xe,Z),[()=>({background:B(v(te).agency)})]),b(Y,pe)}),r(I),r(T),U(Y=>f(V,Y),[()=>ln()]),b(x,T)};W(u,x=>{e.regime.residents&&e.regime.residents.length>0&&x(E)})}var G=h(u,2);{var Q=x=>{var T=Yn(),A=i(T),V=i(A,!0);r(A);var I=h(A,2);ut(I,21,()=>e.regime.firsts,ma,(Y,te)=>{var be=Qn(),pe=i(be),Ee=i(pe,!0);r(pe);var xe=h(pe,2);{var ye=fe=>{var Z=Xn(),ie=i(Z);wt(),r(Z),U(()=>{Ae(Z,"href",`${Lt??""}/missions?id=${v(te).mission_id??""}`),f(ie,`${v(te).label??""} `)}),b(fe,Z)},Le=fe=>{var Z=Jn(),ie=i(Z,!0);r(Z),U(()=>f(ie,v(te).label)),b(fe,Z)};W(xe,fe=>{v(te).mission_id?fe(ye):fe(Le,-1)})}r(be),U(()=>f(Ee,v(te).year)),b(Y,be)}),r(I),r(T),U(Y=>f(V,Y),[()=>cn()]),b(x,T)};W(G,x=>{e.regime.firsts&&e.regime.firsts.length>0&&x(Q)})}var oe=h(G,2);{var ue=x=>{var T=Zn(),A=i(T),V=i(A,!0);r(A);var I=h(A,2);vn(I,{get tab(){return e.regime.science_link.tab},get section(){return e.regime.science_link.section}}),r(T),U(Y=>f(V,Y),[()=>dn()]),b(x,T)};W(oe,x=>{e.regime.science_link&&x(ue)})}U((x,T)=>{J=Xe(X,"",J,{"--regime-color":e.regime.color}),f(m,e.regime.short??e.regime.id),f(R,e.regime.name??e.regime.id),f(M,x),f(re,T)},[()=>sn(),()=>p(e.regime)]),b(j,H)};W(w,j=>{e.regime&&j(o)})}b(t,k)},$$slots:{default:!0}})}Ue()}Qe(["click"]);export{Je as B,Ps as E,_n as L,ks as O,Ms as P,Cs as R,Es as S,Ts as T,Dt as a,ws as b,Ss as c,Pt as d,As as e,mt as f,Bs as g,zs as l};
