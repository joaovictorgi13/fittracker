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
  try {
    const resposta = await fetch('/api/evolucao');
    const dados = await resposta.json();
    return Array.isArray(dados) ? dados : [];
  } catch (err) {
    return [];
  }
}

// ============================================
// Configurar Registro Semanal
// ============================================

async function buscarSemanas() {
  try {
    const resposta = await fetch('/api/semanas');
    const dados = await resposta.json();
    return Array.isArray(dados) ? dados : [];
  } catch (err) {
    return [];
  }
}

let semanasGlobais = [];

function configurarRegistro() {
  const btnNovaSemana = document.getElementById('btn-nova-semana');
  if (btnNovaSemana) {
    btnNovaSemana.addEventListener('click', () => {
      // Cria virtualmente uma nova semana em memoria e re-renderiza
      let maxSem = 0;
      if (semanasGlobais.length > 0) {
        maxSem = semanasGlobais[0].numero_semana;
      }
      semanasGlobais.unshift({
        numero_semana: maxSem + 1,
        sessoes: []
      });
      renderizarSemanas();
    });
  }

  const modalClose = document.getElementById('modal-registro-close');
  const btnCancelar = document.getElementById('btn-cancelar-registro');
  const btnSalvar = document.getElementById('btn-salvar-registro');

  if (modalClose) modalClose.addEventListener('click', fecharModalRegistro);
  if (btnCancelar) btnCancelar.addEventListener('click', fecharModalRegistro);

  if (btnSalvar) {
    btnSalvar.addEventListener('click', async () => {
      const sem = document.getElementById('registro-semana-atual').value;
      const dia = document.getElementById('registro-dia-atual').value;
      const dataInput = document.getElementById('registro-data').value;
      
      const configDia = diasConfiguracoes.find(c => c.dia_semana === dia) || { is_descanso: 0 };

      const payload = {
        data: dataInput || new Date().toISOString().split('T')[0],
        dia_semana: dia,
        numero_semana: parseInt(sem),
        observacoes: '',
        series: []
      };

      if (configDia.is_descanso === 1) {
        // Apenas salva a sessao vazia (sem series) como marca de "done"
        payload.series = [];
      } else {
        const seriesElements = document.querySelectorAll('.reg-serie-row');
        seriesElements.forEach(el => {
          const carga = parseFloat(el.querySelector('.reg-carga').value) || 0;
          const reps = parseInt(el.querySelector('.reg-reps').value) || 0;
          const tipo = el.querySelector('.reg-tipo').value;
          const concluida = el.querySelector('.reg-concluida').checked;

          const pico_contracao = parseInt(el.dataset.pico) || 0;
          const pico_contracao_segundos = parseInt(el.dataset.picoSegundos) || 0;
          const ajuda = parseInt(el.dataset.ajuda) || 0;
          const notas = el.dataset.notas || '';
          let drops = [];
          try { drops = JSON.parse(el.dataset.drops || '[]'); } catch(e){}

          if (carga > 0 || reps > 0) {
            payload.series.push({
              exercicio_id: parseInt(el.dataset.exercicioId),
              nome_exercicio: el.dataset.nomeExercicio,
              numero_serie: parseInt(el.dataset.numeroSerie),
              carga_kg: carga,
              repeticoes: reps,
              tipo: tipo,
              concluida: concluida,
              pico_contracao,
              pico_contracao_segundos,
              ajuda,
              notas,
              dropset_detalhes: drops
            });
          }
        });

        if (payload.series.length === 0) {
          mostrarToast('Preencha pelo menos uma série.', 'error');
          return;
        }
      }

      const res = await registrarSessao(payload);
      if (res.erro) {
        mostrarToast(res.erro, 'error');
        return;
      }

      mostrarToast(configDia.is_descanso === 1 ? 'Descanso registrado!' : 'Treino registrado!', 'success');
      fecharModalRegistro();
      carregarTodasSemanas();
      carregarEvolucao();
    });
  }
}

async function carregarTodasSemanas() {
  semanasGlobais = await buscarSemanas();
  renderizarSemanas();
}

