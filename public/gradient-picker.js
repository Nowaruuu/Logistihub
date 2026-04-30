/* fill-list.js — Figma-style multi-fill / gradient builder (v3) */
(function(){
'use strict';

/* ── utils ── */
function hsvToRgb(h,s,v){let r,g,b,i=Math.floor(h/60)%6,f=h/60-Math.floor(h/60),p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);switch(i){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;default:r=v;g=p;b=q;}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)];}
function hexToRgb(h){h=(h||'').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16)||0;return[(n>>16)&255,(n>>8)&255,n&255];}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');}
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m;let h=0,s=M?d/M:0,v=M;if(d){if(M===r)h=((g-b)/d)%6;else if(M===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=Math.round(h*60);if(h<0)h+=360;}return[h,s,v];}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function toRgba(hex,a){const[r,g,b]=hexToRgb(hex);return`rgba(${r},${g},${b},${a})`;}

/* ── CSS ── */
function injectCSS(){
  if(document.getElementById('fl-css'))return;
  const s=document.createElement('style');s.id='fl-css';s.textContent=`
.fl-root{font-family:'DM Sans',sans-serif;}
.fl-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.fl-title{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;}
.fl-head-right{display:flex;align-items:center;gap:5px;}
.fl-type-sel{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;color:#334155;font-size:11px;padding:3px 7px;outline:none;cursor:pointer;font-family:inherit;}
.fl-angle-inp{width:38px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;color:#334155;padding:3px 5px;font-size:11px;font-family:'DM Mono',monospace;outline:none;text-align:center;}
.fl-ang-deg{font-size:11px;color:#94a3b8;}
.fl-add{background:#fff;border:1.5px solid #e2e8f0;border-radius:6px;color:#64748b;cursor:pointer;font-size:15px;line-height:1;padding:1px 8px;font-family:inherit;transition:all .15s;}
.fl-add:hover{border-color:#0f2235;color:#0f2235;}
/* gradient bar */
.fl-bar-wrap{position:relative;height:28px;border-radius:8px;margin-bottom:10px;border:1.5px solid #e2e8f0;overflow:visible;cursor:crosshair;}
.fl-bar-track{position:absolute;inset:0;border-radius:7px;background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0 0/10px 10px;}
.fl-bar-grad{position:absolute;inset:0;border-radius:7px;}
.fl-handle{position:absolute;top:50%;width:16px;height:16px;border-radius:4px;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);transform:translate(-50%,-50%);cursor:grab;z-index:3;box-sizing:border-box;}
.fl-handle.active{box-shadow:0 0 0 2.5px #3b82f6,0 1px 5px rgba(0,0,0,.35);}
/* rows */
.fl-row{display:flex;align-items:center;gap:7px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:5px 9px;margin-bottom:5px;transition:border-color .15s;}
.fl-row.active{border-color:#3b82f6;}
.fl-pos-inp{width:28px;background:transparent;border:none;color:#334155;font-size:11px;font-family:'DM Mono',monospace;outline:none;text-align:right;}
.fl-pct{font-size:11px;color:#94a3b8;}
.fl-swatch{width:24px;height:24px;border-radius:5px;border:1.5px solid rgba(0,0,0,.1);cursor:pointer;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.08);}
.fl-hex-inp{flex:1;background:none;border:none;color:#1e293b;font-size:12px;font-family:'DM Mono',monospace;outline:none;min-width:0;text-transform:uppercase;}
.fl-op-inp{width:30px;background:none;border:none;color:#1e293b;font-size:12px;font-family:'DM Mono',monospace;outline:none;text-align:right;}
.fl-vis{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:13px;padding:0 2px;line-height:1;}
.fl-vis.on,.fl-vis:hover{color:#475569;}
.fl-del{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:17px;line-height:1;padding:0;}
.fl-del:hover{color:#ef4444;}
/* tiny picker popup */
.fl-picker-popup{position:fixed;z-index:99999;width:218px;background:#1c1c1e;border-radius:11px;box-shadow:0 14px 44px rgba(0,0,0,.7);padding:11px;user-select:none;display:none;}
.fl-cv-wrap{position:relative;border-radius:7px;overflow:hidden;margin-bottom:8px;}
.fl-cv{display:block;width:196px;height:136px;cursor:crosshair;}
.fl-dot{position:absolute;width:11px;height:11px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:none;transform:translate(-50%,-50%);}
.fl-hsl{position:relative;height:12px;border-radius:6px;margin-bottom:7px;cursor:pointer;}
.fl-hsl-bg{position:absolute;inset:0;border-radius:6px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);}
.fl-hth{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.5);transform:translate(-50%,-50%);pointer-events:none;}
.fl-hex-row{display:flex;background:#2a2a2a;border:1px solid #333;border-radius:6px;padding:5px 9px;}
.fl-hex-row input{flex:1;background:none;border:none;color:#fff;font-size:12px;font-family:'DM Mono',monospace;outline:none;}
`;
  document.head.appendChild(s);
}

