/* Figma-style Gradient Picker */
(function(){
'use strict';

/* ─── Color utils ─── */
function hsvToRgb(h,s,v){
  let r,g,b;const i=Math.floor(h/60)%6,f=(h/60)-Math.floor(h/60),p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);
  switch(i){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;case 5:r=v;g=p;b=q;break;}
  return[Math.round(r*255),Math.round(g*255),Math.round(b*255)];
}
function hexToRgb(hex){hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const n=parseInt(hex,16);return[(n>>16)&255,(n>>8)&255,n&255];}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');}
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0,s=max===0?0:d/max,v=max;if(d!==0){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=Math.round(h*60);if(h<0)h+=360;}return[h,s,v];}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

const CSS=`
.gp-wrap{position:fixed;z-index:99999;width:252px;background:#1e1e1e;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:12px;font-family:'DM Sans',sans-serif;user-select:none;display:none;}
.gp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.gp-types{display:flex;gap:2px;background:#111;border-radius:6px;padding:2px;}
.gp-tb{padding:3px 11px;font-size:11px;font-weight:700;border:none;border-radius:4px;cursor:pointer;background:transparent;color:#666;font-family:inherit;transition:all .15s;}
.gp-tb.on{background:#333;color:#fff;}
.gp-x{background:none;border:none;color:#555;cursor:pointer;font-size:16px;line-height:1;padding:0;}
.gp-x:hover{color:#fff;}
.gp-gbar-wrap{margin-bottom:10px;}
.gp-gbar{position:relative;height:18px;border-radius:6px;cursor:crosshair;margin-bottom:6px;}
.gp-gbar-bg{position:absolute;inset:0;border-radius:6px;border:1px solid rgba(255,255,255,.08);}
.gp-stop{position:absolute;top:50%;width:13px;height:13px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);transform:translate(-50%,-50%);cursor:grab;transition:box-shadow .1s;}
.gp-stop.on{box-shadow:0 0 0 2px #4c9ffe;}
.gp-angle{display:flex;align-items:center;gap:6px;font-size:11px;color:#666;}
.gp-angle input{width:46px;background:#2a2a2a;border:1px solid #333;border-radius:4px;color:#fff;padding:3px 6px;font-size:11px;font-family:'DM Mono',monospace;outline:none;}
.gp-canvas-wrap{position:relative;border-radius:6px;overflow:hidden;margin-bottom:10px;}
.gp-canvas{display:block;width:228px;height:140px;cursor:crosshair;}
.gp-cc{position:absolute;width:11px;height:11px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:none;transform:translate(-50%,-50%);}
.gp-sliders{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}
.gp-sl{position:relative;height:12px;border-radius:6px;}
.gp-htrack{position:absolute;inset:0;border-radius:6px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);}
.gp-atrack-bg{position:absolute;inset:0;border-radius:6px;background:repeating-conic-gradient(#aaa 0% 25%,#fff 0% 50%) 0 0/8px 8px;}
.gp-atrack{position:absolute;inset:0;border-radius:6px;}
.gp-thumb{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:translate(-50%,-50%);cursor:grab;background:#fff;}
.gp-ins{display:flex;gap:7px;}
.gp-hexw{flex:1;display:flex;align-items:center;background:#2a2a2a;border:1px solid #333;border-radius:6px;padding:4px 8px;}
.gp-hexw input{flex:1;background:none;border:none;color:#fff;font-size:12px;font-family:'DM Mono',monospace;outline:none;min-width:0;}
.gp-opw{display:flex;align-items:center;background:#2a2a2a;border:1px solid #333;border-radius:6px;padding:4px 7px;gap:2px;font-size:12px;color:#666;width:68px;}
.gp-opw input{background:none;border:none;color:#fff;font-size:12px;font-family:'DM Mono',monospace;outline:none;width:30px;}
`;

class GradientPicker {
  constructor(options={}){
    this.onChange=options.onChange||function(){};
    this._type='solid';
    this._angle=135;
    this._stops=[{c:'#1e3a5f',a:1,p:0},{c:'#0ea5e9',a:1,p:100}];
    this._active=0;
    this._h=210;this._s=0.7;this._v=0.37;this._a=1;
    this._init();
  }

