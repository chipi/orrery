import{I as re,F as N,o as P,p as w,al as oe,c as j,a5 as J,ah as y,a4 as ae,a3 as E,af as $,ag as ce,ae as A,H as le,ai as B,z as ue,r as fe,y as de}from"./ChrIQJ-w.js";const q=new j,_=new y;class D extends re{constructor(){super(),this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],i=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(i),this.setAttribute("position",new N(e,3)),this.setAttribute("uv",new N(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,i=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),i.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const i=new P(t,6,1);return this.setAttribute("instanceStart",new w(i,3,0)),this.setAttribute("instanceEnd",new w(i,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const i=new P(t,6,1);return this.setAttribute("instanceColorStart",new w(i,3,0)),this.setAttribute("instanceColorEnd",new w(i,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new oe(e.geometry)),this}romLineSegments(e){const t=e.geometry;if(t.isGeometry){console.error("THREE.LineSegmentsGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else t.isBufferGeometry&&this.setPositions(t.attributes.position.array);return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new j);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),q.setFromBufferAttribute(t),this.boundingBox.union(q))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new J),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const i=this.boundingSphere.center;this.boundingBox.getCenter(i);let n=0;for(let s=0,u=e.count;s<u;s++)_.fromBufferAttribute(e,s),n=Math.max(n,i.distanceToSquared(_)),_.fromBufferAttribute(t,s),n=Math.max(n,i.distanceToSquared(_));this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}D.prototype.isLineSegmentsGeometry=!0;A.line={linewidth:{value:1},resolution:{value:new ce(1,1)},dashScale:{value:1},dashSize:{value:1},dashOffset:{value:0},gapSize:{value:1},opacity:{value:1}};E.line={uniforms:$.merge([A.common,A.fog,A.line]),vertexShader:`
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
		`};class H extends ae{constructor(e){super({type:"LineMaterial",uniforms:$.clone(E.line.uniforms),vertexShader:E.line.vertexShader,fragmentShader:E.line.fragmentShader,clipping:!0}),this.dashed=!1,Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(t){this.uniforms.diffuse.value=t}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(t){this.uniforms.linewidth.value=t}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(t){this.uniforms.dashScale.value=t}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(t){this.uniforms.dashSize.value=t}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(t){this.uniforms.dashOffset.value=t}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(t){this.uniforms.gapSize.value=t}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(t){this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(t){this.uniforms.resolution.value.copy(t)}},alphaToCoverage:{enumerable:!0,get:function(){return"ALPHA_TO_COVERAGE"in this.defines},set:function(t){!!t!="ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),t?(this.defines.ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}H.prototype.isLineMaterial=!0;const U=new y,G=new y,r=new B,o=new B,d=new B,T=new y,O=new ue,l=new fe,k=new y,m=new j,M=new J,p=new B;class K extends le{constructor(e=new D,t=new H({color:Math.random()*16777215})){super(e,t),this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,i=e.attributes.instanceEnd,n=new Float32Array(2*t.count);for(let u=0,c=0,f=t.count;u<f;u++,c+=2)U.fromBufferAttribute(t,u),G.fromBufferAttribute(i,u),n[c]=c===0?0:n[c-1],n[c+1]=n[c]+U.distanceTo(G);const s=new P(n,2,1);return e.setAttribute("instanceDistanceStart",new w(s,1,0)),e.setAttribute("instanceDistanceEnd",new w(s,1,1)),this}raycast(e,t){e.camera===null&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2.');const i=e.params.Line2!==void 0&&e.params.Line2.threshold||0,n=e.ray,s=e.camera,u=s.projectionMatrix,c=this.matrixWorld,f=this.geometry,R=this.material,h=R.resolution,z=R.linewidth+i,L=f.attributes.instanceStart,I=f.attributes.instanceEnd,x=-s.near,F=2*Math.max(z/h.width,z/h.height);f.boundingSphere===null&&f.computeBoundingSphere(),M.copy(f.boundingSphere).applyMatrix4(c);const Y=Math.max(s.near,M.distanceToPoint(n.origin));p.set(0,0,-Y,1).applyMatrix4(s.projectionMatrix),p.multiplyScalar(1/p.w),p.applyMatrix4(s.projectionMatrixInverse);const Z=Math.abs(F/p.w)*.5;if(M.radius+=Z,e.ray.intersectsSphere(M)===!1)return;f.boundingBox===null&&f.computeBoundingBox(),m.copy(f.boundingBox).applyMatrix4(c);const ee=Math.max(s.near,m.distanceToPoint(n.origin));p.set(0,0,-ee,1).applyMatrix4(s.projectionMatrix),p.multiplyScalar(1/p.w),p.applyMatrix4(s.projectionMatrixInverse);const S=Math.abs(F/p.w)*.5;if(m.max.x+=S,m.max.y+=S,m.max.z+=S,m.min.x-=S,m.min.y-=S,m.min.z-=S,e.ray.intersectsBox(m)!==!1){n.at(1,d),d.w=1,d.applyMatrix4(s.matrixWorldInverse),d.applyMatrix4(u),d.multiplyScalar(1/d.w),d.x*=h.x/2,d.y*=h.y/2,d.z=0,T.copy(d),O.multiplyMatrices(s.matrixWorldInverse,c);for(let v=0,ne=L.count;v<ne;v++){r.fromBufferAttribute(L,v),o.fromBufferAttribute(I,v),U.w=1,G.w=1,r.applyMatrix4(O),o.applyMatrix4(O);var te=r.z>x&&o.z>x;if(te)continue;if(r.z>x){const b=r.z-o.z,g=(r.z-x)/b;r.lerp(o,g)}else if(o.z>x){const b=o.z-r.z,g=(o.z-x)/b;o.lerp(r,g)}r.applyMatrix4(u),o.applyMatrix4(u),r.multiplyScalar(1/r.w),o.multiplyScalar(1/o.w),r.x*=h.x/2,r.y*=h.y/2,o.x*=h.x/2,o.y*=h.y/2,l.start.copy(r),l.start.z=0,l.end.copy(o),l.end.z=0;const V=l.closestPointToPointParameter(T,!0);l.at(V,k);const W=de.lerp(r.z,o.z,V),ie=W>=-1&&W<=1,se=T.distanceTo(k)<z*.5;if(ie&&se){l.start.fromBufferAttribute(L,v),l.end.fromBufferAttribute(I,v),l.start.applyMatrix4(c),l.end.applyMatrix4(c);const b=new y,g=new y;n.distanceSqToSegment(l.start,l.end,g,b),t.push({point:g,pointOnLine:b,distance:n.origin.distanceTo(g),object:this,face:null,faceIndex:v,uv:null,uv2:null})}}}}}K.prototype.LineSegments2=!0;class Q extends D{constructor(){super(),this.type="LineGeometry"}setPositions(e){for(var t=e.length-3,i=new Float32Array(2*t),n=0;n<t;n+=3)i[2*n]=e[n],i[2*n+1]=e[n+1],i[2*n+2]=e[n+2],i[2*n+3]=e[n+3],i[2*n+4]=e[n+4],i[2*n+5]=e[n+5];return super.setPositions(i),this}setColors(e){for(var t=e.length-3,i=new Float32Array(2*t),n=0;n<t;n+=3)i[2*n]=e[n],i[2*n+1]=e[n+1],i[2*n+2]=e[n+2],i[2*n+3]=e[n+3],i[2*n+4]=e[n+4],i[2*n+5]=e[n+5];return super.setColors(i),this}fromLine(e){var t=e.geometry;if(t.isGeometry){console.error("THREE.LineGeometry no longer supports Geometry. Use THREE.BufferGeometry instead.");return}else t.isBufferGeometry&&this.setPositions(t.attributes.position.array);return this}copy(){return this}}Q.prototype.isLineGeometry=!0;class pe extends K{constructor(e=new Q,t=new H({color:Math.random()*16777215})){super(e,t),this.type="Line2"}}pe.prototype.isLine2=!0;const C=[[0,15],[.387,52],[.723,83],[1,113],[1.524,155],[2.2,192],[3.2,237],[5.2,248],[9.54,320],[19.2,378],[30.07,430],[39.5,448],[50,470],[80,498],[150,512]];function he(a){for(let e=0;e<C.length-1;e++){const[t,i]=C[e],[n,s]=C[e+1];if(a>=t&&a<=n)return i+(a-t)/(n-t)*(s-i)}return 512}function X(a){return 8.5+5.2*Math.log10(1+a/200)}function ve(a,e){return a+(X(e)-X(0))}export{pe as L,Q as a,H as b,ve as c,he as d};
