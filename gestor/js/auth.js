/* v3.5 — autenticação local para a versão estática do GitHub Pages.
   Não substitui autenticação de servidor. Contas, sessão e dados existem apenas neste navegador. */
(function(){
  'use strict';
  const ACCOUNTS_KEY='gestor.auth.accounts.v1';
  const SESSION_KEY='gestor.auth.session.v1';
  const LEGACY_STATE='gestor.demo.state.v1';
  const USER_STATE_PREFIX='gestor.demo.state.v2.';
  const rawGet=Storage.prototype.getItem;
  const rawSet=Storage.prototype.setItem;
  const rawRemove=Storage.prototype.removeItem;

  const normalize=u=>String(u||'').trim().toLowerCase();
  const accounts=()=>{try{return JSON.parse(rawGet.call(localStorage,ACCOUNTS_KEY)||'{}')||{};}catch(_){return {};}};
  const saveAccounts=v=>rawSet.call(localStorage,ACCOUNTS_KEY,JSON.stringify(v));
  const current=()=>normalize(rawGet.call(sessionStorage,SESSION_KEY)||'');
  const stateKey=u=>USER_STATE_PREFIX+encodeURIComponent(normalize(u||current()));
  const bytesToB64=bytes=>btoa(String.fromCharCode(...bytes));
  const randomSalt=()=>{const b=new Uint8Array(16);crypto.getRandomValues(b);return bytesToB64(b);};
  async function digest(password,salt){
    if(!crypto?.subtle)throw Error('Este navegador não oferece o recurso necessário para proteger a senha localmente.');
    const data=new TextEncoder().encode(salt+'|'+password);
    const hash=await crypto.subtle.digest('SHA-256',data);
    return bytesToB64(new Uint8Array(hash));
  }
  function migrateLegacy(user){
    try{
      const target=stateKey(user);
      if(!rawGet.call(localStorage,target)){
        const legacy=rawGet.call(localStorage,LEGACY_STATE);
        if(legacy){rawSet.call(localStorage,target,legacy);rawRemove.call(localStorage,LEGACY_STATE);}
      }
    }catch(_){}
  }
  function setSession(user){const id=normalize(user);rawSet.call(sessionStorage,SESSION_KEY,id);migrateLegacy(id);return id;}
  async function register(username,password){
    const id=normalize(username);
    if(!/^[a-z0-9._-]{3,24}$/.test(id))throw Error('Use de 3 a 24 caracteres no usuário: letras, números, ponto, hífen ou underline.');
    if(String(password).length<6)throw Error('A senha precisa ter pelo menos 6 caracteres.');
    const list=accounts();if(list[id])throw Error('Esse usuário já existe neste navegador.');
    const salt=randomSalt();
    list[id]={username:id,salt,hash:await digest(password,salt),createdAt:new Date().toISOString()};
    saveAccounts(list);setSession(id);return id;
  }
  async function login(username,password){
    const id=normalize(username),item=accounts()[id];
    if(!item)throw Error('Usuário ou senha inválidos.');
    const hash=await digest(password,item.salt);
    if(hash!==item.hash)throw Error('Usuário ou senha inválidos.');
    setSession(id);return id;
  }
  function logout(){rawRemove.call(sessionStorage,SESSION_KEY);}
  function requireAuth(){const id=current();if(!id){location.replace('./index.html?login=1');return false;}migrateLegacy(id);return true;}
  function listUsers(){return Object.keys(accounts()).sort();}

  try{
    Storage.prototype.getItem=function(key){if(this===localStorage&&key===LEGACY_STATE&&current())key=stateKey();return rawGet.call(this,key);};
    Storage.prototype.setItem=function(key,value){if(this===localStorage&&key===LEGACY_STATE&&current())key=stateKey();return rawSet.call(this,key,value);};
    Storage.prototype.removeItem=function(key){if(this===localStorage&&key===LEGACY_STATE&&current())key=stateKey();return rawRemove.call(this,key);};
  }catch(_){}

  window.Auth={register,login,logout,current,require:requireAuth,listUsers,stateKey};

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-action="logout"]');
    if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();logout();location.href='./index.html?logout=1';
  },true);

  const script=document.currentScript;
  if(script?.hasAttribute('data-guard'))requireAuth();

  document.addEventListener('DOMContentLoaded',()=>{
    const updateLabels=()=>{
      const footer=document.querySelector('.app-footer span:last-child');
      if(footer&&footer.textContent.includes('Versão 3.4'))footer.textContent='Versão 3.5 · Dados separados por usuário neste navegador';
      const small=document.querySelector('.sidebar-bottom small');
      if(small&&current()&&!small.dataset.authUser){small.textContent='Usuário: '+current();small.dataset.authUser='1';}
    };
    updateLabels();
    const observer=new MutationObserver(updateLabels);
    observer.observe(document.body,{childList:true,subtree:true});
  });
})();