const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/apontamentos?anoMes=YYYY-MM
router.get('/', (req, res) => {
  const { anoMes } = req.query;

  let query = `
    SELECT a.*, c.nome as conta_nome 
    FROM apontamentos a
    JOIN contas c ON a.conta_id = c.id
  `;
  const params = [];

  if (anoMes) {
    query += ` WHERE a.data LIKE ?`;
    params.push(`${anoMes}-%`);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/apontamentos - Inserir ou atualizar apontamento de célula
router.post('/', (req, res) => {
  const { conta_id, data, valor, status, tipo_pagamento, observacao, data_pagamento } = req.body;

  if (!conta_id || !data) {
    return res.status(400).json({ error: 'conta_id e data são obrigatórios.' });
  }

  const dataBaixa = (status === 'pago' && !data_pagamento) 
    ? new Date().toISOString().split('T')[0] 
    : (data_pagamento || null);

  const query = `
    INSERT INTO apontamentos (conta_id, data, valor, status, tipo_pagamento, observacao, data_pagamento)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(conta_id, data) DO UPDATE SET
      valor = excluded.valor,
      status = excluded.status,
      tipo_pagamento = excluded.tipo_pagamento,
      observacao = excluded.observacao,
      data_pagamento = excluded.data_pagamento
  `;

  db.run(
    query,
    [
      conta_id,
      data,
      parseFloat(valor) || 0,
      status || 'pendente',
      tipo_pagamento || 'boleto',
      observacao || '',
      dataBaixa
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Apontamento salvo com sucesso.',
        id: this.lastID || undefined,
        conta_id,
        data,
        valor,
        status,
        tipo_pagamento,
        observacao,
        data_pagamento: dataBaixa
      });
    }
  );
});

// DELETE /api/apontamentos - Remover/Limpar apontamento de uma célula
router.delete('/', (req, res) => {
  const { conta_id, data } = req.body;

  if (!conta_id || !data) {
    return res.status(400).json({ error: 'conta_id e data são obrigatórios.' });
  }

  db.run(
    `DELETE FROM apontamentos WHERE conta_id = ? AND data = ?`,
    [conta_id, data],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Apontamento removido com sucesso.' });
    }
  );
});

module.exports = router;
