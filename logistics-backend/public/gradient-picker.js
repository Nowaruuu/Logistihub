/* Gradient Picker — fixed UX */
(function(){
'use strict';

function hsvToRgb(h,s,v){let r,g,b,i=Math.floor(h/60)%6,f=h/60-Math.floor(h/60),p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);switch(i){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;default:r=v;g=p;b=q;}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)];}
function hexToRgb(hex){hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const n=parseInt(hex,16)||0;return[(n>>16)&255,(n>>8)&255,n&255];}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');}
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0,s=max===0?0:d/max,v=max;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=Math.round(h*60);if(h<0)h+=360;}return[h,s,v];}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

const CSS=`
.gp{position:fixed;z-index:99999;width:260px;background:#1e1e1e;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.7);padding:14px;font-family:'DM Sans',sans-serif;user-select:none;display:none;}
.gp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.gp-tabs{display:flex;gap:2px;background:#111;border-radius:7px;padding:2px;}
.gp-tab{padding:4px 12px;font-size:11px;font-weight:700;border:none;border-radius:5px;cursor:pointer;background:transparent;color:#555;font-family:inherit;transition:all .15s;}
.gp-tab.on{background:#2d2d2d;color:#fff;}
.gp-x{background:none;border:none;color:#555;cursor:pointer;font-size:18px;line-height:1;padding:2px 4px;}
.gp-x:hover{color:#fff;}

/* Gradient section */
.gp-grad{margin-bottom:12px;display:none;}
.gp-bar-label{font-size:10px;color:#666;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;}
.gp-bar-label span{color:#4c9ffe;cursor:pointer;font-weight:700;}
.gp-bar-label span:hover{color:#80bfff;}
.gp-bar{position:relative;height:28px;border-radius:8px;cursor:crosshair;margin-bottom:8px;border:1.5px solid rgba(255,255,255,.1);}
.gp-bar-bg{position:absolute;inset:0;border-radius:7px;}
.gp-stop{position:absolute;top:50%;width:18px;height:18px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.6);transform:translate(-50%,-50%);cursor:grab;transition:box-shadow .1s;z-index:2;}
.gp-stop.on{box-shadow:0 0 0 2.5px #4c9ffe,0 2px 6px rgba(0,0,0,.6);}
.gp-stop-row{display:flex;align-items:center;gap:8px;background:#2a2a2a;border-radius:7px;padding:7px 9px;margin-bottom:4px;}
.gp-stop-row span{font-size:11px;color:#888;}
.gp-stop-pos{width:48px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:#fff;padding:3px 6px;font-size:11px;font-family:'DM Mono',monospace;outline:none;text-align:center;}
.gp-angle-row{display:flex;align-items:center;gap:8px;font-size:11px;color:#666;}
.gp-angle-row input{width:52px;background:#2a2a2a;border:1px solid #333;border-radius:5px;color:#fff;padding:3px 7px;font-size:11px;font-family:'DM Mono',monospace;outline:none;}

/* Canvas */
.gp-cv-wrap{position:relative;border-radius:8px;overflow:hidden;margin-bottom:10px;}
.gp-cv{display:block;width:232px;height:144px;cursor:crosshair;}
.gp-dot{position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:none;transform:translate(-50%,-50%);}

/* Sliders */
.gp-sls{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}
.gp-sl{position:relative;height:14px;border-radius:7px;cursor:pointer;}
.gp-hue-bg{position:absolute;inset:0;border-radius:7px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);}
.gp-alpha-bg{position:absolute;inset:0;border-radius:7px;background:repeating-conic-gradient(#888 0% 25%,#444 0% 50%) 0 0/8px 8px;}
.gp-alpha-fg{position:absolute;inset:0;border-radius:7px;}
.gp-th{position:absolute;top:50%;width:18px;height:18px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.5);transform:translate(-50%,-50%);cursor:grab;pointer-events:none;}

/* Inputs */
.gp-ins{display:flex;gap:8px;}
.gp-hexb{flex:1;display:flex;align-items:center;background:#2a2a2a;border:1px solid #333;border-radius:7px;padding:5px 9px;}
.gp-hexb input{flex:1;background:none;border:none;color:#fff;font-size:12px;font-family:'DM Mono',monospace;outline:none;min-width:0;}
.gp-opb{display:flex;align-items:center;background:#2a2a2a;border:1px solid #333;border-radius:7px;padding:5px 8px;gap:3px;width:72px;}
.gp-opb input{background:none;border:none;color:#fff;font-size:12px;font-family:'DM Mono',monospace;outline:none;width:32px;}
.gp-opb span{font-size:12px;color:#666;}
`;

