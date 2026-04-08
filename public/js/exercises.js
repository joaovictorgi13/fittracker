// ============================================
// exercises.js — CRUD de Exercícios com Séries
// Cada exercício tem séries individuais com
// carga, repetições e tipo diferente
// ============================================

let diaAtual = 'segunda';

// ============================================
// Funções da API
// ============================================

async function buscarExercicios(dia) {
  const resposta = await fetch(`/api/exercicios/${dia}`);
  return await resposta.json();
}

async function buscarTodosExercicios() {
  const resposta = await fetch('/api/exercicios');
  return await resposta.json();
}

async function adicionarExercicio(dados) {
  const resposta = await fetch('/api/exercicios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return await resposta.json();
}

async function editarExercicio(id, dados) {
  const resposta = await fetch(`/api/exercicios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return await resposta.json();
}

async function excluirExercicio(id) {
  const resposta = await fetch(`/api/exercicios/${id}`, { method: 'DELETE' });
  return await resposta.json();
}

// Séries
async function adicionarSerie(dados) {
  const resposta = await fetch('/api/series', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return await resposta.json();
}

async function editarSerie(id, dados) {
  const resposta = await fetch(`/api/series/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return await resposta.json();
}

async function excluirSerie(id) {
  const resposta = await fetch(`/api/series/${id}`, { method: 'DELETE' });
  return await resposta.json();
}

// ============================================
// Nome legível do tipo de série
// ============================================

function nomeTipo(tipo) {
  const nomes = {
    'valida': 'Válida',
    'aquecimento': 'Aquecimento',
    'dropset': 'Dropset',
    'cluster': 'Cluster Set'
  };
  return nomes[tipo] || tipo;
}

function badgeClasse(tipo) {
  return `badge-${tipo}`;
}

function letraTipo(tipo) {
  const letras = { 'valida': 'V', 'aquecimento': 'A', 'dropset': 'D', 'cluster': 'C' };
  return letras[tipo] || '?';
}

// ============================================
// Renderizar Lista de Exercícios com Séries
// ============================================

async function renderizarExercicios() {
  const lista = document.getElementById('exercises-list');
  const exercicios = await buscarExercicios(diaAtual);

  if (exercicios.length === 0) {
    lista.innerHTML = `
      <div class="empty-state" id="empty-exercises">
        <span class="empty-icon">🏋️</span>
        <p class="empty-text">Nenhum exercício cadastrado para este dia.</p>
        <p class="empty-hint">Digite o nome acima e clique em "Adicionar Exercício".</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = exercicios.map(ex => `
    <div class="exercise-card" data-id="${ex.id}">
      <div class="exercise-card-header">
        <span class="exercise-card-name">${ex.nome}</span>
        <div class="exercise-card-actions">
          <button class="btn btn-outline btn-icon" onclick="abrirModalEditar(${ex.id}, '${ex.nome.replace(/'/g, "\\'")}')" title="Editar nome">✏️</button>
          <button class="btn btn-danger btn-icon" onclick="confirmarExclusao(${ex.id}, '${ex.nome.replace(/'/g, "\\'")}')" title="Excluir exercício">🗑️</button>
        </div>
      </div>

      ${ex.series.length > 0 ? `
        <table class="series-table">
          <thead>
            <tr>
              <th style="width:50px">Série</th>
              <th>Tipo</th>
              <th>Carga (kg)</th>
              <th>Reps</th>
              <th>Descanso</th>
              <th style="width:70px">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${ex.series.map(s => `
              <tr data-serie-id="${s.id}">
                <td>
                  <span class="series-number ${badgeClasse(s.tipo)}">${s.numero_serie}</span>
                </td>
                <td>
                  <select class="form-select-mini" onchange="atualizarSerie(${s.id}, 'tipo', this.value)">
                    <option value="valida" ${s.tipo === 'valida' ? 'selected' : ''}>Válida</option>
                    <option value="aquecimento" ${s.tipo === 'aquecimento' ? 'selected' : ''}>Aquecimento</option>
                    <option value="dropset" ${s.tipo === 'dropset' ? 'selected' : ''}>Dropset</option>
                    <option value="cluster" ${s.tipo === 'cluster' ? 'selected' : ''}>Cluster Set</option>
                  </select>
                </td>
                <td>
                  <input class="form-input-mini" type="number" value="${s.carga_kg}" min="0" step="0.5"
                    onchange="atualizarSerie(${s.id}, 'carga_kg', parseFloat(this.value) || 0)">
                </td>
                <td>
                  <input class="form-input-mini" type="number" value="${s.repeticoes}" min="0"
                    onchange="atualizarSerie(${s.id}, 'repeticoes', parseInt(this.value) || 0)">
                </td>
                <td>
                  <input class="form-input-mini" type="number" value="${s.descanso_segundos}" min="0" step="5"
                    onchange="atualizarSerie(${s.id}, 'descanso_segundos', parseInt(this.value) || 0)"> s
                </td>
                <td>
                  <button class="btn btn-danger btn-icon btn-tiny" onclick="removerSerie(${s.id})" title="Remover série">✕</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div style="padding: 20px; text-align: center; color: var(--cor-texto-terciario); font-size: 0.85rem;">
          Nenhuma série adicionada. Clique abaixo para adicionar.
        </div>
      `}

      <div class="add-series-row">
        <button class="btn btn-outline btn-small" onclick="adicionarNovaSerie(${ex.id})">
          + Adicionar Série
        </button>
      </div>
    </div>
  `).join('');
}

// ============================================
// Ações de Séries
// ============================================

// Adicionar nova série a um exercício
async function adicionarNovaSerie(exercicioId) {
  // Pegar a última série para copiar os valores
  const exercicios = await buscarExercicios(diaAtual);
  const exercicio = exercicios.find(e => e.id === exercicioId);
  
  let defaults = { carga_kg: 0, repeticoes: 12, tipo: 'valida', descanso_segundos: 60 };
  
  if (exercicio && exercicio.series.length > 0) {
    const ultima = exercicio.series[exercicio.series.length - 1];
    defaults = {
      carga_kg: ultima.carga_kg,
      repeticoes: ultima.repeticoes,
      tipo: ultima.tipo,
      descanso_segundos: ultima.descanso_segundos
    };
  }

  await adicionarSerie({
    exercicio_id: exercicioId,
    ...defaults
  });

  renderizarExercicios();
}

// Atualizar campo de uma série
async function atualizarSerie(serieId, campo, valor) {
  const dados = {};
  dados[campo] = valor;
  await editarSerie(serieId, dados);
  
  // Se mudou o tipo, re-renderizar para atualizar o badge
  if (campo === 'tipo') {
    renderizarExercicios();
  }
}

// Remover uma série
async function removerSerie(serieId) {
  await excluirSerie(serieId);
  renderizarExercicios();
}

// ============================================
// Configurar Eventos
// ============================================

function configurarExercicios() {
  // Tabs dos dias da semana
  const dayTabs = document.querySelectorAll('.day-tab');
  dayTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dayTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      diaAtual = tab.dataset.dia;
      renderizarExercicios();
    });
  });

  // Botão de adicionar exercício
  document.getElementById('btn-adicionar-exercicio').addEventListener('click', async () => {
    const nome = document.getElementById('exercicio-nome').value.trim();

    if (!nome) {
      mostrarToast('Digite o nome do exercício.', 'error');
      return;
    }

    const resultado = await adicionarExercicio({ nome, dia_semana: diaAtual });

    if (resultado.erro) {
      mostrarToast(resultado.erro, 'error');
      return;
    }

    document.getElementById('exercicio-nome').value = '';
    mostrarToast(`"${nome}" adicionado!`, 'success');
    renderizarExercicios();
  });

  // Enter para adicionar
  document.getElementById('exercicio-nome').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-adicionar-exercicio').click();
  });

  configurarModalEdicao();
}

// ============================================
// Modal de Edição (nome do exercício)
// ============================================

function abrirModalEditar(id, nome) {
  document.getElementById('editar-id').value = id;
  document.getElementById('editar-nome').value = nome;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function configurarModalEdicao() {
  document.getElementById('modal-close').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-edicao').addEventListener('click', fecharModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') fecharModal();
  });

  document.getElementById('btn-salvar-edicao').addEventListener('click', async () => {
    const id = document.getElementById('editar-id').value;
    const nome = document.getElementById('editar-nome').value.trim();

    if (!nome) {
      mostrarToast('O nome é obrigatório.', 'error');
      return;
    }

    await editarExercicio(id, { nome });
    fecharModal();
    mostrarToast(`Exercício renomeado para "${nome}"!`, 'success');
    renderizarExercicios();
  });
}

// ============================================
// Excluir Exercício
// ============================================

async function confirmarExclusao(id, nome) {
  if (!confirm(`Excluir "${nome}" e todas as suas séries?`)) return;
  await excluirExercicio(id);
  mostrarToast(`"${nome}" excluído!`, 'success');
  renderizarExercicios();
}