  _init(){
    if(!document.getElementById('gp-css')){const s=document.createElement('style');s.id='gp-css';s.textContent=CSS;document.head.appendChild(s);}
    const d=document.createElement('div');d.className='gp-wrap';
    d.innerHTML=`
      <div class="gp-head">
        <div class="gp-types">
          <button class="gp-tb on" data-t="solid">Solid</button>
          <button class="gp-tb" data-t="linear">Linear</button>
          <button class="gp-tb" data-t="radial">Radial</button>
        </div>
        <button class="gp-x">✕</button>
      </div>
      <div class="gp-gbar-wrap" style="display:none">
        <div class="gp-gbar"><div class="gp-gbar-bg" id="gp-gbar-bg"></div><div id="gp-stops"></div></div>
        <div class="gp-angle"><span>Angle</span><input id="gp-angle" type="number" min="0" max="360" value="135"><span>°</span></div>
      </div>
      <div class="gp-canvas-wrap"><canvas class="gp-canvas" id="gp-canvas" width="228" height="140"></canvas><div class="gp-cc" id="gp-cc"></div></div>
      <div class="gp-sliders">
        <div class="gp-sl"><div class="gp-htrack"></div><div class="gp-thumb" id="gp-ht"></div></div>
        <div class="gp-sl"><div class="gp-atrack-bg"></div><div class="gp-atrack" id="gp-at"></div><div class="gp-thumb" id="gp-at-thumb"></div></div>
      </div>
      <div class="gp-ins">
        <div class="gp-hexw"><input id="gp-hex" type="text" maxlength="7" value="#1e3a5f"></div>
        <div class="gp-opw"><input id="gp-op" type="number" min="0" max="100" value="100"><span>%</span></div>
      </div>`;
    this._el=d;
    document.body.appendChild(d);
    this._bindAll();
  }

