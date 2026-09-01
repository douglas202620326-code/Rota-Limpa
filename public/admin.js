/* =====================================================================
   ROTA LIMPA — RECIFE
   admin.js — painel de moderação das denúncias
   (protótipo acadêmico: a "senha" abaixo é só para a demonstração,
   não substitui autenticação real / Firestore Security Rules)
   ===================================================================== */

const loginSection = document.getElementById('admin-login');
const painelSection = document.getElementById('admin-painel');
const formLogin = document.getElementById('form-login');
const emailInput = document.getElementById('email-input');
const senhaInput = document.getElementById('senha-input');
const btnEntrar = document.getElementById('btn-entrar');
const loginErro = document.getElementById('login-erro');
const btnLogout = document.getElementById('btn-logout');
const adminUserInfo = document.getElementById('admin-user-info');

function traduzirErroAuth(codigo) {
  switch (codigo) {
    case 'auth/invalid-email':
      return 'E-mail inválido. Verifique o formato digitado.';
    case 'auth/user-disabled':
      return 'Esta conta de administrador foi desativada.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.';
    case 'auth/network-request-failed':
      return 'Erro de conexão com o Firebase. Verifique sua internet.';
    default:
      return 'Erro ao autenticar. Verifique seus dados e tente novamente.';
  }
}

// Submissão do login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErro.hidden = true;
  loginErro.textContent = '';

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) return;

  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Autenticando...';

  try {
    await auth.signInWithEmailAndPassword(email, senha);
    formLogin.reset();
  } catch (erro) {
    console.error('Erro de login:', erro);
    loginErro.textContent = traduzirErroAuth(erro.code);
    loginErro.hidden = false;
    senhaInput.value = '';
    senhaInput.focus();
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar';
  }
});

// Ação de Logout
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await auth.signOut();
    } catch (erro) {
      console.error('Erro ao encerrar sessão:', erro);
    }
  });
}

// Observador do estado de autenticação (protege o acesso ao painel)
auth.onAuthStateChanged((user) => {
  if (user) {
    loginSection.hidden = true;
    painelSection.hidden = false;
    if (adminUserInfo) {
      adminUserInfo.textContent = user.email || 'Admin';
      adminUserInfo.hidden = false;
    }
    if (btnLogout) btnLogout.hidden = false;
    carregarDenuncias();
  } else {
    loginSection.hidden = false;
    painelSection.hidden = true;
    if (adminUserInfo) {
      adminUserInfo.textContent = '';
      adminUserInfo.hidden = true;
    }
    if (btnLogout) btnLogout.hidden = true;
    denunciasCache = [];
    listaEl.innerHTML = '';
  }
});

/* ---------------------------------------------------------------------
   Carregamento e renderização das denúncias
   --------------------------------------------------------------------- */

const listaEl = document.getElementById('admin-lista');
const resumoTotal = document.getElementById('resumo-total');
const resumoPendentes = document.getElementById('resumo-pendentes');
const resumoResolvidas = document.getElementById('resumo-resolvidas');
const filtrosEl = document.getElementById('admin-filtros');
const btnExportarCsv = document.getElementById('btn-exportar-csv');
const btnCarregarMais = document.getElementById('btn-carregar-mais');
const adminPaginacaoEl = document.getElementById('admin-paginacao');

let denunciasCache = []; // [{id, ...dados}]
let filtroAtivo = 'todas';

const LIMITE_PAGINA = 50;
let ultimoDocSnapshot = null;
let temMaisDenuncias = true;
let carregandoPaginacao = false;

async function carregarDenuncias(carregarMais = false) {
  if (carregandoPaginacao) return;
  carregandoPaginacao = true;

  if (!carregarMais) {
    listaEl.innerHTML = `<div class="loading-state">Carregando denúncias...</div>`;
    denunciasCache = [];
    ultimoDocSnapshot = null;
    temMaisDenuncias = true;
    if (adminPaginacaoEl) adminPaginacaoEl.hidden = true;
  } else if (btnCarregarMais) {
    btnCarregarMais.disabled = true;
    btnCarregarMais.textContent = 'Carregando mais...';
  }

  try {
    let query = db.collection('denuncias')
      .orderBy('dataEnvio', 'desc')
      .limit(LIMITE_PAGINA);

    if (carregarMais && ultimoDocSnapshot) {
      query = query.startAfter(ultimoDocSnapshot);
    }

    const snapshot = await query.get();
    const novos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (novos.length > 0) {
      ultimoDocSnapshot = snapshot.docs[snapshot.docs.length - 1];
      const idsExistentes = new Set(denunciasCache.map(d => d.id));
      novos.forEach(item => {
        if (!idsExistentes.has(item.id)) denunciasCache.push(item);
      });
    }

    if (snapshot.docs.length < LIMITE_PAGINA) {
      temMaisDenuncias = false;
    }

    if (adminPaginacaoEl) {
      adminPaginacaoEl.hidden = !temMaisDenuncias;
    }

    atualizarResumo();
    renderLista();
  } catch (erro) {
    console.error('Erro ao carregar denúncias:', erro);
    if (!carregarMais) {
      listaEl.innerHTML = `<div class="empty-state"><strong>Não foi possível carregar as denúncias.</strong>Verifique a conexão e tente novamente.</div>`;
    } else {
      alert('Não foi possível carregar mais denúncias. Tente novamente.');
    }
  } finally {
    carregandoPaginacao = false;
    if (btnCarregarMais) {
      btnCarregarMais.disabled = false;
      btnCarregarMais.textContent = 'Carregar mais denúncias';
    }
  }
}

