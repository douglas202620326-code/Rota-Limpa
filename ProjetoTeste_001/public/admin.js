/* =====================================================================
   ROTA LIMPA — RECIFE
   admin.js — painel de moderação das denúncias
   (protótipo acadêmico: a "senha" abaixo é só para a demonstração,
   não substitui autenticação real / Firestore Security Rules)
   ===================================================================== */

const SENHA_ADMIN = 'emlurb2026';

const loginSection = document.getElementById('admin-login');
const painelSection = document.getElementById('admin-painel');
const formLogin = document.getElementById('form-login');
const senhaInput = document.getElementById('senha-input');
const loginErro = document.getElementById('login-erro');

formLogin.addEventListener('submit', (e) => {
  e.preventDefault();
  if (senhaInput.value === SENHA_ADMIN) {
    loginSection.hidden = true;
    painelSection.hidden = false;
    carregarDenuncias();
  } else {
    loginErro.hidden = false;
    senhaInput.value = '';
    senhaInput.focus();
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

let denunciasCache = []; // [{id, ...dados}]
let filtroAtivo = 'todas';

async function carregarDenuncias() {
  listaEl.innerHTML = `<div class="loading-state">Carregando denúncias...</div>`;
  try {
    const snapshot = await db.collection('denuncias')
      .orderBy('dataEnvio', 'desc')
      .limit(200)
      .get();

    denunciasCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    atualizarResumo();
    renderLista();
  } catch (erro) {
    console.error('Erro ao carregar denúncias:', erro);
    listaEl.innerHTML = `<div class="empty-state"><strong>Não foi possível carregar as denúncias.</strong>Verifique a conexão e tente novamente.</div>`;
  }
}

function atualizarResumo() {
  const total = denunciasCache.length;
  const resolvidas = denunciasCache.filter(d => d.status === 'resolvida').length;
  resumoTotal.textContent = total;
  resumoResolvidas.textContent = resolvidas;
  resumoPendentes.textContent = total - resolvidas;
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
    return `
      <div class="denuncia-admin-card ${resolvida ? 'resolvida' : ''}" data-id="${d.id}">
        <div class="denuncia-admin-foto">
          ${d.foto ? `<img src="${d.foto}" alt="Foto da denúncia">` : '<div class="sem-foto">Sem foto</div>'}
        </div>
        <div class="denuncia-admin-corpo">
          <div class="denuncia-admin-topo">
            <span class="status-pill ${resolvida ? 'resolvida' : 'pendente'}">${resolvida ? 'Resolvida' : 'Pendente'}</span>
            <span class="denuncia-admin-data">${formatarData(d.dataEnvio)}</span>
          </div>
          <p class="denuncia-admin-desc">${d.descricao ? d.descricao : 'Sem descrição adicional.'}</p>
          <p class="denuncia-admin-coord">📍 ${typeof d.latitude === 'number' ? d.latitude.toFixed(5) : '—'}, ${typeof d.longitude === 'number' ? d.longitude.toFixed(5) : '—'}</p>
          <button type="button" class="btn ${resolvida ? 'btn-secundario' : 'btn-coral'} btn-toggle-status" data-id="${d.id}" data-novo-status="${resolvida ? 'pendente' : 'resolvida'}">
            ${resolvida ? 'Reabrir denúncia' : 'Marcar como resolvida'}
          </button>
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

listaEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-toggle-status');
  if (!btn) return;

  const id = btn.dataset.id;
  const novoStatus = btn.dataset.novoStatus;
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    await db.collection('denuncias').doc(id).update({ status: novoStatus });
    const item = denunciasCache.find(d => d.id === id);
    if (item) item.status = novoStatus;
    atualizarResumo();
    renderLista();
  } catch (erro) {
    console.error('Erro ao atualizar status:', erro);
    btn.disabled = false;
    btn.textContent = 'Tentar novamente';
  }
});
