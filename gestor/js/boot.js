/* v3.4: desativa caches/service workers antigos para impedir navegação presa em versões anteriores. */
(function(){
  'use strict';
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs){
        regs.forEach(function(reg){ reg.unregister().catch(function(){}); });
      }).catch(function(){});
    }
    if ('caches' in window) {
      caches.keys().then(function(keys){
        return Promise.all(keys.filter(function(k){ return k.indexOf('gestor-')===0; }).map(function(k){ return caches.delete(k); }));
      }).catch(function(){});
    }
  } catch (_) {}
})();

/* Executado no head antes do CSS: evita o clarão de tema incorreto. */
(function () {
  'use strict';
  const defaults = {version: 3, theme: 'system', motion: 'standard', speed: 'normal', density: 'comfortable'};
  const key = 'gestor.appearance.v2';
  let value = {...defaults};
  try { value = {...defaults, ...JSON.parse(localStorage.getItem(key) || '{}')}; } catch (_) {}
  const system = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function normalize(v) {
    const next = {...defaults};
    for (const [k, options] of Object.entries({theme:['system','light','dark','contrast'],motion:['standard','subtle','none'],speed:['normal','fast'],density:['comfortable','compact']}))
      if(options.includes(v[k])) next[k]=v[k];
    return next;
  }
  function apply() {
    value=normalize(value);
    const root=document.documentElement;
    root.dataset.theme=value.theme==='system' ? (system?.matches?'dark':'light') : value.theme;
    root.dataset.motion=value.motion;root.dataset.speed=value.speed;root.dataset.density=value.density;
    root.style.colorScheme=root.dataset.theme;
    document.querySelectorAll('[data-pref]').forEach(el=>{el.value=value[el.dataset.pref];});
  }
  function set(patch,notify=true) {
    value=normalize({...value,...patch});apply();let saved=true;
    try {localStorage.setItem(key,JSON.stringify(value));} catch (_) {saved=false;}
    if(notify) window.dispatchEvent(new CustomEvent('appearancechange',{detail:{value:{...value},saved}}));
    return saved;
  }
  system?.addEventListener('change',apply);
  window.addEventListener('storage',e=>{if(e.key===key){try{value=normalize(JSON.parse(e.newValue||'{}'));apply();}catch(_){}}});
  document.addEventListener('DOMContentLoaded',()=>{apply();requestAnimationFrame(()=>document.documentElement.classList.add('ready'));});
  window.Preferences={get:()=>({...value}),set,reset:()=>set(defaults)};apply();
})();