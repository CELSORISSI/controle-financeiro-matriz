// ==========================================================================
// CONTROLE FINANCEIRO - MATRIZ SEMANAL
// ==========================================================================

window.addEventListener('load', function () {

  // ── Estado da Aplicação ──────────────────────────────────────────────────
  var currentDate = new Date();
  var contas = [];
  var apontamentos = [];
  var expandedParents = {};
  var currentSortField = 'nome';
  var currentSortOrder = 'asc';
  var isSavingConta = false;

  // ── Referências DOM ──────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  var elCurrentMonthLabel     = el('current-month-label');
  var elTableMonthBadge       = el('table-month-badge');
  var elBtnPrevMonth          = el('btn-prev-month');
  var elBtnNextMonth          = el('btn-next-month');
  var elBtnToday              = el('btn-today');
  var elSearchInput           = el('search-input');
  var elFilterCategoria       = el('filter-categoria');
  var elFilterTipoPagamento   = el('filter-tipo-pagamento');
  var elThead                 = el('matrix-thead');
  var elTbody                 = el('matrix-tbody');

  // KPIs
  var elKpiTotalContas        = el('kpi-total-contas');
  var elKpiTotalValor         = el('kpi-total-valor');
  var elKpiMediaConta         = el('kpi-media-conta');
  var elKpiDistribuicao       = el('kpi-distribuicao');
  var elKpiPendentesVencidos  = el('kpi-pendentes-vencidos');

  // Modal Apontamento
  var elModalCell             = el('modal-cell-appointment');
  var elModalAccountName      = el('modal-cell-account-name');
  var elModalDateDisplay      = el('modal-cell-date-display');
  var elModalContaId          = el('modal-cell-conta-id');
  var elModalDateRaw          = el('modal-cell-date-raw');
  var elModalValor            = el('modal-cell-valor');
  var elModalStatus           = el('modal-cell-status');
  var elModalTipoPagamento    = el('modal-cell-tipo-pagamento');
  var elModalObservacao       = el('modal-cell-observacao');
  var elBtnSaveAppointment    = el('btn-save-appointment');
  var elBtnDeleteAppointment  = el('btn-delete-appointment');
  var elBtnCloseAppointment   = el('btn-close-appointment');
  var elBtnCancelAppointment  = el('btn-cancel-appointment');

  // Modal Conta
  var elModalConta            = el('modal-conta');
  var elModalContaTitle       = el('modal-conta-title');
  var elModalContaIdInput     = el('modal-conta-id');
  var elModalContaPaiId       = el('modal-conta-pai-id');
  var elModalContaNome        = el('modal-conta-nome');
  var elModalContaDescricao   = el('modal-conta-descricao');
  var elModalContaCategoria   = el('modal-conta-categoria');
  var elModalContaDiaFixo     = el('modal-conta-dia-fixo');
  var elModalContaValor       = el('modal-conta-valor');
  var elModalContaTipoRec     = el('modal-conta-tipo-recorrencia');
  var elModalContaParcelas    = el('modal-conta-total-parcelas');
  var elModalContaMesInicio   = el('modal-conta-mes-inicio');
  var elModalContaDataVenc    = el('modal-conta-data-vencimento');
  var elCtnParcelado          = el('container-parcelado-fields');
  var elCtnNaoRec             = el('container-nao-recorrente-fields');
  var elBtnNovaConta          = el('btn-nova-conta');
  var elBtnSaveConta          = el('btn-save-conta');
  var elBtnCloseConta         = el('btn-close-conta');
  var elBtnCancelConta        = el('btn-cancel-conta');

  // ── Utilitários ───────────────────────────────────────────────────────────
  function formatCurrency(val) {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatValorShort(val) {
    if (!val || val === 0) return '';
    if (val >= 1000) return (val / 1000).toFixed(1).replace('.', ',') + 'k';
    return Math.round(val).toString();
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    var p = dateStr.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : dateStr;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function getTipoPagTag(tipo) {
    var m = { boleto: 'BOL', cartao: 'CART', debito_conta: 'DEB', pix: 'PIX', dinheiro: 'DIN' };
    return m[tipo] || 'BOL';
  }

  function getWeekNumber(d) {
    var dd = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    dd.setUTCDate(dd.getUTCDate() + 4 - (dd.getUTCDay() || 7));
    var ys = new Date(Date.UTC(dd.getUTCFullYear(), 0, 1));
    return Math.ceil((((dd - ys) / 86400000) + 1) / 7);
  }

  // ── Carregamento de Dados ─────────────────────────────────────────────────
  function loadData() {
    var year  = currentDate.getFullYear();
    var month = currentDate.getMonth() + 1;
    var anoMes = year + '-' + String(month).padStart(2, '0');
    var mNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var label  = mNames[currentDate.getMonth()] + ' ' + year;

    if (elCurrentMonthLabel) elCurrentMonthLabel.textContent = label;
    if (elTableMonthBadge)   elTableMonthBadge.textContent   = label;

    Promise.all([
      fetch('/api/contas'),
      fetch('/api/apontamentos?anoMes=' + anoMes)
    ]).then(function(rs) {
      return Promise.all([rs[0].json(), rs[1].json()]);
    }).then(function(data) {
      contas       = Array.isArray(data[0]) ? data[0] : [];
      apontamentos = Array.isArray(data[1]) ? data[1] : [];
      renderMatrix();
    }).catch(function(err) {
      console.error('Erro ao carregar dados:', err);
      contas       = Array.isArray(contas)       ? contas       : [];
      apontamentos = Array.isArray(apontamentos) ? apontamentos : [];
      renderMatrix();
    });
  }

  // ── Renderização da Matriz ────────────────────────────────────────────────
  function renderMatrix() {
    var year      = currentDate.getFullYear();
    var month     = currentDate.getMonth();
    var totalDays = new Date(year, month + 1, 0).getDate();
    var dayNames  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
    var now       = new Date();
    var todayStr  = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    // Construir dias e semanas
    var days = [];
    var weekGroups = [];
    var curWeek = null, curCount = 0;

    for (var d = 1; d <= totalDays; d++) {
      var dObj  = new Date(year, month, d);
      var dow   = dObj.getDay();
      var wNum  = getWeekNumber(dObj);
      var dStr  = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      days.push({ dayNumber: d, dayOfWeek: dow, dayName: dayNames[dow], dateStr: dStr, isWeekend: (dow===0||dow===6) });
      if (curWeek === null) { curWeek = wNum; curCount = 1; }
      else if (curWeek === wNum) { curCount++; }
      else { weekGroups.push({ weekNum: curWeek, count: curCount }); curWeek = wNum; curCount = 1; }
    }
    if (curCount > 0) weekGroups.push({ weekNum: curWeek, count: curCount });

    function sortIcon(field) {
      if (currentSortField !== field) return '<i class="fa-solid fa-sort" style="opacity:0.3;margin-left:4px;font-size:0.7rem"></i>';
      return currentSortOrder === 'asc'
        ? '<i class="fa-solid fa-arrow-down-a-z" style="color:var(--accent-blue);margin-left:4px;font-size:0.75rem"></i>'
        : '<i class="fa-solid fa-arrow-up-z-a"   style="color:var(--accent-blue);margin-left:4px;font-size:0.75rem"></i>';
    }

    // Cabeçalho
    var thead = '<tr>'
      + '<th colspan="5" class="th-fixed-col">Agenda de Contas &amp; Vencimentos</th>'
      + weekGroups.map(function(w){ return '<th colspan="'+w.count+'" class="th-week-group">Sem. '+w.weekNum+'</th>'; }).join('')
      + '</tr><tr>'
      + '<th class="th-fixed-col th-sortable" data-sort-field="nome" style="min-width:150px;cursor:pointer">Despesa '+sortIcon('nome')+'</th>'
      + '<th class="th-fixed-col th-sortable" data-sort-field="categoria" style="min-width:95px;cursor:pointer">Categoria '+sortIcon('categoria')+'</th>'
      + '<th class="th-fixed-col th-sortable" data-sort-field="data_vencimento" style="min-width:75px;cursor:pointer;text-align:center">Data Venc. '+sortIcon('data_vencimento')+'</th>'
      + '<th class="th-fixed-col th-sortable" data-sort-field="dia_vencimento_fixo" style="min-width:65px;cursor:pointer;text-align:center">Dia Fixo '+sortIcon('dia_vencimento_fixo')+'</th>'
      + '<th class="th-fixed-col" style="min-width:55px;text-align:center">Acoes</th>'
      + days.map(function(d){
          var cls = (d.isWeekend ? 'cell-weekend' : '') + (d.dateStr===todayStr ? ' today-column' : '');
          return '<th style="min-width:34px" class="'+cls+'"><div>'+d.dayNumber+'</div><span class="th-day-name">'+d.dayName+'</span></th>';
        }).join('')
      + '</tr>';
    if (elThead) elThead.innerHTML = thead;

    // Filtros
    var searchVal = (elSearchInput && elSearchInput.value) ? elSearchInput.value.toLowerCase().trim() : '';
    var catVal    = (elFilterCategoria && elFilterCategoria.value) ? elFilterCategoria.value : '';
    var tipoVal   = (elFilterTipoPagamento && elFilterTipoPagamento.value) ? elFilterTipoPagamento.value : '';

    // Hierarquia pai/filhos
    var parentContas = [], childrenMap = {};
    (contas||[]).forEach(function(c) {
      if (!c) return;
      if (c.conta_pai_id) {
        if (!childrenMap[c.conta_pai_id]) childrenMap[c.conta_pai_id] = [];
        childrenMap[c.conta_pai_id].push(c);
      } else { parentContas.push(c); }
    });

    // Filtrar
    var filteredParents = parentContas.filter(function(p) {
      if (!p) return false;
      var subs = childrenMap[p.id] || [];
      var pN   = p.nome ? String(p.nome).toLowerCase() : '';
      var pD   = p.descricao ? String(p.descricao).toLowerCase() : '';
      var mPS  = !searchVal || pN.includes(searchVal) || pD.includes(searchVal);
      var mPC  = !catVal || p.categoria === catVal;
      var mSub = subs.some(function(s) {
        var sN = s.nome ? String(s.nome).toLowerCase() : '';
        return (!searchVal || sN.includes(searchVal)) && (!catVal || s.categoria === catVal);
      });
      return (mPS && mPC) || mSub;
    });

    // Ordenar
    filteredParents.sort(function(a, b) {
      var va = a[currentSortField], vb = b[currentSortField];
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'number' && typeof vb === 'number') return currentSortOrder==='asc' ? va-vb : vb-va;
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
      return currentSortOrder==='asc' ? (va<vb?-1:va>vb?1:0) : (va>vb?-1:va<vb?1:0);
    });

    // Mapa de apontamentos
    var aponMap = {};
    (apontamentos||[]).forEach(function(a) { if(a) aponMap[a.conta_id+'_'+a.data] = a; });

    // Montar tbody
    var tbody = '';

    filteredParents.forEach(function(pc) {
      var subs       = childrenMap[pc.id] || [];
      var isExpanded = expandedParents[pc.id] !== false; // expandido por padrão

      var dVDisp = '-';
      if (pc.data_vencimento) { dVDisp = formatDateBR(pc.data_vencimento); }
      else if (pc.dia_vencimento_fixo) {
        dVDisp = String(pc.dia_vencimento_fixo).padStart(2,'0')+'/'+String(month+1).padStart(2,'0')+'/'+year;
      }

      tbody += '<tr class="'+(subs.length>0?'tr-parent-conta accordion-parent-row':'')+'">'
        + '<td class="td-fixed '+(subs.length>0?'td-accordion-toggle':'')+'" data-parent-id="'+pc.id+'">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:0.5rem;padding-right:4px">'
        + '<div class="conta-name">'+escapeHTML(pc.nome)+'</div>'
        + (subs.length>0
          ? '<button class="btn-toggle-sub '+(isExpanded?'expanded':'collapsed')+'" data-parent-id="'+pc.id+'" title="'+(isExpanded?'Recolher':'Expandir')+'">'
            + '<i class="fa-solid fa-chevron-'+(isExpanded?'down':'right')+'"></i>'
            + '<span>'+subs.length+' sub</span></button>'
          : '')
        + '</div></td>'
        + '<td class="td-fixed"><span class="badge-categoria">'+escapeHTML(pc.categoria||'Geral')+'</span></td>'
        + '<td class="td-fixed" style="text-align:center">'+dVDisp+'</td>'
        + '<td class="td-fixed" style="text-align:center"><span class="badge-venc-fixo">Dia '+(pc.dia_vencimento_fixo||'-')+'</span></td>'
        + '<td class="td-fixed" style="text-align:center"><div style="display:inline-flex;align-items:center;gap:3px">'
        + '<button class="btn-add-sub" data-parent-id="'+pc.id+'" title="Adicionar Sub-despesa"><i class="fa-solid fa-plus"></i></button>'
        + '<button class="btn-icon btn-edit-conta" data-id="'+pc.id+'" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>'
        + '</div></td>';

      days.forEach(function(d) {
        var apon    = aponMap[pc.id+'_'+d.dateStr];
        var isToday = d.dateStr === todayStr;
        var diaFixo = pc.dia_vencimento_fixo;
        if (!diaFixo && pc.data_vencimento) { var pp = pc.data_vencimento.split('-'); if (pp[2]) diaFixo = parseInt(pp[2]); }
        if (!diaFixo) diaFixo = 1;

        if (tipoVal && apon && apon.tipo_pagamento !== tipoVal) {
          tbody += '<td class="cell-day'+(d.isWeekend?' weekend':'')+(isToday?' today-column':'')+'"></td>'; return;
        }

        var pTipo = pc.tipo_recorrencia || 'mensal';
        var isDue = false, tagTxt = '';
        if (pTipo==='nao_recorrente') {
          isDue = pc.data_vencimento ? d.dateStr===pc.data_vencimento : false; if (isDue) tagTxt='UNICO';
        } else if (pTipo==='mensal') {
          isDue = (pc.data_vencimento && d.dateStr===pc.data_vencimento) || diaFixo===d.dayNumber;
        } else if (pTipo==='parcelado' && diaFixo===d.dayNumber) {
          var sp = (pc.mes_inicio||'').split('-');
          var sY = parseInt(sp[0])||year, sM = (parseInt(sp[1])||month+1)-1;
          var diff = (year-sY)*12+(month-sM)+1, tot = pc.total_parcelas||1;
          if (diff>=1&&diff<=tot) { isDue=true; tagTxt=String(diff).padStart(2,'0')+'/'+tot; }
        }

        // acumulado subs nesta coluna
        var subTot=0, subPago=0, subN=0;
        subs.forEach(function(s) {
          var sa=aponMap[s.id+'_'+d.dateStr];
          if (sa) { subTot+=sa.valor; if(sa.status==='pago')subPago++; subN++; }
          else { var sdf=s.dia_vencimento_fixo||diaFixo; if(sdf===d.dayNumber){subTot+=(s.valor_padrao||0);subN++;} }
        });

        var ccls='empty', cTxt='', cTag='';
        if (apon) { ccls=apon.status||'pendente'; cTxt=formatValorShort(apon.valor); cTag=getTipoPagTag(apon.tipo_pagamento)+(tagTxt?' ('+tagTxt+')':''); }
        else if (subs.length>0&&subTot>0) { ccls=(subPago>0&&subPago===subN)?'pago':'pendente'; cTxt=formatValorShort(subTot); cTag='ACUM'; }
        else if (isDue) { ccls='pendente'; cTxt=formatValorShort(pc.valor_padrao); cTag=tagTxt||'VENC'; }

        tbody += '<td class="cell-day'+(d.isWeekend?' weekend':'')+(isToday?' today-column':'')+'" data-conta-id="'+pc.id+'" data-conta-nome="'+escapeHTML(pc.nome)+'" data-date-str="'+d.dateStr+'" data-valor-padrao="'+(subTot||pc.valor_padrao||0)+'">'
          + '<div class="cell-content '+ccls+'">'+(cTxt?'<div>'+cTxt+'</div>':'')+(cTag?'<span class="cell-tag">'+cTag+'</span>':'')+'</div></td>';
      });

      tbody += '</tr>';

      // Linhas filhas (acordeão)
      if (isExpanded && subs.length>0) {
        subs.forEach(function(child) {
          var cDf = child.dia_vencimento_fixo || pc.dia_vencimento_fixo;
          var cDV = child.data_vencimento ? formatDateBR(child.data_vencimento)
            : (cDf ? String(cDf).padStart(2,'0')+'/'+String(month+1).padStart(2,'0')+'/'+year : '-');

          tbody += '<tr class="tr-sub-conta">'
            + '<td class="td-fixed"><div class="sub-conta-indent"><i class="fa-solid fa-turn-up fa-rotate-90"></i><span class="conta-name" style="font-size:0.78rem">'+escapeHTML(child.nome)+'</span></div></td>'
            + '<td class="td-fixed"><span class="badge-categoria">'+escapeHTML(child.categoria||pc.categoria||'Geral')+'</span></td>'
            + '<td class="td-fixed" style="text-align:center">'+cDV+'</td>'
            + '<td class="td-fixed" style="text-align:center"><span class="badge-venc-fixo">Dia '+(cDf||'-')+'</span></td>'
            + '<td class="td-fixed" style="text-align:center"><button class="btn-icon btn-edit-conta" data-id="'+child.id+'" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button></td>';

          days.forEach(function(d) {
            var apon    = aponMap[child.id+'_'+d.dateStr];
            var isToday = d.dateStr === todayStr;
            if (tipoVal && apon && apon.tipo_pagamento!==tipoVal) {
              tbody += '<td class="cell-day'+(d.isWeekend?' weekend':'')+(isToday?' today-column':'')+'"></td>'; return;
            }
            var cdf = child.dia_vencimento_fixo || pc.dia_vencimento_fixo || 1;
            if (!cdf && child.data_vencimento) { var pp=child.data_vencimento.split('-'); cdf=parseInt(pp[2])||1; }
            var cTipo = child.tipo_recorrencia||'mensal';
            var isDue=false, tagTxt='';
            if (cTipo==='nao_recorrente') { isDue=child.data_vencimento?d.dateStr===child.data_vencimento:false; if(isDue)tagTxt='UNICO'; }
            else if (cTipo==='mensal') { isDue=(child.data_vencimento&&d.dateStr===child.data_vencimento)||cdf===d.dayNumber; }
            else if (cTipo==='parcelado'&&cdf===d.dayNumber) {
              var sp=(child.mes_inicio||'').split('-'); var sY=parseInt(sp[0])||year; var sM=(parseInt(sp[1])||month+1)-1;
              var diff=(year-sY)*12+(month-sM)+1; var tot=child.total_parcelas||1;
              if(diff>=1&&diff<=tot){isDue=true;tagTxt=String(diff).padStart(2,'0')+'/'+tot;}
            }
            var ccls='empty',cTxt='',cTag='';
            if (apon){ccls=apon.status||'pendente';cTxt=formatValorShort(apon.valor);cTag=getTipoPagTag(apon.tipo_pagamento);}
            else if (isDue){ccls='pendente';cTxt=formatValorShort(child.valor_padrao);cTag=tagTxt||'ITEM';}
            tbody += '<td class="cell-day'+(d.isWeekend?' weekend':'')+(isToday?' today-column':'')+'" data-conta-id="'+child.id+'" data-conta-nome="'+escapeHTML(child.nome)+' ('+escapeHTML(pc.nome)+')" data-date-str="'+d.dateStr+'" data-valor-padrao="'+(child.valor_padrao||0)+'">'
              + '<div class="cell-content '+ccls+'">'+(cTxt?'<div>'+cTxt+'</div>':'')+(cTag?'<span class="cell-tag">'+cTag+'</span>':'')+'</div></td>';
          });

          tbody += '</tr>';
        });
      }
    });

    // Estado vazio
    if (filteredParents.length === 0) {
      tbody = '<tr><td colspan="'+(5+days.length)+'" style="text-align:center;padding:3rem 1.5rem;background:#fff">'
        + '<i class="fa-solid fa-folder-open" style="font-size:2rem;color:#94a3b8;display:block;margin-bottom:0.75rem"></i>'
        + '<div style="font-size:0.95rem;font-weight:600;color:#1e293b;margin-bottom:0.25rem">Nenhuma conta cadastrada</div>'
        + '<div style="font-size:0.8rem;color:#64748b">Clique em <strong>+ Nova Conta</strong> para adicionar a primeira despesa a matriz.</div>'
        + '</td></tr>';
    }

    if (elTbody) elTbody.innerHTML = tbody;

    // Eventos na tabela (re-binding após innerHTML)
    document.querySelectorAll('.th-sortable').forEach(function(th) {
      th.addEventListener('click', function() {
        var f = th.getAttribute('data-sort-field');
        if (currentSortField===f) { currentSortOrder = currentSortOrder==='asc'?'desc':'asc'; }
        else { currentSortField=f; currentSortOrder='asc'; }
        renderMatrix();
      });
    });

    document.querySelectorAll('.btn-toggle-sub').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var pId = btn.getAttribute('data-parent-id');
        expandedParents[pId] = !expandedParents[pId];
        renderMatrix();
      });
    });

    document.querySelectorAll('.td-accordion-toggle').forEach(function(td) {
      td.addEventListener('click', function(e) {
        if (e.target.closest && e.target.closest('button')) return;
        var pId = td.getAttribute('data-parent-id');
        expandedParents[pId] = !expandedParents[pId];
        renderMatrix();
      });
    });

    document.querySelectorAll('.btn-add-sub').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        openContaModal(null, btn.getAttribute('data-parent-id'));
      });
    });

    document.querySelectorAll('.cell-day').forEach(function(cell) {
      cell.addEventListener('click', function() {
        var cId   = cell.getAttribute('data-conta-id');
        var cNome = cell.getAttribute('data-conta-nome');
        var dStr  = cell.getAttribute('data-date-str');
        var vPad  = cell.getAttribute('data-valor-padrao');
        if (cId && dStr) openAppointmentModal(cId, cNome, dStr, vPad);
      });
    });

    document.querySelectorAll('.btn-edit-conta').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var c  = (contas||[]).find(function(x){ return String(x.id)===String(id); });
        if (c) openContaModal(c, null);
      });
    });

    // KPIs
    var totalCount=0, totalPrev=0, cPago=0, cPend=0, cAgend=0, cVenc=0;
    filteredParents.forEach(function(p) {
      totalCount++; totalPrev+=(p.valor_padrao||0);
      (childrenMap[p.id]||[]).forEach(function(s){ totalCount++; totalPrev+=(s.valor_padrao||0); });
    });
    (apontamentos||[]).forEach(function(a) {
      if (!a) return;
      if (a.status==='pago') cPago++;
      else if (a.status==='pendente') cPend++;
      else if (a.status==='agendado') cAgend++;
      else if (a.status==='vencido'||a.status==='duvida') cVenc++;
    });
    if (elKpiTotalContas)       elKpiTotalContas.textContent       = totalCount+' CONTAS';
    if (elKpiTotalValor)        elKpiTotalValor.textContent        = formatCurrency(totalPrev);
    if (elKpiMediaConta)        elKpiMediaConta.textContent        = formatCurrency(totalCount>0?totalPrev/totalCount:0);
    if (elKpiDistribuicao)      elKpiDistribuicao.textContent      = cPago+' Pago | '+cPend+' Pend. | '+cAgend+' Agend.';
    if (elKpiPendentesVencidos) elKpiPendentesVencidos.textContent = String(cPend+cVenc);
  }

  // ── Modal Apontamento ─────────────────────────────────────────────────────
  function openAppointmentModal(contaId, contaNome, dateStr, valorPadrao) {
    var apon = (apontamentos||[]).find(function(a){ return String(a.conta_id)===String(contaId)&&a.data===dateStr; });
    if (elModalAccountName) elModalAccountName.textContent = contaNome;
    if (elModalDateDisplay) elModalDateDisplay.textContent = formatDateBR(dateStr);
    if (elModalContaId)     elModalContaId.value = contaId;
    if (elModalDateRaw)     elModalDateRaw.value  = dateStr;
    if (apon) {
      if (elModalValor)           elModalValor.value           = apon.valor;
      if (elModalStatus)          elModalStatus.value          = apon.status||'pendente';
      if (elModalTipoPagamento)   elModalTipoPagamento.value   = apon.tipo_pagamento||'boleto';
      if (elModalObservacao)      elModalObservacao.value      = apon.observacao||'';
      if (elBtnDeleteAppointment) elBtnDeleteAppointment.style.display = 'inline-block';
    } else {
      if (elModalValor)           elModalValor.value           = valorPadrao||0;
      if (elModalStatus)          elModalStatus.value          = 'pendente';
      if (elModalTipoPagamento)   elModalTipoPagamento.value   = 'boleto';
      if (elModalObservacao)      elModalObservacao.value      = '';
      if (elBtnDeleteAppointment) elBtnDeleteAppointment.style.display = 'none';
    }
    if (elModalCell) elModalCell.style.display = 'flex';
  }

  function closeAppointmentModal() {
    if (elModalCell) elModalCell.style.display = 'none';
  }

  function saveAppointment() {
    var conta_id  = elModalContaId       ? elModalContaId.value           : '';
    var data      = elModalDateRaw        ? elModalDateRaw.value           : '';
    var valor     = parseFloat(elModalValor ? elModalValor.value : 0) || 0;
    var status    = elModalStatus         ? elModalStatus.value            : 'pendente';
    var tipo_pag  = elModalTipoPagamento  ? elModalTipoPagamento.value     : 'boleto';
    var obs       = elModalObservacao     ? elModalObservacao.value        : '';
    fetch('/api/apontamentos', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ conta_id: conta_id, data: data, valor: valor, status: status, tipo_pagamento: tipo_pag, observacao: obs })
    }).then(function(r) {
      if (!r.ok) throw new Error('Falha ao salvar');
      closeAppointmentModal();
      loadData();
    }).catch(function(e) { alert('Erro ao salvar apontamento: '+e.message); });
  }

  function deleteAppointment() {
    if (!confirm('Deseja remover o apontamento desta celula?')) return;
    var conta_id = elModalContaId ? elModalContaId.value : '';
    var data     = elModalDateRaw ? elModalDateRaw.value  : '';
    fetch('/api/apontamentos', {
      method: 'DELETE', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ conta_id: conta_id, data: data })
    }).then(function(r) {
      if (!r.ok) throw new Error('Falha ao remover');
      closeAppointmentModal();
      loadData();
    }).catch(function(e) { alert('Erro ao remover apontamento: '+e.message); });
  }

  // ── Modal Conta ───────────────────────────────────────────────────────────
  function openContaModal(conta, presetParentId) {
    conta          = conta || null;
    presetParentId = presetParentId || null;
    var targetId   = conta ? String(conta.id) : '';
    var opts = '<option value="">Nenhuma (Conta Principal / Cartao)</option>';
    (contas||[]).filter(function(c){ return !c.conta_pai_id && String(c.id)!==targetId; }).forEach(function(p){
      opts += '<option value="'+p.id+'">'+escapeHTML(p.nome)+' ('+escapeHTML(p.categoria||'Geral')+')</option>';
    });
    if (elModalContaPaiId) elModalContaPaiId.innerHTML = opts;

    if (conta) {
      if (elModalContaTitle)     elModalContaTitle.textContent  = 'Editar Conta / Despesa';
      if (elModalContaIdInput)   elModalContaIdInput.value      = conta.id;
      if (elModalContaPaiId)     elModalContaPaiId.value        = conta.conta_pai_id||'';
      if (elModalContaNome)      elModalContaNome.value         = conta.nome||'';
      if (elModalContaDescricao) elModalContaDescricao.value    = conta.descricao||'';
      if (elModalContaCategoria) elModalContaCategoria.value    = conta.categoria||'Geral';
      if (elModalContaDiaFixo)   elModalContaDiaFixo.value      = conta.dia_vencimento_fixo||'';
      if (elModalContaValor)     elModalContaValor.value        = conta.valor_padrao||'';
      if (elModalContaTipoRec)   elModalContaTipoRec.value      = conta.tipo_recorrencia||'mensal';
      if (elModalContaParcelas)  elModalContaParcelas.value     = conta.total_parcelas||20;
      if (elModalContaMesInicio) elModalContaMesInicio.value    = conta.mes_inicio||'';
      if (elModalContaDataVenc)  elModalContaDataVenc.value     = conta.data_vencimento||'';
    } else {
      var nowY = new Date().getFullYear();
      var nowM = String(new Date().getMonth()+1).padStart(2,'0');
      if (elModalContaTitle)     elModalContaTitle.textContent  = presetParentId?'Nova Sub-despesa':'Nova Conta a Pagar';
      if (elModalContaIdInput)   elModalContaIdInput.value      = '';
      if (elModalContaPaiId)     elModalContaPaiId.value        = presetParentId||'';
      if (elModalContaNome)      elModalContaNome.value         = '';
      if (elModalContaDescricao) elModalContaDescricao.value    = '';
      if (elModalContaCategoria) elModalContaCategoria.value    = 'Geral';
      if (elModalContaDiaFixo)   elModalContaDiaFixo.value      = '';
      if (elModalContaValor)     elModalContaValor.value        = '';
      if (elModalContaTipoRec)   elModalContaTipoRec.value      = 'mensal';
      if (elModalContaParcelas)  elModalContaParcelas.value     = 20;
      if (elModalContaMesInicio) elModalContaMesInicio.value    = nowY+'-'+nowM;
      if (elModalContaDataVenc)  elModalContaDataVenc.value     = '';
    }

    var rv = elModalContaTipoRec ? elModalContaTipoRec.value : 'mensal';
    if (elCtnParcelado) elCtnParcelado.style.display = rv==='parcelado'?'flex':'none';
    if (elCtnNaoRec)    elCtnNaoRec.style.display    = rv==='nao_recorrente'?'block':'none';
    if (elModalConta)   elModalConta.style.display   = 'flex';
  }

  function closeContaModal() {
    if (elModalConta) elModalConta.style.display = 'none';
  }

  function saveConta(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (isSavingConta) return;
    isSavingConta = true;

    var id          = elModalContaIdInput ? elModalContaIdInput.value.trim() : '';
    var pai_val     = elModalContaPaiId && elModalContaPaiId.value ? elModalContaPaiId.value : '';
    var conta_pai_id = pai_val ? parseInt(pai_val) : null;
    var nome        = elModalContaNome && elModalContaNome.value ? elModalContaNome.value.trim() : '';
    var descricao   = elModalContaDescricao && elModalContaDescricao.value ? elModalContaDescricao.value.trim() : '';
    var categoria   = elModalContaCategoria && elModalContaCategoria.value ? elModalContaCategoria.value : 'Geral';
    var diaFixo     = elModalContaDiaFixo && elModalContaDiaFixo.value ? parseInt(elModalContaDiaFixo.value) : null;
    var valor_pad   = elModalContaValor && elModalContaValor.value ? parseFloat(elModalContaValor.value) : 0;
    var tipo_rec    = elModalContaTipoRec && elModalContaTipoRec.value ? elModalContaTipoRec.value : 'mensal';
    var parcelas    = elModalContaParcelas && elModalContaParcelas.value ? parseInt(elModalContaParcelas.value) : 1;
    var mes_ini     = elModalContaMesInicio && elModalContaMesInicio.value ? elModalContaMesInicio.value : '';
    var data_venc   = elModalContaDataVenc && elModalContaDataVenc.value ? elModalContaDataVenc.value : null;

    if (!nome) { alert('O nome da conta e obrigatorio.'); isSavingConta=false; return; }

    if (!diaFixo && !data_venc) {
      if (conta_pai_id) {
        var pai = (contas||[]).find(function(c){ return String(c.id)===String(conta_pai_id); });
        diaFixo = (pai && pai.dia_vencimento_fixo) ? pai.dia_vencimento_fixo : 10;
      } else { diaFixo = 10; }
    }

    var payload = {
      conta_pai_id: conta_pai_id, nome: nome, descricao: descricao, categoria: categoria,
      dia_vencimento_fixo: diaFixo, valor_padrao: valor_pad, tipo_recorrencia: tipo_rec,
      total_parcelas: parcelas, mes_inicio: mes_ini, data_vencimento: data_venc
    };

    var url    = id ? '/api/contas/'+id : '/api/contas';
    var method = id ? 'PUT' : 'POST';

    fetch(url, { method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(d){ throw new Error(d.error||'Erro ao salvar conta'); });
      return r;
    })
    .then(function() {
      if (conta_pai_id) expandedParents[conta_pai_id] = true;
      closeContaModal();
      loadData();
    })
    .catch(function(e) { alert('Erro ao salvar conta: '+e.message); })
    .finally(function() { isSavingConta = false; });
  }

  // ── Eventos Globais ────────────────────────────────────────────────────────
  if (elBtnPrevMonth)  elBtnPrevMonth.addEventListener('click', function(){ currentDate.setMonth(currentDate.getMonth()-1); loadData(); });
  if (elBtnNextMonth)  elBtnNextMonth.addEventListener('click', function(){ currentDate.setMonth(currentDate.getMonth()+1); loadData(); });
  if (elBtnToday)      elBtnToday.addEventListener('click',     function(){ currentDate=new Date(); loadData(); });

  if (elSearchInput)         elSearchInput.addEventListener('input',   renderMatrix);
  if (elFilterCategoria)     elFilterCategoria.addEventListener('change', renderMatrix);
  if (elFilterTipoPagamento) elFilterTipoPagamento.addEventListener('change', renderMatrix);

  if (elBtnNovaConta)  elBtnNovaConta.addEventListener('click',  function(e){ e.preventDefault(); openContaModal(null, null); });
  if (elBtnCloseConta) elBtnCloseConta.addEventListener('click',  closeContaModal);
  if (elBtnCancelConta)elBtnCancelConta.addEventListener('click', closeContaModal);
  if (elBtnSaveConta)  elBtnSaveConta.addEventListener('click',   saveConta);

  if (elBtnCloseAppointment)  elBtnCloseAppointment.addEventListener('click',  closeAppointmentModal);
  if (elBtnCancelAppointment) elBtnCancelAppointment.addEventListener('click', closeAppointmentModal);
  if (elBtnSaveAppointment)   elBtnSaveAppointment.addEventListener('click',   saveAppointment);
  if (elBtnDeleteAppointment) elBtnDeleteAppointment.addEventListener('click',  deleteAppointment);

  var elFormConta = el('form-conta');
  if (elFormConta) elFormConta.addEventListener('submit', function(e){ e.preventDefault(); saveConta(e); });

  if (elModalContaTipoRec) {
    elModalContaTipoRec.addEventListener('change', function() {
      var v = elModalContaTipoRec.value;
      if (elCtnParcelado) elCtnParcelado.style.display = v==='parcelado'?'flex':'none';
      if (elCtnNaoRec)    elCtnNaoRec.style.display    = v==='nao_recorrente'?'block':'none';
    });
  }

  // ── INICIAR ────────────────────────────────────────────────────────────────
  loadData();

}); // fim window.addEventListener('load')
