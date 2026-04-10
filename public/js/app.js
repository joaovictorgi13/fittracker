// ============================================
// app.js — Lógica Principal da Aplicação
// Controla navegação, inicialização e toasts
// ============================================

// ============================================
// Inicialização da Aplicação
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar se o usuário está logado
  const usuario = await buscarUsuario();

  if (usuario) {
    // Usuário logado — mostrar aplicação
    mostrarAplicacao(usuario);
  } else {
    // Não logado — mostrar tela de login
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('app-wrapper').classList.add('hidden');
  }

  // Configurar autenticação
  configurarAuth();
});

// ============================================
// Mostrar Aplicação (após login)
// ============================================

function mostrarAplicacao(usuario) {
  try {
    // Esconder login e mostrar app
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('hidden');

    // Atualizar nome e avatar
    document.getElementById('user-name').textContent = usuario.nome;
    document.getElementById('user-avatar').textContent = usuario.nome.charAt(0).toUpperCase();

    // Configurar tudo
    configurarNavegacao();
    configurarExercicios();
    configurarRegistro();

    // Carregar dados iniciais
    carregarTodasConfigs().then(() => {
      renderizarExercicios();
    }).catch(e => console.error("Error carregarTodasConfigs:", e));
    
    carregarTodasSemanas().catch(e => console.error("Error carregarTodasSemanas:", e));
    carregarEvolucao().catch(e => console.error("Error carregarEvolucao:", e));
  } catch (err) {
    console.error("FATAL ERROR in mostrarAplicacao:", err);
    alert("Erro crítico no frontend. Tire um print e envie ao desenvolvedor: " + err.stack);
  }
}

// ============================================
// Navegação por Abas
// ============================================

function configurarNavegacao() {
  const navBtns = document.querySelectorAll('.app-nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabAlvo = btn.dataset.tab;

      // Atualizar botões ativos
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Mostrar conteúdo da aba
      tabContents.forEach(tab => tab.classList.remove('active'));
      document.getElementById(`tab-${tabAlvo}`).classList.add('active');

      // Fechar menu mobile se aberto
      document.getElementById('app-nav').classList.remove('active');
      document.getElementById('app-menu-toggle').classList.remove('active');

      // Recarregar dados quando trocar de aba
      if (tabAlvo === 'evolucao') carregarEvolucao();
      if (tabAlvo === 'registrar') {
        carregarTodasSemanas();
      }
    });
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await logout();
    window.location.reload();
  });

  // Menu mobile
  const menuToggle = document.getElementById('app-menu-toggle');
  const appNav = document.getElementById('app-nav');

  menuToggle.addEventListener('click', () => {
    appNav.classList.toggle('active');
    menuToggle.classList.toggle('active');
  });
}

// ============================================
// Sistema de Toast (Notificações)
// ============================================

function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container');

  const icones = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span>${icones[tipo]}</span> ${mensagem}`;

  container.appendChild(toast);

  // Remover após 4 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
