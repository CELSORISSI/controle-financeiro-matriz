# Controle Financeiro - Matriz Semanal de Contas a Pagar

Sistema de gestão e controle financeiro desenvolvido em **Node.js** e **SQLite**, com interface moderna **Dark Theme** em matriz semanal/mensal de contas a pagar, baixa diária de títulos, suporte a tipos de pagamento e modal interativo de lançamento.

![Node.js](https://img.shields.io/badge/Node.js-v24-green)
![SQLite](https://img.shields.io/badge/SQLite-v3-blue)
![Porta](https://img.shields.io/badge/Porta-9900-orange)

---

## 💻 Tecnologias Utilizadas

- **Backend**: Node.js, Express, Cors, Body-Parser
- **Banco de Dados**: SQLite (`financeiro.db`)
- **Frontend**: HTML5, CSS3 (GLOVIS Dark Theme), Vanilla JavaScript, FontAwesome

---

## 📊 Funcionalidades

1. **Dashboard KPI Top Cards**:
   - Total de Contas Ativas
   - Total Previsto (Mês)
   - Média por Conta
   - Distribuição de Status (Pago, Pendente, Agendado)
   - Alerta de Contas Vencidas / Zeradas

2. **Filtros e Navegação**:
   - Seletor de Mês e Ano com suporte a navegação por semanas (`Sem. 36`, `Sem. 37`, `Sem. 38`...)
   - Busca por nome da despesa ou descrição
   - Filtro por categoria (Infraestrutura, Utilidades, TI, Pessoal, Impostos, Serviços)
   - Filtro por Tipo de Pagamento (Boleto, Cartão, Débito em Conta, PIX, Dinheiro)

3. **Tabela Matriz por Semanas**:
   - Colunas Fixas: `Despesa`, `Descrição`, `Data de Vencimento`, `Dia do Vencimento Fixo`
   - Matriz diária agrupada por semanas do ano
   - Badges de status com cores (Verde = Pago, Amarelo = Pendente, Azul = Agendado, Laranja/Vermelho = Dúvida/Vencido)

4. **Modal Interativo de Apontamento / Baixa**:
   - Ao clicar em qualquer célula da matriz, exibe o modal de preenchimento/baixa da conta com valor, status, forma de pagamento e observação.

---

## 🚀 Como Executar o Projeto

1. Clone o repositório:
```bash
git clone https://github.com/CELSORISSI/controle-financeiro-matriz.git
cd controle-financeiro-matriz
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor Node.js:
```bash
npm start
```

4. Acesse no navegador:
```
http://localhost:9900
```