function atualizarResumo() {
  const total = denunciasCache.length;
  const resolvidas = denunciasCache.filter(d => d.status === 'resolvida').length;
  resumoTotal.textContent = total;
  resumoResolvidas.textContent = resolvidas;
  resumoPendentes.textContent = total - resolvidas;
}

function escapeHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return '';
}

function formatarData(timestamp) {
  if (!timestamp || !timestamp.toDate) return 'Data não disponível';
  return timestamp.toDate().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function renderLista() {
  const filtradas = denunciasCache.filter(d => {
    if (filtroAtivo === 'todas') return true;
    return (d.status || 'pendente') === filtroAtivo;
  });

  if (filtradas.length === 0) {
    listaEl.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma denúncia nesta categoria</strong>
        Assim que novos reports chegarem, eles aparecem aqui.
      </div>`;
    return;
  }

  listaEl.innerHTML = filtradas.map(d => {
    const resolvida = d.status === 'resolvida';
    const fotoSegura = sanitizeUrl(d.foto);
    const fotoResolvidaSegura = sanitizeUrl(d.fotoResolvida);
    const idSeguro = escapeHtml(d.id);
    const descSegura = escapeHtml(d.descricao ? d.descricao : 'Sem descrição adicional.');
    const autorSeguro = escapeHtml(d.autorNome ? d.autorNome : 'Cidadão');
    const obsResolucaoSegura = escapeHtml(d.observacaoResolucao ? d.observacaoResolucao : '');
    const latStr = typeof d.latitude === 'number' ? d.latitude.toFixed(5) : '—';
    const lngStr = typeof d.longitude === 'number' ? d.longitude.toFixed(5) : '—';

    let resolvidoBadge = '';
    if (resolvida) {
      if (d.resolvidoPor === 'autor') {
        resolvidoBadge = '<span style="font-size:0.75rem; color:#1D6B34; font-weight:700; margin-left:6px;">(pelo autor)</span>';
      } else if (d.resolvidoPor === 'admin') {
        resolvidoBadge = '<span style="font-size:0.75rem; color:#1A5276; font-weight:700; margin-left:6px;">(pela Emlurb)</span>';
      }
    }

    let comparativoHtml = '';
    if (resolvida && fotoResolvidaSegura) {
      comparativoHtml = `
        <div class="antes-depois-wrap" style="margin: 10px 0;">
          <div class="antes-depois-grid">
            <div class="antes-depois-item">
              <span class="antes-depois-rotulo rotulo-antes">🚨 Foto Antes (Reportado)</span>
              ${fotoSegura ? `<img src="${fotoSegura}" class="antes-depois-foto" alt="Foto Antes">` : '<div class="sem-foto">Sem foto</div>'}
            </div>
            <div class="antes-depois-item">
              <span class="antes-depois-rotulo rotulo-depois">✨ Foto Depois (Limpeza)</span>
              <img src="${fotoResolvidaSegura}" class="antes-depois-foto" alt="Foto Depois (Limpo)">
            </div>
          </div>
          ${obsResolucaoSegura ? `<p class="obs-resolucao-texto">💬 Observação: "${obsResolucaoSegura}"</p>` : ''}
        </div>
      `;
    }

    return `
      <div class="denuncia-admin-card ${resolvida ? 'resolvida' : ''}" data-id="${idSeguro}">
        ${!fotoResolvidaSegura ? `
          <div class="denuncia-admin-foto">
            ${fotoSegura ? `<img src="${fotoSegura}" alt="Foto da denúncia">` : '<div class="sem-foto">Sem foto</div>'}
          </div>
        ` : ''}
        <div class="denuncia-admin-corpo" ${fotoResolvidaSegura ? 'style="grid-column: 1 / -1;"' : ''}>
          <div class="denuncia-admin-topo">
            <div>
              <span class="status-pill ${resolvida ? 'resolvida' : 'pendente'}">${resolvida ? 'Resolvida' : 'Pendente'}</span>
              ${resolvidoBadge}
            </div>
            <span class="denuncia-admin-data">${escapeHtml(formatarData(d.dataEnvio))}</span>
          </div>
          <p class="denuncia-admin-desc">${descSegura}</p>
          ${comparativoHtml}
          <p class="denuncia-admin-coord" style="margin-bottom:4px;">👤 <strong>Enviado por:</strong> ${autorSeguro}</p>
          <p class="denuncia-admin-coord">📍 <strong>Coord:</strong> ${escapeHtml(latStr)}, ${escapeHtml(lngStr)}</p>
          <div class="denuncia-admin-acoes">
            <button type="button" class="btn ${resolvida ? 'btn-secundario' : 'btn-coral'} btn-toggle-status" data-id="${idSeguro}" data-novo-status="${resolvida ? 'pendente' : 'resolvida'}">
              ${resolvida ? 'Reabrir denúncia' : 'Marcar como resolvida'}
            </button>
            <button type="button" class="btn btn-perigo btn-apagar-denuncia" data-id="${idSeguro}" title="Apagar permanentemente esta denúncia">
              🗑️ Apagar
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

filtrosEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.filtro-btn');
  if (!btn) return;
  filtrosEl.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  filtroAtivo = btn.dataset.filtro;
  renderLista();
});

if (btnCarregarMais) {
  btnCarregarMais.addEventListener('click', () => carregarDenuncias(true));
}

function exportarDenunciasParaCsv() {
  const filtradas = denunciasCache.filter(d => {
    if (filtroAtivo === 'todas') return true;
    return (d.status || 'pendente') === filtroAtivo;
  });

  if (filtradas.length === 0) {
    alert('Nenhuma denúncia encontrada para exportar nesta categoria.');
    return;
  }

  const cabecalho = ['ID', 'Status', 'Resolvido Por', 'Autor', 'Data e Hora', 'Latitude', 'Longitude', 'Descrição', 'URL Foto Inicial', 'URL Foto Limpeza', 'Observação Resolução'];
  const linhas = filtradas.map(d => {
    const dataFormatada = formatarData(d.dataEnvio);
    const descLimpa = (d.descricao || '').replace(/"/g, '""');
    const autorLimpo = (d.autorNome || 'Cidadão').replace(/"/g, '""');
    const resolvidoPorLimpo = (d.resolvidoPor || '—').replace(/"/g, '""');
    const fotoUrl = (d.foto || '').replace(/"/g, '""');
    const fotoResolvidaUrl = (d.fotoResolvida || '').replace(/"/g, '""');
    const obsLimpa = (d.observacaoResolucao || '').replace(/"/g, '""');
    const lat = typeof d.latitude === 'number' ? d.latitude : '';
    const lng = typeof d.longitude === 'number' ? d.longitude : '';

    return [
      `"${d.id}"`,
      `"${d.status || 'pendente'}"`,
      `"${resolvidoPorLimpo}"`,
      `"${autorLimpo}"`,
      `"${dataFormatada}"`,
      `"${lat}"`,
      `"${lng}"`,
      `"${descLimpa}"`,
      `"${fotoUrl}"`,
      `"${fotoResolvidaUrl}"`,
      `"${obsLimpa}"`
    ].join(';');
  });

  const conteudoCsv = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n');
  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `denuncias_rota_limpa_${filtroAtivo}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

if (btnExportarCsv) {
  btnExportarCsv.addEventListener('click', exportarDenunciasParaCsv);
}

listaEl.addEventListener('click', async (e) => {
  // Alterar Status da Denúncia
  const btnToggle = e.target.closest('.btn-toggle-status');
  if (btnToggle) {
    const id = btnToggle.dataset.id;
    const novoStatus = btnToggle.dataset.novoStatus;
    const novoResolvidoPor = novoStatus === 'resolvida' ? 'admin' : null;

    btnToggle.disabled = true;
    btnToggle.textContent = 'Salvando...';

    try {
      await db.collection('denuncias').doc(id).update({
        status: novoStatus,
        resolvidoPor: novoResolvidoPor
      });
      const item = denunciasCache.find(d => d.id === id);
      if (item) {
        item.status = novoStatus;
        item.resolvidoPor = novoResolvidoPor;
      }
      atualizarResumo();
      renderLista();
    } catch (erro) {
      console.error('Erro ao atualizar status:', erro);
      alert('Não foi possível atualizar o status da denúncia. Tente novamente.');
      btnToggle.disabled = false;
      btnToggle.textContent = 'Tentar novamente';
    }
    return;
  }

  // Apagar Denúncia
  const btnApagar = e.target.closest('.btn-apagar-denuncia');
  if (btnApagar) {
    const id = btnApagar.dataset.id;
    if (!id) return;

    const confirmou = window.confirm('Tem certeza que deseja apagar esta denúncia? Essa ação não pode ser desfeita.');
    if (!confirmou) return;

    btnApagar.disabled = true;
    btnApagar.textContent = 'Apagando...';

    try {
      await db.collection('denuncias').doc(id).delete();
      denunciasCache = denunciasCache.filter(d => d.id !== id);
      atualizarResumo();
      renderLista();
    } catch (erro) {
      console.error('Erro ao apagar denúncia:', erro);
      alert('Não foi possível apagar a denúncia. Verifique sua conexão e tente novamente.');
      btnApagar.disabled = false;
      btnApagar.textContent = '🗑️ Apagar';
    }
    return;
  }
});
