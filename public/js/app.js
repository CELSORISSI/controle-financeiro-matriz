// ==========================================================================
// CLIENT APP LOGIC - FINANCIAL CONTROL MATRIX
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let currentDate = new Date(2026, 8, 1); // Setembro 2026 como padrão do modelo
  let contas = [];
  let apontamentos = [];
  let activeCellData = null;

  // State de Ordenação da Grade Fixa (A-Z / Z-A)
  let currentSortField = 'nome'; // 'nome', 'descricao', 'categoria', 'data_vencimento', 'dia_vencimento_fixo'
  let currentSortOrder = 'asc';  // 'asc' (A-Z) ou 'desc' (Z-A)

  // State de expansão/recolhimento de Sub-contas (Cartões)
  let expandedParents = {}; // parentId -> boolean

  // DOM Elements
  const elCurrentMonthLabel = document.getElementById('current-month-label');
  const elTableMonthBadge = document.getElementById('table-month-badge');
  const elBtnPrevMonth = document.getElementById('btn-prev-month');
  const elBtnNextMonth = document.getElementById('btn-next-month');
  const elBtnToday = document.getElementById('btn-today');

  const elSearchInput = document.getElementById('search-input');
  const elFilterCategoria = document.getElementById('filter-categoria');
  const elFilterTipoPagamento = document.getElementById('filter-tipo-pagamento');
  
  const elThead = document.getElementById('matrix-thead');
  const elTbody = document.getElementById('matrix-tbody');

  // KPI Elements
  const elKpiTotalContas = document.getElementById('kpi-total-contas');
  const elKpiTotalValor = document.getElementById('kpi-total-valor');
  const elKpiMediaConta = document.getElementById('kpi-media-conta');
  const elKpiDistribuicao = document.getElementById('kpi-distribuicao');
  const elKpiPendentesVencidos = document.getElementById('kpi-pendentes-vencidos');

  // Modal 1: Appointment
  const elModalCell = document.getElementById('modal-cell-appointment');
  const elBtnCloseAppointment = document.getElementById('btn-close-appointment');
  const elBtnCancelAppointment = document.getElementById('btn-cancel-appointment');
  const elBtnSaveAppointment = document.getElementById('btn-save-appointment');
  const elBtnDeleteAppointment = document.getElementById('btn-delete-appointment');

  const elModalAccountName = document.getElementById('modal-cell-account-name');
  const elModalDateDisplay = document.getElementById('modal-cell-date-display');
  const elModalContaId = document.getElementById('modal-cell-conta-id');
  const elModalDateRaw = document.getElementById('modal-cell-date-raw');
  const elModalValor = document.getElementById('modal-cell-valor');
  const elModalStatus = document.getElementById('modal-cell-status');
  const elModalTipoPagamento = document.getElementById('modal-cell-tipo-pagamento');
  const elModalObservacao = document.getElementById('modal-cell-observacao');

  // Modal 2: Conta
  const elModalConta = document.getElementById('modal-conta');
  const elBtnNovaConta = document.getElementById('btn-nova-conta');
  const elBtnCloseConta = document.getElementById('btn-close-conta');
  const elBtnCancelConta = document.getElementById('btn-cancel-conta');
  const elBtnSaveConta = document.getElementById('btn-save-conta');
  const elModalContaTitle = document.getElementById('modal-conta-title');
  const elModalContaIdInput = document.getElementById('modal-conta-id');
  const elModalContaPaiId = document.getElementById('modal-conta-pai-id');
  const elModalContaNome = document.getElementById('modal-conta-nome');
  const elModalContaDescricao = document.getElementById('modal-conta-descricao');
  const elModalContaCategoria = document.getElementById('modal-conta-categoria');
  const elModalContaDiaFixo = document.getElementById('modal-conta-dia-fixo');
  const elModalContaValor = document.getElementById('modal-conta-valor');

  const elModalContaTipoRecorrencia = document.getElementById('modal-conta-tipo-recorrencia');
  const elModalContaTotalParcelas = document.getElementById('modal-conta-total-parcelas');
  const elModalContaMesInicio = document.getElementById('modal-conta-mes-inicio');
  const elContainerParceladoFields = document.getElementById('container-parcelado-fields');

  // --- Initialize App ---
  init();

  async function init() {
    setupEventListeners();
    await loadData();
  }

  // Set Event Listeners
  function setupEventListeners() {
    elBtnPrevMonth.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      loadData();
    });

    elBtnNextMonth.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      loadData();
    });

    elBtnToday.addEventListener('click', () => {
      currentDate = new Date();
      loadData();
    });

    elSearchInput.addEventListener('input', renderMatrix);
    elFilterCategoria.addEventListener('change', renderMatrix);
    elFilterTipoPagamento.addEventListener('change', renderMatrix);

    // Modal Appointment Actions
    elBtnCloseAppointment.addEventListener('click', closeAppointmentModal);
    elBtnCancelAppointment.addEventListener('click', closeAppointmentModal);
    elBtnSaveAppointment.addEventListener('click', saveAppointment);
    elBtnDeleteAppointment.addEventListener('click', deleteAppointment);

    // Modal Conta Actions
    elBtnNovaConta.addEventListener('click', () => openContaModal());
    elBtnCloseConta.addEventListener('click', closeContaModal);
    elBtnCancelConta.addEventListener('click', closeContaModal);
    elBtnSaveConta.addEventListener('click', saveConta);

    elModalContaTipoRecorrencia.addEventListener('change', () => {
      elContainerParceladoFields.style.display = (elModalContaTipoRecorrencia.value === 'parcelado') ? 'flex' : 'none';
    });
  }

  // Load Data from API
  async function loadData() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const anoMes = `${year}-${String(month).padStart(2, '0')}`;

    // Update Headers Labels
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthFormatted = `${monthNames[currentDate.getMonth()]} ${year}`;
    elCurrentMonthLabel.textContent = monthFormatted;
    elTableMonthBadge.textContent = monthFormatted;

    try {
      const [resContas, resApontamentos] = await Promise.all([
        fetch('/api/contas'),
        fetch(`/api/apontamentos?anoMes=${anoMes}`)
      ]);

      contas = await resContas.json();
      apontamentos = await resApontamentos.json();

      renderMatrix();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  }

  // Utility: Calculate ISO Week Number
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  }

  // Render Matrix Table & KPIs
  function renderMatrix() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    const weekGroups = [];
    let currentWeekNum = null;
    let currentWeekDays = 0;

    const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const weekNum = getWeekNumber(dateObj);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      days.push({
        dayNumber: d,
        dayOfWeek: dayOfWeek,
        dayName: dayNamesShort[dayOfWeek],
        dateStr: dateStr,
        weekNum: weekNum,
        isWeekend: (dayOfWeek === 0 || dayOfWeek === 6)
      });

      if (currentWeekNum === null) {
        currentWeekNum = weekNum;
        currentWeekDays = 1;
      } else if (currentWeekNum === weekNum) {
        currentWeekDays++;
      } else {
        weekGroups.push({ weekNum: currentWeekNum, count: currentWeekDays });
        currentWeekNum = weekNum;
        currentWeekDays = 1;
      }
    }
    if (currentWeekDays > 0) {
      weekGroups.push({ weekNum: currentWeekNum, count: currentWeekDays });
    }

    // Helper para ícones de ordenação
    function getSortIcon(field) {
      if (currentSortField !== field) {
        return '<i class="fa-solid fa-sort" style="opacity: 0.3; margin-left: 4px; font-size: 0.7rem;"></i>';
      }
      return currentSortOrder === 'asc' 
        ? '<i class="fa-solid fa-arrow-down-a-z" style="color: var(--accent-blue); margin-left: 4px; font-size: 0.75rem;"></i>' 
        : '<i class="fa-solid fa-arrow-up-z-a" style="color: var(--accent-blue); margin-left: 4px; font-size: 0.75rem;"></i>';
    }

    // 1. Render Table Header (2 Rows com Categoria Fixa e Ordenação)
    let theadHTML = `
      <tr>
        <th colspan="6" class="th-fixed-col">Agenda de Contas & Vencimentos</th>
        ${weekGroups.map(w => `<th colspan="${w.count}" class="th-week-group">Sem. ${w.weekNum}</th>`).join('')}
      </tr>
      <tr>
        <th class="th-fixed-col th-sortable" data-sort-field="nome" style="min-width: 170px; cursor: pointer;">Despesa ${getSortIcon('nome')}</th>
        <th class="th-fixed-col th-sortable" data-sort-field="descricao" style="min-width: 150px; cursor: pointer;">Descrição ${getSortIcon('descricao')}</th>
        <th class="th-fixed-col th-sortable" data-sort-field="categoria" style="min-width: 110px; cursor: pointer;">Categoria ${getSortIcon('categoria')}</th>
        <th class="th-fixed-col th-sortable" data-sort-field="data_vencimento" style="min-width: 90px; cursor: pointer; text-align: center;">Data Venc. ${getSortIcon('data_vencimento')}</th>
        <th class="th-fixed-col th-sortable" data-sort-field="dia_vencimento_fixo" style="min-width: 80px; cursor: pointer; text-align: center;">Venc. Fixo ${getSortIcon('dia_vencimento_fixo')}</th>
        <th class="th-fixed-col" style="min-width: 55px; text-align: center;">Ações</th>
        ${days.map(d => `
          <th style="min-width: 48px;" class="${d.isWeekend ? 'cell-weekend' : ''}">
            <div>${d.dayNumber}</div>
            <span class="th-day-name">${d.dayName}</span>
          </th>
        `).join('')}
      </tr>
    `;
    elThead.innerHTML = theadHTML;

    // Filter & Group Contas (Hierarquia Pai x Sub-contas)
    const searchVal = elSearchInput.value.toLowerCase().trim();
    const catVal = elFilterCategoria.value;
    const tipoVal = elFilterTipoPagamento.value;

    // Separar contas principais e mapa de sub-contas
    const parentContas = [];
    const childrenMap = {};

    contas.forEach(c => {
      if (c.conta_pai_id) {
        if (!childrenMap[c.conta_pai_id]) childrenMap[c.conta_pai_id] = [];
        childrenMap[c.conta_pai_id].push(c);
      } else {
        parentContas.push(c);
      }
    });

    // Filtrar pais cujos nomes/descrições/categorias batem ou cujos filhos batem
    let filteredParents = parentContas.filter(p => {
      const subs = childrenMap[p.id] || [];
      const matchParentSearch = p.nome.toLowerCase().includes(searchVal) || (p.descricao && p.descricao.toLowerCase().includes(searchVal));
      const matchParentCat = !catVal || p.categoria === catVal;
      
      const matchSub = subs.some(s => {
        const msSearch = s.nome.toLowerCase().includes(searchVal) || (s.descricao && s.descricao.toLowerCase().includes(searchVal));
        const msCat = !catVal || s.categoria === catVal;
        return msSearch && msCat;
      });

      return (matchParentSearch && matchParentCat) || matchSub;
    });

    // Aplicar Ordenação A-Z / Z-A na Grade Fixa dos Pais
    filteredParents.sort((a, b) => {
      let valA = a[currentSortField];
      let valB = b[currentSortField];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return currentSortOrder === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Create Quick Lookup Map for Apontamentos
    const apontamentosMap = {};
    apontamentos.forEach(a => {
      apontamentosMap[`${a.conta_id}_${a.data}`] = a;
    });

    // 2. Render Table Body Rows (Hierarquia Pai & Filhos)
    let tbodyHTML = '';

    filteredParents.forEach(parentConta => {
      const subItems = childrenMap[parentConta.id] || [];
      const isExpanded = expandedParents[parentConta.id] !== false; // Padrão expandido

      let dataVencDisplay = parentConta.data_vencimento ? formatDateBR(parentConta.data_vencimento) : '-';
      if (!parentConta.data_vencimento && parentConta.dia_vencimento_fixo) {
        dataVencDisplay = `${String(parentConta.dia_vencimento_fixo).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      }

      // Render Linha da Conta Pai (Ex: Cartão 01)
      tbodyHTML += `
        <tr class="${subItems.length > 0 ? 'tr-parent-conta' : ''}">
          <td class="td-fixed">
            <div style="display: flex; align-items: center;">
              ${subItems.length > 0 ? `
                <button class="btn-toggle-sub" data-parent-id="${parentConta.id}" title="${isExpanded ? 'Recolher Sub-itens' : 'Expandir Sub-itens'}">
                  <i class="fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}"></i>
                </button>
              ` : ''}
              <div class="conta-name">${escapeHTML(parentConta.nome)}</div>
              ${subItems.length > 0 ? `<span class="badge-sub-count">${subItems.length} sub-itens</span>` : ''}
            </div>
          </td>
          <td class="td-fixed">
            <div class="conta-desc">${escapeHTML(parentConta.descricao || '-')}</div>
          </td>
          <td class="td-fixed">
            <span class="badge-categoria">${escapeHTML(parentConta.categoria || 'Geral')}</span>
          </td>
          <td class="td-fixed" style="text-align: center;">${dataVencDisplay}</td>
          <td class="td-fixed" style="text-align: center;">
            <span class="badge-venc-fixo">Dia ${parentConta.dia_vencimento_fixo || '-'}</span>
          </td>
          <td class="td-fixed" style="text-align: center;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 3px;">
              <button class="btn-add-sub" data-parent-id="${parentConta.id}" title="Adicionar Sub-despesa a esta conta/cartão"><i class="fa-solid fa-plus"></i></button>
              <button class="btn-icon btn-edit-conta" data-id="${parentConta.id}" title="Editar Conta"><i class="fa-solid fa-pen-to-square"></i></button>
            </div>
          </td>
      `;

      // Render Células da Matriz para Linha Pai
      days.forEach(d => {
        const key = `${parentConta.id}_${d.dateStr}`;
        const apon = apontamentosMap[key];

        // Calcular se há valores acumulados dos sub-itens neste dia
        let subDayTotal = 0;
        let subPaidCount = 0;
        let subTotalCount = 0;

        subItems.forEach(sub => {
          const subKey = `${sub.id}_${d.dateStr}`;
          const subApon = apontamentosMap[subKey];
          if (subApon) {
            subDayTotal += subApon.valor;
            if (subApon.status === 'pago') subPaidCount++;
            subTotalCount++;
          } else if (sub.dia_vencimento_fixo === d.dayNumber) {
            subDayTotal += (sub.valor_padrao || 0);
            subTotalCount++;
          }
        });

        // Filtrar por tipo se ativo
        if (tipoVal && apon && apon.tipo_pagamento !== tipoVal) {
          tbodyHTML += `<td class="cell-day ${d.isWeekend ? 'weekend' : ''}"></td>`;
          return;
        }

        let isDueDateActive = false;
        let parcelaTagText = '';

        if (parentConta.dia_vencimento_fixo === d.dayNumber) {
          if (!parentConta.tipo_recorrencia || parentConta.tipo_recorrencia === 'mensal') {
            isDueDateActive = true;
          } else if (parentConta.tipo_recorrencia === 'parcelado') {
            const startStr = parentConta.mes_inicio || '2026-09';
            const parts = startStr.split('-');
            const sYear = parseInt(parts[0]) || year;
            const sMonth = (parseInt(parts[1]) || (month + 1)) - 1;

            const diffMonths = (year - sYear) * 12 + (month - sMonth);
            const pAtual = diffMonths + 1;
            const pTotal = parentConta.total_parcelas || 1;

            if (pAtual >= 1 && pAtual <= pTotal) {
              isDueDateActive = true;
              parcelaTagText = `${String(pAtual).padStart(2, '0')}/${pTotal}`;
            }
          }
        }

        let cellContentClass = 'empty';
        let cellText = '';
        let cellTag = '';

        if (apon) {
          cellContentClass = apon.status || 'pendente';
          cellText = formatValorShort(apon.valor);
          cellTag = getTipoPagamentoTag(apon.tipo_pagamento);
          if (parcelaTagText) cellTag += ` (${parcelaTagText})`;
        } else if (subItems.length > 0 && subDayTotal > 0) {
          // Valor Acumulado das Sub-despesas do Cartão
          cellContentClass = (subPaidCount > 0 && subPaidCount === subTotalCount) ? 'pago' : 'pendente';
          cellText = formatValorShort(subDayTotal);
          cellTag = 'ACUM';
        } else if (isDueDateActive) {
          cellContentClass = 'pendente';
          cellText = formatValorShort(parentConta.valor_padrao);
          cellTag = parcelaTagText ? `P.${parcelaTagText}` : 'VENC';
        }

        tbodyHTML += `
          <td class="cell-day ${d.isWeekend ? 'weekend' : ''}" 
              data-conta-id="${parentConta.id}" 
              data-conta-nome="${escapeHTML(parentConta.nome)}"
              data-date-str="${d.dateStr}"
              data-valor-padrao="${(subDayTotal || parentConta.valor_padrao || 0)}">
            <div class="cell-content ${cellContentClass}">
              ${cellText ? `<div>${cellText}</div>` : ''}
              ${cellTag ? `<span class="cell-tag">${cellTag}</span>` : ''}
            </div>
          </td>
        `;
      });

      tbodyHTML += `</tr>`;

      // Render Linhas Filhas (Sub-despesas) se expandido
      if (isExpanded && subItems.length > 0) {
        subItems.forEach(child => {
          let childDataVencDisplay = child.data_vencimento ? formatDateBR(child.data_vencimento) : '-';
          if (!child.data_vencimento && (child.dia_vencimento_fixo || parentConta.dia_vencimento_fixo)) {
            const df = child.dia_vencimento_fixo || parentConta.dia_vencimento_fixo;
            childDataVencDisplay = `${String(df).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
          }

          tbodyHTML += `
            <tr class="tr-sub-conta">
              <td class="td-fixed">
                <div class="sub-conta-indent">
                  <i class="fa-solid fa-turn-up fa-rotate-90"></i>
                  <span class="conta-name" style="font-size: 0.78rem;">${escapeHTML(child.nome)}</span>
                </div>
              </td>
              <td class="td-fixed">
                <div class="conta-desc">${escapeHTML(child.descricao || '-')}</div>
              </td>
              <td class="td-fixed">
                <span class="badge-categoria">${escapeHTML(child.categoria || parentConta.categoria || 'Geral')}</span>
              </td>
              <td class="td-fixed" style="text-align: center;">${childDataVencDisplay}</td>
              <td class="td-fixed" style="text-align: center;">
                <span class="badge-venc-fixo">Dia ${child.dia_vencimento_fixo || parentConta.dia_vencimento_fixo || '-'}</span>
              </td>
              <td class="td-fixed" style="text-align: center;">
                <button class="btn-icon btn-edit-conta" data-id="${child.id}" title="Editar Sub-despesa"><i class="fa-solid fa-pen-to-square"></i></button>
              </td>
          `;

          // Células da Matriz para Sub-despesa
          days.forEach(d => {
            const key = `${child.id}_${d.dateStr}`;
            const apon = apontamentosMap[key];

            if (tipoVal && apon && apon.tipo_pagamento !== tipoVal) {
              tbodyHTML += `<td class="cell-day ${d.isWeekend ? 'weekend' : ''}"></td>`;
              return;
            }

            const targetDiaFixo = child.dia_vencimento_fixo || parentConta.dia_vencimento_fixo;
            let isDueDateActive = (targetDiaFixo === d.dayNumber);

            let cellContentClass = 'empty';
            let cellText = '';
            let cellTag = '';

            if (apon) {
              cellContentClass = apon.status || 'pendente';
              cellText = formatValorShort(apon.valor);
              cellTag = getTipoPagamentoTag(apon.tipo_pagamento);
            } else if (isDueDateActive) {
              cellContentClass = 'pendente';
              cellText = formatValorShort(child.valor_padrao);
              cellTag = 'ITEM';
            }

            tbodyHTML += `
              <td class="cell-day ${d.isWeekend ? 'weekend' : ''}" 
                  data-conta-id="${child.id}" 
                  data-conta-nome="${escapeHTML(child.nome)} (${escapeHTML(parentConta.nome)})"
                  data-date-str="${d.dateStr}"
                  data-valor-padrao="${child.valor_padrao || 0}">
                <div class="cell-content ${cellContentClass}">
                  ${cellText ? `<div>${cellText}</div>` : ''}
                  ${cellTag ? `<span class="cell-tag">${cellTag}</span>` : ''}
                </div>
              </td>
            `;
          });

          tbodyHTML += `</tr>`;
        });
      }
    });

    if (filteredParents.length === 0) {
      tbodyHTML = `<tr><td colspan="${6 + days.length}" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nenhuma conta encontrada para o filtro.</td></tr>`;
    }

    elTbody.innerHTML = tbodyHTML;

    // Attach Header Sort Click Listeners
    document.querySelectorAll('.th-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort-field');
        if (currentSortField === field) {
          currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortField = field;
          currentSortOrder = 'asc';
        }
        renderMatrix();
      });
    });

    // Attach Toggle Sub-items Listeners
    document.querySelectorAll('.btn-toggle-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = btn.getAttribute('data-parent-id');
        expandedParents[pId] = !(expandedParents[pId] !== false);
        renderMatrix();
      });
    });

    // Attach Quick Add Sub-despesa Listeners
    document.querySelectorAll('.btn-add-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = btn.getAttribute('data-parent-id');
        openContaModal(null, pId);
      });
    });

    // Attach Cell Click Events
    document.querySelectorAll('.cell-day').forEach(cell => {
      cell.addEventListener('click', () => {
        const contaId = cell.getAttribute('data-conta-id');
        const contaNome = cell.getAttribute('data-conta-nome');
        const dateStr = cell.getAttribute('data-date-str');
        const valorPadrao = cell.getAttribute('data-valor-padrao');
        if (contaId && dateStr) {
          openAppointmentModal(contaId, contaNome, dateStr, valorPadrao);
        }
      });
    });

    // Attach Edit Conta Click Events
    document.querySelectorAll('.btn-edit-conta').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const contaObj = contas.find(c => String(c.id) === String(id));
        if (contaObj) {
          openContaModal(contaObj);
        }
      });
    });

    // Calculate & Update KPIs
    updateKPIs(filteredContas, apontamentosMap);
  }

  // Update Summary KPI Cards
  function updateKPIs(filteredContas, apontamentosMap) {
    elKpiTotalContas.textContent = `${filteredContas.length} CONTAS`;

    let totalPrevisto = 0;
    let totalPago = 0;
    let countPago = 0;
    let countPendente = 0;
    let countAgendado = 0;
    let countVencidos = 0;

    // Process accounts and cell appointments
    filteredContas.forEach(c => {
      totalPrevisto += (c.valor_padrao || 0);
    });

    apontamentos.forEach(a => {
      if (a.status === 'pago') {
        totalPago += a.valor;
        countPago++;
      } else if (a.status === 'pendente') {
        countPendente++;
      } else if (a.status === 'agendado') {
        countAgendado++;
      } else if (a.status === 'vencido' || a.status === 'duvida') {
        countVencidos++;
      }
    });

    const mediaConta = filteredContas.length > 0 ? (totalPrevisto / filteredContas.length) : 0;

    elKpiTotalValor.textContent = formatCurrency(totalPrevisto);
    elKpiMediaConta.textContent = formatCurrency(mediaConta);
    elKpiDistribuicao.textContent = `${countPago} Pago | ${countPendente} Pend. | ${countAgendado} Agend.`;
    elKpiPendentesVencidos.textContent = `${countPendente + countVencidos}`;
  }

  // --- APPOINTMENT MODAL FUNCTIONS ---
  function openAppointmentModal(contaId, contaNome, dateStr, valorPadrao) {
    activeCellData = { contaId, contaNome, dateStr };

    const key = `${contaId}_${dateStr}`;
    const apon = apontamentos.find(a => String(a.conta_id) === String(contaId) && a.data === dateStr);

    elModalAccountName.textContent = contaNome;
    elModalDateDisplay.textContent = formatDateBR(dateStr);
    elModalContaId.value = contaId;
    elModalDateRaw.value = dateStr;

    if (apon) {
      elModalValor.value = apon.valor;
      elModalStatus.value = apon.status || 'pendente';
      elModalTipoPagamento.value = apon.tipo_pagamento || 'boleto';
      elModalObservacao.value = apon.observacao || '';
      elBtnDeleteAppointment.style.display = 'inline-block';
    } else {
      elModalValor.value = valorPadrao || 0;
      elModalStatus.value = 'pendente';
      elModalTipoPagamento.value = 'boleto';
      elModalObservacao.value = '';
      elBtnDeleteAppointment.style.display = 'none';
    }

    elModalCell.style.display = 'flex';
  }

  function closeAppointmentModal() {
    elModalCell.style.display = 'none';
    activeCellData = null;
  }

  async function saveAppointment() {
    const conta_id = elModalContaId.value;
    const data = elModalDateRaw.value;
    const valor = parseFloat(elModalValor.value) || 0;
    const status = elModalStatus.value;
    const tipo_pagamento = elModalTipoPagamento.value;
    const observacao = elModalObservacao.value;

    try {
      const res = await fetch('/api/apontamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conta_id, data, valor, status, tipo_pagamento, observacao })
      });

      if (!res.ok) throw new Error('Falha ao salvar apontamento');
      closeAppointmentModal();
      await loadData();
    } catch (err) {
      alert('Erro ao salvar apontamento: ' + err.message);
    }
  }

  async function deleteAppointment() {
    if (!confirm('Deseja realmente limpar/remover o apontamento desta célula?')) return;

    const conta_id = elModalContaId.value;
    const data = elModalDateRaw.value;

    try {
      const res = await fetch('/api/apontamentos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conta_id, data })
      });

      if (!res.ok) throw new Error('Falha ao remover apontamento');
      closeAppointmentModal();
      await loadData();
    } catch (err) {
      alert('Erro ao remover apontamento: ' + err.message);
    }
  }

  // --- CONTA MODAL FUNCTIONS ---
  function openContaModal(conta = null, presetParentId = null) {
    // Popular opções do dropdown Conta Pai / Cartão
    let optionsHTML = '<option value="">Nenhuma (Esta é uma Conta Principal / Cartão)</option>';
    const targetId = conta ? String(conta.id) : '';
    contas.filter(c => !c.conta_pai_id && String(c.id) !== targetId).forEach(parent => {
      optionsHTML += `<option value="${parent.id}">${escapeHTML(parent.nome)} (${escapeHTML(parent.categoria || 'Geral')})</option>`;
    });
    elModalContaPaiId.innerHTML = optionsHTML;

    if (conta) {
      elModalContaTitle.textContent = 'Editar Conta / Despesa';
      elModalContaIdInput.value = conta.id;
      elModalContaPaiId.value = conta.conta_pai_id || '';
      elModalContaNome.value = conta.nome;
      elModalContaDescricao.value = conta.descricao || '';
      elModalContaCategoria.value = conta.categoria || 'Geral';
      elModalContaDiaFixo.value = conta.dia_vencimento_fixo || '';
      elModalContaValor.value = conta.valor_padrao || '';
      elModalContaTipoRecorrencia.value = conta.tipo_recorrencia || 'mensal';
      elModalContaTotalParcelas.value = conta.total_parcelas || 20;
      elModalContaMesInicio.value = conta.mes_inicio || '2026-09';
    } else {
      elModalContaTitle.textContent = presetParentId ? 'Nova Sub-despesa' : 'Nova Conta a Pagar';
      elModalContaIdInput.value = '';
      elModalContaPaiId.value = presetParentId || '';
      elModalContaNome.value = '';
      elModalContaDescricao.value = '';
      elModalContaCategoria.value = 'Geral';
      elModalContaDiaFixo.value = '';
      elModalContaValor.value = '';
      elModalContaTipoRecorrencia.value = 'mensal';
      elModalContaTotalParcelas.value = 20;
      elModalContaMesInicio.value = '2026-09';
    }
    elContainerParceladoFields.style.display = (elModalContaTipoRecorrencia.value === 'parcelado') ? 'flex' : 'none';
    elModalConta.style.display = 'flex';
  }

  function closeContaModal() {
    elModalConta.style.display = 'none';
  }

  async function saveConta() {
    const id = elModalContaIdInput.value;
    const conta_pai_id = elModalContaPaiId.value ? parseInt(elModalContaPaiId.value) : null;
    const nome = elModalContaNome.value.trim();
    const descricao = elModalContaDescricao.value.trim();
    const categoria = elModalContaCategoria.value;
    const dia_vencimento_fixo = elModalContaDiaFixo.value ? parseInt(elModalContaDiaFixo.value) : null;
    const valor_padrao = parseFloat(elModalContaValor.value) || 0;
    const tipo_recorrencia = elModalContaTipoRecorrencia.value;
    const total_parcelas = parseInt(elModalContaTotalParcelas.value) || 1;
    const mes_inicio = elModalContaMesInicio.value || '2026-09';

    if (!nome) {
      alert('O nome da conta é obrigatório.');
      return;
    }

    const payload = { 
      conta_pai_id,
      nome, 
      descricao, 
      categoria, 
      dia_vencimento_fixo, 
      valor_padrao,
      tipo_recorrencia,
      total_parcelas,
      mes_inicio
    };

    try {
      let res;
      if (id) {
        res = await fetch(`/api/contas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/contas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error('Erro ao salvar conta');
      closeContaModal();
      await loadData();
    } catch (err) {
      alert('Erro ao salvar conta: ' + err.message);
    }
  }

  // Helper Formatters
  function formatCurrency(val) {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatValorShort(val) {
    if (!val || val === 0) return '';
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace('.', ',') + 'k';
    }
    return Math.round(val).toString();
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getTipoPagamentoTag(tipo) {
    switch (tipo) {
      case 'boleto': return 'BOL';
      case 'cartao': return 'CART';
      case 'debito_conta': return 'DÉB';
      case 'pix': return 'PIX';
      case 'dinheiro': return 'DIN';
      default: return 'BOL';
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
