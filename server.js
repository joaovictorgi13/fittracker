// ============================================
// server.js — Servidor Principal da Aplicação
// Express + PostgreSQL + Autenticação
// ============================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');

const app = express();
const PORTA = process.env.PORT || 3000;

// ============================================
// Middlewares
// ============================================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'chave-secreta-treinos-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: false
  }
}));

// Verificar login
function verificarLogin(req, res, next) {
  if (req.session.usuarioId) return next();
  res.status(401).json({ erro: 'Você precisa estar logado.' });
}

// ============================================
// AUTENTICAÇÃO
// ============================================

app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
    if (senha.length < 6) return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });

    const existe = await db.get('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe) return res.status(400).json({ erro: 'Este email já está cadastrado.' });

    const senhaHash = bcrypt.hashSync(senha, 10);
    const resultado = await db.get(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id',
      [nome, email, senhaHash]
    );

    req.session.usuarioId = resultado.id;
    req.session.usuarioNome = nome;
    res.json({ sucesso: true, usuario: { id: resultado.id, nome, email } });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Preencha email e senha.' });

    const usuario = await db.get('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (!usuario) return res.status(400).json({ erro: 'Email ou senha incorretos.' });
    if (!bcrypt.compareSync(senha, usuario.senha_hash)) return res.status(400).json({ erro: 'Email ou senha incorretos.' });

    req.session.usuarioId = usuario.id;
    req.session.usuarioNome = usuario.nome;
    res.json({ sucesso: true, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ sucesso: true });
});

app.get('/api/usuario', verificarLogin, async (req, res) => {
  const usuario = await db.get('SELECT id, nome, email FROM usuarios WHERE id = $1', [req.session.usuarioId]);
  res.json(usuario);
});

// ============================================
// EXERCÍCIOS
// ============================================