  _bindAll(){
    const el=this._el;
    // Close
    el.querySelector('.gp-x').onclick=()=>this.hide();
    // Type tabs
    el.querySelectorAll('.gp-tb').forEach(b=>b.addEventListener('click',()=>{
      el.querySelectorAll('.gp-tb').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      this._type=b.dataset.t;
      el.querySelector('.gp-gbar-wrap').style.display=this._type==='solid'?'none':'block';
      this._render();this._emit();
    }));
    // Angle
    el.querySelector('#gp-angle').oninput=e=>{this._angle=parseInt(e.target.value)||0;this._render();this._emit();};
    // Canvas
    const canvas=el.querySelector('#gp-canvas');
    this._bindDrag(canvas,e=>{
      const r=canvas.getBoundingClientRect();
      this._s=clamp((e.clientX-r.left)/r.width,0,1);
      this._v=clamp(1-(e.clientY-r.top)/r.height,0,1);
      this._updateFromHSV();
    });
    // Hue slider
    const ht=el.querySelector('#gp-ht');
    const hsl=el.querySelector('.gp-sl:nth-child(1)');
    this._bindDrag(hsl,e=>{
      const r=hsl.getBoundingClientRect();
      this._h=clamp((e.clientX-r.left)/r.width,0,1)*360;
      this._updateFromHSV();
    });
    // Alpha slider
    const asl=el.querySelector('.gp-sl:nth-child(2)');
    this._bindDrag(asl,e=>{
      const r=asl.getBoundingClientRect();
      this._a=clamp((e.clientX-r.left)/r.width,0,1);
      this._updateFromAlpha();
    });
    // Gradient bar stop dragging
    const gbar=el.querySelector('.gp-gbar');
    gbar.addEventListener('click',e=>{
      if(e.target.classList.contains('gp-stop'))return;
      const r=gbar.getBoundingClientRect();
      const pos=clamp((e.clientX-r.left)/r.width*100,0,100);
      const [rr,gg,bb]=hsvToRgb(this._h,this._s,this._v);
      this._stops.push({c:rgbToHex(rr,gg,bb),a:this._a,p:Math.round(pos)});
      this._stops.sort((a,b)=>a.p-b.p);
      this._active=this._stops.findIndex(s=>s.p===Math.round(pos));
      this._render();this._emit();
    });
    // Hex input
    el.querySelector('#gp-hex').oninput=e=>{
      const v=e.target.value;if(!/^#[0-9a-fA-F]{6}$/.test(v))return;
      const [r,g,b]=hexToRgb(v);[this._h,this._s,this._v]=rgbToHsv(r,g,b);
      this._updateFromHSV(true);
    };
    // Opacity input
    el.querySelector('#gp-op').oninput=e=>{
      this._a=clamp(parseInt(e.target.value)||0,0,100)/100;
      this._updateFromAlpha(true);
    };
    // Click outside to close
    document.addEventListener('mousedown',e=>{if(this._el.style.display==='block'&&!this._el.contains(e.target)&&!e._gpTrigger)this.hide();});
  }

  _bindDrag(el,fn){
    let active=false;
    el.addEventListener('mousedown',e=>{active=true;fn(e);e.preventDefault();});
    document.addEventListener('mousemove',e=>{if(active)fn(e);});
    document.addEventListener('mouseup',()=>{active=false;});
  }

  _updateFromHSV(skipStopUpdate){
    const [r,g,b]=hsvToRgb(this._h,this._s,this._v);
    const hex=rgbToHex(r,g,b);
    if(!skipStopUpdate)this._stops[this._active].c=hex;
    this._render();this._emit();
  }
  _updateFromAlpha(skipStopUpdate){
    if(!skipStopUpdate)this._stops[this._active].a=this._a;
    this._render();this._emit();
  }

  _render(){
    const el=this._el;
    // Canvas
    const canvas=el.querySelector('#gp-canvas');
    const ctx=canvas.getContext('2d');
    const W=canvas.width,H=canvas.height;
    const [hr,hg,hb]=hsvToRgb(this._h,1,1);
    const hueColor=`rgb(${hr},${hg},${hb})`;
    ctx.fillStyle=hueColor;ctx.fillRect(0,0,W,H);
    const wg=ctx.createLinearGradient(0,0,W,0);wg.addColorStop(0,'#fff');wg.addColorStop(1,'transparent');
    ctx.fillStyle=wg;ctx.fillRect(0,0,W,H);
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'transparent');bg.addColorStop(1,'#000');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // Cursor
    const cc=el.querySelector('#gp-cc');
    const cx=this._s*228,cy=(1-this._v)*140;
    cc.style.left=cx+'px';cc.style.top=cy+'px';
    // Hue thumb
    const ht=el.querySelector('#gp-ht');
    ht.style.left=(this._h/360*100)+'%';
    const [cr,cg,cb]=hsvToRgb(this._h,this._s,this._v);
    const curHex=rgbToHex(cr,cg,cb);
    ht.style.background=`hsl(${this._h},100%,50%)`;
    // Alpha track + thumb
    const at=el.querySelector('#gp-at');
    at.style.background=`linear-gradient(to right,transparent,${curHex})`;
    const atThumb=el.querySelector('#gp-at-thumb');
    atThumb.style.left=(this._a*100)+'%';
    atThumb.style.background=`rgba(${cr},${cg},${cb},${this._a})`;
    // Inputs
    el.querySelector('#gp-hex').value=curHex;
    el.querySelector('#gp-op').value=Math.round(this._a*100);
    // Gradient bar
    if(this._type!=='solid'){
      const bg2=el.querySelector('#gp-gbar-bg');
      bg2.style.background=this._buildGradient('to right');
      const sc=el.querySelector('#gp-stops');sc.innerHTML='';
      this._stops.forEach((s,i)=>{
        const m=document.createElement('div');m.className='gp-stop'+(i===this._active?' on':'');
        m.style.left=s.p+'%';m.style.background=s.c;m.style.opacity=s.a;
        m.addEventListener('mousedown',e=>{
          e.stopPropagation();this._active=i;
          const [rr,gg,bb]=hexToRgb(s.c);[this._h,this._s,this._v]=rgbToHsv(rr,gg,bb);this._a=s.a;
          let ox=e.clientX;
          const gbar=el.querySelector('.gp-gbar');
          const move=ev=>{
            const r=gbar.getBoundingClientRect();
            s.p=Math.round(clamp((ev.clientX-r.left)/r.width*100,0,100));
            this._render();this._emit();
          };
          const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);};
          document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
          this._render();
        });
        m.addEventListener('dblclick',()=>{if(this._stops.length>2){this._stops.splice(i,1);this._active=Math.min(this._active,this._stops.length-1);this._render();this._emit();}});
        sc.appendChild(m);
      });
    }
  }

  _buildGradient(dir){
    if(this._type==='solid'){
      const[r,g,b]=hsvToRgb(this._h,this._s,this._v);
      return`rgba(${r},${g},${b},${this._a})`;
    }
    const sorted=[...this._stops].sort((a,b)=>a.p-b.p);
    const stops=sorted.map(s=>{const[r,g,b]=hexToRgb(s.c);return`rgba(${r},${g},${b},${s.a}) ${s.p}%`;}).join(',');
    if(this._type==='radial')return`radial-gradient(circle, ${stops})`;
    return`linear-gradient(${this._angle}deg, ${stops})`;
  }

  _emit(){this.onChange(this._buildGradient());}

  getValue(){return this._buildGradient();}

  setValue(css){
    if(!css||css==='')return;
    if(css.startsWith('linear-gradient')){
      this._type='linear';
      const m=css.match(/(\d+)deg/);if(m)this._angle=parseInt(m[1]);
      this._parseStops(css);
      this._el.querySelectorAll('.gp-tb').forEach(b=>{b.classList.toggle('on',b.dataset.t==='linear');});
      this._el.querySelector('.gp-gbar-wrap').style.display='block';
    }else if(css.startsWith('radial-gradient')){
      this._type='radial';
      this._parseStops(css);
      this._el.querySelectorAll('.gp-tb').forEach(b=>{b.classList.toggle('on',b.dataset.t==='radial');});
      this._el.querySelector('.gp-gbar-wrap').style.display='block';
    }else{
      // solid hex
      const hex=css.trim();
      try{const[r,g,b]=hexToRgb(hex);[this._h,this._s,this._v]=rgbToHsv(r,g,b);this._a=1;}catch(e){}
      this._type='solid';
      this._el.querySelectorAll('.gp-tb').forEach(b=>{b.classList.toggle('on',b.dataset.t==='solid');});
      this._el.querySelector('.gp-gbar-wrap').style.display='none';
    }
    if(this._active<this._stops.length){
      const s=this._stops[this._active];
      try{const[r,g,b]=hexToRgb(s.c);[this._h,this._s,this._v]=rgbToHsv(r,g,b);this._a=s.a;}catch(e){}
    }
    this._render();
  }

  _parseStops(css){
    const matches=[...css.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)\s*([\d.]+)%/g)];
    if(matches.length>=2){
      this._stops=matches.map(m=>({c:rgbToHex(+m[1],+m[2],+m[3]),a:m[4]!==undefined?parseFloat(m[4]):1,p:parseFloat(m[5])}));
    }
  }

  show(x,y){
    this._el.style.display='block';
    const W=window.innerWidth,H=window.innerHeight;
    let left=x,top=y;
    if(left+260>W)left=W-260;
    if(top+440>H)top=H-440;
    this._el.style.left=left+'px';this._el.style.top=top+'px';
    this._render();
  }
  hide(){this._el.style.display='none';}
}

window.GradientPicker=GradientPicker;

// Helper: attach to a swatch element
window.attachGradientPicker=function(swatchEl,hexInput,opts={}){
  const picker=new GradientPicker({
    onChange(val){
      swatchEl.style.background=val;
      if(hexInput)hexInput.value=val;
      if(opts.onChange)opts.onChange(val);
    }
  });
  swatchEl.style.cursor='pointer';
  swatchEl.addEventListener('mousedown',e=>{
    e._gpTrigger=true;
    const r=swatchEl.getBoundingClientRect();
    if(picker._el.style.display==='block'){picker.hide();return;}
    picker.setValue(hexInput?hexInput.value:opts.value||'#1e3a5f');
    picker.show(r.left,r.bottom+6);
  });
  return picker;
};
})();
