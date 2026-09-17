const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const contasRoutes = require('./routes/contas');
const apontamentosRoutes = require('./routes/apontamentos');

const app = express();
const PORT = process.env.PORT || 9900;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/contas', contasRoutes);
app.use('/api/apontamentos', apontamentosRoutes);

// Rota fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Sistema de Controle Financeiro em Matriz Semanal  `);
  console.log(`  Servidor rodando em: http://localhost:${PORT}     `);
  console.log(`====================================================`);
});
