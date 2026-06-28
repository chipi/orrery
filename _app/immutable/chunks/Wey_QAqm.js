import{X as et,Y as Ce,Z as Se,_ as ae,$ as tt,z as ze,E as De,V as te,v as it,a0 as ue,U as Fe,m as nt,a1 as de,M as at,a2 as ve,w as rt,a3 as st,a4 as ot}from"./DifAjzqf.js";import"./CWj6FrbW.js";import{p as Ie,y as s,z as r,s as g,m as v,t as M,a as b,c as He,A as fe,b as y,aV as lt,f as Oe,B as Ge}from"./DssUUdQF.js";import{d as Ve,s as h,a as We}from"./CM00pKgY.js";import{i as D}from"./BZ6MwyzK.js";import{e as we,i as ct}from"./DPMD3Cm_.js";import{s as Ae}from"./Bk_niVXd.js";import{s as ut}from"./CauzcuYq.js";import{s as Me}from"./DZv8nop2.js";import{p as Ne}from"./BVXFG_td.js";import"./BXo2yXua.js";import{e as dt,a as ft,b as vt,c as mt,d as pt,f as ht,g as gt,h as _t,p as bt}from"./DJsXKVn9.js";import{P as yt}from"./8tsfxDqk.js";import{S as xt}from"./C13wboD5.js";import{b as St}from"./CM6pG1j5.js";import"./B0XwC4Ot.js";const Pe=new ze,le=new te;class Ee extends et{constructor(){super(),this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],a=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(a),this.setAttribute("position",new Ce(e,3)),this.setAttribute("uv",new Ce(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,a=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),a.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const a=new Se(t,6,1);return this.setAttribute("instanceStart",new ae(a,3,0)),this.setAttribute("instanceEnd",new ae(a,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const a=new Se(t,6,1);return this.setAttribute("instanceColorStart",new ae(a,3,0)),this.setAttribute("instanceColorEnd",new ae(a,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new tt(e.geometry)),this}romLineSegments(e){const t=e.geometry;if(t.isGeometry){console.error("THREE.LineSegmentsGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else t.isBufferGeometry&&this.setPositions(t.attributes.position.array);return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ze);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Pe.setFromBufferAttribute(t),this.boundingBox.union(Pe))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new De),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const a=this.boundingSphere.center;this.boundingBox.getCenter(a);let i=0;for(let d=0,L=e.count;d<L;d++)le.fromBufferAttribute(e,d),i=Math.max(i,a.distanceToSquared(le)),le.fromBufferAttribute(t,d),i=Math.max(i,a.distanceToSquared(le));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}Ee.prototype.isLineSegmentsGeometry=!0;de.line={linewidth:{value:1},resolution:{value:new nt(1,1)},dashScale:{value:1},dashSize:{value:1},dashOffset:{value:0},gapSize:{value:1},opacity:{value:1}};ue.line={uniforms:Fe.merge([de.common,de.fog,de.line]),vertexShader:`
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

		varying vec2 vUv;

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			vUv = uv;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec2 ndcStart = clipStart.xy / clipStart.w;
			vec2 ndcEnd = clipEnd.xy / clipEnd.w;

			// direction
			vec2 dir = ndcEnd - ndcStart;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			// perpendicular to dir
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

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;

		#ifdef USE_DASH

			uniform float dashSize;
			uniform float dashOffset;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		varying vec2 vUv;

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef ALPHA_TO_COVERAGE

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

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <encodings_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class Be extends it{constructor(e){super({type:"LineMaterial",uniforms:Fe.clone(ue.line.uniforms),vertexShader:ue.line.vertexShader,fragmentShader:ue.line.fragmentShader,clipping:!0}),this.dashed=!1,Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(t){this.uniforms.diffuse.value=t}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(t){this.uniforms.linewidth.value=t}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(t){this.uniforms.dashScale.value=t}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(t){this.uniforms.dashSize.value=t}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(t){this.uniforms.dashOffset.value=t}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(t){this.uniforms.gapSize.value=t}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(t){this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(t){this.uniforms.resolution.value.copy(t)}},alphaToCoverage:{enumerable:!0,get:function(){return"ALPHA_TO_COVERAGE"in this.defines},set:function(t){!!t!="ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),t?(this.defines.ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}Be.prototype.isLineMaterial=!0;const ge=new te,_e=new te,w=new ve,A=new ve,I=new ve,be=new te,ye=new rt,G=new st,Te=new te,X=new ze,ce=new De,H=new ve;class qe extends at{constructor(e=new Ee,t=new Be({color:Math.random()*16777215})){super(e,t),this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,a=e.attributes.instanceEnd,i=new Float32Array(2*t.count);for(let L=0,o=0,f=t.count;L<f;L++,o+=2)ge.fromBufferAttribute(t,L),_e.fromBufferAttribute(a,L),i[o]=o===0?0:i[o-1],i[o+1]=i[o]+ge.distanceTo(_e);const d=new Se(i,2,1);return e.setAttribute("instanceDistanceStart",new ae(d,1,0)),e.setAttribute("instanceDistanceEnd",new ae(d,1,1)),this}raycast(e,t){e.camera===null&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2.');const a=e.params.Line2!==void 0&&e.params.Line2.threshold||0,i=e.ray,d=e.camera,L=d.projectionMatrix,o=this.matrixWorld,f=this.geometry,U=this.material,z=U.resolution,Q=U.linewidth+a,J=f.attributes.instanceStart,V=f.attributes.instanceEnd,P=-d.near,W=2*Math.max(Q/z.width,Q/z.height);f.boundingSphere===null&&f.computeBoundingSphere(),ce.copy(f.boundingSphere).applyMatrix4(o);const n=Math.max(d.near,ce.distanceToPoint(i.origin));H.set(0,0,-n,1).applyMatrix4(d.projectionMatrix),H.multiplyScalar(1/H.w),H.applyMatrix4(d.projectionMatrixInverse);const l=Math.abs(W/H.w)*.5;if(ce.radius+=l,e.ray.intersectsSphere(ce)===!1)return;f.boundingBox===null&&f.computeBoundingBox(),X.copy(f.boundingBox).applyMatrix4(o);const m=Math.max(d.near,X.distanceToPoint(i.origin));H.set(0,0,-m,1).applyMatrix4(d.projectionMatrix),H.multiplyScalar(1/H.w),H.applyMatrix4(d.projectionMatrixInverse);const p=Math.abs(W/H.w)*.5;if(X.max.x+=p,X.max.y+=p,X.max.z+=p,X.min.x-=p,X.min.y-=p,X.min.z-=p,e.ray.intersectsBox(X)!==!1){i.at(1,I),I.w=1,I.applyMatrix4(d.matrixWorldInverse),I.applyMatrix4(L),I.multiplyScalar(1/I.w),I.x*=z.x/2,I.y*=z.y/2,I.z=0,be.copy(I),ye.multiplyMatrices(d.matrixWorldInverse,o);for(let E=0,N=J.count;E<N;E++){w.fromBufferAttribute(J,E),A.fromBufferAttribute(V,E),ge.w=1,_e.w=1,w.applyMatrix4(ye),A.applyMatrix4(ye);var k=w.z>P&&A.z>P;if(k)continue;if(w.z>P){const T=w.z-A.z,R=(w.z-P)/T;w.lerp(A,R)}else if(A.z>P){const T=A.z-w.z,R=(A.z-P)/T;A.lerp(w,R)}w.applyMatrix4(L),A.applyMatrix4(L),w.multiplyScalar(1/w.w),A.multiplyScalar(1/A.w),w.x*=z.x/2,w.y*=z.y/2,A.x*=z.x/2,A.y*=z.y/2,G.start.copy(w),G.start.z=0,G.end.copy(A),G.end.z=0;const K=G.closestPointToPointParameter(be,!0);G.at(K,Te);const Y=ot.lerp(w.z,A.z,K),$=Y>=-1&&Y<=1,ie=be.distanceTo(Te)<Q*.5;if($&&ie){G.start.fromBufferAttribute(J,E),G.end.fromBufferAttribute(V,E),G.start.applyMatrix4(o),G.end.applyMatrix4(o);const T=new te,R=new te;i.distanceSqToSegment(G.start,G.end,R,T),t.push({point:R,pointOnLine:T,distance:i.origin.distanceTo(R),object:this,face:null,faceIndex:E,uv:null,uv2:null})}}}}}qe.prototype.LineSegments2=!0;class Xe extends Ee{constructor(){super(),this.type="LineGeometry"}setPositions(e){for(var t=e.length-3,a=new Float32Array(2*t),i=0;i<t;i+=3)a[2*i]=e[i],a[2*i+1]=e[i+1],a[2*i+2]=e[i+2],a[2*i+3]=e[i+3],a[2*i+4]=e[i+4],a[2*i+5]=e[i+5];return super.setPositions(a),this}setColors(e){for(var t=e.length-3,a=new Float32Array(2*t),i=0;i<t;i+=3)a[2*i]=e[i],a[2*i+1]=e[i+1],a[2*i+2]=e[i+2],a[2*i+3]=e[i+3],a[2*i+4]=e[i+4],a[2*i+5]=e[i+5];return super.setColors(a),this}fromLine(e){var t=e.geometry;if(t.isGeometry){console.error("THREE.LineGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else t.isBufferGeometry&&this.setPositions(t.attributes.position.array);return this}copy(){return this}}Xe.prototype.isLineGeometry=!0;class wt extends qe{constructor(e=new Xe,t=new Be({color:Math.random()*16777215})){super(e,t),this.type="Line2"}}wt.prototype.isLine2=!0;const xe=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function ai(S){for(let e=0;e<xe.length-1;e++){const[t,a]=xe[e],[i,d]=xe[e+1];if(S>=t&&S<=i)return a+(S-t)/(i-t)*(d-a)}return 512}function Re(S){return 8.5+5.2*Math.log10(1+S/200)}function ri(S,e){return S+(Re(e)-Re(0))}var At=y('<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>'),Mt=y('<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>'),zt=y('<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>'),Et=y('<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>'),Bt=y('<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>');function si(S,e){Ie(e,!0);let t=Ne(e,"highlightRegime",3,null);function a(n){return n==null?0:typeof n=="number"?n:(n[0]+n[1])/2}function i(n){return n.altitude_km!=null?a(n.altitude_km):a(n.distance_au)}let d=fe(()=>e.order?e.order.map(n=>e.regimes.find(l=>l.id===n)).filter(n=>n!=null):[...e.regimes].sort((n,l)=>i(l)-i(n)));function L(n){if(typeof n=="number")return n>=1e3?`${(n/1e3).toFixed(0)},000 km`:`${n} km`;const[l,m]=n,p=k=>k>=1e3?`${(k/1e3).toFixed(0)}k`:`${k}`;return`${p(l)}-${p(m)} km`}function o(n){const l=m=>m<10?m.toFixed(1):m<1e3?m.toFixed(0):m<1e4?`${(m/1e3).toFixed(1)}k`:`${(m/1e3).toFixed(0)}k`;return typeof n=="number"?`${l(n)} AU`:`${l(n[0])}-${l(n[1])} AU`}function f(n){return n.altitude_km!=null?L(n.altitude_km):n.distance_au!=null?o(n.distance_au):""}var U=Bt(),z=s(U),Q=s(z,!0);r(z);var J=g(z,2),V=s(J);we(V,17,()=>v(d),n=>n.id,(n,l)=>{var m=zt(),p=s(m);let k,E;var N=s(p);{var K=F=>{var ne=At();b(F,ne)},Y=F=>{var ne=Mt();b(F,ne)};D(N,F=>{v(l).id===t()?F(K):F(Y,-1)})}var $=g(N,2),ie=s($,!0);r($);var T=g($,2),R=s(T,!0);r(T),r(p),r(m),M(F=>{k=ut(p,1,"band svelte-1v3z2gg",null,k,{"band--highlighted":v(l).id===t()}),Ae(p,"aria-current",v(l).id===t()?"true":void 0),E=Me(p,"",E,{"--regime-color":v(l).color}),h(ie,v(l).short??v(l).id),h(R,F)},[()=>f(v(l))]),We("click",p,()=>e.onSelect(v(l).id)),b(n,m)});var P=g(V,2);{var W=n=>{const l=fe(()=>e.surfaceAnchor??{label:vt(),value:"0 km"});var m=Et(),p=g(s(m),2),k=s(p,!0);r(p);var E=g(p,2),N=s(E,!0);r(E),r(m),M(()=>{h(k,v(l).label),h(N,v(l).value)}),b(n,m)};D(P,n=>{e.surfaceAnchor!==null&&n(W)})}r(J),r(U),M((n,l)=>{Ae(U,"aria-label",n),h(Q,l)},[()=>dt(),()=>ft()]),b(S,U),He()}Ve(["click"]);var jt=y('<div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div>'),Lt=y('<p class="editorial svelte-1je9b37"> </p>'),Ut=y('<div class="story svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <p class="story-text svelte-1je9b37"> </p></div>'),kt=y('<button type="button" class="resident-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></button>'),Ct=y('<span class="resident-label"> </span>'),Ot=y('<li class="svelte-1je9b37"><span class="agency-dot svelte-1je9b37" aria-hidden="true"></span> <!></li>'),Gt=y('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="residents svelte-1je9b37"></ul></div>'),Pt=y('<a class="firsts-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></a>'),Tt=y('<span class="firsts-label"> </span>'),Rt=y('<li class="svelte-1je9b37"><span class="firsts-year svelte-1je9b37"> </span> <!></li>'),Dt=y('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="firsts svelte-1je9b37"></ul></div>'),Ft=y('<div class="science-block svelte-1je9b37"><h3 class="library-heading svelte-1je9b37"> </h3> <!></div>'),It=y('<div class="head svelte-1je9b37"><div class="kind-row svelte-1je9b37"><span class="kind svelte-1je9b37"> </span></div> <div class="name svelte-1je9b37"> </div> <div class="stat-row svelte-1je9b37"><div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div> <!></div></div> <!> <!> <!> <!> <!>',1);function oi(S,e){Ie(e,!0);let t=Ne(e,"selectableIds",19,()=>new Set);function a(o){if(typeof o=="number")return o>=1e3?`${o.toLocaleString("en-US")} km`:`${o} km`;const f=U=>U.toLocaleString("en-US");return`${f(o[0])} - ${f(o[1])} km`}function i(o){const f=U=>U>=1e3?U.toLocaleString("en-US"):U.toString();return typeof o=="number"?`${f(o)} AU`:`${f(o[0])} - ${f(o[1])} AU`}function d(o){return o.altitude_km!=null?a(o.altitude_km):o.distance_au!=null?i(o.distance_au):""}function L(o){switch(o){case"NASA":case"SpaceX":return"#3b82f6";case"ROSCOSMOS":return"#ef4444";case"CNSA":return"#dc2626";case"ISRO":return"#f97316";case"JAXA":return"#1d4ed8";case"ESA":case"Arianespace":return"#1d4ed8";case"UAESA":return"#00732F";default:return"rgba(255,255,255,0.5)"}}{let o=fe(()=>{var f;return((f=e.regime)==null?void 0:f.name)??""});yt(S,{get open(){return e.open},get onClose(){return e.onClose},get title(){return v(o)},zIndex:28,children:(f,U)=>{var z=lt(),Q=Oe(z);{var J=V=>{var P=It(),W=Oe(P);let n;var l=s(W),m=s(l),p=s(m,!0);r(m),r(l);var k=g(l,2),E=s(k,!0);r(k);var N=g(k,2),K=s(N),Y=s(K),$=s(Y,!0);r(Y);var ie=g(Y,2),T=s(ie,!0);r(ie),r(K);var R=g(K,2);{var F=c=>{var u=jt(),_=s(u),q=s(_,!0);r(_);var C=g(_,2),B=s(C,!0);r(C),r(u),M(j=>{h(q,j),h(B,e.regime.firsts[0].year)},[()=>pt()]),b(c,u)};D(R,c=>{e.regime.firsts&&e.regime.firsts.length>0&&c(F)})}r(N),r(W);var ne=g(W,2);{var Je=c=>{var u=Lt(),_=s(u,!0);r(u),M(()=>h(_,e.regime.comparison)),b(c,u)};D(ne,c=>{e.regime.comparison&&c(Je)})}var je=g(ne,2);{var Ke=c=>{var u=Ut(),_=s(u),q=s(_,!0);r(_);var C=g(_,2),B=s(C,!0);r(C),r(u),M(j=>{h(q,j),h(B,e.regime.story)},[()=>ht()]),b(c,u)};D(je,c=>{e.regime.story&&c(Ke)})}var Le=g(je,2);{var Ye=c=>{var u=Gt(),_=s(u),q=s(_,!0);r(_);var C=g(_,2);we(C,21,()=>e.regime.residents,B=>B.id,(B,j)=>{const re=fe(()=>t().has(v(j).id)&&e.onResidentClick!=null);var ee=Ot(),se=s(ee);let oe;var me=g(se,2);{var pe=x=>{var O=kt(),he=s(O);Ge(),r(O),M(()=>h(he,`${v(j).label??""} `)),We("click",O,()=>{var ke;return(ke=e.onResidentClick)==null?void 0:ke.call(e,v(j).id)}),b(x,O)},Z=x=>{var O=Ct(),he=s(O,!0);r(O),M(()=>h(he,v(j).label)),b(x,O)};D(me,x=>{v(re)?x(pe):x(Z,-1)})}r(ee),M(x=>oe=Me(se,"",oe,x),[()=>({background:L(v(j).agency)})]),b(B,ee)}),r(C),r(u),M(B=>h(q,B),[()=>gt()]),b(c,u)};D(Le,c=>{e.regime.residents&&e.regime.residents.length>0&&c(Ye)})}var Ue=g(Le,2);{var Ze=c=>{var u=Dt(),_=s(u),q=s(_,!0);r(_);var C=g(_,2);we(C,21,()=>e.regime.firsts,ct,(B,j)=>{var re=Rt(),ee=s(re),se=s(ee,!0);r(ee);var oe=g(ee,2);{var me=Z=>{var x=Pt(),O=s(x);Ge(),r(x),M(()=>{Ae(x,"href",`${St??""}/missions?id=${v(j).mission_id??""}`),h(O,`${v(j).label??""} `)}),b(Z,x)},pe=Z=>{var x=Tt(),O=s(x,!0);r(x),M(()=>h(O,v(j).label)),b(Z,x)};D(oe,Z=>{v(j).mission_id?Z(me):Z(pe,-1)})}r(re),M(()=>h(se,v(j).year)),b(B,re)}),r(C),r(u),M(B=>h(q,B),[()=>_t()]),b(c,u)};D(Ue,c=>{e.regime.firsts&&e.regime.firsts.length>0&&c(Ze)})}var Qe=g(Ue,2);{var $e=c=>{var u=Ft(),_=s(u),q=s(_,!0);r(_);var C=g(_,2);xt(C,{get tab(){return e.regime.science_link.tab},get section(){return e.regime.science_link.section}}),r(u),M(B=>h(q,B),[()=>bt()]),b(c,u)};D(Qe,c=>{e.regime.science_link&&c($e)})}M((c,u)=>{n=Me(W,"",n,{"--regime-color":e.regime.color}),h(p,e.regime.short??e.regime.id),h(E,e.regime.name??e.regime.id),h($,c),h(T,u)},[()=>mt(),()=>d(e.regime)]),b(V,P)};D(Q,V=>{e.regime&&V(J)})}b(f,z)},$$slots:{default:!0}})}He()}Ve(["click"]);export{Xe as L,si as O,oi as R,Be as a,wt as b,ai as c,ri as d};
