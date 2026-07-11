import{a0 as $t,Y as pt,a1 as rt,a2 as Te,a3 as ea,x as ct,y as At,V as ge,J as ta,a4 as Oe,U as kt,m as aa,a5 as He,M as sa,a6 as Pe,a7 as na,K as ia,a8 as ra}from"./D7bTI-5N.js";import"./CWj6FrbW.js";import{p as Le,G as r,I as n,s as f,y as m,t as P,a as b,c as Ke,J as Ae,b as q,z as me,a_ as Je,f as Ce,x as Ue,aZ as le,K as _t}from"./BZiKQy4K.js";import{d as dt,s as u,a as We}from"./B2kERdwF.js";import{i as I}from"./B28FVcCb.js";import{e as ot,i as oa}from"./CdzSPoX0.js";import{s as Ie}from"./DWVbOdCr.js";import{s as ut}from"./D7Gfwsv5.js";import{s as Ne}from"./DyYORNku.js";import{p as _e}from"./BGWHhjVS.js";import{e as la,a as ca,b as da,w as ua,c as va,d as fa,f as ma,g as ha,h as pa,i as _a,t as ga,j as ba,k as xa,l as ya,m as wa,n as Sa,o as Ma,p as Aa,q as ka,r as Ea,s as Ta,u as Ba,v as za,x as Ua,y as Ca,z as Pa,A as La,B as Ka,C as Da,D as Ra,E as Fa,F as Ga,G as ja,H as qa,I as Oa,J as Ha,K as Wa,L as Ia,M as Na,N as Va,O as Ja,P as Xa,Q as Ya,R as Qa,S as Za,T as $a,U as es}from"./FoUiu92k.js";import{o as vt}from"./9edZ70L2.js";import{o as ts}from"./BXAYhNUk.js";import{b as Et}from"./CIuJRY1N.js";import{b as Tt}from"./DbwTTcgQ.js";import"./B0XwC4Ot.js";import{P as as}from"./ydvTCyEq.js";import{S as ss}from"./CiQUTo2l.js";const gt=new ct,Ge=new ge;class Bt extends $t{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],i=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],s=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(s),this.setAttribute("position",new pt(e,3)),this.setAttribute("uv",new pt(i,2))}applyMatrix4(e){const i=this.attributes.instanceStart,s=this.attributes.instanceEnd;return i!==void 0&&(i.applyMatrix4(e),s.applyMatrix4(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let i;e instanceof Float32Array?i=e:Array.isArray(e)&&(i=new Float32Array(e));const s=new rt(i,6,1);return this.setAttribute("instanceStart",new Te(s,3,0)),this.setAttribute("instanceEnd",new Te(s,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let i;e instanceof Float32Array?i=e:Array.isArray(e)&&(i=new Float32Array(e));const s=new rt(i,6,1);return this.setAttribute("instanceColorStart",new Te(s,3,0)),this.setAttribute("instanceColorEnd",new Te(s,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new ea(e.geometry)),this}fromLineSegments(e){const i=e.geometry;return this.setPositions(i.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ct);const e=this.attributes.instanceStart,i=this.attributes.instanceEnd;e!==void 0&&i!==void 0&&(this.boundingBox.setFromBufferAttribute(e),gt.setFromBufferAttribute(i),this.boundingBox.union(gt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new At),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,i=this.attributes.instanceEnd;if(e!==void 0&&i!==void 0){const s=this.boundingSphere.center;this.boundingBox.getCenter(s);let a=0;for(let _=0,L=e.count;_<L;_++)Ge.fromBufferAttribute(e,_),a=Math.max(a,s.distanceToSquared(Ge)),Ge.fromBufferAttribute(i,_),a=Math.max(a,s.distanceToSquared(Ge));this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}He.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new aa},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Oe.line={uniforms:kt.merge([He.common,He.fog,He.line]),vertexShader:`
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
		`};class zt extends ta{constructor(e){super({type:"LineMaterial",uniforms:kt.clone(Oe.line.uniforms),vertexShader:Oe.line.vertexShader,fragmentShader:Oe.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const at=new Pe,bt=new ge,xt=new ge,ae=new Pe,se=new Pe,ve=new Pe,st=new ge,nt=new ia,ne=new na,yt=new ge,je=new ct,qe=new At,fe=new Pe;let he,Me;function wt(x,e,i){return fe.set(0,0,-e,1).applyMatrix4(x.projectionMatrix),fe.multiplyScalar(1/fe.w),fe.x=Me/i.width,fe.y=Me/i.height,fe.applyMatrix4(x.projectionMatrixInverse),fe.multiplyScalar(1/fe.w),Math.abs(Math.max(fe.x,fe.y))}function ns(x,e){const i=x.matrixWorld,s=x.geometry,a=s.attributes.instanceStart,_=s.attributes.instanceEnd,L=Math.min(s.instanceCount,a.count);for(let l=0,t=L;l<t;l++){ne.start.fromBufferAttribute(a,l),ne.end.fromBufferAttribute(_,l),ne.applyMatrix4(i);const S=new ge,U=new ge;he.distanceSqToSegment(ne.start,ne.end,U,S),U.distanceTo(S)<Me*.5&&e.push({point:U,pointOnLine:S,distance:he.origin.distanceTo(U),object:x,face:null,faceIndex:l,uv:null,uv1:null})}}function is(x,e,i){const s=e.projectionMatrix,_=x.material.resolution,L=x.matrixWorld,l=x.geometry,t=l.attributes.instanceStart,S=l.attributes.instanceEnd,U=Math.min(l.instanceCount,t.count),k=-e.near;he.at(1,ve),ve.w=1,ve.applyMatrix4(e.matrixWorldInverse),ve.applyMatrix4(s),ve.multiplyScalar(1/ve.w),ve.x*=_.x/2,ve.y*=_.y/2,ve.z=0,st.copy(ve),nt.multiplyMatrices(e.matrixWorldInverse,L);for(let o=0,O=U;o<O;o++){if(ae.fromBufferAttribute(t,o),se.fromBufferAttribute(S,o),ae.w=1,se.w=1,ae.applyMatrix4(nt),se.applyMatrix4(nt),ae.z>k&&se.z>k)continue;if(ae.z>k){const v=ae.z-se.z,h=(ae.z-k)/v;ae.lerp(se,h)}else if(se.z>k){const v=se.z-ae.z,h=(se.z-k)/v;se.lerp(ae,h)}ae.applyMatrix4(s),se.applyMatrix4(s),ae.multiplyScalar(1/ae.w),se.multiplyScalar(1/se.w),ae.x*=_.x/2,ae.y*=_.y/2,se.x*=_.x/2,se.y*=_.y/2,ne.start.copy(ae),ne.start.z=0,ne.end.copy(se),ne.end.z=0;const J=ne.closestPointToPointParameter(st,!0);ne.at(J,yt);const X=ra.lerp(ae.z,se.z,J),ee=X>=-1&&X<=1,c=st.distanceTo(yt)<Me*.5;if(ee&&c){ne.start.fromBufferAttribute(t,o),ne.end.fromBufferAttribute(S,o),ne.start.applyMatrix4(L),ne.end.applyMatrix4(L);const v=new ge,h=new ge;he.distanceSqToSegment(ne.start,ne.end,h,v),i.push({point:h,pointOnLine:v,distance:he.origin.distanceTo(h),object:x,face:null,faceIndex:o,uv:null,uv1:null})}}}class rs extends sa{constructor(e=new Bt,i=new zt({color:Math.random()*16777215})){super(e,i),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,i=e.attributes.instanceStart,s=e.attributes.instanceEnd,a=new Float32Array(2*i.count);for(let L=0,l=0,t=i.count;L<t;L++,l+=2)bt.fromBufferAttribute(i,L),xt.fromBufferAttribute(s,L),a[l]=l===0?0:a[l-1],a[l+1]=a[l]+bt.distanceTo(xt);const _=new rt(a,2,1);return e.setAttribute("instanceDistanceStart",new Te(_,1,0)),e.setAttribute("instanceDistanceEnd",new Te(_,1,1)),this}raycast(e,i){const s=this.material.worldUnits,a=e.camera;if(a===null&&!s&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),s===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;const _=e.params.Line2!==void 0&&e.params.Line2.threshold||0;he=e.ray;const L=this.matrixWorld,l=this.geometry,t=this.material;Me=t.linewidth+_,l.boundingSphere===null&&l.computeBoundingSphere(),qe.copy(l.boundingSphere).applyMatrix4(L);let S;if(s)S=Me*.5;else{const k=Math.max(a.near,qe.distanceToPoint(he.origin));S=wt(a,k,t.resolution)}if(qe.radius+=S,he.intersectsSphere(qe)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),je.copy(l.boundingBox).applyMatrix4(L);let U;if(s)U=Me*.5;else{const k=Math.max(a.near,je.distanceToPoint(he.origin));U=wt(a,k,t.resolution)}je.expandByScalar(U),he.intersectsBox(je)!==!1&&(s?ns(this,i):is(this,a,i))}onBeforeRender(e){const i=this.material.uniforms;i&&i.resolution&&(e.getViewport(at),this.material.uniforms.resolution.value.set(at.z,at.w))}}class os extends Bt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const i=e.length-3,s=new Float32Array(2*i);for(let a=0;a<i;a+=3)s[2*a]=e[a],s[2*a+1]=e[a+1],s[2*a+2]=e[a+2],s[2*a+3]=e[a+3],s[2*a+4]=e[a+4],s[2*a+5]=e[a+5];return super.setPositions(s),this}setColors(e){const i=e.length-3,s=new Float32Array(2*i);for(let a=0;a<i;a+=3)s[2*a]=e[a],s[2*a+1]=e[a+1],s[2*a+2]=e[a+2],s[2*a+3]=e[a+3],s[2*a+4]=e[a+4],s[2*a+5]=e[a+5];return super.setColors(s),this}setFromPoints(e){const i=e.length-1,s=new Float32Array(6*i);for(let a=0;a<i;a++)s[6*a]=e[a].x,s[6*a+1]=e[a].y,s[6*a+2]=e[a].z||0,s[6*a+3]=e[a+1].x,s[6*a+4]=e[a+1].y,s[6*a+5]=e[a+1].z||0;return super.setPositions(s),this}fromLine(e){const i=e.geometry;return this.setPositions(i.attributes.position.array),this}}class $s extends rs{constructor(e=new os,i=new zt({color:Math.random()*16777215})){super(e,i),this.isLine2=!0,this.type="Line2"}}const it=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function en(x){for(let e=0;e<it.length-1;e++){const[i,s]=it[e],[a,_]=it[e+1];if(x>=i&&x<=a)return s+(x-i)/(a-i)*(_-s)}return 512}function St(x){return 8.5+5.2*Math.log10(1+x/200)}function tn(x,e){return x+(St(e)-St(0))}var ls=q('<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>'),cs=q('<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>'),ds=q('<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>'),us=q('<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>'),vs=q('<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>');function an(x,e){Le(e,!0);let i=_e(e,"highlightRegime",3,null),s=_e(e,"anchorBottomPx",3,80);function a(c){return c==null?0:typeof c=="number"?c:(c[0]+c[1])/2}function _(c){return c.altitude_km!=null?a(c.altitude_km):a(c.distance_au)}let L=Ae(()=>e.order?e.order.map(c=>e.regimes.find(v=>v.id===c)).filter(c=>c!=null):[...e.regimes].sort((c,v)=>_(v)-_(c)));function l(c){if(typeof c=="number")return c>=1e3?`${(c/1e3).toFixed(0)},000 km`:`${c} km`;const[v,h]=c,K=D=>D>=1e3?`${(D/1e3).toFixed(0)}k`:`${D}`;return`${K(v)}-${K(h)} km`}function t(c){const v=h=>h<10?h.toFixed(1):h<1e3?h.toFixed(0):h<1e4?`${(h/1e3).toFixed(1)}k`:`${(h/1e3).toFixed(0)}k`;return typeof c=="number"?`${v(c)} AU`:`${v(c[0])}-${v(c[1])} AU`}function S(c){return c.altitude_km!=null?l(c.altitude_km):c.distance_au!=null?t(c.distance_au):""}var U=vs();let k;var o=r(U),O=r(o,!0);n(o);var H=f(o,2),J=r(H);ot(J,17,()=>m(L),c=>c.id,(c,v)=>{var h=ds(),K=r(h);let D,$;var N=r(K);{var M=y=>{var R=ls();b(y,R)},F=y=>{var R=cs();b(y,R)};I(N,y=>{m(v).id===i()?y(M):y(F,-1)})}var ie=f(N,2),ce=r(ie,!0);n(ie);var C=f(ie,2),z=r(C,!0);n(C),n(K),n(h),P(y=>{D=ut(K,1,"band svelte-1v3z2gg",null,D,{"band--highlighted":m(v).id===i()}),Ie(K,"aria-current",m(v).id===i()?"true":void 0),$=Ne(K,"",$,{"--regime-color":m(v).color}),u(ce,m(v).short??m(v).id),u(z,y)},[()=>S(m(v))]),We("click",K,()=>e.onSelect(m(v).id)),b(c,h)});var X=f(J,2);{var ee=c=>{const v=Ae(()=>e.surfaceAnchor??{label:da(),value:"0 km"});var h=us(),K=f(r(h),2),D=r(K,!0);n(K);var $=f(K,2),N=r($,!0);n($),n(h),P(()=>{u(D,m(v).label),u(N,m(v).value)}),b(c,h)};I(X,c=>{e.surfaceAnchor!==null&&c(ee)})}n(H),n(U),P((c,v)=>{Ie(U,"aria-label",c),k=Ne(U,"",k,{"--ruler-bottom":`${s()??""}px`}),u(O,v)},[()=>la(),()=>ca()]),b(x,U),Ke()}dt(["click"]);const sn={mercury:{diameterKm:4880,diameterRatioEarth:.38,surfaceGravityG:.38,atmoBar:0,atmoComposition:"Na · K · O · H exosphere (trace)",surfaceTempK:440,maxWindMs:0,escapeKms:4.3,surfaceKind:"rocky",radiation:"extreme"},venus:{diameterKm:12104,diameterRatioEarth:.95,surfaceGravityG:.91,atmoBar:92,atmoComposition:"CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck",surfaceTempK:737,maxWindMs:1,escapeKms:10.4,surfaceKind:"rocky",radiation:"shielded"},earth:{diameterKm:12742,diameterRatioEarth:1,surfaceGravityG:1,atmoBar:1,atmoComposition:"N₂ 78% · O₂ 21% · Ar 0.9%",surfaceTempK:288,maxWindMs:50,escapeKms:11.2,surfaceKind:"rocky-liquid",radiation:"shielded"},moon:{diameterKm:3474,diameterRatioEarth:.273,surfaceGravityG:.165,atmoBar:0,atmoComposition:"He · Ar · Na exosphere (trace)",surfaceTempK:250,maxWindMs:0,escapeKms:2.38,surfaceKind:"rocky",radiation:"high"},mars:{diameterKm:6779,diameterRatioEarth:.53,surfaceGravityG:.38,atmoBar:.006,atmoComposition:"CO₂ 95% · N₂ 2.8% · Ar 2%",surfaceTempK:210,maxWindMs:30,escapeKms:5,surfaceKind:"rocky",radiation:"high"},jupiter:{diameterKm:139820,diameterRatioEarth:10.97,surfaceGravityG:2.53,atmoBar:1,atmoComposition:"H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds",surfaceTempK:165,maxWindMs:100,escapeKms:59.5,surfaceKind:"gas-giant",radiation:"extreme"},saturn:{diameterKm:116460,diameterRatioEarth:9.14,surfaceGravityG:1.07,atmoBar:1,atmoComposition:"H₂ 96% · He 3% · CH₄/NH₃ clouds",surfaceTempK:134,maxWindMs:500,escapeKms:35.5,surfaceKind:"gas-giant",radiation:"high"},uranus:{diameterKm:50724,diameterRatioEarth:3.98,surfaceGravityG:.89,atmoBar:1,atmoComposition:"H₂ 83% · He 15% · CH₄ 2.3%",surfaceTempK:76,maxWindMs:250,escapeKms:21.3,surfaceKind:"ice-giant",radiation:"moderate"},neptune:{diameterKm:49244,diameterRatioEarth:3.86,surfaceGravityG:1.14,atmoBar:1,atmoComposition:"H₂ 80% · He 19% · CH₄ 1.5%",surfaceTempK:72,maxWindMs:580,escapeKms:23.5,surfaceKind:"ice-giant",radiation:"moderate"},pluto:{diameterKm:2376,diameterRatioEarth:.19,surfaceGravityG:.06,atmoBar:1e-6,atmoComposition:"N₂ + CH₄ + CO (~10 μbar, sublimates)",surfaceTempK:44,maxWindMs:0,escapeKms:1.2,surfaceKind:"rocky-ice",radiation:"shielded"}},lt=8.317,fs=299792.458*60;function Mt(x,e=1){return{fromSunMin:x*lt,fromEarthMin:Math.abs(x-e)*lt}}function ms(x,e){return{fromSunMin:x*lt,fromEarthMin:e/fs}}const nn={earth:{rotationHours:23.93,lightTime:Mt(1)},moon:{rotationHours:655.7,lightTime:ms(1,384400)},mars:{rotationHours:24.62,lightTime:Mt(1.524)}},Ve={mars:{core:"#fff1e6",bright:"#ff9a4d",mid:"#ff6a2e",deep:"#c8371a",glowRGB:"255,122,60"},earth:{core:"#ecffff",bright:"#7fe0ff",mid:"#3aa0ff",deep:"#2b6cff",glowRGB:"90,190,255"},moon:{core:"#ffffff",bright:"#e6ebf5",mid:"#c1c6d4",deep:"#9298aa",glowRGB:"205,213,233"}};var hs=q('<span class="wave-hint svelte-njfz5t"> </span>'),ps=q('<div role="button" tabindex="0"><canvas class="wave-canvas svelte-njfz5t"></canvas> <div class="wave-caption svelte-njfz5t"><span class="wave-cue svelte-njfz5t" aria-hidden="true"><!></span> <!></div></div>');function _s(x,e){Le(e,!0);const i={earth:{amp:1,rolloff:.15,noise:.2,caption:()=>ha(),src:"audio/atmosphere/earth-wind.mp3"},mars:{amp:.55,rolloff:.78,noise:.14,caption:()=>ma(),src:"audio/atmosphere/mars-wind.mp3"},moon:{amp:0,rolloff:1,noise:0,caption:()=>fa(),src:null}},s=Ae(()=>i[e.bodyKey]??null);let a=Ue(null),_=Ue(!1),L=Ue(!1),l=()=>{};vt(()=>{var T;if(!m(a)||!m(s))return;const k=m(a),o=k.getContext("2d");if(!o)return;const O=m(s),H=Ve[e.bodyKey]??Ve.earth,J=typeof window<"u"&&((T=window.matchMedia)==null?void 0:T.call(window,"(prefers-reduced-motion: reduce)").matches),X=d=>`rgba(${H.glowRGB},${d})`,ee=d=>Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,d))),.55);let c=null,v=null,h=null,K=null,D=null;const $=()=>{try{D==null||D.stop()}catch{}D=null,me(_,!1)};l=async()=>{if(O.src){if(m(_))return $();try{if(c||(c=new AudioContext,v=c.createAnalyser(),v.fftSize=128,v.smoothingTimeConstant=.75,v.connect(c.destination),h=new Uint8Array(v.frequencyBinCount)),await c.resume(),!K){me(L,!0);const d=await fetch(`${Tt}/${O.src}`);K=await c.decodeAudioData(await d.arrayBuffer()),me(L,!1)}D=c.createBufferSource(),D.buffer=K,D.connect(v),D.onended=()=>{me(_,!1),D=null},D.start(),me(_,!0)}catch{me(L,!1),me(_,!1)}}};const N=()=>{const d=k.clientWidth||300,A=k.clientHeight||74;return{w:d,h:A,mid:A/2,maxA:A/2*.9}},M=()=>{const d=window.devicePixelRatio||1,{w:A,h:j}=N();k.width=Math.round(A*d),k.height=Math.round(j*d),o.setTransform(d,0,0,d,0,0)};M();const F=new ResizeObserver(M);F.observe(k);const ie=(d,A,j,Y,oe)=>{if(m(_)&&h&&h.length){const de=Math.min(h.length-1,Math.floor(d*h.length));return .12+.95*(h[de]/255)}return .55+.45*Math.sin(A*Y+d*j*Math.PI*2+oe)*Math.sin(A*.7+d*3)},ce=()=>{const{w:d,h:A,mid:j}=N();o.clearRect(0,0,d,A),o.save(),o.shadowColor=X(.8),o.shadowBlur=8,o.strokeStyle=H.core,o.globalAlpha=.85,o.lineWidth=1.4,o.beginPath(),o.moveTo(3,j),o.lineTo(d-3,j),o.stroke(),o.restore()},C=d=>{const{w:A,h:j,mid:Y,maxA:oe}=N();o.clearRect(0,0,A,j),m(_)&&v&&h&&v.getByteFrequencyData(h);const de=[{hue:H.deep,a:.22,sc:1,fx:2.1,sp:1.1,ph:0},{hue:H.mid,a:.28,sc:.78,fx:3.3,sp:1.7,ph:1.7},{hue:H.bright,a:.34,sc:.55,fx:4.9,sp:2.3,ph:3.1}];o.save(),o.globalCompositeOperation="lighter";for(const p of de){const E=[];for(let w=0;w<=A;w+=3){const V=w/A,W=oe*p.sc*O.amp*ee(V)*Math.max(0,ie(V,d,p.fx,p.sp,p.ph));E.push([w,Y-W])}o.beginPath(),E.forEach(([w,V],W)=>W===0?o.moveTo(w,V):o.lineTo(w,V));for(let w=E.length-1;w>=0;w--)o.lineTo(E[w][0],Y+(Y-E[w][1]));o.closePath(),o.fillStyle=p.hue,o.globalAlpha=p.a,o.fill()}o.restore(),o.save(),o.shadowColor=X(.9),o.shadowBlur=8,o.strokeStyle=H.core,o.lineWidth=1.2,o.globalAlpha=.9,o.beginPath();for(let p=0;p<=A;p+=3){const E=p/A,w=m(_)?ie(E,d,0,0,0):.6+.4*Math.sin(d*2.2+E*9),V=.5*oe*O.amp*ee(E)*w;p===0?o.moveTo(p,Y-V):o.lineTo(p,Y-V)}o.stroke(),o.restore()},z=d=>O.amp===0?ce():C(d);let y=0,R=!1;if(J&&!m(_)){z(.9);const d=()=>{R||(m(_)&&z(performance.now()/1e3),y=requestAnimationFrame(d))};y=requestAnimationFrame(d)}else{const d=performance.now(),A=()=>{R||(z((performance.now()-d)/1e3),y=requestAnimationFrame(A))};y=requestAnimationFrame(A)}return()=>{R=!0,cancelAnimationFrame(y),F.disconnect(),$(),c==null||c.close().catch(()=>{})}});var t=Je(),S=Ce(t);{var U=k=>{var o=ps();let O;var H=r(o);Et(H,M=>me(a,M),()=>m(a));var J=f(H,2),X=r(J),ee=r(X);{var c=M=>{var F=le("◎");b(M,F)},v=M=>{var F=le("···");b(M,F)},h=M=>{var F=le("⏸");b(M,F)},K=M=>{var F=le("▶");b(M,F)};I(ee,M=>{m(s).src?m(L)?M(v,1):m(_)?M(h,2):M(K,-1):M(c)})}n(X);var D=f(X),$=f(D);{var N=M=>{var F=hs(),ie=r(F);n(F),P(ce=>u(ie,`· ${ce??""}`),[()=>m(_)?pa():_a()]),b(M,F)};I($,M=>{m(s).src&&M(N)})}n(J),n(o),P((M,F)=>{O=ut(o,1,"wave-tile svelte-njfz5t",null,O,{silent:!m(s).src}),Ie(o,"aria-label",M),u(D,` ${F??""} `)},[()=>m(s).src?ua():va(),()=>m(s).caption()]),We("click",o,()=>l()),We("keydown",o,M=>{(M.key==="Enter"||M.key===" ")&&(M.preventDefault(),l())}),b(k,o)};I(S,k=>{m(s)&&k(U)})}b(x,t),Ke()}dt(["click","keydown"]);var gs=q('<div class="tiles svelte-157rl9q" aria-hidden="true"><canvas class="tiles-canvas svelte-157rl9q"></canvas></div>');function bs(x,e){Le(e,!0);let i=_e(e,"rotationHours",3,null),s=Ue(null);vt(()=>{var ce;if(!m(s)||!e.stats)return;const l=m(s),t=l.getContext("2d");if(!t)return;const S=e.stats,U=Ve[e.bodyKey]??Ve.earth,k=typeof window<"u"&&((ce=window.matchMedia)==null?void 0:ce.call(window,"(prefers-reduced-motion: reduce)").matches),o=C=>`rgba(${U.glowRGB},${C})`,O=i()!=null?Math.min(45,Math.max(3.5,Math.abs(i())/4)):null,H=i()==null?"—":Math.abs(i())<48?`${Math.abs(i()).toFixed(1)} h`:`${(Math.abs(i())/24).toFixed(1)} d`,J=Math.min(.92,Math.max(.18,.34/Math.max(.05,S.surfaceGravityG))),X=Math.min(1,Math.max(0,(S.surfaceTempK-90)/230)),ee=S.atmoBar<=0?0:Math.min(1,Math.max(0,(Math.log10(S.atmoBar)+3)/3)),c=S.atmoBar===0?ga():S.atmoBar<.01?`${(S.atmoBar*1e3).toFixed(0)} mbar`:S.atmoBar<10?`${S.atmoBar.toFixed(1)} bar`:`${S.atmoBar.toFixed(0)} bar`,v=()=>{const C=window.devicePixelRatio||1,z=l.clientWidth||300,y=l.clientHeight||58;l.width=Math.round(z*C),l.height=Math.round(y*C),t.setTransform(C,0,0,C,0,0)};v();const h=new ResizeObserver(v);h.observe(l);const K=(C,z,y,R,T=7)=>{t.fillStyle=R,t.font=`${T}px "Space Mono", monospace`,t.textAlign="center",t.fillText(C,z,y)},D=(C,z,y,R)=>{const T=C+z/2,d=y*.46,A=Math.min(z,y)*.26;K("SPIN",T,9,o(.65),6),t.strokeStyle=o(.35),t.lineWidth=1,t.beginPath(),t.arc(T,d,A,0,Math.PI*2),t.stroke(),t.strokeStyle=o(.5),t.beginPath(),t.moveTo(T,d-A),t.lineTo(T,d-A+3),t.stroke();const j=-Math.PI/2+(O?R/O*Math.PI*2:0);t.save(),t.shadowColor=o(.9),t.shadowBlur=5,t.strokeStyle=U.bright,t.lineWidth=1.4,t.beginPath(),t.moveTo(T,d),t.lineTo(T+Math.cos(j)*A*.82,d+Math.sin(j)*A*.82),t.stroke(),t.restore(),t.fillStyle=U.core,t.beginPath(),t.arc(T,d,1.6,0,Math.PI*2),t.fill(),K(H,T,y-3,"rgba(255,255,255,0.7)",7)},$=(C,z,y,R)=>{const T=C+z/2,d=y*.78,A=15;K("GRAV",T,9,o(.65),6),t.strokeStyle=o(.25),t.lineWidth=1,t.beginPath(),t.moveTo(T-z*.28,d),t.lineTo(T+z*.28,d),t.stroke();const j=2.2,Y=R%j/j,oe=4*Y*(1-Y),de=d-oe*J*(d-A);t.save(),t.shadowColor=o(.9),t.shadowBlur=6,t.fillStyle=U.bright,t.beginPath(),t.arc(T,de,2.6,0,Math.PI*2),t.fill(),t.restore(),K(`${S.surfaceGravityG.toFixed(2)} g`,T,y-3,"rgba(255,255,255,0.7)",7)},N=(C,z,y)=>{const R=C+z/2,T=C+z*.16,d=z*.68;K("AIR",R,9,o(.65),6);const A=y*.36,j=t.createLinearGradient(T,0,T+d,0);j.addColorStop(0,"rgba(90,150,255,0.85)"),j.addColorStop(.5,"rgba(220,220,220,0.7)"),j.addColorStop(1,"rgba(255,110,60,0.9)"),t.fillStyle=j,t.fillRect(T,A,d,4);const Y=T+X*d;t.fillStyle=U.core,t.beginPath(),t.moveTo(Y,A-3),t.lineTo(Y-2.5,A-.5),t.lineTo(Y+2.5,A-.5),t.closePath(),t.fill();const oe=y*.56;t.strokeStyle=o(.25),t.lineWidth=3,t.beginPath(),t.moveTo(T,oe),t.lineTo(T+d,oe),t.stroke(),t.strokeStyle=U.bright,t.beginPath(),t.moveTo(T,oe),t.lineTo(T+Math.max(2,ee*d),oe),t.stroke(),K(`${S.surfaceTempK} K · ${c}`,R,y-3,"rgba(255,255,255,0.7)",7)},M=C=>{const z=l.clientWidth||300,y=l.clientHeight||58;t.clearRect(0,0,z,y);const R=z/3;t.strokeStyle="rgba(255,255,255,0.08)",t.lineWidth=1;for(const T of[R,R*2])t.beginPath(),t.moveTo(T,6),t.lineTo(T,y-12),t.stroke();D(0,R,y,C),$(R,R,y,C),N(R*2,R,y)};let F=0,ie=!1;if(k)M(.55);else{const C=performance.now(),z=()=>{ie||(M((performance.now()-C)/1e3),F=requestAnimationFrame(z))};F=requestAnimationFrame(z)}return()=>{ie=!0,cancelAnimationFrame(F),h.disconnect()}});var a=Je(),_=Ce(a);{var L=l=>{var t=gs(),S=r(t);Et(S,U=>me(s,U),()=>m(s)),n(t),b(l,t)};I(_,l=>{e.stats&&l(L)})}b(x,a),Ke()}var xs=q('<div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> <!></span></div>'),ys=q('<div><div class="scan-eyebrow svelte-1k90nq4" aria-hidden="true"> </div> <!> <div class="scan-decor" aria-hidden="true"><!> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value scan-value-wrap svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <!></div></div>');function rn(x,e){Le(e,!0);let i=_e(e,"rotationHours",3,null),s=_e(e,"lightTime",3,null),a=_e(e,"focusGate",3,!0),_=_e(e,"placement",3,"bottom-center"),L=_e(e,"inline",3,!1),l=Ue(!1);vt(()=>{const k=ts("planet-stats",o=>{me(l,o,!0)});return()=>k==null?void 0:k()});var t=Je(),S=Ce(t);{var U=k=>{var o=ys();let O;var H=r(o),J=r(H,!0);n(H);var X=f(H,2);{let g=Ae(()=>e.bodyLabel.toLowerCase());_s(X,{get bodyKey(){return m(g)}})}var ee=f(X,2),c=r(ee);{let g=Ae(()=>e.bodyLabel.toLowerCase());bs(c,{get bodyKey(){return m(g)},get stats(){return e.stats},get rotationHours(){return i()}})}var v=f(c,2),h=r(v),K=r(h,!0);n(h);var D=f(h,2),$=r(D);n(D),n(v);var N=f(v,2),M=r(N),F=r(M,!0);n(M);var ie=f(M,2),ce=r(ie,!0);n(ie),n(N);var C=f(N,2),z=r(C),y=r(z,!0);n(z);var R=f(z,2),T=r(R,!0);n(R),n(C);var d=f(C,2),A=r(d),j=r(A,!0);n(A);var Y=f(A,2),oe=r(Y,!0);n(Y),n(d);var de=f(d,2),p=r(de),E=r(p,!0);n(p);var w=f(p,2),V=r(w,!0);n(w),n(de);var W=f(de,2),Q=r(W),te=r(Q,!0);n(Q);var be=f(Q,2),pe=r(be);{var ke=g=>{var B=le();P((G,ze)=>u(B,`${G??""}
            ${ze??""}`),[()=>Math.abs(i())<48?`${Math.abs(i()).toFixed(2)} h`:`${(Math.abs(i())/24).toFixed(1)} d`,()=>i()<0?`· ${La()}`:""]),b(g,B)};I(pe,g=>{i()!==null&&g(ke)})}n(be),n(W);var xe=f(W,2),ye=r(xe),Be=r(ye,!0);n(ye);var ue=f(ye,2),Z=r(ue);n(ue),n(xe);var re=f(xe,2),we=r(re),De=r(we,!0);n(we);var ft=f(we,2),Ut=r(ft);n(ft),n(re);var Xe=f(re,2),Ye=r(Xe),Ct=r(Ye,!0);n(Ye);var mt=f(Ye,2),Pt=r(mt);{var Lt=g=>{var B=le();P(G=>u(B,G),[()=>Ka()]),b(g,B)},Kt=g=>{var B=le();P(G=>u(B,G),[()=>Da()]),b(g,B)},Dt=g=>{var B=le();P(G=>u(B,G),[()=>Ra()]),b(g,B)},Rt=g=>{var B=le();P(G=>u(B,G),[()=>Fa()]),b(g,B)},Ft=g=>{var B=le();P(G=>u(B,G),[()=>Ga()]),b(g,B)};I(Pt,g=>{e.stats.surfaceKind==="rocky"?g(Lt):e.stats.surfaceKind==="rocky-liquid"?g(Kt,1):e.stats.surfaceKind==="rocky-ice"?g(Dt,2):e.stats.surfaceKind==="gas-giant"?g(Rt,3):g(Ft,-1)})}n(mt),n(Xe);var Qe=f(Xe,2),Ze=r(Qe),Gt=r(Ze,!0);n(Ze);var ht=f(Ze,2),jt=r(ht);{var qt=g=>{var B=le();P(G=>u(B,G),[()=>ja()]),b(g,B)},Ot=g=>{var B=le();P(G=>u(B,G),[()=>qa()]),b(g,B)},Ht=g=>{var B=le();P(G=>u(B,G),[()=>Oa()]),b(g,B)},Wt=g=>{var B=le();P(G=>u(B,G),[()=>Ha()]),b(g,B)};I(jt,g=>{e.stats.radiation==="shielded"?g(qt):e.stats.radiation==="moderate"?g(Ot,1):e.stats.radiation==="high"?g(Ht,2):g(Wt,-1)})}n(ht),n(Qe);var It=f(Qe,2);{var Nt=g=>{var B=xs(),G=r(B),ze=r(G,!0);n(G);var Re=f(G,2),Fe=r(Re),$e=f(Fe);{var et=Se=>{var Ee=le();P(tt=>u(Ee,`· ${tt??""}`),[()=>s().fromEarthMin<60?Va({value:s().fromEarthMin.toFixed(1)}):Ja({value:(s().fromEarthMin/60).toFixed(2)})]),b(Se,Ee)};I($e,Se=>{s().fromEarthMin!==null&&s().fromEarthMin>0&&Se(et)})}n(Re),n(B),P((Se,Ee)=>{u(ze,Se),u(Fe,`${Ee??""} `)},[()=>Wa(),()=>s().fromSunMin<60?Ia({value:s().fromSunMin.toFixed(1)}):Na({value:(s().fromSunMin/60).toFixed(2)})]),b(g,B)};I(It,g=>{s()&&g(Nt)})}n(ee),n(o),P((g,B,G,ze,Re,Fe,$e,et,Se,Ee,tt,Vt,Jt,Xt,Yt,Qt,Zt)=>{O=ut(o,1,"tactical-scan svelte-1k90nq4",null,O,{"above-altitude":_()==="above-altitude"&&!L(),inline:L()}),u(J,g),u(K,B),u($,`${G??""} g`),u(F,ze),u(ce,Re),u(y,Fe),u(T,e.stats.atmoComposition),u(j,$e),u(oe,et),u(E,Se),u(V,Ee),u(te,tt),u(Be,Vt),u(Z,`${Jt??""} km`),u(De,Xt),u(Ut,`${Yt??""} km/s`),u(Ct,Qt),u(Gt,Zt)},[()=>ba({planet:e.bodyLabel}),()=>xa(),()=>e.stats.surfaceGravityG.toFixed(2),()=>ya(),()=>e.stats.atmoBar===0?wa():e.stats.atmoBar<.01?`${(e.stats.atmoBar*1e3).toFixed(2)} mbar`:e.stats.atmoBar<10?`${e.stats.atmoBar.toFixed(2)} bar`:`${e.stats.atmoBar.toFixed(0)} bar`,()=>Sa(),()=>Ma(),()=>Aa({k:e.stats.surfaceTempK.toString(),c:(e.stats.surfaceTempK-273).toFixed(0)}),()=>ka(),()=>e.stats.maxWindMs===0?Ea():Ta({ms:e.stats.maxWindMs.toString()}),()=>Ba(),()=>za(),()=>e.stats.diameterKm.toLocaleString(),()=>Ua(),()=>e.stats.escapeKms.toFixed(1),()=>Ca(),()=>Pa()]),b(k,o)};I(S,k=>{e.stats&&(L()||m(l)&&a())&&k(U)})}b(x,t),Ke()}var ws=q('<div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div>'),Ss=q('<p class="editorial svelte-1je9b37"> </p>'),Ms=q('<div class="story svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <p class="story-text svelte-1je9b37"> </p></div>'),As=q('<button type="button" class="resident-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></button>'),ks=q('<span class="resident-label"> </span>'),Es=q('<li class="svelte-1je9b37"><span class="agency-dot svelte-1je9b37" aria-hidden="true"></span> <!></li>'),Ts=q('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="residents svelte-1je9b37"></ul></div>'),Bs=q('<a class="firsts-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></a>'),zs=q('<span class="firsts-label"> </span>'),Us=q('<li class="svelte-1je9b37"><span class="firsts-year svelte-1je9b37"> </span> <!></li>'),Cs=q('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="firsts svelte-1je9b37"></ul></div>'),Ps=q('<div class="science-block svelte-1je9b37"><h3 class="library-heading svelte-1je9b37"> </h3> <!></div>'),Ls=q('<div class="head svelte-1je9b37"><div class="kind-row svelte-1je9b37"><span class="kind svelte-1je9b37"> </span></div> <div class="name svelte-1je9b37"> </div> <div class="stat-row svelte-1je9b37"><div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div> <!></div></div> <!> <!> <!> <!> <!>',1);function on(x,e){Le(e,!0);let i=_e(e,"selectableIds",19,()=>new Set);function s(l){if(typeof l=="number")return l>=1e3?`${l.toLocaleString("en-US")} km`:`${l} km`;const t=S=>S.toLocaleString("en-US");return`${t(l[0])} - ${t(l[1])} km`}function a(l){const t=S=>S>=1e3?S.toLocaleString("en-US"):S.toString();return typeof l=="number"?`${t(l)} AU`:`${t(l[0])} - ${t(l[1])} AU`}function _(l){return l.altitude_km!=null?s(l.altitude_km):l.distance_au!=null?a(l.distance_au):""}function L(l){switch(l){case"NASA":case"SpaceX":return"#3b82f6";case"ROSCOSMOS":return"#ef4444";case"CNSA":return"#dc2626";case"ISRO":return"#f97316";case"JAXA":return"#1d4ed8";case"ESA":case"Arianespace":return"#1d4ed8";case"UAESA":return"#00732F";default:return"rgba(255,255,255,0.5)"}}{let l=Ae(()=>{var t;return((t=e.regime)==null?void 0:t.name)??""});as(x,{get open(){return e.open},get onClose(){return e.onClose},get title(){return m(l)},zIndex:28,children:(t,S)=>{var U=Je(),k=Ce(U);{var o=O=>{var H=Ls(),J=Ce(H);let X;var ee=r(J),c=r(ee),v=r(c,!0);n(c),n(ee);var h=f(ee,2),K=r(h,!0);n(h);var D=f(h,2),$=r(D),N=r($),M=r(N,!0);n(N);var F=f(N,2),ie=r(F,!0);n(F),n($);var ce=f($,2);{var C=p=>{var E=ws(),w=r(E),V=r(w,!0);n(w);var W=f(w,2),Q=r(W,!0);n(W),n(E),P(te=>{u(V,te),u(Q,e.regime.firsts[0].year)},[()=>Ya()]),b(p,E)};I(ce,p=>{e.regime.firsts&&e.regime.firsts.length>0&&p(C)})}n(D),n(J);var z=f(J,2);{var y=p=>{var E=Ss(),w=r(E,!0);n(E),P(()=>u(w,e.regime.comparison)),b(p,E)};I(z,p=>{e.regime.comparison&&p(y)})}var R=f(z,2);{var T=p=>{var E=Ms(),w=r(E),V=r(w,!0);n(w);var W=f(w,2),Q=r(W,!0);n(W),n(E),P(te=>{u(V,te),u(Q,e.regime.story)},[()=>Qa()]),b(p,E)};I(R,p=>{e.regime.story&&p(T)})}var d=f(R,2);{var A=p=>{var E=Ts(),w=r(E),V=r(w,!0);n(w);var W=f(w,2);ot(W,21,()=>e.regime.residents,Q=>Q.id,(Q,te)=>{const be=Ae(()=>i().has(m(te).id)&&e.onResidentClick!=null);var pe=Es(),ke=r(pe);let xe;var ye=f(ke,2);{var Be=Z=>{var re=As(),we=r(re);_t(),n(re),P(()=>u(we,`${m(te).label??""} `)),We("click",re,()=>{var De;return(De=e.onResidentClick)==null?void 0:De.call(e,m(te).id)}),b(Z,re)},ue=Z=>{var re=ks(),we=r(re,!0);n(re),P(()=>u(we,m(te).label)),b(Z,re)};I(ye,Z=>{m(be)?Z(Be):Z(ue,-1)})}n(pe),P(Z=>xe=Ne(ke,"",xe,Z),[()=>({background:L(m(te).agency)})]),b(Q,pe)}),n(W),n(E),P(Q=>u(V,Q),[()=>Za()]),b(p,E)};I(d,p=>{e.regime.residents&&e.regime.residents.length>0&&p(A)})}var j=f(d,2);{var Y=p=>{var E=Cs(),w=r(E),V=r(w,!0);n(w);var W=f(w,2);ot(W,21,()=>e.regime.firsts,oa,(Q,te)=>{var be=Us(),pe=r(be),ke=r(pe,!0);n(pe);var xe=f(pe,2);{var ye=ue=>{var Z=Bs(),re=r(Z);_t(),n(Z),P(()=>{Ie(Z,"href",`${Tt??""}/missions?id=${m(te).mission_id??""}`),u(re,`${m(te).label??""} `)}),b(ue,Z)},Be=ue=>{var Z=zs(),re=r(Z,!0);n(Z),P(()=>u(re,m(te).label)),b(ue,Z)};I(xe,ue=>{m(te).mission_id?ue(ye):ue(Be,-1)})}n(be),P(()=>u(ke,m(te).year)),b(Q,be)}),n(W),n(E),P(Q=>u(V,Q),[()=>$a()]),b(p,E)};I(j,p=>{e.regime.firsts&&e.regime.firsts.length>0&&p(Y)})}var oe=f(j,2);{var de=p=>{var E=Ps(),w=r(E),V=r(w,!0);n(w);var W=f(w,2);ss(W,{get tab(){return e.regime.science_link.tab},get section(){return e.regime.science_link.section}}),n(E),P(Q=>u(V,Q),[()=>es()]),b(p,E)};I(oe,p=>{e.regime.science_link&&p(de)})}P((p,E)=>{X=Ne(J,"",X,{"--regime-color":e.regime.color}),u(v,e.regime.short??e.regime.id),u(K,e.regime.name??e.regime.id),u(M,p),u(ie,E)},[()=>Xa(),()=>_(e.regime)]),b(O,H)};I(k,O=>{e.regime&&O(o)})}b(t,U)},$$slots:{default:!0}})}Ke()}dt(["click"]);export{Ve as B,os as L,an as O,sn as P,on as R,nn as S,rn as T,zt as a,$s as b,en as c,Mt as d,tn as e,lt as f};
