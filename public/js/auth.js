// ============================================
// auth.js — Sistema de Autenticação (Frontend)
// Gerencia login, cadastro e sessão do usuário
// ============================================

// ============================================
// Funções de Autenticação
// ============================================

// Fazer cadastro de novo usuário
async function cadastrar(nome, email, senha) {
  const resposta = await fetch('/api/cadastro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha })
  });
  return await resposta.json();
}

// Fazer login
async function login(email, senha) {
  const resposta = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  return await resposta.json();
}

// Fazer logout
async function logout() {
  await fetch('/api/logout', { method: 'POST' });
}

// Buscar dados do usuário logado
async function buscarUsuario() {
  const resposta = await fetch('/api/usuario');
  if (resposta.status === 401) return null;
  return await resposta.json();
}

// ============================================
// Configurar Eventos de Login/Cadastro
// ============================================

function configurarAuth() {
  const formLogin = document.getElementById('form-login');
  const formCadastro = document.getElementById('form-cadastro');
  const linkParaCadastro = document.getElementById('link-para-cadastro');
  const linkParaLogin = document.getElementById('link-para-login');
  const btnLogin = document.getElementById('btn-login');
  const btnCadastro = document.getElementById('btn-cadastro');
  const loginErro = document.getElementById('login-erro');
  const cadastroErro = document.getElementById('cadastro-erro');

  // Alternar entre login e cadastro
  linkParaCadastro.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.classList.add('hidden');
    formCadastro.classList.remove('hidden');
  });

  linkParaLogin.addEventListener('click', (e) => {
    e.preventDefault();
    formCadastro.classList.add('hidden');
    formLogin.classList.remove('hidden');
  });

  // Se a URL tem #cadastro, mostrar formulário de cadastro
  if (window.location.hash === '#cadastro') {
    formLogin.classList.add('hidden');
    formCadastro.classList.remove('hidden');
  }

  // Botão de login
  btnLogin.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    loginErro.textContent = '';

    if (!email || !senha) {
      loginErro.textContent = 'Preencha todos os campos.';
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';

    const resultado = await login(email, senha);

    if (resultado.erro) {
      loginErro.textContent = resultado.erro;
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
      return;
    }

    // Login bem-sucedido — mostrar aplicação
    mostrarAplicacao(resultado.usuario);
  });

  // Botão de cadastro
  btnCadastro.addEventListener('click', async () => {
    const nome = document.getElementById('cadastro-nome').value.trim();
    const email = document.getElementById('cadastro-email').value.trim();
    const senha = document.getElementById('cadastro-senha').value;

    cadastroErro.textContent = '';

    if (!nome || !email || !senha) {
      cadastroErro.textContent = 'Preencha todos os campos.';
      return;
    }

    if (senha.length < 6) {
      cadastroErro.textContent = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    btnCadastro.disabled = true;
    btnCadastro.textContent = 'Criando conta...';

    const resultado = await cadastrar(nome, email, senha);

    if (resultado.erro) {
      cadastroErro.textContent = resultado.erro;
      btnCadastro.disabled = false;
      btnCadastro.textContent = 'Criar Conta';
      return;
    }

    // Cadastro bem-sucedido — mostrar aplicação
    mostrarAplicacao(resultado.usuario);
  });

  // Enter para submeter formulários
  document.getElementById('login-senha').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });

  document.getElementById('cadastro-senha').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnCadastro.click();
  });
}
