/* fill-list.js — Figma-style multi-fill / gradient builder */
(function(){
'use strict';

/* ── Color utils ── */
function hsvToRgb(h,s,v){let r,g,b,i=Math.floor(h/60)%6,f=h/60-Math.floor(h/60),p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);switch(i){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;default:r=v;g=p;b=q;}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)];}
function hexToRgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16)||0;return[(n>>16)&255,(n>>8)&255,n&255];}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');}
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m;let h=0,s=M?d/M:0,v=M;if(d){if(M===r)h=((g-b)/d)%6;else if(M===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=Math.round(h*60);if(h<0)h+=360;}return[h,s,v];}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

/* ── Inject CSS once ── */
function injectCSS(){
  if(document.getElementById('fl-css'))return;
  const s=document.createElement('style');s.id='fl-css';
  s.textContent=`
.fl-root{border-radius:8px;padding:6px 0;font-family:'DM Sans',sans-serif;}
.fl-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.fl-title{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase;}
.fl-head-right{display:flex;align-items:center;gap:6px;}
.fl-angle-wrap{display:flex;align-items:center;gap:4px;font-size:11px;color:#64748b;}
.fl-angle-wrap input{width:42px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;color:#1e293b;padding:3px 6px;font-size:11px;font-family:'DM Mono',monospace;outline:none;}
.fl-add{background:#fff;border:1.5px solid #e2e8f0;border-radius:6px;color:#64748b;cursor:pointer;font-size:16px;line-height:1;padding:1px 8px;transition:all .15s;}
.fl-add:hover{border-color:#0f2235;color:#0f2235;}
.fl-item{display:flex;align-items:center;gap:8px;margin-bottom:5px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 10px;}
.fl-swatch{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;cursor:pointer;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.08);}
.fl-hex{flex:1;background:none;border:none;color:#1e293b;font-size:12px;font-family:'DM Mono',monospace;outline:none;min-width:0;text-transform:uppercase;}
.fl-op{width:32px;background:none;border:none;color:#1e293b;font-size:12px;font-family:'DM Mono',monospace;outline:none;text-align:right;}
.fl-pct{font-size:12px;color:#94a3b8;}
.fl-vis{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:13px;padding:0 2px;}
.fl-vis:hover,.fl-vis.on{color:#475569;}
.fl-del{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:18px;line-height:1;padding:0;}
.fl-del:hover{color:#ef4444;}
.fl-pos{width:30px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:5px;color:#334155;font-size:11px;font-family:'DM Mono',monospace;outline:none;text-align:center;padding:2px 4px;}
.fl-type-wrap{display:flex;align-items:center;}
.fl-type-sel{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;color:#334155;font-size:11px;padding:3px 6px;outline:none;cursor:pointer;font-family:inherit;}
/* Tiny color picker popup */
.fl-picker{position:fixed;z-index:99999;width:220px;background:#1e1e1e;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.7);padding:10px;font-family:'DM Sans',sans-serif;user-select:none;display:none;}
.fl-cv-wrap{position:relative;border-radius:6px;overflow:hidden;margin-bottom:8px;}
.fl-cv{display:block;width:200px;height:130px;cursor:crosshair;}
.fl-dot{position:absolute;width:10px;height:10px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:none;transform:translate(-50%,-50%);}
.fl-sl{position:relative;height:12px;border-radius:6px;margin-bottom:7px;cursor:pointer;}
.fl-hue-bg{position:absolute;inset:0;border-radius:6px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);}
.fl-th{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.5);transform:translate(-50%,-50%);pointer-events:none;}
.fl-pin{display:flex;gap:7px;}
.fl-pin-hex{flex:1;background:#2a2a2a;border:1px solid #333;border-radius:6px;padding:4px 8px;display:flex;}
.fl-pin-hex input{flex:1;background:none;border:none;color:#fff;font-size:11px;font-family:'DM Mono',monospace;outline:none;min-width:0;}
`;
  document.head.appendChild(s);
}

