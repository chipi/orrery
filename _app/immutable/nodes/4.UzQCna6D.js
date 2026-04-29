import{c as Yi,a as Tt,t as en,h as rc}from"../chunks/disclose-version.Dj5WcrnP.js";import{I as La,E as sc,aE as ac,aF as oc,ad as lc,b as cc,aG as hc,aH as uc,aI as dc,aJ as fc,J as pc,n as mi,F as Ca,G as Ra,H as mc,p as ar,a as sa,i as Vt,j as or,k as le,l as ce,s as fe,t as Ve,g as Y,q as et,C as Ct,h as at,D as gc,$ as vc}from"../chunks/runtime.DRJICulf.js";import{a as xc,d as Qr,s as ze}from"../chunks/render.CAIASrMb.js";import{i as mn,p as gn,o as el,b as Xs,a as _c}from"../chunks/index-client.aBPkY8cc.js";import{s as yc,a as Gn,t as Rn}from"../chunks/class.D1ugvMTq.js";import{s as kr}from"../chunks/style.PwPRnE0L.js";import{g as Mc}from"../chunks/entry.DYLp53BU.js";import{b as tl}from"../chunks/control.DURNHYO3.js";const wc=()=>performance.now(),vn={tick:r=>requestAnimationFrame(r),now:()=>wc(),tasks:new Set};function nl(){const r=vn.now();vn.tasks.forEach(e=>{e.c(r)||(vn.tasks.delete(e),e.f())}),vn.tasks.size!==0&&vn.tick(nl)}function bc(r){let e;return vn.tasks.size===0&&vn.tick(nl),{promise:new Promise(t=>{vn.tasks.add(e={c:r,f:t})}),abort(){vn.tasks.delete(e)}}}function hr(r,e){r.dispatchEvent(new CustomEvent(e))}function Sc(r){if(r==="float")return"cssFloat";if(r==="offset")return"cssOffset";if(r.startsWith("--"))return r;const e=r.split("-");return e.length===1?e[0]:e[0]+e.slice(1).map(t=>t[0].toUpperCase()+t.slice(1)).join("")}function Pa(r){const e={},t=r.split(";");for(const n of t){const[i,s]=n.split(":");if(!i||s===void 0)break;const a=Sc(i.trim());e[a]=s.trim()}return e}const Ec=r=>r;function Ia(r,e,t,n){var i=(r&uc)!==0,s=(r&dc)!==0,a=i&&s,o=(r&hc)!==0,l=a?"both":i?"in":"out",c,h=e.inert,u,d;function f(){var p=mc,E=La;Ca(null),Ra(null);try{return c??(c=t()(e,(n==null?void 0:n())??{},{direction:l}))}finally{Ca(p),Ra(E)}}var m={is_global:o,in(){var p;if(e.inert=h,!i){d==null||d.abort(),(p=d==null?void 0:d.reset)==null||p.call(d);return}s||u==null||u.abort(),hr(e,"introstart"),u=qs(e,f(),d,1,()=>{hr(e,"introend"),u==null||u.abort(),u=c=void 0})},out(p){if(!s){p==null||p(),c=void 0;return}e.inert=!0,hr(e,"outrostart"),d=qs(e,f(),u,0,()=>{hr(e,"outroend"),p==null||p()})},stop:()=>{u==null||u.abort(),d==null||d.abort()}},v=La;if((v.transitions??(v.transitions=[])).push(m),i&&xc){var x=o;if(!x){for(var g=v.parent;g&&g.f&sc;)for(;(g=g.parent)&&!(g.f&ac););x=!g||(g.f&oc)!==0}x&&lc(()=>{cc(()=>m.in())})}}function qs(r,e,t,n,i){var s=n===1;if(fc(e)){var a,o=!1;return pc(()=>{if(!o){var x=e({direction:s?"in":"out"});a=qs(r,x,t,n,i)}}),{abort:()=>{o=!0,a==null||a.abort()},deactivate:()=>a.deactivate(),reset:()=>a.reset(),t:()=>a.t()}}if(t==null||t.deactivate(),!(e!=null&&e.duration))return i(),{abort:mi,deactivate:mi,reset:mi,t:()=>n};const{delay:l=0,css:c,tick:h,easing:u=Ec}=e;var d=[];if(s&&t===void 0&&(h&&h(0,1),c)){var f=Pa(c(0,1));d.push(f,f)}var m=()=>1-n,v=r.animate(d,{duration:l});return v.onfinish=()=>{var x=(t==null?void 0:t.t())??1-n;t==null||t.abort();var g=n-x,p=e.duration*Math.abs(g),E=[];if(p>0){if(c)for(var T=Math.ceil(p/16.666666666666668),S=0;S<=T;S+=1){var _=x+g*u(S/T),P=c(_,1-_);E.push(Pa(P))}m=()=>{var N=v.currentTime;return x+g*u(N/p)},h&&bc(()=>{if(v.playState!=="running")return!1;var N=m();return h(N,1-N),!0})}v=r.animate(E,{duration:p,fill:"forwards"}),v.onfinish=()=>{m=()=>n,h==null||h(n,1-n),i()}},{abort:()=>{v&&(v.cancel(),v.effect=null,v.onfinish=mi)},deactivate:()=>{i=mi},reset:()=>{n===0&&(h==null||h(1,0))},t:()=>m()}}/**
 * @license
 * Copyright 2010-2021 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const il="128",Tc=0,Da=1,Ac=2,rl=1,Lc=2,Xi=3,Kr=0,ft=1,bi=2,sl=1,ji=0,Zi=1,Ys=2,Na=3,Fa=4,Cc=5,gi=100,Rc=101,Pc=102,Ba=103,za=104,Ic=200,Dc=201,Nc=202,Fc=203,al=204,ol=205,Bc=206,zc=207,Oc=208,Uc=209,Hc=210,kc=0,Gc=1,Vc=2,js=3,Wc=4,Xc=5,qc=6,Yc=7,$r=0,jc=1,Zc=2,Ji=0,Jc=1,Qc=2,Kc=3,$c=4,eh=5,ll=300,aa=301,oa=302,Oa=303,Ua=304,la=306,ca=307,Zs=1e3,Kt=1001,Js=1002,Rt=1003,Ha=1004,ka=1005,Wt=1006,th=1007,ha=1008,ua=1009,nh=1010,ih=1011,Gr=1012,rh=1013,Hr=1014,Cn=1015,Vr=1016,sh=1017,ah=1018,oh=1019,Qi=1020,lh=1021,Vn=1022,$t=1023,ch=1024,hh=1025,Mi=1026,er=1027,uh=1028,dh=1029,fh=1030,ph=1031,mh=1032,gh=1033,Ga=33776,Va=33777,Wa=33778,Xa=33779,qa=35840,Ya=35841,ja=35842,Za=35843,vh=36196,Ja=37492,Qa=37496,xh=37808,_h=37809,yh=37810,Mh=37811,wh=37812,bh=37813,Sh=37814,Eh=37815,Th=37816,Ah=37817,Lh=37818,Ch=37819,Rh=37820,Ph=37821,Ih=36492,Dh=37840,Nh=37841,Fh=37842,Bh=37843,zh=37844,Oh=37845,Uh=37846,Hh=37847,kh=37848,Gh=37849,Vh=37850,Wh=37851,Xh=37852,qh=37853,Yh=2200,jh=2201,Zh=2202,Wr=2300,Xr=2301,os=2302,vi=2400,xi=2401,qr=2402,da=2500,cl=2501,Jh=0,lr=3e3,hl=3001,Qh=3007,Kh=3002,$h=3003,eu=3004,tu=3005,nu=3006,iu=3200,ru=3201,Ti=0,su=1,ls=7680,au=519,tr=35044,Yr=35048,Ka="300 es";class qn{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const i=this._listeners[e];if(i!==void 0){const s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const n=this._listeners[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let s=0,a=i.length;s<a;s++)i[s].call(this,e);e.target=null}}}const yt=[];for(let r=0;r<256;r++)yt[r]=(r<16?"0":"")+r.toString(16);const cs=Math.PI/180,Qs=180/Math.PI;function on(){const r=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(yt[r&255]+yt[r>>8&255]+yt[r>>16&255]+yt[r>>24&255]+"-"+yt[e&255]+yt[e>>8&255]+"-"+yt[e>>16&15|64]+yt[e>>24&255]+"-"+yt[t&63|128]+yt[t>>8&255]+"-"+yt[t>>16&255]+yt[t>>24&255]+yt[n&255]+yt[n>>8&255]+yt[n>>16&255]+yt[n>>24&255]).toUpperCase()}function Ut(r,e,t){return Math.max(e,Math.min(t,r))}function ou(r,e){return(r%e+e)%e}function hs(r,e,t){return(1-t)*r+t*e}function $a(r){return(r&r-1)===0&&r!==0}function lu(r){return Math.pow(2,Math.ceil(Math.log(r)/Math.LN2))}function cu(r){return Math.pow(2,Math.floor(Math.log(r)/Math.LN2))}class se{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e,t){return t!==void 0?(console.warn("THREE.Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(e,t)):(this.x+=e.x,this.y+=e.y,this)}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e,t){return t!==void 0?(console.warn("THREE.Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(e,t)):(this.x-=e.x,this.y-=e.y,this)}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t,n){return n!==void 0&&console.warn("THREE.Vector2: offset has been removed from .fromBufferAttribute()."),this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*i+e.x,this.y=s*i+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}}se.prototype.isVector2=!0;class wt{constructor(){this.elements=[1,0,0,0,1,0,0,0,1],arguments.length>0&&console.error("THREE.Matrix3: the constructor no longer reads arguments. use .set() instead.")}set(e,t,n,i,s,a,o,l,c){const h=this.elements;return h[0]=e,h[1]=i,h[2]=o,h[3]=t,h[4]=s,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],m=n[8],v=i[0],x=i[3],g=i[6],p=i[1],E=i[4],T=i[7],S=i[2],_=i[5],P=i[8];return s[0]=a*v+o*p+l*S,s[3]=a*x+o*E+l*_,s[6]=a*g+o*T+l*P,s[1]=c*v+h*p+u*S,s[4]=c*x+h*E+u*_,s[7]=c*g+h*T+u*P,s[2]=d*v+f*p+m*S,s[5]=d*x+f*E+m*_,s[8]=d*g+f*T+m*P,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-n*s*h+n*o*l+i*s*c-i*a*l}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=h*a-o*c,d=o*l-h*s,f=c*s-a*l,m=t*u+n*d+i*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/m;return e[0]=u*v,e[1]=(i*c-h*n)*v,e[2]=(o*n-i*a)*v,e[3]=d*v,e[4]=(h*t-i*l)*v,e[5]=(i*s-o*t)*v,e[6]=f*v,e[7]=(n*l-c*t)*v,e[8]=(a*t-n*s)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,a,o){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-i*c,i*l,-i*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){const n=this.elements;return n[0]*=e,n[3]*=e,n[6]*=e,n[1]*=t,n[4]*=t,n[7]*=t,this}rotate(e){const t=Math.cos(e),n=Math.sin(e),i=this.elements,s=i[0],a=i[3],o=i[6],l=i[1],c=i[4],h=i[7];return i[0]=t*s+n*l,i[3]=t*a+n*c,i[6]=t*o+n*h,i[1]=-n*s+t*l,i[4]=-n*a+t*c,i[7]=-n*o+t*h,this}translate(e,t){const n=this.elements;return n[0]+=e*n[2],n[3]+=e*n[5],n[6]+=e*n[8],n[1]+=t*n[2],n[4]+=t*n[5],n[7]+=t*n[8],this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}wt.prototype.isMatrix3=!0;let Kn;class Ai{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Kn===void 0&&(Kn=document.createElementNS("http://www.w3.org/1999/xhtml","canvas")),Kn.width=e.width,Kn.height=e.height;const n=Kn.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Kn}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}}let hu=0;class bt extends qn{constructor(e=bt.DEFAULT_IMAGE,t=bt.DEFAULT_MAPPING,n=Kt,i=Kt,s=Wt,a=ha,o=$t,l=ua,c=1,h=lr){super(),Object.defineProperty(this,"id",{value:hu++}),this.uuid=on(),this.name="",this.image=e,this.mipmaps=[],this.mapping=t,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new se(0,0),this.repeat=new se(1,1),this.center=new se(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new wt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.encoding=h,this.version=0,this.onUpdate=null}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.image=e.image,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.encoding=e.encoding,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.5,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,mapping:this.mapping,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,type:this.type,encoding:this.encoding,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(this.image!==void 0){const i=this.image;if(i.uuid===void 0&&(i.uuid=on()),!t&&e.images[i.uuid]===void 0){let s;if(Array.isArray(i)){s=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?s.push(us(i[a].image)):s.push(us(i[a]))}else s=us(i);e.images[i.uuid]={uuid:i.uuid,url:s}}n.image=i.uuid}return t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ll)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Zs:e.x=e.x-Math.floor(e.x);break;case Kt:e.x=e.x<0?0:1;break;case Js:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Zs:e.y=e.y-Math.floor(e.y);break;case Kt:e.y=e.y<0?0:1;break;case Js:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&this.version++}}bt.DEFAULT_IMAGE=void 0;bt.DEFAULT_MAPPING=ll;bt.prototype.isTexture=!0;function us(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?Ai.getDataURL(r):r.data?{data:Array.prototype.slice.call(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}class tt{constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e,t){return t!==void 0?(console.warn("THREE.Vector4: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(e,t)):(this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this)}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e,t){return t!==void 0?(console.warn("THREE.Vector4: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(e,t)):(this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this)}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*i+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*i+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*i+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*i+a[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s;const l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],m=l[9],v=l[2],x=l[6],g=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-v)<.01&&Math.abs(m-x)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+v)<.1&&Math.abs(m+x)<.1&&Math.abs(c+f+g-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const E=(c+1)/2,T=(f+1)/2,S=(g+1)/2,_=(h+d)/4,P=(u+v)/4,N=(m+x)/4;return E>T&&E>S?E<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(E),i=_/n,s=P/n):T>S?T<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(T),n=_/i,s=N/i):S<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(S),n=P/s,i=N/s),this.set(n,i,s,t),this}let p=Math.sqrt((x-m)*(x-m)+(u-v)*(u-v)+(d-h)*(d-h));return Math.abs(p)<.001&&(p=1),this.x=(x-m)/p,this.y=(u-v)/p,this.z=(d-h)/p,this.w=Math.acos((c+f+g-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this.w=this.w<0?Math.ceil(this.w):Math.floor(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t,n){return n!==void 0&&console.warn("THREE.Vector4: offset has been removed from .fromBufferAttribute()."),this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}}tt.prototype.isVector4=!0;class Wn extends qn{constructor(e,t,n){super(),this.width=e,this.height=t,this.depth=1,this.scissor=new tt(0,0,e,t),this.scissorTest=!1,this.viewport=new tt(0,0,e,t),n=n||{},this.texture=new bt(void 0,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.encoding),this.texture.image={},this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=1,this.texture.generateMipmaps=n.generateMipmaps!==void 0?n.generateMipmaps:!1,this.texture.minFilter=n.minFilter!==void 0?n.minFilter:Wt,this.depthBuffer=n.depthBuffer!==void 0?n.depthBuffer:!0,this.stencilBuffer=n.stencilBuffer!==void 0?n.stencilBuffer:!1,this.depthTexture=n.depthTexture!==void 0?n.depthTexture:null}setTexture(e){e.image={width:this.width,height:this.height,depth:this.depth},this.texture=e}setSize(e,t,n=1){(this.width!==e||this.height!==t||this.depth!==n)&&(this.width=e,this.height=t,this.depth=n,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=n,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.width=e.width,this.height=e.height,this.depth=e.depth,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.depthTexture=e.depthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}Wn.prototype.isWebGLRenderTarget=!0;class uu extends Wn{constructor(e,t,n){super(e,t,n),this.samples=4}copy(e){return super.copy.call(this,e),this.samples=e.samples,this}}uu.prototype.isWebGLMultisampleRenderTarget=!0;class Pt{constructor(e=0,t=0,n=0,i=1){this._x=e,this._y=t,this._z=n,this._w=i}static slerp(e,t,n,i){return console.warn("THREE.Quaternion: Static .slerp() has been deprecated. Use qm.slerpQuaternions( qa, qb, t ) instead."),n.slerpQuaternions(e,t,i)}static slerpFlat(e,t,n,i,s,a,o){let l=n[i+0],c=n[i+1],h=n[i+2],u=n[i+3];const d=s[a+0],f=s[a+1],m=s[a+2],v=s[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(o===1){e[t+0]=d,e[t+1]=f,e[t+2]=m,e[t+3]=v;return}if(u!==v||l!==d||c!==f||h!==m){let x=1-o;const g=l*d+c*f+h*m+u*v,p=g>=0?1:-1,E=1-g*g;if(E>Number.EPSILON){const S=Math.sqrt(E),_=Math.atan2(S,g*p);x=Math.sin(x*_)/S,o=Math.sin(o*_)/S}const T=o*p;if(l=l*x+d*T,c=c*x+f*T,h=h*x+m*T,u=u*x+v*T,x===1-o){const S=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=S,c*=S,h*=S,u*=S}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,s,a){const o=n[i],l=n[i+1],c=n[i+2],h=n[i+3],u=s[a],d=s[a+1],f=s[a+2],m=s[a+3];return e[t]=o*m+h*u+l*f-c*d,e[t+1]=l*m+h*d+c*u-o*f,e[t+2]=c*m+h*f+o*d-l*u,e[t+3]=h*m-o*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t){if(!(e&&e.isEuler))throw new Error("THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.");const n=e._x,i=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(i/2),u=o(s/2),d=l(n/2),f=l(i/2),m=l(s/2);switch(a){case"XYZ":this._x=d*h*u+c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u-d*f*m;break;case"YXZ":this._x=d*h*u+c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u+d*f*m;break;case"ZXY":this._x=d*h*u-c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u-d*f*m;break;case"ZYX":this._x=d*h*u-c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u+d*f*m;break;case"YZX":this._x=d*h*u+c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u-d*f*m;break;case"XZY":this._x=d*h*u-c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u+d*f*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t!==!1&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],u=t[10],d=n+o+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(a-i)*f}else if(n>o&&n>u){const f=2*Math.sqrt(1+n-o-u);this._w=(h-l)/f,this._x=.25*f,this._y=(i+a)/f,this._z=(s+c)/f}else if(o>u){const f=2*Math.sqrt(1+o-n-u);this._w=(s-c)/f,this._x=(i+a)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-o);this._w=(a-i)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ut(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e,t){return t!==void 0?(console.warn("THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead."),this.multiplyQuaternions(e,t)):this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+a*o+i*c-s*l,this._y=i*h+a*l+s*o-n*c,this._z=s*h+a*c+n*l-i*o,this._w=a*h-n*o-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,i=this._y,s=this._z,a=this._w;let o=a*e._w+n*e._x+i*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=i,this._z=s,this;const l=1-o*o;if(l<=Number.EPSILON){const f=1-t;return this._w=f*a+t*this._w,this._x=f*n+t*this._x,this._y=f*i+t*this._y,this._z=f*s+t*this._z,this.normalize(),this._onChangeCallback(),this}const c=Math.sqrt(l),h=Math.atan2(c,o),u=Math.sin((1-t)*h)/c,d=Math.sin(t*h)/c;return this._w=a*u+this._w*d,this._x=n*u+this._x*d,this._y=i*u+this._y*d,this._z=s*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){this.copy(e).slerp(t,n)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}}Pt.prototype.isQuaternion=!0;class b{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e,t){return t!==void 0?(console.warn("THREE.Vector3: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(e,t)):(this.x+=e.x,this.y+=e.y,this.z+=e.z,this)}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e,t){return t!==void 0?(console.warn("THREE.Vector3: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(e,t)):(this.x-=e.x,this.y-=e.y,this.z-=e.z,this)}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e,t){return t!==void 0?(console.warn("THREE.Vector3: .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead."),this.multiplyVectors(e,t)):(this.x*=e.x,this.y*=e.y,this.z*=e.z,this)}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return e&&e.isEuler||console.error("THREE.Vector3: .applyEuler() now expects an Euler rotation rather than a Vector3 and order."),this.applyQuaternion(eo.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(eo.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=l*t+a*i-o*n,h=l*n+o*t-s*i,u=l*i+s*n-a*t,d=-s*t-a*n-o*i;return this.x=c*l+d*-s+h*-o-u*-a,this.y=h*l+d*-a+u*-s-c*-o,this.z=u*l+d*-o+c*-a-h*-s,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e,t){return t!==void 0?(console.warn("THREE.Vector3: .cross() now only accepts one argument. Use .crossVectors( a, b ) instead."),this.crossVectors(e,t)):this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=i*l-s*o,this.y=s*a-n*l,this.z=n*o-i*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return ds.copy(this).projectOnVector(e),this.sub(ds)}reflect(e){return this.sub(ds.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ut(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t,n){return n!==void 0&&console.warn("THREE.Vector3: offset has been removed from .fromBufferAttribute()."),this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}}b.prototype.isVector3=!0;const ds=new b,eo=new Pt;class qt{constructor(e=new b(1/0,1/0,1/0),t=new b(-1/0,-1/0,-1/0)){this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){let t=1/0,n=1/0,i=1/0,s=-1/0,a=-1/0,o=-1/0;for(let l=0,c=e.length;l<c;l+=3){const h=e[l],u=e[l+1],d=e[l+2];h<t&&(t=h),u<n&&(n=u),d<i&&(i=d),h>s&&(s=h),u>a&&(a=u),d>o&&(o=d)}return this.min.set(t,n,i),this.max.set(s,a,o),this}setFromBufferAttribute(e){let t=1/0,n=1/0,i=1/0,s=-1/0,a=-1/0,o=-1/0;for(let l=0,c=e.count;l<c;l++){const h=e.getX(l),u=e.getY(l),d=e.getZ(l);h<t&&(t=h),u<n&&(n=u),d<i&&(i=d),h>s&&(s=h),u>a&&(a=u),d>o&&(o=d)}return this.min.set(t,n,i),this.max.set(s,a,o),this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Fi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e){return this.makeEmpty(),this.expandByObject(e)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return e===void 0&&(console.warn("THREE.Box3: .getCenter() target is now required"),e=new b),this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return e===void 0&&(console.warn("THREE.Box3: .getSize() target is now required"),e=new b),this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e){e.updateWorldMatrix(!1,!1);const t=e.geometry;t!==void 0&&(t.boundingBox===null&&t.computeBoundingBox(),fs.copy(t.boundingBox),fs.applyMatrix4(e.matrixWorld),this.union(fs));const n=e.children;for(let i=0,s=n.length;i<s;i++)this.expandByObject(n[i]);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t===void 0&&(console.warn("THREE.Box3: .getParameter() target is now required"),t=new b),t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Fi),Fi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Bi),ur.subVectors(this.max,Bi),$n.subVectors(e.a,Bi),ei.subVectors(e.b,Bi),ti.subVectors(e.c,Bi),Mn.subVectors(ei,$n),wn.subVectors(ti,ei),Un.subVectors($n,ti);let t=[0,-Mn.z,Mn.y,0,-wn.z,wn.y,0,-Un.z,Un.y,Mn.z,0,-Mn.x,wn.z,0,-wn.x,Un.z,0,-Un.x,-Mn.y,Mn.x,0,-wn.y,wn.x,0,-Un.y,Un.x,0];return!ps(t,$n,ei,ti,ur)||(t=[1,0,0,0,1,0,0,0,1],!ps(t,$n,ei,ti,ur))?!1:(dr.crossVectors(Mn,wn),t=[dr.x,dr.y,dr.z],ps(t,$n,ei,ti,ur))}clampPoint(e,t){return t===void 0&&(console.warn("THREE.Box3: .clampPoint() target is now required"),t=new b),t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return Fi.copy(e).clamp(this.min,this.max).sub(e).length()}getBoundingSphere(e){return e===void 0&&console.error("THREE.Box3: .getBoundingSphere() target is now required"),this.getCenter(e.center),e.radius=this.getSize(Fi).length()*.5,e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(hn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),hn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),hn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),hn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),hn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),hn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),hn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),hn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(hn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}qt.prototype.isBox3=!0;const hn=[new b,new b,new b,new b,new b,new b,new b,new b],Fi=new b,fs=new qt,$n=new b,ei=new b,ti=new b,Mn=new b,wn=new b,Un=new b,Bi=new b,ur=new b,dr=new b,Hn=new b;function ps(r,e,t,n,i){for(let s=0,a=r.length-3;s<=a;s+=3){Hn.fromArray(r,s);const o=i.x*Math.abs(Hn.x)+i.y*Math.abs(Hn.y)+i.z*Math.abs(Hn.z),l=e.dot(Hn),c=t.dot(Hn),h=n.dot(Hn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const du=new qt,to=new b,ms=new b,gs=new b;class Li{constructor(e=new b,t=-1){this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):du.setFromPoints(e).getCenter(n);let i=0;for(let s=0,a=e.length;s<a;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t===void 0&&(console.warn("THREE.Sphere: .clampPoint() target is now required"),t=new b),t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return e===void 0&&(console.warn("THREE.Sphere: .getBoundingBox() target is now required"),e=new qt),this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){gs.subVectors(e,this.center);const t=gs.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.add(gs.multiplyScalar(i/n)),this.radius+=i}return this}union(e){return ms.subVectors(e.center,this.center).normalize().multiplyScalar(e.radius),this.expandByPoint(to.copy(e.center).add(ms)),this.expandByPoint(to.copy(e.center).sub(ms)),this}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const un=new b,vs=new b,fr=new b,bn=new b,xs=new b,pr=new b,_s=new b;class Yn{constructor(e=new b,t=new b(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t===void 0&&(console.warn("THREE.Ray: .at() target is now required"),t=new b),t.copy(this.direction).multiplyScalar(e).add(this.origin)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,un)),this}closestPointToPoint(e,t){t===void 0&&(console.warn("THREE.Ray: .closestPointToPoint() target is now required"),t=new b),t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.direction).multiplyScalar(n).add(this.origin)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=un.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(un.copy(this.direction).multiplyScalar(t).add(this.origin),un.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){vs.copy(e).add(t).multiplyScalar(.5),fr.copy(t).sub(e).normalize(),bn.copy(this.origin).sub(vs);const s=e.distanceTo(t)*.5,a=-this.direction.dot(fr),o=bn.dot(this.direction),l=-bn.dot(fr),c=bn.lengthSq(),h=Math.abs(1-a*a);let u,d,f,m;if(h>0)if(u=a*l-o,d=a*o-l,m=s*h,u>=0)if(d>=-m)if(d<=m){const v=1/h;u*=v,d*=v,f=u*(u+a*d+2*o)+d*(a*u+d+2*l)+c}else d=s,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d=-s,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d<=-m?(u=Math.max(0,-(-a*s+o)),d=u>0?-s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c):d<=m?(u=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(u=Math.max(0,-(a*s+o)),d=u>0?s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c);else d=a>0?-s:s,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.direction).multiplyScalar(u).add(this.origin),i&&i.copy(fr).multiplyScalar(d).add(vs),f}intersectSphere(e,t){un.subVectors(e.center,this.origin);const n=un.dot(this.direction),i=un.dot(un)-n*n,s=e.radius*e.radius;if(i>s)return null;const a=Math.sqrt(s-i),o=n-a,l=n+a;return o<0&&l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,i=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,i=(e.min.x-d.x)*c),h>=0?(s=(e.min.y-d.y)*h,a=(e.max.y-d.y)*h):(s=(e.max.y-d.y)*h,a=(e.min.y-d.y)*h),n>a||s>i||((s>n||n!==n)&&(n=s),(a<i||i!==i)&&(i=a),u>=0?(o=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),n>l||o>i)||((o>n||n!==n)&&(n=o),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,un)!==null}intersectTriangle(e,t,n,i,s){xs.subVectors(t,e),pr.subVectors(n,e),_s.crossVectors(xs,pr);let a=this.direction.dot(_s),o;if(a>0){if(i)return null;o=1}else if(a<0)o=-1,a=-a;else return null;bn.subVectors(this.origin,e);const l=o*this.direction.dot(pr.crossVectors(bn,pr));if(l<0)return null;const c=o*this.direction.dot(xs.cross(bn));if(c<0||l+c>a)return null;const h=-o*bn.dot(_s);return h<0?null:this.at(h/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Le{constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],arguments.length>0&&console.error("THREE.Matrix4: the constructor no longer reads arguments. use .set() instead.")}set(e,t,n,i,s,a,o,l,c,h,u,d,f,m,v,x){const g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=i,g[1]=s,g[5]=a,g[9]=o,g[13]=l,g[2]=c,g[6]=h,g[10]=u,g[14]=d,g[3]=f,g[7]=m,g[11]=v,g[15]=x,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Le().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/ni.setFromMatrixColumn(e,0).length(),s=1/ni.setFromMatrixColumn(e,1).length(),a=1/ni.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){e&&e.isEuler||console.error("THREE.Matrix4: .makeRotationFromEuler() now expects a Euler rotation rather than a Vector3 and order.");const t=this.elements,n=e.x,i=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){const d=a*h,f=a*u,m=o*h,v=o*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=f+m*c,t[5]=d-v*c,t[9]=-o*l,t[2]=v-d*c,t[6]=m+f*c,t[10]=a*l}else if(e.order==="YXZ"){const d=l*h,f=l*u,m=c*h,v=c*u;t[0]=d+v*o,t[4]=m*o-f,t[8]=a*c,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=f*o-m,t[6]=v+d*o,t[10]=a*l}else if(e.order==="ZXY"){const d=l*h,f=l*u,m=c*h,v=c*u;t[0]=d-v*o,t[4]=-a*u,t[8]=m+f*o,t[1]=f+m*o,t[5]=a*h,t[9]=v-d*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const d=a*h,f=a*u,m=o*h,v=o*u;t[0]=l*h,t[4]=m*c-f,t[8]=d*c+v,t[1]=l*u,t[5]=v*c+d,t[9]=f*c-m,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const d=a*l,f=a*c,m=o*l,v=o*c;t[0]=l*h,t[4]=v-d*u,t[8]=m*u+f,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=f*u+m,t[10]=d-v*u}else if(e.order==="XZY"){const d=a*l,f=a*c,m=o*l,v=o*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=d*u+v,t[5]=a*h,t[9]=f*u-m,t[2]=m*u-f,t[6]=o*h,t[10]=v*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(fu,e,pu)}lookAt(e,t,n){const i=this.elements;return zt.subVectors(e,t),zt.lengthSq()===0&&(zt.z=1),zt.normalize(),Sn.crossVectors(n,zt),Sn.lengthSq()===0&&(Math.abs(n.z)===1?zt.x+=1e-4:zt.z+=1e-4,zt.normalize(),Sn.crossVectors(n,zt)),Sn.normalize(),mr.crossVectors(zt,Sn),i[0]=Sn.x,i[4]=mr.x,i[8]=zt.x,i[1]=Sn.y,i[5]=mr.y,i[9]=zt.y,i[2]=Sn.z,i[6]=mr.z,i[10]=zt.z,this}multiply(e,t){return t!==void 0?(console.warn("THREE.Matrix4: .multiply() now only accepts one argument. Use .multiplyMatrices( a, b ) instead."),this.multiplyMatrices(e,t)):this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],m=n[2],v=n[6],x=n[10],g=n[14],p=n[3],E=n[7],T=n[11],S=n[15],_=i[0],P=i[4],N=i[8],z=i[12],V=i[1],J=i[5],O=i[9],C=i[13],I=i[2],R=i[6],A=i[10],X=i[14],ee=i[3],Z=i[7],ae=i[11],te=i[15];return s[0]=a*_+o*V+l*I+c*ee,s[4]=a*P+o*J+l*R+c*Z,s[8]=a*N+o*O+l*A+c*ae,s[12]=a*z+o*C+l*X+c*te,s[1]=h*_+u*V+d*I+f*ee,s[5]=h*P+u*J+d*R+f*Z,s[9]=h*N+u*O+d*A+f*ae,s[13]=h*z+u*C+d*X+f*te,s[2]=m*_+v*V+x*I+g*ee,s[6]=m*P+v*J+x*R+g*Z,s[10]=m*N+v*O+x*A+g*ae,s[14]=m*z+v*C+x*X+g*te,s[3]=p*_+E*V+T*I+S*ee,s[7]=p*P+E*J+T*R+S*Z,s[11]=p*N+E*O+T*A+S*ae,s[15]=p*z+E*C+T*X+S*te,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],m=e[3],v=e[7],x=e[11],g=e[15];return m*(+s*l*u-i*c*u-s*o*d+n*c*d+i*o*f-n*l*f)+v*(+t*l*f-t*c*d+s*a*d-i*a*f+i*c*h-s*l*h)+x*(+t*c*u-t*o*f-s*a*u+n*a*f+s*o*h-n*c*h)+g*(-i*o*h-t*l*u+t*o*d+i*a*u-n*a*d+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],m=e[12],v=e[13],x=e[14],g=e[15],p=u*x*c-v*d*c+v*l*f-o*x*f-u*l*g+o*d*g,E=m*d*c-h*x*c-m*l*f+a*x*f+h*l*g-a*d*g,T=h*v*c-m*u*c+m*o*f-a*v*f-h*o*g+a*u*g,S=m*u*l-h*v*l-m*o*d+a*v*d+h*o*x-a*u*x,_=t*p+n*E+i*T+s*S;if(_===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const P=1/_;return e[0]=p*P,e[1]=(v*d*s-u*x*s-v*i*f+n*x*f+u*i*g-n*d*g)*P,e[2]=(o*x*s-v*l*s+v*i*c-n*x*c-o*i*g+n*l*g)*P,e[3]=(u*l*s-o*d*s-u*i*c+n*d*c+o*i*f-n*l*f)*P,e[4]=E*P,e[5]=(h*x*s-m*d*s+m*i*f-t*x*f-h*i*g+t*d*g)*P,e[6]=(m*l*s-a*x*s-m*i*c+t*x*c+a*i*g-t*l*g)*P,e[7]=(a*d*s-h*l*s+h*i*c-t*d*c-a*i*f+t*l*f)*P,e[8]=T*P,e[9]=(m*u*s-h*v*s-m*n*f+t*v*f+h*n*g-t*u*g)*P,e[10]=(a*v*s-m*o*s+m*n*c-t*v*c-a*n*g+t*o*g)*P,e[11]=(h*o*s-a*u*s-h*n*c+t*u*c+a*n*f-t*o*f)*P,e[12]=S*P,e[13]=(h*v*i-m*u*i+m*n*d-t*v*d-h*n*x+t*u*x)*P,e[14]=(m*o*i-a*v*i-m*n*l+t*v*l+a*n*x-t*o*x)*P,e[15]=(a*u*i-h*o*i+h*n*l-t*u*l-a*n*d+t*o*d)*P,this}scale(e){const t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),s=1-n,a=e.x,o=e.y,l=e.z,c=s*a,h=s*o;return this.set(c*a+n,c*o-i*l,c*l+i*o,0,c*o+i*l,h*o+n,h*l-i*a,0,c*l-i*o,h*l+i*a,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n){return this.set(1,t,n,0,e,1,n,0,e,t,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,h=a+a,u=o+o,d=s*c,f=s*h,m=s*u,v=a*h,x=a*u,g=o*u,p=l*c,E=l*h,T=l*u,S=n.x,_=n.y,P=n.z;return i[0]=(1-(v+g))*S,i[1]=(f+T)*S,i[2]=(m-E)*S,i[3]=0,i[4]=(f-T)*_,i[5]=(1-(d+g))*_,i[6]=(x+p)*_,i[7]=0,i[8]=(m+E)*P,i[9]=(x-p)*P,i[10]=(1-(d+v))*P,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let s=ni.set(i[0],i[1],i[2]).length();const a=ni.set(i[4],i[5],i[6]).length(),o=ni.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),e.x=i[12],e.y=i[13],e.z=i[14],jt.copy(this);const c=1/s,h=1/a,u=1/o;return jt.elements[0]*=c,jt.elements[1]*=c,jt.elements[2]*=c,jt.elements[4]*=h,jt.elements[5]*=h,jt.elements[6]*=h,jt.elements[8]*=u,jt.elements[9]*=u,jt.elements[10]*=u,t.setFromRotationMatrix(jt),n.x=s,n.y=a,n.z=o,this}makePerspective(e,t,n,i,s,a){a===void 0&&console.warn("THREE.Matrix4: .makePerspective() has been redefined and has a new signature. Please check the docs.");const o=this.elements,l=2*s/(t-e),c=2*s/(n-i),h=(t+e)/(t-e),u=(n+i)/(n-i),d=-(a+s)/(a-s),f=-2*a*s/(a-s);return o[0]=l,o[4]=0,o[8]=h,o[12]=0,o[1]=0,o[5]=c,o[9]=u,o[13]=0,o[2]=0,o[6]=0,o[10]=d,o[14]=f,o[3]=0,o[7]=0,o[11]=-1,o[15]=0,this}makeOrthographic(e,t,n,i,s,a){const o=this.elements,l=1/(t-e),c=1/(n-i),h=1/(a-s),u=(t+e)*l,d=(n+i)*c,f=(a+s)*h;return o[0]=2*l,o[4]=0,o[8]=0,o[12]=-u,o[1]=0,o[5]=2*c,o[9]=0,o[13]=-d,o[2]=0,o[6]=0,o[10]=-2*h,o[14]=-f,o[3]=0,o[7]=0,o[11]=0,o[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}Le.prototype.isMatrix4=!0;const ni=new b,jt=new Le,fu=new b(0,0,0),pu=new b(1,1,1),Sn=new b,mr=new b,zt=new b,no=new Le,io=new Pt;class Ci{constructor(e=0,t=0,n=0,i=Ci.DefaultOrder){this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._order=i||this._order,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t,n){const i=e.elements,s=i[0],a=i[4],o=i[8],l=i[1],c=i[5],h=i[9],u=i[2],d=i[6],f=i[10];switch(t=t||this._order,t){case"XYZ":this._y=Math.asin(Ut(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ut(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(Ut(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Ut(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ut(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ut(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n!==!1&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return no.makeRotationFromQuaternion(e),this.setFromRotationMatrix(no,t,n)}setFromVector3(e,t){return this.set(e.x,e.y,e.z,t||this._order)}reorder(e){return io.setFromEuler(this),this.setFromQuaternion(io,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}toVector3(e){return e?e.set(this._x,this._y,this._z):new b(this._x,this._y,this._z)}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}}Ci.prototype.isEuler=!0;Ci.DefaultOrder="XYZ";Ci.RotationOrders=["XYZ","YZX","ZXY","XZY","YXZ","ZYX"];class ul{constructor(){this.mask=1}set(e){this.mask=1<<e|0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}}let mu=0;const ro=new b,ii=new Pt,dn=new Le,gr=new b,zi=new b,gu=new b,vu=new Pt,so=new b(1,0,0),ao=new b(0,1,0),oo=new b(0,0,1),xu={type:"added"},lo={type:"removed"};class Ze extends qn{constructor(){super(),Object.defineProperty(this,"id",{value:mu++}),this.uuid=on(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ze.DefaultUp.clone();const e=new b,t=new Ci,n=new Pt,i=new b(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Le},normalMatrix:{value:new wt}}),this.matrix=new Le,this.matrixWorld=new Le,this.matrixAutoUpdate=Ze.DefaultMatrixAutoUpdate,this.matrixWorldNeedsUpdate=!1,this.layers=new ul,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ii.setFromAxisAngle(e,t),this.quaternion.multiply(ii),this}rotateOnWorldAxis(e,t){return ii.setFromAxisAngle(e,t),this.quaternion.premultiply(ii),this}rotateX(e){return this.rotateOnAxis(so,e)}rotateY(e){return this.rotateOnAxis(ao,e)}rotateZ(e){return this.rotateOnAxis(oo,e)}translateOnAxis(e,t){return ro.copy(e).applyQuaternion(this.quaternion),this.position.add(ro.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(so,e)}translateY(e){return this.translateOnAxis(ao,e)}translateZ(e){return this.translateOnAxis(oo,e)}localToWorld(e){return e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return e.applyMatrix4(dn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?gr.copy(e):gr.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),zi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?dn.lookAt(zi,gr,this.up):dn.lookAt(gr,zi,this.up),this.quaternion.setFromRotationMatrix(dn),i&&(dn.extractRotation(i.matrixWorld),ii.setFromRotationMatrix(dn),this.quaternion.premultiply(ii.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(xu)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(lo)),this}clear(){for(let e=0;e<this.children.length;e++){const t=this.children[e];t.parent=null,t.dispatchEvent(lo)}return this.children.length=0,this}attach(e){return this.updateWorldMatrix(!0,!1),dn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),dn.multiply(e.parent.matrixWorld)),e.applyMatrix4(dn),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getWorldPosition(e){return e===void 0&&(console.warn("THREE.Object3D: .getWorldPosition() target is now required"),e=new b),this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return e===void 0&&(console.warn("THREE.Object3D: .getWorldQuaternion() target is now required"),e=new Pt),this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zi,e,gu),e}getWorldScale(e){return e===void 0&&(console.warn("THREE.Object3D: .getWorldScale() target is now required"),e=new b),this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zi,vu,e),e}getWorldDirection(e){e===void 0&&(console.warn("THREE.Object3D: .getWorldDirection() target is now required"),e=new b),this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const i=this.children;for(let s=0,a=i.length;s<a;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{}},n.metadata={version:4.5,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),JSON.stringify(this.userData)!=="{}"&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON()));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];s(e.shapes,u)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));i.material=o}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];i.animations.push(s(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),u=a(e.shapes),d=a(e.skeletons),f=a(e.animations);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f)}return n.object=i,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}Ze.DefaultUp=new b(0,1,0);Ze.DefaultMatrixAutoUpdate=!0;Ze.prototype.isObject3D=!0;const ys=new b,_u=new b,yu=new wt;class sn{constructor(e=new b(1,0,0),t=0){this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=ys.subVectors(n,t).cross(_u.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t===void 0&&(console.warn("THREE.Plane: .projectPoint() target is now required"),t=new b),t.copy(this.normal).multiplyScalar(-this.distanceToPoint(e)).add(e)}intersectLine(e,t){t===void 0&&(console.warn("THREE.Plane: .intersectLine() target is now required"),t=new b);const n=e.delta(ys),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:t.copy(n).multiplyScalar(s).add(e.start)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e===void 0&&(console.warn("THREE.Plane: .coplanarPoint() target is now required"),e=new b),e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||yu.getNormalMatrix(e),i=this.coplanarPoint(ys).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}sn.prototype.isPlane=!0;const Zt=new b,fn=new b,Ms=new b,pn=new b,ri=new b,si=new b,co=new b,ws=new b,bs=new b,Ss=new b;class pt{constructor(e=new b,t=new b,n=new b){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i===void 0&&(console.warn("THREE.Triangle: .getNormal() target is now required"),i=new b),i.subVectors(n,t),Zt.subVectors(e,t),i.cross(Zt);const s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){Zt.subVectors(i,t),fn.subVectors(n,t),Ms.subVectors(e,t);const a=Zt.dot(Zt),o=Zt.dot(fn),l=Zt.dot(Ms),c=fn.dot(fn),h=fn.dot(Ms),u=a*c-o*o;if(s===void 0&&(console.warn("THREE.Triangle: .getBarycoord() target is now required"),s=new b),u===0)return s.set(-2,-1,-1);const d=1/u,f=(c*l-o*h)*d,m=(a*h-o*l)*d;return s.set(1-f-m,m,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,pn),pn.x>=0&&pn.y>=0&&pn.x+pn.y<=1}static getUV(e,t,n,i,s,a,o,l){return this.getBarycoord(e,t,n,i,pn),l.set(0,0),l.addScaledVector(s,pn.x),l.addScaledVector(a,pn.y),l.addScaledVector(o,pn.z),l}static isFrontFacing(e,t,n,i){return Zt.subVectors(n,t),fn.subVectors(e,t),Zt.cross(fn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Zt.subVectors(this.c,this.b),fn.subVectors(this.a,this.b),Zt.cross(fn).length()*.5}getMidpoint(e){return e===void 0&&(console.warn("THREE.Triangle: .getMidpoint() target is now required"),e=new b),e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return pt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e===void 0&&(console.warn("THREE.Triangle: .getPlane() target is now required"),e=new sn),e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return pt.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,n,i,s){return pt.getUV(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return pt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return pt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){t===void 0&&(console.warn("THREE.Triangle: .closestPointToPoint() target is now required"),t=new b);const n=this.a,i=this.b,s=this.c;let a,o;ri.subVectors(i,n),si.subVectors(s,n),ws.subVectors(e,n);const l=ri.dot(ws),c=si.dot(ws);if(l<=0&&c<=0)return t.copy(n);bs.subVectors(e,i);const h=ri.dot(bs),u=si.dot(bs);if(h>=0&&u<=h)return t.copy(i);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(n).addScaledVector(ri,a);Ss.subVectors(e,s);const f=ri.dot(Ss),m=si.dot(Ss);if(m>=0&&f<=m)return t.copy(s);const v=f*c-l*m;if(v<=0&&c>=0&&m<=0)return o=c/(c-m),t.copy(n).addScaledVector(si,o);const x=h*m-f*u;if(x<=0&&u-h>=0&&f-m>=0)return co.subVectors(s,i),o=(u-h)/(u-h+(f-m)),t.copy(i).addScaledVector(co,o);const g=1/(x+v+d);return a=v*g,o=d*g,t.copy(n).addScaledVector(ri,a).addScaledVector(si,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}let Mu=0;function xt(){Object.defineProperty(this,"id",{value:Mu++}),this.uuid=on(),this.name="",this.type="Material",this.fog=!0,this.blending=Zi,this.side=Kr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.blendSrc=al,this.blendDst=ol,this.blendEquation=gi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.depthFunc=js,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=au,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ls,this.stencilZFail=ls,this.stencilZPass=ls,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaTest=0,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0}xt.prototype=Object.assign(Object.create(qn.prototype),{constructor:xt,isMaterial:!0,onBuild:function(){},onBeforeCompile:function(){},customProgramCacheKey:function(){return this.onBeforeCompile.toString()},setValues:function(r){if(r!==void 0)for(const e in r){const t=r[e];if(t===void 0){console.warn("THREE.Material: '"+e+"' parameter is undefined.");continue}if(e==="shading"){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=t===sl;continue}const n=this[e];if(n===void 0){console.warn("THREE."+this.type+": '"+e+"' is not a property of this material.");continue}n&&n.isColor?n.set(t):n&&n.isVector3&&t&&t.isVector3?n.copy(t):this[e]=t}},toJSON:function(r){const e=r===void 0||typeof r=="string";e&&(r={textures:{},images:{}});const t={metadata:{version:4.5,type:"Material",generator:"Material.toJSON"}};t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),this.color&&this.color.isColor&&(t.color=this.color.getHex()),this.roughness!==void 0&&(t.roughness=this.roughness),this.metalness!==void 0&&(t.metalness=this.metalness),this.sheen&&this.sheen.isColor&&(t.sheen=this.sheen.getHex()),this.emissive&&this.emissive.isColor&&(t.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(t.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(t.specular=this.specular.getHex()),this.shininess!==void 0&&(t.shininess=this.shininess),this.clearcoat!==void 0&&(t.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(t.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(t.clearcoatMap=this.clearcoatMap.toJSON(r).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(t.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(r).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(t.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(r).uuid,t.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.map&&this.map.isTexture&&(t.map=this.map.toJSON(r).uuid),this.matcap&&this.matcap.isTexture&&(t.matcap=this.matcap.toJSON(r).uuid),this.alphaMap&&this.alphaMap.isTexture&&(t.alphaMap=this.alphaMap.toJSON(r).uuid),this.lightMap&&this.lightMap.isTexture&&(t.lightMap=this.lightMap.toJSON(r).uuid,t.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(t.aoMap=this.aoMap.toJSON(r).uuid,t.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(t.bumpMap=this.bumpMap.toJSON(r).uuid,t.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(t.normalMap=this.normalMap.toJSON(r).uuid,t.normalMapType=this.normalMapType,t.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(t.displacementMap=this.displacementMap.toJSON(r).uuid,t.displacementScale=this.displacementScale,t.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(t.roughnessMap=this.roughnessMap.toJSON(r).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(t.metalnessMap=this.metalnessMap.toJSON(r).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(t.emissiveMap=this.emissiveMap.toJSON(r).uuid),this.specularMap&&this.specularMap.isTexture&&(t.specularMap=this.specularMap.toJSON(r).uuid),this.envMap&&this.envMap.isTexture&&(t.envMap=this.envMap.toJSON(r).uuid,this.combine!==void 0&&(t.combine=this.combine)),this.envMapIntensity!==void 0&&(t.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(t.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(t.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(t.gradientMap=this.gradientMap.toJSON(r).uuid),this.size!==void 0&&(t.size=this.size),this.shadowSide!==null&&(t.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(t.sizeAttenuation=this.sizeAttenuation),this.blending!==Zi&&(t.blending=this.blending),this.side!==Kr&&(t.side=this.side),this.vertexColors&&(t.vertexColors=!0),this.opacity<1&&(t.opacity=this.opacity),this.transparent===!0&&(t.transparent=this.transparent),t.depthFunc=this.depthFunc,t.depthTest=this.depthTest,t.depthWrite=this.depthWrite,t.colorWrite=this.colorWrite,t.stencilWrite=this.stencilWrite,t.stencilWriteMask=this.stencilWriteMask,t.stencilFunc=this.stencilFunc,t.stencilRef=this.stencilRef,t.stencilFuncMask=this.stencilFuncMask,t.stencilFail=this.stencilFail,t.stencilZFail=this.stencilZFail,t.stencilZPass=this.stencilZPass,this.rotation&&this.rotation!==0&&(t.rotation=this.rotation),this.polygonOffset===!0&&(t.polygonOffset=!0),this.polygonOffsetFactor!==0&&(t.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(t.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth&&this.linewidth!==1&&(t.linewidth=this.linewidth),this.dashSize!==void 0&&(t.dashSize=this.dashSize),this.gapSize!==void 0&&(t.gapSize=this.gapSize),this.scale!==void 0&&(t.scale=this.scale),this.dithering===!0&&(t.dithering=!0),this.alphaTest>0&&(t.alphaTest=this.alphaTest),this.alphaToCoverage===!0&&(t.alphaToCoverage=this.alphaToCoverage),this.premultipliedAlpha===!0&&(t.premultipliedAlpha=this.premultipliedAlpha),this.wireframe===!0&&(t.wireframe=this.wireframe),this.wireframeLinewidth>1&&(t.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(t.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(t.wireframeLinejoin=this.wireframeLinejoin),this.morphTargets===!0&&(t.morphTargets=!0),this.morphNormals===!0&&(t.morphNormals=!0),this.skinning===!0&&(t.skinning=!0),this.flatShading===!0&&(t.flatShading=this.flatShading),this.visible===!1&&(t.visible=!1),this.toneMapped===!1&&(t.toneMapped=!1),JSON.stringify(this.userData)!=="{}"&&(t.userData=this.userData);function n(i){const s=[];for(const a in i){const o=i[a];delete o.metadata,s.push(o)}return s}if(e){const i=n(r.textures),s=n(r.images);i.length>0&&(t.textures=i),s.length>0&&(t.images=s)}return t},clone:function(){return new this.constructor().copy(this)},copy:function(r){this.name=r.name,this.fog=r.fog,this.blending=r.blending,this.side=r.side,this.vertexColors=r.vertexColors,this.opacity=r.opacity,this.transparent=r.transparent,this.blendSrc=r.blendSrc,this.blendDst=r.blendDst,this.blendEquation=r.blendEquation,this.blendSrcAlpha=r.blendSrcAlpha,this.blendDstAlpha=r.blendDstAlpha,this.blendEquationAlpha=r.blendEquationAlpha,this.depthFunc=r.depthFunc,this.depthTest=r.depthTest,this.depthWrite=r.depthWrite,this.stencilWriteMask=r.stencilWriteMask,this.stencilFunc=r.stencilFunc,this.stencilRef=r.stencilRef,this.stencilFuncMask=r.stencilFuncMask,this.stencilFail=r.stencilFail,this.stencilZFail=r.stencilZFail,this.stencilZPass=r.stencilZPass,this.stencilWrite=r.stencilWrite;const e=r.clippingPlanes;let t=null;if(e!==null){const n=e.length;t=new Array(n);for(let i=0;i!==n;++i)t[i]=e[i].clone()}return this.clippingPlanes=t,this.clipIntersection=r.clipIntersection,this.clipShadows=r.clipShadows,this.shadowSide=r.shadowSide,this.colorWrite=r.colorWrite,this.precision=r.precision,this.polygonOffset=r.polygonOffset,this.polygonOffsetFactor=r.polygonOffsetFactor,this.polygonOffsetUnits=r.polygonOffsetUnits,this.dithering=r.dithering,this.alphaTest=r.alphaTest,this.alphaToCoverage=r.alphaToCoverage,this.premultipliedAlpha=r.premultipliedAlpha,this.visible=r.visible,this.toneMapped=r.toneMapped,this.userData=JSON.parse(JSON.stringify(r.userData)),this},dispose:function(){this.dispatchEvent({type:"dispose"})}});Object.defineProperty(xt.prototype,"needsUpdate",{set:function(r){r===!0&&this.version++}});const dl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Jt={h:0,s:0,l:0},vr={h:0,s:0,l:0};function Es(r,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?r+(e-r)*6*t:t<1/2?e:t<2/3?r+(e-r)*6*(2/3-t):r}function Ts(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function As(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}class Te{constructor(e,t,n){return t===void 0&&n===void 0?this.set(e):this.setRGB(e,t,n)}set(e){return e&&e.isColor?this.copy(e):typeof e=="number"?this.setHex(e):typeof e=="string"&&this.setStyle(e),this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,this}setRGB(e,t,n){return this.r=e,this.g=t,this.b=n,this}setHSL(e,t,n){if(e=ou(e,1),t=Ut(t,0,1),n=Ut(n,0,1),t===0)this.r=this.g=this.b=n;else{const i=n<=.5?n*(1+t):n+t-n*t,s=2*n-i;this.r=Es(s,i,e+1/3),this.g=Es(s,i,e),this.b=Es(s,i,e-1/3)}return this}setStyle(e){function t(i){i!==void 0&&parseFloat(i)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let n;if(n=/^((?:rgb|hsl)a?)\(([^\)]*)\)/.exec(e)){let i;const s=n[1],a=n[2];switch(s){case"rgb":case"rgba":if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return this.r=Math.min(255,parseInt(i[1],10))/255,this.g=Math.min(255,parseInt(i[2],10))/255,this.b=Math.min(255,parseInt(i[3],10))/255,t(i[4]),this;if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return this.r=Math.min(100,parseInt(i[1],10))/100,this.g=Math.min(100,parseInt(i[2],10))/100,this.b=Math.min(100,parseInt(i[3],10))/100,t(i[4]),this;break;case"hsl":case"hsla":if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)){const o=parseFloat(i[1])/360,l=parseInt(i[2],10)/100,c=parseInt(i[3],10)/100;return t(i[4]),this.setHSL(o,l,c)}break}}else if(n=/^\#([A-Fa-f\d]+)$/.exec(e)){const i=n[1],s=i.length;if(s===3)return this.r=parseInt(i.charAt(0)+i.charAt(0),16)/255,this.g=parseInt(i.charAt(1)+i.charAt(1),16)/255,this.b=parseInt(i.charAt(2)+i.charAt(2),16)/255,this;if(s===6)return this.r=parseInt(i.charAt(0)+i.charAt(1),16)/255,this.g=parseInt(i.charAt(2)+i.charAt(3),16)/255,this.b=parseInt(i.charAt(4)+i.charAt(5),16)/255,this}return e&&e.length>0?this.setColorName(e):this}setColorName(e){const t=dl[e.toLowerCase()];return t!==void 0?this.setHex(t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copyGammaToLinear(e,t=2){return this.r=Math.pow(e.r,t),this.g=Math.pow(e.g,t),this.b=Math.pow(e.b,t),this}copyLinearToGamma(e,t=2){const n=t>0?1/t:1;return this.r=Math.pow(e.r,n),this.g=Math.pow(e.g,n),this.b=Math.pow(e.b,n),this}convertGammaToLinear(e){return this.copyGammaToLinear(this,e),this}convertLinearToGamma(e){return this.copyLinearToGamma(this,e),this}copySRGBToLinear(e){return this.r=Ts(e.r),this.g=Ts(e.g),this.b=Ts(e.b),this}copyLinearToSRGB(e){return this.r=As(e.r),this.g=As(e.g),this.b=As(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(){return this.r*255<<16^this.g*255<<8^this.b*255<<0}getHexString(){return("000000"+this.getHex().toString(16)).slice(-6)}getHSL(e){e===void 0&&(console.warn("THREE.Color: .getHSL() target is now required"),e={h:0,s:0,l:0});const t=this.r,n=this.g,i=this.b,s=Math.max(t,n,i),a=Math.min(t,n,i);let o,l;const c=(a+s)/2;if(a===s)o=0,l=0;else{const h=s-a;switch(l=c<=.5?h/(s+a):h/(2-s-a),s){case t:o=(n-i)/h+(n<i?6:0);break;case n:o=(i-t)/h+2;break;case i:o=(t-n)/h+4;break}o/=6}return e.h=o,e.s=l,e.l=c,e}getStyle(){return"rgb("+(this.r*255|0)+","+(this.g*255|0)+","+(this.b*255|0)+")"}offsetHSL(e,t,n){return this.getHSL(Jt),Jt.h+=e,Jt.s+=t,Jt.l+=n,this.setHSL(Jt.h,Jt.s,Jt.l),this}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Jt),e.getHSL(vr);const n=hs(Jt.h,vr.h,t),i=hs(Jt.s,vr.s,t),s=hs(Jt.l,vr.l,t);return this.setHSL(n,i,s),this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),e.normalized===!0&&(this.r/=255,this.g/=255,this.b/=255),this}toJSON(){return this.getHex()}}Te.NAMES=dl;Te.prototype.isColor=!0;Te.prototype.r=1;Te.prototype.g=1;Te.prototype.b=1;class kn extends xt{constructor(e){super(),this.type="MeshBasicMaterial",this.color=new Te(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=$r,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this}}kn.prototype.isMeshBasicMaterial=!0;const st=new b,xr=new se;class dt{constructor(e,t,n){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n===!0,this.usage=tr,this.updateRange={offset:0,count:-1},this.version=0,this.onUploadCallback=function(){}}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}copyColorsArray(e){const t=this.array;let n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyColorsArray(): color is undefined",i),a=new Te),t[n++]=a.r,t[n++]=a.g,t[n++]=a.b}return this}copyVector2sArray(e){const t=this.array;let n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector2sArray(): vector is undefined",i),a=new se),t[n++]=a.x,t[n++]=a.y}return this}copyVector3sArray(e){const t=this.array;let n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector3sArray(): vector is undefined",i),a=new b),t[n++]=a.x,t[n++]=a.y,t[n++]=a.z}return this}copyVector4sArray(e){const t=this.array;let n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector4sArray(): vector is undefined",i),a=new tt),t[n++]=a.x,t[n++]=a.y,t[n++]=a.z,t[n++]=a.w}return this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)xr.fromBufferAttribute(this,t),xr.applyMatrix3(e),this.setXY(t,xr.x,xr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)st.fromBufferAttribute(this,t),st.applyMatrix3(e),this.setXYZ(t,st.x,st.y,st.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)st.x=this.getX(t),st.y=this.getY(t),st.z=this.getZ(t),st.applyMatrix4(e),this.setXYZ(t,st.x,st.y,st.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)st.x=this.getX(t),st.y=this.getY(t),st.z=this.getZ(t),st.applyNormalMatrix(e),this.setXYZ(t,st.x,st.y,st.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)st.x=this.getX(t),st.y=this.getY(t),st.z=this.getZ(t),st.transformDirection(e),this.setXYZ(t,st.x,st.y,st.z);return this}set(e,t=0){return this.array.set(e,t),this}getX(e){return this.array[e*this.itemSize]}setX(e,t){return this.array[e*this.itemSize]=t,this}getY(e){return this.array[e*this.itemSize+1]}setY(e,t){return this.array[e*this.itemSize+1]=t,this}getZ(e){return this.array[e*this.itemSize+2]}setZ(e,t){return this.array[e*this.itemSize+2]=t,this}getW(e){return this.array[e*this.itemSize+3]}setW(e,t){return this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.prototype.slice.call(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==tr&&(e.usage=this.usage),(this.updateRange.offset!==0||this.updateRange.count!==-1)&&(e.updateRange=this.updateRange),e}}dt.prototype.isBufferAttribute=!0;class fl extends dt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class pl extends dt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class wu extends dt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}wu.prototype.isFloat16BufferAttribute=!0;class rt extends dt{constructor(e,t,n){super(new Float32Array(e),t,n)}}function ml(r){if(r.length===0)return-1/0;let e=r[0];for(let t=1,n=r.length;t<n;++t)r[t]>e&&(e=r[t]);return e}let bu=0;const rn=new Le,Ls=new Ze,ai=new b,Ot=new qt,Oi=new qt,vt=new b;class Ye extends qn{constructor(){super(),Object.defineProperty(this,"id",{value:bu++}),this.uuid=on(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(ml(e)>65535?pl:fl)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new wt().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}rotateX(e){return rn.makeRotationX(e),this.applyMatrix4(rn),this}rotateY(e){return rn.makeRotationY(e),this.applyMatrix4(rn),this}rotateZ(e){return rn.makeRotationZ(e),this.applyMatrix4(rn),this}translate(e,t,n){return rn.makeTranslation(e,t,n),this.applyMatrix4(rn),this}scale(e,t,n){return rn.makeScale(e,t,n),this.applyMatrix4(rn),this}lookAt(e){return Ls.lookAt(e),Ls.updateMatrix(),this.applyMatrix4(Ls.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ai).negate(),this.translate(ai.x,ai.y,ai.z),this}setFromPoints(e){const t=[];for(let n=0,i=e.length;n<i;n++){const s=e[n];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new rt(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new qt);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new b(-1/0,-1/0,-1/0),new b(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const s=t[n];Ot.setFromBufferAttribute(s),this.morphTargetsRelative?(vt.addVectors(this.boundingBox.min,Ot.min),this.boundingBox.expandByPoint(vt),vt.addVectors(this.boundingBox.max,Ot.max),this.boundingBox.expandByPoint(vt)):(this.boundingBox.expandByPoint(Ot.min),this.boundingBox.expandByPoint(Ot.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Li);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new b,1/0);return}if(e){const n=this.boundingSphere.center;if(Ot.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];Oi.setFromBufferAttribute(o),this.morphTargetsRelative?(vt.addVectors(Ot.min,Oi.min),Ot.expandByPoint(vt),vt.addVectors(Ot.max,Oi.max),Ot.expandByPoint(vt)):(Ot.expandByPoint(Oi.min),Ot.expandByPoint(Oi.max))}Ot.getCenter(n);let i=0;for(let s=0,a=e.count;s<a;s++)vt.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(vt));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)vt.fromBufferAttribute(o,c),l&&(ai.fromBufferAttribute(e,c),vt.add(ai)),i=Math.max(i,n.distanceToSquared(vt))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeFaceNormals(){}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.array,i=t.position.array,s=t.normal.array,a=t.uv.array,o=i.length/3;t.tangent===void 0&&this.setAttribute("tangent",new dt(new Float32Array(4*o),4));const l=t.tangent.array,c=[],h=[];for(let V=0;V<o;V++)c[V]=new b,h[V]=new b;const u=new b,d=new b,f=new b,m=new se,v=new se,x=new se,g=new b,p=new b;function E(V,J,O){u.fromArray(i,V*3),d.fromArray(i,J*3),f.fromArray(i,O*3),m.fromArray(a,V*2),v.fromArray(a,J*2),x.fromArray(a,O*2),d.sub(u),f.sub(u),v.sub(m),x.sub(m);const C=1/(v.x*x.y-x.x*v.y);isFinite(C)&&(g.copy(d).multiplyScalar(x.y).addScaledVector(f,-v.y).multiplyScalar(C),p.copy(f).multiplyScalar(v.x).addScaledVector(d,-x.x).multiplyScalar(C),c[V].add(g),c[J].add(g),c[O].add(g),h[V].add(p),h[J].add(p),h[O].add(p))}let T=this.groups;T.length===0&&(T=[{start:0,count:n.length}]);for(let V=0,J=T.length;V<J;++V){const O=T[V],C=O.start,I=O.count;for(let R=C,A=C+I;R<A;R+=3)E(n[R+0],n[R+1],n[R+2])}const S=new b,_=new b,P=new b,N=new b;function z(V){P.fromArray(s,V*3),N.copy(P);const J=c[V];S.copy(J),S.sub(P.multiplyScalar(P.dot(J))).normalize(),_.crossVectors(N,J);const C=_.dot(h[V])<0?-1:1;l[V*4]=S.x,l[V*4+1]=S.y,l[V*4+2]=S.z,l[V*4+3]=C}for(let V=0,J=T.length;V<J;++V){const O=T[V],C=O.start,I=O.count;for(let R=C,A=C+I;R<A;R+=3)z(n[R+0]),z(n[R+1]),z(n[R+2])}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new dt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const i=new b,s=new b,a=new b,o=new b,l=new b,c=new b,h=new b,u=new b;if(e)for(let d=0,f=e.count;d<f;d+=3){const m=e.getX(d+0),v=e.getX(d+1),x=e.getX(d+2);i.fromBufferAttribute(t,m),s.fromBufferAttribute(t,v),a.fromBufferAttribute(t,x),h.subVectors(a,s),u.subVectors(i,s),h.cross(u),o.fromBufferAttribute(n,m),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,x),o.add(h),l.add(h),c.add(h),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(x,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)i.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),h.subVectors(a,s),u.subVectors(i,s),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}merge(e,t){if(!(e&&e.isBufferGeometry)){console.error("THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.",e);return}t===void 0&&(t=0,console.warn("THREE.BufferGeometry.merge(): Overwriting original geometry, starting at offset=0. Use BufferGeometryUtils.mergeBufferGeometries() for lossless merge."));const n=this.attributes;for(const i in n){if(e.attributes[i]===void 0)continue;const a=n[i].array,o=e.attributes[i],l=o.array,c=o.itemSize*t,h=Math.min(l.length,a.length-c);for(let u=0,d=c;u<h;u++,d++)a[d]=l[u]}return this}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)vt.fromBufferAttribute(e,t),vt.normalize(),e.setXYZ(t,vt.x,vt.y,vt.z)}toNonIndexed(){function e(o,l){const c=o.array,h=o.itemSize,u=o.normalized,d=new c.constructor(l.length*h);let f=0,m=0;for(let v=0,x=l.length;v<x;v++){f=l[v]*h;for(let g=0;g<h;g++)d[m++]=c[f++]}return new dt(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ye,n=this.index.array,i=this.attributes;for(const o in i){const l=i[o],c=e(l,n);t.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=e(d,n);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.5,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const i={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(i[l]=h,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new Ye().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone(t));const i=e.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(t))}const s=e.morphAttributes;for(const c in s){const h=[],u=s[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,h=a.length;c<h;c++){const u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}Ye.prototype.isBufferGeometry=!0;const ho=new Le,oi=new Yn,Cs=new Li,En=new b,Tn=new b,An=new b,Rs=new b,Ps=new b,Is=new b,_r=new b,yr=new b,Mr=new b,wr=new se,br=new se,Sr=new se,Ds=new b,Er=new b;class Mt extends Ze{constructor(e=new Ye,t=new kn){super(),this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e){return super.copy(e),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=e.material,this.geometry=e.geometry,this}updateMorphTargets(){const e=this.geometry;if(e.isBufferGeometry){const t=e.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){const o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}else{const t=e.morphTargets;t!==void 0&&t.length>0&&console.error("THREE.Mesh.updateMorphTargets() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}}raycast(e,t){const n=this.geometry,i=this.material,s=this.matrixWorld;if(i===void 0||(n.boundingSphere===null&&n.computeBoundingSphere(),Cs.copy(n.boundingSphere),Cs.applyMatrix4(s),e.ray.intersectsSphere(Cs)===!1)||(ho.copy(s).invert(),oi.copy(e.ray).applyMatrix4(ho),n.boundingBox!==null&&oi.intersectsBox(n.boundingBox)===!1))return;let a;if(n.isBufferGeometry){const o=n.index,l=n.attributes.position,c=n.morphAttributes.position,h=n.morphTargetsRelative,u=n.attributes.uv,d=n.attributes.uv2,f=n.groups,m=n.drawRange;if(o!==null)if(Array.isArray(i))for(let v=0,x=f.length;v<x;v++){const g=f[v],p=i[g.materialIndex],E=Math.max(g.start,m.start),T=Math.min(g.start+g.count,m.start+m.count);for(let S=E,_=T;S<_;S+=3){const P=o.getX(S),N=o.getX(S+1),z=o.getX(S+2);a=Tr(this,p,e,oi,l,c,h,u,d,P,N,z),a&&(a.faceIndex=Math.floor(S/3),a.face.materialIndex=g.materialIndex,t.push(a))}}else{const v=Math.max(0,m.start),x=Math.min(o.count,m.start+m.count);for(let g=v,p=x;g<p;g+=3){const E=o.getX(g),T=o.getX(g+1),S=o.getX(g+2);a=Tr(this,i,e,oi,l,c,h,u,d,E,T,S),a&&(a.faceIndex=Math.floor(g/3),t.push(a))}}else if(l!==void 0)if(Array.isArray(i))for(let v=0,x=f.length;v<x;v++){const g=f[v],p=i[g.materialIndex],E=Math.max(g.start,m.start),T=Math.min(g.start+g.count,m.start+m.count);for(let S=E,_=T;S<_;S+=3){const P=S,N=S+1,z=S+2;a=Tr(this,p,e,oi,l,c,h,u,d,P,N,z),a&&(a.faceIndex=Math.floor(S/3),a.face.materialIndex=g.materialIndex,t.push(a))}}else{const v=Math.max(0,m.start),x=Math.min(l.count,m.start+m.count);for(let g=v,p=x;g<p;g+=3){const E=g,T=g+1,S=g+2;a=Tr(this,i,e,oi,l,c,h,u,d,E,T,S),a&&(a.faceIndex=Math.floor(g/3),t.push(a))}}}else n.isGeometry&&console.error("THREE.Mesh.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}}Mt.prototype.isMesh=!0;function Su(r,e,t,n,i,s,a,o){let l;if(e.side===ft?l=n.intersectTriangle(a,s,i,!0,o):l=n.intersectTriangle(i,s,a,e.side!==bi,o),l===null)return null;Er.copy(o),Er.applyMatrix4(r.matrixWorld);const c=t.ray.origin.distanceTo(Er);return c<t.near||c>t.far?null:{distance:c,point:Er.clone(),object:r}}function Tr(r,e,t,n,i,s,a,o,l,c,h,u){En.fromBufferAttribute(i,c),Tn.fromBufferAttribute(i,h),An.fromBufferAttribute(i,u);const d=r.morphTargetInfluences;if(e.morphTargets&&s&&d){_r.set(0,0,0),yr.set(0,0,0),Mr.set(0,0,0);for(let m=0,v=s.length;m<v;m++){const x=d[m],g=s[m];x!==0&&(Rs.fromBufferAttribute(g,c),Ps.fromBufferAttribute(g,h),Is.fromBufferAttribute(g,u),a?(_r.addScaledVector(Rs,x),yr.addScaledVector(Ps,x),Mr.addScaledVector(Is,x)):(_r.addScaledVector(Rs.sub(En),x),yr.addScaledVector(Ps.sub(Tn),x),Mr.addScaledVector(Is.sub(An),x)))}En.add(_r),Tn.add(yr),An.add(Mr)}r.isSkinnedMesh&&e.skinning&&(r.boneTransform(c,En),r.boneTransform(h,Tn),r.boneTransform(u,An));const f=Su(r,e,t,n,En,Tn,An,Ds);if(f){o&&(wr.fromBufferAttribute(o,c),br.fromBufferAttribute(o,h),Sr.fromBufferAttribute(o,u),f.uv=pt.getUV(Ds,En,Tn,An,wr,br,Sr,new se)),l&&(wr.fromBufferAttribute(l,c),br.fromBufferAttribute(l,h),Sr.fromBufferAttribute(l,u),f.uv2=pt.getUV(Ds,En,Tn,An,wr,br,Sr,new se));const m={a:c,b:h,c:u,normal:new b,materialIndex:0};pt.getNormal(En,Tn,An,m.normal),f.face=m}return f}class fa extends Ye{constructor(e=1,t=1,n=1,i=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:a};const o=this;i=Math.floor(i),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],h=[],u=[];let d=0,f=0;m("z","y","x",-1,-1,n,t,e,a,s,0),m("z","y","x",1,-1,n,t,-e,a,s,1),m("x","z","y",1,1,e,n,t,i,a,2),m("x","z","y",1,-1,e,n,-t,i,a,3),m("x","y","z",1,-1,e,t,n,i,s,4),m("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new rt(c,3)),this.setAttribute("normal",new rt(h,3)),this.setAttribute("uv",new rt(u,2));function m(v,x,g,p,E,T,S,_,P,N,z){const V=T/P,J=S/N,O=T/2,C=S/2,I=_/2,R=P+1,A=N+1;let X=0,ee=0;const Z=new b;for(let ae=0;ae<A;ae++){const te=ae*J-C;for(let pe=0;pe<R;pe++){const xe=pe*V-O;Z[v]=xe*p,Z[x]=te*E,Z[g]=I,c.push(Z.x,Z.y,Z.z),Z[v]=0,Z[x]=0,Z[g]=_>0?1:-1,h.push(Z.x,Z.y,Z.z),u.push(pe/P),u.push(1-ae/N),X+=1}}for(let ae=0;ae<N;ae++)for(let te=0;te<P;te++){const pe=d+te+R*ae,xe=d+te+R*(ae+1),H=d+(te+1)+R*(ae+1),Oe=d+(te+1)+R*ae;l.push(pe,xe,Oe),l.push(xe,H,Oe),ee+=6}o.addGroup(f,ee,z),f+=ee,d+=X}}}function Si(r){const e={};for(const t in r){e[t]={};for(const n in r[t]){const i=r[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Et(r){const e={};for(let t=0;t<r.length;t++){const n=Si(r[t]);for(const i in n)e[i]=n[i]}return e}const Eu={clone:Si,merge:Et};var Tu=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Au=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Xn extends xt{constructor(e){super(),this.type="ShaderMaterial",this.defines={},this.uniforms={},this.vertexShader=Tu,this.fragmentShader=Au,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv2:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&(e.attributes!==void 0&&console.error("THREE.ShaderMaterial: attributes should now be defined in THREE.BufferGeometry instead."),this.setValues(e))}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Si(e.uniforms),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.lights=e.lights,this.clipping=e.clipping,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const a=this.uniforms[i].value;a&&a.isTexture?t.uniforms[i]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[i]={type:"m4",value:a.toArray()}:t.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}Xn.prototype.isShaderMaterial=!0;class pa extends Ze{constructor(){super(),this.type="Camera",this.matrixWorldInverse=new Le,this.projectionMatrix=new Le,this.projectionMatrixInverse=new Le}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this}getWorldDirection(e){e===void 0&&(console.warn("THREE.Camera: .getWorldDirection() target is now required"),e=new b),this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(-t[8],-t[9],-t[10]).normalize()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}pa.prototype.isCamera=!0;class Nt extends pa{constructor(e=50,t=1,n=.1,i=2e3){super(),this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Qs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(cs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Qs*2*Math.atan(Math.tan(cs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,n,i,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(cs*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*i/l,t-=a.offsetY*n/c,i*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}Nt.prototype.isPerspectiveCamera=!0;const li=90,ci=1;class ma extends Ze{constructor(e,t,n){if(super(),this.type="CubeCamera",n.isWebGLCubeRenderTarget!==!0){console.error("THREE.CubeCamera: The constructor now expects an instance of WebGLCubeRenderTarget as third parameter.");return}this.renderTarget=n;const i=new Nt(li,ci,e,t);i.layers=this.layers,i.up.set(0,-1,0),i.lookAt(new b(1,0,0)),this.add(i);const s=new Nt(li,ci,e,t);s.layers=this.layers,s.up.set(0,-1,0),s.lookAt(new b(-1,0,0)),this.add(s);const a=new Nt(li,ci,e,t);a.layers=this.layers,a.up.set(0,0,1),a.lookAt(new b(0,1,0)),this.add(a);const o=new Nt(li,ci,e,t);o.layers=this.layers,o.up.set(0,0,-1),o.lookAt(new b(0,-1,0)),this.add(o);const l=new Nt(li,ci,e,t);l.layers=this.layers,l.up.set(0,-1,0),l.lookAt(new b(0,0,1)),this.add(l);const c=new Nt(li,ci,e,t);c.layers=this.layers,c.up.set(0,-1,0),c.lookAt(new b(0,0,-1)),this.add(c)}update(e,t){this.parent===null&&this.updateMatrixWorld();const n=this.renderTarget,[i,s,a,o,l,c]=this.children,h=e.xr.enabled,u=e.getRenderTarget();e.xr.enabled=!1;const d=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0),e.render(t,i),e.setRenderTarget(n,1),e.render(t,s),e.setRenderTarget(n,2),e.render(t,a),e.setRenderTarget(n,3),e.render(t,o),e.setRenderTarget(n,4),e.render(t,l),n.texture.generateMipmaps=d,e.setRenderTarget(n,5),e.render(t,c),e.setRenderTarget(u),e.xr.enabled=h}}class es extends bt{constructor(e,t,n,i,s,a,o,l,c,h){e=e!==void 0?e:[],t=t!==void 0?t:aa,o=o!==void 0?o:Vn,super(e,t,n,i,s,a,o,l,c,h),this._needsFlipEnvMap=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}es.prototype.isCubeTexture=!0;class gl extends Wn{constructor(e,t,n){Number.isInteger(t)&&(console.warn("THREE.WebGLCubeRenderTarget: constructor signature is now WebGLCubeRenderTarget( size, options )"),t=n),super(e,e,t),t=t||{},this.texture=new es(void 0,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.encoding),this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Wt,this.texture._needsFlipEnvMap=!1}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.format=$t,this.texture.encoding=t.encoding,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new fa(5,5,5),s=new Xn({name:"CubemapFromEquirect",uniforms:Si(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:ft,blending:ji});s.uniforms.tEquirect.value=t;const a=new Mt(i,s),o=t.minFilter;return t.minFilter===ha&&(t.minFilter=Wt),new ma(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,i){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,i);e.setRenderTarget(s)}}gl.prototype.isWebGLCubeRenderTarget=!0;class vl extends bt{constructor(e,t,n,i,s,a,o,l,c,h,u,d){super(null,a,o,l,c,h,i,s,u,d),this.image={data:e||null,width:t||1,height:n||1},this.magFilter=c!==void 0?c:Rt,this.minFilter=h!==void 0?h:Rt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.needsUpdate=!0}}vl.prototype.isDataTexture=!0;const hi=new Li,Ar=new b;class ts{constructor(e=new sn,t=new sn,n=new sn,i=new sn,s=new sn,a=new sn){this.planes=[e,t,n,i,s,a]}set(e,t,n,i,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(i),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e){const t=this.planes,n=e.elements,i=n[0],s=n[1],a=n[2],o=n[3],l=n[4],c=n[5],h=n[6],u=n[7],d=n[8],f=n[9],m=n[10],v=n[11],x=n[12],g=n[13],p=n[14],E=n[15];return t[0].setComponents(o-i,u-l,v-d,E-x).normalize(),t[1].setComponents(o+i,u+l,v+d,E+x).normalize(),t[2].setComponents(o+s,u+c,v+f,E+g).normalize(),t[3].setComponents(o-s,u-c,v-f,E-g).normalize(),t[4].setComponents(o-a,u-h,v-m,E-p).normalize(),t[5].setComponents(o+a,u+h,v+m,E+p).normalize(),this}intersectsObject(e){const t=e.geometry;return t.boundingSphere===null&&t.computeBoundingSphere(),hi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld),this.intersectsSphere(hi)}intersectsSprite(e){return hi.center.set(0,0,0),hi.radius=.7071067811865476,hi.applyMatrix4(e.matrixWorld),this.intersectsSphere(hi)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Ar.x=i.normal.x>0?e.max.x:e.min.x,Ar.y=i.normal.y>0?e.max.y:e.min.y,Ar.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Ar)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function xl(){let r=null,e=!1,t=null,n=null;function i(s,a){t(s,a),n=r.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=r.requestAnimationFrame(i),e=!0)},stop:function(){r.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){r=s}}}function Lu(r,e){const t=e.isWebGL2,n=new WeakMap;function i(c,h){const u=c.array,d=c.usage,f=r.createBuffer();r.bindBuffer(h,f),r.bufferData(h,u,d),c.onUploadCallback();let m=5126;return u instanceof Float32Array?m=5126:u instanceof Float64Array?console.warn("THREE.WebGLAttributes: Unsupported data buffer format: Float64Array."):u instanceof Uint16Array?c.isFloat16BufferAttribute?t?m=5131:console.warn("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2."):m=5123:u instanceof Int16Array?m=5122:u instanceof Uint32Array?m=5125:u instanceof Int32Array?m=5124:u instanceof Int8Array?m=5120:u instanceof Uint8Array&&(m=5121),{buffer:f,type:m,bytesPerElement:u.BYTES_PER_ELEMENT,version:c.version}}function s(c,h,u){const d=h.array,f=h.updateRange;r.bindBuffer(u,c),f.count===-1?r.bufferSubData(u,0,d):(t?r.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d,f.offset,f.count):r.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d.subarray(f.offset,f.offset+f.count)),f.count=-1)}function a(c){return c.isInterleavedBufferAttribute&&(c=c.data),n.get(c)}function o(c){c.isInterleavedBufferAttribute&&(c=c.data);const h=n.get(c);h&&(r.deleteBuffer(h.buffer),n.delete(c))}function l(c,h){if(c.isGLBufferAttribute){const d=n.get(c);(!d||d.version<c.version)&&n.set(c,{buffer:c.buffer,type:c.type,bytesPerElement:c.elementSize,version:c.version});return}c.isInterleavedBufferAttribute&&(c=c.data);const u=n.get(c);u===void 0?n.set(c,i(c,h)):u.version<c.version&&(s(u.buffer,c,h),u.version=c.version)}return{get:a,remove:o,update:l}}class Cu extends Ye{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const s=e/2,a=t/2,o=Math.floor(n),l=Math.floor(i),c=o+1,h=l+1,u=e/o,d=t/l,f=[],m=[],v=[],x=[];for(let g=0;g<h;g++){const p=g*d-a;for(let E=0;E<c;E++){const T=E*u-s;m.push(T,-p,0),v.push(0,0,1),x.push(E/o),x.push(1-g/l)}}for(let g=0;g<l;g++)for(let p=0;p<o;p++){const E=p+c*g,T=p+c*(g+1),S=p+1+c*(g+1),_=p+1+c*g;f.push(E,T,_),f.push(T,S,_)}this.setIndex(f),this.setAttribute("position",new rt(m,3)),this.setAttribute("normal",new rt(v,3)),this.setAttribute("uv",new rt(x,2))}}var Ru=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vUv ).g;
#endif`,Pu=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Iu=`#ifdef ALPHATEST
	if ( diffuseColor.a < ALPHATEST ) discard;
#endif`,Du=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.specularRoughness );
	#endif
#endif`,Nu=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Fu="vec3 transformed = vec3( position );",Bu=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,zu=`vec2 integrateSpecularBRDF( const in float dotNV, const in float roughness ) {
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	return vec2( -1.04, 1.04 ) * a004 + r.zw;
}
float punctualLightIntensityToIrradianceFactor( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
#if defined ( PHYSICALLY_CORRECT_LIGHTS )
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
#else
	if( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
		return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;
#endif
}
vec3 BRDF_Diffuse_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 specularColor, const in float dotLH ) {
	float fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );
	return ( 1.0 - specularColor ) * fresnel + specularColor;
}
vec3 F_Schlick_RoughnessDependent( const in vec3 F0, const in float dotNV, const in float roughness ) {
	float fresnel = exp2( ( -5.55473 * dotNV - 6.98316 ) * dotNV );
	vec3 Fr = max( vec3( 1.0 - roughness ), F0 ) - F0;
	return Fr * fresnel + F0;
}
float G_GGX_Smith( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gl = dotNL + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	float gv = dotNV + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	return 1.0 / ( gl * gv );
}
float G_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
vec3 BRDF_Specular_GGX( const in IncidentLight incidentLight, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float roughness ) {
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( incidentLight.direction + viewDir );
	float dotNL = saturate( dot( normal, incidentLight.direction ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
	vec3 F = F_Schlick( specularColor, dotLH );
	float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );
	float D = D_GGX( alpha, dotNH );
	return F * ( G * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
vec3 BRDF_Specular_GGX_Environment( const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 brdf = integrateSpecularBRDF( dotNV, roughness );
	return specularColor * brdf.x + brdf.y;
}
void BRDF_Specular_Multiscattering_Environment( const in GeometricContext geometry, const in vec3 specularColor, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
	float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
	vec3 F = F_Schlick_RoughnessDependent( specularColor, dotNV, roughness );
	vec2 brdf = integrateSpecularBRDF( dotNV, roughness );
	vec3 FssEss = F * brdf.x + brdf.y;
	float Ess = brdf.x + brdf.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = specularColor + ( 1.0 - specularColor ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_Specular_BlinnPhong( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );
	float dotNH = saturate( dot( geometry.normal, halfDir ) );
	float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
	vec3 F = F_Schlick( specularColor, dotLH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
}
float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {
	return ( 2.0 / pow2( ggxRoughness + 0.0001 ) - 2.0 );
}
float BlinnExponentToGGXRoughness( const in float blinnExponent ) {
	return sqrt( 2.0 / ( blinnExponent + 2.0 ) );
}
#if defined( USE_SHEEN )
float D_Charlie(float roughness, float NoH) {
	float invAlpha = 1.0 / roughness;
	float cos2h = NoH * NoH;
	float sin2h = max(1.0 - cos2h, 0.0078125);	return (2.0 + invAlpha) * pow(sin2h, invAlpha * 0.5) / (2.0 * PI);
}
float V_Neubelt(float NoV, float NoL) {
	return saturate(1.0 / (4.0 * (NoL + NoV - NoL * NoV)));
}
vec3 BRDF_Specular_Sheen( const in float roughness, const in vec3 L, const in GeometricContext geometry, vec3 specularColor ) {
	vec3 N = geometry.normal;
	vec3 V = geometry.viewDir;
	vec3 H = normalize( V + L );
	float dotNH = saturate( dot( N, H ) );
	return specularColor * D_Charlie( roughness, dotNH ) * V_Neubelt( dot(N, V), dot(N, L) );
}
#endif`,Ou=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vUv );
		vec2 dSTdy = dFdy( vUv );
		float Hll = bumpScale * texture2D( bumpMap, vUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
		vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Uu=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,Hu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,ku=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Gu=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Vu=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Wu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Xu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,qu=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Yu=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate(a) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement(a) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float max3( vec3 v ) { return max( max( v.x, v.y ), v.z ); }
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
#ifdef CLEARCOAT
	vec3 clearcoatNormal;
#endif
};
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
	float distance = dot( planeNormal, point - pointOnPlane );
	return - distance * planeNormal + point;
}
float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
	return sign( dot( point - pointOnPlane, planeNormal ) );
}
vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {
	return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float linearToRelativeLuminance( const in vec3 color ) {
	vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
	return dot( weights, color.rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}`,ju=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_maxMipLevel 8.0
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_maxTileSize 256.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		float texelSize = 1.0 / ( 3.0 * cubeUV_maxTileSize );
		vec2 uv = getUV( direction, face ) * ( faceSize - 1.0 );
		vec2 f = fract( uv );
		uv += 0.5 - f;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		if ( mipInt < cubeUV_maxMipLevel ) {
			uv.y += 2.0 * cubeUV_maxTileSize;
		}
		uv.y += filterInt * 2.0 * cubeUV_minTileSize;
		uv.x += 3.0 * max( 0.0, cubeUV_maxTileSize - 2.0 * faceSize );
		uv *= texelSize;
		vec3 tl = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		uv.x += texelSize;
		vec3 tr = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		uv.y += texelSize;
		vec3 br = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		uv.x -= texelSize;
		vec3 bl = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		vec3 tm = mix( tl, tr, f.x );
		vec3 bm = mix( bl, br, f.x );
		return mix( tm, bm, f.y );
	}
	#define r0 1.0
	#define v0 0.339
	#define m0 - 2.0
	#define r1 0.8
	#define v1 0.276
	#define m1 - 1.0
	#define r4 0.4
	#define v4 0.046
	#define m4 2.0
	#define r5 0.305
	#define v5 0.016
	#define m5 3.0
	#define r6 0.21
	#define v6 0.0038
	#define m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= r1 ) {
			mip = ( r0 - roughness ) * ( m1 - m0 ) / ( r0 - r1 ) + m0;
		} else if ( roughness >= r4 ) {
			mip = ( r1 - roughness ) * ( m4 - m1 ) / ( r1 - r4 ) + m1;
		} else if ( roughness >= r5 ) {
			mip = ( r4 - roughness ) * ( m5 - m4 ) / ( r4 - r5 ) + m4;
		} else if ( roughness >= r6 ) {
			mip = ( r5 - roughness ) * ( m6 - m5 ) / ( r5 - r6 ) + m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), m0, cubeUV_maxMipLevel );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Zu=`vec3 transformedNormal = objectNormal;
#ifdef USE_INSTANCING
	mat3 m = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
	transformedNormal = m * transformedNormal;
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Ju=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Qu=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
#endif`,Ku=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vUv );
	emissiveColor.rgb = emissiveMapTexelToLinear( emissiveColor ).rgb;
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,$u=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ed="gl_FragColor = linearToOutputTexel( gl_FragColor );",td=`
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 GammaToLinear( in vec4 value, in float gammaFactor ) {
	return vec4( pow( value.rgb, vec3( gammaFactor ) ), value.a );
}
vec4 LinearToGamma( in vec4 value, in float gammaFactor ) {
	return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
}
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 RGBEToLinear( in vec4 value ) {
	return vec4( value.rgb * exp2( value.a * 255.0 - 128.0 ), 1.0 );
}
vec4 LinearToRGBE( in vec4 value ) {
	float maxComponent = max( max( value.r, value.g ), value.b );
	float fExp = clamp( ceil( log2( maxComponent ) ), -128.0, 127.0 );
	return vec4( value.rgb / exp2( fExp ), ( fExp + 128.0 ) / 255.0 );
}
vec4 RGBMToLinear( in vec4 value, in float maxRange ) {
	return vec4( value.rgb * value.a * maxRange, 1.0 );
}
vec4 LinearToRGBM( in vec4 value, in float maxRange ) {
	float maxRGB = max( value.r, max( value.g, value.b ) );
	float M = clamp( maxRGB / maxRange, 0.0, 1.0 );
	M = ceil( M * 255.0 ) / 255.0;
	return vec4( value.rgb / ( M * maxRange ), M );
}
vec4 RGBDToLinear( in vec4 value, in float maxRange ) {
	return vec4( value.rgb * ( ( maxRange / 255.0 ) / value.a ), 1.0 );
}
vec4 LinearToRGBD( in vec4 value, in float maxRange ) {
	float maxRGB = max( value.r, max( value.g, value.b ) );
	float D = max( maxRange / maxRGB, 1.0 );
	D = clamp( floor( D ) / 255.0, 0.0, 1.0 );
	return vec4( value.rgb * ( D * ( 255.0 / maxRange ) ), D );
}
const mat3 cLogLuvM = mat3( 0.2209, 0.3390, 0.4184, 0.1138, 0.6780, 0.7319, 0.0102, 0.1130, 0.2969 );
vec4 LinearToLogLuv( in vec4 value ) {
	vec3 Xp_Y_XYZp = cLogLuvM * value.rgb;
	Xp_Y_XYZp = max( Xp_Y_XYZp, vec3( 1e-6, 1e-6, 1e-6 ) );
	vec4 vResult;
	vResult.xy = Xp_Y_XYZp.xy / Xp_Y_XYZp.z;
	float Le = 2.0 * log2(Xp_Y_XYZp.y) + 127.0;
	vResult.w = fract( Le );
	vResult.z = ( Le - ( floor( vResult.w * 255.0 ) ) / 255.0 ) / 255.0;
	return vResult;
}
const mat3 cLogLuvInverseM = mat3( 6.0014, -2.7008, -1.7996, -1.3320, 3.1029, -5.7721, 0.3008, -1.0882, 5.6268 );
vec4 LogLuvToLinear( in vec4 value ) {
	float Le = value.z * 255.0 + value.w;
	vec3 Xp_Y_XYZp;
	Xp_Y_XYZp.y = exp2( ( Le - 127.0 ) / 2.0 );
	Xp_Y_XYZp.z = Xp_Y_XYZp.y / value.y;
	Xp_Y_XYZp.x = value.x * Xp_Y_XYZp.z;
	vec3 vRGB = cLogLuvInverseM * Xp_Y_XYZp.rgb;
	return vec4( max( vRGB, 0.0 ), 1.0 );
}`,nd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 envColor = textureCubeUV( envMap, reflectVec, 0.0 );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifndef ENVMAP_TYPE_CUBE_UV
		envColor = envMapTexelToLinear( envColor );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,id=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform int maxMipLevel;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,rd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,sd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) ||defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ad=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,od=`#ifdef USE_FOG
	fogDepth = - mvPosition.z;
#endif`,ld=`#ifdef USE_FOG
	varying float fogDepth;
#endif`,cd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,hd=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float fogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ud=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return texture2D( gradientMap, coord ).rgb;
	#else
		return ( coord.x < 0.7 ) ? vec3( 0.7 ) : vec3( 1.0 );
	#endif
}`,dd=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel= texture2D( lightMap, vUv2 );
	reflectedLight.indirectDiffuse += PI * lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;
#endif`,fd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,pd=`vec3 diffuse = vec3( 1.0 );
GeometricContext geometry;
geometry.position = mvPosition.xyz;
geometry.normal = normalize( transformedNormal );
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( -mvPosition.xyz );
GeometricContext backGeometry;
backGeometry.position = geometry.position;
backGeometry.normal = -geometry.normal;
backGeometry.viewDir = geometry.viewDir;
vLightFront = vec3( 0.0 );
vIndirectFront = vec3( 0.0 );
#ifdef DOUBLE_SIDED
	vLightBack = vec3( 0.0 );
	vIndirectBack = vec3( 0.0 );
#endif
IncidentLight directLight;
float dotNL;
vec3 directLightColor_Diffuse;
vIndirectFront += getAmbientLightIrradiance( ambientLightColor );
vIndirectFront += getLightProbeIrradiance( lightProbe, geometry );
#ifdef DOUBLE_SIDED
	vIndirectBack += getAmbientLightIrradiance( ambientLightColor );
	vIndirectBack += getLightProbeIrradiance( lightProbe, backGeometry );
#endif
#if NUM_POINT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		getPointDirectLightIrradiance( pointLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = PI * directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( -dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_SPOT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		getSpotDirectLightIrradiance( spotLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = PI * directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( -dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_DIR_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		getDirectionalDirectLightIrradiance( directionalLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = PI * directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( -dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_HEMI_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
		vIndirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
		#ifdef DOUBLE_SIDED
			vIndirectBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry );
		#endif
	}
	#pragma unroll_loop_end
#endif`,md=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
uniform vec3 lightProbe[ 9 ];
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in GeometricContext geometry ) {
	vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	return irradiance;
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		directLight.color = directionalLight.color;
		directLight.direction = directionalLight.direction;
		directLight.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointDirectLightIrradiance( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		vec3 lVector = pointLight.position - geometry.position;
		directLight.direction = normalize( lVector );
		float lightDistance = length( lVector );
		directLight.color = pointLight.color;
		directLight.color *= punctualLightIntensityToIrradianceFactor( lightDistance, pointLight.distance, pointLight.decay );
		directLight.visible = ( directLight.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotDirectLightIrradiance( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		vec3 lVector = spotLight.position - geometry.position;
		directLight.direction = normalize( lVector );
		float lightDistance = length( lVector );
		float angleCos = dot( directLight.direction, spotLight.direction );
		if ( angleCos > spotLight.coneCos ) {
			float spotEffect = smoothstep( spotLight.coneCos, spotLight.penumbraCos, angleCos );
			directLight.color = spotLight.color;
			directLight.color *= spotEffect * punctualLightIntensityToIrradianceFactor( lightDistance, spotLight.distance, spotLight.decay );
			directLight.visible = true;
		} else {
			directLight.color = vec3( 0.0 );
			directLight.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in GeometricContext geometry ) {
		float dotNL = dot( geometry.normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		#ifndef PHYSICALLY_CORRECT_LIGHTS
			irradiance *= PI;
		#endif
		return irradiance;
	}
#endif`,gd=`#if defined( USE_ENVMAP )
	#ifdef ENVMAP_MODE_REFRACTION
		uniform float refractionRatio;
	#endif
	vec3 getLightProbeIndirectIrradiance( const in GeometricContext geometry, const in int maxMIPLevel ) {
		vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
		#ifdef ENVMAP_TYPE_CUBE
			vec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = textureCubeLodEXT( envMap, queryVec, float( maxMIPLevel ) );
			#else
				vec4 envMapColor = textureCube( envMap, queryVec, float( maxMIPLevel ) );
			#endif
			envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;
		#elif defined( ENVMAP_TYPE_CUBE_UV )
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
		#else
			vec4 envMapColor = vec4( 0.0 );
		#endif
		return PI * envMapColor.rgb * envMapIntensity;
	}
	float getSpecularMIPLevel( const in float roughness, const in int maxMIPLevel ) {
		float maxMIPLevelScalar = float( maxMIPLevel );
		float sigma = PI * roughness * roughness / ( 1.0 + roughness );
		float desiredMIPLevel = maxMIPLevelScalar + log2( sigma );
		return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );
	}
	vec3 getLightProbeIndirectRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in int maxMIPLevel ) {
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( -viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
		#else
			vec3 reflectVec = refract( -viewDir, normal, refractionRatio );
		#endif
		reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
		float specularMIPLevel = getSpecularMIPLevel( roughness, maxMIPLevel );
		#ifdef ENVMAP_TYPE_CUBE
			vec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );
			#else
				vec4 envMapColor = textureCube( envMap, queryReflectVec, specularMIPLevel );
			#endif
			envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;
		#elif defined( ENVMAP_TYPE_CUBE_UV )
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
		#endif
		return envMapColor.rgb * envMapIntensity;
	}
#endif`,vd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,xd=`varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometry.normal, directLight.direction ) * directLight.color;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon
#define Material_LightProbeLOD( material )	(0)`,_d=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,yd=`varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_Specular_BlinnPhong( directLight, geometry, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong
#define Material_LightProbeLOD( material )	(0)`,Md=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.specularRoughness = max( roughnessFactor, 0.0525 );material.specularRoughness += geometryRoughness;
material.specularRoughness = min( material.specularRoughness, 1.0 );
#ifdef REFLECTIVITY
	material.specularColor = mix( vec3( MAXIMUM_SPECULAR_COEFFICIENT * pow2( reflectivity ) ), diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( DEFAULT_SPECULAR_COEFFICIENT ), diffuseColor.rgb, metalnessFactor );
#endif
#ifdef CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheen;
#endif`,wd=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float specularRoughness;
	vec3 specularColor;
#ifdef CLEARCOAT
	float clearcoat;
	float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	vec3 sheenColor;
#endif
};
#define MAXIMUM_SPECULAR_COEFFICIENT 0.16
#define DEFAULT_SPECULAR_COEFFICIENT 0.04
float clearcoatDHRApprox( const in float roughness, const in float dotNL ) {
	return DEFAULT_SPECULAR_COEFFICIENT + ( 1.0 - DEFAULT_SPECULAR_COEFFICIENT ) * ( pow( 1.0 - dotNL, 5.0 ) * pow( 1.0 - roughness, 2.0 ) );
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometry.normal;
		vec3 viewDir = geometry.viewDir;
		vec3 position = geometry.position;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.specularRoughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	#ifdef CLEARCOAT
		float ccDotNL = saturate( dot( geometry.clearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = ccDotNL * directLight.color;
		#ifndef PHYSICALLY_CORRECT_LIGHTS
			ccIrradiance *= PI;
		#endif
		float clearcoatDHR = material.clearcoat * clearcoatDHRApprox( material.clearcoatRoughness, ccDotNL );
		reflectedLight.directSpecular += ccIrradiance * material.clearcoat * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.clearcoatNormal, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.clearcoatRoughness );
	#else
		float clearcoatDHR = 0.0;
	#endif
	#ifdef USE_SHEEN
		reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_Sheen(
			material.specularRoughness,
			directLight.direction,
			geometry,
			material.sheenColor
		);
	#else
		reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, material.specularRoughness);
	#endif
	reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef CLEARCOAT
		float ccDotNV = saturate( dot( geometry.clearcoatNormal, geometry.viewDir ) );
		reflectedLight.indirectSpecular += clearcoatRadiance * material.clearcoat * BRDF_Specular_GGX_Environment( geometry.viewDir, geometry.clearcoatNormal, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.clearcoatRoughness );
		float ccDotNL = ccDotNV;
		float clearcoatDHR = material.clearcoat * clearcoatDHRApprox( material.clearcoatRoughness, ccDotNL );
	#else
		float clearcoatDHR = 0.0;
	#endif
	float clearcoatInv = 1.0 - clearcoatDHR;
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	BRDF_Specular_Multiscattering_Environment( geometry, material.specularColor, material.specularRoughness, singleScattering, multiScattering );
	vec3 diffuse = material.diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );
	reflectedLight.indirectSpecular += clearcoatInv * radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,bd=`
GeometricContext geometry;
geometry.position = - vViewPosition;
geometry.normal = normal;
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
#ifdef CLEARCOAT
	geometry.clearcoatNormal = clearcoatNormal;
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointDirectLightIrradiance( pointLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotDirectLightIrradiance( spotLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	irradiance += getLightProbeIrradiance( lightProbe, geometry );
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Sd=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel= texture2D( lightMap, vUv2 );
		vec3 lightMapIrradiance = lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;
		#ifndef PHYSICALLY_CORRECT_LIGHTS
			lightMapIrradiance *= PI;
		#endif
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel );
	#ifdef CLEARCOAT
		clearcoatRadiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness, maxMipLevel );
	#endif
#endif`,Ed=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometry, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometry, material, reflectedLight );
#endif`,Td=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ad=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ld=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,Cd=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,Rd=`#ifdef USE_MAP
	vec4 texelColor = texture2D( map, vUv );
	texelColor = mapTexelToLinear( texelColor );
	diffuseColor *= texelColor;
#endif`,Pd=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Id=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
#endif
#ifdef USE_MAP
	vec4 mapTexel = texture2D( map, uv );
	diffuseColor *= mapTexelToLinear( mapTexel );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Dd=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	uniform mat3 uvTransform;
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Nd=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Fd=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Bd=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
	objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
	objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
	objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
#endif`,zd=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifndef USE_MORPHNORMALS
		uniform float morphTargetInfluences[ 8 ];
	#else
		uniform float morphTargetInfluences[ 4 ];
	#endif
#endif`,Od=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	transformed += morphTarget0 * morphTargetInfluences[ 0 ];
	transformed += morphTarget1 * morphTargetInfluences[ 1 ];
	transformed += morphTarget2 * morphTargetInfluences[ 2 ];
	transformed += morphTarget3 * morphTargetInfluences[ 3 ];
	#ifndef USE_MORPHNORMALS
		transformed += morphTarget4 * morphTargetInfluences[ 4 ];
		transformed += morphTarget5 * morphTargetInfluences[ 5 ];
		transformed += morphTarget6 * morphTargetInfluences[ 6 ];
		transformed += morphTarget7 * morphTargetInfluences[ 7 ];
	#endif
#endif`,Ud=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = vec3( dFdx( vViewPosition.x ), dFdx( vViewPosition.y ), dFdx( vViewPosition.z ) );
	vec3 fdy = vec3( dFdy( vViewPosition.x ), dFdy( vViewPosition.y ), dFdy( vViewPosition.z ) );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	#ifdef USE_TANGENT
		vec3 tangent = normalize( vTangent );
		vec3 bitangent = normalize( vBitangent );
		#ifdef DOUBLE_SIDED
			tangent = tangent * faceDirection;
			bitangent = bitangent * faceDirection;
		#endif
		#if defined( TANGENTSPACE_NORMALMAP ) || defined( USE_CLEARCOAT_NORMALMAP )
			mat3 vTBN = mat3( tangent, bitangent, normal );
		#endif
	#endif
#endif
vec3 geometryNormal = normal;`,Hd=`#ifdef OBJECTSPACE_NORMALMAP
	normal = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( TANGENTSPACE_NORMALMAP )
	vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	#ifdef USE_TANGENT
		normal = normalize( vTBN * mapN );
	#else
		normal = perturbNormal2Arb( -vViewPosition, normal, mapN, faceDirection );
	#endif
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,kd=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef OBJECTSPACE_NORMALMAP
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( TANGENTSPACE_NORMALMAP ) || defined ( USE_CLEARCOAT_NORMALMAP ) )
	vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {
		vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
		vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
		vec2 st0 = dFdx( vUv.st );
		vec2 st1 = dFdy( vUv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );
		return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );
	}
#endif`,Gd=`#ifdef CLEARCOAT
	vec3 clearcoatNormal = geometryNormal;
#endif`,Vd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	#ifdef USE_TANGENT
		clearcoatNormal = normalize( vTBN * clearcoatMapN );
	#else
		clearcoatNormal = perturbNormal2Arb( - vViewPosition, clearcoatNormal, clearcoatMapN, faceDirection );
	#endif
#endif`,Wd=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif`,Xd=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ));
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w);
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
	return linearClipZ * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return (( near + viewZ ) * far ) / (( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * invClipZ - far );
}`,qd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Yd=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,jd=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Zd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Jd=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Qd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Kd=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
		bool inFrustum = all( inFrustumVec );
		bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
		bool frustumTest = all( frustumTestVec );
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,$d=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform mat4 spotShadowMatrix[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,ef=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		vec4 shadowWorldPosition;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
		vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias, 0 );
		vSpotShadowCoord[ i ] = spotShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
		vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
#endif`,tf=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,nf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,rf=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	#ifdef BONE_TEXTURE
		uniform highp sampler2D boneTexture;
		uniform int boneTextureSize;
		mat4 getBoneMatrix( const in float i ) {
			float j = i * 4.0;
			float x = mod( j, float( boneTextureSize ) );
			float y = floor( j / float( boneTextureSize ) );
			float dx = 1.0 / float( boneTextureSize );
			float dy = 1.0 / float( boneTextureSize );
			y = dy * ( y + 0.5 );
			vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
			vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
			vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
			vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
			mat4 bone = mat4( v1, v2, v3, v4 );
			return bone;
		}
	#else
		uniform mat4 boneMatrices[ MAX_BONES ];
		mat4 getBoneMatrix( const in float i ) {
			mat4 bone = boneMatrices[ int(i) ];
			return bone;
		}
	#endif
#endif`,sf=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,af=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,of=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,lf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,cf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,hf=`#ifndef saturate
#define saturate(a) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return toneMappingExposure * color;
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,uf=`#ifdef USE_TRANSMISSIONMAP
	totalTransmission *= texture2D( transmissionMap, vUv ).r;
#endif`,df=`#ifdef USE_TRANSMISSIONMAP
	uniform sampler2D transmissionMap;
#endif`,ff=`#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
	varying vec2 vUv;
#endif`,pf=`#ifdef USE_UV
	#ifdef UVS_VERTEX_ONLY
		vec2 vUv;
	#else
		varying vec2 vUv;
	#endif
	uniform mat3 uvTransform;
#endif`,mf=`#ifdef USE_UV
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
#endif`,gf=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	varying vec2 vUv2;
#endif`,vf=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	attribute vec2 uv2;
	varying vec2 vUv2;
	uniform mat3 uv2Transform;
#endif`,xf=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
#endif`,_f=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,yf=`uniform sampler2D t2D;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	gl_FragColor = mapTexelToLinear( texColor );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,Mf=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,wf=`#include <envmap_common_pars_fragment>
uniform float opacity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	vec3 vReflect = vWorldDirection;
	#include <envmap_fragment>
	gl_FragColor = envColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,bf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Sf=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,Ef=`#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Tf=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Af=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Lf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	vec4 texColor = texture2D( tEquirect, sampleUV );
	gl_FragColor = mapTexelToLinear( texColor );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,Cf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Rf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Pf=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <color_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,If=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
	
		vec4 lightMapTexel= texture2D( lightMap, vUv2 );
		reflectedLight.indirectDiffuse += lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Df=`#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <skinbase_vertex>
	#ifdef USE_ENVMAP
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Nf=`uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <emissivemap_fragment>
	#ifdef DOUBLE_SIDED
		reflectedLight.indirectDiffuse += ( gl_FrontFacing ) ? vIndirectFront : vIndirectBack;
	#else
		reflectedLight.indirectDiffuse += vIndirectFront;
	#endif
	#include <lightmap_fragment>
	reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );
	#ifdef DOUBLE_SIDED
		reflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;
	#else
		reflectedLight.directDiffuse = vLightFront;
	#endif
	reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ff=`#define LAMBERT
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars_begin>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Bf=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <fog_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
		matcapColor = matcapTexelToLinear( matcapColor );
	#else
		vec4 matcapColor = vec4( 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zf=`#define MATCAP
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#ifndef FLAT_SHADED
		vNormal = normalize( transformedNormal );
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Of=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Uf=`#define TOON
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hf=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kf=`#define PHONG
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Gf=`#define STANDARD
#ifdef PHYSICAL
	#define REFLECTIVITY
	#define CLEARCOAT
	#define TRANSMISSION
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef TRANSMISSION
	uniform float transmission;
#endif
#ifdef REFLECTIVITY
	uniform float reflectivity;
#endif
#ifdef CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheen;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <transmissionmap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#ifdef TRANSMISSION
		float totalTransmission = transmission;
	#endif
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <transmissionmap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#ifdef TRANSMISSION
		diffuseColor.a *= mix( saturate( 1. - totalTransmission + linearToRelativeLuminance( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) ), 1.0, metalness );
	#endif
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Vf=`#define STANDARD
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Wf=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <packing>
#include <uv_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
}`,Xf=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	vViewPosition = - mvPosition.xyz;
#endif
}`,qf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Yf=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <color_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,jf=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,Zf=`#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <begin_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Jf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,Qf=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`;const Ge={alphamap_fragment:Ru,alphamap_pars_fragment:Pu,alphatest_fragment:Iu,aomap_fragment:Du,aomap_pars_fragment:Nu,begin_vertex:Fu,beginnormal_vertex:Bu,bsdfs:zu,bumpmap_pars_fragment:Ou,clipping_planes_fragment:Uu,clipping_planes_pars_fragment:Hu,clipping_planes_pars_vertex:ku,clipping_planes_vertex:Gu,color_fragment:Vu,color_pars_fragment:Wu,color_pars_vertex:Xu,color_vertex:qu,common:Yu,cube_uv_reflection_fragment:ju,defaultnormal_vertex:Zu,displacementmap_pars_vertex:Ju,displacementmap_vertex:Qu,emissivemap_fragment:Ku,emissivemap_pars_fragment:$u,encodings_fragment:ed,encodings_pars_fragment:td,envmap_fragment:nd,envmap_common_pars_fragment:id,envmap_pars_fragment:rd,envmap_pars_vertex:sd,envmap_physical_pars_fragment:gd,envmap_vertex:ad,fog_vertex:od,fog_pars_vertex:ld,fog_fragment:cd,fog_pars_fragment:hd,gradientmap_pars_fragment:ud,lightmap_fragment:dd,lightmap_pars_fragment:fd,lights_lambert_vertex:pd,lights_pars_begin:md,lights_toon_fragment:vd,lights_toon_pars_fragment:xd,lights_phong_fragment:_d,lights_phong_pars_fragment:yd,lights_physical_fragment:Md,lights_physical_pars_fragment:wd,lights_fragment_begin:bd,lights_fragment_maps:Sd,lights_fragment_end:Ed,logdepthbuf_fragment:Td,logdepthbuf_pars_fragment:Ad,logdepthbuf_pars_vertex:Ld,logdepthbuf_vertex:Cd,map_fragment:Rd,map_pars_fragment:Pd,map_particle_fragment:Id,map_particle_pars_fragment:Dd,metalnessmap_fragment:Nd,metalnessmap_pars_fragment:Fd,morphnormal_vertex:Bd,morphtarget_pars_vertex:zd,morphtarget_vertex:Od,normal_fragment_begin:Ud,normal_fragment_maps:Hd,normalmap_pars_fragment:kd,clearcoat_normal_fragment_begin:Gd,clearcoat_normal_fragment_maps:Vd,clearcoat_pars_fragment:Wd,packing:Xd,premultiplied_alpha_fragment:qd,project_vertex:Yd,dithering_fragment:jd,dithering_pars_fragment:Zd,roughnessmap_fragment:Jd,roughnessmap_pars_fragment:Qd,shadowmap_pars_fragment:Kd,shadowmap_pars_vertex:$d,shadowmap_vertex:ef,shadowmask_pars_fragment:tf,skinbase_vertex:nf,skinning_pars_vertex:rf,skinning_vertex:sf,skinnormal_vertex:af,specularmap_fragment:of,specularmap_pars_fragment:lf,tonemapping_fragment:cf,tonemapping_pars_fragment:hf,transmissionmap_fragment:uf,transmissionmap_pars_fragment:df,uv_pars_fragment:ff,uv_pars_vertex:pf,uv_vertex:mf,uv2_pars_fragment:gf,uv2_pars_vertex:vf,uv2_vertex:xf,worldpos_vertex:_f,background_frag:yf,background_vert:Mf,cube_frag:wf,cube_vert:bf,depth_frag:Sf,depth_vert:Ef,distanceRGBA_frag:Tf,distanceRGBA_vert:Af,equirect_frag:Lf,equirect_vert:Cf,linedashed_frag:Rf,linedashed_vert:Pf,meshbasic_frag:If,meshbasic_vert:Df,meshlambert_frag:Nf,meshlambert_vert:Ff,meshmatcap_frag:Bf,meshmatcap_vert:zf,meshtoon_frag:Of,meshtoon_vert:Uf,meshphong_frag:Hf,meshphong_vert:kf,meshphysical_frag:Gf,meshphysical_vert:Vf,normal_frag:Wf,normal_vert:Xf,points_frag:qf,points_vert:Yf,shadow_frag:jf,shadow_vert:Zf,sprite_frag:Jf,sprite_vert:Qf},de={common:{diffuse:{value:new Te(15658734)},opacity:{value:1},map:{value:null},uvTransform:{value:new wt},uv2Transform:{value:new wt},alphaMap:{value:null}},specularmap:{specularMap:{value:null}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},refractionRatio:{value:.98},maxMipLevel:{value:0}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1}},emissivemap:{emissiveMap:{value:null}},bumpmap:{bumpMap:{value:null},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalScale:{value:new se(1,1)}},displacementmap:{displacementMap:{value:null},displacementScale:{value:1},displacementBias:{value:0}},roughnessmap:{roughnessMap:{value:null}},metalnessmap:{metalnessMap:{value:null}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Te(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotShadowMap:{value:[]},spotShadowMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Te(15658734)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},uvTransform:{value:new wt}},sprite:{diffuse:{value:new Te(15658734)},opacity:{value:1},center:{value:new se(.5,.5)},rotation:{value:0},map:{value:null},alphaMap:{value:null},uvTransform:{value:new wt}}},an={basic:{uniforms:Et([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.fog]),vertexShader:Ge.meshbasic_vert,fragmentShader:Ge.meshbasic_frag},lambert:{uniforms:Et([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.fog,de.lights,{emissive:{value:new Te(0)}}]),vertexShader:Ge.meshlambert_vert,fragmentShader:Ge.meshlambert_frag},phong:{uniforms:Et([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new Te(0)},specular:{value:new Te(1118481)},shininess:{value:30}}]),vertexShader:Ge.meshphong_vert,fragmentShader:Ge.meshphong_frag},standard:{uniforms:Et([de.common,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.roughnessmap,de.metalnessmap,de.fog,de.lights,{emissive:{value:new Te(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag},toon:{uniforms:Et([de.common,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.gradientmap,de.fog,de.lights,{emissive:{value:new Te(0)}}]),vertexShader:Ge.meshtoon_vert,fragmentShader:Ge.meshtoon_frag},matcap:{uniforms:Et([de.common,de.bumpmap,de.normalmap,de.displacementmap,de.fog,{matcap:{value:null}}]),vertexShader:Ge.meshmatcap_vert,fragmentShader:Ge.meshmatcap_frag},points:{uniforms:Et([de.points,de.fog]),vertexShader:Ge.points_vert,fragmentShader:Ge.points_frag},dashed:{uniforms:Et([de.common,de.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ge.linedashed_vert,fragmentShader:Ge.linedashed_frag},depth:{uniforms:Et([de.common,de.displacementmap]),vertexShader:Ge.depth_vert,fragmentShader:Ge.depth_frag},normal:{uniforms:Et([de.common,de.bumpmap,de.normalmap,de.displacementmap,{opacity:{value:1}}]),vertexShader:Ge.normal_vert,fragmentShader:Ge.normal_frag},sprite:{uniforms:Et([de.sprite,de.fog]),vertexShader:Ge.sprite_vert,fragmentShader:Ge.sprite_frag},background:{uniforms:{uvTransform:{value:new wt},t2D:{value:null}},vertexShader:Ge.background_vert,fragmentShader:Ge.background_frag},cube:{uniforms:Et([de.envmap,{opacity:{value:1}}]),vertexShader:Ge.cube_vert,fragmentShader:Ge.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ge.equirect_vert,fragmentShader:Ge.equirect_frag},distanceRGBA:{uniforms:Et([de.common,de.displacementmap,{referencePosition:{value:new b},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ge.distanceRGBA_vert,fragmentShader:Ge.distanceRGBA_frag},shadow:{uniforms:Et([de.lights,de.fog,{color:{value:new Te(0)},opacity:{value:1}}]),vertexShader:Ge.shadow_vert,fragmentShader:Ge.shadow_frag}};an.physical={uniforms:Et([an.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatNormalScale:{value:new se(1,1)},clearcoatNormalMap:{value:null},sheen:{value:new Te(0)},transmission:{value:0},transmissionMap:{value:null}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag};function Kf(r,e,t,n,i){const s=new Te(0);let a=0,o,l,c=null,h=0,u=null;function d(m,v,x,g){let p=v.isScene===!0?v.background:null;p&&p.isTexture&&(p=e.get(p));const E=r.xr,T=E.getSession&&E.getSession();T&&T.environmentBlendMode==="additive"&&(p=null),p===null?f(s,a):p&&p.isColor&&(f(p,1),g=!0),(r.autoClear||g)&&r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil),p&&(p.isCubeTexture||p.mapping===la)?(l===void 0&&(l=new Mt(new fa(1,1,1),new Xn({name:"BackgroundCubeMaterial",uniforms:Si(an.cube.uniforms),vertexShader:an.cube.vertexShader,fragmentShader:an.cube.fragmentShader,side:ft,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(S,_,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=p,l.material.uniforms.flipEnvMap.value=p.isCubeTexture&&p._needsFlipEnvMap?-1:1,(c!==p||h!==p.version||u!==r.toneMapping)&&(l.material.needsUpdate=!0,c=p,h=p.version,u=r.toneMapping),m.unshift(l,l.geometry,l.material,0,0,null)):p&&p.isTexture&&(o===void 0&&(o=new Mt(new Cu(2,2),new Xn({name:"BackgroundMaterial",uniforms:Si(an.background.uniforms),vertexShader:an.background.vertexShader,fragmentShader:an.background.fragmentShader,side:Kr,depthTest:!1,depthWrite:!1,fog:!1})),o.geometry.deleteAttribute("normal"),Object.defineProperty(o.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(o)),o.material.uniforms.t2D.value=p,p.matrixAutoUpdate===!0&&p.updateMatrix(),o.material.uniforms.uvTransform.value.copy(p.matrix),(c!==p||h!==p.version||u!==r.toneMapping)&&(o.material.needsUpdate=!0,c=p,h=p.version,u=r.toneMapping),m.unshift(o,o.geometry,o.material,0,0,null))}function f(m,v){t.buffers.color.setClear(m.r,m.g,m.b,v,i)}return{getClearColor:function(){return s},setClearColor:function(m,v=1){s.set(m),a=v,f(s,a)},getClearAlpha:function(){return a},setClearAlpha:function(m){a=m,f(s,a)},render:d}}function $f(r,e,t,n){const i=r.getParameter(34921),s=n.isWebGL2?null:e.get("OES_vertex_array_object"),a=n.isWebGL2||s!==null,o={},l=v(null);let c=l;function h(C,I,R,A,X){let ee=!1;if(a){const Z=m(A,R,I);c!==Z&&(c=Z,d(c.object)),ee=x(A,X),ee&&g(A,X)}else{const Z=I.wireframe===!0;(c.geometry!==A.id||c.program!==R.id||c.wireframe!==Z)&&(c.geometry=A.id,c.program=R.id,c.wireframe=Z,ee=!0)}C.isInstancedMesh===!0&&(ee=!0),X!==null&&t.update(X,34963),ee&&(P(C,I,R,A),X!==null&&r.bindBuffer(34963,t.get(X).buffer))}function u(){return n.isWebGL2?r.createVertexArray():s.createVertexArrayOES()}function d(C){return n.isWebGL2?r.bindVertexArray(C):s.bindVertexArrayOES(C)}function f(C){return n.isWebGL2?r.deleteVertexArray(C):s.deleteVertexArrayOES(C)}function m(C,I,R){const A=R.wireframe===!0;let X=o[C.id];X===void 0&&(X={},o[C.id]=X);let ee=X[I.id];ee===void 0&&(ee={},X[I.id]=ee);let Z=ee[A];return Z===void 0&&(Z=v(u()),ee[A]=Z),Z}function v(C){const I=[],R=[],A=[];for(let X=0;X<i;X++)I[X]=0,R[X]=0,A[X]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:R,attributeDivisors:A,object:C,attributes:{},index:null}}function x(C,I){const R=c.attributes,A=C.attributes;let X=0;for(const ee in A){const Z=R[ee],ae=A[ee];if(Z===void 0||Z.attribute!==ae||Z.data!==ae.data)return!0;X++}return c.attributesNum!==X||c.index!==I}function g(C,I){const R={},A=C.attributes;let X=0;for(const ee in A){const Z=A[ee],ae={};ae.attribute=Z,Z.data&&(ae.data=Z.data),R[ee]=ae,X++}c.attributes=R,c.attributesNum=X,c.index=I}function p(){const C=c.newAttributes;for(let I=0,R=C.length;I<R;I++)C[I]=0}function E(C){T(C,0)}function T(C,I){const R=c.newAttributes,A=c.enabledAttributes,X=c.attributeDivisors;R[C]=1,A[C]===0&&(r.enableVertexAttribArray(C),A[C]=1),X[C]!==I&&((n.isWebGL2?r:e.get("ANGLE_instanced_arrays"))[n.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](C,I),X[C]=I)}function S(){const C=c.newAttributes,I=c.enabledAttributes;for(let R=0,A=I.length;R<A;R++)I[R]!==C[R]&&(r.disableVertexAttribArray(R),I[R]=0)}function _(C,I,R,A,X,ee){n.isWebGL2===!0&&(R===5124||R===5125)?r.vertexAttribIPointer(C,I,R,X,ee):r.vertexAttribPointer(C,I,R,A,X,ee)}function P(C,I,R,A){if(n.isWebGL2===!1&&(C.isInstancedMesh||A.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;p();const X=A.attributes,ee=R.getAttributes(),Z=I.defaultAttributeValues;for(const ae in ee){const te=ee[ae];if(te>=0){const pe=X[ae];if(pe!==void 0){const xe=pe.normalized,H=pe.itemSize,Oe=t.get(pe);if(Oe===void 0)continue;const Fe=Oe.buffer,we=Oe.type,ye=Oe.bytesPerElement;if(pe.isInterleavedBufferAttribute){const Ae=pe.data,ge=Ae.stride,_e=pe.offset;Ae&&Ae.isInstancedInterleavedBuffer?(T(te,Ae.meshPerAttribute),A._maxInstanceCount===void 0&&(A._maxInstanceCount=Ae.meshPerAttribute*Ae.count)):E(te),r.bindBuffer(34962,Fe),_(te,H,we,xe,ge*ye,_e*ye)}else pe.isInstancedBufferAttribute?(T(te,pe.meshPerAttribute),A._maxInstanceCount===void 0&&(A._maxInstanceCount=pe.meshPerAttribute*pe.count)):E(te),r.bindBuffer(34962,Fe),_(te,H,we,xe,0,0)}else if(ae==="instanceMatrix"){const xe=t.get(C.instanceMatrix);if(xe===void 0)continue;const H=xe.buffer,Oe=xe.type;T(te+0,1),T(te+1,1),T(te+2,1),T(te+3,1),r.bindBuffer(34962,H),r.vertexAttribPointer(te+0,4,Oe,!1,64,0),r.vertexAttribPointer(te+1,4,Oe,!1,64,16),r.vertexAttribPointer(te+2,4,Oe,!1,64,32),r.vertexAttribPointer(te+3,4,Oe,!1,64,48)}else if(ae==="instanceColor"){const xe=t.get(C.instanceColor);if(xe===void 0)continue;const H=xe.buffer,Oe=xe.type;T(te,1),r.bindBuffer(34962,H),r.vertexAttribPointer(te,3,Oe,!1,12,0)}else if(Z!==void 0){const xe=Z[ae];if(xe!==void 0)switch(xe.length){case 2:r.vertexAttrib2fv(te,xe);break;case 3:r.vertexAttrib3fv(te,xe);break;case 4:r.vertexAttrib4fv(te,xe);break;default:r.vertexAttrib1fv(te,xe)}}}}S()}function N(){J();for(const C in o){const I=o[C];for(const R in I){const A=I[R];for(const X in A)f(A[X].object),delete A[X];delete I[R]}delete o[C]}}function z(C){if(o[C.id]===void 0)return;const I=o[C.id];for(const R in I){const A=I[R];for(const X in A)f(A[X].object),delete A[X];delete I[R]}delete o[C.id]}function V(C){for(const I in o){const R=o[I];if(R[C.id]===void 0)continue;const A=R[C.id];for(const X in A)f(A[X].object),delete A[X];delete R[C.id]}}function J(){O(),c!==l&&(c=l,d(c.object))}function O(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:h,reset:J,resetDefaultState:O,dispose:N,releaseStatesOfGeometry:z,releaseStatesOfProgram:V,initAttributes:p,enableAttribute:E,disableUnusedAttributes:S}}function ep(r,e,t,n){const i=n.isWebGL2;let s;function a(c){s=c}function o(c,h){r.drawArrays(s,c,h),t.update(h,s,1)}function l(c,h,u){if(u===0)return;let d,f;if(i)d=r,f="drawArraysInstanced";else if(d=e.get("ANGLE_instanced_arrays"),f="drawArraysInstancedANGLE",d===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}d[f](s,c,h,u),t.update(h,s,u)}this.setMode=a,this.render=o,this.renderInstances=l}function tp(r,e,t){let n;function i(){if(n!==void 0)return n;if(e.has("EXT_texture_filter_anisotropic")===!0){const _=e.get("EXT_texture_filter_anisotropic");n=r.getParameter(_.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function s(_){if(_==="highp"){if(r.getShaderPrecisionFormat(35633,36338).precision>0&&r.getShaderPrecisionFormat(35632,36338).precision>0)return"highp";_="mediump"}return _==="mediump"&&r.getShaderPrecisionFormat(35633,36337).precision>0&&r.getShaderPrecisionFormat(35632,36337).precision>0?"mediump":"lowp"}const a=typeof WebGL2RenderingContext<"u"&&r instanceof WebGL2RenderingContext||typeof WebGL2ComputeRenderingContext<"u"&&r instanceof WebGL2ComputeRenderingContext;let o=t.precision!==void 0?t.precision:"highp";const l=s(o);l!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",l,"instead."),o=l);const c=t.logarithmicDepthBuffer===!0,h=r.getParameter(34930),u=r.getParameter(35660),d=r.getParameter(3379),f=r.getParameter(34076),m=r.getParameter(34921),v=r.getParameter(36347),x=r.getParameter(36348),g=r.getParameter(36349),p=u>0,E=a||e.has("OES_texture_float"),T=p&&E,S=a?r.getParameter(36183):0;return{isWebGL2:a,getMaxAnisotropy:i,getMaxPrecision:s,precision:o,logarithmicDepthBuffer:c,maxTextures:h,maxVertexTextures:u,maxTextureSize:d,maxCubemapSize:f,maxAttributes:m,maxVertexUniforms:v,maxVaryings:x,maxFragmentUniforms:g,vertexTextures:p,floatFragmentTextures:E,floatVertexTextures:T,maxSamples:S}}function np(r){const e=this;let t=null,n=0,i=!1,s=!1;const a=new sn,o=new wt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d,f){const m=u.length!==0||d||n!==0||i;return i=d,t=h(u,f,0),n=u.length,m},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1,c()},this.setState=function(u,d,f){const m=u.clippingPlanes,v=u.clipIntersection,x=u.clipShadows,g=r.get(u);if(!i||m===null||m.length===0||s&&!x)s?h(null):c();else{const p=s?0:n,E=p*4;let T=g.clippingState||null;l.value=T,T=h(m,d,E,f);for(let S=0;S!==E;++S)T[S]=t[S];g.clippingState=T,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=p}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,m){const v=u!==null?u.length:0;let x=null;if(v!==0){if(x=l.value,m!==!0||x===null){const g=f+v*4,p=d.matrixWorldInverse;o.getNormalMatrix(p),(x===null||x.length<g)&&(x=new Float32Array(g));for(let E=0,T=f;E!==v;++E,T+=4)a.copy(u[E]).applyMatrix4(p,o),a.normal.toArray(x,T),x[T+3]=a.constant}l.value=x,l.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,x}}function ip(r){let e=new WeakMap;function t(a,o){return o===Oa?a.mapping=aa:o===Ua&&(a.mapping=oa),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===Oa||o===Ua)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=r.getRenderTarget(),h=new gl(l.height/2);return h.fromEquirectangularTexture(r,a),e.set(a,h),r.setRenderTarget(c),a.addEventListener("dispose",i),t(h.texture,a.mapping)}else return null}}return a}function i(a){const o=a.target;o.removeEventListener("dispose",i);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}function rp(r){const e={};function t(n){if(e[n]!==void 0)return e[n];let i;switch(n){case"WEBGL_depth_texture":i=r.getExtension("WEBGL_depth_texture")||r.getExtension("MOZ_WEBGL_depth_texture")||r.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=r.getExtension("EXT_texture_filter_anisotropic")||r.getExtension("MOZ_EXT_texture_filter_anisotropic")||r.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=r.getExtension("WEBGL_compressed_texture_s3tc")||r.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=r.getExtension("WEBGL_compressed_texture_pvrtc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=r.getExtension(n)}return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(n){n.isWebGL2?t("EXT_color_buffer_float"):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float")},get:function(n){const i=t(n);return i===null&&console.warn("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function sp(r,e,t,n){const i={},s=new WeakMap;function a(u){const d=u.target;d.index!==null&&e.remove(d.index);for(const m in d.attributes)e.remove(d.attributes[m]);d.removeEventListener("dispose",a),delete i[d.id];const f=s.get(d);f&&(e.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(u,d){return i[d.id]===!0||(d.addEventListener("dispose",a),i[d.id]=!0,t.memory.geometries++),d}function l(u){const d=u.attributes;for(const m in d)e.update(d[m],34962);const f=u.morphAttributes;for(const m in f){const v=f[m];for(let x=0,g=v.length;x<g;x++)e.update(v[x],34962)}}function c(u){const d=[],f=u.index,m=u.attributes.position;let v=0;if(f!==null){const p=f.array;v=f.version;for(let E=0,T=p.length;E<T;E+=3){const S=p[E+0],_=p[E+1],P=p[E+2];d.push(S,_,_,P,P,S)}}else{const p=m.array;v=m.version;for(let E=0,T=p.length/3-1;E<T;E+=3){const S=E+0,_=E+1,P=E+2;d.push(S,_,_,P,P,S)}}const x=new(ml(d)>65535?pl:fl)(d,1);x.version=v;const g=s.get(u);g&&e.remove(g),s.set(u,x)}function h(u){const d=s.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return s.get(u)}return{get:o,update:l,getWireframeAttribute:h}}function ap(r,e,t,n){const i=n.isWebGL2;let s;function a(d){s=d}let o,l;function c(d){o=d.type,l=d.bytesPerElement}function h(d,f){r.drawElements(s,f,o,d*l),t.update(f,s,1)}function u(d,f,m){if(m===0)return;let v,x;if(i)v=r,x="drawElementsInstanced";else if(v=e.get("ANGLE_instanced_arrays"),x="drawElementsInstancedANGLE",v===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}v[x](s,f,o,d*l,m),t.update(f,s,m)}this.setMode=a,this.setIndex=c,this.render=h,this.renderInstances=u}function op(r){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case 4:t.triangles+=o*(s/3);break;case 1:t.lines+=o*(s/2);break;case 3:t.lines+=o*(s-1);break;case 2:t.lines+=o*s;break;case 0:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function i(){t.frame++,t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function lp(r,e){return r[0]-e[0]}function cp(r,e){return Math.abs(e[1])-Math.abs(r[1])}function hp(r){const e={},t=new Float32Array(8),n=[];for(let s=0;s<8;s++)n[s]=[s,0];function i(s,a,o,l){const c=s.morphTargetInfluences,h=c===void 0?0:c.length;let u=e[a.id];if(u===void 0){u=[];for(let x=0;x<h;x++)u[x]=[x,0];e[a.id]=u}for(let x=0;x<h;x++){const g=u[x];g[0]=x,g[1]=c[x]}u.sort(cp);for(let x=0;x<8;x++)x<h&&u[x][1]?(n[x][0]=u[x][0],n[x][1]=u[x][1]):(n[x][0]=Number.MAX_SAFE_INTEGER,n[x][1]=0);n.sort(lp);const d=o.morphTargets&&a.morphAttributes.position,f=o.morphNormals&&a.morphAttributes.normal;let m=0;for(let x=0;x<8;x++){const g=n[x],p=g[0],E=g[1];p!==Number.MAX_SAFE_INTEGER&&E?(d&&a.getAttribute("morphTarget"+x)!==d[p]&&a.setAttribute("morphTarget"+x,d[p]),f&&a.getAttribute("morphNormal"+x)!==f[p]&&a.setAttribute("morphNormal"+x,f[p]),t[x]=E,m+=E):(d&&a.hasAttribute("morphTarget"+x)===!0&&a.deleteAttribute("morphTarget"+x),f&&a.hasAttribute("morphNormal"+x)===!0&&a.deleteAttribute("morphNormal"+x),t[x]=0)}const v=a.morphTargetsRelative?1:1-m;l.getUniforms().setValue(r,"morphTargetBaseInfluence",v),l.getUniforms().setValue(r,"morphTargetInfluences",t)}return{update:i}}function up(r,e,t,n){let i=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,u=e.get(l,h);return i.get(u)!==c&&(e.update(u),i.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),t.update(l.instanceMatrix,34962),l.instanceColor!==null&&t.update(l.instanceColor,34962)),u}function a(){i=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:a}}class _l extends bt{constructor(e=null,t=1,n=1,i=1){super(null),this.image={data:e,width:t,height:n,depth:i},this.magFilter=Rt,this.minFilter=Rt,this.wrapR=Kt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.needsUpdate=!0}}_l.prototype.isDataTexture2DArray=!0;class yl extends bt{constructor(e=null,t=1,n=1,i=1){super(null),this.image={data:e,width:t,height:n,depth:i},this.magFilter=Rt,this.minFilter=Rt,this.wrapR=Kt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.needsUpdate=!0}}yl.prototype.isDataTexture3D=!0;const Ml=new bt,dp=new _l,fp=new yl,wl=new es,uo=[],fo=[],po=new Float32Array(16),mo=new Float32Array(9),go=new Float32Array(4);function Ri(r,e,t){const n=r[0];if(n<=0||n>0)return r;const i=e*t;let s=uo[i];if(s===void 0&&(s=new Float32Array(i),uo[i]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,r[a].toArray(s,o)}return s}function It(r,e){if(r.length!==e.length)return!1;for(let t=0,n=r.length;t<n;t++)if(r[t]!==e[t])return!1;return!0}function At(r,e){for(let t=0,n=e.length;t<n;t++)r[t]=e[t]}function bl(r,e){let t=fo[e];t===void 0&&(t=new Int32Array(e),fo[e]=t);for(let n=0;n!==e;++n)t[n]=r.allocateTextureUnit();return t}function pp(r,e){const t=this.cache;t[0]!==e&&(r.uniform1f(this.addr,e),t[0]=e)}function mp(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(It(t,e))return;r.uniform2fv(this.addr,e),At(t,e)}}function gp(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(r.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(It(t,e))return;r.uniform3fv(this.addr,e),At(t,e)}}function vp(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(It(t,e))return;r.uniform4fv(this.addr,e),At(t,e)}}function xp(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(It(t,e))return;r.uniformMatrix2fv(this.addr,!1,e),At(t,e)}else{if(It(t,n))return;go.set(n),r.uniformMatrix2fv(this.addr,!1,go),At(t,n)}}function _p(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(It(t,e))return;r.uniformMatrix3fv(this.addr,!1,e),At(t,e)}else{if(It(t,n))return;mo.set(n),r.uniformMatrix3fv(this.addr,!1,mo),At(t,n)}}function yp(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(It(t,e))return;r.uniformMatrix4fv(this.addr,!1,e),At(t,e)}else{if(It(t,n))return;po.set(n),r.uniformMatrix4fv(this.addr,!1,po),At(t,n)}}function Mp(r,e){const t=this.cache;t[0]!==e&&(r.uniform1i(this.addr,e),t[0]=e)}function wp(r,e){const t=this.cache;It(t,e)||(r.uniform2iv(this.addr,e),At(t,e))}function bp(r,e){const t=this.cache;It(t,e)||(r.uniform3iv(this.addr,e),At(t,e))}function Sp(r,e){const t=this.cache;It(t,e)||(r.uniform4iv(this.addr,e),At(t,e))}function Ep(r,e){const t=this.cache;t[0]!==e&&(r.uniform1ui(this.addr,e),t[0]=e)}function Tp(r,e){const t=this.cache;It(t,e)||(r.uniform2uiv(this.addr,e),At(t,e))}function Ap(r,e){const t=this.cache;It(t,e)||(r.uniform3uiv(this.addr,e),At(t,e))}function Lp(r,e){const t=this.cache;It(t,e)||(r.uniform4uiv(this.addr,e),At(t,e))}function Cp(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.safeSetTexture2D(e||Ml,i)}function Rp(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||fp,i)}function Pp(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.safeSetTextureCube(e||wl,i)}function Ip(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||dp,i)}function Dp(r){switch(r){case 5126:return pp;case 35664:return mp;case 35665:return gp;case 35666:return vp;case 35674:return xp;case 35675:return _p;case 35676:return yp;case 5124:case 35670:return Mp;case 35667:case 35671:return wp;case 35668:case 35672:return bp;case 35669:case 35673:return Sp;case 5125:return Ep;case 36294:return Tp;case 36295:return Ap;case 36296:return Lp;case 35678:case 36198:case 36298:case 36306:case 35682:return Cp;case 35679:case 36299:case 36307:return Rp;case 35680:case 36300:case 36308:case 36293:return Pp;case 36289:case 36303:case 36311:case 36292:return Ip}}function Np(r,e){r.uniform1fv(this.addr,e)}function Fp(r,e){const t=Ri(e,this.size,2);r.uniform2fv(this.addr,t)}function Bp(r,e){const t=Ri(e,this.size,3);r.uniform3fv(this.addr,t)}function zp(r,e){const t=Ri(e,this.size,4);r.uniform4fv(this.addr,t)}function Op(r,e){const t=Ri(e,this.size,4);r.uniformMatrix2fv(this.addr,!1,t)}function Up(r,e){const t=Ri(e,this.size,9);r.uniformMatrix3fv(this.addr,!1,t)}function Hp(r,e){const t=Ri(e,this.size,16);r.uniformMatrix4fv(this.addr,!1,t)}function kp(r,e){r.uniform1iv(this.addr,e)}function Gp(r,e){r.uniform2iv(this.addr,e)}function Vp(r,e){r.uniform3iv(this.addr,e)}function Wp(r,e){r.uniform4iv(this.addr,e)}function Xp(r,e){r.uniform1uiv(this.addr,e)}function qp(r,e){r.uniform2uiv(this.addr,e)}function Yp(r,e){r.uniform3uiv(this.addr,e)}function jp(r,e){r.uniform4uiv(this.addr,e)}function Zp(r,e,t){const n=e.length,i=bl(t,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)t.safeSetTexture2D(e[s]||Ml,i[s])}function Jp(r,e,t){const n=e.length,i=bl(t,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)t.safeSetTextureCube(e[s]||wl,i[s])}function Qp(r){switch(r){case 5126:return Np;case 35664:return Fp;case 35665:return Bp;case 35666:return zp;case 35674:return Op;case 35675:return Up;case 35676:return Hp;case 5124:case 35670:return kp;case 35667:case 35671:return Gp;case 35668:case 35672:return Vp;case 35669:case 35673:return Wp;case 5125:return Xp;case 36294:return qp;case 36295:return Yp;case 36296:return jp;case 35678:case 36198:case 36298:case 36306:case 35682:return Zp;case 35680:case 36300:case 36308:case 36293:return Jp}}function Kp(r,e,t){this.id=r,this.addr=t,this.cache=[],this.setValue=Dp(e.type)}function Sl(r,e,t){this.id=r,this.addr=t,this.cache=[],this.size=e.size,this.setValue=Qp(e.type)}Sl.prototype.updateCache=function(r){const e=this.cache;r instanceof Float32Array&&e.length!==r.length&&(this.cache=new Float32Array(r.length)),At(e,r)};function El(r){this.id=r,this.seq=[],this.map={}}El.prototype.setValue=function(r,e,t){const n=this.seq;for(let i=0,s=n.length;i!==s;++i){const a=n[i];a.setValue(r,e[a.id],t)}};const Ns=/(\w+)(\])?(\[|\.)?/g;function vo(r,e){r.seq.push(e),r.map[e.id]=e}function $p(r,e,t){const n=r.name,i=n.length;for(Ns.lastIndex=0;;){const s=Ns.exec(n),a=Ns.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===i){vo(t,c===void 0?new Kp(o,r,e):new Sl(o,r,e));break}else{let u=t.map[o];u===void 0&&(u=new El(o),vo(t,u)),t=u}}}function Pn(r,e){this.seq=[],this.map={};const t=r.getProgramParameter(e,35718);for(let n=0;n<t;++n){const i=r.getActiveUniform(e,n),s=r.getUniformLocation(e,i.name);$p(i,s,this)}}Pn.prototype.setValue=function(r,e,t,n){const i=this.map[e];i!==void 0&&i.setValue(r,t,n)};Pn.prototype.setOptional=function(r,e,t){const n=e[t];n!==void 0&&this.setValue(r,t,n)};Pn.upload=function(r,e,t,n){for(let i=0,s=e.length;i!==s;++i){const a=e[i],o=t[a.id];o.needsUpdate!==!1&&a.setValue(r,o.value,n)}};Pn.seqWithValue=function(r,e){const t=[];for(let n=0,i=r.length;n!==i;++n){const s=r[n];s.id in e&&t.push(s)}return t};function xo(r,e,t){const n=r.createShader(e);return r.shaderSource(n,t),r.compileShader(n),n}let em=0;function tm(r){const e=r.split(`
`);for(let t=0;t<e.length;t++)e[t]=t+1+": "+e[t];return e.join(`
`)}function Tl(r){switch(r){case lr:return["Linear","( value )"];case hl:return["sRGB","( value )"];case Kh:return["RGBE","( value )"];case eu:return["RGBM","( value, 7.0 )"];case tu:return["RGBM","( value, 16.0 )"];case nu:return["RGBD","( value, 256.0 )"];case Qh:return["Gamma","( value, float( GAMMA_FACTOR ) )"];case $h:return["LogLuv","( value )"];default:return console.warn("THREE.WebGLProgram: Unsupported encoding:",r),["Linear","( value )"]}}function _o(r,e,t){const n=r.getShaderParameter(e,35713),i=r.getShaderInfoLog(e).trim();if(n&&i==="")return"";const s=r.getShaderSource(e);return"THREE.WebGLShader: gl.getShaderInfoLog() "+t+`
`+i+tm(s)}function Ui(r,e){const t=Tl(e);return"vec4 "+r+"( vec4 value ) { return "+t[0]+"ToLinear"+t[1]+"; }"}function nm(r,e){const t=Tl(e);return"vec4 "+r+"( vec4 value ) { return LinearTo"+t[0]+t[1]+"; }"}function im(r,e){let t;switch(e){case Jc:t="Linear";break;case Qc:t="Reinhard";break;case Kc:t="OptimizedCineon";break;case $c:t="ACESFilmic";break;case eh:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+r+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function rm(r){return[r.extensionDerivatives||r.envMapCubeUV||r.bumpMap||r.tangentSpaceNormalMap||r.clearcoatNormalMap||r.flatShading||r.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(r.extensionFragDepth||r.logarithmicDepthBuffer)&&r.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",r.extensionDrawBuffers&&r.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(r.extensionShaderTextureLOD||r.envMap)&&r.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(qi).join(`
`)}function sm(r){const e=[];for(const t in r){const n=r[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function am(r,e){const t={},n=r.getProgramParameter(e,35721);for(let i=0;i<n;i++){const a=r.getActiveAttrib(e,i).name;t[a]=r.getAttribLocation(e,a)}return t}function qi(r){return r!==""}function yo(r,e){return r.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Mo(r,e){return r.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const om=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ks(r){return r.replace(om,lm)}function lm(r,e){const t=Ge[e];if(t===void 0)throw new Error("Can not resolve #include <"+e+">");return Ks(t)}const cm=/#pragma unroll_loop[\s]+?for \( int i \= (\d+)\; i < (\d+)\; i \+\+ \) \{([\s\S]+?)(?=\})\}/g,hm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function wo(r){return r.replace(hm,Al).replace(cm,um)}function um(r,e,t,n){return console.warn("WebGLProgram: #pragma unroll_loop shader syntax is deprecated. Please use #pragma unroll_loop_start syntax instead."),Al(r,e,t,n)}function Al(r,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function bo(r){let e="precision "+r.precision+` float;
precision `+r.precision+" int;";return r.precision==="highp"?e+=`
#define HIGH_PRECISION`:r.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:r.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function dm(r){let e="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===rl?e="SHADOWMAP_TYPE_PCF":r.shadowMapType===Lc?e="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===Xi&&(e="SHADOWMAP_TYPE_VSM"),e}function fm(r){let e="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case aa:case oa:e="ENVMAP_TYPE_CUBE";break;case la:case ca:e="ENVMAP_TYPE_CUBE_UV";break}return e}function pm(r){let e="ENVMAP_MODE_REFLECTION";if(r.envMap)switch(r.envMapMode){case oa:case ca:e="ENVMAP_MODE_REFRACTION";break}return e}function mm(r){let e="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case $r:e="ENVMAP_BLENDING_MULTIPLY";break;case jc:e="ENVMAP_BLENDING_MIX";break;case Zc:e="ENVMAP_BLENDING_ADD";break}return e}function gm(r,e,t,n){const i=r.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=dm(t),c=fm(t),h=pm(t),u=mm(t),d=r.gammaFactor>0?r.gammaFactor:1,f=t.isWebGL2?"":rm(t),m=sm(s),v=i.createProgram();let x,g,p=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(x=[m].filter(qi).join(`
`),x.length>0&&(x+=`
`),g=[f,m].filter(qi).join(`
`),g.length>0&&(g+=`
`)):(x=[bo(t),"#define SHADER_NAME "+t.shaderName,m,t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.supportsVertexTextures?"#define VERTEX_TEXTURES":"","#define GAMMA_FACTOR "+d,"#define MAX_BONES "+t.maxBones,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMap&&t.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",t.normalMap&&t.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.displacementMap&&t.supportsVertexTextures?"#define USE_DISPLACEMENTMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.vertexTangents?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUvs?"#define USE_UV":"",t.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.useVertexTexture?"#define BONE_TEXTURE":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_MORPHTARGETS","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qi).join(`
`),g=[f,bo(t),"#define SHADER_NAME "+t.shaderName,m,t.alphaTest?"#define ALPHATEST "+t.alphaTest+(t.alphaTest%1?"":".0"):"","#define GAMMA_FACTOR "+d,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMap&&t.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",t.normalMap&&t.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.sheen?"#define USE_SHEEN":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.vertexTangents?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUvs?"#define USE_UV":"",t.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.physicallyCorrectLights?"#define PHYSICALLY_CORRECT_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"",(t.extensionShaderTextureLOD||t.envMap)&&t.rendererExtensionShaderTextureLod?"#define TEXTURE_LOD_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Ji?"#define TONE_MAPPING":"",t.toneMapping!==Ji?Ge.tonemapping_pars_fragment:"",t.toneMapping!==Ji?im("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",Ge.encodings_pars_fragment,t.map?Ui("mapTexelToLinear",t.mapEncoding):"",t.matcap?Ui("matcapTexelToLinear",t.matcapEncoding):"",t.envMap?Ui("envMapTexelToLinear",t.envMapEncoding):"",t.emissiveMap?Ui("emissiveMapTexelToLinear",t.emissiveMapEncoding):"",t.lightMap?Ui("lightMapTexelToLinear",t.lightMapEncoding):"",nm("linearToOutputTexel",t.outputEncoding),t.depthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(qi).join(`
`)),a=Ks(a),a=yo(a,t),a=Mo(a,t),o=Ks(o),o=yo(o,t),o=Mo(o,t),a=wo(a),o=wo(o),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(p=`#version 300 es
`,x=["#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+x,g=["#define varying in",t.glslVersion===Ka?"":"out highp vec4 pc_fragColor;",t.glslVersion===Ka?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);const E=p+x+a,T=p+g+o,S=xo(i,35633,E),_=xo(i,35632,T);if(i.attachShader(v,S),i.attachShader(v,_),t.index0AttributeName!==void 0?i.bindAttribLocation(v,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(v,0,"position"),i.linkProgram(v),r.debug.checkShaderErrors){const z=i.getProgramInfoLog(v).trim(),V=i.getShaderInfoLog(S).trim(),J=i.getShaderInfoLog(_).trim();let O=!0,C=!0;if(i.getProgramParameter(v,35714)===!1){O=!1;const I=_o(i,S,"vertex"),R=_o(i,_,"fragment");console.error("THREE.WebGLProgram: shader error: ",i.getError(),"35715",i.getProgramParameter(v,35715),"gl.getProgramInfoLog",z,I,R)}else z!==""?console.warn("THREE.WebGLProgram: gl.getProgramInfoLog()",z):(V===""||J==="")&&(C=!1);C&&(this.diagnostics={runnable:O,programLog:z,vertexShader:{log:V,prefix:x},fragmentShader:{log:J,prefix:g}})}i.deleteShader(S),i.deleteShader(_);let P;this.getUniforms=function(){return P===void 0&&(P=new Pn(i,v)),P};let N;return this.getAttributes=function(){return N===void 0&&(N=am(i,v)),N},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(v),this.program=void 0},this.name=t.shaderName,this.id=em++,this.cacheKey=e,this.usedTimes=1,this.program=v,this.vertexShader=S,this.fragmentShader=_,this}function vm(r,e,t,n,i,s){const a=[],o=n.isWebGL2,l=n.logarithmicDepthBuffer,c=n.floatVertexTextures,h=n.maxVertexUniforms,u=n.vertexTextures;let d=n.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"},m=["precision","isWebGL2","supportsVertexTextures","outputEncoding","instancing","instancingColor","map","mapEncoding","matcap","matcapEncoding","envMap","envMapMode","envMapEncoding","envMapCubeUV","lightMap","lightMapEncoding","aoMap","emissiveMap","emissiveMapEncoding","bumpMap","normalMap","objectSpaceNormalMap","tangentSpaceNormalMap","clearcoatMap","clearcoatRoughnessMap","clearcoatNormalMap","displacementMap","specularMap","roughnessMap","metalnessMap","gradientMap","alphaMap","combine","vertexColors","vertexAlphas","vertexTangents","vertexUvs","uvsVertexOnly","fog","useFog","fogExp2","flatShading","sizeAttenuation","logarithmicDepthBuffer","skinning","maxBones","useVertexTexture","morphTargets","morphNormals","premultipliedAlpha","numDirLights","numPointLights","numSpotLights","numHemiLights","numRectAreaLights","numDirLightShadows","numPointLightShadows","numSpotLightShadows","shadowMapEnabled","shadowMapType","toneMapping","physicallyCorrectLights","alphaTest","doubleSided","flipSided","numClippingPlanes","numClipIntersection","depthPacking","dithering","sheen","transmissionMap"];function v(_){const N=_.skeleton.bones;if(c)return 1024;{const V=Math.floor((h-20)/4),J=Math.min(V,N.length);return J<N.length?(console.warn("THREE.WebGLRenderer: Skeleton has "+N.length+" bones. This GPU supports "+J+"."),0):J}}function x(_){let P;return _&&_.isTexture?P=_.encoding:_&&_.isWebGLRenderTarget?(console.warn("THREE.WebGLPrograms.getTextureEncodingFromMap: don't use render targets as textures. Use their .texture property instead."),P=_.texture.encoding):P=lr,P}function g(_,P,N,z,V){const J=z.fog,O=_.isMeshStandardMaterial?z.environment:null,C=e.get(_.envMap||O),I=f[_.type],R=V.isSkinnedMesh?v(V):0;_.precision!==null&&(d=n.getMaxPrecision(_.precision),d!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",d,"instead."));let A,X;if(I){const ae=an[I];A=ae.vertexShader,X=ae.fragmentShader}else A=_.vertexShader,X=_.fragmentShader;const ee=r.getRenderTarget();return{isWebGL2:o,shaderID:I,shaderName:_.type,vertexShader:A,fragmentShader:X,defines:_.defines,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:d,instancing:V.isInstancedMesh===!0,instancingColor:V.isInstancedMesh===!0&&V.instanceColor!==null,supportsVertexTextures:u,outputEncoding:ee!==null?x(ee.texture):r.outputEncoding,map:!!_.map,mapEncoding:x(_.map),matcap:!!_.matcap,matcapEncoding:x(_.matcap),envMap:!!C,envMapMode:C&&C.mapping,envMapEncoding:x(C),envMapCubeUV:!!C&&(C.mapping===la||C.mapping===ca),lightMap:!!_.lightMap,lightMapEncoding:x(_.lightMap),aoMap:!!_.aoMap,emissiveMap:!!_.emissiveMap,emissiveMapEncoding:x(_.emissiveMap),bumpMap:!!_.bumpMap,normalMap:!!_.normalMap,objectSpaceNormalMap:_.normalMapType===su,tangentSpaceNormalMap:_.normalMapType===Ti,clearcoatMap:!!_.clearcoatMap,clearcoatRoughnessMap:!!_.clearcoatRoughnessMap,clearcoatNormalMap:!!_.clearcoatNormalMap,displacementMap:!!_.displacementMap,roughnessMap:!!_.roughnessMap,metalnessMap:!!_.metalnessMap,specularMap:!!_.specularMap,alphaMap:!!_.alphaMap,gradientMap:!!_.gradientMap,sheen:!!_.sheen,transmissionMap:!!_.transmissionMap,combine:_.combine,vertexTangents:_.normalMap&&_.vertexTangents,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&V.geometry&&V.geometry.attributes.color&&V.geometry.attributes.color.itemSize===4,vertexUvs:!!_.map||!!_.bumpMap||!!_.normalMap||!!_.specularMap||!!_.alphaMap||!!_.emissiveMap||!!_.roughnessMap||!!_.metalnessMap||!!_.clearcoatMap||!!_.clearcoatRoughnessMap||!!_.clearcoatNormalMap||!!_.displacementMap||!!_.transmissionMap,uvsVertexOnly:!(_.map||_.bumpMap||_.normalMap||_.specularMap||_.alphaMap||_.emissiveMap||_.roughnessMap||_.metalnessMap||_.clearcoatNormalMap||_.transmissionMap)&&!!_.displacementMap,fog:!!J,useFog:_.fog,fogExp2:J&&J.isFogExp2,flatShading:!!_.flatShading,sizeAttenuation:_.sizeAttenuation,logarithmicDepthBuffer:l,skinning:_.skinning&&R>0,maxBones:R,useVertexTexture:c,morphTargets:_.morphTargets,morphNormals:_.morphNormals,numDirLights:P.directional.length,numPointLights:P.point.length,numSpotLights:P.spot.length,numRectAreaLights:P.rectArea.length,numHemiLights:P.hemi.length,numDirLightShadows:P.directionalShadowMap.length,numPointLightShadows:P.pointShadowMap.length,numSpotLightShadows:P.spotShadowMap.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:_.dithering,shadowMapEnabled:r.shadowMap.enabled&&N.length>0,shadowMapType:r.shadowMap.type,toneMapping:_.toneMapped?r.toneMapping:Ji,physicallyCorrectLights:r.physicallyCorrectLights,premultipliedAlpha:_.premultipliedAlpha,alphaTest:_.alphaTest,doubleSided:_.side===bi,flipSided:_.side===ft,depthPacking:_.depthPacking!==void 0?_.depthPacking:!1,index0AttributeName:_.index0AttributeName,extensionDerivatives:_.extensions&&_.extensions.derivatives,extensionFragDepth:_.extensions&&_.extensions.fragDepth,extensionDrawBuffers:_.extensions&&_.extensions.drawBuffers,extensionShaderTextureLOD:_.extensions&&_.extensions.shaderTextureLOD,rendererExtensionFragDepth:o||t.has("EXT_frag_depth"),rendererExtensionDrawBuffers:o||t.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:o||t.has("EXT_shader_texture_lod"),customProgramCacheKey:_.customProgramCacheKey()}}function p(_){const P=[];if(_.shaderID?P.push(_.shaderID):(P.push(_.fragmentShader),P.push(_.vertexShader)),_.defines!==void 0)for(const N in _.defines)P.push(N),P.push(_.defines[N]);if(_.isRawShaderMaterial===!1){for(let N=0;N<m.length;N++)P.push(_[m[N]]);P.push(r.outputEncoding),P.push(r.gammaFactor)}return P.push(_.customProgramCacheKey),P.join()}function E(_){const P=f[_.type];let N;if(P){const z=an[P];N=Eu.clone(z.uniforms)}else N=_.uniforms;return N}function T(_,P){let N;for(let z=0,V=a.length;z<V;z++){const J=a[z];if(J.cacheKey===P){N=J,++N.usedTimes;break}}return N===void 0&&(N=new gm(r,P,_,i),a.push(N)),N}function S(_){if(--_.usedTimes===0){const P=a.indexOf(_);a[P]=a[a.length-1],a.pop(),_.destroy()}}return{getParameters:g,getProgramCacheKey:p,getUniforms:E,acquireProgram:T,releaseProgram:S,programs:a}}function xm(){let r=new WeakMap;function e(s){let a=r.get(s);return a===void 0&&(a={},r.set(s,a)),a}function t(s){r.delete(s)}function n(s,a,o){r.get(s)[a]=o}function i(){r=new WeakMap}return{get:e,remove:t,update:n,dispose:i}}function _m(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.program!==e.program?r.program.id-e.program.id:r.material.id!==e.material.id?r.material.id-e.material.id:r.z!==e.z?r.z-e.z:r.id-e.id}function ym(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.z!==e.z?e.z-r.z:r.id-e.id}function So(r){const e=[];let t=0;const n=[],i=[],s={id:-1};function a(){t=0,n.length=0,i.length=0}function o(d,f,m,v,x,g){let p=e[t];const E=r.get(m);return p===void 0?(p={id:d.id,object:d,geometry:f,material:m,program:E.program||s,groupOrder:v,renderOrder:d.renderOrder,z:x,group:g},e[t]=p):(p.id=d.id,p.object=d,p.geometry=f,p.material=m,p.program=E.program||s,p.groupOrder=v,p.renderOrder=d.renderOrder,p.z=x,p.group=g),t++,p}function l(d,f,m,v,x,g){const p=o(d,f,m,v,x,g);(m.transparent===!0?i:n).push(p)}function c(d,f,m,v,x,g){const p=o(d,f,m,v,x,g);(m.transparent===!0?i:n).unshift(p)}function h(d,f){n.length>1&&n.sort(d||_m),i.length>1&&i.sort(f||ym)}function u(){for(let d=t,f=e.length;d<f;d++){const m=e[d];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.program=null,m.group=null}}return{opaque:n,transparent:i,init:a,push:l,unshift:c,finish:u,sort:h}}function Mm(r){let e=new WeakMap;function t(i,s){let a;return e.has(i)===!1?(a=new So(r),e.set(i,[a])):s>=e.get(i).length?(a=new So(r),e.get(i).push(a)):a=e.get(i)[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}function wm(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new b,color:new Te};break;case"SpotLight":t={position:new b,direction:new b,color:new Te,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new b,color:new Te,distance:0,decay:0};break;case"HemisphereLight":t={direction:new b,skyColor:new Te,groundColor:new Te};break;case"RectAreaLight":t={color:new Te,position:new b,halfWidth:new b,halfHeight:new b};break}return r[e.id]=t,t}}}function bm(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new se};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new se};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new se,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[e.id]=t,t}}}let Sm=0;function Em(r,e){return(e.castShadow?1:0)-(r.castShadow?1:0)}function Tm(r,e){const t=new wm,n=bm(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotShadow:[],spotShadowMap:[],spotShadowMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[]};for(let h=0;h<9;h++)i.probe.push(new b);const s=new b,a=new Le,o=new Le;function l(h){let u=0,d=0,f=0;for(let P=0;P<9;P++)i.probe[P].set(0,0,0);let m=0,v=0,x=0,g=0,p=0,E=0,T=0,S=0;h.sort(Em);for(let P=0,N=h.length;P<N;P++){const z=h[P],V=z.color,J=z.intensity,O=z.distance,C=z.shadow&&z.shadow.map?z.shadow.map.texture:null;if(z.isAmbientLight)u+=V.r*J,d+=V.g*J,f+=V.b*J;else if(z.isLightProbe)for(let I=0;I<9;I++)i.probe[I].addScaledVector(z.sh.coefficients[I],J);else if(z.isDirectionalLight){const I=t.get(z);if(I.color.copy(z.color).multiplyScalar(z.intensity),z.castShadow){const R=z.shadow,A=n.get(z);A.shadowBias=R.bias,A.shadowNormalBias=R.normalBias,A.shadowRadius=R.radius,A.shadowMapSize=R.mapSize,i.directionalShadow[m]=A,i.directionalShadowMap[m]=C,i.directionalShadowMatrix[m]=z.shadow.matrix,E++}i.directional[m]=I,m++}else if(z.isSpotLight){const I=t.get(z);if(I.position.setFromMatrixPosition(z.matrixWorld),I.color.copy(V).multiplyScalar(J),I.distance=O,I.coneCos=Math.cos(z.angle),I.penumbraCos=Math.cos(z.angle*(1-z.penumbra)),I.decay=z.decay,z.castShadow){const R=z.shadow,A=n.get(z);A.shadowBias=R.bias,A.shadowNormalBias=R.normalBias,A.shadowRadius=R.radius,A.shadowMapSize=R.mapSize,i.spotShadow[x]=A,i.spotShadowMap[x]=C,i.spotShadowMatrix[x]=z.shadow.matrix,S++}i.spot[x]=I,x++}else if(z.isRectAreaLight){const I=t.get(z);I.color.copy(V).multiplyScalar(J),I.halfWidth.set(z.width*.5,0,0),I.halfHeight.set(0,z.height*.5,0),i.rectArea[g]=I,g++}else if(z.isPointLight){const I=t.get(z);if(I.color.copy(z.color).multiplyScalar(z.intensity),I.distance=z.distance,I.decay=z.decay,z.castShadow){const R=z.shadow,A=n.get(z);A.shadowBias=R.bias,A.shadowNormalBias=R.normalBias,A.shadowRadius=R.radius,A.shadowMapSize=R.mapSize,A.shadowCameraNear=R.camera.near,A.shadowCameraFar=R.camera.far,i.pointShadow[v]=A,i.pointShadowMap[v]=C,i.pointShadowMatrix[v]=z.shadow.matrix,T++}i.point[v]=I,v++}else if(z.isHemisphereLight){const I=t.get(z);I.skyColor.copy(z.color).multiplyScalar(J),I.groundColor.copy(z.groundColor).multiplyScalar(J),i.hemi[p]=I,p++}}g>0&&(e.isWebGL2||r.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=de.LTC_FLOAT_1,i.rectAreaLTC2=de.LTC_FLOAT_2):r.has("OES_texture_half_float_linear")===!0?(i.rectAreaLTC1=de.LTC_HALF_1,i.rectAreaLTC2=de.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),i.ambient[0]=u,i.ambient[1]=d,i.ambient[2]=f;const _=i.hash;(_.directionalLength!==m||_.pointLength!==v||_.spotLength!==x||_.rectAreaLength!==g||_.hemiLength!==p||_.numDirectionalShadows!==E||_.numPointShadows!==T||_.numSpotShadows!==S)&&(i.directional.length=m,i.spot.length=x,i.rectArea.length=g,i.point.length=v,i.hemi.length=p,i.directionalShadow.length=E,i.directionalShadowMap.length=E,i.pointShadow.length=T,i.pointShadowMap.length=T,i.spotShadow.length=S,i.spotShadowMap.length=S,i.directionalShadowMatrix.length=E,i.pointShadowMatrix.length=T,i.spotShadowMatrix.length=S,_.directionalLength=m,_.pointLength=v,_.spotLength=x,_.rectAreaLength=g,_.hemiLength=p,_.numDirectionalShadows=E,_.numPointShadows=T,_.numSpotShadows=S,i.version=Sm++)}function c(h,u){let d=0,f=0,m=0,v=0,x=0;const g=u.matrixWorldInverse;for(let p=0,E=h.length;p<E;p++){const T=h[p];if(T.isDirectionalLight){const S=i.directional[d];S.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(g),d++}else if(T.isSpotLight){const S=i.spot[m];S.position.setFromMatrixPosition(T.matrixWorld),S.position.applyMatrix4(g),S.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(g),m++}else if(T.isRectAreaLight){const S=i.rectArea[v];S.position.setFromMatrixPosition(T.matrixWorld),S.position.applyMatrix4(g),o.identity(),a.copy(T.matrixWorld),a.premultiply(g),o.extractRotation(a),S.halfWidth.set(T.width*.5,0,0),S.halfHeight.set(0,T.height*.5,0),S.halfWidth.applyMatrix4(o),S.halfHeight.applyMatrix4(o),v++}else if(T.isPointLight){const S=i.point[f];S.position.setFromMatrixPosition(T.matrixWorld),S.position.applyMatrix4(g),f++}else if(T.isHemisphereLight){const S=i.hemi[x];S.direction.setFromMatrixPosition(T.matrixWorld),S.direction.transformDirection(g),S.direction.normalize(),x++}}}return{setup:l,setupView:c,state:i}}function Eo(r,e){const t=new Tm(r,e),n=[],i=[];function s(){n.length=0,i.length=0}function a(u){n.push(u)}function o(u){i.push(u)}function l(){t.setup(n)}function c(u){t.setupView(n,u)}return{init:s,state:{lightsArray:n,shadowsArray:i,lights:t},setupLights:l,setupLightsView:c,pushLight:a,pushShadow:o}}function Am(r,e){let t=new WeakMap;function n(s,a=0){let o;return t.has(s)===!1?(o=new Eo(r,e),t.set(s,[o])):a>=t.get(s).length?(o=new Eo(r,e),t.get(s).push(o)):o=t.get(s)[a],o}function i(){t=new WeakMap}return{get:n,dispose:i}}class Ll extends xt{constructor(e){super(),this.type="MeshDepthMaterial",this.depthPacking=iu,this.skinning=!1,this.morphTargets=!1,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}Ll.prototype.isMeshDepthMaterial=!0;class Cl extends xt{constructor(e){super(),this.type="MeshDistanceMaterial",this.referencePosition=new b,this.nearDistance=1,this.farDistance=1e3,this.skinning=!1,this.morphTargets=!1,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.fog=!1,this.setValues(e)}copy(e){return super.copy(e),this.referencePosition.copy(e.referencePosition),this.nearDistance=e.nearDistance,this.farDistance=e.farDistance,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}Cl.prototype.isMeshDistanceMaterial=!0;var Lm=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	float mean = 0.0;
	float squared_mean = 0.0;
	float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy ) / resolution ) );
	for ( float i = -1.0; i < 1.0 ; i += SAMPLE_RATE) {
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( i, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, i ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean * HALF_SAMPLE_RATE;
	squared_mean = squared_mean * HALF_SAMPLE_RATE;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`,Cm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`;function Rl(r,e,t){let n=new ts;const i=new se,s=new se,a=new tt,o=[],l=[],c={},h=t.maxTextureSize,u={0:ft,1:Kr,2:bi},d=new Xn({defines:{SAMPLE_RATE:2/8,HALF_SAMPLE_RATE:1/8},uniforms:{shadow_pass:{value:null},resolution:{value:new se},radius:{value:4}},vertexShader:Cm,fragmentShader:Lm}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const m=new Ye;m.setAttribute("position",new dt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new Mt(m,d),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=rl,this.render=function(_,P,N){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||_.length===0)return;const z=r.getRenderTarget(),V=r.getActiveCubeFace(),J=r.getActiveMipmapLevel(),O=r.state;O.setBlending(ji),O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);for(let C=0,I=_.length;C<I;C++){const R=_[C],A=R.shadow;if(A===void 0){console.warn("THREE.WebGLShadowMap:",R,"has no shadow.");continue}if(A.autoUpdate===!1&&A.needsUpdate===!1)continue;i.copy(A.mapSize);const X=A.getFrameExtents();if(i.multiply(X),s.copy(A.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(s.x=Math.floor(h/X.x),i.x=s.x*X.x,A.mapSize.x=s.x),i.y>h&&(s.y=Math.floor(h/X.y),i.y=s.y*X.y,A.mapSize.y=s.y)),A.map===null&&!A.isPointLightShadow&&this.type===Xi){const Z={minFilter:Wt,magFilter:Wt,format:$t};A.map=new Wn(i.x,i.y,Z),A.map.texture.name=R.name+".shadowMap",A.mapPass=new Wn(i.x,i.y,Z),A.camera.updateProjectionMatrix()}if(A.map===null){const Z={minFilter:Rt,magFilter:Rt,format:$t};A.map=new Wn(i.x,i.y,Z),A.map.texture.name=R.name+".shadowMap",A.camera.updateProjectionMatrix()}r.setRenderTarget(A.map),r.clear();const ee=A.getViewportCount();for(let Z=0;Z<ee;Z++){const ae=A.getViewport(Z);a.set(s.x*ae.x,s.y*ae.y,s.x*ae.z,s.y*ae.w),O.viewport(a),A.updateMatrices(R,Z),n=A.getFrustum(),S(P,N,A.camera,R,this.type)}!A.isPointLightShadow&&this.type===Xi&&g(A,N),A.needsUpdate=!1}x.needsUpdate=!1,r.setRenderTarget(z,V,J)};function g(_,P){const N=e.update(v);d.uniforms.shadow_pass.value=_.map.texture,d.uniforms.resolution.value=_.mapSize,d.uniforms.radius.value=_.radius,r.setRenderTarget(_.mapPass),r.clear(),r.renderBufferDirect(P,null,N,d,v,null),f.uniforms.shadow_pass.value=_.mapPass.texture,f.uniforms.resolution.value=_.mapSize,f.uniforms.radius.value=_.radius,r.setRenderTarget(_.map),r.clear(),r.renderBufferDirect(P,null,N,f,v,null)}function p(_,P,N){const z=_<<0|P<<1|N<<2;let V=o[z];return V===void 0&&(V=new Ll({depthPacking:ru,morphTargets:_,skinning:P}),o[z]=V),V}function E(_,P,N){const z=_<<0|P<<1|N<<2;let V=l[z];return V===void 0&&(V=new Cl({morphTargets:_,skinning:P}),l[z]=V),V}function T(_,P,N,z,V,J,O){let C=null,I=p,R=_.customDepthMaterial;if(z.isPointLight===!0&&(I=E,R=_.customDistanceMaterial),R===void 0){let A=!1;N.morphTargets===!0&&(A=P.morphAttributes&&P.morphAttributes.position&&P.morphAttributes.position.length>0);let X=!1;_.isSkinnedMesh===!0&&(N.skinning===!0?X=!0:console.warn("THREE.WebGLShadowMap: THREE.SkinnedMesh with material.skinning set to false:",_));const ee=_.isInstancedMesh===!0;C=I(A,X,ee)}else C=R;if(r.localClippingEnabled&&N.clipShadows===!0&&N.clippingPlanes.length!==0){const A=C.uuid,X=N.uuid;let ee=c[A];ee===void 0&&(ee={},c[A]=ee);let Z=ee[X];Z===void 0&&(Z=C.clone(),ee[X]=Z),C=Z}return C.visible=N.visible,C.wireframe=N.wireframe,O===Xi?C.side=N.shadowSide!==null?N.shadowSide:N.side:C.side=N.shadowSide!==null?N.shadowSide:u[N.side],C.clipShadows=N.clipShadows,C.clippingPlanes=N.clippingPlanes,C.clipIntersection=N.clipIntersection,C.wireframeLinewidth=N.wireframeLinewidth,C.linewidth=N.linewidth,z.isPointLight===!0&&C.isMeshDistanceMaterial===!0&&(C.referencePosition.setFromMatrixPosition(z.matrixWorld),C.nearDistance=V,C.farDistance=J),C}function S(_,P,N,z,V){if(_.visible===!1)return;if(_.layers.test(P.layers)&&(_.isMesh||_.isLine||_.isPoints)&&(_.castShadow||_.receiveShadow&&V===Xi)&&(!_.frustumCulled||n.intersectsObject(_))){_.modelViewMatrix.multiplyMatrices(N.matrixWorldInverse,_.matrixWorld);const C=e.update(_),I=_.material;if(Array.isArray(I)){const R=C.groups;for(let A=0,X=R.length;A<X;A++){const ee=R[A],Z=I[ee.materialIndex];if(Z&&Z.visible){const ae=T(_,C,Z,z,N.near,N.far,V);r.renderBufferDirect(N,null,C,ae,_,ee)}}}else if(I.visible){const R=T(_,C,I,z,N.near,N.far,V);r.renderBufferDirect(N,null,C,R,_,null)}}const O=_.children;for(let C=0,I=O.length;C<I;C++)S(O[C],P,N,z,V)}}function Rm(r,e,t){const n=t.isWebGL2;function i(){let L=!1;const $=new tt;let ie=null;const ve=new tt(0,0,0,0);return{setMask:function(q){ie!==q&&!L&&(r.colorMask(q,q,q,q),ie=q)},setLocked:function(q){L=q},setClear:function(q,Me,ke,Je,Dt){Dt===!0&&(q*=Je,Me*=Je,ke*=Je),$.set(q,Me,ke,Je),ve.equals($)===!1&&(r.clearColor(q,Me,ke,Je),ve.copy($))},reset:function(){L=!1,ie=null,ve.set(-1,0,0,0)}}}function s(){let L=!1,$=null,ie=null,ve=null;return{setTest:function(q){q?pe(2929):xe(2929)},setMask:function(q){$!==q&&!L&&(r.depthMask(q),$=q)},setFunc:function(q){if(ie!==q){if(q)switch(q){case kc:r.depthFunc(512);break;case Gc:r.depthFunc(519);break;case Vc:r.depthFunc(513);break;case js:r.depthFunc(515);break;case Wc:r.depthFunc(514);break;case Xc:r.depthFunc(518);break;case qc:r.depthFunc(516);break;case Yc:r.depthFunc(517);break;default:r.depthFunc(515)}else r.depthFunc(515);ie=q}},setLocked:function(q){L=q},setClear:function(q){ve!==q&&(r.clearDepth(q),ve=q)},reset:function(){L=!1,$=null,ie=null,ve=null}}}function a(){let L=!1,$=null,ie=null,ve=null,q=null,Me=null,ke=null,Je=null,Dt=null;return{setTest:function(it){L||(it?pe(2960):xe(2960))},setMask:function(it){$!==it&&!L&&(r.stencilMask(it),$=it)},setFunc:function(it,St,mt){(ie!==it||ve!==St||q!==mt)&&(r.stencilFunc(it,St,mt),ie=it,ve=St,q=mt)},setOp:function(it,St,mt){(Me!==it||ke!==St||Je!==mt)&&(r.stencilOp(it,St,mt),Me=it,ke=St,Je=mt)},setLocked:function(it){L=it},setClear:function(it){Dt!==it&&(r.clearStencil(it),Dt=it)},reset:function(){L=!1,$=null,ie=null,ve=null,q=null,Me=null,ke=null,Je=null,Dt=null}}}const o=new i,l=new s,c=new a;let h={},u=null,d={},f=null,m=!1,v=null,x=null,g=null,p=null,E=null,T=null,S=null,_=!1,P=null,N=null,z=null,V=null,J=null;const O=r.getParameter(35661);let C=!1,I=0;const R=r.getParameter(7938);R.indexOf("WebGL")!==-1?(I=parseFloat(/^WebGL (\d)/.exec(R)[1]),C=I>=1):R.indexOf("OpenGL ES")!==-1&&(I=parseFloat(/^OpenGL ES (\d)/.exec(R)[1]),C=I>=2);let A=null,X={};const ee=new tt(0,0,r.canvas.width,r.canvas.height),Z=new tt(0,0,r.canvas.width,r.canvas.height);function ae(L,$,ie){const ve=new Uint8Array(4),q=r.createTexture();r.bindTexture(L,q),r.texParameteri(L,10241,9728),r.texParameteri(L,10240,9728);for(let Me=0;Me<ie;Me++)r.texImage2D($+Me,0,6408,1,1,0,6408,5121,ve);return q}const te={};te[3553]=ae(3553,3553,1),te[34067]=ae(34067,34069,6),o.setClear(0,0,0,1),l.setClear(1),c.setClear(0),pe(2929),l.setFunc(js),_e(!1),j(Da),pe(2884),Ae(ji);function pe(L){h[L]!==!0&&(r.enable(L),h[L]=!0)}function xe(L){h[L]!==!1&&(r.disable(L),h[L]=!1)}function H(L){L!==u&&(r.bindFramebuffer(36160,L),u=L)}function Oe(L,$){$===null&&u!==null&&($=u),d[L]!==$&&(r.bindFramebuffer(L,$),d[L]=$,n&&(L===36009&&(d[36160]=$),L===36160&&(d[36009]=$)))}function Fe(L){return f!==L?(r.useProgram(L),f=L,!0):!1}const we={[gi]:32774,[Rc]:32778,[Pc]:32779};if(n)we[Ba]=32775,we[za]=32776;else{const L=e.get("EXT_blend_minmax");L!==null&&(we[Ba]=L.MIN_EXT,we[za]=L.MAX_EXT)}const ye={[Ic]:0,[Dc]:1,[Nc]:768,[al]:770,[Hc]:776,[Oc]:774,[Bc]:772,[Fc]:769,[ol]:771,[Uc]:775,[zc]:773};function Ae(L,$,ie,ve,q,Me,ke,Je){if(L===ji){m===!0&&(xe(3042),m=!1);return}if(m===!1&&(pe(3042),m=!0),L!==Cc){if(L!==v||Je!==_){if((x!==gi||E!==gi)&&(r.blendEquation(32774),x=gi,E=gi),Je)switch(L){case Zi:r.blendFuncSeparate(1,771,1,771);break;case Ys:r.blendFunc(1,1);break;case Na:r.blendFuncSeparate(0,0,769,771);break;case Fa:r.blendFuncSeparate(0,768,0,770);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}else switch(L){case Zi:r.blendFuncSeparate(770,771,1,771);break;case Ys:r.blendFunc(770,1);break;case Na:r.blendFunc(0,769);break;case Fa:r.blendFunc(0,768);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}g=null,p=null,T=null,S=null,v=L,_=Je}return}q=q||$,Me=Me||ie,ke=ke||ve,($!==x||q!==E)&&(r.blendEquationSeparate(we[$],we[q]),x=$,E=q),(ie!==g||ve!==p||Me!==T||ke!==S)&&(r.blendFuncSeparate(ye[ie],ye[ve],ye[Me],ye[ke]),g=ie,p=ve,T=Me,S=ke),v=L,_=null}function ge(L,$){L.side===bi?xe(2884):pe(2884);let ie=L.side===ft;$&&(ie=!ie),_e(ie),L.blending===Zi&&L.transparent===!1?Ae(ji):Ae(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.premultipliedAlpha),l.setFunc(L.depthFunc),l.setTest(L.depthTest),l.setMask(L.depthWrite),o.setMask(L.colorWrite);const ve=L.stencilWrite;c.setTest(ve),ve&&(c.setMask(L.stencilWriteMask),c.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),c.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),K(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?pe(32926):xe(32926)}function _e(L){P!==L&&(L?r.frontFace(2304):r.frontFace(2305),P=L)}function j(L){L!==Tc?(pe(2884),L!==N&&(L===Da?r.cullFace(1029):L===Ac?r.cullFace(1028):r.cullFace(1032))):xe(2884),N=L}function Q(L){L!==z&&(C&&r.lineWidth(L),z=L)}function K(L,$,ie){L?(pe(32823),(V!==$||J!==ie)&&(r.polygonOffset($,ie),V=$,J=ie)):xe(32823)}function ne(L){L?pe(3089):xe(3089)}function re(L){L===void 0&&(L=33984+O-1),A!==L&&(r.activeTexture(L),A=L)}function w(L,$){A===null&&re();let ie=X[A];ie===void 0&&(ie={type:void 0,texture:void 0},X[A]=ie),(ie.type!==L||ie.texture!==$)&&(r.bindTexture(L,$||te[L]),ie.type=L,ie.texture=$)}function M(){const L=X[A];L!==void 0&&L.type!==void 0&&(r.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function k(){try{r.compressedTexImage2D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function W(){try{r.texImage2D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function he(){try{r.texImage3D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function me(L){ee.equals(L)===!1&&(r.scissor(L.x,L.y,L.z,L.w),ee.copy(L))}function De(L){Z.equals(L)===!1&&(r.viewport(L.x,L.y,L.z,L.w),Z.copy(L))}function be(){r.disable(3042),r.disable(2884),r.disable(2929),r.disable(32823),r.disable(3089),r.disable(2960),r.disable(32926),r.blendEquation(32774),r.blendFunc(1,0),r.blendFuncSeparate(1,0,1,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(513),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(519,0,4294967295),r.stencilOp(7680,7680,7680),r.clearStencil(0),r.cullFace(1029),r.frontFace(2305),r.polygonOffset(0,0),r.activeTexture(33984),r.bindFramebuffer(36160,null),n===!0&&(r.bindFramebuffer(36009,null),r.bindFramebuffer(36008,null)),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),h={},A=null,X={},u=null,d={},f=null,m=!1,v=null,x=null,g=null,p=null,E=null,T=null,S=null,_=!1,P=null,N=null,z=null,V=null,J=null,ee.set(0,0,r.canvas.width,r.canvas.height),Z.set(0,0,r.canvas.width,r.canvas.height),o.reset(),l.reset(),c.reset()}return{buffers:{color:o,depth:l,stencil:c},enable:pe,disable:xe,bindFramebuffer:Oe,bindXRFramebuffer:H,useProgram:Fe,setBlending:Ae,setMaterial:ge,setFlipSided:_e,setCullFace:j,setLineWidth:Q,setPolygonOffset:K,setScissorTest:ne,activeTexture:re,bindTexture:w,unbindTexture:M,compressedTexImage2D:k,texImage2D:W,texImage3D:he,scissor:me,viewport:De,reset:be}}function Pm(r,e,t,n,i,s,a){const o=i.isWebGL2,l=i.maxTextures,c=i.maxCubemapSize,h=i.maxTextureSize,u=i.maxSamples,d=new WeakMap;let f,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(w,M){return m?new OffscreenCanvas(w,M):document.createElementNS("http://www.w3.org/1999/xhtml","canvas")}function x(w,M,k,W){let he=1;if((w.width>W||w.height>W)&&(he=W/Math.max(w.width,w.height)),he<1||M===!0)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap){const me=M?cu:Math.floor,De=me(he*w.width),be=me(he*w.height);f===void 0&&(f=v(De,be));const L=k?v(De,be):f;return L.width=De,L.height=be,L.getContext("2d").drawImage(w,0,0,De,be),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+w.width+"x"+w.height+") to ("+De+"x"+be+")."),L}else return"data"in w&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+w.width+"x"+w.height+")."),w;return w}function g(w){return $a(w.width)&&$a(w.height)}function p(w){return o?!1:w.wrapS!==Kt||w.wrapT!==Kt||w.minFilter!==Rt&&w.minFilter!==Wt}function E(w,M){return w.generateMipmaps&&M&&w.minFilter!==Rt&&w.minFilter!==Wt}function T(w,M,k,W){r.generateMipmap(w);const he=n.get(M);he.__maxMipLevel=Math.log2(Math.max(k,W))}function S(w,M,k){if(o===!1)return M;if(w!==null){if(r[w]!==void 0)return r[w];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let W=M;return M===6403&&(k===5126&&(W=33326),k===5131&&(W=33325),k===5121&&(W=33321)),M===6407&&(k===5126&&(W=34837),k===5131&&(W=34843),k===5121&&(W=32849)),M===6408&&(k===5126&&(W=34836),k===5131&&(W=34842),k===5121&&(W=32856)),(W===33325||W===33326||W===34842||W===34836)&&e.get("EXT_color_buffer_float"),W}function _(w){return w===Rt||w===Ha||w===ka?9728:9729}function P(w){const M=w.target;M.removeEventListener("dispose",P),z(M),M.isVideoTexture&&d.delete(M),a.memory.textures--}function N(w){const M=w.target;M.removeEventListener("dispose",N),V(M),a.memory.textures--}function z(w){const M=n.get(w);M.__webglInit!==void 0&&(r.deleteTexture(M.__webglTexture),n.remove(w))}function V(w){const M=w.texture,k=n.get(w),W=n.get(M);if(w){if(W.__webglTexture!==void 0&&r.deleteTexture(W.__webglTexture),w.depthTexture&&w.depthTexture.dispose(),w.isWebGLCubeRenderTarget)for(let he=0;he<6;he++)r.deleteFramebuffer(k.__webglFramebuffer[he]),k.__webglDepthbuffer&&r.deleteRenderbuffer(k.__webglDepthbuffer[he]);else r.deleteFramebuffer(k.__webglFramebuffer),k.__webglDepthbuffer&&r.deleteRenderbuffer(k.__webglDepthbuffer),k.__webglMultisampledFramebuffer&&r.deleteFramebuffer(k.__webglMultisampledFramebuffer),k.__webglColorRenderbuffer&&r.deleteRenderbuffer(k.__webglColorRenderbuffer),k.__webglDepthRenderbuffer&&r.deleteRenderbuffer(k.__webglDepthRenderbuffer);n.remove(M),n.remove(w)}}let J=0;function O(){J=0}function C(){const w=J;return w>=l&&console.warn("THREE.WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+l),J+=1,w}function I(w,M){const k=n.get(w);if(w.isVideoTexture&&j(w),w.version>0&&k.__version!==w.version){const W=w.image;if(W===void 0)console.warn("THREE.WebGLRenderer: Texture marked for update but image is undefined");else if(W.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{pe(k,w,M);return}}t.activeTexture(33984+M),t.bindTexture(3553,k.__webglTexture)}function R(w,M){const k=n.get(w);if(w.version>0&&k.__version!==w.version){pe(k,w,M);return}t.activeTexture(33984+M),t.bindTexture(35866,k.__webglTexture)}function A(w,M){const k=n.get(w);if(w.version>0&&k.__version!==w.version){pe(k,w,M);return}t.activeTexture(33984+M),t.bindTexture(32879,k.__webglTexture)}function X(w,M){const k=n.get(w);if(w.version>0&&k.__version!==w.version){xe(k,w,M);return}t.activeTexture(33984+M),t.bindTexture(34067,k.__webglTexture)}const ee={[Zs]:10497,[Kt]:33071,[Js]:33648},Z={[Rt]:9728,[Ha]:9984,[ka]:9986,[Wt]:9729,[th]:9985,[ha]:9987};function ae(w,M,k){if(k?(r.texParameteri(w,10242,ee[M.wrapS]),r.texParameteri(w,10243,ee[M.wrapT]),(w===32879||w===35866)&&r.texParameteri(w,32882,ee[M.wrapR]),r.texParameteri(w,10240,Z[M.magFilter]),r.texParameteri(w,10241,Z[M.minFilter])):(r.texParameteri(w,10242,33071),r.texParameteri(w,10243,33071),(w===32879||w===35866)&&r.texParameteri(w,32882,33071),(M.wrapS!==Kt||M.wrapT!==Kt)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),r.texParameteri(w,10240,_(M.magFilter)),r.texParameteri(w,10241,_(M.minFilter)),M.minFilter!==Rt&&M.minFilter!==Wt&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),e.has("EXT_texture_filter_anisotropic")===!0){const W=e.get("EXT_texture_filter_anisotropic");if(M.type===Cn&&e.has("OES_texture_float_linear")===!1||o===!1&&M.type===Vr&&e.has("OES_texture_half_float_linear")===!1)return;(M.anisotropy>1||n.get(M).__currentAnisotropy)&&(r.texParameterf(w,W.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,i.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy)}}function te(w,M){w.__webglInit===void 0&&(w.__webglInit=!0,M.addEventListener("dispose",P),w.__webglTexture=r.createTexture(),a.memory.textures++)}function pe(w,M,k){let W=3553;M.isDataTexture2DArray&&(W=35866),M.isDataTexture3D&&(W=32879),te(w,M),t.activeTexture(33984+k),t.bindTexture(W,w.__webglTexture),r.pixelStorei(37440,M.flipY),r.pixelStorei(37441,M.premultiplyAlpha),r.pixelStorei(3317,M.unpackAlignment),r.pixelStorei(37443,0);const he=p(M)&&g(M.image)===!1,me=x(M.image,he,!1,h),De=g(me)||o,be=s.convert(M.format);let L=s.convert(M.type),$=S(M.internalFormat,be,L);ae(W,M,De);let ie;const ve=M.mipmaps;if(M.isDepthTexture)$=6402,o?M.type===Cn?$=36012:M.type===Hr?$=33190:M.type===Qi?$=35056:$=33189:M.type===Cn&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),M.format===Mi&&$===6402&&M.type!==Gr&&M.type!==Hr&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),M.type=Gr,L=s.convert(M.type)),M.format===er&&$===6402&&($=34041,M.type!==Qi&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),M.type=Qi,L=s.convert(M.type))),t.texImage2D(3553,0,$,me.width,me.height,0,be,L,null);else if(M.isDataTexture)if(ve.length>0&&De){for(let q=0,Me=ve.length;q<Me;q++)ie=ve[q],t.texImage2D(3553,q,$,ie.width,ie.height,0,be,L,ie.data);M.generateMipmaps=!1,w.__maxMipLevel=ve.length-1}else t.texImage2D(3553,0,$,me.width,me.height,0,be,L,me.data),w.__maxMipLevel=0;else if(M.isCompressedTexture){for(let q=0,Me=ve.length;q<Me;q++)ie=ve[q],M.format!==$t&&M.format!==Vn?be!==null?t.compressedTexImage2D(3553,q,$,ie.width,ie.height,0,ie.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):t.texImage2D(3553,q,$,ie.width,ie.height,0,be,L,ie.data);w.__maxMipLevel=ve.length-1}else if(M.isDataTexture2DArray)t.texImage3D(35866,0,$,me.width,me.height,me.depth,0,be,L,me.data),w.__maxMipLevel=0;else if(M.isDataTexture3D)t.texImage3D(32879,0,$,me.width,me.height,me.depth,0,be,L,me.data),w.__maxMipLevel=0;else if(ve.length>0&&De){for(let q=0,Me=ve.length;q<Me;q++)ie=ve[q],t.texImage2D(3553,q,$,be,L,ie);M.generateMipmaps=!1,w.__maxMipLevel=ve.length-1}else t.texImage2D(3553,0,$,be,L,me),w.__maxMipLevel=0;E(M,De)&&T(W,M,me.width,me.height),w.__version=M.version,M.onUpdate&&M.onUpdate(M)}function xe(w,M,k){if(M.image.length!==6)return;te(w,M),t.activeTexture(33984+k),t.bindTexture(34067,w.__webglTexture),r.pixelStorei(37440,M.flipY),r.pixelStorei(37441,M.premultiplyAlpha),r.pixelStorei(3317,M.unpackAlignment),r.pixelStorei(37443,0);const W=M&&(M.isCompressedTexture||M.image[0].isCompressedTexture),he=M.image[0]&&M.image[0].isDataTexture,me=[];for(let q=0;q<6;q++)!W&&!he?me[q]=x(M.image[q],!1,!0,c):me[q]=he?M.image[q].image:M.image[q];const De=me[0],be=g(De)||o,L=s.convert(M.format),$=s.convert(M.type),ie=S(M.internalFormat,L,$);ae(34067,M,be);let ve;if(W){for(let q=0;q<6;q++){ve=me[q].mipmaps;for(let Me=0;Me<ve.length;Me++){const ke=ve[Me];M.format!==$t&&M.format!==Vn?L!==null?t.compressedTexImage2D(34069+q,Me,ie,ke.width,ke.height,0,ke.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):t.texImage2D(34069+q,Me,ie,ke.width,ke.height,0,L,$,ke.data)}}w.__maxMipLevel=ve.length-1}else{ve=M.mipmaps;for(let q=0;q<6;q++)if(he){t.texImage2D(34069+q,0,ie,me[q].width,me[q].height,0,L,$,me[q].data);for(let Me=0;Me<ve.length;Me++){const Je=ve[Me].image[q].image;t.texImage2D(34069+q,Me+1,ie,Je.width,Je.height,0,L,$,Je.data)}}else{t.texImage2D(34069+q,0,ie,L,$,me[q]);for(let Me=0;Me<ve.length;Me++){const ke=ve[Me];t.texImage2D(34069+q,Me+1,ie,L,$,ke.image[q])}}w.__maxMipLevel=ve.length}E(M,be)&&T(34067,M,De.width,De.height),w.__version=M.version,M.onUpdate&&M.onUpdate(M)}function H(w,M,k,W){const he=M.texture,me=s.convert(he.format),De=s.convert(he.type),be=S(he.internalFormat,me,De);W===32879||W===35866?t.texImage3D(W,0,be,M.width,M.height,M.depth,0,me,De,null):t.texImage2D(W,0,be,M.width,M.height,0,me,De,null),t.bindFramebuffer(36160,w),r.framebufferTexture2D(36160,k,W,n.get(he).__webglTexture,0),t.bindFramebuffer(36160,null)}function Oe(w,M,k){if(r.bindRenderbuffer(36161,w),M.depthBuffer&&!M.stencilBuffer){let W=33189;if(k){const he=M.depthTexture;he&&he.isDepthTexture&&(he.type===Cn?W=36012:he.type===Hr&&(W=33190));const me=_e(M);r.renderbufferStorageMultisample(36161,me,W,M.width,M.height)}else r.renderbufferStorage(36161,W,M.width,M.height);r.framebufferRenderbuffer(36160,36096,36161,w)}else if(M.depthBuffer&&M.stencilBuffer){if(k){const W=_e(M);r.renderbufferStorageMultisample(36161,W,35056,M.width,M.height)}else r.renderbufferStorage(36161,34041,M.width,M.height);r.framebufferRenderbuffer(36160,33306,36161,w)}else{const W=M.texture,he=s.convert(W.format),me=s.convert(W.type),De=S(W.internalFormat,he,me);if(k){const be=_e(M);r.renderbufferStorageMultisample(36161,be,De,M.width,M.height)}else r.renderbufferStorage(36161,De,M.width,M.height)}r.bindRenderbuffer(36161,null)}function Fe(w,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(36160,w),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(M.depthTexture).__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),I(M.depthTexture,0);const W=n.get(M.depthTexture).__webglTexture;if(M.depthTexture.format===Mi)r.framebufferTexture2D(36160,36096,3553,W,0);else if(M.depthTexture.format===er)r.framebufferTexture2D(36160,33306,3553,W,0);else throw new Error("Unknown depthTexture format")}function we(w){const M=n.get(w),k=w.isWebGLCubeRenderTarget===!0;if(w.depthTexture){if(k)throw new Error("target.depthTexture not supported in Cube render targets");Fe(M.__webglFramebuffer,w)}else if(k){M.__webglDepthbuffer=[];for(let W=0;W<6;W++)t.bindFramebuffer(36160,M.__webglFramebuffer[W]),M.__webglDepthbuffer[W]=r.createRenderbuffer(),Oe(M.__webglDepthbuffer[W],w,!1)}else t.bindFramebuffer(36160,M.__webglFramebuffer),M.__webglDepthbuffer=r.createRenderbuffer(),Oe(M.__webglDepthbuffer,w,!1);t.bindFramebuffer(36160,null)}function ye(w){const M=w.texture,k=n.get(w),W=n.get(M);w.addEventListener("dispose",N),W.__webglTexture=r.createTexture(),W.__version=M.version,a.memory.textures++;const he=w.isWebGLCubeRenderTarget===!0,me=w.isWebGLMultisampleRenderTarget===!0,De=M.isDataTexture3D||M.isDataTexture2DArray,be=g(w)||o;if(o&&M.format===Vn&&(M.type===Cn||M.type===Vr)&&(M.format=$t,console.warn("THREE.WebGLRenderer: Rendering to textures with RGB format is not supported. Using RGBA format instead.")),he){k.__webglFramebuffer=[];for(let L=0;L<6;L++)k.__webglFramebuffer[L]=r.createFramebuffer()}else if(k.__webglFramebuffer=r.createFramebuffer(),me)if(o){k.__webglMultisampledFramebuffer=r.createFramebuffer(),k.__webglColorRenderbuffer=r.createRenderbuffer(),r.bindRenderbuffer(36161,k.__webglColorRenderbuffer);const L=s.convert(M.format),$=s.convert(M.type),ie=S(M.internalFormat,L,$),ve=_e(w);r.renderbufferStorageMultisample(36161,ve,ie,w.width,w.height),t.bindFramebuffer(36160,k.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(36160,36064,36161,k.__webglColorRenderbuffer),r.bindRenderbuffer(36161,null),w.depthBuffer&&(k.__webglDepthRenderbuffer=r.createRenderbuffer(),Oe(k.__webglDepthRenderbuffer,w,!0)),t.bindFramebuffer(36160,null)}else console.warn("THREE.WebGLRenderer: WebGLMultisampleRenderTarget can only be used with WebGL2.");if(he){t.bindTexture(34067,W.__webglTexture),ae(34067,M,be);for(let L=0;L<6;L++)H(k.__webglFramebuffer[L],w,36064,34069+L);E(M,be)&&T(34067,M,w.width,w.height),t.bindTexture(34067,null)}else{let L=3553;De&&(o?L=M.isDataTexture3D?32879:35866:console.warn("THREE.DataTexture3D and THREE.DataTexture2DArray only supported with WebGL2.")),t.bindTexture(L,W.__webglTexture),ae(L,M,be),H(k.__webglFramebuffer,w,36064,L),E(M,be)&&T(3553,M,w.width,w.height),t.bindTexture(3553,null)}w.depthBuffer&&we(w)}function Ae(w){const M=w.texture,k=g(w)||o;if(E(M,k)){const W=w.isWebGLCubeRenderTarget?34067:3553,he=n.get(M).__webglTexture;t.bindTexture(W,he),T(W,M,w.width,w.height),t.bindTexture(W,null)}}function ge(w){if(w.isWebGLMultisampleRenderTarget)if(o){const M=w.width,k=w.height;let W=16384;w.depthBuffer&&(W|=256),w.stencilBuffer&&(W|=1024);const he=n.get(w);t.bindFramebuffer(36008,he.__webglMultisampledFramebuffer),t.bindFramebuffer(36009,he.__webglFramebuffer),r.blitFramebuffer(0,0,M,k,0,0,M,k,W,9728),t.bindFramebuffer(36008,null),t.bindFramebuffer(36009,he.__webglMultisampledFramebuffer)}else console.warn("THREE.WebGLRenderer: WebGLMultisampleRenderTarget can only be used with WebGL2.")}function _e(w){return o&&w.isWebGLMultisampleRenderTarget?Math.min(u,w.samples):0}function j(w){const M=a.render.frame;d.get(w)!==M&&(d.set(w,M),w.update())}let Q=!1,K=!1;function ne(w,M){w&&w.isWebGLRenderTarget&&(Q===!1&&(console.warn("THREE.WebGLTextures.safeSetTexture2D: don't use render targets as textures. Use their .texture property instead."),Q=!0),w=w.texture),I(w,M)}function re(w,M){w&&w.isWebGLCubeRenderTarget&&(K===!1&&(console.warn("THREE.WebGLTextures.safeSetTextureCube: don't use cube render targets as textures. Use their .texture property instead."),K=!0),w=w.texture),X(w,M)}this.allocateTextureUnit=C,this.resetTextureUnits=O,this.setTexture2D=I,this.setTexture2DArray=R,this.setTexture3D=A,this.setTextureCube=X,this.setupRenderTarget=ye,this.updateRenderTargetMipmap=Ae,this.updateMultisampleRenderTarget=ge,this.safeSetTexture2D=ne,this.safeSetTextureCube=re}function Im(r,e,t){const n=t.isWebGL2;function i(s){let a;if(s===ua)return 5121;if(s===sh)return 32819;if(s===ah)return 32820;if(s===oh)return 33635;if(s===nh)return 5120;if(s===ih)return 5122;if(s===Gr)return 5123;if(s===rh)return 5124;if(s===Hr)return 5125;if(s===Cn)return 5126;if(s===Vr)return n?5131:(a=e.get("OES_texture_half_float"),a!==null?a.HALF_FLOAT_OES:null);if(s===lh)return 6406;if(s===Vn)return 6407;if(s===$t)return 6408;if(s===ch)return 6409;if(s===hh)return 6410;if(s===Mi)return 6402;if(s===er)return 34041;if(s===uh)return 6403;if(s===dh)return 36244;if(s===fh)return 33319;if(s===ph)return 33320;if(s===mh)return 36248;if(s===gh)return 36249;if(s===Ga||s===Va||s===Wa||s===Xa)if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(s===Ga)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===Va)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===Wa)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===Xa)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===qa||s===Ya||s===ja||s===Za)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(s===qa)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===Ya)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===ja)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===Za)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===vh)return a=e.get("WEBGL_compressed_texture_etc1"),a!==null?a.COMPRESSED_RGB_ETC1_WEBGL:null;if((s===Ja||s===Qa)&&(a=e.get("WEBGL_compressed_texture_etc"),a!==null)){if(s===Ja)return a.COMPRESSED_RGB8_ETC2;if(s===Qa)return a.COMPRESSED_RGBA8_ETC2_EAC}if(s===xh||s===_h||s===yh||s===Mh||s===wh||s===bh||s===Sh||s===Eh||s===Th||s===Ah||s===Lh||s===Ch||s===Rh||s===Ph||s===Dh||s===Nh||s===Fh||s===Bh||s===zh||s===Oh||s===Uh||s===Hh||s===kh||s===Gh||s===Vh||s===Wh||s===Xh||s===qh)return a=e.get("WEBGL_compressed_texture_astc"),a!==null?s:null;if(s===Ih)return a=e.get("EXT_texture_compression_bptc"),a!==null?s:null;if(s===Qi)return n?34042:(a=e.get("WEBGL_depth_texture"),a!==null?a.UNSIGNED_INT_24_8_WEBGL:null)}return{convert:i}}class Pl extends Nt{constructor(e=[]){super(),this.cameras=e}}Pl.prototype.isArrayCamera=!0;class _i extends Ze{constructor(){super(),this.type="Group"}}_i.prototype.isGroup=!0;const Dm={type:"move"};class Fs{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new _i,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new _i,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new b,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new b),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new _i,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new b,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new b),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred")if(o!==null&&(i=t.getPose(e.targetRaySpace,n),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Dm))),c&&e.hand){a=!0;for(const v of e.hand.values()){const x=t.getJointPose(v,n);if(c.joints[v.jointName]===void 0){const p=new _i;p.matrixAutoUpdate=!1,p.visible=!1,c.joints[v.jointName]=p,c.add(p)}const g=c.joints[v.jointName];x!==null&&(g.matrix.fromArray(x.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.jointRadius=x.radius),g.visible=x!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,m=.005;c.inputState.pinching&&d>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));return o!==null&&(o.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}}class Nm extends qn{constructor(e,t){super();const n=this,i=e.state;let s=null,a=1,o=null,l="local-floor",c=null;const h=[],u=new Map,d=new Nt;d.layers.enable(1),d.viewport=new tt;const f=new Nt;f.layers.enable(2),f.viewport=new tt;const m=[d,f],v=new Pl;v.layers.enable(1),v.layers.enable(2);let x=null,g=null;this.enabled=!1,this.isPresenting=!1,this.getController=function(O){let C=h[O];return C===void 0&&(C=new Fs,h[O]=C),C.getTargetRaySpace()},this.getControllerGrip=function(O){let C=h[O];return C===void 0&&(C=new Fs,h[O]=C),C.getGripSpace()},this.getHand=function(O){let C=h[O];return C===void 0&&(C=new Fs,h[O]=C),C.getHandSpace()};function p(O){const C=u.get(O.inputSource);C&&C.dispatchEvent({type:O.type,data:O.inputSource})}function E(){u.forEach(function(O,C){O.disconnect(C)}),u.clear(),x=null,g=null,i.bindXRFramebuffer(null),e.setRenderTarget(e.getRenderTarget()),J.stop(),n.isPresenting=!1,n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(O){a=O,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(O){l=O,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return o},this.getSession=function(){return s},this.setSession=async function(O){if(s=O,s!==null){s.addEventListener("select",p),s.addEventListener("selectstart",p),s.addEventListener("selectend",p),s.addEventListener("squeeze",p),s.addEventListener("squeezestart",p),s.addEventListener("squeezeend",p),s.addEventListener("end",E),s.addEventListener("inputsourceschange",T);const C=t.getContextAttributes();C.xrCompatible!==!0&&await t.makeXRCompatible();const I={antialias:C.antialias,alpha:C.alpha,depth:C.depth,stencil:C.stencil,framebufferScaleFactor:a},R=new XRWebGLLayer(s,t,I);s.updateRenderState({baseLayer:R}),o=await s.requestReferenceSpace(l),J.setContext(s),J.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}};function T(O){const C=s.inputSources;for(let I=0;I<h.length;I++)u.set(C[I],h[I]);for(let I=0;I<O.removed.length;I++){const R=O.removed[I],A=u.get(R);A&&(A.dispatchEvent({type:"disconnected",data:R}),u.delete(R))}for(let I=0;I<O.added.length;I++){const R=O.added[I],A=u.get(R);A&&A.dispatchEvent({type:"connected",data:R})}}const S=new b,_=new b;function P(O,C,I){S.setFromMatrixPosition(C.matrixWorld),_.setFromMatrixPosition(I.matrixWorld);const R=S.distanceTo(_),A=C.projectionMatrix.elements,X=I.projectionMatrix.elements,ee=A[14]/(A[10]-1),Z=A[14]/(A[10]+1),ae=(A[9]+1)/A[5],te=(A[9]-1)/A[5],pe=(A[8]-1)/A[0],xe=(X[8]+1)/X[0],H=ee*pe,Oe=ee*xe,Fe=R/(-pe+xe),we=Fe*-pe;C.matrixWorld.decompose(O.position,O.quaternion,O.scale),O.translateX(we),O.translateZ(Fe),O.matrixWorld.compose(O.position,O.quaternion,O.scale),O.matrixWorldInverse.copy(O.matrixWorld).invert();const ye=ee+Fe,Ae=Z+Fe,ge=H-we,_e=Oe+(R-we),j=ae*Z/Ae*ye,Q=te*Z/Ae*ye;O.projectionMatrix.makePerspective(ge,_e,j,Q,ye,Ae)}function N(O,C){C===null?O.matrixWorld.copy(O.matrix):O.matrixWorld.multiplyMatrices(C.matrixWorld,O.matrix),O.matrixWorldInverse.copy(O.matrixWorld).invert()}this.getCamera=function(O){v.near=f.near=d.near=O.near,v.far=f.far=d.far=O.far,(x!==v.near||g!==v.far)&&(s.updateRenderState({depthNear:v.near,depthFar:v.far}),x=v.near,g=v.far);const C=O.parent,I=v.cameras;N(v,C);for(let A=0;A<I.length;A++)N(I[A],C);O.matrixWorld.copy(v.matrixWorld),O.matrix.copy(v.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale);const R=O.children;for(let A=0,X=R.length;A<X;A++)R[A].updateMatrixWorld(!0);return I.length===2?P(v,d,f):v.projectionMatrix.copy(d.projectionMatrix),v};let z=null;function V(O,C){if(c=C.getViewerPose(o),c!==null){const R=c.views,A=s.renderState.baseLayer;i.bindXRFramebuffer(A.framebuffer);let X=!1;R.length!==v.cameras.length&&(v.cameras.length=0,X=!0);for(let ee=0;ee<R.length;ee++){const Z=R[ee],ae=A.getViewport(Z),te=m[ee];te.matrix.fromArray(Z.transform.matrix),te.projectionMatrix.fromArray(Z.projectionMatrix),te.viewport.set(ae.x,ae.y,ae.width,ae.height),ee===0&&v.matrix.copy(te.matrix),X===!0&&v.cameras.push(te)}}const I=s.inputSources;for(let R=0;R<h.length;R++){const A=h[R],X=I[R];A.update(X,C,o)}z&&z(O,C)}const J=new xl;J.setAnimationLoop(V),this.setAnimationLoop=function(O){z=O},this.dispose=function(){}}}function Fm(r){function e(g,p){g.fogColor.value.copy(p.color),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function t(g,p,E,T){p.isMeshBasicMaterial?n(g,p):p.isMeshLambertMaterial?(n(g,p),l(g,p)):p.isMeshToonMaterial?(n(g,p),h(g,p)):p.isMeshPhongMaterial?(n(g,p),c(g,p)):p.isMeshStandardMaterial?(n(g,p),p.isMeshPhysicalMaterial?d(g,p):u(g,p)):p.isMeshMatcapMaterial?(n(g,p),f(g,p)):p.isMeshDepthMaterial?(n(g,p),m(g,p)):p.isMeshDistanceMaterial?(n(g,p),v(g,p)):p.isMeshNormalMaterial?(n(g,p),x(g,p)):p.isLineBasicMaterial?(i(g,p),p.isLineDashedMaterial&&s(g,p)):p.isPointsMaterial?a(g,p,E,T):p.isSpriteMaterial?o(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function n(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map),p.alphaMap&&(g.alphaMap.value=p.alphaMap),p.specularMap&&(g.specularMap.value=p.specularMap);const E=r.get(p).envMap;if(E){g.envMap.value=E,g.flipEnvMap.value=E.isCubeTexture&&E._needsFlipEnvMap?-1:1,g.reflectivity.value=p.reflectivity,g.refractionRatio.value=p.refractionRatio;const _=r.get(E).__maxMipLevel;_!==void 0&&(g.maxMipLevel.value=_)}p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity);let T;p.map?T=p.map:p.specularMap?T=p.specularMap:p.displacementMap?T=p.displacementMap:p.normalMap?T=p.normalMap:p.bumpMap?T=p.bumpMap:p.roughnessMap?T=p.roughnessMap:p.metalnessMap?T=p.metalnessMap:p.alphaMap?T=p.alphaMap:p.emissiveMap?T=p.emissiveMap:p.clearcoatMap?T=p.clearcoatMap:p.clearcoatNormalMap?T=p.clearcoatNormalMap:p.clearcoatRoughnessMap&&(T=p.clearcoatRoughnessMap),T!==void 0&&(T.isWebGLRenderTarget&&(T=T.texture),T.matrixAutoUpdate===!0&&T.updateMatrix(),g.uvTransform.value.copy(T.matrix));let S;p.aoMap?S=p.aoMap:p.lightMap&&(S=p.lightMap),S!==void 0&&(S.isWebGLRenderTarget&&(S=S.texture),S.matrixAutoUpdate===!0&&S.updateMatrix(),g.uv2Transform.value.copy(S.matrix))}function i(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity}function s(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function a(g,p,E,T){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*E,g.scale.value=T*.5,p.map&&(g.map.value=p.map),p.alphaMap&&(g.alphaMap.value=p.alphaMap);let S;p.map?S=p.map:p.alphaMap&&(S=p.alphaMap),S!==void 0&&(S.matrixAutoUpdate===!0&&S.updateMatrix(),g.uvTransform.value.copy(S.matrix))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map),p.alphaMap&&(g.alphaMap.value=p.alphaMap);let E;p.map?E=p.map:p.alphaMap&&(E=p.alphaMap),E!==void 0&&(E.matrixAutoUpdate===!0&&E.updateMatrix(),g.uvTransform.value.copy(E.matrix))}function l(g,p){p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap)}function c(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap),p.bumpMap&&(g.bumpMap.value=p.bumpMap,g.bumpScale.value=p.bumpScale,p.side===ft&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,g.normalScale.value.copy(p.normalScale),p.side===ft&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias)}function h(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap),p.bumpMap&&(g.bumpMap.value=p.bumpMap,g.bumpScale.value=p.bumpScale,p.side===ft&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,g.normalScale.value.copy(p.normalScale),p.side===ft&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias)}function u(g,p){g.roughness.value=p.roughness,g.metalness.value=p.metalness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap),p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap),p.bumpMap&&(g.bumpMap.value=p.bumpMap,g.bumpScale.value=p.bumpScale,p.side===ft&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,g.normalScale.value.copy(p.normalScale),p.side===ft&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),r.get(p).envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function d(g,p){u(g,p),g.reflectivity.value=p.reflectivity,g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.sheen&&g.sheen.value.copy(p.sheen),p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap),p.clearcoatNormalMap&&(g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),g.clearcoatNormalMap.value=p.clearcoatNormalMap,p.side===ft&&g.clearcoatNormalScale.value.negate()),g.transmission.value=p.transmission,p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap)}function f(g,p){p.matcap&&(g.matcap.value=p.matcap),p.bumpMap&&(g.bumpMap.value=p.bumpMap,g.bumpScale.value=p.bumpScale,p.side===ft&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,g.normalScale.value.copy(p.normalScale),p.side===ft&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias)}function m(g,p){p.displacementMap&&(g.displacementMap.value=p.displacementMap,g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias)}function v(g,p){p.displacementMap&&(g.displacementMap.value=p.displacementMap,g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),g.referencePosition.value.copy(p.referencePosition),g.nearDistance.value=p.nearDistance,g.farDistance.value=p.farDistance}function x(g,p){p.bumpMap&&(g.bumpMap.value=p.bumpMap,g.bumpScale.value=p.bumpScale,p.side===ft&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,g.normalScale.value.copy(p.normalScale),p.side===ft&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias)}return{refreshFogUniforms:e,refreshMaterialUniforms:t}}function Bm(){const r=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");return r.style.display="block",r}function nt(r){r=r||{};const e=r.canvas!==void 0?r.canvas:Bm(),t=r.context!==void 0?r.context:null,n=r.alpha!==void 0?r.alpha:!1,i=r.depth!==void 0?r.depth:!0,s=r.stencil!==void 0?r.stencil:!0,a=r.antialias!==void 0?r.antialias:!1,o=r.premultipliedAlpha!==void 0?r.premultipliedAlpha:!0,l=r.preserveDrawingBuffer!==void 0?r.preserveDrawingBuffer:!1,c=r.powerPreference!==void 0?r.powerPreference:"default",h=r.failIfMajorPerformanceCaveat!==void 0?r.failIfMajorPerformanceCaveat:!1;let u=null,d=null;const f=[],m=[];this.domElement=e,this.debug={checkShaderErrors:!0},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.gammaFactor=2,this.outputEncoding=lr,this.physicallyCorrectLights=!1,this.toneMapping=Ji,this.toneMappingExposure=1;const v=this;let x=!1,g=0,p=0,E=null,T=-1,S=null;const _=new tt,P=new tt;let N=null,z=e.width,V=e.height,J=1,O=null,C=null;const I=new tt(0,0,z,V),R=new tt(0,0,z,V);let A=!1;const X=new ts;let ee=!1,Z=!1;const ae=new Le,te=new b,pe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function xe(){return E===null?J:1}let H=t;function Oe(y,F){for(let D=0;D<y.length;D++){const U=y[D],ue=e.getContext(U,F);if(ue!==null)return ue}return null}try{const y={alpha:n,depth:i,stencil:s,antialias:a,premultipliedAlpha:o,preserveDrawingBuffer:l,powerPreference:c,failIfMajorPerformanceCaveat:h};if(e.addEventListener("webglcontextlost",Me,!1),e.addEventListener("webglcontextrestored",ke,!1),H===null){const F=["webgl2","webgl","experimental-webgl"];if(v.isWebGL1Renderer===!0&&F.shift(),H=Oe(F,y),H===null)throw Oe(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}H.getShaderPrecisionFormat===void 0&&(H.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(y){throw console.error("THREE.WebGLRenderer: "+y.message),y}let Fe,we,ye,Ae,ge,_e,j,Q,K,ne,re,w,M,k,W,he,me,De,be,L,$,ie;function ve(){Fe=new rp(H),we=new tp(H,Fe,r),Fe.init(we),$=new Im(H,Fe,we),ye=new Rm(H,Fe,we),Ae=new op,ge=new xm,_e=new Pm(H,Fe,ye,ge,we,$,Ae),j=new ip(v),Q=new Lu(H,we),ie=new $f(H,Fe,Q,we),K=new sp(H,Q,Ae,ie),ne=new up(H,K,Q,Ae),De=new hp(H),W=new np(ge),re=new vm(v,j,Fe,we,ie,W),w=new Fm(ge),M=new Mm(ge),k=new Am(Fe,we),me=new Kf(v,j,ye,ne,o),he=new Rl(v,ne,we),be=new ep(H,Fe,Ae,we),L=new ap(H,Fe,Ae,we),Ae.programs=re.programs,v.capabilities=we,v.extensions=Fe,v.properties=ge,v.renderLists=M,v.shadowMap=he,v.state=ye,v.info=Ae}ve();const q=new Nm(v,H);this.xr=q,this.getContext=function(){return H},this.getContextAttributes=function(){return H.getContextAttributes()},this.forceContextLoss=function(){const y=Fe.get("WEBGL_lose_context");y&&y.loseContext()},this.forceContextRestore=function(){const y=Fe.get("WEBGL_lose_context");y&&y.restoreContext()},this.getPixelRatio=function(){return J},this.setPixelRatio=function(y){y!==void 0&&(J=y,this.setSize(z,V,!1))},this.getSize=function(y){return y===void 0&&(console.warn("WebGLRenderer: .getsize() now requires a Vector2 as an argument"),y=new se),y.set(z,V)},this.setSize=function(y,F,D){if(q.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}z=y,V=F,e.width=Math.floor(y*J),e.height=Math.floor(F*J),D!==!1&&(e.style.width=y+"px",e.style.height=F+"px"),this.setViewport(0,0,y,F)},this.getDrawingBufferSize=function(y){return y===void 0&&(console.warn("WebGLRenderer: .getdrawingBufferSize() now requires a Vector2 as an argument"),y=new se),y.set(z*J,V*J).floor()},this.setDrawingBufferSize=function(y,F,D){z=y,V=F,J=D,e.width=Math.floor(y*D),e.height=Math.floor(F*D),this.setViewport(0,0,y,F)},this.getCurrentViewport=function(y){return y===void 0&&(console.warn("WebGLRenderer: .getCurrentViewport() now requires a Vector4 as an argument"),y=new tt),y.copy(_)},this.getViewport=function(y){return y.copy(I)},this.setViewport=function(y,F,D,U){y.isVector4?I.set(y.x,y.y,y.z,y.w):I.set(y,F,D,U),ye.viewport(_.copy(I).multiplyScalar(J).floor())},this.getScissor=function(y){return y.copy(R)},this.setScissor=function(y,F,D,U){y.isVector4?R.set(y.x,y.y,y.z,y.w):R.set(y,F,D,U),ye.scissor(P.copy(R).multiplyScalar(J).floor())},this.getScissorTest=function(){return A},this.setScissorTest=function(y){ye.setScissorTest(A=y)},this.setOpaqueSort=function(y){O=y},this.setTransparentSort=function(y){C=y},this.getClearColor=function(y){return y===void 0&&(console.warn("WebGLRenderer: .getClearColor() now requires a Color as an argument"),y=new Te),y.copy(me.getClearColor())},this.setClearColor=function(){me.setClearColor.apply(me,arguments)},this.getClearAlpha=function(){return me.getClearAlpha()},this.setClearAlpha=function(){me.setClearAlpha.apply(me,arguments)},this.clear=function(y,F,D){let U=0;(y===void 0||y)&&(U|=16384),(F===void 0||F)&&(U|=256),(D===void 0||D)&&(U|=1024),H.clear(U)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",Me,!1),e.removeEventListener("webglcontextrestored",ke,!1),M.dispose(),k.dispose(),ge.dispose(),j.dispose(),ne.dispose(),ie.dispose(),q.dispose(),q.removeEventListener("sessionstart",xn),q.removeEventListener("sessionend",_n),We.stop()};function Me(y){y.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),x=!0}function ke(){console.log("THREE.WebGLRenderer: Context Restored."),x=!1;const y=Ae.autoReset,F=he.enabled,D=he.autoUpdate,U=he.needsUpdate,ue=he.type;ve(),Ae.autoReset=y,he.enabled=F,he.autoUpdate=D,he.needsUpdate=U,he.type=ue}function Je(y){const F=y.target;F.removeEventListener("dispose",Je),Dt(F)}function Dt(y){it(y),ge.remove(y)}function it(y){const F=ge.get(y).programs;F!==void 0&&F.forEach(function(D){re.releaseProgram(D)})}function St(y,F){y.render(function(D){v.renderBufferImmediate(D,F)})}this.renderBufferImmediate=function(y,F){ie.initAttributes();const D=ge.get(y);y.hasPositions&&!D.position&&(D.position=H.createBuffer()),y.hasNormals&&!D.normal&&(D.normal=H.createBuffer()),y.hasUvs&&!D.uv&&(D.uv=H.createBuffer()),y.hasColors&&!D.color&&(D.color=H.createBuffer());const U=F.getAttributes();y.hasPositions&&(H.bindBuffer(34962,D.position),H.bufferData(34962,y.positionArray,35048),ie.enableAttribute(U.position),H.vertexAttribPointer(U.position,3,5126,!1,0,0)),y.hasNormals&&(H.bindBuffer(34962,D.normal),H.bufferData(34962,y.normalArray,35048),ie.enableAttribute(U.normal),H.vertexAttribPointer(U.normal,3,5126,!1,0,0)),y.hasUvs&&(H.bindBuffer(34962,D.uv),H.bufferData(34962,y.uvArray,35048),ie.enableAttribute(U.uv),H.vertexAttribPointer(U.uv,2,5126,!1,0,0)),y.hasColors&&(H.bindBuffer(34962,D.color),H.bufferData(34962,y.colorArray,35048),ie.enableAttribute(U.color),H.vertexAttribPointer(U.color,3,5126,!1,0,0)),ie.disableUnusedAttributes(),H.drawArrays(4,0,y.count),y.count=0},this.renderBufferDirect=function(y,F,D,U,ue,He){F===null&&(F=pe);const Ce=ue.isMesh&&ue.matrixWorld.determinant()<0,Ie=Ft(y,F,U,ue);ye.setMaterial(U,Ce);let je=D.index;const Re=D.attributes.position;if(je===null){if(Re===void 0||Re.count===0)return}else if(je.count===0)return;let Xe=1;U.wireframe===!0&&(je=K.getWireframeAttribute(D),Xe=2),(U.morphTargets||U.morphNormals)&&De.update(ue,D,U,Ie),ie.setup(ue,U,Ie,D,je);let Pe,qe=be;je!==null&&(Pe=Q.get(je),qe=L,qe.setIndex(Pe));const Bt=je!==null?je.count:Re.count,gt=D.drawRange.start*Xe,tn=D.drawRange.count*Xe,ct=He!==null?He.start*Xe:0,nn=He!==null?He.count*Xe:1/0,$e=Math.max(gt,ct),Jn=Math.min(Bt,gt+tn,ct+nn)-1,_t=Math.max(0,Jn-$e+1);if(_t!==0){if(ue.isMesh)U.wireframe===!0?(ye.setLineWidth(U.wireframeLinewidth*xe()),qe.setMode(1)):qe.setMode(4);else if(ue.isLine){let Gt=U.linewidth;Gt===void 0&&(Gt=1),ye.setLineWidth(Gt*xe()),ue.isLineSegments?qe.setMode(1):ue.isLineLoop?qe.setMode(2):qe.setMode(3)}else ue.isPoints?qe.setMode(0):ue.isSprite&&qe.setMode(4);if(ue.isInstancedMesh)qe.renderInstances($e,_t,ue.count);else if(D.isInstancedBufferGeometry){const Gt=Math.min(D.instanceCount,D._maxInstanceCount);qe.renderInstances($e,_t,Gt)}else qe.render($e,_t)}},this.compile=function(y,F){d=k.get(y),d.init(),y.traverseVisible(function(D){D.isLight&&D.layers.test(F.layers)&&(d.pushLight(D),D.castShadow&&d.pushShadow(D))}),d.setupLights(),y.traverse(function(D){const U=D.material;if(U)if(Array.isArray(U))for(let ue=0;ue<U.length;ue++){const He=U[ue];Ht(He,y,D)}else Ht(U,y,D)})};let mt=null;function Zn(y){mt&&mt(y)}function xn(){We.stop()}function _n(){We.start()}const We=new xl;We.setAnimationLoop(Zn),typeof window<"u"&&We.setContext(window),this.setAnimationLoop=function(y){mt=y,q.setAnimationLoop(y),y===null?We.stop():We.start()},q.addEventListener("sessionstart",xn),q.addEventListener("sessionend",_n),this.render=function(y,F){let D,U;if(arguments[2]!==void 0&&(console.warn("THREE.WebGLRenderer.render(): the renderTarget argument has been removed. Use .setRenderTarget() instead."),D=arguments[2]),arguments[3]!==void 0&&(console.warn("THREE.WebGLRenderer.render(): the forceClear argument has been removed. Use .clear() instead."),U=arguments[3]),F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(x===!0)return;y.autoUpdate===!0&&y.updateMatrixWorld(),F.parent===null&&F.updateMatrixWorld(),q.enabled===!0&&q.isPresenting===!0&&(F=q.getCamera(F)),y.isScene===!0&&y.onBeforeRender(v,y,F,D||E),d=k.get(y,m.length),d.init(),m.push(d),ae.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),X.setFromProjectionMatrix(ae),Z=this.localClippingEnabled,ee=W.init(this.clippingPlanes,Z,F),u=M.get(y,f.length),u.init(),f.push(u),G(y,F,0,v.sortObjects),u.finish(),v.sortObjects===!0&&u.sort(O,C),ee===!0&&W.beginShadows();const ue=d.state.shadowsArray;he.render(ue,y,F),d.setupLights(),d.setupLightsView(F),ee===!0&&W.endShadows(),this.info.autoReset===!0&&this.info.reset(),D!==void 0&&this.setRenderTarget(D),me.render(u,y,F,U);const He=u.opaque,Ce=u.transparent;He.length>0&&Lt(He,y,F),Ce.length>0&&Lt(Ce,y,F),E!==null&&(_e.updateRenderTargetMipmap(E),_e.updateMultisampleRenderTarget(E)),y.isScene===!0&&y.onAfterRender(v,y,F),ye.buffers.depth.setTest(!0),ye.buffers.depth.setMask(!0),ye.buffers.color.setMask(!0),ye.setPolygonOffset(!1),ie.resetDefaultState(),T=-1,S=null,m.pop(),m.length>0?d=m[m.length-1]:d=null,f.pop(),f.length>0?u=f[f.length-1]:u=null};function G(y,F,D,U){if(y.visible===!1)return;if(y.layers.test(F.layers)){if(y.isGroup)D=y.renderOrder;else if(y.isLOD)y.autoUpdate===!0&&y.update(F);else if(y.isLight)d.pushLight(y),y.castShadow&&d.pushShadow(y);else if(y.isSprite){if(!y.frustumCulled||X.intersectsSprite(y)){U&&te.setFromMatrixPosition(y.matrixWorld).applyMatrix4(ae);const Ce=ne.update(y),Ie=y.material;Ie.visible&&u.push(y,Ce,Ie,D,te.z,null)}}else if(y.isImmediateRenderObject)U&&te.setFromMatrixPosition(y.matrixWorld).applyMatrix4(ae),u.push(y,null,y.material,D,te.z,null);else if((y.isMesh||y.isLine||y.isPoints)&&(y.isSkinnedMesh&&y.skeleton.frame!==Ae.render.frame&&(y.skeleton.update(),y.skeleton.frame=Ae.render.frame),!y.frustumCulled||X.intersectsObject(y))){U&&te.setFromMatrixPosition(y.matrixWorld).applyMatrix4(ae);const Ce=ne.update(y),Ie=y.material;if(Array.isArray(Ie)){const je=Ce.groups;for(let Re=0,Xe=je.length;Re<Xe;Re++){const Pe=je[Re],qe=Ie[Pe.materialIndex];qe&&qe.visible&&u.push(y,Ce,qe,D,te.z,Pe)}}else Ie.visible&&u.push(y,Ce,Ie,D,te.z,null)}}const He=y.children;for(let Ce=0,Ie=He.length;Ce<Ie;Ce++)G(He[Ce],F,D,U)}function Lt(y,F,D){const U=F.isScene===!0?F.overrideMaterial:null;for(let ue=0,He=y.length;ue<He;ue++){const Ce=y[ue],Ie=Ce.object,je=Ce.geometry,Re=U===null?Ce.material:U,Xe=Ce.group;if(D.isArrayCamera){const Pe=D.cameras;for(let qe=0,Bt=Pe.length;qe<Bt;qe++){const gt=Pe[qe];Ie.layers.test(gt.layers)&&(ye.viewport(_.copy(gt.viewport)),d.setupLightsView(gt),Yt(Ie,F,gt,je,Re,Xe))}}else Yt(Ie,F,D,je,Re,Xe)}}function Yt(y,F,D,U,ue,He){if(y.onBeforeRender(v,F,D,U,ue,He),y.modelViewMatrix.multiplyMatrices(D.matrixWorldInverse,y.matrixWorld),y.normalMatrix.getNormalMatrix(y.modelViewMatrix),y.isImmediateRenderObject){const Ce=Ft(D,F,ue,y);ye.setMaterial(ue),ie.reset(),St(y,Ce)}else v.renderBufferDirect(D,F,U,ue,y,He);y.onAfterRender(v,F,D,U,ue,He)}function Ht(y,F,D){F.isScene!==!0&&(F=pe);const U=ge.get(y),ue=d.state.lights,He=d.state.shadowsArray,Ce=ue.state.version,Ie=re.getParameters(y,ue.state,He,F,D),je=re.getProgramCacheKey(Ie);let Re=U.programs;U.environment=y.isMeshStandardMaterial?F.environment:null,U.fog=F.fog,U.envMap=j.get(y.envMap||U.environment),Re===void 0&&(y.addEventListener("dispose",Je),Re=new Map,U.programs=Re);let Xe=Re.get(je);if(Xe!==void 0){if(U.currentProgram===Xe&&U.lightsStateVersion===Ce)return yn(y,Ie),Xe}else Ie.uniforms=re.getUniforms(y),y.onBuild(Ie,v),y.onBeforeCompile(Ie,v),Xe=re.acquireProgram(Ie,je),Re.set(je,Xe),U.uniforms=Ie.uniforms;const Pe=U.uniforms;(!y.isShaderMaterial&&!y.isRawShaderMaterial||y.clipping===!0)&&(Pe.clippingPlanes=W.uniform),yn(y,Ie),U.needsLights=Bn(y),U.lightsStateVersion=Ce,U.needsLights&&(Pe.ambientLightColor.value=ue.state.ambient,Pe.lightProbe.value=ue.state.probe,Pe.directionalLights.value=ue.state.directional,Pe.directionalLightShadows.value=ue.state.directionalShadow,Pe.spotLights.value=ue.state.spot,Pe.spotLightShadows.value=ue.state.spotShadow,Pe.rectAreaLights.value=ue.state.rectArea,Pe.ltc_1.value=ue.state.rectAreaLTC1,Pe.ltc_2.value=ue.state.rectAreaLTC2,Pe.pointLights.value=ue.state.point,Pe.pointLightShadows.value=ue.state.pointShadow,Pe.hemisphereLights.value=ue.state.hemi,Pe.directionalShadowMap.value=ue.state.directionalShadowMap,Pe.directionalShadowMatrix.value=ue.state.directionalShadowMatrix,Pe.spotShadowMap.value=ue.state.spotShadowMap,Pe.spotShadowMatrix.value=ue.state.spotShadowMatrix,Pe.pointShadowMap.value=ue.state.pointShadowMap,Pe.pointShadowMatrix.value=ue.state.pointShadowMatrix);const qe=Xe.getUniforms(),Bt=Pn.seqWithValue(qe.seq,Pe);return U.currentProgram=Xe,U.uniformsList=Bt,Xe}function yn(y,F){const D=ge.get(y);D.outputEncoding=F.outputEncoding,D.instancing=F.instancing,D.numClippingPlanes=F.numClippingPlanes,D.numIntersection=F.numClipIntersection,D.vertexAlphas=F.vertexAlphas}function Ft(y,F,D,U){F.isScene!==!0&&(F=pe),_e.resetTextureUnits();const ue=F.fog,He=D.isMeshStandardMaterial?F.environment:null,Ce=E===null?v.outputEncoding:E.texture.encoding,Ie=j.get(D.envMap||He),je=D.vertexColors===!0&&U.geometry&&U.geometry.attributes.color&&U.geometry.attributes.color.itemSize===4,Re=ge.get(D),Xe=d.state.lights;if(ee===!0&&(Z===!0||y!==S)){const $e=y===S&&D.id===T;W.setState(D,y,$e)}let Pe=!1;D.version===Re.__version?(Re.needsLights&&Re.lightsStateVersion!==Xe.state.version||Re.outputEncoding!==Ce||U.isInstancedMesh&&Re.instancing===!1||!U.isInstancedMesh&&Re.instancing===!0||Re.envMap!==Ie||D.fog&&Re.fog!==ue||Re.numClippingPlanes!==void 0&&(Re.numClippingPlanes!==W.numPlanes||Re.numIntersection!==W.numIntersection)||Re.vertexAlphas!==je)&&(Pe=!0):(Pe=!0,Re.__version=D.version);let qe=Re.currentProgram;Pe===!0&&(qe=Ht(D,F,U));let Bt=!1,gt=!1,tn=!1;const ct=qe.getUniforms(),nn=Re.uniforms;if(ye.useProgram(qe.program)&&(Bt=!0,gt=!0,tn=!0),D.id!==T&&(T=D.id,gt=!0),Bt||S!==y){if(ct.setValue(H,"projectionMatrix",y.projectionMatrix),we.logarithmicDepthBuffer&&ct.setValue(H,"logDepthBufFC",2/(Math.log(y.far+1)/Math.LN2)),S!==y&&(S=y,gt=!0,tn=!0),D.isShaderMaterial||D.isMeshPhongMaterial||D.isMeshToonMaterial||D.isMeshStandardMaterial||D.envMap){const $e=ct.map.cameraPosition;$e!==void 0&&$e.setValue(H,te.setFromMatrixPosition(y.matrixWorld))}(D.isMeshPhongMaterial||D.isMeshToonMaterial||D.isMeshLambertMaterial||D.isMeshBasicMaterial||D.isMeshStandardMaterial||D.isShaderMaterial)&&ct.setValue(H,"isOrthographic",y.isOrthographicCamera===!0),(D.isMeshPhongMaterial||D.isMeshToonMaterial||D.isMeshLambertMaterial||D.isMeshBasicMaterial||D.isMeshStandardMaterial||D.isShaderMaterial||D.isShadowMaterial||D.skinning)&&ct.setValue(H,"viewMatrix",y.matrixWorldInverse)}if(D.skinning){ct.setOptional(H,U,"bindMatrix"),ct.setOptional(H,U,"bindMatrixInverse");const $e=U.skeleton;if($e){const Jn=$e.bones;if(we.floatVertexTextures){if($e.boneTexture===null){let _t=Math.sqrt(Jn.length*4);_t=lu(_t),_t=Math.max(_t,4);const Gt=new Float32Array(_t*_t*4);Gt.set($e.boneMatrices);const B=new vl(Gt,_t,_t,$t,Cn);$e.boneMatrices=Gt,$e.boneTexture=B,$e.boneTextureSize=_t}ct.setValue(H,"boneTexture",$e.boneTexture,_e),ct.setValue(H,"boneTextureSize",$e.boneTextureSize)}else ct.setOptional(H,$e,"boneMatrices")}}return(gt||Re.receiveShadow!==U.receiveShadow)&&(Re.receiveShadow=U.receiveShadow,ct.setValue(H,"receiveShadow",U.receiveShadow)),gt&&(ct.setValue(H,"toneMappingExposure",v.toneMappingExposure),Re.needsLights&&kt(nn,tn),ue&&D.fog&&w.refreshFogUniforms(nn,ue),w.refreshMaterialUniforms(nn,D,J,V),Pn.upload(H,Re.uniformsList,nn,_e)),D.isShaderMaterial&&D.uniformsNeedUpdate===!0&&(Pn.upload(H,Re.uniformsList,nn,_e),D.uniformsNeedUpdate=!1),D.isSpriteMaterial&&ct.setValue(H,"center",U.center),ct.setValue(H,"modelViewMatrix",U.modelViewMatrix),ct.setValue(H,"normalMatrix",U.normalMatrix),ct.setValue(H,"modelMatrix",U.matrixWorld),qe}function kt(y,F){y.ambientLightColor.needsUpdate=F,y.lightProbe.needsUpdate=F,y.directionalLights.needsUpdate=F,y.directionalLightShadows.needsUpdate=F,y.pointLights.needsUpdate=F,y.pointLightShadows.needsUpdate=F,y.spotLights.needsUpdate=F,y.spotLightShadows.needsUpdate=F,y.rectAreaLights.needsUpdate=F,y.hemisphereLights.needsUpdate=F}function Bn(y){return y.isMeshLambertMaterial||y.isMeshToonMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isShadowMaterial||y.isShaderMaterial&&y.lights===!0}this.getActiveCubeFace=function(){return g},this.getActiveMipmapLevel=function(){return p},this.getRenderTarget=function(){return E},this.setRenderTarget=function(y,F=0,D=0){E=y,g=F,p=D,y&&ge.get(y).__webglFramebuffer===void 0&&_e.setupRenderTarget(y);let U=null,ue=!1,He=!1;if(y){const Ce=y.texture;(Ce.isDataTexture3D||Ce.isDataTexture2DArray)&&(He=!0);const Ie=ge.get(y).__webglFramebuffer;y.isWebGLCubeRenderTarget?(U=Ie[F],ue=!0):y.isWebGLMultisampleRenderTarget?U=ge.get(y).__webglMultisampledFramebuffer:U=Ie,_.copy(y.viewport),P.copy(y.scissor),N=y.scissorTest}else _.copy(I).multiplyScalar(J).floor(),P.copy(R).multiplyScalar(J).floor(),N=A;if(ye.bindFramebuffer(36160,U),ye.viewport(_),ye.scissor(P),ye.setScissorTest(N),ue){const Ce=ge.get(y.texture);H.framebufferTexture2D(36160,36064,34069+F,Ce.__webglTexture,D)}else if(He){const Ce=ge.get(y.texture),Ie=F||0;H.framebufferTextureLayer(36160,36064,Ce.__webglTexture,D||0,Ie)}},this.readRenderTargetPixels=function(y,F,D,U,ue,He,Ce){if(!(y&&y.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ie=ge.get(y).__webglFramebuffer;if(y.isWebGLCubeRenderTarget&&Ce!==void 0&&(Ie=Ie[Ce]),Ie){ye.bindFramebuffer(36160,Ie);try{const je=y.texture,Re=je.format,Xe=je.type;if(Re!==$t&&$.convert(Re)!==H.getParameter(35739)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const Pe=Xe===Vr&&(Fe.has("EXT_color_buffer_half_float")||we.isWebGL2&&Fe.has("EXT_color_buffer_float"));if(Xe!==ua&&$.convert(Xe)!==H.getParameter(35738)&&!(Xe===Cn&&(we.isWebGL2||Fe.has("OES_texture_float")||Fe.has("WEBGL_color_buffer_float")))&&!Pe){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H.checkFramebufferStatus(36160)===36053?F>=0&&F<=y.width-U&&D>=0&&D<=y.height-ue&&H.readPixels(F,D,U,ue,$.convert(Re),$.convert(Xe),He):console.error("THREE.WebGLRenderer.readRenderTargetPixels: readPixels from renderTarget failed. Framebuffer not complete.")}finally{const je=E!==null?ge.get(E).__webglFramebuffer:null;ye.bindFramebuffer(36160,je)}}},this.copyFramebufferToTexture=function(y,F,D=0){const U=Math.pow(2,-D),ue=Math.floor(F.image.width*U),He=Math.floor(F.image.height*U),Ce=$.convert(F.format);_e.setTexture2D(F,0),H.copyTexImage2D(3553,D,Ce,y.x,y.y,ue,He,0),ye.unbindTexture()},this.copyTextureToTexture=function(y,F,D,U=0){const ue=F.image.width,He=F.image.height,Ce=$.convert(D.format),Ie=$.convert(D.type);_e.setTexture2D(D,0),H.pixelStorei(37440,D.flipY),H.pixelStorei(37441,D.premultiplyAlpha),H.pixelStorei(3317,D.unpackAlignment),F.isDataTexture?H.texSubImage2D(3553,U,y.x,y.y,ue,He,Ce,Ie,F.image.data):F.isCompressedTexture?H.compressedTexSubImage2D(3553,U,y.x,y.y,F.mipmaps[0].width,F.mipmaps[0].height,Ce,F.mipmaps[0].data):H.texSubImage2D(3553,U,y.x,y.y,Ce,Ie,F.image),U===0&&D.generateMipmaps&&H.generateMipmap(3553),ye.unbindTexture()},this.copyTextureToTexture3D=function(y,F,D,U,ue=0){if(v.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const{width:He,height:Ce,data:Ie}=D.image,je=$.convert(U.format),Re=$.convert(U.type);let Xe;if(U.isDataTexture3D)_e.setTexture3D(U,0),Xe=32879;else if(U.isDataTexture2DArray)_e.setTexture2DArray(U,0),Xe=35866;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}H.pixelStorei(37440,U.flipY),H.pixelStorei(37441,U.premultiplyAlpha),H.pixelStorei(3317,U.unpackAlignment);const Pe=H.getParameter(3314),qe=H.getParameter(32878),Bt=H.getParameter(3316),gt=H.getParameter(3315),tn=H.getParameter(32877);H.pixelStorei(3314,He),H.pixelStorei(32878,Ce),H.pixelStorei(3316,y.min.x),H.pixelStorei(3315,y.min.y),H.pixelStorei(32877,y.min.z),H.texSubImage3D(Xe,ue,F.x,F.y,F.z,y.max.x-y.min.x+1,y.max.y-y.min.y+1,y.max.z-y.min.z+1,je,Re,Ie),H.pixelStorei(3314,Pe),H.pixelStorei(32878,qe),H.pixelStorei(3316,Bt),H.pixelStorei(3315,gt),H.pixelStorei(32877,tn),ue===0&&U.generateMipmaps&&H.generateMipmap(Xe),ye.unbindTexture()},this.initTexture=function(y){_e.setTexture2D(y,0),ye.unbindTexture()},this.resetState=function(){g=0,p=0,E=null,ye.reset(),ie.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}class zm extends nt{}zm.prototype.isWebGL1Renderer=!0;class ga extends Ze{constructor(){super(),this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.overrideMaterial=null,this.autoUpdate=!0,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.autoUpdate=e.autoUpdate,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.background!==null&&(t.object.background=this.background.toJSON(e)),this.environment!==null&&(t.object.environment=this.environment.toJSON(e)),this.fog!==null&&(t.object.fog=this.fog.toJSON()),t}}ga.prototype.isScene=!0;class jn{constructor(e,t){this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=tr,this.updateRange={offset:0,count:-1},this.version=0,this.uuid=on(),this.onUploadCallback=function(){}}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,s=this.stride;i<s;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=on()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new jn(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=on()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.prototype.slice.call(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}jn.prototype.isInterleavedBuffer=!0;const ut=new b;class nr{constructor(e,t,n,i){this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i===!0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)ut.x=this.getX(t),ut.y=this.getY(t),ut.z=this.getZ(t),ut.applyMatrix4(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ut.x=this.getX(t),ut.y=this.getY(t),ut.z=this.getZ(t),ut.applyNormalMatrix(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ut.x=this.getX(t),ut.y=this.getY(t),ut.z=this.getZ(t),ut.transformDirection(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}setX(e,t){return this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){return this.data.array[e*this.data.stride+this.offset]}getY(e){return this.data.array[e*this.data.stride+this.offset+1]}getZ(e){return this.data.array[e*this.data.stride+this.offset+2]}getW(e){return this.data.array[e*this.data.stride+this.offset+3]}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e=e*this.data.stride+this.offset,this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interlaved buffer attribute will deinterleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[i+s])}return new dt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new nr(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interlaved buffer attribute will deinterleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[i+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}nr.prototype.isInterleavedBufferAttribute=!0;class Il extends xt{constructor(e){super(),this.type="SpriteMaterial",this.color=new Te(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this}}Il.prototype.isSpriteMaterial=!0;let ui;const Hi=new b,di=new b,fi=new b,pi=new se,ki=new se,Dl=new Le,Lr=new b,Gi=new b,Cr=new b,To=new se,Bs=new se,Ao=new se;class Om extends Ze{constructor(e){if(super(),this.type="Sprite",ui===void 0){ui=new Ye;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new jn(t,5);ui.setIndex([0,1,2,0,2,3]),ui.setAttribute("position",new nr(n,3,0,!1)),ui.setAttribute("uv",new nr(n,2,3,!1))}this.geometry=ui,this.material=e!==void 0?e:new Il,this.center=new se(.5,.5)}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),di.setFromMatrixScale(this.matrixWorld),Dl.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),fi.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&di.multiplyScalar(-fi.z);const n=this.material.rotation;let i,s;n!==0&&(s=Math.cos(n),i=Math.sin(n));const a=this.center;Rr(Lr.set(-.5,-.5,0),fi,a,di,i,s),Rr(Gi.set(.5,-.5,0),fi,a,di,i,s),Rr(Cr.set(.5,.5,0),fi,a,di,i,s),To.set(0,0),Bs.set(1,0),Ao.set(1,1);let o=e.ray.intersectTriangle(Lr,Gi,Cr,!1,Hi);if(o===null&&(Rr(Gi.set(-.5,.5,0),fi,a,di,i,s),Bs.set(0,1),o=e.ray.intersectTriangle(Lr,Cr,Gi,!1,Hi),o===null))return;const l=e.ray.origin.distanceTo(Hi);l<e.near||l>e.far||t.push({distance:l,point:Hi.clone(),uv:pt.getUV(Hi,Lr,Gi,Cr,To,Bs,Ao,new se),face:null,object:this})}copy(e){return super.copy(e),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}Om.prototype.isSprite=!0;function Rr(r,e,t,n,i,s){pi.subVectors(r,t).addScalar(.5).multiply(n),i!==void 0?(ki.x=s*pi.x-i*pi.y,ki.y=i*pi.x+s*pi.y):ki.copy(pi),r.copy(e),r.x+=ki.x,r.y+=ki.y,r.applyMatrix4(Dl)}const Lo=new b,Co=new tt,Ro=new tt,Um=new b,Po=new Le;class Nl extends Mt{constructor(e,t){super(e,t),this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new Le,this.bindMatrixInverse=new Le}copy(e){return super.copy(e),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,this}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new tt,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.x=t.getX(n),e.y=t.getY(n),e.z=t.getZ(n),e.w=t.getW(n);const s=1/e.manhattanLength();s!==1/0?e.multiplyScalar(s):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode==="attached"?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode==="detached"?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}boneTransform(e,t){const n=this.skeleton,i=this.geometry;Co.fromBufferAttribute(i.attributes.skinIndex,e),Ro.fromBufferAttribute(i.attributes.skinWeight,e),Lo.fromBufferAttribute(i.attributes.position,e).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let s=0;s<4;s++){const a=Ro.getComponent(s);if(a!==0){const o=Co.getComponent(s);Po.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(Um.copy(Lo).applyMatrix4(Po),a)}}return t.applyMatrix4(this.bindMatrixInverse)}}Nl.prototype.isSkinnedMesh=!0;class Hm extends Ze{constructor(){super(),this.type="Bone"}}Hm.prototype.isBone=!0;const Io=new Le,Do=new Le,Pr=[],Vi=new Mt;class km extends Mt{constructor(e,t,n){super(e,t),this.instanceMatrix=new dt(new Float32Array(n*16),16),this.instanceColor=null,this.count=n,this.frustumCulled=!1}copy(e){return super.copy(e),this.instanceMatrix.copy(e.instanceMatrix),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}raycast(e,t){const n=this.matrixWorld,i=this.count;if(Vi.geometry=this.geometry,Vi.material=this.material,Vi.material!==void 0)for(let s=0;s<i;s++){this.getMatrixAt(s,Io),Do.multiplyMatrices(n,Io),Vi.matrixWorld=Do,Vi.raycast(e,Pr);for(let a=0,o=Pr.length;a<o;a++){const l=Pr[a];l.instanceId=s,l.object=this,t.push(l)}Pr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new dt(new Float32Array(this.count*3),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"})}}km.prototype.isInstancedMesh=!0;class Pi extends xt{constructor(e){super(),this.type="LineBasicMaterial",this.color=new Te(16777215),this.linewidth=1,this.linecap="round",this.linejoin="round",this.morphTargets=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.morphTargets=e.morphTargets,this}}Pi.prototype.isLineBasicMaterial=!0;const No=new b,Fo=new b,Bo=new Le,zs=new Yn,Ir=new Li;class va extends Ze{constructor(e=new Ye,t=new Pi){super(),this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e){return super.copy(e),this.material=e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.isBufferGeometry)if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)No.fromBufferAttribute(t,i-1),Fo.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=No.distanceTo(Fo);e.setAttribute("lineDistance",new rt(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");else e.isGeometry&&console.error("THREE.Line.computeLineDistances() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ir.copy(n.boundingSphere),Ir.applyMatrix4(i),Ir.radius+=s,e.ray.intersectsSphere(Ir)===!1)return;Bo.copy(i).invert(),zs.copy(e.ray).applyMatrix4(Bo);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=new b,h=new b,u=new b,d=new b,f=this.isLineSegments?2:1;if(n.isBufferGeometry){const m=n.index,x=n.attributes.position;if(m!==null){const g=Math.max(0,a.start),p=Math.min(m.count,a.start+a.count);for(let E=g,T=p-1;E<T;E+=f){const S=m.getX(E),_=m.getX(E+1);if(c.fromBufferAttribute(x,S),h.fromBufferAttribute(x,_),zs.distanceSqToSegment(c,h,d,u)>l)continue;d.applyMatrix4(this.matrixWorld);const N=e.ray.origin.distanceTo(d);N<e.near||N>e.far||t.push({distance:N,point:u.clone().applyMatrix4(this.matrixWorld),index:E,face:null,faceIndex:null,object:this})}}else{const g=Math.max(0,a.start),p=Math.min(x.count,a.start+a.count);for(let E=g,T=p-1;E<T;E+=f){if(c.fromBufferAttribute(x,E),h.fromBufferAttribute(x,E+1),zs.distanceSqToSegment(c,h,d,u)>l)continue;d.applyMatrix4(this.matrixWorld);const _=e.ray.origin.distanceTo(d);_<e.near||_>e.far||t.push({distance:_,point:u.clone().applyMatrix4(this.matrixWorld),index:E,face:null,faceIndex:null,object:this})}}}else n.isGeometry&&console.error("THREE.Line.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}updateMorphTargets(){const e=this.geometry;if(e.isBufferGeometry){const t=e.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){const o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}else{const t=e.morphTargets;t!==void 0&&t.length>0&&console.error("THREE.Line.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.")}}}va.prototype.isLine=!0;const zo=new b,Oo=new b;class xa extends va{constructor(e,t){super(e,t),this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.isBufferGeometry)if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,s=t.count;i<s;i+=2)zo.fromBufferAttribute(t,i),Oo.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+zo.distanceTo(Oo);e.setAttribute("lineDistance",new rt(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");else e.isGeometry&&console.error("THREE.LineSegments.computeLineDistances() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.");return this}}xa.prototype.isLineSegments=!0;class Fl extends va{constructor(e,t){super(e,t),this.type="LineLoop"}}Fl.prototype.isLineLoop=!0;class jr extends xt{constructor(e){super(),this.type="PointsMaterial",this.color=new Te(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.morphTargets=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.morphTargets=e.morphTargets,this}}jr.prototype.isPointsMaterial=!0;const Uo=new Le,$s=new Yn,Dr=new Li,Nr=new b;class ea extends Ze{constructor(e=new Ye,t=new jr){super(),this.type="Points",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e){return super.copy(e),this.material=e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Dr.copy(n.boundingSphere),Dr.applyMatrix4(i),Dr.radius+=s,e.ray.intersectsSphere(Dr)===!1)return;Uo.copy(i).invert(),$s.copy(e.ray).applyMatrix4(Uo);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o;if(n.isBufferGeometry){const c=n.index,u=n.attributes.position;if(c!==null){const d=Math.max(0,a.start),f=Math.min(c.count,a.start+a.count);for(let m=d,v=f;m<v;m++){const x=c.getX(m);Nr.fromBufferAttribute(u,x),Ho(Nr,x,l,i,e,t,this)}}else{const d=Math.max(0,a.start),f=Math.min(u.count,a.start+a.count);for(let m=d,v=f;m<v;m++)Nr.fromBufferAttribute(u,m),Ho(Nr,m,l,i,e,t,this)}}else console.error("THREE.Points.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}updateMorphTargets(){const e=this.geometry;if(e.isBufferGeometry){const t=e.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){const o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}else{const t=e.morphTargets;t!==void 0&&t.length>0&&console.error("THREE.Points.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.")}}}ea.prototype.isPoints=!0;function Ho(r,e,t,n,i,s,a){const o=$s.distanceSqToPoint(r);if(o<t){const l=new b;$s.closestPointToPoint(r,l),l.applyMatrix4(n);const c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;s.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,object:a})}}class Gm extends bt{constructor(e,t,n,i,s,a,o,l,c){super(e,t,n,i,s,a,o,l,c),this.format=o!==void 0?o:Vn,this.minFilter=a!==void 0?a:Wt,this.magFilter=s!==void 0?s:Wt,this.generateMipmaps=!1;const h=this;function u(){h.needsUpdate=!0,e.requestVideoFrameCallback(u)}"requestVideoFrameCallback"in e&&e.requestVideoFrameCallback(u)}clone(){return new this.constructor(this.image).copy(this)}update(){const e=this.image;"requestVideoFrameCallback"in e===!1&&e.readyState>=e.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}}Gm.prototype.isVideoTexture=!0;class Vm extends bt{constructor(e,t,n,i,s,a,o,l,c,h,u,d){super(null,a,o,l,c,h,i,s,u,d),this.image={width:t,height:n},this.mipmaps=e,this.flipY=!1,this.generateMipmaps=!1}}Vm.prototype.isCompressedTexture=!0;class Wm extends bt{constructor(e,t,n,i,s,a,o,l,c){super(e,t,n,i,s,a,o,l,c),this.needsUpdate=!0}}Wm.prototype.isCanvasTexture=!0;class Xm extends bt{constructor(e,t,n,i,s,a,o,l,c,h){if(h=h!==void 0?h:Mi,h!==Mi&&h!==er)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===Mi&&(n=Gr),n===void 0&&h===er&&(n=Qi),super(null,i,s,a,o,l,h,n,c),this.image={width:e,height:t},this.magFilter=o!==void 0?o:Rt,this.minFilter=l!==void 0?l:Rt,this.flipY=!1,this.generateMipmaps=!1}}Xm.prototype.isDepthTexture=!0;const qm={triangulate:function(r,e,t){t=t||2;const n=e&&e.length,i=n?e[0]*t:r.length;let s=Bl(r,0,i,t,!0);const a=[];if(!s||s.next===s.prev)return a;let o,l,c,h,u,d,f;if(n&&(s=Qm(r,e,s,t)),r.length>80*t){o=c=r[0],l=h=r[1];for(let m=t;m<i;m+=t)u=r[m],d=r[m+1],u<o&&(o=u),d<l&&(l=d),u>c&&(c=u),d>h&&(h=d);f=Math.max(c-o,h-l),f=f!==0?1/f:0}return ir(s,a,t,o,l,f),a}};function Bl(r,e,t,n,i){let s,a;if(i===lg(r,e,t,n)>0)for(s=e;s<t;s+=n)a=ko(s,r[s],r[s+1],a);else for(s=t-n;s>=e;s-=n)a=ko(s,r[s],r[s+1],a);return a&&ns(a,a.next)&&(sr(a),a=a.next),a}function Dn(r,e){if(!r)return r;e||(e=r);let t=r,n;do if(n=!1,!t.steiner&&(ns(t,t.next)||lt(t.prev,t,t.next)===0)){if(sr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function ir(r,e,t,n,i,s,a){if(!r)return;!a&&s&&ng(r,n,i,s);let o=r,l,c;for(;r.prev!==r.next;){if(l=r.prev,c=r.next,s?jm(r,n,i,s):Ym(r)){e.push(l.i/t),e.push(r.i/t),e.push(c.i/t),sr(r),r=c.next,o=c.next;continue}if(r=c,r===o){a?a===1?(r=Zm(Dn(r),e,t),ir(r,e,t,n,i,s,2)):a===2&&Jm(r,e,t,n,i,s):ir(Dn(r),e,t,n,i,s,1);break}}}function Ym(r){const e=r.prev,t=r,n=r.next;if(lt(e,t,n)>=0)return!1;let i=r.next.next;for(;i!==r.prev;){if(yi(e.x,e.y,t.x,t.y,n.x,n.y,i.x,i.y)&&lt(i.prev,i,i.next)>=0)return!1;i=i.next}return!0}function jm(r,e,t,n){const i=r.prev,s=r,a=r.next;if(lt(i,s,a)>=0)return!1;const o=i.x<s.x?i.x<a.x?i.x:a.x:s.x<a.x?s.x:a.x,l=i.y<s.y?i.y<a.y?i.y:a.y:s.y<a.y?s.y:a.y,c=i.x>s.x?i.x>a.x?i.x:a.x:s.x>a.x?s.x:a.x,h=i.y>s.y?i.y>a.y?i.y:a.y:s.y>a.y?s.y:a.y,u=ta(o,l,e,t,n),d=ta(c,h,e,t,n);let f=r.prevZ,m=r.nextZ;for(;f&&f.z>=u&&m&&m.z<=d;){if(f!==r.prev&&f!==r.next&&yi(i.x,i.y,s.x,s.y,a.x,a.y,f.x,f.y)&&lt(f.prev,f,f.next)>=0||(f=f.prevZ,m!==r.prev&&m!==r.next&&yi(i.x,i.y,s.x,s.y,a.x,a.y,m.x,m.y)&&lt(m.prev,m,m.next)>=0))return!1;m=m.nextZ}for(;f&&f.z>=u;){if(f!==r.prev&&f!==r.next&&yi(i.x,i.y,s.x,s.y,a.x,a.y,f.x,f.y)&&lt(f.prev,f,f.next)>=0)return!1;f=f.prevZ}for(;m&&m.z<=d;){if(m!==r.prev&&m!==r.next&&yi(i.x,i.y,s.x,s.y,a.x,a.y,m.x,m.y)&&lt(m.prev,m,m.next)>=0)return!1;m=m.nextZ}return!0}function Zm(r,e,t){let n=r;do{const i=n.prev,s=n.next.next;!ns(i,s)&&zl(i,n,n.next,s)&&rr(i,s)&&rr(s,i)&&(e.push(i.i/t),e.push(n.i/t),e.push(s.i/t),sr(n),sr(n.next),n=r=s),n=n.next}while(n!==r);return Dn(n)}function Jm(r,e,t,n,i,s){let a=r;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&sg(a,o)){let l=Ol(a,o);a=Dn(a,a.next),l=Dn(l,l.next),ir(a,e,t,n,i,s),ir(l,e,t,n,i,s);return}o=o.next}a=a.next}while(a!==r)}function Qm(r,e,t,n){const i=[];let s,a,o,l,c;for(s=0,a=e.length;s<a;s++)o=e[s]*n,l=s<a-1?e[s+1]*n:r.length,c=Bl(r,o,l,n,!1),c===c.next&&(c.steiner=!0),i.push(rg(c));for(i.sort(Km),s=0;s<i.length;s++)$m(i[s],t),t=Dn(t,t.next);return t}function Km(r,e){return r.x-e.x}function $m(r,e){if(e=eg(r,e),e){const t=Ol(e,r);Dn(e,e.next),Dn(t,t.next)}}function eg(r,e){let t=e;const n=r.x,i=r.y;let s=-1/0,a;do{if(i<=t.y&&i>=t.next.y&&t.next.y!==t.y){const d=t.x+(i-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>s){if(s=d,d===n){if(i===t.y)return t;if(i===t.next.y)return t.next}a=t.x<t.next.x?t:t.next}}t=t.next}while(t!==e);if(!a)return null;if(n===s)return a;const o=a,l=a.x,c=a.y;let h=1/0,u;t=a;do n>=t.x&&t.x>=l&&n!==t.x&&yi(i<c?n:s,i,l,c,i<c?s:n,i,t.x,t.y)&&(u=Math.abs(i-t.y)/(n-t.x),rr(t,r)&&(u<h||u===h&&(t.x>a.x||t.x===a.x&&tg(a,t)))&&(a=t,h=u)),t=t.next;while(t!==o);return a}function tg(r,e){return lt(r.prev,r,e.prev)<0&&lt(e.next,r,r.next)<0}function ng(r,e,t,n){let i=r;do i.z===null&&(i.z=ta(i.x,i.y,e,t,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==r);i.prevZ.nextZ=null,i.prevZ=null,ig(i)}function ig(r){let e,t,n,i,s,a,o,l,c=1;do{for(t=r,r=null,s=null,a=0;t;){for(a++,n=t,o=0,e=0;e<c&&(o++,n=n.nextZ,!!n);e++);for(l=c;o>0||l>0&&n;)o!==0&&(l===0||!n||t.z<=n.z)?(i=t,t=t.nextZ,o--):(i=n,n=n.nextZ,l--),s?s.nextZ=i:r=i,i.prevZ=s,s=i;t=n}s.nextZ=null,c*=2}while(a>1);return r}function ta(r,e,t,n,i){return r=32767*(r-t)*i,e=32767*(e-n)*i,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,r|e<<1}function rg(r){let e=r,t=r;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==r);return t}function yi(r,e,t,n,i,s,a,o){return(i-a)*(e-o)-(r-a)*(s-o)>=0&&(r-a)*(n-o)-(t-a)*(e-o)>=0&&(t-a)*(s-o)-(i-a)*(n-o)>=0}function sg(r,e){return r.next.i!==e.i&&r.prev.i!==e.i&&!ag(r,e)&&(rr(r,e)&&rr(e,r)&&og(r,e)&&(lt(r.prev,r,e.prev)||lt(r,e.prev,e))||ns(r,e)&&lt(r.prev,r,r.next)>0&&lt(e.prev,e,e.next)>0)}function lt(r,e,t){return(e.y-r.y)*(t.x-e.x)-(e.x-r.x)*(t.y-e.y)}function ns(r,e){return r.x===e.x&&r.y===e.y}function zl(r,e,t,n){const i=Br(lt(r,e,t)),s=Br(lt(r,e,n)),a=Br(lt(t,n,r)),o=Br(lt(t,n,e));return!!(i!==s&&a!==o||i===0&&Fr(r,t,e)||s===0&&Fr(r,n,e)||a===0&&Fr(t,r,n)||o===0&&Fr(t,e,n))}function Fr(r,e,t){return e.x<=Math.max(r.x,t.x)&&e.x>=Math.min(r.x,t.x)&&e.y<=Math.max(r.y,t.y)&&e.y>=Math.min(r.y,t.y)}function Br(r){return r>0?1:r<0?-1:0}function ag(r,e){let t=r;do{if(t.i!==r.i&&t.next.i!==r.i&&t.i!==e.i&&t.next.i!==e.i&&zl(t,t.next,r,e))return!0;t=t.next}while(t!==r);return!1}function rr(r,e){return lt(r.prev,r,r.next)<0?lt(r,e,r.next)>=0&&lt(r,r.prev,e)>=0:lt(r,e,r.prev)<0||lt(r,r.next,e)<0}function og(r,e){let t=r,n=!1;const i=(r.x+e.x)/2,s=(r.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&i<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==r);return n}function Ol(r,e){const t=new na(r.i,r.x,r.y),n=new na(e.i,e.x,e.y),i=r.next,s=e.prev;return r.next=e,e.prev=r,t.next=i,i.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function ko(r,e,t,n){const i=new na(r,e,t);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function sr(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function na(r,e,t){this.i=r,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=null,this.prevZ=null,this.nextZ=null,this.steiner=!1}function lg(r,e,t,n){let i=0;for(let s=e,a=t-n;s<t;s+=n)i+=(r[a]-r[s])*(r[s+1]+r[a+1]),a=s;return i}class In{static area(e){const t=e.length;let n=0;for(let i=t-1,s=0;s<t;i=s++)n+=e[i].x*e[s].y-e[s].x*e[i].y;return n*.5}static isClockWise(e){return In.area(e)<0}static triangulateShape(e,t){const n=[],i=[],s=[];Go(e),Vo(n,e);let a=e.length;t.forEach(Go);for(let l=0;l<t.length;l++)i.push(a),a+=t[l].length,Vo(n,t[l]);const o=qm.triangulate(n,i);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}}function Go(r){const e=r.length;e>2&&r[e-1].equals(r[0])&&r.pop()}function Vo(r,e){for(let t=0;t<e.length;t++)r.push(e[t].x),r.push(e[t].y)}class is extends Ye{constructor(e,t){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const n=this,i=[],s=[];for(let o=0,l=e.length;o<l;o++){const c=e[o];a(c)}this.setAttribute("position",new rt(i,3)),this.setAttribute("uv",new rt(s,2)),this.computeVertexNormals();function a(o){const l=[],c=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1;let u=t.depth!==void 0?t.depth:100,d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:6,m=t.bevelSize!==void 0?t.bevelSize:f-2,v=t.bevelOffset!==void 0?t.bevelOffset:0,x=t.bevelSegments!==void 0?t.bevelSegments:3;const g=t.extrudePath,p=t.UVGenerator!==void 0?t.UVGenerator:cg;t.amount!==void 0&&(console.warn("THREE.ExtrudeBufferGeometry: amount has been renamed to depth."),u=t.amount);let E,T=!1,S,_,P,N;g&&(E=g.getSpacedPoints(h),T=!0,d=!1,S=g.computeFrenetFrames(h,!1),_=new b,P=new b,N=new b),d||(x=0,f=0,m=0,v=0);const z=o.extractPoints(c);let V=z.shape;const J=z.holes;if(!In.isClockWise(V)){V=V.reverse();for(let j=0,Q=J.length;j<Q;j++){const K=J[j];In.isClockWise(K)&&(J[j]=K.reverse())}}const C=In.triangulateShape(V,J),I=V;for(let j=0,Q=J.length;j<Q;j++){const K=J[j];V=V.concat(K)}function R(j,Q,K){return Q||console.error("THREE.ExtrudeGeometry: vec does not exist"),Q.clone().multiplyScalar(K).add(j)}const A=V.length,X=C.length;function ee(j,Q,K){let ne,re,w;const M=j.x-Q.x,k=j.y-Q.y,W=K.x-j.x,he=K.y-j.y,me=M*M+k*k,De=M*he-k*W;if(Math.abs(De)>Number.EPSILON){const be=Math.sqrt(me),L=Math.sqrt(W*W+he*he),$=Q.x-k/be,ie=Q.y+M/be,ve=K.x-he/L,q=K.y+W/L,Me=((ve-$)*he-(q-ie)*W)/(M*he-k*W);ne=$+M*Me-j.x,re=ie+k*Me-j.y;const ke=ne*ne+re*re;if(ke<=2)return new se(ne,re);w=Math.sqrt(ke/2)}else{let be=!1;M>Number.EPSILON?W>Number.EPSILON&&(be=!0):M<-Number.EPSILON?W<-Number.EPSILON&&(be=!0):Math.sign(k)===Math.sign(he)&&(be=!0),be?(ne=-k,re=M,w=Math.sqrt(me)):(ne=M,re=k,w=Math.sqrt(me/2))}return new se(ne/w,re/w)}const Z=[];for(let j=0,Q=I.length,K=Q-1,ne=j+1;j<Q;j++,K++,ne++)K===Q&&(K=0),ne===Q&&(ne=0),Z[j]=ee(I[j],I[K],I[ne]);const ae=[];let te,pe=Z.concat();for(let j=0,Q=J.length;j<Q;j++){const K=J[j];te=[];for(let ne=0,re=K.length,w=re-1,M=ne+1;ne<re;ne++,w++,M++)w===re&&(w=0),M===re&&(M=0),te[ne]=ee(K[ne],K[w],K[M]);ae.push(te),pe=pe.concat(te)}for(let j=0;j<x;j++){const Q=j/x,K=f*Math.cos(Q*Math.PI/2),ne=m*Math.sin(Q*Math.PI/2)+v;for(let re=0,w=I.length;re<w;re++){const M=R(I[re],Z[re],ne);we(M.x,M.y,-K)}for(let re=0,w=J.length;re<w;re++){const M=J[re];te=ae[re];for(let k=0,W=M.length;k<W;k++){const he=R(M[k],te[k],ne);we(he.x,he.y,-K)}}}const xe=m+v;for(let j=0;j<A;j++){const Q=d?R(V[j],pe[j],xe):V[j];T?(P.copy(S.normals[0]).multiplyScalar(Q.x),_.copy(S.binormals[0]).multiplyScalar(Q.y),N.copy(E[0]).add(P).add(_),we(N.x,N.y,N.z)):we(Q.x,Q.y,0)}for(let j=1;j<=h;j++)for(let Q=0;Q<A;Q++){const K=d?R(V[Q],pe[Q],xe):V[Q];T?(P.copy(S.normals[j]).multiplyScalar(K.x),_.copy(S.binormals[j]).multiplyScalar(K.y),N.copy(E[j]).add(P).add(_),we(N.x,N.y,N.z)):we(K.x,K.y,u/h*j)}for(let j=x-1;j>=0;j--){const Q=j/x,K=f*Math.cos(Q*Math.PI/2),ne=m*Math.sin(Q*Math.PI/2)+v;for(let re=0,w=I.length;re<w;re++){const M=R(I[re],Z[re],ne);we(M.x,M.y,u+K)}for(let re=0,w=J.length;re<w;re++){const M=J[re];te=ae[re];for(let k=0,W=M.length;k<W;k++){const he=R(M[k],te[k],ne);T?we(he.x,he.y+E[h-1].y,E[h-1].x+K):we(he.x,he.y,u+K)}}}H(),Oe();function H(){const j=i.length/3;if(d){let Q=0,K=A*Q;for(let ne=0;ne<X;ne++){const re=C[ne];ye(re[2]+K,re[1]+K,re[0]+K)}Q=h+x*2,K=A*Q;for(let ne=0;ne<X;ne++){const re=C[ne];ye(re[0]+K,re[1]+K,re[2]+K)}}else{for(let Q=0;Q<X;Q++){const K=C[Q];ye(K[2],K[1],K[0])}for(let Q=0;Q<X;Q++){const K=C[Q];ye(K[0]+A*h,K[1]+A*h,K[2]+A*h)}}n.addGroup(j,i.length/3-j,0)}function Oe(){const j=i.length/3;let Q=0;Fe(I,Q),Q+=I.length;for(let K=0,ne=J.length;K<ne;K++){const re=J[K];Fe(re,Q),Q+=re.length}n.addGroup(j,i.length/3-j,1)}function Fe(j,Q){let K=j.length;for(;--K>=0;){const ne=K;let re=K-1;re<0&&(re=j.length-1);for(let w=0,M=h+x*2;w<M;w++){const k=A*w,W=A*(w+1),he=Q+ne+k,me=Q+re+k,De=Q+re+W,be=Q+ne+W;Ae(he,me,De,be)}}}function we(j,Q,K){l.push(j),l.push(Q),l.push(K)}function ye(j,Q,K){ge(j),ge(Q),ge(K);const ne=i.length/3,re=p.generateTopUV(n,i,ne-3,ne-2,ne-1);_e(re[0]),_e(re[1]),_e(re[2])}function Ae(j,Q,K,ne){ge(j),ge(Q),ge(ne),ge(Q),ge(K),ge(ne);const re=i.length/3,w=p.generateSideWallUV(n,i,re-6,re-3,re-2,re-1);_e(w[0]),_e(w[1]),_e(w[3]),_e(w[1]),_e(w[2]),_e(w[3])}function ge(j){i.push(l[j*3+0]),i.push(l[j*3+1]),i.push(l[j*3+2])}function _e(j){s.push(j.x),s.push(j.y)}}}toJSON(){const e=Ye.prototype.toJSON.call(this),t=this.parameters.shapes,n=this.parameters.options;return hg(t,n,e)}}const cg={generateTopUV:function(r,e,t,n,i){const s=e[t*3],a=e[t*3+1],o=e[n*3],l=e[n*3+1],c=e[i*3],h=e[i*3+1];return[new se(s,a),new se(o,l),new se(c,h)]},generateSideWallUV:function(r,e,t,n,i,s){const a=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[n*3],h=e[n*3+1],u=e[n*3+2],d=e[i*3],f=e[i*3+1],m=e[i*3+2],v=e[s*3],x=e[s*3+1],g=e[s*3+2];return Math.abs(o-h)<.01?[new se(a,1-l),new se(c,1-u),new se(d,1-m),new se(v,1-g)]:[new se(o,1-l),new se(h,1-u),new se(f,1-m),new se(x,1-g)]}};function hg(r,e,t){if(t.shapes=[],Array.isArray(r))for(let n=0,i=r.length;n<i;n++){const s=r[n];t.shapes.push(s.uuid)}else t.shapes.push(r.uuid);return e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class ug extends Ye{constructor(e=.5,t=1,n=8,i=1,s=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:i,thetaStart:s,thetaLength:a},n=Math.max(3,n),i=Math.max(1,i);const o=[],l=[],c=[],h=[];let u=e;const d=(t-e)/i,f=new b,m=new se;for(let v=0;v<=i;v++){for(let x=0;x<=n;x++){const g=s+x/n*a;f.x=u*Math.cos(g),f.y=u*Math.sin(g),l.push(f.x,f.y,f.z),c.push(0,0,1),m.x=(f.x/t+1)/2,m.y=(f.y/t+1)/2,h.push(m.x,m.y)}u+=d}for(let v=0;v<i;v++){const x=v*(n+1);for(let g=0;g<n;g++){const p=g+x,E=p,T=p+n+1,S=p+n+2,_=p+1;o.push(E,T,_),o.push(T,S,_)}}this.setIndex(o),this.setAttribute("position",new rt(l,3)),this.setAttribute("normal",new rt(c,3)),this.setAttribute("uv",new rt(h,2))}}class dg extends Ye{constructor(e,t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};const n=[],i=[],s=[],a=[];let o=0,l=0;if(Array.isArray(e)===!1)c(e);else for(let h=0;h<e.length;h++)c(e[h]),this.addGroup(o,l,h),o+=l,l=0;this.setIndex(n),this.setAttribute("position",new rt(i,3)),this.setAttribute("normal",new rt(s,3)),this.setAttribute("uv",new rt(a,2));function c(h){const u=i.length/3,d=h.extractPoints(t);let f=d.shape;const m=d.holes;In.isClockWise(f)===!1&&(f=f.reverse());for(let x=0,g=m.length;x<g;x++){const p=m[x];In.isClockWise(p)===!0&&(m[x]=p.reverse())}const v=In.triangulateShape(f,m);for(let x=0,g=m.length;x<g;x++){const p=m[x];f=f.concat(p)}for(let x=0,g=f.length;x<g;x++){const p=f[x];i.push(p.x,p.y,0),s.push(0,0,1),a.push(p.x,p.y)}for(let x=0,g=v.length;x<g;x++){const p=v[x],E=p[0]+u,T=p[1]+u,S=p[2]+u;n.push(E,T,S),l+=3}}}toJSON(){const e=Ye.prototype.toJSON.call(this),t=this.parameters.shapes;return fg(t,e)}}function fg(r,e){if(e.shapes=[],Array.isArray(r))for(let t=0,n=r.length;t<n;t++){const i=r[t];e.shapes.push(i.uuid)}else e.shapes.push(r.uuid);return e}class Os extends Ye{constructor(e=1,t=8,n=6,i=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:s,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],u=new b,d=new b,f=[],m=[],v=[],x=[];for(let g=0;g<=n;g++){const p=[],E=g/n;let T=0;g==0&&a==0?T=.5/t:g==n&&l==Math.PI&&(T=-.5/t);for(let S=0;S<=t;S++){const _=S/t;u.x=-e*Math.cos(i+_*s)*Math.sin(a+E*o),u.y=e*Math.cos(a+E*o),u.z=e*Math.sin(i+_*s)*Math.sin(a+E*o),m.push(u.x,u.y,u.z),d.copy(u).normalize(),v.push(d.x,d.y,d.z),x.push(_+T,1-E),p.push(c++)}h.push(p)}for(let g=0;g<n;g++)for(let p=0;p<t;p++){const E=h[g][p+1],T=h[g][p],S=h[g+1][p],_=h[g+1][p+1];(g!==0||a>0)&&f.push(E,T,_),(g!==n-1||l<Math.PI)&&f.push(T,S,_)}this.setIndex(f),this.setAttribute("position",new rt(m,3)),this.setAttribute("normal",new rt(v,3)),this.setAttribute("uv",new rt(x,2))}}class pg extends Ye{constructor(e=1,t=.4,n=8,i=6,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:i,arc:s},n=Math.floor(n),i=Math.floor(i);const a=[],o=[],l=[],c=[],h=new b,u=new b,d=new b;for(let f=0;f<=n;f++)for(let m=0;m<=i;m++){const v=m/i*s,x=f/n*Math.PI*2;u.x=(e+t*Math.cos(x))*Math.cos(v),u.y=(e+t*Math.cos(x))*Math.sin(v),u.z=t*Math.sin(x),o.push(u.x,u.y,u.z),h.x=e*Math.cos(v),h.y=e*Math.sin(v),d.subVectors(u,h).normalize(),l.push(d.x,d.y,d.z),c.push(m/i),c.push(f/n)}for(let f=1;f<=n;f++)for(let m=1;m<=i;m++){const v=(i+1)*f+m-1,x=(i+1)*(f-1)+m-1,g=(i+1)*(f-1)+m,p=(i+1)*f+m;a.push(v,x,p),a.push(x,g,p)}this.setIndex(a),this.setAttribute("position",new rt(o,3)),this.setAttribute("normal",new rt(l,3)),this.setAttribute("uv",new rt(c,2))}}class mg extends xt{constructor(e){super(),this.type="ShadowMaterial",this.color=new Te(0),this.transparent=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this}}mg.prototype.isShadowMaterial=!0;class gg extends Xn{constructor(e){super(e),this.type="RawShaderMaterial"}}gg.prototype.isRawShaderMaterial=!0;class Ul extends xt{constructor(e){super(),this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Te(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Te(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ti,this.normalScale=new se(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.vertexTangents=!1,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this.vertexTangents=e.vertexTangents,this}}Ul.prototype.isMeshStandardMaterial=!0;class vg extends Ul{constructor(e){super(),this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.clearcoat=0,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new se(1,1),this.clearcoatNormalMap=null,this.reflectivity=.5,Object.defineProperty(this,"ior",{get:function(){return(1+.4*this.reflectivity)/(1-.4*this.reflectivity)},set:function(t){this.reflectivity=Ut(2.5*(t-1)/(t+1),0,1)}}),this.sheen=null,this.transmission=0,this.transmissionMap=null,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.reflectivity=e.reflectivity,e.sheen?this.sheen=(this.sheen||new Te).copy(e.sheen):this.sheen=null,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this}}vg.prototype.isMeshPhysicalMaterial=!0;class Hl extends xt{constructor(e){super(),this.type="MeshPhongMaterial",this.color=new Te(16777215),this.specular=new Te(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Te(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ti,this.normalScale=new se(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=$r,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this}}Hl.prototype.isMeshPhongMaterial=!0;class xg extends xt{constructor(e){super(),this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new Te(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Te(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ti,this.normalScale=new se(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.gradientMap=e.gradientMap,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.alphaMap=e.alphaMap,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this}}xg.prototype.isMeshToonMaterial=!0;class _g extends xt{constructor(e){super(),this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ti,this.normalScale=new se(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this}}_g.prototype.isMeshNormalMaterial=!0;class yg extends xt{constructor(e){super(),this.type="MeshLambertMaterial",this.color=new Te(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Te(0),this.emissiveIntensity=1,this.emissiveMap=null,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=$r,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this}}yg.prototype.isMeshLambertMaterial=!0;class Mg extends xt{constructor(e){super(),this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new Te(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ti,this.normalScale=new se(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.defines={MATCAP:""},this.color.copy(e.color),this.matcap=e.matcap,this.map=e.map,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.alphaMap=e.alphaMap,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this}}Mg.prototype.isMeshMatcapMaterial=!0;class wg extends Pi{constructor(e){super(),this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(e)}copy(e){return super.copy(e),this.scale=e.scale,this.dashSize=e.dashSize,this.gapSize=e.gapSize,this}}wg.prototype.isLineDashedMaterial=!0;const ot={arraySlice:function(r,e,t){return ot.isTypedArray(r)?new r.constructor(r.subarray(e,t!==void 0?t:r.length)):r.slice(e,t)},convertArray:function(r,e,t){return!r||!t&&r.constructor===e?r:typeof e.BYTES_PER_ELEMENT=="number"?new e(r):Array.prototype.slice.call(r)},isTypedArray:function(r){return ArrayBuffer.isView(r)&&!(r instanceof DataView)},getKeyframeOrder:function(r){function e(i,s){return r[i]-r[s]}const t=r.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n},sortedArray:function(r,e,t){const n=r.length,i=new r.constructor(n);for(let s=0,a=0;a!==n;++s){const o=t[s]*e;for(let l=0;l!==e;++l)i[a++]=r[o+l]}return i},flattenJSON:function(r,e,t,n){let i=1,s=r[0];for(;s!==void 0&&s[n]===void 0;)s=r[i++];if(s===void 0)return;let a=s[n];if(a!==void 0)if(Array.isArray(a))do a=s[n],a!==void 0&&(e.push(s.time),t.push.apply(t,a)),s=r[i++];while(s!==void 0);else if(a.toArray!==void 0)do a=s[n],a!==void 0&&(e.push(s.time),a.toArray(t,t.length)),s=r[i++];while(s!==void 0);else do a=s[n],a!==void 0&&(e.push(s.time),t.push(a)),s=r[i++];while(s!==void 0)},subclip:function(r,e,t,n,i=30){const s=r.clone();s.name=e;const a=[];for(let l=0;l<s.tracks.length;++l){const c=s.tracks[l],h=c.getValueSize(),u=[],d=[];for(let f=0;f<c.times.length;++f){const m=c.times[f]*i;if(!(m<t||m>=n)){u.push(c.times[f]);for(let v=0;v<h;++v)d.push(c.values[f*h+v])}}u.length!==0&&(c.times=ot.convertArray(u,c.times.constructor),c.values=ot.convertArray(d,c.values.constructor),a.push(c))}s.tracks=a;let o=1/0;for(let l=0;l<s.tracks.length;++l)o>s.tracks[l].times[0]&&(o=s.tracks[l].times[0]);for(let l=0;l<s.tracks.length;++l)s.tracks[l].shift(-1*o);return s.resetDuration(),s},makeClipAdditive:function(r,e=0,t=r,n=30){n<=0&&(n=30);const i=t.tracks.length,s=e/n;for(let a=0;a<i;++a){const o=t.tracks[a],l=o.ValueTypeName;if(l==="bool"||l==="string")continue;const c=r.tracks.find(function(g){return g.name===o.name&&g.ValueTypeName===l});if(c===void 0)continue;let h=0;const u=o.getValueSize();o.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(h=u/3);let d=0;const f=c.getValueSize();c.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(d=f/3);const m=o.times.length-1;let v;if(s<=o.times[0]){const g=h,p=u-h;v=ot.arraySlice(o.values,g,p)}else if(s>=o.times[m]){const g=m*u+h,p=g+u-h;v=ot.arraySlice(o.values,g,p)}else{const g=o.createInterpolant(),p=h,E=u-h;g.evaluate(s),v=ot.arraySlice(g.resultBuffer,p,E)}l==="quaternion"&&new Pt().fromArray(v).normalize().conjugate().toArray(v);const x=c.times.length;for(let g=0;g<x;++g){const p=g*f+d;if(l==="quaternion")Pt.multiplyQuaternionsFlat(c.values,p,v,0,c.values,p);else{const E=f-d*2;for(let T=0;T<E;++T)c.values[p+T]-=v[T]}}}return r.blendMode=cl,r}};class Nn{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,i=t[n],s=t[n-1];e:{t:{let a;n:{i:if(!(e<i)){for(let o=n+2;;){if(i===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.afterEnd_(n-1,e,s)}if(n===o)break;if(s=i,i=t[++n],e<i)break t}a=t.length;break n}if(!(e>=s)){const o=t[1];e<o&&(n=2,s=o);for(let l=n-2;;){if(s===void 0)return this._cachedIndex=0,this.beforeStart_(0,e,i);if(n===l)break;if(i=s,s=t[--n-1],e>=s)break t}a=n,n=0;break n}break e}for(;n<a;){const o=n+a>>>1;e<t[o]?a=o:n=o+1}if(i=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.beforeStart_(0,e,i);if(i===void 0)return n=t.length,this._cachedIndex=n,this.afterEnd_(n-1,s,e)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=e*i;for(let a=0;a!==i;++a)t[a]=n[s+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}Nn.prototype.beforeStart_=Nn.prototype.copySampleValue_;Nn.prototype.afterEnd_=Nn.prototype.copySampleValue_;class bg extends Nn{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:vi,endingEnd:vi}}intervalChanged_(e,t,n){const i=this.parameterPositions;let s=e-2,a=e+1,o=i[s],l=i[a];if(o===void 0)switch(this.getSettings_().endingStart){case xi:s=e,o=2*t-n;break;case qr:s=i.length-2,o=t+i[s]-i[s+1];break;default:s=e,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case xi:a=e,l=2*n-t;break;case qr:a=1,l=n+i[1]-i[0];break;default:a=e-1,l=t}const c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-n),this._offsetPrev=s*h,this._offsetNext=a*h}interpolate_(e,t,n,i){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,m=(n-t)/(i-t),v=m*m,x=v*m,g=-d*x+2*d*v-d*m,p=(1+d)*x+(-1.5-2*d)*v+(-.5+d)*m+1,E=(-1-f)*x+(1.5+f)*v+.5*m,T=f*x-f*v;for(let S=0;S!==o;++S)s[S]=g*a[h+S]+p*a[c+S]+E*a[l+S]+T*a[u+S];return s}}class kl extends Nn{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(n-t)/(i-t),u=1-h;for(let d=0;d!==o;++d)s[d]=a[c+d]*u+a[l+d]*h;return s}}class Sg extends Nn{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}}class cn{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ot.convertArray(t,this.TimeBufferType),this.values=ot.convertArray(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ot.convertArray(e.times,Array),values:ot.convertArray(e.values,Array)};const i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Sg(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new kl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new bg(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case Wr:t=this.InterpolantFactoryMethodDiscrete;break;case Xr:t=this.InterpolantFactoryMethodLinear;break;case os:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Wr;case this.InterpolantFactoryMethodLinear:return Xr;case this.InterpolantFactoryMethodSmooth:return os}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){const n=this.times,i=n.length;let s=0,a=i-1;for(;s!==i&&n[s]<e;)++s;for(;a!==-1&&n[a]>t;)--a;if(++a,s!==0||a!==i){s>=a&&(a=Math.max(a,1),s=a-1);const o=this.getValueSize();this.times=ot.arraySlice(n,s,a),this.values=ot.arraySlice(this.values,s*o,a*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,i=this.values,s=n.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){const l=n[o];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(i!==void 0&&ot.isTypedArray(i))for(let o=0,l=i.length;o!==l;++o){const c=i[o];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){const e=ot.arraySlice(this.times),t=ot.arraySlice(this.values),n=this.getValueSize(),i=this.getInterpolation()===os,s=e.length-1;let a=1;for(let o=1;o<s;++o){let l=!1;const c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(i)l=!0;else{const u=o*n,d=u-n,f=u+n;for(let m=0;m!==n;++m){const v=t[u+m];if(v!==t[d+m]||v!==t[f+m]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];const u=o*n,d=a*n;for(let f=0;f!==n;++f)t[d+f]=t[u+f]}++a}}if(s>0){e[a]=e[s];for(let o=s*n,l=a*n,c=0;c!==n;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=ot.arraySlice(e,0,a),this.values=ot.arraySlice(t,0,a*n)):(this.times=e,this.values=t),this}clone(){const e=ot.arraySlice(this.times,0),t=ot.arraySlice(this.values,0),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}}cn.prototype.TimeBufferType=Float32Array;cn.prototype.ValueBufferType=Float32Array;cn.prototype.DefaultInterpolation=Xr;class Ii extends cn{}Ii.prototype.ValueTypeName="bool";Ii.prototype.ValueBufferType=Array;Ii.prototype.DefaultInterpolation=Wr;Ii.prototype.InterpolantFactoryMethodLinear=void 0;Ii.prototype.InterpolantFactoryMethodSmooth=void 0;class Gl extends cn{}Gl.prototype.ValueTypeName="color";class Zr extends cn{}Zr.prototype.ValueTypeName="number";class Eg extends Nn{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-t)/(i-t);let c=e*o;for(let h=c+o;c!==h;c+=4)Pt.slerpFlat(s,0,a,c-o,a,c,l);return s}}class cr extends cn{InterpolantFactoryMethodLinear(e){return new Eg(this.times,this.values,this.getValueSize(),e)}}cr.prototype.ValueTypeName="quaternion";cr.prototype.DefaultInterpolation=Xr;cr.prototype.InterpolantFactoryMethodSmooth=void 0;class Di extends cn{}Di.prototype.ValueTypeName="string";Di.prototype.ValueBufferType=Array;Di.prototype.DefaultInterpolation=Wr;Di.prototype.InterpolantFactoryMethodLinear=void 0;Di.prototype.InterpolantFactoryMethodSmooth=void 0;class Jr extends cn{}Jr.prototype.ValueTypeName="vector";class Wo{constructor(e,t=-1,n,i=da){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=on(),this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,i=1/(e.fps||1);for(let a=0,o=n.length;a!==o;++a)t.push(Ag(n[a]).scale(i));const s=new this(e.name,e.duration,t,e.blendMode);return s.uuid=e.uuid,s}static toJSON(e){const t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode};for(let s=0,a=n.length;s!==a;++s)t.push(cn.toJSON(n[s]));return i}static CreateFromMorphTargetSequence(e,t,n,i){const s=t.length,a=[];for(let o=0;o<s;o++){let l=[],c=[];l.push((o+s-1)%s,o,(o+1)%s),c.push(0,1,0);const h=ot.getKeyframeOrder(l);l=ot.sortedArray(l,1,h),c=ot.sortedArray(c,1,h),!i&&l[0]===0&&(l.push(s),c.push(c[0])),a.push(new Zr(".morphTargetInfluences["+t[o].name+"]",l,c).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const i={},s=/^([\w-]*?)([\d]+)$/;for(let o=0,l=e.length;o<l;o++){const c=e[o],h=c.name.match(s);if(h&&h.length>1){const u=h[1];let d=i[u];d||(i[u]=d=[]),d.push(c)}}const a=[];for(const o in i)a.push(this.CreateFromMorphTargetSequence(o,i[o],t,n));return a}static parseAnimation(e,t){if(!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;const n=function(u,d,f,m,v){if(f.length!==0){const x=[],g=[];ot.flattenJSON(f,x,g,m),x.length!==0&&v.push(new u(d,x,g))}},i=[],s=e.name||"default",a=e.fps||30,o=e.blendMode;let l=e.length||-1;const c=e.hierarchy||[];for(let u=0;u<c.length;u++){const d=c[u].keys;if(!(!d||d.length===0))if(d[0].morphTargets){const f={};let m;for(m=0;m<d.length;m++)if(d[m].morphTargets)for(let v=0;v<d[m].morphTargets.length;v++)f[d[m].morphTargets[v]]=-1;for(const v in f){const x=[],g=[];for(let p=0;p!==d[m].morphTargets.length;++p){const E=d[m];x.push(E.time),g.push(E.morphTarget===v?1:0)}i.push(new Zr(".morphTargetInfluence["+v+"]",x,g))}l=f.length*a}else{const f=".bones["+t[u].name+"]";n(Jr,f+".position",d,"pos",i),n(cr,f+".quaternion",d,"rot",i),n(Jr,f+".scale",d,"scl",i)}}return i.length===0?null:new this(s,l,i,o)}resetDuration(){const e=this.tracks;let t=0;for(let n=0,i=e.length;n!==i;++n){const s=this.tracks[n];t=Math.max(t,s.times[s.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());return new this.constructor(this.name,this.duration,e,this.blendMode)}toJSON(){return this.constructor.toJSON(this)}}function Tg(r){switch(r.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Zr;case"vector":case"vector2":case"vector3":case"vector4":return Jr;case"color":return Gl;case"quaternion":return cr;case"bool":case"boolean":return Ii;case"string":return Di}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+r)}function Ag(r){if(r.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=Tg(r.type);if(r.times===void 0){const t=[],n=[];ot.flattenJSON(r.keys,t,n,"value"),r.times=t,r.values=n}return e.parse!==void 0?e.parse(r):new e(r.name,r.times,r.values,r.interpolation)}const Ei={enabled:!1,files:{},add:function(r,e){this.enabled!==!1&&(this.files[r]=e)},get:function(r){if(this.enabled!==!1)return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};class Lg{constructor(e,t,n){const i=this;let s=!1,a=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(h){o++,s===!1&&i.onStart!==void 0&&i.onStart(h,a,o),s=!0},this.itemEnd=function(h){a++,i.onProgress!==void 0&&i.onProgress(h,a,o),a===o&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],m=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null}}}const Cg=new Lg;class Fn{constructor(e){this.manager=e!==void 0?e:Cg,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}}const Qt={};class Rg extends Fn{constructor(e){super(e)}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=Ei.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;if(Qt[e]!==void 0){Qt[e].push({onLoad:t,onProgress:n,onError:i});return}const o=/^data:(.*?)(;base64)?,(.*)$/,l=e.match(o);let c;if(l){const h=l[1],u=!!l[2];let d=l[3];d=decodeURIComponent(d),u&&(d=atob(d));try{let f;const m=(this.responseType||"").toLowerCase();switch(m){case"arraybuffer":case"blob":const v=new Uint8Array(d.length);for(let g=0;g<d.length;g++)v[g]=d.charCodeAt(g);m==="blob"?f=new Blob([v.buffer],{type:h}):f=v.buffer;break;case"document":f=new DOMParser().parseFromString(d,h);break;case"json":f=JSON.parse(d);break;default:f=d;break}setTimeout(function(){t&&t(f),s.manager.itemEnd(e)},0)}catch(f){setTimeout(function(){i&&i(f),s.manager.itemError(e),s.manager.itemEnd(e)},0)}}else{Qt[e]=[],Qt[e].push({onLoad:t,onProgress:n,onError:i}),c=new XMLHttpRequest,c.open("GET",e,!0),c.addEventListener("load",function(h){const u=this.response,d=Qt[e];if(delete Qt[e],this.status===200||this.status===0){this.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),Ei.add(e,u);for(let f=0,m=d.length;f<m;f++){const v=d[f];v.onLoad&&v.onLoad(u)}s.manager.itemEnd(e)}else{for(let f=0,m=d.length;f<m;f++){const v=d[f];v.onError&&v.onError(h)}s.manager.itemError(e),s.manager.itemEnd(e)}},!1),c.addEventListener("progress",function(h){const u=Qt[e];for(let d=0,f=u.length;d<f;d++){const m=u[d];m.onProgress&&m.onProgress(h)}},!1),c.addEventListener("error",function(h){const u=Qt[e];delete Qt[e];for(let d=0,f=u.length;d<f;d++){const m=u[d];m.onError&&m.onError(h)}s.manager.itemError(e),s.manager.itemEnd(e)},!1),c.addEventListener("abort",function(h){const u=Qt[e];delete Qt[e];for(let d=0,f=u.length;d<f;d++){const m=u[d];m.onError&&m.onError(h)}s.manager.itemError(e),s.manager.itemEnd(e)},!1),this.responseType!==void 0&&(c.responseType=this.responseType),this.withCredentials!==void 0&&(c.withCredentials=this.withCredentials),c.overrideMimeType&&c.overrideMimeType(this.mimeType!==void 0?this.mimeType:"text/plain");for(const h in this.requestHeader)c.setRequestHeader(h,this.requestHeader[h]);c.send(null)}return s.manager.itemStart(e),c}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}}class Vl extends Fn{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=Ei.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;const o=document.createElementNS("http://www.w3.org/1999/xhtml","img");function l(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1),Ei.add(e,this),t&&t(this),s.manager.itemEnd(e)}function c(h){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1),i&&i(h),s.manager.itemError(e),s.manager.itemEnd(e)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.substr(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),s.manager.itemStart(e),o.src=e,o}}class Pg extends Fn{constructor(e){super(e)}load(e,t,n,i){const s=new es,a=new Vl(this.manager);a.setCrossOrigin(this.crossOrigin),a.setPath(this.path);let o=0;function l(c){a.load(e[c],function(h){s.images[c]=h,o++,o===6&&(s.needsUpdate=!0,t&&t(s))},void 0,i)}for(let c=0;c<e.length;++c)l(c);return s}}class Ig extends Fn{constructor(e){super(e)}load(e,t,n,i){const s=new bt,a=new Vl(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o;const l=e.search(/\.jpe?g($|\?)/i)>0||e.search(/^data\:image\/jpeg/)===0;s.format=l?Vn:$t,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}}class Xt{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,i=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(i),t.push(s),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){const n=this.getLengths();let i=0;const s=n.length;let a;t?a=t:a=e*n[s-1];let o=0,l=s-1,c;for(;o<=l;)if(i=Math.floor(o+(l-o)/2),c=n[i]-a,c<0)o=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===a)return i/(s-1);const h=n[i],d=n[i+1]-h,f=(a-h)/d;return(i+f)/(s-1)}getTangent(e,t){let i=e-1e-4,s=e+1e-4;i<0&&(i=0),s>1&&(s=1);const a=this.getPoint(i),o=this.getPoint(s),l=t||(a.isVector2?new se:new b);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){const n=new b,i=[],s=[],a=[],o=new b,l=new Le;for(let f=0;f<=e;f++){const m=f/e;i[f]=this.getTangentAt(m,new b),i[f].normalize()}s[0]=new b,a[0]=new b;let c=Number.MAX_VALUE;const h=Math.abs(i[0].x),u=Math.abs(i[0].y),d=Math.abs(i[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],o),a[0].crossVectors(i[0],s[0]);for(let f=1;f<=e;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(i[f-1],i[f]),o.length()>Number.EPSILON){o.normalize();const m=Math.acos(Ut(i[f-1].dot(i[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(o,m))}a[f].crossVectors(i[f],s[f])}if(t===!0){let f=Math.acos(Ut(s[0].dot(s[e]),-1,1));f/=e,i[0].dot(o.crossVectors(s[0],s[e]))>0&&(f=-f);for(let m=1;m<=e;m++)s[m].applyMatrix4(l.makeRotationAxis(i[m],f*m)),a[m].crossVectors(i[m],s[m])}return{tangents:i,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.5,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class rs extends Xt{constructor(e=0,t=0,n=1,i=1,s=0,a=Math.PI*2,o=!1,l=0){super(),this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(e,t){const n=t||new se,i=Math.PI*2;let s=this.aEndAngle-this.aStartAngle;const a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=i;for(;s>i;)s-=i;s<Number.EPSILON&&(a?s=0:s=i),this.aClockwise===!0&&!a&&(s===i?s=-i:s=s-i);const o=this.aStartAngle+e*s;let l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*h-f*u+this.aX,c=d*u+f*h+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}rs.prototype.isEllipseCurve=!0;class Wl extends rs{constructor(e,t,n,i,s,a){super(e,t,n,n,i,s,a),this.type="ArcCurve"}}Wl.prototype.isArcCurve=!0;function _a(){let r=0,e=0,t=0,n=0;function i(s,a,o,l){r=s,e=o,t=-3*s+3*a-2*o-l,n=2*s-2*a+o+l}return{initCatmullRom:function(s,a,o,l,c){i(a,o,c*(o-s),c*(l-a))},initNonuniformCatmullRom:function(s,a,o,l,c,h,u){let d=(a-s)/c-(o-s)/(c+h)+(o-a)/h,f=(o-a)/h-(l-a)/(h+u)+(l-o)/u;d*=h,f*=h,i(a,o,d,f)},calc:function(s){const a=s*s,o=a*s;return r+e*s+t*a+n*o}}}const zr=new b,Us=new _a,Hs=new _a,ks=new _a;class Xl extends Xt{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new b){const n=t,i=this.points,s=i.length,a=(s-(this.closed?0:1))*e;let o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,h;this.closed||o>0?c=i[(o-1)%s]:(zr.subVectors(i[0],i[1]).add(i[0]),c=zr);const u=i[o%s],d=i[(o+1)%s];if(this.closed||o+2<s?h=i[(o+2)%s]:(zr.subVectors(i[s-1],i[s-2]).add(i[s-1]),h=zr),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let m=Math.pow(c.distanceToSquared(u),f),v=Math.pow(u.distanceToSquared(d),f),x=Math.pow(d.distanceToSquared(h),f);v<1e-4&&(v=1),m<1e-4&&(m=v),x<1e-4&&(x=v),Us.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,m,v,x),Hs.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,m,v,x),ks.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,m,v,x)}else this.curveType==="catmullrom"&&(Us.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),Hs.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),ks.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set(Us.calc(l),Hs.calc(l),ks.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new b().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}Xl.prototype.isCatmullRomCurve3=!0;function Xo(r,e,t,n,i){const s=(n-e)*.5,a=(i-t)*.5,o=r*r,l=r*o;return(2*t-2*n+s+a)*l+(-3*t+3*n-2*s-a)*o+s*r+t}function Dg(r,e){const t=1-r;return t*t*e}function Ng(r,e){return 2*(1-r)*r*e}function Fg(r,e){return r*r*e}function Ki(r,e,t,n){return Dg(r,e)+Ng(r,t)+Fg(r,n)}function Bg(r,e){const t=1-r;return t*t*t*e}function zg(r,e){const t=1-r;return 3*t*t*r*e}function Og(r,e){return 3*(1-r)*r*r*e}function Ug(r,e){return r*r*r*e}function $i(r,e,t,n,i){return Bg(r,e)+zg(r,t)+Og(r,n)+Ug(r,i)}class ya extends Xt{constructor(e=new se,t=new se,n=new se,i=new se){super(),this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new se){const n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set($i(e,i.x,s.x,a.x,o.x),$i(e,i.y,s.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}ya.prototype.isCubicBezierCurve=!0;class ql extends Xt{constructor(e=new b,t=new b,n=new b,i=new b){super(),this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new b){const n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set($i(e,i.x,s.x,a.x,o.x),$i(e,i.y,s.y,a.y,o.y),$i(e,i.z,s.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}ql.prototype.isCubicBezierCurve3=!0;class ss extends Xt{constructor(e=new se,t=new se){super(),this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new se){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t){const n=t||new se;return n.copy(this.v2).sub(this.v1).normalize(),n}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}ss.prototype.isLineCurve=!0;class Hg extends Xt{constructor(e=new b,t=new b){super(),this.type="LineCurve3",this.isLineCurve3=!0,this.v1=e,this.v2=t}getPoint(e,t=new b){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Ma extends Xt{constructor(e=new se,t=new se,n=new se){super(),this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new se){const n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(Ki(e,i.x,s.x,a.x),Ki(e,i.y,s.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}Ma.prototype.isQuadraticBezierCurve=!0;class Yl extends Xt{constructor(e=new b,t=new b,n=new b){super(),this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new b){const n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(Ki(e,i.x,s.x,a.x),Ki(e,i.y,s.y,a.y),Ki(e,i.z,s.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}Yl.prototype.isQuadraticBezierCurve3=!0;class wa extends Xt{constructor(e=[]){super(),this.type="SplineCurve",this.points=e}getPoint(e,t=new se){const n=t,i=this.points,s=(i.length-1)*e,a=Math.floor(s),o=s-a,l=i[a===0?a:a-1],c=i[a],h=i[a>i.length-2?i.length-1:a+1],u=i[a>i.length-3?i.length-1:a+2];return n.set(Xo(o,l.x,c.x,h.x,u.x),Xo(o,l.y,c.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new se().fromArray(i))}return this}}wa.prototype.isSplineCurve=!0;var kg=Object.freeze({__proto__:null,ArcCurve:Wl,CatmullRomCurve3:Xl,CubicBezierCurve:ya,CubicBezierCurve3:ql,EllipseCurve:rs,LineCurve:ss,LineCurve3:Hg,QuadraticBezierCurve:Ma,QuadraticBezierCurve3:Yl,SplineCurve:wa});class Gg extends Xt{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);e.equals(t)||this.curves.push(new ss(t,e))}getPoint(e){const t=e*this.getLength(),n=this.getCurveLengths();let i=0;for(;i<n.length;){if(n[i]>=t){const s=n[i]-t,a=this.curves[i],o=a.getLength(),l=o===0?0:1-s/o;return a.getPointAt(l)}i++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let n=0,i=this.curves.length;n<i;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let n;for(let i=0,s=this.curves;i<s.length;i++){const a=s[i],o=a&&a.isEllipseCurve?e*2:a&&(a.isLineCurve||a.isLineCurve3)?1:a&&a.isSplineCurve?e*a.points.length:e,l=a.getPoints(o);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const i=e.curves[t];this.curves.push(i.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){const i=this.curves[t];e.curves.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const i=e.curves[t];this.curves.push(new kg[i.type]().fromJSON(i))}return this}}class ia extends Gg{constructor(e){super(),this.type="Path",this.currentPoint=new se,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const n=new ss(this.currentPoint.clone(),new se(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,i){const s=new Ma(this.currentPoint.clone(),new se(e,t),new se(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(e,t,n,i,s,a){const o=new ya(this.currentPoint.clone(),new se(e,t),new se(n,i),new se(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),n=new wa(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,i,s,a){const o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,n,i,s,a),this}absarc(e,t,n,i,s,a){return this.absellipse(e,t,n,n,i,s,a),this}ellipse(e,t,n,i,s,a,o,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,n,i,s,a,o,l),this}absellipse(e,t,n,i,s,a,o,l){const c=new rs(e,t,n,i,s,a,o,l);if(this.curves.length>0){const u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class ba extends ia{constructor(e){super(e),this.uuid=on(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let n=0,i=this.holes.length;n<i;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const i=e.holes[t];this.holes.push(i.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){const i=this.holes[t];e.holes.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const i=e.holes[t];this.holes.push(new ia().fromJSON(i))}return this}}class ln extends Ze{constructor(e,t=1){super(),this.type="Light",this.color=new Te(e),this.intensity=t}dispose(){}copy(e){return super.copy(e),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}ln.prototype.isLight=!0;class Vg extends ln{constructor(e,t,n){super(e,n),this.type="HemisphereLight",this.position.copy(Ze.DefaultUp),this.updateMatrix(),this.groundColor=new Te(t)}copy(e){return ln.prototype.copy.call(this,e),this.groundColor.copy(e.groundColor),this}}Vg.prototype.isHemisphereLight=!0;const qo=new Le,Yo=new b,jo=new b;class Sa{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.mapSize=new se(512,512),this.map=null,this.mapPass=null,this.matrix=new Le,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ts,this._frameExtents=new se(1,1),this._viewportCount=1,this._viewports=[new tt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Yo.setFromMatrixPosition(e.matrixWorld),t.position.copy(Yo),jo.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(jo),t.updateMatrixWorld(),qo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(qo),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(t.projectionMatrix),n.multiply(t.matrixWorldInverse)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class jl extends Sa{constructor(){super(new Nt(50,1,.5,500)),this.focus=1}updateMatrices(e){const t=this.camera,n=Qs*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height,s=e.distance||t.far;(n!==t.fov||i!==t.aspect||s!==t.far)&&(t.fov=n,t.aspect=i,t.far=s,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}jl.prototype.isSpotLightShadow=!0;class Wg extends ln{constructor(e,t,n=0,i=Math.PI/3,s=0,a=1){super(e,t),this.type="SpotLight",this.position.copy(Ze.DefaultUp),this.updateMatrix(),this.target=new Ze,this.distance=n,this.angle=i,this.penumbra=s,this.decay=a,this.shadow=new jl}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}Wg.prototype.isSpotLight=!0;const Zo=new Le,Wi=new b,Gs=new b;class Zl extends Sa{constructor(){super(new Nt(90,1,.5,500)),this._frameExtents=new se(4,2),this._viewportCount=6,this._viewports=[new tt(2,1,1,1),new tt(0,1,1,1),new tt(3,1,1,1),new tt(1,1,1,1),new tt(3,0,1,1),new tt(1,0,1,1)],this._cubeDirections=[new b(1,0,0),new b(-1,0,0),new b(0,0,1),new b(0,0,-1),new b(0,1,0),new b(0,-1,0)],this._cubeUps=[new b(0,1,0),new b(0,1,0),new b(0,1,0),new b(0,1,0),new b(0,0,1),new b(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),Wi.setFromMatrixPosition(e.matrixWorld),n.position.copy(Wi),Gs.copy(n.position),Gs.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Gs),n.updateMatrixWorld(),i.makeTranslation(-Wi.x,-Wi.y,-Wi.z),Zo.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Zo)}}Zl.prototype.isPointLightShadow=!0;class Jl extends ln{constructor(e,t,n=0,i=1){super(e,t),this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new Zl}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}Jl.prototype.isPointLight=!0;class Ql extends pa{constructor(e=-1,t=1,n=1,i=-1,s=.1,a=2e3){super(),this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let s=n-e,a=n+e,o=i+t,l=i-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}Ql.prototype.isOrthographicCamera=!0;class Kl extends Sa{constructor(){super(new Ql(-5,5,5,-5,.5,500))}}Kl.prototype.isDirectionalLightShadow=!0;class $l extends ln{constructor(e,t){super(e,t),this.type="DirectionalLight",this.position.copy(Ze.DefaultUp),this.updateMatrix(),this.target=new Ze,this.shadow=new Kl}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}$l.prototype.isDirectionalLight=!0;class ec extends ln{constructor(e,t){super(e,t),this.type="AmbientLight"}}ec.prototype.isAmbientLight=!0;class Xg extends ln{constructor(e,t,n=10,i=10){super(e,t),this.type="RectAreaLight",this.width=n,this.height=i}copy(e){return super.copy(e),this.width=e.width,this.height=e.height,this}toJSON(e){const t=super.toJSON(e);return t.object.width=this.width,t.object.height=this.height,t}}Xg.prototype.isRectAreaLight=!0;class tc{constructor(){this.coefficients=[];for(let e=0;e<9;e++)this.coefficients.push(new b)}set(e){for(let t=0;t<9;t++)this.coefficients[t].copy(e[t]);return this}zero(){for(let e=0;e<9;e++)this.coefficients[e].set(0,0,0);return this}getAt(e,t){const n=e.x,i=e.y,s=e.z,a=this.coefficients;return t.copy(a[0]).multiplyScalar(.282095),t.addScaledVector(a[1],.488603*i),t.addScaledVector(a[2],.488603*s),t.addScaledVector(a[3],.488603*n),t.addScaledVector(a[4],1.092548*(n*i)),t.addScaledVector(a[5],1.092548*(i*s)),t.addScaledVector(a[6],.315392*(3*s*s-1)),t.addScaledVector(a[7],1.092548*(n*s)),t.addScaledVector(a[8],.546274*(n*n-i*i)),t}getIrradianceAt(e,t){const n=e.x,i=e.y,s=e.z,a=this.coefficients;return t.copy(a[0]).multiplyScalar(.886227),t.addScaledVector(a[1],2*.511664*i),t.addScaledVector(a[2],2*.511664*s),t.addScaledVector(a[3],2*.511664*n),t.addScaledVector(a[4],2*.429043*n*i),t.addScaledVector(a[5],2*.429043*i*s),t.addScaledVector(a[6],.743125*s*s-.247708),t.addScaledVector(a[7],2*.429043*n*s),t.addScaledVector(a[8],.429043*(n*n-i*i)),t}add(e){for(let t=0;t<9;t++)this.coefficients[t].add(e.coefficients[t]);return this}addScaledSH(e,t){for(let n=0;n<9;n++)this.coefficients[n].addScaledVector(e.coefficients[n],t);return this}scale(e){for(let t=0;t<9;t++)this.coefficients[t].multiplyScalar(e);return this}lerp(e,t){for(let n=0;n<9;n++)this.coefficients[n].lerp(e.coefficients[n],t);return this}equals(e){for(let t=0;t<9;t++)if(!this.coefficients[t].equals(e.coefficients[t]))return!1;return!0}copy(e){return this.set(e.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(e,t=0){const n=this.coefficients;for(let i=0;i<9;i++)n[i].fromArray(e,t+i*3);return this}toArray(e=[],t=0){const n=this.coefficients;for(let i=0;i<9;i++)n[i].toArray(e,t+i*3);return e}static getBasisAt(e,t){const n=e.x,i=e.y,s=e.z;t[0]=.282095,t[1]=.488603*i,t[2]=.488603*s,t[3]=.488603*n,t[4]=1.092548*n*i,t[5]=1.092548*i*s,t[6]=.315392*(3*s*s-1),t[7]=1.092548*n*s,t[8]=.546274*(n*n-i*i)}}tc.prototype.isSphericalHarmonics3=!0;class Ea extends ln{constructor(e=new tc,t=1){super(void 0,t),this.sh=e}copy(e){return super.copy(e),this.sh.copy(e.sh),this}fromJSON(e){return this.intensity=e.intensity,this.sh.fromArray(e.sh),this}toJSON(e){const t=super.toJSON(e);return t.object.sh=this.sh.toArray(),t}}Ea.prototype.isLightProbe=!0;class qg{static decodeText(e){if(typeof TextDecoder<"u")return new TextDecoder().decode(e);let t="";for(let n=0,i=e.length;n<i;n++)t+=String.fromCharCode(e[n]);try{return decodeURIComponent(escape(t))}catch{return t}}static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.substr(0,t+1)}}class Yg extends Ye{constructor(){super(),this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}clone(){return new this.constructor().copy(this)}toJSON(){const e=super.toJSON(this);return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}}Yg.prototype.isInstancedBufferGeometry=!0;class jg extends dt{constructor(e,t,n,i){typeof n=="number"&&(i=n,n=!1,console.error("THREE.InstancedBufferAttribute: The constructor now expects normalized as the third argument.")),super(e,t,n),this.meshPerAttribute=i||1}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}jg.prototype.isInstancedBufferAttribute=!0;class Zg extends Fn{constructor(e){super(e),typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"}}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=Ei.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;const o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,fetch(e,o).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(s.options,{colorSpaceConversion:"none"}))}).then(function(l){Ei.add(e,l),t&&t(l),s.manager.itemEnd(e)}).catch(function(l){i&&i(l),s.manager.itemError(e),s.manager.itemEnd(e)}),s.manager.itemStart(e)}}Zg.prototype.isImageBitmapLoader=!0;let Or;const Jg={getContext:function(){return Or===void 0&&(Or=new(window.AudioContext||window.webkitAudioContext)),Or},setContext:function(r){Or=r}};class Qg extends Fn{constructor(e){super(e)}load(e,t,n,i){const s=this,a=new Rg(this.manager);a.setResponseType("arraybuffer"),a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(e,function(o){try{const l=o.slice(0);Jg.getContext().decodeAudioData(l,function(h){t(h)})}catch(l){i?i(l):console.error(l),s.manager.itemError(e)}},n,i)}}class Kg extends Ea{constructor(e,t,n=1){super(void 0,n);const i=new Te().set(e),s=new Te().set(t),a=new b(i.r,i.g,i.b),o=new b(s.r,s.g,s.b),l=Math.sqrt(Math.PI),c=l*Math.sqrt(.75);this.sh.coefficients[0].copy(a).add(o).multiplyScalar(l),this.sh.coefficients[1].copy(a).sub(o).multiplyScalar(c)}}Kg.prototype.isHemisphereLightProbe=!0;class $g extends Ea{constructor(e,t=1){super(void 0,t);const n=new Te().set(e);this.sh.coefficients[0].set(n.r,n.g,n.b).multiplyScalar(2*Math.sqrt(Math.PI))}}$g.prototype.isAmbientLightProbe=!0;class ev extends Ze{constructor(e){super(),this.type="Audio",this.listener=e,this.context=e.context,this.gain=this.context.createGain(),this.gain.connect(e.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(e){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=e,this.connect(),this}setMediaElementSource(e){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(e),this.connect(),this}setMediaStreamSource(e){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(e),this.connect(),this}setBuffer(e){return this.buffer=e,this.sourceType="buffer",this.autoplay&&this.play(),this}play(e=0){if(this.isPlaying===!0){console.warn("THREE.Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+e;const t=this.context.createBufferSource();return t.buffer=this.buffer,t.loop=this.loop,t.loopStart=this.loopStart,t.loopEnd=this.loopEnd,t.onended=this.onEnded.bind(this),t.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=t,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.isPlaying===!0&&(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0&&(this._progress=this._progress%(this.duration||this.buffer.duration)),this.source.stop(),this.source.onended=null,this.isPlaying=!1),this}stop(){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this._progress=0,this.source.stop(),this.source.onended=null,this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let e=1,t=this.filters.length;e<t;e++)this.filters[e-1].connect(this.filters[e]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let e=1,t=this.filters.length;e<t;e++)this.filters[e-1].disconnect(this.filters[e]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}getFilters(){return this.filters}setFilters(e){return e||(e=[]),this._connected===!0?(this.disconnect(),this.filters=e.slice(),this.connect()):this.filters=e.slice(),this}setDetune(e){if(this.detune=e,this.source.detune!==void 0)return this.isPlaying===!0&&this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,.01),this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(e){return this.setFilters(e?[e]:[])}setPlaybackRate(e){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.playbackRate=e,this.isPlaying===!0&&this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,.01),this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1}getLoop(){return this.hasPlaybackControl===!1?(console.warn("THREE.Audio: this Audio has no playback control."),!1):this.loop}setLoop(e){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.loop=e,this.isPlaying===!0&&(this.source.loop=this.loop),this}setLoopStart(e){return this.loopStart=e,this}setLoopEnd(e){return this.loopEnd=e,this}getVolume(){return this.gain.gain.value}setVolume(e){return this.gain.gain.setTargetAtTime(e,this.context.currentTime,.01),this}}class tv{constructor(e,t,n){this.binding=e,this.valueSize=n;let i,s,a;switch(t){case"quaternion":i=this._slerp,s=this._slerpAdditive,a=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":i=this._select,s=this._select,a=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:i=this._lerp,s=this._lerpAdditive,a=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=i,this._mixBufferRegionAdditive=s,this._setIdentity=a,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){const n=this.buffer,i=this.valueSize,s=e*i+i;let a=this.cumulativeWeight;if(a===0){for(let o=0;o!==i;++o)n[s+o]=n[o];a=t}else{a+=t;const o=t/a;this._mixBufferRegion(n,s,0,o,i)}this.cumulativeWeight=a}accumulateAdditive(e){const t=this.buffer,n=this.valueSize,i=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,i,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){const t=this.valueSize,n=this.buffer,i=e*t+t,s=this.cumulativeWeight,a=this.cumulativeWeightAdditive,o=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,s<1){const l=t*this._origIndex;this._mixBufferRegion(n,i,l,1-s,t)}a>0&&this._mixBufferRegionAdditive(n,i,this._addIndex*t,1,t);for(let l=t,c=t+t;l!==c;++l)if(n[l]!==n[l+t]){o.setValue(n,i);break}}saveOriginalState(){const e=this.binding,t=this.buffer,n=this.valueSize,i=n*this._origIndex;e.getValue(t,i);for(let s=n,a=i;s!==a;++s)t[s]=t[i+s%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){const e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){const e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){const e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,i,s){if(i>=.5)for(let a=0;a!==s;++a)e[t+a]=e[n+a]}_slerp(e,t,n,i){Pt.slerpFlat(e,t,e,t,e,n,i)}_slerpAdditive(e,t,n,i,s){const a=this._workIndex*s;Pt.multiplyQuaternionsFlat(e,a,e,t,e,n),Pt.slerpFlat(e,t,e,t,e,a,i)}_lerp(e,t,n,i,s){const a=1-i;for(let o=0;o!==s;++o){const l=t+o;e[l]=e[l]*a+e[n+o]*i}}_lerpAdditive(e,t,n,i,s){for(let a=0;a!==s;++a){const o=t+a;e[o]=e[o]+e[n+a]*i}}}const Ta="\\[\\]\\.:\\/",nv=new RegExp("["+Ta+"]","g"),Aa="[^"+Ta+"]",iv="[^"+Ta.replace("\\.","")+"]",rv=/((?:WC+[\/:])*)/.source.replace("WC",Aa),sv=/(WCOD+)?/.source.replace("WCOD",iv),av=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Aa),ov=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Aa),lv=new RegExp("^"+rv+sv+av+ov+"$"),cv=["material","materials","bones"];class hv{constructor(e,t,n){const i=n||Ke.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class Ke{constructor(e,t,n){this.path=t,this.parsedPath=n||Ke.parseTrackName(t),this.node=Ke.findNode(e,this.parsedPath.nodeName)||e,this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new Ke.Composite(e,t,n):new Ke(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(nv,"")}static parseTrackName(e){const t=lv.exec(e);if(!t)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){const s=n.nodeName.substring(i+1);cv.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(!t||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(s){for(let a=0;a<s.length;a++){const o=s[a];if(o.name===t||o.uuid===t)return o;const l=n(o.children);if(l)return l}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.node[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,i=t.propertyName;let s=t.propertyIndex;if(e||(e=Ke.findNode(this.rootNode,t.nodeName)||this.rootNode,this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.error("THREE.PropertyBinding: Trying to update node for track: "+this.path+" but it wasn't found.");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const a=e[i];if(a===void 0){const c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+i+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(e.geometry.isBufferGeometry){if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}else{console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences on THREE.Geometry. Use THREE.BufferGeometry instead.",this);return}}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=i;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}Ke.Composite=hv;Ke.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ke.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ke.prototype.GetterByBindingType=[Ke.prototype._getValue_direct,Ke.prototype._getValue_array,Ke.prototype._getValue_arrayElement,Ke.prototype._getValue_toArray];Ke.prototype.SetterByBindingTypeAndVersioning=[[Ke.prototype._setValue_direct,Ke.prototype._setValue_direct_setNeedsUpdate,Ke.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ke.prototype._setValue_array,Ke.prototype._setValue_array_setNeedsUpdate,Ke.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ke.prototype._setValue_arrayElement,Ke.prototype._setValue_arrayElement_setNeedsUpdate,Ke.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ke.prototype._setValue_fromArray,Ke.prototype._setValue_fromArray_setNeedsUpdate,Ke.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class uv{constructor(e,t,n=null,i=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=i;const s=t.tracks,a=s.length,o=new Array(a),l={endingStart:vi,endingEnd:vi};for(let c=0;c!==a;++c){const h=s[c].createInterpolant(null);o[c]=h,h.settings=l}this._interpolantSettings=l,this._interpolants=o,this._propertyBindings=new Array(a),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=jh,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n){if(e.fadeOut(t),this.fadeIn(t),n){const i=this._clip.duration,s=e._clip.duration,a=s/i,o=i/s;e.warp(1,a,t),this.warp(o,1,t)}return this}crossFadeTo(e,t,n){return e.crossFadeFrom(this,t,n)}stopFading(){const e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){const i=this._mixer,s=i.time,a=this.timeScale;let o=this._timeScaleInterpolant;o===null&&(o=i._lendControlInterpolant(),this._timeScaleInterpolant=o);const l=o.parameterPositions,c=o.sampleValues;return l[0]=s,l[1]=s+n,c[0]=e/a,c[1]=t/a,this}stopWarping(){const e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,i){if(!this.enabled){this._updateWeight(e);return}const s=this._startTime;if(s!==null){const l=(e-s)*n;if(l<0||n===0)return;this._startTime=null,t=n*l}t*=this._updateTimeScale(e);const a=this._updateTime(t),o=this._updateWeight(e);if(o>0){const l=this._interpolants,c=this._propertyBindings;switch(this.blendMode){case cl:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(a),c[h].accumulateAdditive(o);break;case da:default:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(a),c[h].accumulate(i,o)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;const n=this._weightInterpolant;if(n!==null){const i=n.evaluate(e)[0];t*=i,e>n.parameterPositions[1]&&(this.stopFading(),i===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;const n=this._timeScaleInterpolant;if(n!==null){const i=n.evaluate(e)[0];t*=i,e>n.parameterPositions[1]&&(this.stopWarping(),t===0?this.paused=!0:this.timeScale=t)}}return this._effectiveTimeScale=t,t}_updateTime(e){const t=this._clip.duration,n=this.loop;let i=this.time+e,s=this._loopCount;const a=n===Zh;if(e===0)return s===-1?i:a&&(s&1)===1?t-i:i;if(n===Yh){s===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));e:{if(i>=t)i=t;else if(i<0)i=0;else{this.time=i;break e}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:e<0?-1:1})}}else{if(s===-1&&(e>=0?(s=0,this._setEndings(!0,this.repetitions===0,a)):this._setEndings(this.repetitions===0,!0,a)),i>=t||i<0){const o=Math.floor(i/t);i-=t*o,s+=Math.abs(o);const l=this.repetitions-s;if(l<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,i=e>0?t:0,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:e>0?1:-1});else{if(l===1){const c=e<0;this._setEndings(c,!c,a)}else this._setEndings(!1,!1,a);this._loopCount=s,this.time=i,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:o})}}else this.time=i;if(a&&(s&1)===1)return t-i}return i}_setEndings(e,t,n){const i=this._interpolantSettings;n?(i.endingStart=xi,i.endingEnd=xi):(e?i.endingStart=this.zeroSlopeAtStart?xi:vi:i.endingStart=qr,t?i.endingEnd=this.zeroSlopeAtEnd?xi:vi:i.endingEnd=qr)}_scheduleFading(e,t,n){const i=this._mixer,s=i.time;let a=this._weightInterpolant;a===null&&(a=i._lendControlInterpolant(),this._weightInterpolant=a);const o=a.parameterPositions,l=a.sampleValues;return o[0]=s,l[0]=t,o[1]=s+e,l[1]=n,this}}class dv extends qn{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction(e,t){const n=e._localRoot||this._root,i=e._clip.tracks,s=i.length,a=e._propertyBindings,o=e._interpolants,l=n.uuid,c=this._bindingsByRootAndName;let h=c[l];h===void 0&&(h={},c[l]=h);for(let u=0;u!==s;++u){const d=i[u],f=d.name;let m=h[f];if(m!==void 0)a[u]=m;else{if(m=a[u],m!==void 0){m._cacheIndex===null&&(++m.referenceCount,this._addInactiveBinding(m,l,f));continue}const v=t&&t._propertyBindings[u].binding.parsedPath;m=new tv(Ke.create(n,f,v),d.ValueTypeName,d.getValueSize()),++m.referenceCount,this._addInactiveBinding(m,l,f),a[u]=m}o[u].resultBuffer=m.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){const n=(e._localRoot||this._root).uuid,i=e._clip.uuid,s=this._actionsByClip[i];this._bindAction(e,s&&s.knownActions[0]),this._addInactiveAction(e,i,n)}const t=e._propertyBindings;for(let n=0,i=t.length;n!==i;++n){const s=t[n];s.useCount++===0&&(this._lendBinding(s),s.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){const t=e._propertyBindings;for(let n=0,i=t.length;n!==i;++n){const s=t[n];--s.useCount===0&&(s.restoreOriginalState(),this._takeBackBinding(s))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;const e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){const t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){const i=this._actions,s=this._actionsByClip;let a=s[t];if(a===void 0)a={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,s[t]=a;else{const o=a.knownActions;e._byClipCacheIndex=o.length,o.push(e)}e._cacheIndex=i.length,i.push(e),a.actionByRoot[n]=e}_removeInactiveAction(e){const t=this._actions,n=t[t.length-1],i=e._cacheIndex;n._cacheIndex=i,t[i]=n,t.pop(),e._cacheIndex=null;const s=e._clip.uuid,a=this._actionsByClip,o=a[s],l=o.knownActions,c=l[l.length-1],h=e._byClipCacheIndex;c._byClipCacheIndex=h,l[h]=c,l.pop(),e._byClipCacheIndex=null;const u=o.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],l.length===0&&delete a[s],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){const t=e._propertyBindings;for(let n=0,i=t.length;n!==i;++n){const s=t[n];--s.referenceCount===0&&this._removeInactiveBinding(s)}}_lendAction(e){const t=this._actions,n=e._cacheIndex,i=this._nActiveActions++,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_takeBackAction(e){const t=this._actions,n=e._cacheIndex,i=--this._nActiveActions,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_addInactiveBinding(e,t,n){const i=this._bindingsByRootAndName,s=this._bindings;let a=i[t];a===void 0&&(a={},i[t]=a),a[n]=e,e._cacheIndex=s.length,s.push(e)}_removeInactiveBinding(e){const t=this._bindings,n=e.binding,i=n.rootNode.uuid,s=n.path,a=this._bindingsByRootAndName,o=a[i],l=t[t.length-1],c=e._cacheIndex;l._cacheIndex=c,t[c]=l,t.pop(),delete o[s],Object.keys(o).length===0&&delete a[i]}_lendBinding(e){const t=this._bindings,n=e._cacheIndex,i=this._nActiveBindings++,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_takeBackBinding(e){const t=this._bindings,n=e._cacheIndex,i=--this._nActiveBindings,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_lendControlInterpolant(){const e=this._controlInterpolants,t=this._nActiveControlInterpolants++;let n=e[t];return n===void 0&&(n=new kl(new Float32Array(2),new Float32Array(2),1,this._controlInterpolantsResultBuffer),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){const t=this._controlInterpolants,n=e.__cacheIndex,i=--this._nActiveControlInterpolants,s=t[i];e.__cacheIndex=i,t[i]=e,s.__cacheIndex=n,t[n]=s}clipAction(e,t,n){const i=t||this._root,s=i.uuid;let a=typeof e=="string"?Wo.findByName(i,e):e;const o=a!==null?a.uuid:e,l=this._actionsByClip[o];let c=null;if(n===void 0&&(a!==null?n=a.blendMode:n=da),l!==void 0){const u=l.actionByRoot[s];if(u!==void 0&&u.blendMode===n)return u;c=l.knownActions[0],a===null&&(a=c._clip)}if(a===null)return null;const h=new uv(this,a,t,n);return this._bindAction(h,c),this._addInactiveAction(h,o,s),h}existingAction(e,t){const n=t||this._root,i=n.uuid,s=typeof e=="string"?Wo.findByName(n,e):e,a=s?s.uuid:e,o=this._actionsByClip[a];return o!==void 0&&o.actionByRoot[i]||null}stopAllAction(){const e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;const t=this._actions,n=this._nActiveActions,i=this.time+=e,s=Math.sign(e),a=this._accuIndex^=1;for(let c=0;c!==n;++c)t[c]._update(i,e,s,a);const o=this._bindings,l=this._nActiveBindings;for(let c=0;c!==l;++c)o[c].apply(a);return this}setTime(e){this.time=0;for(let t=0;t<this._actions.length;t++)this._actions[t].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){const t=this._actions,n=e.uuid,i=this._actionsByClip,s=i[n];if(s!==void 0){const a=s.knownActions;for(let o=0,l=a.length;o!==l;++o){const c=a[o];this._deactivateAction(c);const h=c._cacheIndex,u=t[t.length-1];c._cacheIndex=null,c._byClipCacheIndex=null,u._cacheIndex=h,t[h]=u,t.pop(),this._removeInactiveBindingsForAction(c)}delete i[n]}}uncacheRoot(e){const t=e.uuid,n=this._actionsByClip;for(const a in n){const o=n[a].actionByRoot,l=o[t];l!==void 0&&(this._deactivateAction(l),this._removeInactiveAction(l))}const i=this._bindingsByRootAndName,s=i[t];if(s!==void 0)for(const a in s){const o=s[a];o.restoreOriginalState(),this._removeInactiveBinding(o)}}uncacheAction(e,t){const n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}}dv.prototype._controlInterpolantsResultBuffer=new Float32Array(1);class fv extends jn{constructor(e,t,n=1){super(e,t),this.meshPerAttribute=n||1}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(e){const t=super.clone(e);return t.meshPerAttribute=this.meshPerAttribute,t}toJSON(e){const t=super.toJSON(e);return t.isInstancedInterleavedBuffer=!0,t.meshPerAttribute=this.meshPerAttribute,t}}fv.prototype.isInstancedInterleavedBuffer=!0;class Jo{constructor(e,t,n=0,i=1/0){this.ray=new Yn(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new ul,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t&&t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t&&t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}intersectObject(e,t=!1,n=[]){return ra(e,this,n,t),n.sort(Qo),n}intersectObjects(e,t=!1,n=[]){for(let i=0,s=e.length;i<s;i++)ra(e[i],this,n,t);return n.sort(Qo),n}}function Qo(r,e){return r.distance-e.distance}function ra(r,e,t,n){if(r.layers.test(e.layers)&&r.raycast(e,t),n===!0){const i=r.children;for(let s=0,a=i.length;s<a;s++)ra(i[s],e,t,!0)}}class pv extends Ze{constructor(e){super(),this.material=e,this.render=function(){},this.hasPositions=!1,this.hasNormals=!1,this.hasColors=!1,this.hasUvs=!1,this.positionArray=null,this.normalArray=null,this.colorArray=null,this.uvArray=null,this.count=0}}pv.prototype.isImmediateRenderObject=!0;const Ln=new b,Ur=new Le,Vs=new Le;class mv extends xa{constructor(e){const t=nc(e),n=new Ye,i=[],s=[],a=new Te(0,0,1),o=new Te(0,1,0);for(let c=0;c<t.length;c++){const h=t[c];h.parent&&h.parent.isBone&&(i.push(0,0,0),i.push(0,0,0),s.push(a.r,a.g,a.b),s.push(o.r,o.g,o.b))}n.setAttribute("position",new rt(i,3)),n.setAttribute("color",new rt(s,3));const l=new Pi({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(n,l),this.type="SkeletonHelper",this.isSkeletonHelper=!0,this.root=e,this.bones=t,this.matrix=e.matrixWorld,this.matrixAutoUpdate=!1}updateMatrixWorld(e){const t=this.bones,n=this.geometry,i=n.getAttribute("position");Vs.copy(this.root.matrixWorld).invert();for(let s=0,a=0;s<t.length;s++){const o=t[s];o.parent&&o.parent.isBone&&(Ur.multiplyMatrices(Vs,o.matrixWorld),Ln.setFromMatrixPosition(Ur),i.setXYZ(a,Ln.x,Ln.y,Ln.z),Ur.multiplyMatrices(Vs,o.parent.matrixWorld),Ln.setFromMatrixPosition(Ur),i.setXYZ(a+1,Ln.x,Ln.y,Ln.z),a+=2)}n.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(e)}}function nc(r){const e=[];r&&r.isBone&&e.push(r);for(let t=0;t<r.children.length;t++)e.push.apply(e,nc(r.children[t]));return e}class gv extends xa{constructor(e=10,t=10,n=4473924,i=8947848){n=new Te(n),i=new Te(i);const s=t/2,a=e/t,o=e/2,l=[],c=[];for(let d=0,f=0,m=-o;d<=t;d++,m+=a){l.push(-o,0,m,o,0,m),l.push(m,0,-o,m,0,o);const v=d===s?n:i;v.toArray(c,f),f+=3,v.toArray(c,f),f+=3,v.toArray(c,f),f+=3,v.toArray(c,f),f+=3}const h=new Ye;h.setAttribute("position",new rt(l,3)),h.setAttribute("color",new rt(c,3));const u=new Pi({vertexColors:!0,toneMapped:!1});super(h,u),this.type="GridHelper"}}const vv=new Float32Array(1);new Int32Array(vv.buffer);const xv=new kn({side:ft,depthWrite:!1,depthTest:!1});new Mt(new fa,xv);Xt.create=function(r,e){return console.log("THREE.Curve.create() has been deprecated"),r.prototype=Object.create(Xt.prototype),r.prototype.constructor=r,r.prototype.getPoint=e,r};ia.prototype.fromPoints=function(r){return console.warn("THREE.Path: .fromPoints() has been renamed to .setFromPoints()."),this.setFromPoints(r)};gv.prototype.setColors=function(){console.error("THREE.GridHelper: setColors() has been deprecated, pass them in the constructor instead.")};mv.prototype.update=function(){console.error("THREE.SkeletonHelper: update() no longer needs to be called.")};Fn.prototype.extractUrlBase=function(r){return console.warn("THREE.Loader: .extractUrlBase() has been deprecated. Use THREE.LoaderUtils.extractUrlBase() instead."),qg.extractUrlBase(r)};Fn.Handlers={add:function(){console.error("THREE.Loader: Handlers.add() has been removed. Use LoadingManager.addHandler() instead.")},get:function(){console.error("THREE.Loader: Handlers.get() has been removed. Use LoadingManager.getHandler() instead.")}};qt.prototype.center=function(r){return console.warn("THREE.Box3: .center() has been renamed to .getCenter()."),this.getCenter(r)};qt.prototype.empty=function(){return console.warn("THREE.Box3: .empty() has been renamed to .isEmpty()."),this.isEmpty()};qt.prototype.isIntersectionBox=function(r){return console.warn("THREE.Box3: .isIntersectionBox() has been renamed to .intersectsBox()."),this.intersectsBox(r)};qt.prototype.isIntersectionSphere=function(r){return console.warn("THREE.Box3: .isIntersectionSphere() has been renamed to .intersectsSphere()."),this.intersectsSphere(r)};qt.prototype.size=function(r){return console.warn("THREE.Box3: .size() has been renamed to .getSize()."),this.getSize(r)};Li.prototype.empty=function(){return console.warn("THREE.Sphere: .empty() has been renamed to .isEmpty()."),this.isEmpty()};ts.prototype.setFromMatrix=function(r){return console.warn("THREE.Frustum: .setFromMatrix() has been renamed to .setFromProjectionMatrix()."),this.setFromProjectionMatrix(r)};wt.prototype.flattenToArrayOffset=function(r,e){return console.warn("THREE.Matrix3: .flattenToArrayOffset() has been deprecated. Use .toArray() instead."),this.toArray(r,e)};wt.prototype.multiplyVector3=function(r){return console.warn("THREE.Matrix3: .multiplyVector3() has been removed. Use vector.applyMatrix3( matrix ) instead."),r.applyMatrix3(this)};wt.prototype.multiplyVector3Array=function(){console.error("THREE.Matrix3: .multiplyVector3Array() has been removed.")};wt.prototype.applyToBufferAttribute=function(r){return console.warn("THREE.Matrix3: .applyToBufferAttribute() has been removed. Use attribute.applyMatrix3( matrix ) instead."),r.applyMatrix3(this)};wt.prototype.applyToVector3Array=function(){console.error("THREE.Matrix3: .applyToVector3Array() has been removed.")};wt.prototype.getInverse=function(r){return console.warn("THREE.Matrix3: .getInverse() has been removed. Use matrixInv.copy( matrix ).invert(); instead."),this.copy(r).invert()};Le.prototype.extractPosition=function(r){return console.warn("THREE.Matrix4: .extractPosition() has been renamed to .copyPosition()."),this.copyPosition(r)};Le.prototype.flattenToArrayOffset=function(r,e){return console.warn("THREE.Matrix4: .flattenToArrayOffset() has been deprecated. Use .toArray() instead."),this.toArray(r,e)};Le.prototype.getPosition=function(){return console.warn("THREE.Matrix4: .getPosition() has been removed. Use Vector3.setFromMatrixPosition( matrix ) instead."),new b().setFromMatrixColumn(this,3)};Le.prototype.setRotationFromQuaternion=function(r){return console.warn("THREE.Matrix4: .setRotationFromQuaternion() has been renamed to .makeRotationFromQuaternion()."),this.makeRotationFromQuaternion(r)};Le.prototype.multiplyToArray=function(){console.warn("THREE.Matrix4: .multiplyToArray() has been removed.")};Le.prototype.multiplyVector3=function(r){return console.warn("THREE.Matrix4: .multiplyVector3() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Le.prototype.multiplyVector4=function(r){return console.warn("THREE.Matrix4: .multiplyVector4() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Le.prototype.multiplyVector3Array=function(){console.error("THREE.Matrix4: .multiplyVector3Array() has been removed.")};Le.prototype.rotateAxis=function(r){console.warn("THREE.Matrix4: .rotateAxis() has been removed. Use Vector3.transformDirection( matrix ) instead."),r.transformDirection(this)};Le.prototype.crossVector=function(r){return console.warn("THREE.Matrix4: .crossVector() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Le.prototype.translate=function(){console.error("THREE.Matrix4: .translate() has been removed.")};Le.prototype.rotateX=function(){console.error("THREE.Matrix4: .rotateX() has been removed.")};Le.prototype.rotateY=function(){console.error("THREE.Matrix4: .rotateY() has been removed.")};Le.prototype.rotateZ=function(){console.error("THREE.Matrix4: .rotateZ() has been removed.")};Le.prototype.rotateByAxis=function(){console.error("THREE.Matrix4: .rotateByAxis() has been removed.")};Le.prototype.applyToBufferAttribute=function(r){return console.warn("THREE.Matrix4: .applyToBufferAttribute() has been removed. Use attribute.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Le.prototype.applyToVector3Array=function(){console.error("THREE.Matrix4: .applyToVector3Array() has been removed.")};Le.prototype.makeFrustum=function(r,e,t,n,i,s){return console.warn("THREE.Matrix4: .makeFrustum() has been removed. Use .makePerspective( left, right, top, bottom, near, far ) instead."),this.makePerspective(r,e,n,t,i,s)};Le.prototype.getInverse=function(r){return console.warn("THREE.Matrix4: .getInverse() has been removed. Use matrixInv.copy( matrix ).invert(); instead."),this.copy(r).invert()};sn.prototype.isIntersectionLine=function(r){return console.warn("THREE.Plane: .isIntersectionLine() has been renamed to .intersectsLine()."),this.intersectsLine(r)};Pt.prototype.multiplyVector3=function(r){return console.warn("THREE.Quaternion: .multiplyVector3() has been removed. Use is now vector.applyQuaternion( quaternion ) instead."),r.applyQuaternion(this)};Pt.prototype.inverse=function(){return console.warn("THREE.Quaternion: .inverse() has been renamed to invert()."),this.invert()};Yn.prototype.isIntersectionBox=function(r){return console.warn("THREE.Ray: .isIntersectionBox() has been renamed to .intersectsBox()."),this.intersectsBox(r)};Yn.prototype.isIntersectionPlane=function(r){return console.warn("THREE.Ray: .isIntersectionPlane() has been renamed to .intersectsPlane()."),this.intersectsPlane(r)};Yn.prototype.isIntersectionSphere=function(r){return console.warn("THREE.Ray: .isIntersectionSphere() has been renamed to .intersectsSphere()."),this.intersectsSphere(r)};pt.prototype.area=function(){return console.warn("THREE.Triangle: .area() has been renamed to .getArea()."),this.getArea()};pt.prototype.barycoordFromPoint=function(r,e){return console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord()."),this.getBarycoord(r,e)};pt.prototype.midpoint=function(r){return console.warn("THREE.Triangle: .midpoint() has been renamed to .getMidpoint()."),this.getMidpoint(r)};pt.prototypenormal=function(r){return console.warn("THREE.Triangle: .normal() has been renamed to .getNormal()."),this.getNormal(r)};pt.prototype.plane=function(r){return console.warn("THREE.Triangle: .plane() has been renamed to .getPlane()."),this.getPlane(r)};pt.barycoordFromPoint=function(r,e,t,n,i){return console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord()."),pt.getBarycoord(r,e,t,n,i)};pt.normal=function(r,e,t,n){return console.warn("THREE.Triangle: .normal() has been renamed to .getNormal()."),pt.getNormal(r,e,t,n)};ba.prototype.extractAllPoints=function(r){return console.warn("THREE.Shape: .extractAllPoints() has been removed. Use .extractPoints() instead."),this.extractPoints(r)};ba.prototype.extrude=function(r){return console.warn("THREE.Shape: .extrude() has been removed. Use ExtrudeGeometry() instead."),new is(this,r)};ba.prototype.makeGeometry=function(r){return console.warn("THREE.Shape: .makeGeometry() has been removed. Use ShapeGeometry() instead."),new dg(this,r)};se.prototype.fromAttribute=function(r,e,t){return console.warn("THREE.Vector2: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,e,t)};se.prototype.distanceToManhattan=function(r){return console.warn("THREE.Vector2: .distanceToManhattan() has been renamed to .manhattanDistanceTo()."),this.manhattanDistanceTo(r)};se.prototype.lengthManhattan=function(){return console.warn("THREE.Vector2: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};b.prototype.setEulerFromRotationMatrix=function(){console.error("THREE.Vector3: .setEulerFromRotationMatrix() has been removed. Use Euler.setFromRotationMatrix() instead.")};b.prototype.setEulerFromQuaternion=function(){console.error("THREE.Vector3: .setEulerFromQuaternion() has been removed. Use Euler.setFromQuaternion() instead.")};b.prototype.getPositionFromMatrix=function(r){return console.warn("THREE.Vector3: .getPositionFromMatrix() has been renamed to .setFromMatrixPosition()."),this.setFromMatrixPosition(r)};b.prototype.getScaleFromMatrix=function(r){return console.warn("THREE.Vector3: .getScaleFromMatrix() has been renamed to .setFromMatrixScale()."),this.setFromMatrixScale(r)};b.prototype.getColumnFromMatrix=function(r,e){return console.warn("THREE.Vector3: .getColumnFromMatrix() has been renamed to .setFromMatrixColumn()."),this.setFromMatrixColumn(e,r)};b.prototype.applyProjection=function(r){return console.warn("THREE.Vector3: .applyProjection() has been removed. Use .applyMatrix4( m ) instead."),this.applyMatrix4(r)};b.prototype.fromAttribute=function(r,e,t){return console.warn("THREE.Vector3: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,e,t)};b.prototype.distanceToManhattan=function(r){return console.warn("THREE.Vector3: .distanceToManhattan() has been renamed to .manhattanDistanceTo()."),this.manhattanDistanceTo(r)};b.prototype.lengthManhattan=function(){return console.warn("THREE.Vector3: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};tt.prototype.fromAttribute=function(r,e,t){return console.warn("THREE.Vector4: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,e,t)};tt.prototype.lengthManhattan=function(){return console.warn("THREE.Vector4: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};Ze.prototype.getChildByName=function(r){return console.warn("THREE.Object3D: .getChildByName() has been renamed to .getObjectByName()."),this.getObjectByName(r)};Ze.prototype.renderDepth=function(){console.warn("THREE.Object3D: .renderDepth has been removed. Use .renderOrder, instead.")};Ze.prototype.translate=function(r,e){return console.warn("THREE.Object3D: .translate() has been removed. Use .translateOnAxis( axis, distance ) instead."),this.translateOnAxis(e,r)};Ze.prototype.getWorldRotation=function(){console.error("THREE.Object3D: .getWorldRotation() has been removed. Use THREE.Object3D.getWorldQuaternion( target ) instead.")};Ze.prototype.applyMatrix=function(r){return console.warn("THREE.Object3D: .applyMatrix() has been renamed to .applyMatrix4()."),this.applyMatrix4(r)};Object.defineProperties(Ze.prototype,{eulerOrder:{get:function(){return console.warn("THREE.Object3D: .eulerOrder is now .rotation.order."),this.rotation.order},set:function(r){console.warn("THREE.Object3D: .eulerOrder is now .rotation.order."),this.rotation.order=r}},useQuaternion:{get:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")},set:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")}}});Mt.prototype.setDrawMode=function(){console.error("THREE.Mesh: .setDrawMode() has been removed. The renderer now always assumes THREE.TrianglesDrawMode. Transform your geometry via BufferGeometryUtils.toTrianglesDrawMode() if necessary.")};Object.defineProperties(Mt.prototype,{drawMode:{get:function(){return console.error("THREE.Mesh: .drawMode has been removed. The renderer now always assumes THREE.TrianglesDrawMode."),Jh},set:function(){console.error("THREE.Mesh: .drawMode has been removed. The renderer now always assumes THREE.TrianglesDrawMode. Transform your geometry via BufferGeometryUtils.toTrianglesDrawMode() if necessary.")}}});Nl.prototype.initBones=function(){console.error("THREE.SkinnedMesh: initBones() has been removed.")};Nt.prototype.setLens=function(r,e){console.warn("THREE.PerspectiveCamera.setLens is deprecated. Use .setFocalLength and .filmGauge for a photographic setup."),e!==void 0&&(this.filmGauge=e),this.setFocalLength(r)};Object.defineProperties(ln.prototype,{onlyShadow:{set:function(){console.warn("THREE.Light: .onlyShadow has been removed.")}},shadowCameraFov:{set:function(r){console.warn("THREE.Light: .shadowCameraFov is now .shadow.camera.fov."),this.shadow.camera.fov=r}},shadowCameraLeft:{set:function(r){console.warn("THREE.Light: .shadowCameraLeft is now .shadow.camera.left."),this.shadow.camera.left=r}},shadowCameraRight:{set:function(r){console.warn("THREE.Light: .shadowCameraRight is now .shadow.camera.right."),this.shadow.camera.right=r}},shadowCameraTop:{set:function(r){console.warn("THREE.Light: .shadowCameraTop is now .shadow.camera.top."),this.shadow.camera.top=r}},shadowCameraBottom:{set:function(r){console.warn("THREE.Light: .shadowCameraBottom is now .shadow.camera.bottom."),this.shadow.camera.bottom=r}},shadowCameraNear:{set:function(r){console.warn("THREE.Light: .shadowCameraNear is now .shadow.camera.near."),this.shadow.camera.near=r}},shadowCameraFar:{set:function(r){console.warn("THREE.Light: .shadowCameraFar is now .shadow.camera.far."),this.shadow.camera.far=r}},shadowCameraVisible:{set:function(){console.warn("THREE.Light: .shadowCameraVisible has been removed. Use new THREE.CameraHelper( light.shadow.camera ) instead.")}},shadowBias:{set:function(r){console.warn("THREE.Light: .shadowBias is now .shadow.bias."),this.shadow.bias=r}},shadowDarkness:{set:function(){console.warn("THREE.Light: .shadowDarkness has been removed.")}},shadowMapWidth:{set:function(r){console.warn("THREE.Light: .shadowMapWidth is now .shadow.mapSize.width."),this.shadow.mapSize.width=r}},shadowMapHeight:{set:function(r){console.warn("THREE.Light: .shadowMapHeight is now .shadow.mapSize.height."),this.shadow.mapSize.height=r}}});Object.defineProperties(dt.prototype,{length:{get:function(){return console.warn("THREE.BufferAttribute: .length has been deprecated. Use .count instead."),this.array.length}},dynamic:{get:function(){return console.warn("THREE.BufferAttribute: .dynamic has been deprecated. Use .usage instead."),this.usage===Yr},set:function(){console.warn("THREE.BufferAttribute: .dynamic has been deprecated. Use .usage instead."),this.setUsage(Yr)}}});dt.prototype.setDynamic=function(r){return console.warn("THREE.BufferAttribute: .setDynamic() has been deprecated. Use .setUsage() instead."),this.setUsage(r===!0?Yr:tr),this};dt.prototype.copyIndicesArray=function(){console.error("THREE.BufferAttribute: .copyIndicesArray() has been removed.")},dt.prototype.setArray=function(){console.error("THREE.BufferAttribute: .setArray has been removed. Use BufferGeometry .setAttribute to replace/resize attribute buffers")};Ye.prototype.addIndex=function(r){console.warn("THREE.BufferGeometry: .addIndex() has been renamed to .setIndex()."),this.setIndex(r)};Ye.prototype.addAttribute=function(r,e){return console.warn("THREE.BufferGeometry: .addAttribute() has been renamed to .setAttribute()."),!(e&&e.isBufferAttribute)&&!(e&&e.isInterleavedBufferAttribute)?(console.warn("THREE.BufferGeometry: .addAttribute() now expects ( name, attribute )."),this.setAttribute(r,new dt(arguments[1],arguments[2]))):r==="index"?(console.warn("THREE.BufferGeometry.addAttribute: Use .setIndex() for index attribute."),this.setIndex(e),this):this.setAttribute(r,e)};Ye.prototype.addDrawCall=function(r,e,t){t!==void 0&&console.warn("THREE.BufferGeometry: .addDrawCall() no longer supports indexOffset."),console.warn("THREE.BufferGeometry: .addDrawCall() is now .addGroup()."),this.addGroup(r,e)};Ye.prototype.clearDrawCalls=function(){console.warn("THREE.BufferGeometry: .clearDrawCalls() is now .clearGroups()."),this.clearGroups()};Ye.prototype.computeOffsets=function(){console.warn("THREE.BufferGeometry: .computeOffsets() has been removed.")};Ye.prototype.removeAttribute=function(r){return console.warn("THREE.BufferGeometry: .removeAttribute() has been renamed to .deleteAttribute()."),this.deleteAttribute(r)};Ye.prototype.applyMatrix=function(r){return console.warn("THREE.BufferGeometry: .applyMatrix() has been renamed to .applyMatrix4()."),this.applyMatrix4(r)};Object.defineProperties(Ye.prototype,{drawcalls:{get:function(){return console.error("THREE.BufferGeometry: .drawcalls has been renamed to .groups."),this.groups}},offsets:{get:function(){return console.warn("THREE.BufferGeometry: .offsets has been renamed to .groups."),this.groups}}});jn.prototype.setDynamic=function(r){return console.warn("THREE.InterleavedBuffer: .setDynamic() has been deprecated. Use .setUsage() instead."),this.setUsage(r===!0?Yr:tr),this};jn.prototype.setArray=function(){console.error("THREE.InterleavedBuffer: .setArray has been removed. Use BufferGeometry .setAttribute to replace/resize attribute buffers")};is.prototype.getArrays=function(){console.error("THREE.ExtrudeGeometry: .getArrays() has been removed.")};is.prototype.addShapeList=function(){console.error("THREE.ExtrudeGeometry: .addShapeList() has been removed.")};is.prototype.addShape=function(){console.error("THREE.ExtrudeGeometry: .addShape() has been removed.")};ga.prototype.dispose=function(){console.error("THREE.Scene: .dispose() has been removed.")};Object.defineProperties(xt.prototype,{wrapAround:{get:function(){console.warn("THREE.Material: .wrapAround has been removed.")},set:function(){console.warn("THREE.Material: .wrapAround has been removed.")}},overdraw:{get:function(){console.warn("THREE.Material: .overdraw has been removed.")},set:function(){console.warn("THREE.Material: .overdraw has been removed.")}},wrapRGB:{get:function(){return console.warn("THREE.Material: .wrapRGB has been removed."),new Te}},shading:{get:function(){console.error("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead.")},set:function(r){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=r===sl}},stencilMask:{get:function(){return console.warn("THREE."+this.type+": .stencilMask has been removed. Use .stencilFuncMask instead."),this.stencilFuncMask},set:function(r){console.warn("THREE."+this.type+": .stencilMask has been removed. Use .stencilFuncMask instead."),this.stencilFuncMask=r}}});Object.defineProperties(Xn.prototype,{derivatives:{get:function(){return console.warn("THREE.ShaderMaterial: .derivatives has been moved to .extensions.derivatives."),this.extensions.derivatives},set:function(r){console.warn("THREE. ShaderMaterial: .derivatives has been moved to .extensions.derivatives."),this.extensions.derivatives=r}}});nt.prototype.clearTarget=function(r,e,t,n){console.warn("THREE.WebGLRenderer: .clearTarget() has been deprecated. Use .setRenderTarget() and .clear() instead."),this.setRenderTarget(r),this.clear(e,t,n)};nt.prototype.animate=function(r){console.warn("THREE.WebGLRenderer: .animate() is now .setAnimationLoop()."),this.setAnimationLoop(r)};nt.prototype.getCurrentRenderTarget=function(){return console.warn("THREE.WebGLRenderer: .getCurrentRenderTarget() is now .getRenderTarget()."),this.getRenderTarget()};nt.prototype.getMaxAnisotropy=function(){return console.warn("THREE.WebGLRenderer: .getMaxAnisotropy() is now .capabilities.getMaxAnisotropy()."),this.capabilities.getMaxAnisotropy()};nt.prototype.getPrecision=function(){return console.warn("THREE.WebGLRenderer: .getPrecision() is now .capabilities.precision."),this.capabilities.precision};nt.prototype.resetGLState=function(){return console.warn("THREE.WebGLRenderer: .resetGLState() is now .state.reset()."),this.state.reset()};nt.prototype.supportsFloatTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsFloatTextures() is now .extensions.get( 'OES_texture_float' )."),this.extensions.get("OES_texture_float")};nt.prototype.supportsHalfFloatTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsHalfFloatTextures() is now .extensions.get( 'OES_texture_half_float' )."),this.extensions.get("OES_texture_half_float")};nt.prototype.supportsStandardDerivatives=function(){return console.warn("THREE.WebGLRenderer: .supportsStandardDerivatives() is now .extensions.get( 'OES_standard_derivatives' )."),this.extensions.get("OES_standard_derivatives")};nt.prototype.supportsCompressedTextureS3TC=function(){return console.warn("THREE.WebGLRenderer: .supportsCompressedTextureS3TC() is now .extensions.get( 'WEBGL_compressed_texture_s3tc' )."),this.extensions.get("WEBGL_compressed_texture_s3tc")};nt.prototype.supportsCompressedTexturePVRTC=function(){return console.warn("THREE.WebGLRenderer: .supportsCompressedTexturePVRTC() is now .extensions.get( 'WEBGL_compressed_texture_pvrtc' )."),this.extensions.get("WEBGL_compressed_texture_pvrtc")};nt.prototype.supportsBlendMinMax=function(){return console.warn("THREE.WebGLRenderer: .supportsBlendMinMax() is now .extensions.get( 'EXT_blend_minmax' )."),this.extensions.get("EXT_blend_minmax")};nt.prototype.supportsVertexTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsVertexTextures() is now .capabilities.vertexTextures."),this.capabilities.vertexTextures};nt.prototype.supportsInstancedArrays=function(){return console.warn("THREE.WebGLRenderer: .supportsInstancedArrays() is now .extensions.get( 'ANGLE_instanced_arrays' )."),this.extensions.get("ANGLE_instanced_arrays")};nt.prototype.enableScissorTest=function(r){console.warn("THREE.WebGLRenderer: .enableScissorTest() is now .setScissorTest()."),this.setScissorTest(r)};nt.prototype.initMaterial=function(){console.warn("THREE.WebGLRenderer: .initMaterial() has been removed.")};nt.prototype.addPrePlugin=function(){console.warn("THREE.WebGLRenderer: .addPrePlugin() has been removed.")};nt.prototype.addPostPlugin=function(){console.warn("THREE.WebGLRenderer: .addPostPlugin() has been removed.")};nt.prototype.updateShadowMap=function(){console.warn("THREE.WebGLRenderer: .updateShadowMap() has been removed.")};nt.prototype.setFaceCulling=function(){console.warn("THREE.WebGLRenderer: .setFaceCulling() has been removed.")};nt.prototype.allocTextureUnit=function(){console.warn("THREE.WebGLRenderer: .allocTextureUnit() has been removed.")};nt.prototype.setTexture=function(){console.warn("THREE.WebGLRenderer: .setTexture() has been removed.")};nt.prototype.setTexture2D=function(){console.warn("THREE.WebGLRenderer: .setTexture2D() has been removed.")};nt.prototype.setTextureCube=function(){console.warn("THREE.WebGLRenderer: .setTextureCube() has been removed.")};nt.prototype.getActiveMipMapLevel=function(){return console.warn("THREE.WebGLRenderer: .getActiveMipMapLevel() is now .getActiveMipmapLevel()."),this.getActiveMipmapLevel()};Object.defineProperties(nt.prototype,{shadowMapEnabled:{get:function(){return this.shadowMap.enabled},set:function(r){console.warn("THREE.WebGLRenderer: .shadowMapEnabled is now .shadowMap.enabled."),this.shadowMap.enabled=r}},shadowMapType:{get:function(){return this.shadowMap.type},set:function(r){console.warn("THREE.WebGLRenderer: .shadowMapType is now .shadowMap.type."),this.shadowMap.type=r}},shadowMapCullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")}},context:{get:function(){return console.warn("THREE.WebGLRenderer: .context has been removed. Use .getContext() instead."),this.getContext()}},vr:{get:function(){return console.warn("THREE.WebGLRenderer: .vr has been renamed to .xr"),this.xr}},gammaInput:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaInput has been removed. Set the encoding for textures via Texture.encoding instead."),!1},set:function(){console.warn("THREE.WebGLRenderer: .gammaInput has been removed. Set the encoding for textures via Texture.encoding instead.")}},gammaOutput:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaOutput has been removed. Set WebGLRenderer.outputEncoding instead."),!1},set:function(r){console.warn("THREE.WebGLRenderer: .gammaOutput has been removed. Set WebGLRenderer.outputEncoding instead."),this.outputEncoding=r===!0?hl:lr}},toneMappingWhitePoint:{get:function(){return console.warn("THREE.WebGLRenderer: .toneMappingWhitePoint has been removed."),1},set:function(){console.warn("THREE.WebGLRenderer: .toneMappingWhitePoint has been removed.")}}});Object.defineProperties(Rl.prototype,{cullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")}},renderReverseSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")}},renderSingleSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")}}});Object.defineProperties(Wn.prototype,{wrapS:{get:function(){return console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS."),this.texture.wrapS},set:function(r){console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS."),this.texture.wrapS=r}},wrapT:{get:function(){return console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT."),this.texture.wrapT},set:function(r){console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT."),this.texture.wrapT=r}},magFilter:{get:function(){return console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter."),this.texture.magFilter},set:function(r){console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter."),this.texture.magFilter=r}},minFilter:{get:function(){return console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter."),this.texture.minFilter},set:function(r){console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter."),this.texture.minFilter=r}},anisotropy:{get:function(){return console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy."),this.texture.anisotropy},set:function(r){console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy."),this.texture.anisotropy=r}},offset:{get:function(){return console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset."),this.texture.offset},set:function(r){console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset."),this.texture.offset=r}},repeat:{get:function(){return console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat."),this.texture.repeat},set:function(r){console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat."),this.texture.repeat=r}},format:{get:function(){return console.warn("THREE.WebGLRenderTarget: .format is now .texture.format."),this.texture.format},set:function(r){console.warn("THREE.WebGLRenderTarget: .format is now .texture.format."),this.texture.format=r}},type:{get:function(){return console.warn("THREE.WebGLRenderTarget: .type is now .texture.type."),this.texture.type},set:function(r){console.warn("THREE.WebGLRenderTarget: .type is now .texture.type."),this.texture.type=r}},generateMipmaps:{get:function(){return console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps."),this.texture.generateMipmaps},set:function(r){console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps."),this.texture.generateMipmaps=r}}});ev.prototype.load=function(r){console.warn("THREE.Audio: .load has been deprecated. Use THREE.AudioLoader instead.");const e=this;return new Qg().load(r,function(n){e.setBuffer(n)}),this};ma.prototype.updateCubeMap=function(r,e){return console.warn("THREE.CubeCamera: .updateCubeMap() is now .update()."),this.update(r,e)};ma.prototype.clear=function(r,e,t,n){return console.warn("THREE.CubeCamera: .clear() is now .renderTarget.clear()."),this.renderTarget.clear(r,e,t,n)};Ai.crossOrigin=void 0;Ai.loadTexture=function(r,e,t,n){console.warn("THREE.ImageUtils.loadTexture has been deprecated. Use THREE.TextureLoader() instead.");const i=new Ig;i.setCrossOrigin(this.crossOrigin);const s=i.load(r,t,void 0,n);return e&&(s.mapping=e),s};Ai.loadTextureCube=function(r,e,t,n){console.warn("THREE.ImageUtils.loadTextureCube has been deprecated. Use THREE.CubeTextureLoader() instead.");const i=new Pg;i.setCrossOrigin(this.crossOrigin);const s=i.load(r,t,void 0,n);return e&&(s.mapping=e),s};Ai.loadCompressedTexture=function(){console.error("THREE.ImageUtils.loadCompressedTexture has been removed. Use THREE.DDSLoader instead.")};Ai.loadCompressedTextureCube=function(){console.error("THREE.ImageUtils.loadCompressedTextureCube has been removed. Use THREE.DDSLoader instead.")};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:il}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=il);const Ws=new Map;async function wi(r){const e=`${tl}/data/${r}`;if(Ws.has(e))return Ws.get(e);const t=await fetch(e);if(!t.ok)throw new Error(`Failed to fetch ${e}: HTTP ${t.status}`);const n=await t.json();return Ws.set(e,n),n}async function _v(){return wi("planets.json")}async function yv(r="en-US"){const e=await _v(),t=[];for(const n of e.planets){const i=n.name.toLowerCase(),a=await wi(`i18n/${r}/planets/${i}.json`).catch(()=>null)??(r==="en-US"?null:await wi(`i18n/en-US/planets/${i}.json`).catch(()=>null));if(!a)throw new Error(`Missing planet overlay for ${i} (locale ${r}, no en-US fallback)`);t.push({...n,...a,id:i})}return t}async function Mv(r="en-US"){const e=await wi("sun.json"),n=await wi(`i18n/${r}/sun.json`).catch(()=>null)??(r==="en-US"?null:await wi("i18n/en-US/sun.json").catch(()=>null));if(!n)throw new Error(`Missing Sun overlay (locale ${r}, no en-US fallback)`);return{...e,...n}}function wv(r){const e=r-1;return e*e*e+1}function Ko(r){const e=typeof r=="string"&&r.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);return e?[parseFloat(e[1]),e[2]||"px"]:[r,"px"]}function $o(r,{delay:e=0,duration:t=400,easing:n=wv,x:i=0,y:s=0,opacity:a=0}={}){const o=getComputedStyle(r),l=+o.opacity,c=o.transform==="none"?"":o.transform,h=l*(1-a),[u,d]=Ko(i),[f,m]=Ko(s);return{delay:e,duration:t,easing:n,css:(v,x)=>`
			transform: ${c} translate(${(1-v)*u}${d}, ${(1-v)*f}${m});
			opacity: ${l-h*x}`}}function bv(r,e,t){et(e,gn(r.touches[0].clientY)),et(t,0)}function Sv(r,e,t){const n=r.touches[0].clientY-Y(e);et(t,gn(Math.max(0,n)))}function Ev(r,e,t){Y(e)>80&&t.onClose(),et(e,0)}var Tv=en('<aside class="panel svelte-gfggsh"><header class="svelte-gfggsh"><span class="title svelte-gfggsh"> </span> <button class="close svelte-gfggsh" aria-label="Close panel">×</button></header> <div class="content svelte-gfggsh"><!></div></aside>');function ic(r,e){ar(e,!0),sa(()=>{if(!e.open)return;const o=l=>{l.key==="Escape"&&e.onClose()};return window.addEventListener("keydown",o),()=>window.removeEventListener("keydown",o)});let t=Ct(0),n=Ct(0);var i=Yi(),s=Vt(i);{var a=o=>{var l=Tv();l.__touchstart=[bv,t,n],l.__touchmove=[Sv,t,n],l.__touchend=[Ev,n,e];var c=le(l),h=le(c),u=le(h,!0);ce(h);var d=fe(h,2);d.__click=function(...v){var x;(x=e.onClose)==null||x.apply(this,v)},ce(c);var f=fe(c,2),m=le(f);yc(m,()=>e.children??mi),ce(f),ce(l),Ve(()=>{Gn(l,"aria-label",e.title??"Detail panel"),kr(l,"transform",Y(n)>0?`translateY(${Y(n)}px)`:""),ze(u,e.title??"")}),Ia(1,l,()=>$o,()=>({y:14,x:14,duration:220})),Ia(2,l,()=>$o,()=>({y:14,x:14,duration:160})),Tt(o,l)};mn(s,o=>{e.open&&o(a)})}Tt(r,i),or()}Qr(["touchstart","touchmove","touchend","click"]);var Av=en('<canvas aria-label="Planet size comparison" class="svelte-14ohwbn"></canvas>');function Lv(r,e){ar(e,!0);const t=[{id:"jupiter",name:"Jupiter",r:69911,col:"#c88b3a",km:"69,911 km"},{id:"saturn",name:"Saturn",r:58232,col:"#e4d191",km:"58,232 km"},{id:"uranus",name:"Uranus",r:25362,col:"#7de8e8",km:"25,362 km"},{id:"neptune",name:"Neptune",r:24622,col:"#4466bb",km:"24,622 km"},{id:"earth",name:"Earth",r:6371,col:"#4b9cd3",km:"6,371 km"},{id:"venus",name:"Venus",r:6052,col:"#e8cda0",km:"6,052 km"},{id:"mars",name:"Mars",r:3390,col:"#c1440e",km:"3,390 km"},{id:"mercury",name:"Mercury",r:2440,col:"#c8c8c8",km:"2,440 km"}];let n=Ct(void 0);function i(){if(!Y(n))return;const a=Y(n).getContext("2d");if(!a)return;const o=Math.min(window.devicePixelRatio,2),l=Y(n).clientWidth,c=Y(n).clientHeight;Y(n).width=Math.floor(l*o),Y(n).height=Math.floor(c*o),a.setTransform(o,0,0,o,0,0),a.fillStyle="#06061a",a.fillRect(0,0,l,c);const h=t[0].r,d=60/h,f=12,m=80,v=l-m-12;let x=8;a.font='6px "Space Mono", monospace',a.fillStyle="rgba(255,255,255,0.18)",a.textAlign="left",a.fillText("PLANET SIZE COMPARISON · TRUE RELATIVE RADII",f,x+6),x+=16;for(const g of t){const p=Math.max(1.5,g.r*d),E=e.highlightId===g.id,T=Math.max(p*2+6,18),S=x+T/2;E&&(a.fillStyle="rgba(68,102,255,0.08)",a.fillRect(0,x,l,T)),a.font=`${E?"bold ":""}${Math.min(8,6+p*.05)}px "Space Mono", monospace`,a.fillStyle=E?"#fff":g.col+"cc",a.textAlign="left",a.fillText(g.name,f,S+3);const _=Math.max(2,g.r/h*v);a.fillStyle="rgba(255,255,255,0.05)",a.fillRect(m,S-2.5,v,5);const P=a.createLinearGradient(m,0,m+_,0);P.addColorStop(0,g.col+"cc"),P.addColorStop(1,g.col+"44"),a.fillStyle=P,a.fillRect(m,S-2.5,_,5);const N=m+_+p+4;if(N+p<l-2){const z=a.createRadialGradient(N-p*.3,S-p*.3,p*.05,N,S,p);z.addColorStop(0,g.col+"ee"),z.addColorStop(1,g.col+"44"),a.beginPath(),a.arc(N,S,p,0,Math.PI*2),a.fillStyle=z,a.fill(),E&&(a.strokeStyle="rgba(255,255,255,0.7)",a.lineWidth=1,a.stroke())}if(a.font='6px "Space Mono", monospace',a.fillStyle=E?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.2)",a.textAlign="right",a.fillText(g.km,l-4,S+3),x+=T+3,x>c-10)break}a.font='5px "Space Mono", monospace',a.fillStyle="rgba(255,255,255,0.1)",a.textAlign="left",a.fillText("Source: IAU · NASA · radii are mean values",f,c-4)}el(()=>{i();const a=new ResizeObserver(()=>i());return Y(n)&&a.observe(Y(n)),()=>a.disconnect()}),sa(()=>{e.highlightId,i()});var s=Av();Xs(s,a=>et(n,a),()=>Y(n)),Tt(r,s),or()}var Cv=(r,e)=>et(e,"overview"),Rv=(r,e)=>et(e,"technical"),Pv=(r,e)=>et(e,"sizes"),Iv=en('<p class="editorial svelte-5x6749"> </p> <p class="editorial svelte-5x6749"> </p>',1),Dv=en('<div class="grid svelte-5x6749"><div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">SEMI-MAJOR AXIS</div> <div class="cell-value svelte-5x6749"> </div></div> <div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">ORBITAL PERIOD</div> <div class="cell-value svelte-5x6749"> </div></div> <div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">ECCENTRICITY</div> <div class="cell-value svelte-5x6749"> </div></div> <div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">INCLINATION</div> <div class="cell-value teal svelte-5x6749"> </div></div> <div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">PERIHELION</div> <div class="cell-value svelte-5x6749"> </div></div> <div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">APHELION</div> <div class="cell-value svelte-5x6749"> </div></div> <div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">AXIAL TILT</div> <div class="cell-value svelte-5x6749"> </div></div> <div class="cell svelte-5x6749"><div class="cell-label svelte-5x6749">MEAN VELOCITY</div> <div class="cell-value svelte-5x6749"> </div></div></div> <div class="shape-row svelte-5x6749"><div class="shape-meta svelte-5x6749"> </div> <div class="shape-display svelte-5x6749"><div class="shape-ellipse svelte-5x6749"></div> <span> </span></div></div> <div class="dist-row svelte-5x6749"><span> </span></div> <div class="src svelte-5x6749">Source: IAU · JPL Planetary Fact Sheets · J2000 epoch</div>',1),Nv=en('<div class="cta-bar svelte-5x6749"><button type="button" class="cta svelte-5x6749"> </button></div>'),Fv=en('<div class="head svelte-5x6749"><div class="type svelte-5x6749"> </div> <div class="name svelte-5x6749"> </div> <div class="stat-row svelte-5x6749"><div class="stat svelte-5x6749"><div class="stat-label svelte-5x6749">FROM SUN</div> <div class="stat-value svelte-5x6749"> </div></div> <div class="stat svelte-5x6749"><div class="stat-label svelte-5x6749">ORBITAL PERIOD</div> <div class="stat-value svelte-5x6749"> </div></div></div></div> <div class="tabs svelte-5x6749" role="tablist"><button type="button" role="tab" class="svelte-5x6749">OVERVIEW</button> <button type="button" role="tab" class="svelte-5x6749">TECHNICAL</button> <button type="button" role="tab" class="svelte-5x6749">SIZES</button></div> <div class="tab-content svelte-5x6749"><!></div> <!>',1);function Bv(r,e){ar(e,!0);let t=Ct("overview"),n=Ct(null);sa(()=>{e.planet&&e.planet.id!==Y(n)&&(et(t,"overview"),et(n,gn(e.planet.id)))});const i=4*Math.PI**2,s=4.7404,a=149.5978707;let o=at(()=>e.planet?e.planet.a*(1-e.planet.e):0),l=at(()=>e.planet?e.planet.a*(1+e.planet.e):0),c=at(()=>e.planet?Math.sqrt(i*(2/e.planet.a-1/e.planet.a))*s:0),h=at(()=>e.planet?(1+e.planet.e)/(1-e.planet.e):1),u=at(()=>e.planet?e.planet.e<.05?"Nearly circular":e.planet.e<.1?"Slightly elliptical":e.planet.e<.2?"Notably elliptical":"Highly elliptical":""),d=at(()=>e.planet?e.planet.a*a:0),f=at(()=>e.planet?`${e.planet.a.toFixed(2)} AU`:""),m=at(()=>e.planet?e.planet.T<365.25*1.5?`${e.planet.T.toFixed(1)} days`:`${(e.planet.T/365.25).toFixed(1)} yrs`:"");var v=at(()=>{var x;return((x=e.planet)==null?void 0:x.name)??""});ic(r,{get open(){return e.open},get onClose(){return e.onClose},get title(){return Y(v)},children:(x,g)=>{var p=Yi(),E=Vt(p);{var T=S=>{var _=Fv(),P=Vt(_),N=le(P),z=le(N,!0);Ve(()=>ze(z,e.planet.type.toUpperCase())),ce(N);var V=fe(N,2),J=le(V,!0);ce(V);var O=fe(V,2),C=le(O),I=fe(le(C),2),R=le(I,!0);ce(I),ce(C);var A=fe(C,2),X=fe(le(A),2),ee=le(X,!0);ce(X),ce(A),ce(O),ce(P);var Z=fe(P,2),ae=le(Z);ae.__click=[Cv,t];var te=fe(ae,2);te.__click=[Rv,t];var pe=fe(te,2);pe.__click=[Pv,t],ce(Z);var xe=fe(Z,2),H=le(xe);{var Oe=Ae=>{var ge=Iv(),_e=Vt(ge),j=le(_e,!0);ce(_e);var Q=fe(_e,2),K=le(Q,!0);ce(Q),Ve(()=>{ze(j,e.planet.fact),ze(K,e.planet.bio)}),Tt(Ae,ge)},Fe=Ae=>{var ge=Yi(),_e=Vt(ge);{var j=K=>{var ne=Dv(),re=Vt(ne),w=le(re),M=fe(le(w),2),k=le(M);Ve(()=>ze(k,`${e.planet.a.toFixed(4)??""} AU`)),ce(M),ce(w);var W=fe(w,2),he=fe(le(W),2),me=le(he);Ve(()=>ze(me,`${e.planet.T.toFixed(1)??""} days`)),ce(he),ce(W);var De=fe(W,2),be=fe(le(De),2),L=le(be);Ve(()=>ze(L,`e = ${e.planet.e.toFixed(4)??""}`)),ce(be),ce(De);var $=fe(De,2),ie=fe(le($),2),ve=le(ie);Ve(()=>ze(ve,`${e.planet.incl.toFixed(2)??""}°`)),ce(ie),ce($);var q=fe($,2),Me=fe(le(q),2),ke=le(Me);Ve(()=>ze(ke,`${Y(o).toFixed(4)??""} AU`)),ce(Me),ce(q);var Je=fe(q,2),Dt=fe(le(Je),2),it=le(Dt);Ve(()=>ze(it,`${Y(l).toFixed(4)??""} AU`)),ce(Dt),ce(Je);var St=fe(Je,2),mt=fe(le(St),2),Zn=le(mt);Ve(()=>ze(Zn,`${e.planet.axialTilt.toFixed(2)??""}°`)),ce(mt),ce(St);var xn=fe(St,2),_n=fe(le(xn),2),We=le(_n);Ve(()=>ze(We,`${Y(c).toFixed(2)??""} km/s`)),ce(_n),ce(xn),ce(re);var G=fe(re,2),Lt=le(G);const Yt=at(()=>e.planet.e.toFixed(3)??""),Ht=at(()=>Y(h).toFixed(2)??"");var yn=le(Lt);Ve(()=>ze(yn,`ORBIT SHAPE · e=${Y(Yt)} · perihelion vs aphelion ×${Y(Ht)}`)),ce(Lt);var Ft=fe(Lt,2),kt=le(Ft);const Bn=at(()=>`${Math.max(50,70-Math.round(e.planet.e*180))??""}px`);Ve(()=>kr(kt,"--shape-w",Y(Bn)));var y=fe(kt,2),F=le(y,!0);ce(y),ce(Ft),ce(G);var D=fe(G,2),U=le(D);const ue=at(()=>Y(d).toFixed(0)??""),He=at(()=>e.planet.rotPeriod.toFixed(2)??"");var Ce=le(U);Ve(()=>ze(Ce,`${Y(ue)} M km from Sun · rotation ${Y(He)} days`)),ce(U),ce(D),gc(2),Ve(()=>{Rn(mt,"gold",e.planet.axialTilt>10),ze(F,Y(u))}),Tt(K,ne)},Q=K=>{var ne=Yi(),re=Vt(ne);{var w=M=>{Lv(M,{get highlightId(){return e.planet.id}})};mn(re,M=>{Y(t)==="sizes"&&M(w)},!0)}Tt(K,ne)};mn(_e,K=>{Y(t)==="technical"?K(j):K(Q,!1)},!0)}Tt(Ae,ge)};mn(H,Ae=>{Y(t)==="overview"?Ae(Oe):Ae(Fe,!1)})}ce(xe);var we=fe(xe,2);{var ye=Ae=>{var ge=Nv(),_e=le(ge);_e.__click=function(...Q){var K;(K=e.onPlanMission)==null||K.apply(this,Q)};var j=le(_e);Ve(()=>ze(j,`▶ PLAN A MISSION TO ${e.planet.name.toUpperCase()??""}`)),ce(_e),ce(ge),Tt(Ae,ge)};mn(we,Ae=>{e.planet.missionable&&e.onPlanMission&&Ae(ye)})}Ve(()=>{ze(J,e.planet.name),ze(R,Y(f)),ze(ee,Y(m)),Gn(ae,"aria-selected",Y(t)==="overview"),Rn(ae,"active",Y(t)==="overview"),Gn(te,"aria-selected",Y(t)==="technical"),Rn(te,"active",Y(t)==="technical"),Gn(pe,"aria-selected",Y(t)==="sizes"),Rn(pe,"active",Y(t)==="sizes")}),Tt(S,_)};mn(E,S=>{e.planet&&S(T)})}Tt(x,p)},$$slots:{default:!0}}),or()}Qr(["click"]);var zv=(r,e)=>et(e,"overview"),Ov=(r,e)=>et(e,"technical"),Uv=en('<p class="editorial svelte-1fvy167"> </p> <p class="editorial svelte-1fvy167"> </p>',1),Hv=en('<div class="grid svelte-1fvy167"><div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">RADIUS</div> <div class="cell-value svelte-1fvy167"> </div> <div class="cell-sub svelte-1fvy167"> </div></div> <div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">MASS</div> <div class="cell-value svelte-1fvy167">2 × 10³⁰ kg</div> <div class="cell-sub svelte-1fvy167"> </div></div> <div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">SURFACE TEMP</div> <div class="cell-value gold svelte-1fvy167"> </div></div> <div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">CORE TEMP</div> <div class="cell-value gold svelte-1fvy167"> </div></div> <div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">LUMINOSITY</div> <div class="cell-value svelte-1fvy167"> </div></div> <div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">AGE</div> <div class="cell-value svelte-1fvy167"> </div> <div class="cell-sub svelte-1fvy167"> </div></div> <div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">AXIAL TILT</div> <div class="cell-value svelte-1fvy167"> </div></div> <div class="cell svelte-1fvy167"><div class="cell-label svelte-1fvy167">ROTATION</div> <div class="cell-value svelte-1fvy167"> </div> <div class="cell-sub svelte-1fvy167"> </div></div></div> <div class="src svelte-1fvy167"> </div>',1),kv=en('<div class="head svelte-1fvy167"><div class="type svelte-1fvy167"> </div> <div class="name svelte-1fvy167"> </div> <div class="stat-row svelte-1fvy167"><div class="stat svelte-1fvy167"><div class="stat-label svelte-1fvy167">SPECTRAL CLASS</div> <div class="stat-value svelte-1fvy167"> </div></div> <div class="stat svelte-1fvy167"><div class="stat-label svelte-1fvy167">SYSTEM MASS</div> <div class="stat-value svelte-1fvy167"> </div></div></div></div> <div class="tabs svelte-1fvy167" role="tablist"><button type="button" role="tab" class="svelte-1fvy167">OVERVIEW</button> <button type="button" role="tab" class="svelte-1fvy167">TECHNICAL</button></div> <div class="tab-content svelte-1fvy167"><!></div>',1);function Gv(r,e){ar(e,!0);let t=Ct("overview"),n=at(()=>e.sun?e.sun.mass_kg/5972e21:0),i=at(()=>e.sun?e.sun.radius_km/6371:0),s=at(()=>e.sun?e.sun.luminosity_w/3828e23:0),a=at(()=>e.sun?Math.max(0,10-e.sun.age_gyr):0);var o=at(()=>{var l;return((l=e.sun)==null?void 0:l.name)??""});ic(r,{get open(){return e.open},get onClose(){return e.onClose},get title(){return Y(o)},children:(l,c)=>{var h=Yi(),u=Vt(h);{var d=f=>{var m=kv(),v=Vt(m),x=le(v),g=le(x,!0);Ve(()=>ze(g,e.sun.type.toUpperCase())),ce(x);var p=fe(x,2),E=le(p,!0);ce(p);var T=fe(p,2),S=le(T),_=fe(le(S),2),P=le(_,!0);ce(_),ce(S);var N=fe(S,2),z=fe(le(N),2),V=le(z);Ve(()=>ze(V,`${e.sun.mass_fraction_pct.toFixed(2)??""}%`)),ce(z),ce(N),ce(T),ce(v);var J=fe(v,2),O=le(J);O.__click=[zv,t];var C=fe(O,2);C.__click=[Ov,t],ce(J);var I=fe(J,2),R=le(I);{var A=ee=>{var Z=Uv(),ae=Vt(Z),te=le(ae,!0);ce(ae);var pe=fe(ae,2),xe=le(pe,!0);ce(pe),Ve(()=>{ze(te,e.sun.fact),ze(xe,e.sun.bio)}),Tt(ee,Z)},X=ee=>{var Z=Hv(),ae=Vt(Z),te=le(ae),pe=fe(le(te),2),xe=le(pe);Ve(()=>ze(xe,`${(e.sun.radius_km/1e3).toFixed(0)??""},700 km`)),ce(pe);var H=fe(pe,2),Oe=le(H);Ve(()=>ze(Oe,`${Y(i).toFixed(0)??""}× Earth`)),ce(H),ce(te);var Fe=fe(te,2),we=fe(le(Fe),4),ye=le(we);Ve(()=>ze(ye,`${Y(n).toExponential(2)??""}× Earth`)),ce(we),ce(Fe);var Ae=fe(Fe,2),ge=fe(le(Ae),2),_e=le(ge);Ve(()=>ze(_e,`${e.sun.surface_temp_k.toFixed(0)??""} K`)),ce(ge),ce(Ae);var j=fe(Ae,2),Q=fe(le(j),2),K=le(Q);Ve(()=>ze(K,`${(e.sun.core_temp_k/1e6).toFixed(1)??""} M K`)),ce(Q),ce(j);var ne=fe(j,2),re=fe(le(ne),2),w=le(re);Ve(()=>ze(w,`${Y(s).toFixed(2)??""} L☉`)),ce(re),ce(ne);var M=fe(ne,2),k=fe(le(M),2),W=le(k);Ve(()=>ze(W,`${e.sun.age_gyr.toFixed(1)??""} Gyr`)),ce(k);var he=fe(k,2),me=le(he);Ve(()=>ze(me,`~${Y(a).toFixed(1)??""} Gyr remaining`)),ce(he),ce(M);var De=fe(M,2),be=fe(le(De),2),L=le(be);Ve(()=>ze(L,`${e.sun.axial_tilt.toFixed(2)??""}°`)),ce(be),ce(De);var $=fe(De,2),ie=fe(le($),2),ve=le(ie);Ve(()=>ze(ve,`${e.sun.equatorial_rot_days.toFixed(1)??""} d`)),ce(ie);var q=fe(ie,2),Me=le(q);Ve(()=>ze(Me,`poles ${e.sun.polar_rot_days.toFixed(1)??""} d (differential)`)),ce(q),ce($),ce(ae);var ke=fe(ae,2),Je=le(ke);ce(ke),Ve(()=>ze(Je,`Source: NASA · IAU · absolute magnitude ${e.sun.absolute_magnitude??""}`)),Tt(ee,Z)};mn(R,ee=>{Y(t)==="overview"?ee(A):ee(X,!1)})}ce(I),Ve(()=>{ze(E,e.sun.name),ze(P,e.sun.spectral_class),Gn(O,"aria-selected",Y(t)==="overview"),Rn(O,"active",Y(t)==="overview"),Gn(C,"aria-selected",Y(t)==="technical"),Rn(C,"active",Y(t)==="technical")}),Tt(f,m)};mn(u,f=>{e.sun&&f(d)})}Tt(l,h)},$$slots:{default:!0}}),or()}Qr(["click"]);function Vv(r,e){et(e,gn(Y(e)==="3d"?"2d":"3d"))}var Wv=en('<div class="tooltip svelte-19xk7nl"><div class="tt-line svelte-19xk7nl"> </div> <div class="tt-line dim svelte-19xk7nl"> </div> <div class="tt-line dim svelte-19xk7nl"> </div></div>'),Xv=en('<div class="explore svelte-19xk7nl"><div class="layer svelte-19xk7nl"></div> <canvas class="layer svelte-19xk7nl"></canvas> <button class="toggle svelte-19xk7nl" type="button"> </button> <!></div> <!> <!>',1);function ex(r,e){ar(e,!0);const t=[{id:"mercury",name:"Mercury",orbitR:52,size3:2.8,size2:3,color3:11908533,css:"#b5b5b5",period:.241,a0:.5,inc:7},{id:"venus",name:"Venus",orbitR:83,size3:5,size2:5,color3:15256992,css:"#e8cda0",period:.615,a0:2.1,inc:3.4},{id:"earth",name:"Earth",orbitR:113,size3:5.2,size2:5.5,color3:3837900,css:"#4b9cd3",period:1,a0:0,inc:0},{id:"mars",name:"Mars",orbitR:155,size3:3.8,size2:4,color3:12665870,css:"#c1440e",period:1.881,a0:1.8,inc:1.85},{id:"jupiter",name:"Jupiter",orbitR:248,size3:13.5,size2:13,color3:13142842,css:"#c88b3a",period:11.86,a0:1.2,inc:1.3},{id:"saturn",name:"Saturn",orbitR:320,size3:11,size2:11,color3:14995857,css:"#e4d191",period:29.46,a0:3.5,inc:2.49,hasRings:!0},{id:"uranus",name:"Uranus",orbitR:378,size3:7.5,size2:7.5,color3:8251624,css:"#7de8e8",period:84.01,a0:5.1,inc:.77},{id:"neptune",name:"Neptune",orbitR:430,size3:7,size2:7,color3:4150458,css:"#3f54ba",period:164.8,a0:2.8,inc:1.77}];let n=Ct(void 0),i=Ct(void 0),s=Ct("3d"),a=Ct(gn([])),o=Ct(null),l=Ct(null),c=Ct(!1),h=Ct(!1),u=Ct(null),d,f=at(()=>new Map(Y(a).map(R=>[R.id,R]))),m=at(()=>Y(l)?Y(f).get(Y(l))??null:null);function v(R){et(l,gn(R)),et(c,!0),et(h,!1)}function x(){et(h,!0),et(c,!1)}function g(){et(c,!1)}function p(){et(h,!1)}function E(){var R;(R=Y(m))!=null&&R.missionable&&Mc(`${tl}/plan`)}el(()=>{if(!Y(n)||!Y(i))return;yv().then(B=>{et(a,gn(B))}).catch(B=>console.error("Failed to load planets:",B)),Mv().then(B=>{et(o,gn(B))}).catch(B=>console.error("Failed to load sun:",B));const R=new ga,A=new Nt(55,Y(n).clientWidth/Y(n).clientHeight,.5,8e3),X=new nt({antialias:!0,alpha:!1});X.setPixelRatio(Math.min(window.devicePixelRatio,2)),X.setSize(Y(n).clientWidth,Y(n).clientHeight),X.setClearColor(263180,1),Y(n).appendChild(X.domElement),R.add(new Jl(16774352,3.5,2500,1.2)),R.add(new ec(1118515,.8));const ee=new $l(2241382,.3);ee.position.set(-200,100,-200),R.add(ee);const Z=new Mt(new Os(18,32,32),new kn({color:16773280}));Z.userData={planetId:"__sun__"},R.add(Z);const ae=[{r:22,color:16768358,opacity:.18},{r:40,color:16750882,opacity:.08},{r:58,color:16737792,opacity:.04},{r:76,color:16729088,opacity:.02}];for(const B of ae)R.add(new Mt(new Os(B.r,16,16),new kn({color:B.color,transparent:!0,opacity:B.opacity,side:ft,blending:Ys,depthWrite:!1})));const te=3e3,pe=new Float32Array(te*3);for(let B=0;B<te;B++){const Se=3e3+Math.random()*1e3,Be=Math.random()*Math.PI*2,oe=Math.acos(2*Math.random()-1);pe[B*3]=Se*Math.sin(oe)*Math.cos(Be),pe[B*3+1]=Se*Math.sin(oe)*Math.sin(Be),pe[B*3+2]=Se*Math.cos(oe)}const xe=new Ye;xe.setAttribute("position",new dt(pe,3)),R.add(new ea(xe,new jr({color:14542079,size:1.2,sizeAttenuation:!1,transparent:!0,opacity:.7})));const H=1800,Oe=new Float32Array(H*3);for(let B=0;B<H;B++){const Se=Math.random()*Math.PI*2,Be=195+Math.random()*42;Oe[B*3]=Math.cos(Se)*Be,Oe[B*3+1]=(Math.random()-.5)*8,Oe[B*3+2]=Math.sin(Se)*Be}const Fe=new Ye;Fe.setAttribute("position",new dt(Oe,3)),R.add(new ea(Fe,new jr({color:12100720,size:1,sizeAttenuation:!0,transparent:!0,opacity:.5}))),t.forEach(B=>{const Se=B.inc*Math.PI/180,Be=[];for(let Ue=0;Ue<=128;Ue++){const Ee=Ue/128*Math.PI*2,Ne=Math.cos(Ee)*B.orbitR,Qe=Math.sin(Ee)*B.orbitR;Be.push(new b(Ne,Qe*Math.sin(Se),Qe*Math.cos(Se)))}const oe=new Pi({color:16777215,transparent:!0,opacity:.06,depthWrite:!1});R.add(new Fl(new Ye().setFromPoints(Be),oe))});const we=t.map(B=>{const Se=new _i,Be=new Hl({color:B.color3,emissive:B.color3,emissiveIntensity:.12,shininess:25,specular:4473924}),oe=new Mt(new Os(B.size3,32,32),Be);if(oe.userData={planetId:B.id},Se.add(oe),B.hasRings){const Ue=new ug(B.size3*1.4,B.size3*2.6,64),Ee=new kn({color:14995857,transparent:!0,opacity:.45,side:bi,depthWrite:!1}),Ne=new Mt(Ue,Ee);Ne.rotation.x=Math.PI/2.2,Se.add(Ne)}return R.add(Se),{group:Se,mesh:oe,planet:B}}),ye=new pg(1,.18,12,64),Ae=new kn({color:4482815,transparent:!0,opacity:.5,depthWrite:!1,side:bi}),ge=new Mt(ye,Ae);ge.visible=!1,R.add(ge);let _e=680,j=1.05,Q=.6;const K=()=>{A.position.set(_e*Math.sin(j)*Math.sin(Q),_e*Math.cos(j),_e*Math.sin(j)*Math.cos(Q)),A.lookAt(0,0,0)};K();const ne=X.domElement;let re=!1,w=0,M=0,k=!1,W=0,he=0;const me=new Jo,De=we.map(B=>B.mesh),be=[...De,Z],L=B=>{const Se=ne.getBoundingClientRect(),Be=(B.clientX-Se.left)/Se.width*2-1,oe=-((B.clientY-Se.top)/Se.height)*2+1;me.setFromCamera(new se(Be,oe),A);const Ee=me.intersectObjects(be,!1).find(Qe=>typeof Qe.object.userData.planetId=="string");if(!Ee)return;const Ne=Ee.object.userData.planetId;Ne==="__sun__"?x():v(Ne)},$=new Jo,ie=B=>{if(Y(s)!=="3d"||re){Y(u)&&et(u,null);return}const Se=ne.getBoundingClientRect(),Be=(B.clientX-Se.left)/Se.width*2-1,oe=-((B.clientY-Se.top)/Se.height)*2+1;$.setFromCamera(new se(Be,oe),A);const Ue=$.intersectObjects(De,!1);if(Ue.length===0){Y(u)&&et(u,null);return}const Ee=Ue[0].object.userData.planetId,Ne=Y(f).get(Ee);if(!Ne)return;const Qe=Math.sqrt(4*Math.PI**2*(2/Ne.a-1/Ne.a))*4.7404;et(u,gn({name:Ne.name,velocity:`~${Qe.toFixed(2)} km/s orbital velocity`,distance:`${(Ne.a*149.5978707).toFixed(0)} M km from Sun`,extras:`e=${Ne.e.toFixed(3)} · i=${Ne.incl.toFixed(1)}° · tilt=${Ne.axialTilt.toFixed(1)}°`,x:B.clientX,y:B.clientY}))},ve=()=>{et(u,null)},q=B=>{re=!0,k=!1,w=B.clientX,M=B.clientY,W=B.clientX,he=B.clientY,ne.style.cursor="grabbing"},Me=B=>{if(!re)return;const Se=B.clientX-w,Be=B.clientY-M;Math.abs(B.clientX-W)+Math.abs(B.clientY-he)>4&&(k=!0),Q-=Se*.006,j=Math.max(.08,Math.min(Math.PI*.48,j+Be*.005)),w=B.clientX,M=B.clientY,K()},ke=B=>{const Se=k;re=!1,ne.style.cursor="grab",!Se&&Y(s)==="3d"&&L(B)},Je=B=>{_e=Math.max(120,Math.min(1400,_e+B.deltaY*.7)),K()};let Dt=!1,it=!1,St=0,mt=0;const Zn=B=>{B.touches.length===1&&(Dt=!0,it=!1,w=B.touches[0].clientX,M=B.touches[0].clientY,St=w,mt=M)},xn=B=>{if(!Dt||B.touches.length!==1)return;const Se=B.touches[0].clientX-w,Be=B.touches[0].clientY-M;Math.abs(B.touches[0].clientX-St)+Math.abs(B.touches[0].clientY-mt)>6&&(it=!0),Q-=Se*.006,j=Math.max(.08,Math.min(Math.PI*.48,j+Be*.005)),w=B.touches[0].clientX,M=B.touches[0].clientY,K()},_n=B=>{const Se=it;if(Dt=!1,!Se&&Y(s)==="3d"&&B.changedTouches.length===1){const Be=B.changedTouches[0];L({clientX:Be.clientX,clientY:Be.clientY})}};ne.style.cursor="grab",ne.addEventListener("mousedown",q),window.addEventListener("mousemove",Me),window.addEventListener("mouseup",ke),ne.addEventListener("wheel",Je,{passive:!0}),ne.addEventListener("touchstart",Zn,{passive:!0}),ne.addEventListener("touchmove",xn,{passive:!0}),ne.addEventListener("touchend",_n),ne.addEventListener("mousemove",ie),ne.addEventListener("mouseleave",ve);const We=Y(i),G=We.getContext("2d");if(!G)throw new Error("2D canvas context unavailable");let Lt=1,Yt=0,Ht=0,yn=!1,Ft=0,kt=0,Bn=!1,y=0,F=0;const D=new Map,U=()=>{We.width=We.clientWidth,We.height=We.clientHeight};U();const ue=B=>{B.preventDefault();const Se=We.getBoundingClientRect(),Be=B.clientX-Se.left,oe=B.clientY-Se.top,Ue=We.width,Ee=We.height,Ne=B.deltaY<0?1.1:1/1.1;Yt=(Be-Ue/2)*(1-Ne)+Yt*Ne,Ht=(oe-Ee/2)*(1-Ne)+Ht*Ne,Lt=Math.max(.12,Math.min(5,Lt*Ne))},He=(B,Se)=>{const Be=We.getBoundingClientRect(),oe=We.width,Ue=We.height,Ee=(B-Be.left-(oe/2+Yt))/Lt,Ne=(Se-Be.top-(Ue/2+Ht))/Lt;if(Math.hypot(Ee,Ne)<Math.max(20,14/Lt)){x();return}let Qe=null;for(const zn of t){const On=D.get(zn.id);if(!On)continue;const ht=Ee-On.x,Qn=Ne-On.y,Ni=Math.hypot(ht,Qn),as=Math.max(zn.size2*2.5,8/Lt);Ni<as&&(!Qe||Ni<Qe.d)&&(Qe={id:zn.id,d:Ni})}Qe&&v(Qe.id)},Ce=B=>{yn=!0,Bn=!1,Ft=B.clientX,kt=B.clientY,y=B.clientX,F=B.clientY,We.style.cursor="grabbing"},Ie=B=>{const Se=Bn;yn=!1,Y(s)==="2d"&&(We.style.cursor="grab"),!Se&&Y(s)==="2d"&&He(B.clientX,B.clientY)},je=B=>{!yn||Y(s)!=="2d"||(Math.abs(B.clientX-y)+Math.abs(B.clientY-F)>4&&(Bn=!0),Yt+=B.clientX-Ft,Ht+=B.clientY-kt,Ft=B.clientX,kt=B.clientY)};let Re=!1,Xe=!1,Pe=0,qe=0;const Bt=B=>{B.touches.length===1&&(Re=!0,Xe=!1,Ft=B.touches[0].clientX,kt=B.touches[0].clientY,Pe=Ft,qe=kt)},gt=B=>{!Re||B.touches.length!==1||(Math.abs(B.touches[0].clientX-Pe)+Math.abs(B.touches[0].clientY-qe)>6&&(Xe=!0),Yt+=B.touches[0].clientX-Ft,Ht+=B.touches[0].clientY-kt,Ft=B.touches[0].clientX,kt=B.touches[0].clientY)},tn=B=>{const Se=Xe;if(Re=!1,!Se&&Y(s)==="2d"&&B.changedTouches.length===1){const Be=B.changedTouches[0];He(Be.clientX,Be.clientY)}};We.style.cursor="grab",We.addEventListener("wheel",ue,{passive:!1}),We.addEventListener("mousedown",Ce),window.addEventListener("mouseup",Ie),window.addEventListener("mousemove",je),We.addEventListener("touchstart",Bt,{passive:!0}),We.addEventListener("touchmove",gt,{passive:!0}),We.addEventListener("touchend",tn);const ct=()=>{const B=We.width,Se=We.height;G.fillStyle="#04040c",G.fillRect(0,0,B,Se);for(let oe=0;oe<200;oe++){const Ue=(oe*137.5*31+oe*71)%B,Ee=(oe*137.5*17+oe*53)%Se;G.beginPath(),G.arc(Ue,Ee,oe%8===0?1.2:.5,0,Math.PI*2),G.fillStyle=`rgba(210,215,255,${.06+oe%5*.04})`,G.fill()}G.save(),G.translate(B/2+Yt,Se/2+Ht),G.scale(Lt,Lt),t.forEach(oe=>{const Ue=Y(l)===oe.id;G.beginPath(),G.arc(0,0,oe.orbitR,0,Math.PI*2),G.strokeStyle=Ue?"rgba(68,102,255,0.3)":"rgba(255,255,255,0.05)",G.lineWidth=Ue?1.5:.5,G.stroke()});for(let oe=0;oe<280;oe++){const Ue=oe/280*Math.PI*2+$e*.016,Ee=192+oe%38*1.1;G.beginPath(),G.arc(Math.cos(Ue)*Ee,Math.sin(Ue)*Ee,.85,0,Math.PI*2),G.fillStyle=`rgba(185,162,110,${.05+oe%7*.03})`,G.fill()}for(let oe=0;oe<500;oe++){const Ue=oe/500*Math.PI*2+$e*.003,Ee=438+oe%44*.9;G.beginPath(),G.arc(Math.cos(Ue)*Ee,Math.sin(Ue)*Ee,.75,0,Math.PI*2),G.fillStyle=`rgba(140,160,210,${.035+oe%9*.018})`,G.fill()}const Be=Math.min(B,Se)*.49;G.beginPath(),G.arc(0,0,Be,0,Math.PI*2),G.strokeStyle="rgba(160,120,220,0.14)",G.lineWidth=1,G.setLineDash([4,9]),G.stroke(),G.setLineDash([]),G.save(),G.font="7px 'Space Mono',monospace",G.fillStyle="rgba(160,120,220,0.32)",G.textAlign="center",G.fillText("PLANET NINE? · HYPOTHETICAL · ~600 AU",0,-Be-6),G.restore();for(let oe=90;oe>0;oe-=6){const Ue=G.createRadialGradient(0,0,0,0,0,oe);Ue.addColorStop(0,`rgba(255,228,130,${.012*(90/oe)})`),Ue.addColorStop(1,"rgba(255,120,0,0)"),G.beginPath(),G.arc(0,0,oe,0,Math.PI*2),G.fillStyle=Ue,G.fill()}G.beginPath(),G.arc(0,0,14,0,Math.PI*2),G.fillStyle="#fff8e7",G.fill(),G.save(),G.font="7px 'Space Mono',monospace",G.fillStyle="rgba(255,220,100,0.5)",G.textAlign="center",G.fillText("SUN",0,22),G.restore(),t.forEach(oe=>{const Ue=oe.a0+$e*(2*Math.PI/oe.period),Ee=Math.max(3,oe.size2),Ne=Math.cos(Ue)*oe.orbitR,Qe=Math.sin(Ue)*oe.orbitR;if(D.set(oe.id,{x:Ne,y:Qe}),Y(l)===oe.id){const Qn=.5+.5*Math.sin($e*80);G.beginPath(),G.arc(Ne,Qe,Ee+10+Qn*3,0,Math.PI*2),G.strokeStyle=`rgba(68,102,255,${.55+Qn*.3})`,G.lineWidth=1.5,G.stroke()}const On=G.createRadialGradient(Ne,Qe,0,Ne,Qe,Ee*4);On.addColorStop(0,oe.css+"55"),On.addColorStop(1,"rgba(0,0,0,0)"),G.beginPath(),G.arc(Ne,Qe,Ee*4,0,Math.PI*2),G.fillStyle=On,G.fill(),oe.id==="saturn"&&(G.save(),G.translate(Ne,Qe),G.scale(1,.3),G.beginPath(),G.ellipse(0,0,Ee+14,Ee+14,0,0,Math.PI*2),G.strokeStyle="rgba(228,209,145,0.22)",G.lineWidth=7,G.stroke(),G.restore()),G.beginPath(),G.arc(Ne,Qe,Ee,0,Math.PI*2);const ht=G.createRadialGradient(Ne-Ee*.3,Qe-Ee*.3,Ee*.1,Ne,Qe,Ee);if(oe.id==="earth"?(ht.addColorStop(0,"#6ab8e8"),ht.addColorStop(1,"#0d3050")):oe.id==="mars"?(ht.addColorStop(0,"#e0704a"),ht.addColorStop(1,"#7a2000")):oe.id==="jupiter"?(ht.addColorStop(0,"#deb878"),ht.addColorStop(1,"#6a3a0e")):oe.id==="saturn"?(ht.addColorStop(0,"#ece8b0"),ht.addColorStop(1,"#9a8830")):oe.id==="venus"?(ht.addColorStop(0,"#f0e0a0"),ht.addColorStop(1,"#9a7820")):oe.id==="uranus"?(ht.addColorStop(0,"#a8f0f0"),ht.addColorStop(1,"#207878")):oe.id==="neptune"?(ht.addColorStop(0,"#6080d8"),ht.addColorStop(1,"#101858")):oe.id==="mercury"?(ht.addColorStop(0,"#d0c8c0"),ht.addColorStop(1,"#504840")):(ht.addColorStop(0,oe.css),ht.addColorStop(1,oe.css+"88")),G.fillStyle=ht,G.fill(),oe.id==="jupiter"&&Ee>6){G.save(),G.beginPath(),G.arc(Ne,Qe,Ee,0,Math.PI*2),G.clip();const Qn=[[Ee*.22,"rgba(160,90,40,0.28)"],[Ee*.65,"rgba(140,80,30,0.28)"]];for(const[Ni,as]of Qn)G.fillStyle=as,G.fillRect(Ne-Ee,Qe-Ni-Ee*.07,Ee*2,Ee*.14);G.restore()}oe.id==="saturn"&&(G.save(),G.translate(Ne,Qe),G.scale(1,.3),G.beginPath(),G.ellipse(0,0,Ee+14,Ee+14,0,0,Math.PI*2),G.strokeStyle="rgba(228,209,145,0.5)",G.lineWidth=3.5,G.stroke(),G.restore()),G.beginPath(),G.arc(Ne-Ee*.28,Qe-Ee*.28,Ee*.2,0,Math.PI*2),G.fillStyle="rgba(255,255,255,0.18)",G.fill(),G.save(),G.font="8px 'Space Mono',monospace",G.shadowColor="rgba(0,0,0,0.9)",G.shadowBlur=6,G.fillStyle=oe.css+"cc",G.textAlign="left",G.fillText(oe.name,Ne+Ee+5,Qe+3),G.restore()}),G.restore(),G.save(),G.font="8px 'Space Mono',monospace",G.fillStyle="rgba(255,255,255,0.08)",G.fillText("ECLIPTIC PLANE · TOP-DOWN · SCROLL TO ZOOM · DRAG TO PAN",22,Se-10),G.restore()},nn=()=>{Y(n)&&(A.aspect=Y(n).clientWidth/Y(n).clientHeight,A.updateProjectionMatrix(),X.setSize(Y(n).clientWidth,Y(n).clientHeight),U())};window.addEventListener("resize",nn);let $e=0,Jn=performance.now(),_t=0;const Gt=B=>{_t=requestAnimationFrame(Gt);const Se=Math.min((B-Jn)/1e3,.05);if(Jn=B,$e+=Se*.04,Y(s)==="3d"){if(we.forEach(({group:Be,mesh:oe,planet:Ue})=>{const Ee=Ue.a0+2*Math.PI*$e/Ue.period,Ne=Ue.inc*Math.PI/180,Qe=Math.cos(Ee)*Ue.orbitR,zn=Math.sin(Ee)*Ue.orbitR;Be.position.set(Qe,zn*Math.sin(Ne),zn*Math.cos(Ne)),oe.rotation.y+=.005}),Y(l)){const Be=we.find(oe=>oe.planet.id===Y(l));if(Be){const oe=Be.planet.size3*1.9;ge.scale.set(oe,oe,1),ge.position.copy(Be.group.position),ge.rotation.set(Math.PI/2,0,0);const Ue=Be.planet.inc*Math.PI/180;ge.rotateZ(Ue);const Ee=.5+.5*Math.sin($e*80);Ae.opacity=.35+Ee*.45,ge.visible=!0}else ge.visible=!1}else ge.visible=!1;X.render(R,A)}else ct()};Gt(performance.now()),d=()=>{cancelAnimationFrame(_t),ne.removeEventListener("mousedown",q),window.removeEventListener("mousemove",Me),window.removeEventListener("mouseup",ke),ne.removeEventListener("wheel",Je),ne.removeEventListener("touchstart",Zn),ne.removeEventListener("touchmove",xn),ne.removeEventListener("touchend",_n),ne.removeEventListener("mousemove",ie),ne.removeEventListener("mouseleave",ve),We.removeEventListener("wheel",ue),We.removeEventListener("mousedown",Ce),window.removeEventListener("mouseup",Ie),window.removeEventListener("mousemove",je),We.removeEventListener("touchstart",Bt),We.removeEventListener("touchmove",gt),We.removeEventListener("touchend",tn),window.removeEventListener("resize",nn),R.traverse(B=>{var Se,Be;B instanceof Mt&&((Se=B.geometry)==null||Se.dispose(),Array.isArray(B.material)?B.material.forEach(oe=>oe.dispose()):(Be=B.material)==null||Be.dispose())}),X.dispose(),ne.remove()}}),_c(()=>{d==null||d()});var T=Xv();rc(R=>{vc.title="Solar System Explorer · Orrery"});var S=Vt(T),_=le(S);Xs(_,R=>et(n,R),()=>Y(n));var P=fe(_,2);Xs(P,R=>et(i,R),()=>Y(i));var N=fe(P,2);N.__click=[Vv,s];var z=le(N,!0);ce(N);var V=fe(N,2);{var J=R=>{var A=Wv();const X=at(()=>{var Oe;return`${Math.min(Y(u).x+14,(((Oe=Y(n))==null?void 0:Oe.clientWidth)??0)-200)??""}px`});Ve(()=>kr(A,"left",Y(X)));const ee=at(()=>`${Math.max(Y(u).y-60,60)??""}px`);Ve(()=>kr(A,"top",Y(ee)));var Z=le(A),ae=le(Z,!0);ce(Z);var te=fe(Z,2),pe=le(te,!0);ce(te);var xe=fe(te,2),H=le(xe,!0);ce(xe),ce(A),Ve(()=>{ze(ae,Y(u).velocity),ze(pe,Y(u).distance),ze(H,Y(u).extras)}),Tt(R,A)};mn(V,R=>{Y(u)&&Y(s)==="3d"&&R(J)})}ce(S);var O=fe(S,2),C=at(()=>{var R;return(R=Y(m))!=null&&R.missionable?E:void 0});Bv(O,{get planet(){return Y(m)},get open(){return Y(c)},onClose:g,get onPlanMission(){return Y(C)}});var I=fe(O,2);Gv(I,{get sun(){return Y(o)},get open(){return Y(h)},onClose:p}),Ve(()=>{Rn(_,"hidden",Y(s)!=="3d"),Rn(P,"hidden",Y(s)!=="2d"),Gn(N,"aria-pressed",Y(s)==="2d"),ze(z,Y(s)==="3d"?"2D":"3D")}),Tt(r,T),or()}Qr(["click"]);export{ex as component};