function renderizarSemanas() {
  const container = document.getElementById('semanas-container');
  if (!container) return;

  if (semanasGlobais.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📅</span>
        <p class="empty-text">Nenhuma semana iniciada.</p>
        <p class="empty-hint">Clique em "+ Nova Semana" para começar!</p>
      </div>`;
    return;
  }

  const diasOrdem = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const diasLabel = { segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb', domingo: 'Dom' };

  let html = '';
  for (const semana of semanasGlobais) {
    
    // Calcula completado
    let diasCompletos = 0;
    
    let diasHTML = '';
    for (const d of diasOrdem) {
      const config = diasConfiguracoes.find(c => c.dia_semana === d) || { nome_rotina: '', is_descanso: 0 };
      const sessaoSalva = semana.sessoes.find(s => s.dia_semana === d);
      const isConcluido = !!sessaoSalva;
      
      if (isConcluido) diasCompletos++;

      let classePilha = isConcluido ? 'border: 2px solid var(--cor-verde);' : 'border: 1px solid var(--cor-borda);';
      let icon = isConcluido ? '✅' : '⏳';
      
      let badge = '';
      if (config.is_descanso) {
        badge = '<span style="font-size: 0.7rem; background: rgba(var(--cor-vermelho-rgb),0.2); color: var(--cor-vermelho); padding: 2px 6px; border-radius: 4px;">Descanso</span>';
      } else if (config.nome_rotina) {
        badge = `<span style="font-size: 0.7rem; background: rgba(var(--cor-primaria-rgb),0.2); color: var(--cor-primaria); padding: 2px 6px; border-radius: 4px;">${config.nome_rotina}</span>`;
      }

      diasHTML += `
        <div onclick="abrirRegistroDia(${semana.numero_semana}, '${d}')" style="cursor:pointer; background: var(--cor-superficie); padding: 12px; border-radius: 8px; ${classePilha} flex: 1; min-width: 80px; text-align: center; display:flex; flex-direction:column; gap:4px; align-items:center;">
          <strong style="color: var(--cor-texto); text-transform: capitalize;">${diasLabel[d]}</strong>
          ${badge}
          <div style="font-size: 1.2rem; margin-top:5px;">${icon}</div>
        </div>
      `;
    }

    const semanaCompleta = diasCompletos === 7;

    html += `
      <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--cor-borda); padding: 15px; border-radius: 12px; margin-bottom: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3 style="margin:0; font-size: 1.1rem; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" onclick="return false;" style="width:20px;height:20px; accent-color:var(--cor-verde);" ${semanaCompleta ? 'checked' : ''}>
            Semana ${semana.numero_semana}
          </h3>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${diasHTML}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

async function abrirRegistroDia(numSemana, dia) {
  document.getElementById('modal-registro-dia').classList.remove('hidden');
  document.getElementById('registro-semana-atual').value = numSemana;
  document.getElementById('registro-dia-atual').value = dia;
  document.getElementById('registro-modal-titulo').textContent = `Semana ${numSemana} - ${dia.toUpperCase()}`;
  
  const dataInput = document.getElementById('registro-data');
  const containerEx = document.getElementById('register-exercises');
  const msgDescanso = document.getElementById('registro-dia-descanso-msg');

  // Checa se já tem dados salvos na memória local para essa semana
  const semanaDados = semanasGlobais.find(s => s.numero_semana === numSemana);
  const sessaoSalva = semanaDados ? semanaDados.sessoes.find(s => s.dia_semana === dia) : null;

  dataInput.value = sessaoSalva ? sessaoSalva.data : new Date().toISOString().split('T')[0];

  const configDia = diasConfiguracoes.find(c => c.dia_semana === dia) || { is_descanso: 0 };
  
  if (configDia.is_descanso === 1) {
    msgDescanso.classList.remove('hidden');
    containerEx.innerHTML = '';
    return;
  } else {
    msgDescanso.classList.add('hidden');
  }

  // Busca exercícios da base
  const exerciciosBase = await buscarExercicios(dia);

  if (exerciciosBase.length === 0) {
    containerEx.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p class="empty-text">Nenhum exercício na base.</p>
        <p class="empty-hint">Vá na aba "Meus Treinos" e adicione exercícios para este dia.</p>
      </div>`;
    return;
  }

  containerEx.innerHTML = exerciciosBase.map(ex => {
    // Para cada exercicio base, ver se tem algo feito na sessao
    let seriesRenderizar = ex.series;

    if (sessaoSalva) {
      // Se já tem salvo, mistura: pegamos os registros salvos pra esse id
      const salvos = sessaoSalva.series.filter(s => s.exercicio_id === ex.id);
      if (salvos.length > 0) {
        seriesRenderizar = salvos;
      }
    }

    if (seriesRenderizar.length === 0) {
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
              <th style="width:50px"></th>
            </tr>
          </thead>
          <tbody>
            ${seriesRenderizar.map(s => {
              // Ajustar checkbox caso já esteja salvo e concluído (banco usa concluida=1|0)
              const hasConcluida = s.concluida !== undefined ? s.concluida : 1; 
              
              return `
                <tr class="reg-serie-row" data-exercicio-id="${ex.id}" data-nome-exercicio="${ex.nome}" data-numero-serie="${s.numero_serie}"
                    data-pico="${s.pico_contracao||0}" data-pico-segundos="${s.pico_contracao_segundos||0}" 
                    data-ajuda="${s.ajuda||0}" data-notas="${(s.notas||'').replace(/"/g, '&quot;')}" 
                    data-drops='${typeof s.dropset_detalhes==="string"?s.dropset_detalhes:JSON.stringify(s.dropset_detalhes||[])}'>
                  <td>
                    <input type="checkbox" class="reg-concluida" ${hasConcluida ? 'checked' : ''} style="width:18px; height:18px; accent-color: var(--cor-primaria); cursor:pointer;">
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
                      <option value="piramide_crescente" ${s.tipo === 'piramide_crescente' ? 'selected' : ''}>P. Crescente</option>
                      <option value="piramide_decrescente" ${s.tipo === 'piramide_decrescente' ? 'selected' : ''}>P. Decrescente</option>
                    </select>
                  </td>
                  <td>
                    <input class="form-input-mini reg-carga" type="number" value="${s.carga_kg}" min="0" step="0.5">
                  </td>
                  <td>
                    <input class="form-input-mini reg-reps" type="number" value="${s.repeticoes}" min="0">
                  </td>
                  <td>
                    <button class="btn btn-outline btn-icon btn-tiny" onclick="abrirModalAvancadoRegistro(this)" title="Configurações Avançadas" type="button">⚙️</button>
                  </td>
                </tr>
              `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

function fecharModalRegistro() {
  document.getElementById('modal-registro-dia').classList.add('hidden');
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
// Modal Registro
// ============================================
window.abrirModalAvancadoRegistro = function(btn) {
  const row = btn.closest('tr');
  const tipo = row.querySelector('.reg-tipo').value;
  
  configuracaoAvancadaAtual = { rowElement: row };

  document.getElementById('avancado-serie-id').value = row.dataset.numeroSerie;
  document.getElementById('avancado-contexto').value = 'registro';
  
  document.getElementById('avancado-pico-checkbox').checked = row.dataset.pico == '1';
  document.getElementById('avancado-pico-segundos').value = row.dataset.picoSegundos || 2;
  document.getElementById('avancado-pico-segundos-container').style.display = row.dataset.pico == '1' ? 'flex' : 'none';

  document.getElementById('avancado-ajuda-checkbox').checked = row.dataset.ajuda == '1';
  document.getElementById('avancado-notas').value = row.dataset.notas || '';

  const dropsetSection = document.getElementById('avancado-dropset-section');
  if (tipo === 'dropset') {
    dropsetSection.classList.remove('hidden');
    let drops = [];
    try { drops = JSON.parse(row.dataset.drops || '[]'); } catch(e){}
    renderizarListaDrops(drops); // Depende de exercises.js, deve estar acessível via global
  } else {
    dropsetSection.classList.add('hidden');
  }

  document.getElementById('modal-avancado-overlay').classList.remove('hidden');
};