class GradientPicker {
  constructor(opts={}){
    this.onChange=opts.onChange||function(){};
    this._type='solid';
    this._angle=135;
    this._stops=[{c:'#1a3a6e',a:1,p:0},{c:'#06b6d4',a:1,p:100}];
    this._active=0;
    this._h=200;this._s=0.75;this._v=0.43;this._a=1;
    if(!document.getElementById('gp-style')){const s=document.createElement('style');s.id='gp-style';s.textContent=CSS;document.head.appendChild(s);}
    this._build();
  }

  _build(){
    const d=document.createElement('div');d.className='gp';
    d.innerHTML=`
<div class="gp-head">
  <div class="gp-tabs">
    <button class="gp-tab on" data-t="solid">Solid</button>
    <button class="gp-tab" data-t="linear">Linear</button>
    <button class="gp-tab" data-t="radial">Radial</button>
  </div>
  <button class="gp-x">✕</button>
</div>
<div class="gp-grad" id="gp-grad">
  <div class="gp-bar-label">
    <span style="color:#aaa">Gradient Stops</span>
    <span id="gp-add-stop">+ Add Stop</span>
  </div>
  <div class="gp-bar" id="gp-bar"><div class="gp-bar-bg" id="gp-bar-bg"></div></div>
  <div class="gp-stop-row">
    <span>Selected stop position:</span>
    <input class="gp-stop-pos" id="gp-stop-pos" type="number" min="0" max="100" value="0">
    <span>%</span>
  </div>
  <div class="gp-angle-row" id="gp-angle-row">
    <span>Angle:</span>
    <input type="number" min="0" max="360" id="gp-angle" value="135">
    <span>°</span>
  </div>
</div>
<div class="gp-cv-wrap"><canvas class="gp-cv" id="gp-cv" width="232" height="144"></canvas><div class="gp-dot" id="gp-dot"></div></div>
<div class="gp-sls">
  <div class="gp-sl" id="gp-hsl"><div class="gp-hue-bg"></div><div class="gp-th" id="gp-ht"></div></div>
  <div class="gp-sl" id="gp-asl"><div class="gp-alpha-bg"></div><div class="gp-alpha-fg" id="gp-afg"></div><div class="gp-th" id="gp-at"></div></div>
</div>
<div class="gp-ins">
  <div class="gp-hexb"><input id="gp-hex" type="text" maxlength="7" value="#1a3a6e"></div>
  <div class="gp-opb"><input id="gp-op" type="number" min="0" max="100" value="100"><span>%</span></div>
</div>`;
    this._el=d;
    document.body.appendChild(d);
    this._bind();
  }

