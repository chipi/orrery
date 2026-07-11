class n extends EventTarget{emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t}))}on(e,t){const s=t;return this.addEventListener(e,s),()=>this.removeEventListener(e,s)}}const a=new n;export{a};