/* ── Tiny HSV popup ── */
let _popup=null;
function getPopup(){
  if(_popup)return _popup;
  injectCSS();
  const d=document.createElement('div');d.className='fl-picker-popup';
  d.innerHTML=`<div class="fl-cv-wrap"><canvas class="fl-cv" width="196" height="136"></canvas><div class="fl-dot" id="fldot"></div></div>
<div class="fl-hsl"><div class="fl-hsl-bg"></div><div class="fl-hth" id="flhth"></div></div>
<div class="fl-hex-row"><input id="flhex" type="text" maxlength="7"></div>`;
  document.body.appendChild(d);
  _popup={el:d,h:0,s:1,v:1,cb:null};

  function draw(){
    const cv=d.querySelector('.fl-cv'),ctx=cv.getContext('2d'),W=196,H=136;
    const[hr,hg,hb]=hsvToRgb(_popup.h,1,1);
    ctx.fillStyle=`rgb(${hr},${hg},${hb})`;ctx.fillRect(0,0,W,H);
    let g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#fff');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'transparent');g.addColorStop(1,'#000');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    d.querySelector('#fldot').style.cssText=`left:${_popup.s*196}px;top:${(1-_popup.v)*136}px`;
    d.querySelector('#flhth').style.left=(_popup.h/360*100)+'%';
    d.querySelector('#flhth').style.background=`hsl(${_popup.h},100%,50%)`;
    const[r,g2,b]=hsvToRgb(_popup.h,_popup.s,_popup.v);
    const hex=rgbToHex(r,g2,b);
    d.querySelector('#flhex').value=hex;
    if(_popup.cb)_popup.cb(hex);
  }
  _popup.draw=draw;

  function drag(el,fn){let on=false;el.addEventListener('mousedown',e=>{on=true;fn(e);e.preventDefault();e.stopPropagation();});document.addEventListener('mousemove',e=>{if(on)fn(e);});document.addEventListener('mouseup',()=>{on=false;});}
  drag(d.querySelector('.fl-cv'),e=>{const r=d.querySelector('.fl-cv').getBoundingClientRect();_popup.s=clamp((e.clientX-r.left)/r.width,0,1);_popup.v=clamp(1-(e.clientY-r.top)/r.height,0,1);draw();});
  drag(d.querySelector('.fl-hsl'),e=>{const r=d.querySelector('.fl-hsl').getBoundingClientRect();_popup.h=clamp((e.clientX-r.left)/r.width,0,1)*360;draw();});
  d.querySelector('#flhex').oninput=e=>{const v=e.target.value;if(/^#[0-9a-fA-F]{6}$/.test(v)){const[r,g,b]=hexToRgb(v);[_popup.h,_popup.s,_popup.v]=rgbToHsv(r,g,b);draw();}};
  document.addEventListener('mousedown',e=>{if(_popup.el.style.display==='block'&&!_popup.el.contains(e.target)&&!e._flTrig)_popup.el.style.display='none';});
  return _popup;
}

function openPopup(anchor,hex,cb){
  const p=getPopup();p.cb=cb;
  try{const[r,g,b]=hexToRgb(hex);[p.h,p.s,p.v]=rgbToHsv(r,g,b);}catch(e){}
  p.draw();
  p.el.style.display='block';
  const br=anchor.getBoundingClientRect(),W=window.innerWidth,H=window.innerHeight;
  let left=br.right+8,top=br.top;
  if(left+228>W)left=br.left-228;
  if(top+220>H)top=H-220;
  p.el.style.left=left+'px';p.el.style.top=top+'px';
}

/* ── FillList ── */
class FillList{
  constructor(container,opts={}){
    this.container=container;
    this.onChange=opts.onChange||function(){};
    this.gradType='linear';
    this.angle=135;
    this.fills=[];
    this._parse(opts.value||'#ffffff');
    injectCSS();
    this._build();
  }

  _parse(css){
    css=(css||'').trim();
    if(css.includes('gradient')){
      if(css.startsWith('radial'))this.gradType='radial';
      else if(css.startsWith('conic'))this.gradType='angular';
      else this.gradType='linear';
      const am=css.match(/(\d+)deg/);if(am)this.angle=parseInt(am[1]);
      // match rgba(r,g,b,a) POS%
      const m=[...css.matchAll(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)\s*([\d.]+)%/g)];
      if(m.length>=2){
        this.fills=m.map(x=>({hex:rgbToHex(+x[1],+x[2],+x[3]),op:x[4]!=null?Math.round(parseFloat(x[4])*100):100,pos:Math.round(parseFloat(x[5])),vis:true}));
        return;
      }
    }
    // solid hex or fallback — support with or without #
    if (!css.startsWith('#') && /^[0-9a-fA-F]{3,6}$/.test(css)) css = '#' + css;
    let hex=css.match(/#[0-9a-fA-F]{6}/)?.[0]||css.match(/#[0-9a-fA-F]{3}/)?.[0]||'#ffffff';
    this.fills=[{hex,op:100,pos:0,vis:true}];
    this.gradType='linear';
  }

  _css(){
    const vis=this.fills.filter(f=>f.vis).sort((a,b)=>a.pos-b.pos);
    if(vis.length===0)return'transparent';
    if(vis.length===1){const f=vis[0];return f.op===100?f.hex:toRgba(f.hex,f.op/100);}
    const stops=vis.map(f=>`${toRgba(f.hex,f.op/100)} ${f.pos}%`).join(', ');
    if(this.gradType==='radial')return`radial-gradient(circle, ${stops})`;
    if(this.gradType==='angular')return`conic-gradient(from ${this.angle}deg, ${stops})`;
    return`linear-gradient(${this.angle}deg, ${stops})`;
  }

  _barCss(){
    // always left-to-right for bar preview
    const vis=this.fills.filter(f=>f.vis).sort((a,b)=>a.pos-b.pos);
    if(vis.length<2)return vis[0]?vis[0].hex:'#ccc';
    const stops=vis.map(f=>`${toRgba(f.hex,f.op/100)} ${f.pos}%`).join(', ');
    return`linear-gradient(to right, ${stops})`;
  }

  _build(){
    this.container.innerHTML='';
    const root=document.createElement('div');root.className='fl-root';
    this._root=root;

    // ── Header ──
    const hdr=document.createElement('div');hdr.className='fl-header';
    const title=document.createElement('span');title.className='fl-title';title.textContent='Fill';
    const right=document.createElement('div');right.className='fl-head-right';

    this._typeSel=document.createElement('select');this._typeSel.className='fl-type-sel';
    this._typeSel.style.display=this.fills.length>1?'inline-block':'none';
    ['linear','radial','angular'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t[0].toUpperCase()+t.slice(1);if(t===this.gradType)o.selected=true;this._typeSel.appendChild(o);});
    this._typeSel.onchange=e=>{this.gradType=e.target.value;this._angWrap.style.display=(e.target.value!=='radial')?'flex':'none';this._updateBarGrad();this.onChange(this._css());};

    this._angWrap=document.createElement('div');this._angWrap.style.cssText='display:flex;align-items:center;gap:3px;';
    this._angWrap.style.display=(this.fills.length>1&&this.gradType!=='radial')?'flex':'none';
    this._angInp=document.createElement('input');this._angInp.className='fl-angle-inp';this._angInp.type='number';this._angInp.min=0;this._angInp.max=360;this._angInp.value=this.angle;
    this._angInp.oninput=e=>{this.angle=parseInt(e.target.value)||0;this._updateBarGrad();this.onChange(this._css());};
    const angDeg=document.createElement('span');angDeg.className='fl-ang-deg';angDeg.textContent='°';
    this._angWrap.appendChild(this._angInp);this._angWrap.appendChild(angDeg);

    const addBtn=document.createElement('button');addBtn.className='fl-add';addBtn.textContent='+';addBtn.title='Add color stop';
    addBtn.onclick=()=>{
      const sorted=[...this.fills].sort((a,b)=>a.pos-b.pos);
      const last=sorted[sorted.length-1];
      let pos=100;
      if(this.fills.length===1&&this.fills[0].pos===0)pos=100;
      else if(last)pos=Math.min(100,Math.round(last.pos+(100-last.pos)/2));
      const ref=this.fills[0];
      this.fills.push({hex:ref?ref.hex:'#ffffff',op:100,pos,vis:true});
      this._rebuildRows();
      this._syncBar();
      this.onChange(this._css());
    };

    right.appendChild(this._typeSel);right.appendChild(this._angWrap);right.appendChild(addBtn);
    hdr.appendChild(title);hdr.appendChild(right);
    root.appendChild(hdr);

    // ── Gradient bar ──
    this._barWrap=document.createElement('div');this._barWrap.className='fl-bar-wrap';
    this._barWrap.style.display=this.fills.length>1?'block':'none';
    const barTrack=document.createElement('div');barTrack.className='fl-bar-track';
    this._barGrad=document.createElement('div');this._barGrad.className='fl-bar-grad';
    this._barGrad.style.background=this._barCss();
    this._barWrap.appendChild(barTrack);this._barWrap.appendChild(this._barGrad);
    root.appendChild(this._barWrap);

    // ── Rows container ──
    this._rowsEl=document.createElement('div');
    root.appendChild(this._rowsEl);

    this.container.appendChild(root);
    this._rebuildRows();
    this._syncBar();
  }

  _updateBarGrad(){
    if(this._barGrad)this._barGrad.style.background=this._barCss();
  }

  // Build handle elements for gradient bar (non-destructive re-sync)
  _syncBar(){
    // Update visibility
    const multi=this.fills.length>1;
    this._barWrap.style.display=multi?'block':'none';
    this._typeSel.style.display=multi?'inline-block':'none';
    this._angWrap.style.display=(multi&&this.gradType!=='radial')?'flex':'none';

    // Remove old handles
    this._barWrap.querySelectorAll('.fl-handle').forEach(h=>h.remove());
    this._updateBarGrad();

    if(!multi)return;
    this.fills.forEach((f,i)=>{
      const h=document.createElement('div');h.className='fl-handle';
      h.style.cssText=`left:${f.pos}%;background:${f.hex};opacity:${f.op/100};`;
      h.addEventListener('mousedown',e=>{
        e.stopPropagation();
        // Mark active
        this._barWrap.querySelectorAll('.fl-handle').forEach(hh=>hh.classList.remove('active'));
        h.classList.add('active');
        this._rowsEl.querySelectorAll('.fl-row').forEach((r,ri)=>r.classList.toggle('active',ri===i));
        const bRect=this._barWrap.getBoundingClientRect();
        const onMove=ev=>{
          f.pos=Math.round(clamp((ev.clientX-bRect.left)/bRect.width*100,0,100));
          h.style.left=f.pos+'%';
          this._updateBarGrad();
          // update row pos input
          const rows=this._rowsEl.querySelectorAll('.fl-row');
          if(rows[i]){const inp=rows[i].querySelector('.fl-pos-inp');if(inp)inp.value=f.pos;}
          this.onChange(this._css());
        };
        const onUp=()=>{document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
      this._barWrap.appendChild(h);
    });
  }

  _rebuildRows(){
    this._rowsEl.innerHTML='';
    this.fills.forEach((f,i)=>{
      const row=document.createElement('div');row.className='fl-row';

      // Position input (only when multi-fill)
      const posInp=document.createElement('input');posInp.className='fl-pos-inp';posInp.type='number';posInp.min=0;posInp.max=100;posInp.value=f.pos;
      posInp.style.display=this.fills.length>1?'inline-block':'none';
      posInp.oninput=e=>{f.pos=clamp(parseInt(e.target.value)||0,0,100);this._syncBar();this.onChange(this._css());};
      const posPct=document.createElement('span');posPct.className='fl-pct';posPct.textContent='%';
      posPct.style.display=this.fills.length>1?'inline':'none';

      // Color swatch
      const sw=document.createElement('div');sw.className='fl-swatch';sw.style.background=f.hex;
      sw.addEventListener('mousedown',e=>{
        e._flTrig=true;
        openPopup(sw,f.hex,hex=>{
          f.hex=hex;sw.style.background=hex;
          hexInp.value=hex.replace('#','').toUpperCase();
          // update handle color
          const handles=this._barWrap.querySelectorAll('.fl-handle');
          if(handles[i])handles[i].style.background=hex;
          this._updateBarGrad();
          this.onChange(this._css());
        });
      });

      const hexInp=document.createElement('input');hexInp.className='fl-hex-inp';hexInp.type='text';hexInp.maxLength=6;hexInp.value=f.hex.replace('#','').toUpperCase();
      hexInp.oninput=e=>{const v='#'+e.target.value.replace(/[^0-9a-fA-F]/g,'');if(v.length===7){f.hex=v;sw.style.background=v;this._syncBar();this.onChange(this._css());}};

      const opInp=document.createElement('input');opInp.className='fl-op-inp';opInp.type='number';opInp.min=0;opInp.max=100;opInp.value=f.op;
      opInp.oninput=e=>{f.op=clamp(parseInt(e.target.value)||0,0,100);this._syncBar();this.onChange(this._css());};
      const opPct=document.createElement('span');opPct.className='fl-pct';opPct.textContent='%';

      const visBtn=document.createElement('button');visBtn.className='fl-vis'+(f.vis?' on':'');visBtn.innerHTML='&#128065;';
      visBtn.onclick=()=>{f.vis=!f.vis;visBtn.className='fl-vis'+(f.vis?' on':'');this._updateBarGrad();this.onChange(this._css());};

      const delBtn=document.createElement('button');delBtn.className='fl-del';delBtn.textContent='—';
      delBtn.onclick=()=>{if(this.fills.length<=1)return;this.fills.splice(i,1);this._rebuildRows();this._syncBar();this.onChange(this._css());};

      row.appendChild(posInp);row.appendChild(posPct);row.appendChild(sw);row.appendChild(hexInp);row.appendChild(opInp);row.appendChild(opPct);row.appendChild(visBtn);row.appendChild(delBtn);
      this._rowsEl.appendChild(row);
    });
  }

  getValue(){return this._css();}
  setValue(css){this._parse(css);this._build();}
}

window.FillList=FillList;
})();
