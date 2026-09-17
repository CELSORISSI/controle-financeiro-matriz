const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/contas - Listar todas as contas
router.get('/', (req, res) => {
  const query = `SELECT * FROM contas WHERE ativo = 1 ORDER BY dia_vencimento_fixo ASC, nome ASC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/contas - Criar nova conta
router.post('/', (req, res) => {
  const { 
    nome, 
    descricao, 
    categoria, 
    data_vencimento, 
    dia_vencimento_fixo, 
    valor_padrao,
    tipo_recorrencia,
    total_parcelas,
    mes_inicio
  } = req.body;
  
  if (!nome) {
    return res.status(400).json({ error: 'O nome da despesa/conta é obrigatório.' });
  }

  const query = `
    INSERT INTO contas (
      nome, descricao, categoria, data_vencimento, dia_vencimento_fixo, valor_padrao,
      tipo_recorrencia, total_parcelas, mes_inicio
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      nome,
      descricao || '',
      categoria || 'Geral',
      data_vencimento || null,
      dia_vencimento_fixo ? parseInt(dia_vencimento_fixo) : null,
      valor_padrao ? parseFloat(valor_padrao) : 0,
      tipo_recorrencia || 'mensal',
      total_parcelas ? parseInt(total_parcelas) : 1,
      mes_inicio || '2026-09'
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        nome,
        descricao,
        categoria,
        data_vencimento,
        dia_vencimento_fixo,
        valor_padrao,
        tipo_recorrencia: tipo_recorrencia || 'mensal',
        total_parcelas: total_parcelas || 1,
        mes_inicio: mes_inicio || '2026-09'
      });
    }
  );
});

// PUT /api/contas/:id - Atualizar conta existente
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { 
    nome, 
    descricao, 
    categoria, 
    data_vencimento, 
    dia_vencimento_fixo, 
    valor_padrao,
    tipo_recorrencia,
    total_parcelas,
    mes_inicio
  } = req.body;

  const query = `
    UPDATE contas 
    SET nome = ?, descricao = ?, categoria = ?, data_vencimento = ?, dia_vencimento_fixo = ?, valor_padrao = ?,
        tipo_recorrencia = ?, total_parcelas = ?, mes_inicio = ?
    WHERE id = ?
  `;

  db.run(
    query,
    [
      nome,
      descricao,
      categoria,
      data_vencimento,
      dia_vencimento_fixo ? parseInt(dia_vencimento_fixo) : null,
      valor_padrao ? parseFloat(valor_padrao) : 0,
      tipo_recorrencia || 'mensal',
      total_parcelas ? parseInt(total_parcelas) : 1,
      mes_inicio || '2026-09',
      id
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Conta atualizada com sucesso.' });
    }
  );
});

// DELETE /api/contas/:id - Desativar/Remover conta
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run(`UPDATE contas SET ativo = 0 WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Conta desativada com sucesso.' });
  });
});

module.exports = router;