  _bind(){
    const E=id=>this._el.querySelector('#'+id);
    const el=this._el;

    el.querySelector('.gp-x').onclick=()=>this.hide();

    // Type tabs
    el.querySelectorAll('.gp-tab').forEach(b=>b.addEventListener('click',()=>{
      el.querySelectorAll('.gp-tab').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');this._type=b.dataset.t;
      E('gp-grad').style.display=this._type==='solid'?'none':'block';
      E('gp-angle-row').style.display=this._type==='radial'?'none':'flex';
      this._render();this._emit();
    }));

    // Add stop button
    E('gp-add-stop').addEventListener('click',()=>{
      const[r,g,b]=hsvToRgb(this._h,this._s,this._v);
      const used=this._stops.map(s=>s.p);
      let p=50;while(used.includes(p)&&p<100)p++;
      this._stops.push({c:rgbToHex(r,g,b),a:this._a,p});
      this._stops.sort((a,b)=>a.p-b.p);
      this._active=this._stops.findIndex(s=>s.p===p);
      this._render();this._emit();
    });

    // Gradient bar click = add stop at position
    const bar=E('gp-bar');
    bar.addEventListener('click',e=>{
      if(e.target.classList.contains('gp-stop'))return;
      const r=bar.getBoundingClientRect();
      const p=Math.round(clamp((e.clientX-r.left)/r.width*100,0,100));
      const[rr,gg,bb]=hsvToRgb(this._h,this._s,this._v);
      this._stops.push({c:rgbToHex(rr,gg,bb),a:this._a,p});
      this._stops.sort((a,b)=>a.p-b.p);
      this._active=this._stops.findIndex(s=>s.p===p);
      this._render();this._emit();
    });

    // Stop position input
    E('gp-stop-pos').oninput=e=>{
      this._stops[this._active].p=clamp(parseInt(e.target.value)||0,0,100);
      this._stops.sort((a,b)=>a.p-b.p);
      this._render();this._emit();
    };

    // Angle
    E('gp-angle').oninput=e=>{this._angle=parseInt(e.target.value)||0;this._render();this._emit();};

    // Canvas
    const cv=E('gp-cv');
    this._drag(cv,e=>{
      const r=cv.getBoundingClientRect();
      this._s=clamp((e.clientX-r.left)/r.width,0,1);
      this._v=clamp(1-(e.clientY-r.top)/r.height,0,1);
      this._fromHSV();
    });

    // Hue slider
    this._drag(E('gp-hsl'),e=>{
      const r=E('gp-hsl').getBoundingClientRect();
      this._h=clamp((e.clientX-r.left)/r.width,0,1)*360;
      this._fromHSV();
    });

    // Alpha slider
    this._drag(E('gp-asl'),e=>{
      const r=E('gp-asl').getBoundingClientRect();
      this._a=clamp((e.clientX-r.left)/r.width,0,1);
      this._stops[this._active].a=this._a;
      this._render();this._emit();
    });

    // Hex input
    E('gp-hex').oninput=e=>{
      const v=e.target.value;
      if(!/^#[0-9a-fA-F]{6}$/.test(v))return;
      const[r,g,b]=hexToRgb(v);[this._h,this._s,this._v]=rgbToHsv(r,g,b);
      this._fromHSV();
    };

    // Opacity input
    E('gp-op').oninput=e=>{
      this._a=clamp(parseInt(e.target.value)||0,0,100)/100;
      this._stops[this._active].a=this._a;
      this._render();this._emit();
    };

    // Close on outside click
    document.addEventListener('mousedown',e=>{
      if(this._el.style.display==='block'&&!this._el.contains(e.target)&&!e._gpTrig)this.hide();
    });
  }

  _drag(el,fn){
    let on=false;
    el.addEventListener('mousedown',e=>{on=true;fn(e);e.preventDefault();e.stopPropagation();});
    document.addEventListener('mousemove',e=>{if(on)fn(e);});
    document.addEventListener('mouseup',()=>{on=false;});
  }

  _fromHSV(){
    const[r,g,b]=hsvToRgb(this._h,this._s,this._v);
    this._stops[this._active].c=rgbToHex(r,g,b);
    this._stops[this._active].a=this._a;
    this._render();this._emit();
  }

  _render(){
    const E=id=>this._el.querySelector('#'+id);
    // Canvas
    const cv=E('gp-cv'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height;
    const[hr,hg,hb]=hsvToRgb(this._h,1,1);
    ctx.fillStyle=`rgb(${hr},${hg},${hb})`;ctx.fillRect(0,0,W,H);
    const wg=ctx.createLinearGradient(0,0,W,0);wg.addColorStop(0,'#fff');wg.addColorStop(1,'transparent');
    ctx.fillStyle=wg;ctx.fillRect(0,0,W,H);
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'transparent');bg.addColorStop(1,'#000');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // Dot
    const dot=E('gp-dot');dot.style.left=(this._s*232)+'px';dot.style.top=((1-this._v)*144)+'px';
    // Hue thumb
    E('gp-ht').style.left=(this._h/360*100)+'%';
    E('gp-ht').style.background=`hsl(${this._h},100%,50%)`;
    // Alpha
    const[cr,cg,cb]=hsvToRgb(this._h,this._s,this._v);
    const curHex=rgbToHex(cr,cg,cb);
    E('gp-afg').style.background=`linear-gradient(to right,transparent,${curHex})`;
    E('gp-at').style.left=(this._a*100)+'%';
    E('gp-at').style.background=`rgba(${cr},${cg},${cb},${this._a})`;
    // Inputs
    E('gp-hex').value=curHex;
    E('gp-op').value=Math.round(this._a*100);
    // Gradient bar
    if(this._type!=='solid'){
      E('gp-bar-bg').style.background=this._css('to right');
      // Remove old stop markers
      this._el.querySelectorAll('.gp-stop').forEach(s=>s.remove());
      const bar=E('gp-bar');
      this._stops.forEach((s,i)=>{
        const m=document.createElement('div');m.className='gp-stop'+(i===this._active?' on':'');
        m.style.left=s.p+'%';m.style.background=s.c;m.style.opacity=s.a;
        // Click to select
        m.addEventListener('mousedown',e=>{
          e.stopPropagation();this._active=i;
          const[r,g,b]=hexToRgb(s.c);[this._h,this._s,this._v]=rgbToHsv(r,g,b);this._a=s.a;
          // Drag
          let active=true;
          const move=ev=>{
            if(!active)return;
            const br=bar.getBoundingClientRect();
            s.p=Math.round(clamp((ev.clientX-br.left)/br.width*100,0,100));
            E('gp-stop-pos').value=s.p;
            this._stops.sort((a,b)=>a.p-b.p);
            this._active=this._stops.indexOf(s);
            this._render();this._emit();
          };
          const up=()=>{active=false;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);};
          document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
          this._render();
        });
        // Double-click to remove
        m.addEventListener('dblclick',e=>{
          e.stopPropagation();
          if(this._stops.length<=2)return;
          this._stops.splice(i,1);
          this._active=Math.min(this._active,this._stops.length-1);
          this._render();this._emit();
        });
        bar.appendChild(m);
      });
      if(this._active<this._stops.length)E('gp-stop-pos').value=this._stops[this._active].p;
    }
  }

