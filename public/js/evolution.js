// ============================================
// evolution.js — Registro, Evolução e Histórico
// Gráficos com Chart.js + séries individuais
// ============================================

let graficoAtual = null;

// ============================================
// API Functions
// ============================================

async function registrarSessao(dados) {
  const resposta = await fetch('/api/sessoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return await resposta.json();
}

async function buscarSessoes() {
  const resposta = await fetch('/api/sessoes');
  return await resposta.json();
}

async function buscarEvolucao() {
  const resposta = await fetch('/api/evolucao');
  return await resposta.json();
}

// ============================================
// Configurar Registro de Treino
// ============================================

function configurarRegistro() {
  const selectDia = document.getElementById('registro-dia');
  const dataInput = document.getElementById('registro-data');

  // Data de hoje
  const hoje = new Date().toISOString().split('T')[0];
  dataInput.value = hoje;

  // Detectar dia da semana
  const diasMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const diaSemana = diasMap[new Date().getDay()];
  selectDia.value = diaSemana;

  selectDia.addEventListener('change', () => carregarExerciciosRegistro(selectDia.value));

  dataInput.addEventListener('change', () => {
    const data = new Date(dataInput.value + 'T12:00:00');
    const dia = diasMap[data.getDay()];
    selectDia.value = dia;
    carregarExerciciosRegistro(dia);
  });

  carregarExerciciosRegistro(diaSemana);

  // Botão registrar
  document.getElementById('btn-registrar-treino').addEventListener('click', async () => {
    const data = dataInput.value;
    if (!data) {
      mostrarToast('Selecione a data do treino.', 'error');
      return;
    }

    const dia = selectDia.value;

    // Coletar todas as séries da interface
    const seriesElements = document.querySelectorAll('.reg-serie-row');
    const series = [];

    seriesElements.forEach(el => {
      const carga = parseFloat(el.querySelector('.reg-carga').value) || 0;
      const reps = parseInt(el.querySelector('.reg-reps').value) || 0;
      const tipo = el.querySelector('.reg-tipo').value;
      const concluida = el.querySelector('.reg-concluida').checked;

      if (carga > 0 || reps > 0) {
        series.push({
          exercicio_id: parseInt(el.dataset.exercicioId),
          nome_exercicio: el.dataset.nomeExercicio,
          numero_serie: parseInt(el.dataset.numeroSerie),
          carga_kg: carga,
          repeticoes: reps,
          tipo: tipo,
          concluida: concluida
        });
      }
    });

    if (series.length === 0) {
      mostrarToast('Preencha pelo menos uma série.', 'error');
      return;
    }

    const resultado = await registrarSessao({ data, dia_semana: dia, series });

    if (resultado.erro) {
      mostrarToast(resultado.erro, 'error');
      return;
    }

    mostrarToast(`Treino registrado com ${series.length} séries!`, 'success');
    carregarEvolucao();
    carregarHistorico();
  });
}

// Carregar exercícios do dia para tela de registro
async function carregarExerciciosRegistro(dia) {
  const container = document.getElementById('register-exercises');
  const exercicios = await buscarExercicios(dia);

  if (exercicios.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p class="empty-text">Nenhum exercício para este dia.</p>
        <p class="empty-hint">Vá até "Meus Treinos" para montar seu treino.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = exercicios.map(ex => {
    if (ex.series.length === 0) {
      return `
        <div class="register-exercise-card">
          <div class="register-exercise-header">${ex.nome}</div>
          <div style="padding: 16px; text-align: center; color: var(--cor-texto-terciario); font-size: 0.85rem;">
            Nenhuma série configurada. Configure em "Meus Treinos".
          </div>
        </div>
      `;
    }

    return `
      <div class="register-exercise-card">
        <div class="register-exercise-header">${ex.nome}</div>
        <table class="register-series-table">
          <thead>
            <tr>
              <th style="width:40px">✓</th>
              <th style="width:45px">Série</th>
              <th>Tipo</th>
              <th>Carga (kg)</th>
              <th>Reps</th>
            </tr>
          </thead>
          <tbody>
            ${ex.series.map(s => `
              <tr class="reg-serie-row" data-exercicio-id="${ex.id}" data-nome-exercicio="${ex.nome}" data-numero-serie="${s.numero_serie}">
                <td>
                  <input type="checkbox" class="reg-concluida" checked style="width:18px; height:18px; accent-color: var(--cor-primaria); cursor:pointer;">
                </td>
                <td>
                  <span class="series-number ${badgeClasse(s.tipo)}">${s.numero_serie}</span>
                </td>
                <td>
                  <select class="form-select-mini reg-tipo">
                    <option value="valida" ${s.tipo === 'valida' ? 'selected' : ''}>Válida</option>
                    <option value="aquecimento" ${s.tipo === 'aquecimento' ? 'selected' : ''}>Aquecimento</option>
                    <option value="dropset" ${s.tipo === 'dropset' ? 'selected' : ''}>Dropset</option>
                    <option value="cluster" ${s.tipo === 'cluster' ? 'selected' : ''}>Cluster</option>
                  </select>
                </td>
                <td>
                  <input class="form-input-mini reg-carga" type="number" value="${s.carga_kg}" min="0" step="0.5">
                </td>
                <td>
                  <input class="form-input-mini reg-reps" type="number" value="${s.repeticoes}" min="0">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

// ============================================
// Gráficos de Evolução
// ============================================

async function carregarEvolucao() {
  const selectExercicio = document.getElementById('evolucao-exercicio');
  const evolucao = await buscarEvolucao();

  // Guardar valor selecionado
  const valorAnterior = selectExercicio.value;

  selectExercicio.innerHTML = '<option value="">-- Selecione --</option>';
  evolucao.forEach(item => {
    const option = document.createElement('option');
    option.value = item.exercicio;
    option.textContent = item.exercicio;
    selectExercicio.appendChild(option);
  });

  // Restaurar seleção ou selecionar primeiro
  if (valorAnterior && evolucao.find(e => e.exercicio === valorAnterior)) {
    selectExercicio.value = valorAnterior;
    const dados = evolucao.find(e => e.exercicio === valorAnterior);
    renderizarGrafico(dados);
    renderizarResumo(dados);
  } else if (evolucao.length > 0) {
    selectExercicio.value = evolucao[0].exercicio;
    renderizarGrafico(evolucao[0]);
    renderizarResumo(evolucao[0]);
  }

  // Remover listeners antigos clonando o elemento
  const novoSelect = selectExercicio.cloneNode(true);
  selectExercicio.parentNode.replaceChild(novoSelect, selectExercicio);

  novoSelect.addEventListener('change', () => {
    const dados = evolucao.find(e => e.exercicio === novoSelect.value);
    if (dados) {
      renderizarGrafico(dados);
      renderizarResumo(dados);
    }
  });
}

function renderizarGrafico(dados) {
  const canvas = document.getElementById('evolution-chart');
  const ctx = canvas.getContext('2d');

  if (graficoAtual) graficoAtual.destroy();

  const labels = dados.sessoes.map(s => {
    const data = new Date(s.data + 'T12:00:00');
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  });

  const cargaMaxima = dados.sessoes.map(s => s.carga_maxima);
  const volumeTotal = dados.sessoes.map(s => s.volume_total);
  const repsTotal = dados.sessoes.map(s => s.reps_total);

  graficoAtual = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Carga Máxima (kg)',
          data: cargaMaxima,
          borderColor: '#00E676',
          backgroundColor: 'rgba(0, 230, 118, 0.1)',
          borderWidth: 3, tension: 0.4, fill: true,
          pointBackgroundColor: '#00E676', pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 8,
          yAxisID: 'y',
        },
        {
          label: 'Volume Total (kg×reps)',
          data: volumeTotal,
          borderColor: '#448aff',
          backgroundColor: 'rgba(68, 138, 255, 0.08)',
          borderWidth: 2, tension: 0.4, fill: true,
          pointBackgroundColor: '#448aff', pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7,
          yAxisID: 'y1',
        },
        {
          label: 'Repetições Totais',
          data: repsTotal,
          borderColor: '#b388ff',
          backgroundColor: 'rgba(179, 136, 255, 0.08)',
          borderWidth: 2, tension: 0.4, borderDash: [5, 5],
          pointBackgroundColor: '#b388ff', pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7,
          yAxisID: 'y',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#8a8a9a', font: { family: 'Inter', size: 12 }, usePointStyle: true, pointStyle: 'circle' }
        },
        tooltip: {
          backgroundColor: 'rgba(17,17,24,0.95)', titleColor: '#fff', bodyColor: '#8a8a9a',
          borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, cornerRadius: 10, padding: 14,
          titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' },
        }
      },
      scales: {
        x: { ticks: { color: '#5a5a6a', font: { family: 'Inter', size: 12 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { position: 'left', ticks: { color: '#5a5a6a', font: { family: 'Inter', size: 12 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y1: { position: 'right', ticks: { color: '#448aff', font: { family: 'Inter', size: 12 } }, grid: { drawOnChartArea: false } }
      },
      interaction: { intersect: false, mode: 'index' }
    }
  });
}

function renderizarResumo(dados) {
  const container = document.getElementById('evolution-summary');
  const sessoes = dados.sessoes;

  if (sessoes.length === 0) {
    container.innerHTML = '<p class="empty-text">Nenhum registro encontrado.</p>';
    return;
  }

  const primeira = sessoes[0];
  const ultima = sessoes[sessoes.length - 1];
  const difCarga = ultima.carga_maxima - primeira.carga_maxima;
  const difVolume = ultima.volume_total - primeira.volume_total;
  const maiorCarga = Math.max(...sessoes.map(s => s.carga_maxima));
  const maiorVolume = Math.max(...sessoes.map(s => s.volume_total));

  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Evolução de Carga</div>
      <div class="summary-value ${difCarga >= 0 ? 'positive' : 'negative'}">
        ${difCarga >= 0 ? '+' : ''}${difCarga.toFixed(1)}kg
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Evolução de Volume</div>
      <div class="summary-value ${difVolume >= 0 ? 'positive' : 'negative'}">
        ${difVolume >= 0 ? '+' : ''}${difVolume.toFixed(0)}
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Maior Carga</div>
      <div class="summary-value neutral">${maiorCarga}kg</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Maior Volume</div>
      <div class="summary-value neutral">${maiorVolume}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Sessões Registradas</div>
      <div class="summary-value neutral">${sessoes.length}</div>
    </div>
  `;
}

// ============================================
// Histórico de Treinos
// ============================================

async function carregarHistorico() {
  const container = document.getElementById('history-list');
  const emptyState = document.getElementById('empty-history');
  const sessoes = await buscarSessoes();

  if (sessoes.length === 0) {
    emptyState.classList.remove('hidden');
    container.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = sessoes.map(sessao => {
    const dataFormatada = new Date(sessao.data + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    // Agrupar séries por exercício
    const porExercicio = {};
    sessao.series.forEach(s => {
      if (!porExercicio[s.nome_exercicio]) porExercicio[s.nome_exercicio] = [];
      porExercicio[s.nome_exercicio].push(s);
    });

    return `
      <div class="history-card">
        <div class="history-card-header">
          <span class="history-date">${dataFormatada}</span>
        </div>
        ${Object.entries(porExercicio).map(([nome, series]) => `
          <div class="history-exercise-group">
            <div class="history-exercise-title">${nome}</div>
            <div class="history-series-list">
              ${series.map(s => `
                <div class="history-series-row">
                  <span class="series-number ${badgeClasse(s.tipo)}" style="width:24px;height:24px;font-size:0.7rem;">${s.numero_serie}</span>
                  <span class="tipo-badge ${badgeClasse(s.tipo)}">${nomeTipo(s.tipo)}</span>
                  <span>⚡ ${s.carga_kg}kg</span>
                  <span>× ${s.repeticoes} reps</span>
                  ${!s.concluida ? '<span style="color:var(--cor-vermelho);">❌ Não concluída</span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}
