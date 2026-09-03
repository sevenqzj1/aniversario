/* v3.5 — login local por usuário e senha para a versão estática. */
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-pref]').forEach(el=>el.addEventListener('change',()=>Preferences.set({[el.dataset.pref]:el.value})));
  const loginForm=document.querySelector('#login-form');
  const registerForm=document.querySelector('#register-form');
  const errorBox=document.querySelector('#auth-error');
  const note=document.querySelector('#auth-note');
  const showError=message=>{errorBox.textContent=message;errorBox.hidden=false;errorBox.focus();};
  const clearError=()=>{errorBox.hidden=true;errorBox.textContent='';};
  const setMode=mode=>{
    clearError();
    const create=mode==='register';
    loginForm.hidden=create;registerForm.hidden=!create;
    document.querySelector('#mode-login').classList.toggle('primary',!create);
    document.querySelector('#mode-register').classList.toggle('primary',create);
    note.textContent=create?'Crie uma conta local para separar seus clientes e cobranças neste navegador.':'Entre com o usuário e a senha criados neste navegador.';
    (create?registerForm:loginForm).querySelector('input')?.focus();
  };
  document.querySelector('#mode-login').addEventListener('click',()=>setMode('login'));
  document.querySelector('#mode-register').addEventListener('click',()=>setMode('register'));
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();clearError();const button=loginForm.querySelector('button[type=submit]');button.disabled=true;
    try{await Auth.login(loginForm.username.value,loginForm.password.value);location.href='./painel.html?v=35#dashboard';}
    catch(err){showError(err.message);}
    finally{button.disabled=false;}
  });
  registerForm.addEventListener('submit',async e=>{
    e.preventDefault();clearError();const button=registerForm.querySelector('button[type=submit]');button.disabled=true;
    try{
      if(registerForm.password.value!==registerForm.confirm.value)throw Error('As senhas não são iguais.');
      await Auth.register(registerForm.username.value,registerForm.password.value);location.href='./painel.html?v=35#dashboard';
    }catch(err){showError(err.message);}
    finally{button.disabled=false;}
  });
  const users=Auth.listUsers();
  if(users.length)document.querySelector('#known-users').textContent='Usuários neste navegador: '+users.join(', ');
  setMode('login');
  const params=new URLSearchParams(location.search);
  if(params.has('logout'))note.textContent='Sessão encerrada. Entre novamente para acessar o painel.';
  if(params.has('login'))showError('Faça login para acessar o painel.');
});