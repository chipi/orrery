import{X as et,Y as Pe,Z as Me,_ as ne,$ as tt,x as je,y as Ie,V as $,J as it,a0 as fe,U as He,m as nt,a1 as ve,M as rt,a2 as he,K as at,a3 as st,a4 as ot}from"./Dm_pBhSi.js";import"./CWj6FrbW.js";import{c as Ve,G as s,I as a,s as g,y as p,t as z,a as b,d as We,J as me,b as y,a_ as lt,f as Ge,K as Te}from"./CoYOZzF0.js";import{d as Ne,s as h,a as qe}from"./CW-N_cEN.js";import{i as F}from"./BS79JKGA.js";import{e as ze,i as ct}from"./CJL13Lhy.js";import{s as Be}from"./BIWmOGsx.js";import{s as ut}from"./COyfiFaD.js";import{s as pe}from"./DHq0miUs.js";import{p as Ee}from"./Xpctuhzh.js";import"./BXo2yXua.js";import{e as dt,a as ft,b as vt,c as mt,d as pt,f as ht,g as gt,h as _t,p as bt}from"./67EEjE7U.js";import{P as yt}from"./Iy098OX_.js";import{S as xt}from"./QXXa_0gr.js";import{b as St}from"./D5S6QCOB.js";import"./B0XwC4Ot.js";const Re=new je,ue=new $;class Le extends et{constructor(){super(),this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],r=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(r),this.setAttribute("position",new Pe(e,3)),this.setAttribute("uv",new Pe(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,r=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),r.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const r=new Me(t,6,1);return this.setAttribute("instanceStart",new ne(r,3,0)),this.setAttribute("instanceEnd",new ne(r,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const r=new Me(t,6,1);return this.setAttribute("instanceColorStart",new ne(r,3,0)),this.setAttribute("instanceColorEnd",new ne(r,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new tt(e.geometry)),this}romLineSegments(e){const t=e.geometry;if(t.isGeometry){console.error("THREE.LineSegmentsGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else t.isBufferGeometry&&this.setPositions(t.attributes.position.array);return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new je);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Re.setFromBufferAttribute(t),this.boundingBox.union(Re))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ie),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const r=this.boundingSphere.center;this.boundingBox.getCenter(r);let i=0;for(let c=0,j=e.count;c<j;c++)ue.fromBufferAttribute(e,c),i=Math.max(i,r.distanceToSquared(ue)),ue.fromBufferAttribute(t,c),i=Math.max(i,r.distanceToSquared(ue));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}Le.prototype.isLineSegmentsGeometry=!0;ve.line={linewidth:{value:1},resolution:{value:new nt(1,1)},dashScale:{value:1},dashSize:{value:1},dashOffset:{value:0},gapSize:{value:1},opacity:{value:1}};fe.line={uniforms:He.merge([ve.common,ve.fog,ve.line]),vertexShader:`
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
		`};class Ue extends it{constructor(e){super({type:"LineMaterial",uniforms:He.clone(fe.line.uniforms),vertexShader:fe.line.vertexShader,fragmentShader:fe.line.fragmentShader,clipping:!0}),this.dashed=!1,Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(t){this.uniforms.diffuse.value=t}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(t){this.uniforms.linewidth.value=t}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(t){this.uniforms.dashScale.value=t}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(t){this.uniforms.dashSize.value=t}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(t){this.uniforms.dashOffset.value=t}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(t){this.uniforms.gapSize.value=t}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(t){this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(t){this.uniforms.resolution.value.copy(t)}},alphaToCoverage:{enumerable:!0,get:function(){return"ALPHA_TO_COVERAGE"in this.defines},set:function(t){!!t!="ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),t?(this.defines.ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}Ue.prototype.isLineMaterial=!0;const ye=new $,xe=new $,A=new he,M=new he,V=new he,Se=new $,we=new at,G=new st,De=new $,X=new je,de=new Ie,W=new he;class Xe extends rt{constructor(e=new Le,t=new Ue({color:Math.random()*16777215})){super(e,t),this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,r=e.attributes.instanceEnd,i=new Float32Array(2*t.count);for(let j=0,o=0,f=t.count;j<f;j++,o+=2)ye.fromBufferAttribute(t,j),xe.fromBufferAttribute(r,j),i[o]=o===0?0:i[o-1],i[o+1]=i[o]+ye.distanceTo(xe);const c=new Me(i,2,1);return e.setAttribute("instanceDistanceStart",new ne(c,1,0)),e.setAttribute("instanceDistanceEnd",new ne(c,1,1)),this}raycast(e,t){e.camera===null&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2.');const r=e.params.Line2!==void 0&&e.params.Line2.threshold||0,i=e.ray,c=e.camera,j=c.projectionMatrix,o=this.matrixWorld,f=this.geometry,T=this.material,x=T.resolution,J=T.linewidth+r,N=f.attributes.instanceStart,K=f.attributes.instanceEnd,k=-c.near,I=2*Math.max(J/x.width,J/x.height);f.boundingSphere===null&&f.computeBoundingSphere(),de.copy(f.boundingSphere).applyMatrix4(o);const ee=Math.max(c.near,de.distanceToPoint(i.origin));W.set(0,0,-ee,1).applyMatrix4(c.projectionMatrix),W.multiplyScalar(1/W.w),W.applyMatrix4(c.projectionMatrixInverse);const Z=Math.abs(I/W.w)*.5;if(de.radius+=Z,e.ray.intersectsSphere(de)===!1)return;f.boundingBox===null&&f.computeBoundingBox(),X.copy(f.boundingBox).applyMatrix4(o);const n=Math.max(c.near,X.distanceToPoint(i.origin));W.set(0,0,-n,1).applyMatrix4(c.projectionMatrix),W.multiplyScalar(1/W.w),W.applyMatrix4(c.projectionMatrixInverse);const l=Math.abs(I/W.w)*.5;if(X.max.x+=l,X.max.y+=l,X.max.z+=l,X.min.x-=l,X.min.y-=l,X.min.z-=l,e.ray.intersectsBox(X)!==!1){i.at(1,V),V.w=1,V.applyMatrix4(c.matrixWorldInverse),V.applyMatrix4(j),V.multiplyScalar(1/V.w),V.x*=x.x/2,V.y*=x.y/2,V.z=0,Se.copy(V),we.multiplyMatrices(c.matrixWorldInverse,o);for(let m=0,L=N.count;m<L;m++){A.fromBufferAttribute(N,m),M.fromBufferAttribute(K,m),ye.w=1,xe.w=1,A.applyMatrix4(we),M.applyMatrix4(we);var v=A.z>k&&M.z>k;if(v)continue;if(A.z>k){const O=A.z-M.z,D=(A.z-k)/O;A.lerp(M,D)}else if(M.z>k){const O=M.z-A.z,D=(M.z-k)/O;M.lerp(A,D)}A.applyMatrix4(j),M.applyMatrix4(j),A.multiplyScalar(1/A.w),M.multiplyScalar(1/M.w),A.x*=x.x/2,A.y*=x.y/2,M.x*=x.x/2,M.y*=x.y/2,G.start.copy(A),G.start.z=0,G.end.copy(M),G.end.z=0;const C=G.closestPointToPointParameter(Se,!0);G.at(C,De);const R=ot.lerp(A.z,M.z,C),re=R>=-1&&R<=1,te=Se.distanceTo(De)<J*.5;if(re&&te){G.start.fromBufferAttribute(N,m),G.end.fromBufferAttribute(K,m),G.start.applyMatrix4(o),G.end.applyMatrix4(o);const O=new $,D=new $;i.distanceSqToSegment(G.start,G.end,D,O),t.push({point:D,pointOnLine:O,distance:i.origin.distanceTo(D),object:this,face:null,faceIndex:m,uv:null,uv2:null})}}}}}Xe.prototype.LineSegments2=!0;class Je extends Le{constructor(){super(),this.type="LineGeometry"}setPositions(e){for(var t=e.length-3,r=new Float32Array(2*t),i=0;i<t;i+=3)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5];return super.setPositions(r),this}setColors(e){for(var t=e.length-3,r=new Float32Array(2*t),i=0;i<t;i+=3)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5];return super.setColors(r),this}fromLine(e){var t=e.geometry;if(t.isGeometry){console.error("THREE.LineGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else t.isBufferGeometry&&this.setPositions(t.attributes.position.array);return this}copy(){return this}}Je.prototype.isLineGeometry=!0;class wt extends Xe{constructor(e=new Je,t=new Ue({color:Math.random()*16777215})){super(e,t),this.type="Line2"}}wt.prototype.isLine2=!0;const Ae=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function ri(w){for(let e=0;e<Ae.length-1;e++){const[t,r]=Ae[e],[i,c]=Ae[e+1];if(w>=t&&w<=i)return r+(w-t)/(i-t)*(c-r)}return 512}function Fe(w){return 8.5+5.2*Math.log10(1+w/200)}function ai(w,e){return w+(Fe(e)-Fe(0))}var At=y('<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>'),Mt=y('<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>'),zt=y('<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>'),Bt=y('<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>'),Et=y('<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>');function si(w,e){Ve(e,!0);let t=Ee(e,"highlightRegime",3,null),r=Ee(e,"anchorBottomPx",3,80);function i(n){return n==null?0:typeof n=="number"?n:(n[0]+n[1])/2}function c(n){return n.altitude_km!=null?i(n.altitude_km):i(n.distance_au)}let j=me(()=>e.order?e.order.map(n=>e.regimes.find(l=>l.id===n)).filter(n=>n!=null):[...e.regimes].sort((n,l)=>c(l)-c(n)));function o(n){if(typeof n=="number")return n>=1e3?`${(n/1e3).toFixed(0)},000 km`:`${n} km`;const[l,v]=n,m=L=>L>=1e3?`${(L/1e3).toFixed(0)}k`:`${L}`;return`${m(l)}-${m(v)} km`}function f(n){const l=v=>v<10?v.toFixed(1):v<1e3?v.toFixed(0):v<1e4?`${(v/1e3).toFixed(1)}k`:`${(v/1e3).toFixed(0)}k`;return typeof n=="number"?`${l(n)} AU`:`${l(n[0])}-${l(n[1])} AU`}function T(n){return n.altitude_km!=null?o(n.altitude_km):n.distance_au!=null?f(n.distance_au):""}var x=Et();let J;var N=s(x),K=s(N,!0);a(N);var k=g(N,2),I=s(k);ze(I,17,()=>p(j),n=>n.id,(n,l)=>{var v=zt(),m=s(v);let L,C;var R=s(m);{var re=H=>{var ie=At();b(H,ie)},te=H=>{var ie=Mt();b(H,ie)};F(R,H=>{p(l).id===t()?H(re):H(te,-1)})}var O=g(R,2),D=s(O,!0);a(O);var se=g(O,2),oe=s(se,!0);a(se),a(m),a(v),z(H=>{L=ut(m,1,"band svelte-1v3z2gg",null,L,{"band--highlighted":p(l).id===t()}),Be(m,"aria-current",p(l).id===t()?"true":void 0),C=pe(m,"",C,{"--regime-color":p(l).color}),h(D,p(l).short??p(l).id),h(oe,H)},[()=>T(p(l))]),qe("click",m,()=>e.onSelect(p(l).id)),b(n,v)});var ee=g(I,2);{var Z=n=>{const l=me(()=>e.surfaceAnchor??{label:vt(),value:"0 km"});var v=Bt(),m=g(s(v),2),L=s(m,!0);a(m);var C=g(m,2),R=s(C,!0);a(C),a(v),z(()=>{h(L,p(l).label),h(R,p(l).value)}),b(n,v)};F(ee,n=>{e.surfaceAnchor!==null&&n(Z)})}a(k),a(x),z((n,l)=>{Be(x,"aria-label",n),J=pe(x,"",J,{"--ruler-bottom":`${r()??""}px`}),h(K,l)},[()=>dt(),()=>ft()]),b(w,x),We()}Ne(["click"]);var jt=y('<div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div>'),Lt=y('<p class="editorial svelte-1je9b37"> </p>'),Ut=y('<div class="story svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <p class="story-text svelte-1je9b37"> </p></div>'),kt=y('<button type="button" class="resident-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></button>'),Ct=y('<span class="resident-label"> </span>'),Ot=y('<li class="svelte-1je9b37"><span class="agency-dot svelte-1je9b37" aria-hidden="true"></span> <!></li>'),Pt=y('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="residents svelte-1je9b37"></ul></div>'),Gt=y('<a class="firsts-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></a>'),Tt=y('<span class="firsts-label"> </span>'),Rt=y('<li class="svelte-1je9b37"><span class="firsts-year svelte-1je9b37"> </span> <!></li>'),Dt=y('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="firsts svelte-1je9b37"></ul></div>'),Ft=y('<div class="science-block svelte-1je9b37"><h3 class="library-heading svelte-1je9b37"> </h3> <!></div>'),It=y('<div class="head svelte-1je9b37"><div class="kind-row svelte-1je9b37"><span class="kind svelte-1je9b37"> </span></div> <div class="name svelte-1je9b37"> </div> <div class="stat-row svelte-1je9b37"><div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div> <!></div></div> <!> <!> <!> <!> <!>',1);function oi(w,e){Ve(e,!0);let t=Ee(e,"selectableIds",19,()=>new Set);function r(o){if(typeof o=="number")return o>=1e3?`${o.toLocaleString("en-US")} km`:`${o} km`;const f=T=>T.toLocaleString("en-US");return`${f(o[0])} - ${f(o[1])} km`}function i(o){const f=T=>T>=1e3?T.toLocaleString("en-US"):T.toString();return typeof o=="number"?`${f(o)} AU`:`${f(o[0])} - ${f(o[1])} AU`}function c(o){return o.altitude_km!=null?r(o.altitude_km):o.distance_au!=null?i(o.distance_au):""}function j(o){switch(o){case"NASA":case"SpaceX":return"#3b82f6";case"ROSCOSMOS":return"#ef4444";case"CNSA":return"#dc2626";case"ISRO":return"#f97316";case"JAXA":return"#1d4ed8";case"ESA":case"Arianespace":return"#1d4ed8";case"UAESA":return"#00732F";default:return"rgba(255,255,255,0.5)"}}{let o=me(()=>{var f;return((f=e.regime)==null?void 0:f.name)??""});yt(w,{get open(){return e.open},get onClose(){return e.onClose},get title(){return p(o)},zIndex:28,children:(f,T)=>{var x=lt(),J=Ge(x);{var N=K=>{var k=It(),I=Ge(k);let ee;var Z=s(I),n=s(Z),l=s(n,!0);a(n),a(Z);var v=g(Z,2),m=s(v,!0);a(v);var L=g(v,2),C=s(L),R=s(C),re=s(R,!0);a(R);var te=g(R,2),O=s(te,!0);a(te),a(C);var D=g(C,2);{var se=u=>{var d=jt(),_=s(d),q=s(_,!0);a(_);var U=g(_,2),B=s(U,!0);a(U),a(d),z(E=>{h(q,E),h(B,e.regime.firsts[0].year)},[()=>pt()]),b(u,d)};F(D,u=>{e.regime.firsts&&e.regime.firsts.length>0&&u(se)})}a(L),a(I);var oe=g(I,2);{var H=u=>{var d=Lt(),_=s(d,!0);a(d),z(()=>h(_,e.regime.comparison)),b(u,d)};F(oe,u=>{e.regime.comparison&&u(H)})}var ie=g(oe,2);{var Ke=u=>{var d=Ut(),_=s(d),q=s(_,!0);a(_);var U=g(_,2),B=s(U,!0);a(U),a(d),z(E=>{h(q,E),h(B,e.regime.story)},[()=>ht()]),b(u,d)};F(ie,u=>{e.regime.story&&u(Ke)})}var ke=g(ie,2);{var Ye=u=>{var d=Pt(),_=s(d),q=s(_,!0);a(_);var U=g(_,2);ze(U,21,()=>e.regime.residents,B=>B.id,(B,E)=>{const ae=me(()=>t().has(p(E).id)&&e.onResidentClick!=null);var Q=Ot(),le=s(Q);let ce;var ge=g(le,2);{var _e=S=>{var P=kt(),be=s(P);Te(),a(P),z(()=>h(be,`${p(E).label??""} `)),qe("click",P,()=>{var Oe;return(Oe=e.onResidentClick)==null?void 0:Oe.call(e,p(E).id)}),b(S,P)},Y=S=>{var P=Ct(),be=s(P,!0);a(P),z(()=>h(be,p(E).label)),b(S,P)};F(ge,S=>{p(ae)?S(_e):S(Y,-1)})}a(Q),z(S=>ce=pe(le,"",ce,S),[()=>({background:j(p(E).agency)})]),b(B,Q)}),a(U),a(d),z(B=>h(q,B),[()=>gt()]),b(u,d)};F(ke,u=>{e.regime.residents&&e.regime.residents.length>0&&u(Ye)})}var Ce=g(ke,2);{var Ze=u=>{var d=Dt(),_=s(d),q=s(_,!0);a(_);var U=g(_,2);ze(U,21,()=>e.regime.firsts,ct,(B,E)=>{var ae=Rt(),Q=s(ae),le=s(Q,!0);a(Q);var ce=g(Q,2);{var ge=Y=>{var S=Gt(),P=s(S);Te(),a(S),z(()=>{Be(S,"href",`${St??""}/missions?id=${p(E).mission_id??""}`),h(P,`${p(E).label??""} `)}),b(Y,S)},_e=Y=>{var S=Tt(),P=s(S,!0);a(S),z(()=>h(P,p(E).label)),b(Y,S)};F(ce,Y=>{p(E).mission_id?Y(ge):Y(_e,-1)})}a(ae),z(()=>h(le,p(E).year)),b(B,ae)}),a(U),a(d),z(B=>h(q,B),[()=>_t()]),b(u,d)};F(Ce,u=>{e.regime.firsts&&e.regime.firsts.length>0&&u(Ze)})}var Qe=g(Ce,2);{var $e=u=>{var d=Ft(),_=s(d),q=s(_,!0);a(_);var U=g(_,2);xt(U,{get tab(){return e.regime.science_link.tab},get section(){return e.regime.science_link.section}}),a(d),z(B=>h(q,B),[()=>bt()]),b(u,d)};F(Qe,u=>{e.regime.science_link&&u($e)})}z((u,d)=>{ee=pe(I,"",ee,{"--regime-color":e.regime.color}),h(l,e.regime.short??e.regime.id),h(m,e.regime.name??e.regime.id),h(re,u),h(O,d)},[()=>mt(),()=>c(e.regime)]),b(K,k)};F(J,K=>{e.regime&&K(N)})}b(f,x)},$$slots:{default:!0}})}We()}Ne(["click"]);export{Je as L,si as O,oi as R,Ue as a,wt as b,ri as c,ai as d};
