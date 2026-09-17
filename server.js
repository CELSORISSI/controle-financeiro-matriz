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

const { execSync } = require('child_process');

// Iniciar servidor com auto-recuperacao de porta
function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Sistema de Controle Financeiro em Matriz Semanal  `);
    console.log(`  Servidor rodando em: http://localhost:${PORT}     `);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[!] A porta ${PORT} ja estava em uso. Encerrando o processo anterior...`);
      try {
        if (process.platform === 'win32') {
          const out = execSync(`netstat -ano | findstr :${PORT}`).toString();
          const lines = out.trim().split('\n');
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== String(process.pid)) {
              try { execSync(`taskkill /F /PID ${pid}`); } catch (e) {}
            }
          });
        }
        setTimeout(() => {
          app.listen(PORT, () => {
            console.log(`====================================================`);
            console.log(`  Sistema de Controle Financeiro em Matriz Semanal  `);
            console.log(`  Servidor rodando em: http://localhost:${PORT}     `);
            console.log(`====================================================`);
          });
        }, 800);
      } catch (e) {
        console.error(`[!] Tentativa de liberação finalizada.`);
      }
    } else {
      console.error('Erro ao iniciar servidor:', err);
    }
  });
}

startServer();