/* ── Tiny HSV popup picker ── */
let _picker=null;
let _pickerOwner=null;
function getTinyPicker(){
  if(_picker)return _picker;
  injectCSS();
  const d=document.createElement('div');d.className='fl-picker';
  d.innerHTML=`<div class="fl-cv-wrap"><canvas class="fl-cv" id="flcv" width="200" height="130"></canvas><div class="fl-dot" id="fldot"></div></div>
<div class="fl-sl" id="flhsl"><div class="fl-hue-bg"></div><div class="fl-th" id="flht"></div></div>
<div class="fl-pin"><div class="fl-pin-hex"><input id="flhex" type="text" maxlength="7"></div></div>`;
  document.body.appendChild(d);
  _picker={el:d,h:0,s:1,v:1,cb:null};

  function render(){
    const cv=d.querySelector('#flcv'),ctx=cv.getContext('2d');
    const[hr,hg,hb]=hsvToRgb(_picker.h,1,1);
    ctx.fillStyle=`rgb(${hr},${hg},${hb})`;ctx.fillRect(0,0,200,130);
    const wg=ctx.createLinearGradient(0,0,200,0);wg.addColorStop(0,'#fff');wg.addColorStop(1,'transparent');
    ctx.fillStyle=wg;ctx.fillRect(0,0,200,130);
    const bg=ctx.createLinearGradient(0,0,0,130);bg.addColorStop(0,'transparent');bg.addColorStop(1,'#000');
    ctx.fillStyle=bg;ctx.fillRect(0,0,200,130);
    const dot=d.querySelector('#fldot');
    dot.style.left=(_picker.s*200)+'px';dot.style.top=((1-_picker.v)*130)+'px';
    d.querySelector('#flht').style.left=(_picker.h/360*100)+'%';
    d.querySelector('#flht').style.background=`hsl(${_picker.h},100%,50%)`;
    const[r,g,b]=hsvToRgb(_picker.h,_picker.s,_picker.v);
    d.querySelector('#flhex').value=rgbToHex(r,g,b);
    if(_picker.cb)_picker.cb(rgbToHex(r,g,b));
  }
  _picker.render=render;

  function drag(el,fn){
    let on=false;
    el.addEventListener('mousedown',e=>{on=true;fn(e);e.preventDefault();e.stopPropagation();});
    document.addEventListener('mousemove',e=>{if(on)fn(e);});
    document.addEventListener('mouseup',()=>{on=false;});
  }
  const cv=d.querySelector('#flcv');
  drag(cv,e=>{const r=cv.getBoundingClientRect();_picker.s=clamp((e.clientX-r.left)/r.width,0,1);_picker.v=clamp(1-(e.clientY-r.top)/r.height,0,1);render();});
  drag(d.querySelector('#flhsl'),e=>{const r=d.querySelector('#flhsl').getBoundingClientRect();_picker.h=clamp((e.clientX-r.left)/r.width,0,1)*360;render();});
  d.querySelector('#flhex').oninput=e=>{const v=e.target.value;if(!/^#[0-9a-fA-F]{6}$/.test(v))return;const[r,g,b]=hexToRgb(v);[_picker.h,_picker.s,_picker.v]=rgbToHsv(r,g,b);render();};
  document.addEventListener('mousedown',e=>{if(_picker.el.style.display==='block'&&!_picker.el.contains(e.target)&&!e._flTrig){_picker.el.style.display='none';_pickerOwner=null;}});
  return _picker;
}

function openPicker(swatchEl, currentHex, cb){
  const p=getTinyPicker();
  p.cb=cb;
  const[r,g,b]=hexToRgb(currentHex.replace('#','').padEnd(6,'0'));
  [p.h,p.s,p.v]=rgbToHsv(r,g,b);
  p.render();
  p.el.style.display='block';
  const br=swatchEl.getBoundingClientRect(),W=window.innerWidth,H=window.innerHeight;
  let left=br.right+6,top=br.top;
  if(left+230>W)left=br.left-230;
  if(top+200>H)top=H-200;
  p.el.style.left=left+'px';p.el.style.top=top+'px';
  _pickerOwner=swatchEl;
}

/* ── FillList class ── */
class FillList {
  constructor(container, opts={}){
    this.container=container;
    this.onChange=opts.onChange||function(){};
    this.angle=opts.angle||135;
    // Parse initial value
    this.gradType='linear';
    this.fills=[];
    this._parse(opts.value||'#ffffff');
    injectCSS();
    this._render();
  }

  _parse(css){
    if(!css){this.fills=[{hex:'#ffffff',op:100,pos:0,vis:true}];return;}
    if(css.includes('gradient')){
      const am=css.match(/(\d+)deg/);if(am)this.angle=parseInt(am[1]);
      if(css.includes('radial'))this.gradType='radial';
      else if(css.includes('conic'))this.gradType='angular';
      else this.gradType='linear';
      const m=[...css.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)\s*([\d.]+)?%?/g)];
      if(m.length>=2){this.fills=m.map((x,i)=>({hex:rgbToHex(+x[1],+x[2],+x[3]),op:x[4]!=null?Math.round(parseFloat(x[4])*100):100,pos:x[5]!=null?Math.round(parseFloat(x[5])):Math.round(i/(m.length-1)*100),vis:true}));return;}
    }
    this.gradType='linear';
    const hex=css.replace(/[^#0-9a-fA-F]/g,'').substring(0,7)||'#ffffff';
    this.fills=[{hex:hex.startsWith('#')?hex:'#'+hex,op:100,pos:0,vis:true}];
  }

  _css(){
    const vis=this.fills.filter(f=>f.vis);
    if(vis.length===1){const f=vis[0];const[r,g,b]=hexToRgb(f.hex);return f.op===100?f.hex:`rgba(${r},${g},${b},${f.op/100})`;}
    const stops=vis.map(f=>{const[r,g,b]=hexToRgb(f.hex);return`rgba(${r},${g},${b},${f.op/100}) ${f.pos}%`;}).join(', ');
    if(this.gradType==='radial')return`radial-gradient(circle, ${stops})`;
    if(this.gradType==='angular')return`conic-gradient(from ${this.angle}deg, ${stops})`;
    return`linear-gradient(${this.angle}deg, ${stops})`;
  }

  _render(){
    this.container.innerHTML='';
    const root=document.createElement('div');root.className='fl-root';

    // Header with type selector + add button
    const hdr=document.createElement('div');hdr.className='fl-header';
    const titleSpan=document.createElement('span');titleSpan.className='fl-title';titleSpan.textContent='Fill';
    const right=document.createElement('div');right.className='fl-head-right';

    // Gradient type selector
    const typeWrap=document.createElement('div');typeWrap.className='fl-type-wrap';
    typeWrap.style.display=this.fills.length>1?'flex':'none';
    const typeSelect=document.createElement('select');typeSelect.className='fl-type-sel';
    ['linear','radial','angular'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t.charAt(0).toUpperCase()+t.slice(1);if(t===this.gradType)o.selected=true;typeSelect.appendChild(o);});
    typeSelect.onchange=e=>{this.gradType=e.target.value;angleWrap.style.display=(e.target.value!=='radial')?'flex':'none';this.onChange(this._css());};
    typeWrap.appendChild(typeSelect);

    // Angle input
    const angleWrap=document.createElement('div');angleWrap.className='fl-angle-wrap';
    angleWrap.style.display=(this.fills.length>1&&this.gradType!=='radial')?'flex':'none';
    angleWrap.innerHTML=`<input type="number" min="0" max="360" value="${this.angle}"><span>°</span>`;
    angleWrap.querySelector('input').oninput=e=>{this.angle=parseInt(e.target.value)||0;this.onChange(this._css());};

    const addBtn=document.createElement('button');addBtn.className='fl-add';addBtn.textContent='+';addBtn.title='Add color stop';
    addBtn.onclick=()=>{const last=this.fills[this.fills.length-1];const pos=Math.min(100,last?last.pos+Math.round((100-last.pos)/2):50);this.fills.push({hex:'#ffffff',op:100,pos:pos,vis:true});this._render();this.onChange(this._css());};

    right.appendChild(typeWrap);right.appendChild(angleWrap);right.appendChild(addBtn);
    hdr.appendChild(titleSpan);hdr.appendChild(right);
    root.appendChild(hdr);

    // Fill rows — each shows: [pos%] [swatch] [HEX] [op] [%] [eye] [—]
    this.fills.forEach((f,i)=>{
      const row=document.createElement('div');row.className='fl-item';

      // Position %
      const posInput=document.createElement('input');posInput.className='fl-pos';posInput.type='number';posInput.min=0;posInput.max=100;posInput.value=f.pos;posInput.title='Stop position %';
      posInput.style.display=this.fills.length>1?'block':'none';
      posInput.oninput=e=>{f.pos=Math.max(0,Math.min(100,parseInt(e.target.value)||0));this.onChange(this._css());};

      const posLabel=document.createElement('span');posLabel.className='fl-pct';posLabel.textContent='%';
      posLabel.style.display=this.fills.length>1?'inline':'none';

      const sw=document.createElement('div');sw.className='fl-swatch';
      sw.style.background=f.hex;
      sw.addEventListener('mousedown',e=>{e._flTrig=true;openPicker(sw,f.hex,hex=>{f.hex=hex;sw.style.background=hex;hexInput.value=hex.replace('#','').toUpperCase();this.onChange(this._css());});});

      const hexInput=document.createElement('input');hexInput.className='fl-hex';hexInput.type='text';hexInput.maxLength=6;hexInput.value=f.hex.replace('#','').toUpperCase();
      hexInput.oninput=e=>{const v='#'+e.target.value.replace(/[^0-9a-fA-F]/g,'');if(v.length===7){f.hex=v;sw.style.background=v;this.onChange(this._css());}};

      const opInput=document.createElement('input');opInput.className='fl-op';opInput.type='number';opInput.min=0;opInput.max=100;opInput.value=f.op;
      opInput.oninput=e=>{f.op=clamp(parseInt(e.target.value)||0,0,100);this.onChange(this._css());};

      const pct=document.createElement('span');pct.className='fl-pct';pct.textContent='%';

      const vis=document.createElement('button');vis.className='fl-vis'+(f.vis?' on':'');vis.textContent='👁';vis.title='Toggle';
      vis.onclick=()=>{f.vis=!f.vis;vis.className='fl-vis'+(f.vis?' on':'');this.onChange(this._css());};

      const del=document.createElement('button');del.className='fl-del';del.textContent='—';del.title='Remove';
      del.onclick=()=>{if(this.fills.length<=1)return;this.fills.splice(i,1);this._render();this.onChange(this._css());};

      row.appendChild(posInput);row.appendChild(posLabel);row.appendChild(sw);row.appendChild(hexInput);row.appendChild(opInput);row.appendChild(pct);row.appendChild(vis);row.appendChild(del);
      root.appendChild(row);
    });

    typeWrap.style.display=this.fills.length>1?'flex':'none';
    angleWrap.style.display=(this.fills.length>1&&this.gradType!=='radial')?'flex':'none';
    this.container.appendChild(root);
  }

  getValue(){return this._css();}
  setValue(css){this._parse(css);this._render();}
}

window.FillList=FillList;
})();