  _css(dir){
    if(this._type==='solid'){const[r,g,b]=hexToRgb(this._stops[0].c);return`rgba(${r},${g},${b},${this._stops[0].a})`;}
    const sorted=[...this._stops].sort((a,b)=>a.p-b.p);
    const parts=sorted.map(s=>{const[r,g,b]=hexToRgb(s.c);return`rgba(${r},${g},${b},${s.a}) ${s.p}%`;}).join(',');
    if(this._type==='radial')return`radial-gradient(circle, ${parts})`;
    return`linear-gradient(${this._angle}deg, ${parts})`;
  }

  _emit(){this.onChange(this._css());}
  getValue(){return this._css();}

  setValue(css){
    if(!css)return;
    if(css.includes('linear-gradient')||css.includes('radial-gradient')){
      this._type=css.includes('radial')?'radial':'linear';
      const m=css.match(/(\d+)deg/);if(m)this._angle=parseInt(m[1]);
      const matches=[...css.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)\s*([\d.]+)%/g)];
      if(matches.length>=2)this._stops=matches.map(m=>({c:rgbToHex(+m[1],+m[2],+m[3]),a:m[4]!=null?parseFloat(m[4]):1,p:parseFloat(m[5])}));
      this._el.querySelectorAll('.gp-tab').forEach(b=>b.classList.toggle('on',b.dataset.t===this._type));
      this._el.querySelector('#gp-grad').style.display='block';
      this._el.querySelector('#gp-angle-row').style.display=this._type==='radial'?'none':'flex';
    } else {
      this._type='solid';
      try{const[r,g,b]=hexToRgb(css.trim());[this._h,this._s,this._v]=rgbToHsv(r,g,b);this._stops[0]={c:css.trim(),a:1,p:0};}catch(e){}
      this._el.querySelectorAll('.gp-tab').forEach(b=>b.classList.toggle('on',b.dataset.t==='solid'));
      this._el.querySelector('#gp-grad').style.display='none';
    }
    const s=this._stops[this._active]||this._stops[0];
    try{const[r,g,b]=hexToRgb(s.c);[this._h,this._s,this._v]=rgbToHsv(r,g,b);this._a=s.a;}catch(e){}
    this._render();
  }

  show(x,y){
    this._el.style.display='block';
    const W=window.innerWidth,H=window.innerHeight;
    this._el.style.left=Math.min(x,W-270)+'px';
    this._el.style.top=Math.min(y,H-460)+'px';
    this._render();
  }
  hide(){this._el.style.display='none';}
}

window.GradientPicker=GradientPicker;

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
    e._gpTrig=true;
    if(picker._el.style.display==='block'){picker.hide();return;}
    picker.setValue(hexInput?hexInput.value:(opts.value||'#1a3a6e'));
    const r=swatchEl.getBoundingClientRect();
    picker.show(r.left,r.bottom+8);
  });
  return picker;
};
})();
