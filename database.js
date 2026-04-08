// ============================================
// database.js — Banco de Dados PostgreSQL
// Funciona com Neon.tech ou Render PostgreSQL
// ============================================

require('dotenv').config();
const { Pool } = require('pg');

// Configurar conexão com o banco
const configuracaoPool = {
  connectionString: process.env.DATABASE_URL,
};

// Em produção, habilitar SSL
if (process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'))) {
  configuracaoPool.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(configuracaoPool);

// ============================================
// Funções auxiliares do banco de dados
// ============================================

const db = {
  async all(sql, params = []) {
    const resultado = await pool.query(sql, params);
    return resultado.rows;
  },

  async get(sql, params = []) {
    const resultado = await pool.query(sql, params);
    return resultado.rows[0] || null;
  },

  async run(sql, params = []) {
    const resultado = await pool.query(sql, params);
    return resultado;
  },

  // Inicializar as tabelas do banco (uma por vez)
  async inicializar() {
    const tabelas = [
      `CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS exercicios (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        dia_semana TEXT NOT NULL,
        ordem INTEGER DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS series_modelo (
        id SERIAL PRIMARY KEY,
        exercicio_id INTEGER NOT NULL REFERENCES exercicios(id) ON DELETE CASCADE,
        numero_serie INTEGER NOT NULL,
        carga_kg REAL DEFAULT 0,
        repeticoes INTEGER DEFAULT 0,
        tipo TEXT DEFAULT 'valida',
        descanso_segundos INTEGER DEFAULT 60,
        notas TEXT DEFAULT ''
      )`,

      `CREATE TABLE IF NOT EXISTS sessoes_treino (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        dia_semana TEXT NOT NULL,
        observacoes TEXT DEFAULT '',
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS series_realizadas (
        id SERIAL PRIMARY KEY,
        sessao_id INTEGER NOT NULL REFERENCES sessoes_treino(id) ON DELETE CASCADE,
        exercicio_id INTEGER NOT NULL,
        nome_exercicio TEXT NOT NULL,
        numero_serie INTEGER NOT NULL,
        carga_kg REAL DEFAULT 0,
        repeticoes INTEGER DEFAULT 0,
        tipo TEXT DEFAULT 'valida',
        concluida INTEGER DEFAULT 1,
        notas TEXT DEFAULT ''
      )`
    ];

    for (const sql of tabelas) {
      await pool.query(sql);
    }

    console.log('✅ Tabelas do banco criadas/verificadas.');
  }
};

module.exports = db;
