const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'financeiro.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco SQLite em:', DB_PATH);
  }
});

db.serialize(() => {
  // Tabela de Contas / Despesas
  db.run(`
    CREATE TABLE IF NOT EXISTS contas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conta_pai_id INTEGER DEFAULT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      categoria TEXT DEFAULT 'Geral',
      data_vencimento TEXT,
      dia_vencimento_fixo INTEGER,
      valor_padrao REAL DEFAULT 0,
      tipo_recorrencia TEXT DEFAULT 'mensal',
      total_parcelas INTEGER DEFAULT 1,
      mes_inicio TEXT DEFAULT '2026-09',
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conta_pai_id) REFERENCES contas(id) ON DELETE CASCADE
    )
  `);

  // Migrações seguras de colunas existentes
  db.run(`ALTER TABLE contas ADD COLUMN conta_pai_id INTEGER DEFAULT NULL`, () => {});
  db.run(`ALTER TABLE contas ADD COLUMN tipo_recorrencia TEXT DEFAULT 'mensal'`, () => {});
  db.run(`ALTER TABLE contas ADD COLUMN total_parcelas INTEGER DEFAULT 1`, () => {});
  db.run(`ALTER TABLE contas ADD COLUMN mes_inicio TEXT DEFAULT '2026-09'`, () => {});

  // Tabela de Apontamentos Diários (Lançamentos por célula)
  db.run(`
    CREATE TABLE IF NOT EXISTS apontamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conta_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pendente',
      tipo_pagamento TEXT NOT NULL DEFAULT 'boleto',
      observacao TEXT,
      data_pagamento TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE,
      UNIQUE(conta_id, data)
    )
  `);
});

module.exports = db;
