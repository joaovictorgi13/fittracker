// ============================================
// database.js — Banco de Dados PostgreSQL
// Funciona com Neon.tech ou Render PostgreSQL
// ============================================

require('dotenv').config();
const { Pool } = require('pg');

// Conectar ao PostgreSQL usando a URL do ambiente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

// ============================================
// Funções auxiliares do banco de dados
// Simplificam as consultas SQL
// ============================================

const db = {
  // Executar uma query e retornar todas as linhas
  async all(sql, params = []) {
    const resultado = await pool.query(sql, params);
    return resultado.rows;
  },

  // Executar uma query e retornar a primeira linha
  async get(sql, params = []) {
    const resultado = await pool.query(sql, params);
    return resultado.rows[0] || null;
  },

  // Executar uma query de inserção/atualização/deleção
  async run(sql, params = []) {
    const resultado = await pool.query(sql, params);
    return resultado;
  },

  // Inicializar as tabelas do banco
  async inicializar() {
    await pool.query(`
      -- Tabela de usuários
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      -- Tabela de exercícios (plano de treino por dia)
      CREATE TABLE IF NOT EXISTS exercicios (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        dia_semana TEXT NOT NULL,
        ordem INTEGER DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      -- Tabela de séries modelo (template do exercício)
      CREATE TABLE IF NOT EXISTS series_modelo (
        id SERIAL PRIMARY KEY,
        exercicio_id INTEGER NOT NULL REFERENCES exercicios(id) ON DELETE CASCADE,
        numero_serie INTEGER NOT NULL,
        carga_kg REAL DEFAULT 0,
        repeticoes INTEGER DEFAULT 0,
        tipo TEXT DEFAULT 'valida',
        descanso_segundos INTEGER DEFAULT 60,
        notas TEXT DEFAULT ''
      );

      -- Tabela de sessões de treino
      CREATE TABLE IF NOT EXISTS sessoes_treino (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        dia_semana TEXT NOT NULL,
        observacoes TEXT DEFAULT '',
        criado_em TIMESTAMP DEFAULT NOW()
      );

      -- Tabela de séries realizadas
      CREATE TABLE IF NOT EXISTS series_realizadas (
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
      );
    `);

    console.log('✅ Tabelas do banco criadas/verificadas.');
  }
};

module.exports = db;
