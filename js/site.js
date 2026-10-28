(function(){
  const root=document.documentElement,tbtn=document.getElementById('theme'),meta=document.querySelector('meta[name="theme-color"]');
  function isDark(){return root.getAttribute('data-theme')!=='light'}
  function syncTheme(){const d=isDark();tbtn.setAttribute('aria-label',d?'Switch to light theme':'Switch to dark theme');tbtn.setAttribute('aria-pressed',String(d));if(meta)meta.setAttribute('content',d?'#11191F':'#FFFBEA')}
  let saved=null;try{saved=localStorage.getItem('bys-theme-v2')}catch(e){}
  root.setAttribute('data-theme',saved==='light'?'light':'dark');
  tbtn.addEventListener('click',()=>{const next=isDark()?'light':'dark';root.setAttribute('data-theme',next);try{localStorage.setItem('bys-theme-v2',next)}catch(e){}syncTheme()});
  syncTheme();
  const bar=document.getElementById('bar'),sheet=document.getElementById('sheet'),veil=document.getElementById('veil'),
        openB=document.getElementById('open'),closeB=document.getElementById('close'),now=document.getElementById('now'),
        prog=document.getElementById('progress'),cover=document.getElementById('top');
  let lastFocus=null;
  function openSheet(){lastFocus=document.activeElement;sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');openB.setAttribute('aria-expanded','true');veil.hidden=false;document.body.classList.add('locked');setTimeout(()=>closeB.focus(),60)}
  function closeSheet(){sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');openB.setAttribute('aria-expanded','false');veil.hidden=true;document.body.classList.remove('locked');if(lastFocus)lastFocus.focus()}
  openB.addEventListener('click',openSheet);
  document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',openSheet));
  closeB.addEventListener('click',closeSheet);veil.addEventListener('click',closeSheet);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('open'))closeSheet()});
  sheet.querySelectorAll('.toc a').forEach((a,i)=>{a.parentElement.style.transitionDelay=(60+i*28)+'ms';a.addEventListener('click',()=>closeSheet())});

  const chapters=[...document.querySelectorAll('.chapter')];
  const links=[...sheet.querySelectorAll('.toc a')];
  function onScroll(){
    const y=window.scrollY,h=document.documentElement.scrollHeight-innerHeight;
    prog.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';
    const coverBottom=cover.offsetTop+cover.offsetHeight-80;
    bar.classList.toggle('over',y<coverBottom);
    let cur=null;const line=y+innerHeight*0.3;
    for(const c of chapters){if(c.offsetTop<=line)cur=c}
    const title=cur?cur.dataset.title.replace('&amp;','&'):'Behind Your Stay';
    if(now.textContent!==title)now.textContent=title;
    const id=cur?(cur.dataset.nav||cur.id):null;
    links.forEach(a=>a.setAttribute('aria-current',a.getAttribute('href')==='#'+id?'true':'false'));
  }

  /* Floating liquid-glass tab bar: tracks the current section, slides its lens, compacts while scrolling down. */
  const tabbar=document.getElementById('tabbar'),tabs=[...tabbar.querySelectorAll('a')],lens=tabbar.querySelector('.lens');
  const tabOf={top:'top',stand:'stand',then:'stand',building:'stand',numbers:'numbers',people:'numbers',takes:'takes',next:'takes',you:'you',fine:'you'};
  let curTab=null,lastY=scrollY;
  function placeLens(){const a=tabbar.querySelector('a[aria-current="page"]')||tabs[0];lens.style.width=a.offsetWidth+'px';lens.style.transform='translateX('+a.offsetLeft+'px)'}
  function setTab(id){if(id===curTab)return;curTab=id;tabs.forEach(a=>{if(a.dataset.tab===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});placeLens()}
  function tabScroll(){
    const y=scrollY;let cur=null;const line=y+innerHeight*0.3;
    for(const c of chapters){if(c.offsetTop<=line)cur=c}
    setTab(cur?(tabOf[cur.dataset.nav||cur.id]||tabOf[cur.id]||'top'):'top');
    const dy=y-lastY;if(Math.abs(dy)>6){tabbar.classList.toggle('min',dy>0&&y>innerHeight*0.6);lastY=y}
  }
  addEventListener('scroll',tabScroll,{passive:true});addEventListener('resize',placeLens);
  tabbar.addEventListener('transitionend',e=>{if(e.target===tabbar)placeLens()});
  tabs.forEach(a=>a.addEventListener('click',()=>{tabbar.classList.remove('min');setTab(a.dataset.tab)}));
  tabScroll();requestAnimationFrame(placeLens);
  /* Parallax: every edge-to-edge photo lags behind the page once its frame passes the top of the screen,
     so it appears to stick to the top edge while the page slides over it. */
  const still=matchMedia('(prefers-reduced-motion: reduce)'),phone=matchMedia('(max-width: 699px)');
  document.querySelectorAll('figure.photo>img, .pair>img').forEach(img=>{const f=document.createElement('div');f.className='pf';img.parentNode.insertBefore(f,img);f.appendChild(img)});
  const always=[...document.querySelectorAll('.cover, .hero, .closing')].map(el=>({frame:el,img:el.querySelector(':scope>img'),k:el.classList.contains('cover')?0.45:0.55,phoneOnly:false}));
  const inline=[...document.querySelectorAll('.pf')].map(el=>({frame:el,img:el.querySelector('img'),k:0.5,phoneOnly:true}));
  const layers=always.concat(inline).filter(l=>l.img);
  let pTick=false;
  function parallax(){
    pTick=false;const vh=innerHeight;
    for(const l of layers){
      if(still.matches||(l.phoneOnly&&!phone.matches)){if(l.img.style.transform)l.img.style.transform='';continue}
      const r=l.frame.getBoundingClientRect();
      if(r.bottom<0||r.top>vh)continue;
      const past=Math.max(0,-r.top);
      l.img.style.transform=past?'translate3d(0,'+(past*l.k).toFixed(1)+'px,0)'+(l.frame.classList.contains('cover')?' scale('+(1+past/r.height*0.06).toFixed(4)+')':''):'';
    }
  }
  addEventListener('scroll',()=>{if(!pTick){pTick=true;requestAnimationFrame(parallax)}},{passive:true});
  addEventListener('resize',parallax);phone.addEventListener&&phone.addEventListener('change',parallax);parallax();
  /* Count-up numbers and growing bars. Values are in the HTML at rest; only items still off-screen
     are reset at load, then animate when they scroll into view. */
  (function(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
    const ease=t=>1-Math.pow(1-t,3);
    const nums=[...document.querySelectorAll('.num')].map(el=>{
      const m=el.textContent.trim().match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
      if(!m)return null;const raw=m[2].replace(/,/g,'');
      return {el,pre:m[1],val:parseFloat(raw),dec:(raw.split('.')[1]||'').length,suf:m[3],final:el.textContent};
    }).filter(Boolean);
    const fmt=(n,v)=>n.pre+v.toFixed(n.dec)+n.suf;
    function count(n){const t0=performance.now(),d=1400;
      (function step(now){const p=Math.min(1,(now-t0)/d);n.el.textContent=p<1?fmt(n,n.val*ease(p)):n.final;if(p<1)requestAnimationFrame(step)})(t0)}
    const vh=innerHeight,below=el=>el.getBoundingClientRect().top>vh*0.92;
    const io=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const job=e.target._job;if(job)job()})},{threshold:0.35});
    nums.forEach(n=>{if(!below(n.el))return;n.el.textContent=fmt(n,0);n.el._job=()=>count(n);io.observe(n.el)});
    document.querySelectorAll('.cmp, .emis').forEach(g=>{
      if(!below(g))return;const fills=[...g.querySelectorAll('.f')];fills.forEach(f=>f.classList.add('pre'));
      g._job=()=>fills.forEach((f,i)=>setTimeout(()=>f.classList.remove('pre'),120+i*140));io.observe(g)});
  })();
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);onScroll();

  const tips=document.getElementById('tips'),cards=[...tips.children],cnt=document.getElementById('tipcount'),
        prev=document.getElementById('tprev'),next=document.getElementById('tnext');
  function idx(){const l=tips.scrollLeft;let best=0,d=1e9;cards.forEach((c,i)=>{const dd=Math.abs(c.offsetLeft-tips.offsetLeft-l-(tips.clientWidth-c.clientWidth)/2);if(dd<d){d=dd;best=i}});return best}
  function upd(){const i=idx();cnt.textContent=(i+1)+' / '+cards.length;prev.disabled=i===0;next.disabled=i===cards.length-1}
  function go(i){const c=cards[Math.max(0,Math.min(cards.length-1,i))];tips.scrollTo({left:c.offsetLeft-tips.offsetLeft-(tips.clientWidth-c.clientWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
  tips.addEventListener('scroll',()=>requestAnimationFrame(upd),{passive:true});
  prev.addEventListener('click',()=>go(idx()-1));next.addEventListener('click',()=>go(idx()+1));
  tips.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();go(idx()+1)}if(e.key==='ArrowLeft'){e.preventDefault();go(idx()-1)}});
  upd();
})();