app.get('/api/exercicios/:dia', verificarLogin, async (req, res) => {
  try {
    const exercicios = await db.all(
      'SELECT * FROM exercicios WHERE usuario_id = $1 AND dia_semana = $2 ORDER BY ordem, id',
      [req.session.usuarioId, req.params.dia]
    );

    const resultado = [];
    for (const ex of exercicios) {
      const series = await db.all(
        'SELECT * FROM series_modelo WHERE exercicio_id = $1 ORDER BY numero_serie', [ex.id]
      );
      resultado.push({ ...ex, series });
    }
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao buscar exercícios:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.get('/api/exercicios', verificarLogin, async (req, res) => {
  try {
    const exercicios = await db.all(
      'SELECT * FROM exercicios WHERE usuario_id = $1 ORDER BY dia_semana, ordem, id',
      [req.session.usuarioId]
    );
    const resultado = [];
    for (const ex of exercicios) {
      const series = await db.all(
        'SELECT * FROM series_modelo WHERE exercicio_id = $1 ORDER BY numero_serie', [ex.id]
      );
      resultado.push({ ...ex, series });
    }
    res.json(resultado);
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.post('/api/exercicios', verificarLogin, async (req, res) => {
  try {
    const { nome, dia_semana } = req.body;
    if (!nome || !dia_semana) return res.status(400).json({ erro: 'Nome e dia são obrigatórios.' });

    const maxOrdem = await db.get(
      'SELECT COALESCE(MAX(ordem), 0) as max FROM exercicios WHERE usuario_id = $1 AND dia_semana = $2',
      [req.session.usuarioId, dia_semana]
    );
    const ordem = (maxOrdem.max || 0) + 1;

    const resultado = await db.get(
      'INSERT INTO exercicios (usuario_id, nome, dia_semana, ordem) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.session.usuarioId, nome, dia_semana, ordem]
    );
    res.json({ ...resultado, series: [] });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.put('/api/exercicios/:id', verificarLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    const exercicio = await db.get(
      'SELECT * FROM exercicios WHERE id = $1 AND usuario_id = $2', [id, req.session.usuarioId]
    );
    if (!exercicio) return res.status(404).json({ erro: 'Exercício não encontrado.' });

    const atualizado = await db.get(
      'UPDATE exercicios SET nome = $1 WHERE id = $2 RETURNING *',
      [nome || exercicio.nome, id]
    );
    const series = await db.all(
      'SELECT * FROM series_modelo WHERE exercicio_id = $1 ORDER BY numero_serie', [id]
    );
    res.json({ ...atualizado, series });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.delete('/api/exercicios/:id', verificarLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const exercicio = await db.get(
      'SELECT * FROM exercicios WHERE id = $1 AND usuario_id = $2', [id, req.session.usuarioId]
    );
    if (!exercicio) return res.status(404).json({ erro: 'Exercício não encontrado.' });

    await db.run('DELETE FROM series_modelo WHERE exercicio_id = $1', [id]);
    await db.run('DELETE FROM exercicios WHERE id = $1', [id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// ============================================
// SÉRIES MODELO
// ============================================

app.post('/api/series', verificarLogin, async (req, res) => {
  try {
    const { exercicio_id, carga_kg, repeticoes, tipo, descanso_segundos, notas, dropset_detalhes, pico_contracao, pico_contracao_segundos, ajuda } = req.body;
    if (!exercicio_id) return res.status(400).json({ erro: 'ID do exercício é obrigatório.' });

    const exercicio = await db.get(
      'SELECT * FROM exercicios WHERE id = $1 AND usuario_id = $2', [exercicio_id, req.session.usuarioId]
    );
    if (!exercicio) return res.status(404).json({ erro: 'Exercício não encontrado.' });

    const maxNum = await db.get(
      'SELECT COALESCE(MAX(numero_serie), 0) as max FROM series_modelo WHERE exercicio_id = $1',
      [exercicio_id]
    );
    const numero = (maxNum.max || 0) + 1;

    const serie = await db.get(
      `INSERT INTO series_modelo (exercicio_id, numero_serie, carga_kg, repeticoes, tipo, descanso_segundos, notas, dropset_detalhes, pico_contracao, pico_contracao_segundos, ajuda) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        exercicio_id, numero, carga_kg || 0, repeticoes || 0, tipo || 'valida', descanso_segundos || 60, notas || '',
        dropset_detalhes ? JSON.stringify(dropset_detalhes) : '[]',
        pico_contracao ? 1 : 0,
        pico_contracao_segundos || 0,
        ajuda ? 1 : 0
      ]
    );
    res.json(serie);
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.put('/api/series/:id', verificarLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const { carga_kg, repeticoes, tipo, descanso_segundos, notas, dropset_detalhes, pico_contracao, pico_contracao_segundos, ajuda } = req.body;

    const serie = await db.get(`
      SELECT sm.* FROM series_modelo sm
      JOIN exercicios e ON sm.exercicio_id = e.id
      WHERE sm.id = $1 AND e.usuario_id = $2
    `, [id, req.session.usuarioId]);
    if (!serie) return res.status(404).json({ erro: 'Série não encontrada.' });

    const atualizada = await db.get(`
      UPDATE series_modelo 
      SET carga_kg = $1, repeticoes = $2, tipo = $3, descanso_segundos = $4, notas = $5,
          dropset_detalhes = $6, pico_contracao = $7, pico_contracao_segundos = $8, ajuda = $9
      WHERE id = $10 RETURNING *
    `, [
      carga_kg !== undefined ? carga_kg : serie.carga_kg,
      repeticoes !== undefined ? repeticoes : serie.repeticoes,
      tipo || serie.tipo,
      descanso_segundos !== undefined ? descanso_segundos : serie.descanso_segundos,
      notas !== undefined ? notas : serie.notas,
      dropset_detalhes !== undefined ? JSON.stringify(dropset_detalhes) : serie.dropset_detalhes,
      pico_contracao !== undefined ? (pico_contracao ? 1 : 0) : serie.pico_contracao,
      pico_contracao_segundos !== undefined ? pico_contracao_segundos : serie.pico_contracao_segundos,
      ajuda !== undefined ? (ajuda ? 1 : 0) : serie.ajuda,
      id
    ]);
    res.json(atualizada);
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.delete('/api/series/:id', verificarLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const serie = await db.get(`
      SELECT sm.* FROM series_modelo sm
      JOIN exercicios e ON sm.exercicio_id = e.id
      WHERE sm.id = $1 AND e.usuario_id = $2
    `, [id, req.session.usuarioId]);
    if (!serie) return res.status(404).json({ erro: 'Série não encontrada.' });

    await db.run('DELETE FROM series_modelo WHERE id = $1', [id]);

    // Reordenar séries restantes
    const restantes = await db.all(
      'SELECT id FROM series_modelo WHERE exercicio_id = $1 ORDER BY numero_serie', [serie.exercicio_id]
    );
    for (let i = 0; i < restantes.length; i++) {
      await db.run('UPDATE series_modelo SET numero_serie = $1 WHERE id = $2', [i + 1, restantes[i].id]);
    }
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// ============================================
// SESSÕES DE TREINO
// ============================================

app.post('/api/sessoes', verificarLogin, async (req, res) => {
  try {
    const { data, dia_semana, observacoes, series } = req.body;
    if (!data || !dia_semana) return res.status(400).json({ erro: 'Data e dia são obrigatórios.' });
    if (!series || series.length === 0) return res.status(400).json({ erro: 'Registre pelo menos uma série.' });

    const sessao = await db.get(
      'INSERT INTO sessoes_treino (usuario_id, data, dia_semana, observacoes) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.session.usuarioId, data, dia_semana, observacoes || '']
    );

    for (const s of series) {
      await db.run(
        `INSERT INTO series_realizadas (sessao_id, exercicio_id, nome_exercicio, numero_serie, carga_kg, repeticoes, tipo, concluida, notas, dropset_detalhes, pico_contracao, pico_contracao_segundos, ajuda)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          sessao.id, s.exercicio_id, s.nome_exercicio, s.numero_serie, s.carga_kg || 0, s.repeticoes || 0, s.tipo || 'valida', 
          s.concluida !== undefined ? (s.concluida ? 1 : 0) : 1, s.notas || '',
          s.dropset_detalhes ? (typeof s.dropset_detalhes === 'string' ? s.dropset_detalhes : JSON.stringify(s.dropset_detalhes)) : '[]',
          s.pico_contracao ? 1 : 0,
          s.pico_contracao_segundos || 0,
          s.ajuda ? 1 : 0
        ]
      );
    }
    res.json({ sucesso: true, sessao_id: sessao.id });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.get('/api/sessoes', verificarLogin, async (req, res) => {
  try {
    const sessoes = await db.all(
      'SELECT * FROM sessoes_treino WHERE usuario_id = $1 ORDER BY data DESC', [req.session.usuarioId]
    );
    const resultado = [];
    for (const sessao of sessoes) {
      const series = await db.all(
        'SELECT * FROM series_realizadas WHERE sessao_id = $1 ORDER BY exercicio_id, numero_serie', [sessao.id]
      );
      resultado.push({ ...sessao, series });
    }
    res.json(resultado);
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// ============================================
// EVOLUÇÃO
// ============================================

app.get('/api/evolucao', verificarLogin, async (req, res) => {
  try {
    const exercicios = await db.all(`
      SELECT DISTINCT sr.nome_exercicio 
      FROM series_realizadas sr
      JOIN sessoes_treino st ON sr.sessao_id = st.id
      WHERE st.usuario_id = $1
      ORDER BY sr.nome_exercicio
    `, [req.session.usuarioId]);

    const evolucao = [];
    for (const ex of exercicios) {
      const sessoes = await db.all(`
        SELECT st.data,
               SUM(sr.carga_kg * sr.repeticoes) as volume_total,
               MAX(sr.carga_kg) as carga_maxima,
               SUM(sr.repeticoes) as reps_total,
               COUNT(sr.id) as total_series
        FROM series_realizadas sr
        JOIN sessoes_treino st ON sr.sessao_id = st.id
        WHERE st.usuario_id = $1 AND sr.nome_exercicio = $2
        GROUP BY st.data
        ORDER BY st.data ASC
      `, [req.session.usuarioId, ex.nome_exercicio]);

      evolucao.push({ exercicio: ex.nome_exercicio, sessoes });
    }
    res.json(evolucao);
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// ============================================
// ROTA PADRÃO
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// INICIAR SERVIDOR
// ============================================
async function iniciar() {
  try {
    await db.inicializar();
    app.listen(PORTA, () => {
      console.log(`\n🏋️ Servidor rodando em http://localhost:${PORTA}`);
      console.log('   Pressione Ctrl+C para parar.\n');
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar:', err.message);
    process.exit(1);
  }
}

iniciar();
