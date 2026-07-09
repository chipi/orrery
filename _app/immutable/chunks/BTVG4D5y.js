import{a0 as Qt,Y as _t,a1 as rt,a2 as Be,a3 as Zt,x as lt,y as St,V as Se,J as $t,a4 as Fe,U as Mt,m as ea,a5 as He,M as ta,a6 as De,K as aa,a7 as sa,a8 as na}from"./DiIjDYIM.js";import"./CWj6FrbW.js";import{c as ze,G as n,I as s,s as f,y as m,t as G,a as g,d as Pe,J as Me,b as D,z as me,a_ as Ne,f as Ge,x as Ce,aZ as le,K as gt}from"./BMV6fuQL.js";import{d as ct,s as u,a as Oe}from"./CMfNfW6F.js";import{i as J}from"./Vv-6b_iX.js";import{e as it,i as ra}from"./rIURBqBm.js";import{s as Ue}from"./DK0T6usq.js";import{s as dt}from"./ByKjvKwW.js";import{s as Ie}from"./DLnEut_k.js";import{p as _e}from"./2tnC2C3k.js";import{e as ia,a as oa,b as la,w as ca,c as da,d as ua,f as va,g as fa,h as ma,i as ha,t as pa,j as _a,k as ga,l as ba,m as xa,n as ya,o as wa,p as Sa,q as Ma,r as ka,s as Aa,u as Ba,v as Ta,x as Ea,y as Ca,z as Ga,A as za,B as Pa,C as Ka,D as La,E as Ra,F as ja,G as qa,H as Fa,I as Ha,J as Oa,K as Ua,L as Ia,M as Wa,N as Da,O as Na,P as Va,Q as Ja,R as Xa,S as Ya,T as Qa,U as Za}from"./FoUiu92k.js";import{o as ut}from"./o1jxxV_Y.js";import{o as $a}from"./Cp2akqk0.js";import{b as kt}from"./Dpd6kHqv.js";import{b as At}from"./DRhMNENZ.js";import"./B0XwC4Ot.js";import{P as es}from"./AS4Um8jY.js";import{S as ts}from"./sdanA3zF.js";const bt=new lt,je=new Se;class vt extends Qt{constructor(){super(),this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],a=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],o=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(o),this.setAttribute("position",new _t(e,3)),this.setAttribute("uv",new _t(a,2))}applyMatrix4(e){const a=this.attributes.instanceStart,o=this.attributes.instanceEnd;return a!==void 0&&(a.applyMatrix4(e),o.applyMatrix4(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let a;e instanceof Float32Array?a=e:Array.isArray(e)&&(a=new Float32Array(e));const o=new rt(a,6,1);return this.setAttribute("instanceStart",new Be(o,3,0)),this.setAttribute("instanceEnd",new Be(o,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let a;e instanceof Float32Array?a=e:Array.isArray(e)&&(a=new Float32Array(e));const o=new rt(a,6,1);return this.setAttribute("instanceColorStart",new Be(o,3,0)),this.setAttribute("instanceColorEnd",new Be(o,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Zt(e.geometry)),this}romLineSegments(e){const a=e.geometry;if(a.isGeometry){console.error("THREE.LineSegmentsGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else a.isBufferGeometry&&this.setPositions(a.attributes.position.array);return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new lt);const e=this.attributes.instanceStart,a=this.attributes.instanceEnd;e!==void 0&&a!==void 0&&(this.boundingBox.setFromBufferAttribute(e),bt.setFromBufferAttribute(a),this.boundingBox.union(bt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new St),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,a=this.attributes.instanceEnd;if(e!==void 0&&a!==void 0){const o=this.boundingSphere.center;this.boundingBox.getCenter(o);let i=0;for(let p=0,F=e.count;p<F;p++)je.fromBufferAttribute(e,p),i=Math.max(i,o.distanceToSquared(je)),je.fromBufferAttribute(a,p),i=Math.max(i,o.distanceToSquared(je));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}vt.prototype.isLineSegmentsGeometry=!0;He.line={linewidth:{value:1},resolution:{value:new ea(1,1)},dashScale:{value:1},dashSize:{value:1},dashOffset:{value:0},gapSize:{value:1},opacity:{value:1}};Fe.line={uniforms:Mt.merge([He.common,He.fog,He.line]),vertexShader:`
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
		`};class ft extends $t{constructor(e){super({type:"LineMaterial",uniforms:Mt.clone(Fe.line.uniforms),vertexShader:Fe.line.vertexShader,fragmentShader:Fe.line.fragmentShader,clipping:!0}),this.dashed=!1,Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(a){this.uniforms.diffuse.value=a}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(a){this.uniforms.linewidth.value=a}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(a){this.uniforms.dashScale.value=a}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(a){this.uniforms.dashSize.value=a}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(a){this.uniforms.dashOffset.value=a}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(a){this.uniforms.gapSize.value=a}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(a){this.uniforms.opacity.value=a}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(a){this.uniforms.resolution.value.copy(a)}},alphaToCoverage:{enumerable:!0,get:function(){return"ALPHA_TO_COVERAGE"in this.defines},set:function(a){!!a!="ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),a?(this.defines.ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}ft.prototype.isLineMaterial=!0;const et=new Se,tt=new Se,re=new De,ie=new De,ve=new De,at=new Se,st=new aa,ce=new sa,xt=new Se,pe=new lt,qe=new St,fe=new De;class Bt extends ta{constructor(e=new vt,a=new ft({color:Math.random()*16777215})){super(e,a),this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,a=e.attributes.instanceStart,o=e.attributes.instanceEnd,i=new Float32Array(2*a.count);for(let F=0,c=0,t=a.count;F<t;F++,c+=2)et.fromBufferAttribute(a,F),tt.fromBufferAttribute(o,F),i[c]=c===0?0:i[c-1],i[c+1]=i[c]+et.distanceTo(tt);const p=new rt(i,2,1);return e.setAttribute("instanceDistanceStart",new Be(p,1,0)),e.setAttribute("instanceDistanceEnd",new Be(p,1,1)),this}raycast(e,a){e.camera===null&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2.');const o=e.params.Line2!==void 0&&e.params.Line2.threshold||0,i=e.ray,p=e.camera,F=p.projectionMatrix,c=this.matrixWorld,t=this.geometry,z=this.material,P=z.resolution,L=z.linewidth+o,r=t.attributes.instanceStart,U=t.attributes.instanceEnd,j=-p.near,Q=2*Math.max(L/P.width,L/P.height);t.boundingSphere===null&&t.computeBoundingSphere(),qe.copy(t.boundingSphere).applyMatrix4(c);const te=Math.max(p.near,qe.distanceToPoint(i.origin));fe.set(0,0,-te,1).applyMatrix4(p.projectionMatrix),fe.multiplyScalar(1/fe.w),fe.applyMatrix4(p.projectionMatrixInverse);const ae=Math.abs(Q/fe.w)*.5;if(qe.radius+=ae,e.ray.intersectsSphere(qe)===!1)return;t.boundingBox===null&&t.computeBoundingBox(),pe.copy(t.boundingBox).applyMatrix4(c);const l=Math.max(p.near,pe.distanceToPoint(i.origin));fe.set(0,0,-l,1).applyMatrix4(p.projectionMatrix),fe.multiplyScalar(1/fe.w),fe.applyMatrix4(p.projectionMatrixInverse);const v=Math.abs(Q/fe.w)*.5;if(pe.max.x+=v,pe.max.y+=v,pe.max.z+=v,pe.min.x-=v,pe.min.y-=v,pe.min.z-=v,e.ray.intersectsBox(pe)!==!1){i.at(1,ve),ve.w=1,ve.applyMatrix4(p.matrixWorldInverse),ve.applyMatrix4(F),ve.multiplyScalar(1/ve.w),ve.x*=P.x/2,ve.y*=P.y/2,ve.z=0,at.copy(ve),st.multiplyMatrices(p.matrixWorldInverse,c);for(let S=0,E=r.count;S<E;S++){re.fromBufferAttribute(r,S),ie.fromBufferAttribute(U,S),et.w=1,tt.w=1,re.applyMatrix4(st),ie.applyMatrix4(st);var b=re.z>j&&ie.z>j;if(b)continue;if(re.z>j){const W=re.z-ie.z,X=(re.z-j)/W;re.lerp(ie,X)}else if(ie.z>j){const W=ie.z-re.z,X=(ie.z-j)/W;ie.lerp(re,X)}re.applyMatrix4(F),ie.applyMatrix4(F),re.multiplyScalar(1/re.w),ie.multiplyScalar(1/ie.w),re.x*=P.x/2,re.y*=P.y/2,ie.x*=P.x/2,ie.y*=P.y/2,ce.start.copy(re),ce.start.z=0,ce.end.copy(ie),ce.end.z=0;const N=ce.closestPointToPointParameter(at,!0);ce.at(N,xt);const I=na.lerp(re.z,ie.z,N),x=I>=-1&&I<=1,R=at.distanceTo(xt)<L*.5;if(x&&R){ce.start.fromBufferAttribute(r,S),ce.end.fromBufferAttribute(U,S),ce.start.applyMatrix4(c),ce.end.applyMatrix4(c);const W=new Se,X=new Se;i.distanceSqToSegment(ce.start,ce.end,X,W),a.push({point:X,pointOnLine:W,distance:i.origin.distanceTo(X),object:this,face:null,faceIndex:S,uv:null,uv2:null})}}}}}Bt.prototype.LineSegments2=!0;class Tt extends vt{constructor(){super(),this.type="LineGeometry"}setPositions(e){for(var a=e.length-3,o=new Float32Array(2*a),i=0;i<a;i+=3)o[2*i]=e[i],o[2*i+1]=e[i+1],o[2*i+2]=e[i+2],o[2*i+3]=e[i+3],o[2*i+4]=e[i+4],o[2*i+5]=e[i+5];return super.setPositions(o),this}setColors(e){for(var a=e.length-3,o=new Float32Array(2*a),i=0;i<a;i+=3)o[2*i]=e[i],o[2*i+1]=e[i+1],o[2*i+2]=e[i+2],o[2*i+3]=e[i+3],o[2*i+4]=e[i+4],o[2*i+5]=e[i+5];return super.setColors(o),this}fromLine(e){var a=e.geometry;if(a.isGeometry){console.error("THREE.LineGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else a.isBufferGeometry&&this.setPositions(a.attributes.position.array);return this}copy(){return this}}Tt.prototype.isLineGeometry=!0;class as extends Bt{constructor(e=new Tt,a=new ft({color:Math.random()*16777215})){super(e,a),this.type="Line2"}}as.prototype.isLine2=!0;const nt=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function Js(q){for(let e=0;e<nt.length-1;e++){const[a,o]=nt[e],[i,p]=nt[e+1];if(q>=a&&q<=i)return o+(q-a)/(i-a)*(p-o)}return 512}function yt(q){return 8.5+5.2*Math.log10(1+q/200)}function Xs(q,e){return q+(yt(e)-yt(0))}var ss=D('<span class="band-flag svelte-1v3z2gg" aria-hidden="true">▸</span>'),ns=D('<span class="band-dot svelte-1v3z2gg" aria-hidden="true"></span>'),rs=D('<li><button type="button"><!> <span class="band-name svelte-1v3z2gg"> </span> <span class="band-alt svelte-1v3z2gg"> </span></button></li>'),is=D('<li class="surface-row svelte-1v3z2gg" aria-hidden="true"><span class="surface-line svelte-1v3z2gg"></span> <span class="surface-label svelte-1v3z2gg"> </span> <span class="surface-alt"> </span></li>'),os=D('<aside class="ruler svelte-1v3z2gg"><h3 class="ruler-title svelte-1v3z2gg"> </h3> <ul class="ruler-bands svelte-1v3z2gg"><!> <!></ul></aside>');function Ys(q,e){ze(e,!0);let a=_e(e,"highlightRegime",3,null),o=_e(e,"anchorBottomPx",3,80);function i(l){return l==null?0:typeof l=="number"?l:(l[0]+l[1])/2}function p(l){return l.altitude_km!=null?i(l.altitude_km):i(l.distance_au)}let F=Me(()=>e.order?e.order.map(l=>e.regimes.find(v=>v.id===l)).filter(l=>l!=null):[...e.regimes].sort((l,v)=>p(v)-p(l)));function c(l){if(typeof l=="number")return l>=1e3?`${(l/1e3).toFixed(0)},000 km`:`${l} km`;const[v,b]=l,S=E=>E>=1e3?`${(E/1e3).toFixed(0)}k`:`${E}`;return`${S(v)}-${S(b)} km`}function t(l){const v=b=>b<10?b.toFixed(1):b<1e3?b.toFixed(0):b<1e4?`${(b/1e3).toFixed(1)}k`:`${(b/1e3).toFixed(0)}k`;return typeof l=="number"?`${v(l)} AU`:`${v(l[0])}-${v(l[1])} AU`}function z(l){return l.altitude_km!=null?c(l.altitude_km):l.distance_au!=null?t(l.distance_au):""}var P=os();let L;var r=n(P),U=n(r,!0);s(r);var j=f(r,2),Q=n(j);it(Q,17,()=>m(F),l=>l.id,(l,v)=>{var b=rs(),S=n(b);let E,N;var I=n(S);{var x=y=>{var K=ss();g(y,K)},R=y=>{var K=ns();g(y,K)};J(I,y=>{m(v).id===a()?y(x):y(R,-1)})}var W=f(I,2),X=n(W,!0);s(W);var C=f(W,2),T=n(C,!0);s(C),s(S),s(b),G(y=>{E=dt(S,1,"band svelte-1v3z2gg",null,E,{"band--highlighted":m(v).id===a()}),Ue(S,"aria-current",m(v).id===a()?"true":void 0),N=Ie(S,"",N,{"--regime-color":m(v).color}),u(X,m(v).short??m(v).id),u(T,y)},[()=>z(m(v))]),Oe("click",S,()=>e.onSelect(m(v).id)),g(l,b)});var te=f(Q,2);{var ae=l=>{const v=Me(()=>e.surfaceAnchor??{label:la(),value:"0 km"});var b=is(),S=f(n(b),2),E=n(S,!0);s(S);var N=f(S,2),I=n(N,!0);s(N),s(b),G(()=>{u(E,m(v).label),u(I,m(v).value)}),g(l,b)};J(te,l=>{e.surfaceAnchor!==null&&l(ae)})}s(j),s(P),G((l,v)=>{Ue(P,"aria-label",l),L=Ie(P,"",L,{"--ruler-bottom":`${o()??""}px`}),u(U,v)},[()=>ia(),()=>oa()]),g(q,P),Pe()}ct(["click"]);const Qs={mercury:{diameterKm:4880,diameterRatioEarth:.38,surfaceGravityG:.38,atmoBar:0,atmoComposition:"Na · K · O · H exosphere (trace)",surfaceTempK:440,maxWindMs:0,escapeKms:4.3,surfaceKind:"rocky",radiation:"extreme"},venus:{diameterKm:12104,diameterRatioEarth:.95,surfaceGravityG:.91,atmoBar:92,atmoComposition:"CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck",surfaceTempK:737,maxWindMs:1,escapeKms:10.4,surfaceKind:"rocky",radiation:"shielded"},earth:{diameterKm:12742,diameterRatioEarth:1,surfaceGravityG:1,atmoBar:1,atmoComposition:"N₂ 78% · O₂ 21% · Ar 0.9%",surfaceTempK:288,maxWindMs:50,escapeKms:11.2,surfaceKind:"rocky-liquid",radiation:"shielded"},moon:{diameterKm:3474,diameterRatioEarth:.273,surfaceGravityG:.165,atmoBar:0,atmoComposition:"He · Ar · Na exosphere (trace)",surfaceTempK:250,maxWindMs:0,escapeKms:2.38,surfaceKind:"rocky",radiation:"high"},mars:{diameterKm:6779,diameterRatioEarth:.53,surfaceGravityG:.38,atmoBar:.006,atmoComposition:"CO₂ 95% · N₂ 2.8% · Ar 2%",surfaceTempK:210,maxWindMs:30,escapeKms:5,surfaceKind:"rocky",radiation:"high"},jupiter:{diameterKm:139820,diameterRatioEarth:10.97,surfaceGravityG:2.53,atmoBar:1,atmoComposition:"H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds",surfaceTempK:165,maxWindMs:100,escapeKms:59.5,surfaceKind:"gas-giant",radiation:"extreme"},saturn:{diameterKm:116460,diameterRatioEarth:9.14,surfaceGravityG:1.07,atmoBar:1,atmoComposition:"H₂ 96% · He 3% · CH₄/NH₃ clouds",surfaceTempK:134,maxWindMs:500,escapeKms:35.5,surfaceKind:"gas-giant",radiation:"high"},uranus:{diameterKm:50724,diameterRatioEarth:3.98,surfaceGravityG:.89,atmoBar:1,atmoComposition:"H₂ 83% · He 15% · CH₄ 2.3%",surfaceTempK:76,maxWindMs:250,escapeKms:21.3,surfaceKind:"ice-giant",radiation:"moderate"},neptune:{diameterKm:49244,diameterRatioEarth:3.86,surfaceGravityG:1.14,atmoBar:1,atmoComposition:"H₂ 80% · He 19% · CH₄ 1.5%",surfaceTempK:72,maxWindMs:580,escapeKms:23.5,surfaceKind:"ice-giant",radiation:"moderate"},pluto:{diameterKm:2376,diameterRatioEarth:.19,surfaceGravityG:.06,atmoBar:1e-6,atmoComposition:"N₂ + CH₄ + CO (~10 μbar, sublimates)",surfaceTempK:44,maxWindMs:0,escapeKms:1.2,surfaceKind:"rocky-ice",radiation:"shielded"}},ot=8.317,ls=299792.458*60;function wt(q,e=1){return{fromSunMin:q*ot,fromEarthMin:Math.abs(q-e)*ot}}function cs(q,e){return{fromSunMin:q*ot,fromEarthMin:e/ls}}const Zs={earth:{rotationHours:23.93,lightTime:wt(1)},moon:{rotationHours:655.7,lightTime:cs(1,384400)},mars:{rotationHours:24.62,lightTime:wt(1.524)}},We={mars:{core:"#fff1e6",bright:"#ff9a4d",mid:"#ff6a2e",deep:"#c8371a",glowRGB:"255,122,60"},earth:{core:"#ecffff",bright:"#7fe0ff",mid:"#3aa0ff",deep:"#2b6cff",glowRGB:"90,190,255"},moon:{core:"#ffffff",bright:"#e6ebf5",mid:"#c1c6d4",deep:"#9298aa",glowRGB:"205,213,233"}};var ds=D('<span class="wave-hint svelte-njfz5t"> </span>'),us=D('<div role="button" tabindex="0"><canvas class="wave-canvas svelte-njfz5t"></canvas> <div class="wave-caption svelte-njfz5t"><span class="wave-cue svelte-njfz5t" aria-hidden="true"><!></span> <!></div></div>');function vs(q,e){ze(e,!0);const a={earth:{amp:1,rolloff:.15,noise:.2,caption:()=>fa(),src:"audio/atmosphere/earth-wind.mp3"},mars:{amp:.55,rolloff:.78,noise:.14,caption:()=>va(),src:"audio/atmosphere/mars-wind.mp3"},moon:{amp:0,rolloff:1,noise:0,caption:()=>ua(),src:null}},o=Me(()=>a[e.bodyKey]??null);let i=Ce(null),p=Ce(!1),F=Ce(!1),c=()=>{};ut(()=>{var A;if(!m(i)||!m(o))return;const L=m(i),r=L.getContext("2d");if(!r)return;const U=m(o),j=We[e.bodyKey]??We.earth,Q=typeof window<"u"&&((A=window.matchMedia)==null?void 0:A.call(window,"(prefers-reduced-motion: reduce)").matches),te=d=>`rgba(${j.glowRGB},${d})`,ae=d=>Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,d))),.55);let l=null,v=null,b=null,S=null,E=null;const N=()=>{try{E==null||E.stop()}catch{}E=null,me(p,!1)};c=async()=>{if(U.src){if(m(p))return N();try{if(l||(l=new AudioContext,v=l.createAnalyser(),v.fftSize=128,v.smoothingTimeConstant=.75,v.connect(l.destination),b=new Uint8Array(v.frequencyBinCount)),await l.resume(),!S){me(F,!0);const d=await fetch(`${At}/${U.src}`);S=await l.decodeAudioData(await d.arrayBuffer()),me(F,!1)}E=l.createBufferSource(),E.buffer=S,E.connect(v),E.onended=()=>{me(p,!1),E=null},E.start(),me(p,!0)}catch{me(F,!1),me(p,!1)}}};const I=()=>{const d=L.clientWidth||300,M=L.clientHeight||74;return{w:d,h:M,mid:M/2,maxA:M/2*.9}},x=()=>{const d=window.devicePixelRatio||1,{w:M,h:O}=I();L.width=Math.round(M*d),L.height=Math.round(O*d),r.setTransform(d,0,0,d,0,0)};x();const R=new ResizeObserver(x);R.observe(L);const W=(d,M,O,Z,oe)=>{if(m(p)&&b&&b.length){const de=Math.min(b.length-1,Math.floor(d*b.length));return .12+.95*(b[de]/255)}return .55+.45*Math.sin(M*Z+d*O*Math.PI*2+oe)*Math.sin(M*.7+d*3)},X=()=>{const{w:d,h:M,mid:O}=I();r.clearRect(0,0,d,M),r.save(),r.shadowColor=te(.8),r.shadowBlur=8,r.strokeStyle=j.core,r.globalAlpha=.85,r.lineWidth=1.4,r.beginPath(),r.moveTo(3,O),r.lineTo(d-3,O),r.stroke(),r.restore()},C=d=>{const{w:M,h:O,mid:Z,maxA:oe}=I();r.clearRect(0,0,M,O),m(p)&&v&&b&&v.getByteFrequencyData(b);const de=[{hue:j.deep,a:.22,sc:1,fx:2.1,sp:1.1,ph:0},{hue:j.mid,a:.28,sc:.78,fx:3.3,sp:1.7,ph:1.7},{hue:j.bright,a:.34,sc:.55,fx:4.9,sp:2.3,ph:3.1}];r.save(),r.globalCompositeOperation="lighter";for(const h of de){const k=[];for(let w=0;w<=M;w+=3){const Y=w/M,V=oe*h.sc*U.amp*ae(Y)*Math.max(0,W(Y,d,h.fx,h.sp,h.ph));k.push([w,Z-V])}r.beginPath(),k.forEach(([w,Y],V)=>V===0?r.moveTo(w,Y):r.lineTo(w,Y));for(let w=k.length-1;w>=0;w--)r.lineTo(k[w][0],Z+(Z-k[w][1]));r.closePath(),r.fillStyle=h.hue,r.globalAlpha=h.a,r.fill()}r.restore(),r.save(),r.shadowColor=te(.9),r.shadowBlur=8,r.strokeStyle=j.core,r.lineWidth=1.2,r.globalAlpha=.9,r.beginPath();for(let h=0;h<=M;h+=3){const k=h/M,w=m(p)?W(k,d,0,0,0):.6+.4*Math.sin(d*2.2+k*9),Y=.5*oe*U.amp*ae(k)*w;h===0?r.moveTo(h,Z-Y):r.lineTo(h,Z-Y)}r.stroke(),r.restore()},T=d=>U.amp===0?X():C(d);let y=0,K=!1;if(Q&&!m(p)){T(.9);const d=()=>{K||(m(p)&&T(performance.now()/1e3),y=requestAnimationFrame(d))};y=requestAnimationFrame(d)}else{const d=performance.now(),M=()=>{K||(T((performance.now()-d)/1e3),y=requestAnimationFrame(M))};y=requestAnimationFrame(M)}return()=>{K=!0,cancelAnimationFrame(y),R.disconnect(),N(),l==null||l.close().catch(()=>{})}});var t=Ne(),z=Ge(t);{var P=L=>{var r=us();let U;var j=n(r);kt(j,x=>me(i,x),()=>m(i));var Q=f(j,2),te=n(Q),ae=n(te);{var l=x=>{var R=le("◎");g(x,R)},v=x=>{var R=le("···");g(x,R)},b=x=>{var R=le("⏸");g(x,R)},S=x=>{var R=le("▶");g(x,R)};J(ae,x=>{m(o).src?m(F)?x(v,1):m(p)?x(b,2):x(S,-1):x(l)})}s(te);var E=f(te),N=f(E);{var I=x=>{var R=ds(),W=n(R);s(R),G(X=>u(W,`· ${X??""}`),[()=>m(p)?ma():ha()]),g(x,R)};J(N,x=>{m(o).src&&x(I)})}s(Q),s(r),G((x,R)=>{U=dt(r,1,"wave-tile svelte-njfz5t",null,U,{silent:!m(o).src}),Ue(r,"aria-label",x),u(E,` ${R??""} `)},[()=>m(o).src?ca():da(),()=>m(o).caption()]),Oe("click",r,()=>c()),Oe("keydown",r,x=>{(x.key==="Enter"||x.key===" ")&&(x.preventDefault(),c())}),g(L,r)};J(z,L=>{m(o)&&L(P)})}g(q,t),Pe()}ct(["click","keydown"]);var fs=D('<div class="tiles svelte-157rl9q" aria-hidden="true"><canvas class="tiles-canvas svelte-157rl9q"></canvas></div>');function ms(q,e){ze(e,!0);let a=_e(e,"rotationHours",3,null),o=Ce(null);ut(()=>{var X;if(!m(o)||!e.stats)return;const c=m(o),t=c.getContext("2d");if(!t)return;const z=e.stats,P=We[e.bodyKey]??We.earth,L=typeof window<"u"&&((X=window.matchMedia)==null?void 0:X.call(window,"(prefers-reduced-motion: reduce)").matches),r=C=>`rgba(${P.glowRGB},${C})`,U=a()!=null?Math.min(45,Math.max(3.5,Math.abs(a())/4)):null,j=a()==null?"—":Math.abs(a())<48?`${Math.abs(a()).toFixed(1)} h`:`${(Math.abs(a())/24).toFixed(1)} d`,Q=Math.min(.92,Math.max(.18,.34/Math.max(.05,z.surfaceGravityG))),te=Math.min(1,Math.max(0,(z.surfaceTempK-90)/230)),ae=z.atmoBar<=0?0:Math.min(1,Math.max(0,(Math.log10(z.atmoBar)+3)/3)),l=z.atmoBar===0?pa():z.atmoBar<.01?`${(z.atmoBar*1e3).toFixed(0)} mbar`:z.atmoBar<10?`${z.atmoBar.toFixed(1)} bar`:`${z.atmoBar.toFixed(0)} bar`,v=()=>{const C=window.devicePixelRatio||1,T=c.clientWidth||300,y=c.clientHeight||58;c.width=Math.round(T*C),c.height=Math.round(y*C),t.setTransform(C,0,0,C,0,0)};v();const b=new ResizeObserver(v);b.observe(c);const S=(C,T,y,K,A=7)=>{t.fillStyle=K,t.font=`${A}px "Space Mono", monospace`,t.textAlign="center",t.fillText(C,T,y)},E=(C,T,y,K)=>{const A=C+T/2,d=y*.46,M=Math.min(T,y)*.26;S("SPIN",A,9,r(.65),6),t.strokeStyle=r(.35),t.lineWidth=1,t.beginPath(),t.arc(A,d,M,0,Math.PI*2),t.stroke(),t.strokeStyle=r(.5),t.beginPath(),t.moveTo(A,d-M),t.lineTo(A,d-M+3),t.stroke();const O=-Math.PI/2+(U?K/U*Math.PI*2:0);t.save(),t.shadowColor=r(.9),t.shadowBlur=5,t.strokeStyle=P.bright,t.lineWidth=1.4,t.beginPath(),t.moveTo(A,d),t.lineTo(A+Math.cos(O)*M*.82,d+Math.sin(O)*M*.82),t.stroke(),t.restore(),t.fillStyle=P.core,t.beginPath(),t.arc(A,d,1.6,0,Math.PI*2),t.fill(),S(j,A,y-3,"rgba(255,255,255,0.7)",7)},N=(C,T,y,K)=>{const A=C+T/2,d=y*.78,M=15;S("GRAV",A,9,r(.65),6),t.strokeStyle=r(.25),t.lineWidth=1,t.beginPath(),t.moveTo(A-T*.28,d),t.lineTo(A+T*.28,d),t.stroke();const O=2.2,Z=K%O/O,oe=4*Z*(1-Z),de=d-oe*Q*(d-M);t.save(),t.shadowColor=r(.9),t.shadowBlur=6,t.fillStyle=P.bright,t.beginPath(),t.arc(A,de,2.6,0,Math.PI*2),t.fill(),t.restore(),S(`${z.surfaceGravityG.toFixed(2)} g`,A,y-3,"rgba(255,255,255,0.7)",7)},I=(C,T,y)=>{const K=C+T/2,A=C+T*.16,d=T*.68;S("AIR",K,9,r(.65),6);const M=y*.36,O=t.createLinearGradient(A,0,A+d,0);O.addColorStop(0,"rgba(90,150,255,0.85)"),O.addColorStop(.5,"rgba(220,220,220,0.7)"),O.addColorStop(1,"rgba(255,110,60,0.9)"),t.fillStyle=O,t.fillRect(A,M,d,4);const Z=A+te*d;t.fillStyle=P.core,t.beginPath(),t.moveTo(Z,M-3),t.lineTo(Z-2.5,M-.5),t.lineTo(Z+2.5,M-.5),t.closePath(),t.fill();const oe=y*.56;t.strokeStyle=r(.25),t.lineWidth=3,t.beginPath(),t.moveTo(A,oe),t.lineTo(A+d,oe),t.stroke(),t.strokeStyle=P.bright,t.beginPath(),t.moveTo(A,oe),t.lineTo(A+Math.max(2,ae*d),oe),t.stroke(),S(`${z.surfaceTempK} K · ${l}`,K,y-3,"rgba(255,255,255,0.7)",7)},x=C=>{const T=c.clientWidth||300,y=c.clientHeight||58;t.clearRect(0,0,T,y);const K=T/3;t.strokeStyle="rgba(255,255,255,0.08)",t.lineWidth=1;for(const A of[K,K*2])t.beginPath(),t.moveTo(A,6),t.lineTo(A,y-12),t.stroke();E(0,K,y,C),N(K,K,y,C),I(K*2,K,y)};let R=0,W=!1;if(L)x(.55);else{const C=performance.now(),T=()=>{W||(x((performance.now()-C)/1e3),R=requestAnimationFrame(T))};R=requestAnimationFrame(T)}return()=>{W=!0,cancelAnimationFrame(R),b.disconnect()}});var i=Ne(),p=Ge(i);{var F=c=>{var t=fs(),z=n(t);kt(z,P=>me(o,P),()=>m(o)),s(t),g(c,t)};J(p,c=>{e.stats&&c(F)})}g(q,i),Pe()}var hs=D('<div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> <!></span></div>'),ps=D('<div><div class="scan-eyebrow svelte-1k90nq4" aria-hidden="true"> </div> <!> <div class="scan-decor" aria-hidden="true"><!> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value scan-value-wrap svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"> </span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <div class="scan-row svelte-1k90nq4"><span class="scan-label svelte-1k90nq4"> </span> <span class="scan-value svelte-1k90nq4"><!></span></div> <!></div></div>');function $s(q,e){ze(e,!0);let a=_e(e,"rotationHours",3,null),o=_e(e,"lightTime",3,null),i=_e(e,"focusGate",3,!0),p=_e(e,"placement",3,"bottom-center"),F=_e(e,"inline",3,!1),c=Ce(!1);ut(()=>{const L=$a("planet-stats",r=>{me(c,r,!0)});return()=>L==null?void 0:L()});var t=Ne(),z=Ge(t);{var P=L=>{var r=ps();let U;var j=n(r),Q=n(j,!0);s(j);var te=f(j,2);{let _=Me(()=>e.bodyLabel.toLowerCase());vs(te,{get bodyKey(){return m(_)}})}var ae=f(te,2),l=n(ae);{let _=Me(()=>e.bodyLabel.toLowerCase());ms(l,{get bodyKey(){return m(_)},get stats(){return e.stats},get rotationHours(){return a()}})}var v=f(l,2),b=n(v),S=n(b,!0);s(b);var E=f(b,2),N=n(E);s(E),s(v);var I=f(v,2),x=n(I),R=n(x,!0);s(x);var W=f(x,2),X=n(W,!0);s(W),s(I);var C=f(I,2),T=n(C),y=n(T,!0);s(T);var K=f(T,2),A=n(K,!0);s(K),s(C);var d=f(C,2),M=n(d),O=n(M,!0);s(M);var Z=f(M,2),oe=n(Z,!0);s(Z),s(d);var de=f(d,2),h=n(de),k=n(h,!0);s(h);var w=f(h,2),Y=n(w,!0);s(w),s(de);var V=f(de,2),$=n(V),se=n($,!0);s($);var ge=f($,2),he=n(ge);{var ke=_=>{var B=le();G((H,Ee)=>u(B,`${H??""}
            ${Ee??""}`),[()=>Math.abs(a())<48?`${Math.abs(a()).toFixed(2)} h`:`${(Math.abs(a())/24).toFixed(1)} d`,()=>a()<0?`· ${za()}`:""]),g(_,B)};J(he,_=>{a()!==null&&_(ke)})}s(ge),s(V);var be=f(V,2),xe=n(be),Te=n(xe,!0);s(xe);var ue=f(xe,2),ee=n(ue);s(ue),s(be);var ne=f(be,2),ye=n(ne),Ke=n(ye,!0);s(ye);var mt=f(ye,2),Et=n(mt);s(mt),s(ne);var Ve=f(ne,2),Je=n(Ve),Ct=n(Je,!0);s(Je);var ht=f(Je,2),Gt=n(ht);{var zt=_=>{var B=le();G(H=>u(B,H),[()=>Pa()]),g(_,B)},Pt=_=>{var B=le();G(H=>u(B,H),[()=>Ka()]),g(_,B)},Kt=_=>{var B=le();G(H=>u(B,H),[()=>La()]),g(_,B)},Lt=_=>{var B=le();G(H=>u(B,H),[()=>Ra()]),g(_,B)},Rt=_=>{var B=le();G(H=>u(B,H),[()=>ja()]),g(_,B)};J(Gt,_=>{e.stats.surfaceKind==="rocky"?_(zt):e.stats.surfaceKind==="rocky-liquid"?_(Pt,1):e.stats.surfaceKind==="rocky-ice"?_(Kt,2):e.stats.surfaceKind==="gas-giant"?_(Lt,3):_(Rt,-1)})}s(ht),s(Ve);var Xe=f(Ve,2),Ye=n(Xe),jt=n(Ye,!0);s(Ye);var pt=f(Ye,2),qt=n(pt);{var Ft=_=>{var B=le();G(H=>u(B,H),[()=>qa()]),g(_,B)},Ht=_=>{var B=le();G(H=>u(B,H),[()=>Fa()]),g(_,B)},Ot=_=>{var B=le();G(H=>u(B,H),[()=>Ha()]),g(_,B)},Ut=_=>{var B=le();G(H=>u(B,H),[()=>Oa()]),g(_,B)};J(qt,_=>{e.stats.radiation==="shielded"?_(Ft):e.stats.radiation==="moderate"?_(Ht,1):e.stats.radiation==="high"?_(Ot,2):_(Ut,-1)})}s(pt),s(Xe);var It=f(Xe,2);{var Wt=_=>{var B=hs(),H=n(B),Ee=n(H,!0);s(H);var Le=f(H,2),Re=n(Le),Qe=f(Re);{var Ze=we=>{var Ae=le();G($e=>u(Ae,`· ${$e??""}`),[()=>o().fromEarthMin<60?Da({value:o().fromEarthMin.toFixed(1)}):Na({value:(o().fromEarthMin/60).toFixed(2)})]),g(we,Ae)};J(Qe,we=>{o().fromEarthMin!==null&&o().fromEarthMin>0&&we(Ze)})}s(Le),s(B),G((we,Ae)=>{u(Ee,we),u(Re,`${Ae??""} `)},[()=>Ua(),()=>o().fromSunMin<60?Ia({value:o().fromSunMin.toFixed(1)}):Wa({value:(o().fromSunMin/60).toFixed(2)})]),g(_,B)};J(It,_=>{o()&&_(Wt)})}s(ae),s(r),G((_,B,H,Ee,Le,Re,Qe,Ze,we,Ae,$e,Dt,Nt,Vt,Jt,Xt,Yt)=>{U=dt(r,1,"tactical-scan svelte-1k90nq4",null,U,{"above-altitude":p()==="above-altitude"&&!F(),inline:F()}),u(Q,_),u(S,B),u(N,`${H??""} g`),u(R,Ee),u(X,Le),u(y,Re),u(A,e.stats.atmoComposition),u(O,Qe),u(oe,Ze),u(k,we),u(Y,Ae),u(se,$e),u(Te,Dt),u(ee,`${Nt??""} km`),u(Ke,Vt),u(Et,`${Jt??""} km/s`),u(Ct,Xt),u(jt,Yt)},[()=>_a({planet:e.bodyLabel}),()=>ga(),()=>e.stats.surfaceGravityG.toFixed(2),()=>ba(),()=>e.stats.atmoBar===0?xa():e.stats.atmoBar<.01?`${(e.stats.atmoBar*1e3).toFixed(2)} mbar`:e.stats.atmoBar<10?`${e.stats.atmoBar.toFixed(2)} bar`:`${e.stats.atmoBar.toFixed(0)} bar`,()=>ya(),()=>wa(),()=>Sa({k:e.stats.surfaceTempK.toString(),c:(e.stats.surfaceTempK-273).toFixed(0)}),()=>Ma(),()=>e.stats.maxWindMs===0?ka():Aa({ms:e.stats.maxWindMs.toString()}),()=>Ba(),()=>Ta(),()=>e.stats.diameterKm.toLocaleString(),()=>Ea(),()=>e.stats.escapeKms.toFixed(1),()=>Ca(),()=>Ga()]),g(L,r)};J(z,L=>{e.stats&&(F()||m(c)&&i())&&L(P)})}g(q,t),Pe()}var _s=D('<div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div>'),gs=D('<p class="editorial svelte-1je9b37"> </p>'),bs=D('<div class="story svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <p class="story-text svelte-1je9b37"> </p></div>'),xs=D('<button type="button" class="resident-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></button>'),ys=D('<span class="resident-label"> </span>'),ws=D('<li class="svelte-1je9b37"><span class="agency-dot svelte-1je9b37" aria-hidden="true"></span> <!></li>'),Ss=D('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="residents svelte-1je9b37"></ul></div>'),Ms=D('<a class="firsts-link svelte-1je9b37"> <span class="resident-arrow svelte-1je9b37" aria-hidden="true">↗</span></a>'),ks=D('<span class="firsts-label"> </span>'),As=D('<li class="svelte-1je9b37"><span class="firsts-year svelte-1je9b37"> </span> <!></li>'),Bs=D('<div class="block svelte-1je9b37"><div class="cell-label svelte-1je9b37"> </div> <ul class="firsts svelte-1je9b37"></ul></div>'),Ts=D('<div class="science-block svelte-1je9b37"><h3 class="library-heading svelte-1je9b37"> </h3> <!></div>'),Es=D('<div class="head svelte-1je9b37"><div class="kind-row svelte-1je9b37"><span class="kind svelte-1je9b37"> </span></div> <div class="name svelte-1je9b37"> </div> <div class="stat-row svelte-1je9b37"><div><div class="stat-label svelte-1je9b37"> </div> <div class="stat-value svelte-1je9b37"> </div></div> <!></div></div> <!> <!> <!> <!> <!>',1);function en(q,e){ze(e,!0);let a=_e(e,"selectableIds",19,()=>new Set);function o(c){if(typeof c=="number")return c>=1e3?`${c.toLocaleString("en-US")} km`:`${c} km`;const t=z=>z.toLocaleString("en-US");return`${t(c[0])} - ${t(c[1])} km`}function i(c){const t=z=>z>=1e3?z.toLocaleString("en-US"):z.toString();return typeof c=="number"?`${t(c)} AU`:`${t(c[0])} - ${t(c[1])} AU`}function p(c){return c.altitude_km!=null?o(c.altitude_km):c.distance_au!=null?i(c.distance_au):""}function F(c){switch(c){case"NASA":case"SpaceX":return"#3b82f6";case"ROSCOSMOS":return"#ef4444";case"CNSA":return"#dc2626";case"ISRO":return"#f97316";case"JAXA":return"#1d4ed8";case"ESA":case"Arianespace":return"#1d4ed8";case"UAESA":return"#00732F";default:return"rgba(255,255,255,0.5)"}}{let c=Me(()=>{var t;return((t=e.regime)==null?void 0:t.name)??""});es(q,{get open(){return e.open},get onClose(){return e.onClose},get title(){return m(c)},zIndex:28,children:(t,z)=>{var P=Ne(),L=Ge(P);{var r=U=>{var j=Es(),Q=Ge(j);let te;var ae=n(Q),l=n(ae),v=n(l,!0);s(l),s(ae);var b=f(ae,2),S=n(b,!0);s(b);var E=f(b,2),N=n(E),I=n(N),x=n(I,!0);s(I);var R=f(I,2),W=n(R,!0);s(R),s(N);var X=f(N,2);{var C=h=>{var k=_s(),w=n(k),Y=n(w,!0);s(w);var V=f(w,2),$=n(V,!0);s(V),s(k),G(se=>{u(Y,se),u($,e.regime.firsts[0].year)},[()=>Ja()]),g(h,k)};J(X,h=>{e.regime.firsts&&e.regime.firsts.length>0&&h(C)})}s(E),s(Q);var T=f(Q,2);{var y=h=>{var k=gs(),w=n(k,!0);s(k),G(()=>u(w,e.regime.comparison)),g(h,k)};J(T,h=>{e.regime.comparison&&h(y)})}var K=f(T,2);{var A=h=>{var k=bs(),w=n(k),Y=n(w,!0);s(w);var V=f(w,2),$=n(V,!0);s(V),s(k),G(se=>{u(Y,se),u($,e.regime.story)},[()=>Xa()]),g(h,k)};J(K,h=>{e.regime.story&&h(A)})}var d=f(K,2);{var M=h=>{var k=Ss(),w=n(k),Y=n(w,!0);s(w);var V=f(w,2);it(V,21,()=>e.regime.residents,$=>$.id,($,se)=>{const ge=Me(()=>a().has(m(se).id)&&e.onResidentClick!=null);var he=ws(),ke=n(he);let be;var xe=f(ke,2);{var Te=ee=>{var ne=xs(),ye=n(ne);gt(),s(ne),G(()=>u(ye,`${m(se).label??""} `)),Oe("click",ne,()=>{var Ke;return(Ke=e.onResidentClick)==null?void 0:Ke.call(e,m(se).id)}),g(ee,ne)},ue=ee=>{var ne=ys(),ye=n(ne,!0);s(ne),G(()=>u(ye,m(se).label)),g(ee,ne)};J(xe,ee=>{m(ge)?ee(Te):ee(ue,-1)})}s(he),G(ee=>be=Ie(ke,"",be,ee),[()=>({background:F(m(se).agency)})]),g($,he)}),s(V),s(k),G($=>u(Y,$),[()=>Ya()]),g(h,k)};J(d,h=>{e.regime.residents&&e.regime.residents.length>0&&h(M)})}var O=f(d,2);{var Z=h=>{var k=Bs(),w=n(k),Y=n(w,!0);s(w);var V=f(w,2);it(V,21,()=>e.regime.firsts,ra,($,se)=>{var ge=As(),he=n(ge),ke=n(he,!0);s(he);var be=f(he,2);{var xe=ue=>{var ee=Ms(),ne=n(ee);gt(),s(ee),G(()=>{Ue(ee,"href",`${At??""}/missions?id=${m(se).mission_id??""}`),u(ne,`${m(se).label??""} `)}),g(ue,ee)},Te=ue=>{var ee=ks(),ne=n(ee,!0);s(ee),G(()=>u(ne,m(se).label)),g(ue,ee)};J(be,ue=>{m(se).mission_id?ue(xe):ue(Te,-1)})}s(ge),G(()=>u(ke,m(se).year)),g($,ge)}),s(V),s(k),G($=>u(Y,$),[()=>Qa()]),g(h,k)};J(O,h=>{e.regime.firsts&&e.regime.firsts.length>0&&h(Z)})}var oe=f(O,2);{var de=h=>{var k=Ts(),w=n(k),Y=n(w,!0);s(w);var V=f(w,2);ts(V,{get tab(){return e.regime.science_link.tab},get section(){return e.regime.science_link.section}}),s(k),G($=>u(Y,$),[()=>Za()]),g(h,k)};J(oe,h=>{e.regime.science_link&&h(de)})}G((h,k)=>{te=Ie(Q,"",te,{"--regime-color":e.regime.color}),u(v,e.regime.short??e.regime.id),u(S,e.regime.name??e.regime.id),u(x,h),u(W,k)},[()=>Va(),()=>p(e.regime)]),g(U,j)};J(L,U=>{e.regime&&U(r)})}g(t,P)},$$slots:{default:!0}})}Pe()}ct(["click"]);export{We as B,Tt as L,Ys as O,Qs as P,en as R,Zs as S,$s as T,ft as a,as as b,Js as c,wt as d,Xs as e,ot as f};
