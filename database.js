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
      nome TEXT NOT NULL,
      descricao TEXT,
      categoria TEXT DEFAULT 'Geral',
      data_vencimento TEXT,
      dia_vencimento_fixo INTEGER,
      valor_padrao REAL DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // Inserir dados de teste caso o banco esteja vazio
  db.get("SELECT COUNT(*) as count FROM contas", (err, row) => {
    if (err) return;
    if (row.count === 0) {
      console.log("Semeando dados iniciais de demonstração...");
      
      const contasIniciais = [
        { nome: 'Aluguel do Escritório', descricao: 'Contrato de Locação Sede', categoria: 'Infraestrutura', dia_vencimento_fixo: 5, valor_padrao: 4500.00 },
        { nome: 'Energia Elétrica (Enel)', descricao: 'Conta Mensal de Luz', categoria: 'Utilidades', dia_vencimento_fixo: 10, valor_padrao: 820.50 },
        { nome: 'Internet Fibra 1Gbps', descricao: 'Link Dedicado Telecom', categoria: 'TI', dia_vencimento_fixo: 15, valor_padrao: 350.00 },
        { nome: 'Licenciamento TOTVS Protheus', descricao: 'ERP Módulos Mensalidade', categoria: 'Sistemas & TI', dia_vencimento_fixo: 18, valor_padrao: 3200.00 },
        { nome: 'Folha de Pagamento - Consultores', descricao: 'Remuneração Equipe', categoria: 'Pessoal', dia_vencimento_fixo: 5, valor_padrao: 18500.00 },
        { nome: 'Cartão Corporativo Itaú', descricao: 'Despesas de Viagem & Softwares', categoria: 'Cartão', dia_vencimento_fixo: 20, valor_padrao: 2150.80 },
        { nome: 'Imposto DAS Simples Nacional', descricao: 'Tributação Mensal Faturamento', categoria: 'Impostos', dia_vencimento_fixo: 20, valor_padrao: 4100.00 },
        { nome: 'Seguro Garantia Sede', descricao: 'Apolice de Seguro Anual/Fração', categoria: 'Seguros', dia_vencimento_fixo: 25, valor_padrao: 680.00 },
        { nome: 'Serviços de Limpeza & Copa', descricao: 'Fornecedor Terceirizado', categoria: 'Serviços', dia_vencimento_fixo: 28, valor_padrao: 1200.00 },
        { nome: 'Licenças AWS & Cloud Infrastructure', descricao: 'Servidores e Banco de Dados Cloud', categoria: 'TI', dia_vencimento_fixo: 12, valor_padrao: 1450.30 }
      ];

      const stmt = db.prepare(`
        INSERT INTO contas (nome, descricao, categoria, dia_vencimento_fixo, valor_padrao, data_vencimento)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Setembro 2026 como base padrão das fotos ou mês atual
      const anoMes = "2026-09";

      contasIniciais.forEach((c) => {
        const diaFormatted = String(c.dia_vencimento_fixo).padStart(2, '0');
        const dataVenc = `${anoMes}-${diaFormatted}`;
        stmt.run(c.nome, c.descricao, c.categoria, c.dia_vencimento_fixo, c.valor_padrao, dataVenc);
      });
      stmt.finalize();

      // Inserir apontamentos de exemplo para Setembro de 2026
      setTimeout(() => {
        db.all("SELECT id, dia_vencimento_fixo, valor_padrao FROM contas", (err, rows) => {
          if (err || !rows) return;
          const stmtApon = db.prepare(`
            INSERT OR REPLACE INTO apontamentos (conta_id, data, valor, status, tipo_pagamento, observacao)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          rows.forEach((conta) => {
            const diaStr = String(conta.dia_vencimento_fixo).padStart(2, '0');
            const dataVenc = `${anoMes}-${diaStr}`;
            
            // Simular alguns como pagos (dias 1 a 15), agendados ou pendentes
            let status = 'pendente';
            let tipo = 'boleto';
            let obs = '';

            if (conta.dia_vencimento_fixo <= 5) {
              status = 'pago';
              tipo = 'debito_conta';
              obs = 'Pago via débito automático em conta corrente';
            } else if (conta.dia_vencimento_fixo <= 12) {
              status = 'pago';
              tipo = 'boleto';
              obs = 'Boleto quitado pelo Internet Banking';
            } else if (conta.dia_vencimento_fixo <= 18) {
              status = 'agendado';
              tipo = 'cartao';
              obs = 'Agendado na fatura do cartão de crédito';
            } else if (conta.dia_vencimento_fixo === 20) {
              status = 'pendente';
              tipo = 'pix';
              obs = 'Aguardando liberação de guia de imposto / PIX';
            } else {
              status = 'pendente';
              tipo = 'boleto';
              obs = 'A vencer no final do mês';
            }

            stmtApon.run(conta.id, dataVenc, conta.valor_padrao, status, tipo, obs);
          });
          stmtApon.finalize();
          console.log("Dados de demonstração inseridos com sucesso!");
        });
      }, 500);
    }
  });
});

module.exports = db;
