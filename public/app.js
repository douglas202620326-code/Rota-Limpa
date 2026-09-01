/* =====================================================================
   ROTA LIMPA — RECIFE
   app.js — busca de rotas de coleta, envio de denúncias e mapa
   ===================================================================== */

/* ---------------------------------------------------------------------
   0) MENU DE CANTO + MODAL DE DENÚNCIA
   --------------------------------------------------------------------- */

const menuToggle = document.getElementById('menu-toggle');
const menuPainel = document.getElementById('menu-painel');
const menuBackdrop = document.getElementById('menu-backdrop');
const menuFechar = document.getElementById('menu-fechar');
const menuAbrirDenuncia = document.getElementById('menu-abrir-denuncia');
const menuMinhasDenuncias = document.getElementById('menu-minhas-denuncias');
const menuEcopontos = document.getElementById('menu-ecopontos');
const btnEcopontosSobre = document.getElementById('btn-ecopontos-sobre');
const fabDenuncia = document.getElementById('fab-denuncia');
const modalDenunciaBackdrop = document.getElementById('modal-denuncia-backdrop');
const modalDenunciaFechar = document.getElementById('modal-denuncia-fechar');

const modalMinhasDenunciasBackdrop = document.getElementById('modal-minhas-denuncias-backdrop');
const modalMinhasDenunciasFechar = document.getElementById('modal-minhas-denuncias-fechar');
const minhasDenunciasAuthAlerta = document.getElementById('minhas-denuncias-auth-alerta');
const minhasDenunciasLista = document.getElementById('minhas-denuncias-lista');
const btnMinhasGoogle = document.getElementById('btn-minhas-google');
const btnMinhasAnonimo = document.getElementById('btn-minhas-anonimo');

// Elementos do Modal de Guia de Ecopontos (EcoEstações)
const modalEcopontosBackdrop = document.getElementById('modal-ecopontos-backdrop');
const modalEcopontosFechar = document.getElementById('modal-ecopontos-fechar');
const buscaEcopontoInput = document.getElementById('busca-ecoponto');
const rpaFiltrosContainer = document.getElementById('rpa-filtros');
const btnToggleEcopontosMapa = document.getElementById('btn-toggle-ecopontos-mapa');
const textoToggleEcopontos = document.getElementById('texto-toggle-ecopontos');

// Elementos do Modal de Resolução com Foto (Antes e Depois)
const modalResolverBackdrop = document.getElementById('modal-resolver-denuncia-backdrop');
const modalResolverFechar = document.getElementById('modal-resolver-fechar');
const formResolverDenuncia = document.getElementById('form-resolver-denuncia');
const fotoResolvidaInput = document.getElementById('foto-resolvida-input');
const photoResolvidaDrop = document.getElementById('photo-resolvida-drop');
const photoResolvidaPreview = document.getElementById('photo-resolvida-preview');
const photoResolvidaPlaceholder = document.getElementById('photo-resolvida-placeholder');
const obsResolvidaInput = document.getElementById('obs-resolvida-input');
const btnConfirmarResolucao = document.getElementById('btn-confirmar-resolucao');
const btnConcluirSemFoto = document.getElementById('btn-concluir-sem-foto');
const formResolverMsg = document.getElementById('form-resolver-msg');

let denunciaIdParaResolver = null;
let arquivoResolucaoSelecionado = null;

// Elementos de autenticação no modal de denúncia
const authDesconectado = document.getElementById('auth-desconectado');
const authConectado = document.getElementById('auth-conectado');
const authUserNome = document.getElementById('auth-user-nome');
const btnLoginGoogle = document.getElementById('btn-login-google');
const btnLoginAnonimo = document.getElementById('btn-login-anonimo');
const btnAuthLogout = document.getElementById('btn-auth-logout');

function abrirMenu() {
  menuPainel.classList.add('aberto');
  menuBackdrop.classList.add('aberto');
  menuToggle.setAttribute('aria-expanded', 'true');
}
function fecharMenu() {
  menuPainel.classList.remove('aberto');
  menuBackdrop.classList.remove('aberto');
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => {
  menuPainel.classList.contains('aberto') ? fecharMenu() : abrirMenu();
});
menuFechar.addEventListener('click', fecharMenu);
menuBackdrop.addEventListener('click', fecharMenu);

function abrirModalDenuncia() {
  fecharMenu();
  modalDenunciaBackdrop.classList.add('aberto');
  document.body.style.overflow = 'hidden';
  // Lazy load do mapa no modal se ainda não foi inicializado
  inicializarMapaDenuncias();
  setTimeout(() => { if (mapa) mapa.invalidateSize(); }, 50);
}
function fecharModalDenuncia() {
  modalDenunciaBackdrop.classList.remove('aberto');
  document.body.style.overflow = '';
}

function abrirModalMinhasDenuncias() {
  fecharMenu();
  modalMinhasDenunciasBackdrop.classList.add('aberto');
  document.body.style.overflow = 'hidden';
  carregarMinhasDenuncias();
}
function fecharModalMinhasDenuncias() {
  modalMinhasDenunciasBackdrop.classList.remove('aberto');
  document.body.style.overflow = '';
}

function abrirModalResolverDenuncia(denunciaId) {
  fecharMenu();
  denunciaIdParaResolver = denunciaId;
  resetarFotoResolucao();
  if (obsResolvidaInput) obsResolvidaInput.value = '';
  if (formResolverMsg) {
    formResolverMsg.className = 'form-msg';
    formResolverMsg.textContent = '';
  }
  if (modalResolverBackdrop) {
    modalResolverBackdrop.classList.add('aberto');
    document.body.style.overflow = 'hidden';
  }
}

function fecharModalResolverDenuncia() {
  if (modalResolverBackdrop) {
    modalResolverBackdrop.classList.remove('aberto');
    document.body.style.overflow = '';
  }
  denunciaIdParaResolver = null;
  resetarFotoResolucao();
}

function resetarFotoResolucao() {
  if (fotoResolvidaInput) fotoResolvidaInput.value = '';
  arquivoResolucaoSelecionado = null;
  if (photoResolvidaPreview) {
    photoResolvidaPreview.src = '';
    photoResolvidaPreview.style.display = 'none';
  }
  if (photoResolvidaPlaceholder) photoResolvidaPlaceholder.style.display = 'block';
}

function mostrarMensagemResolver(texto, tipo) {
  if (formResolverMsg) {
    formResolverMsg.textContent = texto;
    formResolverMsg.className = `form-msg show ${tipo}`;
  }
}

if (photoResolvidaDrop && fotoResolvidaInput) {
  photoResolvidaDrop.addEventListener('click', () => fotoResolvidaInput.click());

  fotoResolvidaInput.addEventListener('change', () => {
    const arquivo = fotoResolvidaInput.files[0];
    if (!arquivo) return;

    if (!arquivo.type || !arquivo.type.startsWith('image/')) {
      mostrarMensagemResolver('Formato inválido. Envie apenas imagens (JPG/PNG).', 'error');
      resetarFotoResolucao();
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      mostrarMensagemResolver('A imagem é muito grande. Tamanho máximo: 5MB.', 'error');
      resetarFotoResolucao();
      return;
    }

    arquivoResolucaoSelecionado = arquivo;
    const leitor = new FileReader();
    leitor.onload = (e) => {
      if (photoResolvidaPreview) {
        photoResolvidaPreview.src = e.target.result;
        photoResolvidaPreview.style.display = 'block';
      }
      if (photoResolvidaPlaceholder) photoResolvidaPlaceholder.style.display = 'none';
    };
    leitor.readAsDataURL(arquivo);
  });
}

async function processarResolucaoDenuncia(comFoto = true) {
  if (!denunciaIdParaResolver) return;

  if (btnConfirmarResolucao) {
    btnConfirmarResolucao.disabled = true;
    btnConfirmarResolucao.textContent = 'Salvando comprovação...';
  }
  if (btnConcluirSemFoto) btnConcluirSemFoto.disabled = true;

  try {
    let urlFotoResolvida = null;
    if (comFoto && arquivoResolucaoSelecionado) {
      if (btnConfirmarResolucao) btnConfirmarResolucao.textContent = 'Enviando foto da limpeza...';
      urlFotoResolvida = await enviarFotoParaCloudinary(arquivoResolucaoSelecionado);
    }

    const obsTexto = obsResolvidaInput ? obsResolvidaInput.value.trim() : '';

    const payload = {
      status: 'resolvida',
      resolvidoPor: 'autor',
      dataResolucao: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (urlFotoResolvida) {
      payload.fotoResolvida = urlFotoResolvida;
    }
    if (obsTexto) {
      payload.observacaoResolucao = obsTexto;
    }

    await db.collection('denuncias').doc(denunciaIdParaResolver).update(payload);

    mostrarMensagemResolver('✨ Limpeza confirmada com sucesso! Obrigado por colaborar.', 'success');

    setTimeout(() => {
      fecharModalResolverDenuncia();
      carregarDenunciasNoMapa();
      carregarMinhasDenuncias();
      carregarEstatisticasGerais();
    }, 900);

  } catch (erro) {
    console.error('Erro ao resolver denúncia:', erro);
    mostrarMensagemResolver('Não foi possível registrar a resolução. Tente novamente.', 'error');
  } finally {
    if (btnConfirmarResolucao) {
      btnConfirmarResolucao.disabled = false;
      btnConfirmarResolucao.textContent = '✨ Confirmar Limpeza';
    }
    if (btnConcluirSemFoto) btnConcluirSemFoto.disabled = false;
  }
}

if (formResolverDenuncia) {
  formResolverDenuncia.addEventListener('submit', (e) => {
    e.preventDefault();
    processarResolucaoDenuncia(true);
  });
}
if (btnConcluirSemFoto) {
  btnConcluirSemFoto.addEventListener('click', (e) => {
    e.preventDefault();
    processarResolucaoDenuncia(false);
  });
}

menuAbrirDenuncia.addEventListener('click', abrirModalDenuncia);
fabDenuncia.addEventListener('click', abrirModalDenuncia);
modalDenunciaFechar.addEventListener('click', fecharModalDenuncia);
modalDenunciaBackdrop.addEventListener('click', (e) => {
  if (e.target === modalDenunciaBackdrop) fecharModalDenuncia();
});

if (modalResolverFechar) {
  modalResolverFechar.addEventListener('click', fecharModalResolverDenuncia);
}
if (modalResolverBackdrop) {
  modalResolverBackdrop.addEventListener('click', (e) => {
    if (e.target === modalResolverBackdrop) fecharModalResolverDenuncia();
  });
}

if (menuMinhasDenuncias) {
  menuMinhasDenuncias.addEventListener('click', abrirModalMinhasDenuncias);
}
if (modalMinhasDenunciasFechar) {
  modalMinhasDenunciasFechar.addEventListener('click', fecharModalMinhasDenuncias);
}
if (modalMinhasDenunciasBackdrop) {
  modalMinhasDenunciasBackdrop.addEventListener('click', (e) => {
    if (e.target === modalMinhasDenunciasBackdrop) fecharModalMinhasDenuncias();
  });
}

function abrirModalEcopontos() {
  fecharMenu();
  if (modalEcopontosBackdrop) {
    modalEcopontosBackdrop.classList.add('aberto');
    document.body.style.overflow = 'hidden';
    filtrarEcopontos();
  }
}
function fecharModalEcopontos() {
  if (modalEcopontosBackdrop) {
    modalEcopontosBackdrop.classList.remove('aberto');
    document.body.style.overflow = '';
  }
}

if (menuEcopontos) {
  menuEcopontos.addEventListener('click', abrirModalEcopontos);
}
if (btnEcopontosSobre) {
  btnEcopontosSobre.addEventListener('click', abrirModalEcopontos);
}
if (modalEcopontosFechar) {
  modalEcopontosFechar.addEventListener('click', fecharModalEcopontos);
}
if (modalEcopontosBackdrop) {
  modalEcopontosBackdrop.addEventListener('click', (e) => {
    if (e.target === modalEcopontosBackdrop) fecharModalEcopontos();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalResolverBackdrop && modalResolverBackdrop.classList.contains('aberto')) fecharModalResolverDenuncia();
  else if (modalEcopontosBackdrop && modalEcopontosBackdrop.classList.contains('aberto')) fecharModalEcopontos();
  else if (modalDenunciaBackdrop.classList.contains('aberto')) fecharModalDenuncia();
  else if (modalMinhasDenunciasBackdrop && modalMinhasDenunciasBackdrop.classList.contains('aberto')) fecharModalMinhasDenuncias();
  else if (menuPainel.classList.contains('aberto')) fecharMenu();
});

/* ---------------------------------------------------------------------
   0a) GESTÃO DE AUTENTICAÇÃO (Google / Anônimo)
   --------------------------------------------------------------------- */

async function loginComGoogle() {
  console.log('[Auth] Iniciando autenticação com Google...');
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const credencial = await auth.signInWithPopup(provider);
    console.log('[Auth] Login com Google realizado com sucesso:', credencial.user);
  } catch (erro) {
    console.error('[Auth] Erro na autenticação Google:', erro);
    alert(`Erro ao autenticar com Google: ${erro.code ? `[${erro.code}] ` : ''}${erro.message || erro}`);
  }
}

async function loginAnonimo() {
  console.log('[Auth] Iniciando autenticação anônima...');
  try {
    const credencial = await auth.signInAnonymously();
    console.log('[Auth] Login anônimo realizado com sucesso:', credencial.user);
  } catch (erro) {
    console.error('[Auth] Erro no login anônimo:', erro);
    alert(`Erro ao entrar como anônimo: ${erro.code ? `[${erro.code}] ` : ''}${erro.message || erro}`);
  }
}

async function fazerLogout() {
  console.log('[Auth] Encerrando sessão...');
  try {
    await auth.signOut();
    console.log('[Auth] Sessão encerrada com sucesso.');
  } catch (erro) {
    console.error('[Auth] Erro ao sair da conta:', erro);
    alert(`Erro ao sair: ${erro.message || erro}`);
  }
}

function obterNomeUsuario(user) {
  if (!user) return 'Não conectado';
  if (user.isAnonymous) return 'Cidadão Anônimo';
  return user.displayName || user.email || 'Cidadão Conectado';
}

if (btnLoginGoogle) {
  btnLoginGoogle.addEventListener('click', (e) => {
    e.preventDefault();
    loginComGoogle();
  });
}
if (btnLoginAnonimo) {
  btnLoginAnonimo.addEventListener('click', (e) => {
    e.preventDefault();
    loginAnonimo();
  });
}
if (btnAuthLogout) {
  btnAuthLogout.addEventListener('click', (e) => {
    e.preventDefault();
    fazerLogout();
  });
}
if (btnMinhasGoogle) {
  btnMinhasGoogle.addEventListener('click', (e) => {
    e.preventDefault();
    loginComGoogle();
  });
}
if (btnMinhasAnonimo) {
  btnMinhasAnonimo.addEventListener('click', (e) => {
    e.preventDefault();
    loginAnonimo();
  });
}

auth.onAuthStateChanged((user) => {
  console.log('[Auth State] Usuário atual:', user ? `UID: ${user.uid} | Nome: ${obterNomeUsuario(user)}` : 'Desconectado');
  if (user) {
    if (authDesconectado) authDesconectado.style.display = 'none';
    if (authConectado) authConectado.style.display = 'block';
    if (authUserNome) authUserNome.textContent = obterNomeUsuario(user);
    if (minhasDenunciasAuthAlerta) minhasDenunciasAuthAlerta.hidden = true;
  } else {
    if (authDesconectado) authDesconectado.style.display = 'block';
    if (authConectado) authConectado.style.display = 'none';
    if (authUserNome) authUserNome.textContent = '';
    if (minhasDenunciasAuthAlerta) minhasDenunciasAuthAlerta.hidden = false;
  }

  // Recarrega "Minhas Denúncias" se o modal estiver aberto
  if (modalMinhasDenunciasBackdrop && modalMinhasDenunciasBackdrop.classList.contains('aberto')) {
    carregarMinhasDenuncias();
  }

  // Recarrega marcadores do mapa para atualizar botões de resolução do autor
  if (mapaInicializado) {
    carregarDenunciasNoMapa();
  }
});

/* ---------------------------------------------------------------------
   0a-2) AÇÃO: MARCAR COMO RESOLVIDO PELO AUTOR (ABRE MODAL COM FOTO)
   --------------------------------------------------------------------- */

window.marcarComoResolvidoPeloAutor = function(denunciaId) {
  abrirModalResolverDenuncia(denunciaId);
};

/* ---------------------------------------------------------------------
   0a-3) LISTAGEM "MINHAS DENÚNCIAS"
   --------------------------------------------------------------------- */

async function carregarMinhasDenuncias() {
  const user = auth.currentUser;
  if (!user) {
    if (minhasDenunciasAuthAlerta) minhasDenunciasAuthAlerta.hidden = false;
    if (minhasDenunciasLista) {
      minhasDenunciasLista.innerHTML = `
        <div class="empty-state">
          <strong>Identifique-se para ver suas denúncias</strong>
          Conecte-se acima para listar e gerenciar as denúncias enviadas por você.
        </div>
      `;
    }
    return;
  }

  if (minhasDenunciasAuthAlerta) minhasDenunciasAuthAlerta.hidden = true;
  if (minhasDenunciasLista) {
    minhasDenunciasLista.innerHTML = `<div class="loading-state">Buscando suas denúncias...</div>`;
  }

  try {
    const snapshot = await db.collection('denuncias')
      .where('autorId', '==', user.uid)
      .get();

    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Ordenação local por dataEnvio decrescente
    docs.sort((a, b) => {
      const dataA = a.dataEnvio && a.dataEnvio.toMillis ? a.dataEnvio.toMillis() : 0;
      const dataB = b.dataEnvio && b.dataEnvio.toMillis ? b.dataEnvio.toMillis() : 0;
      return dataB - dataA;
    });

    if (docs.length === 0) {
      minhasDenunciasLista.innerHTML = `
        <div class="empty-state">
          <strong>Nenhuma denúncia cadastrada ainda</strong>
          Você não enviou nenhum report de lixo acumulado com esta conta.
        </div>
      `;
      return;
    }

    minhasDenunciasLista.innerHTML = docs.map(d => {
      const resolvida = d.status === 'resolvida';
      const fotoSegura = sanitizeUrl(d.foto);
      const fotoResolvidaSegura = sanitizeUrl(d.fotoResolvida);
      const descSegura = escapeHtml(d.descricao || 'Sem descrição informada.');
      const obsResolucaoSegura = escapeHtml(d.observacaoResolucao || '');
      const dataFormatada = escapeHtml(formatarData(d.dataEnvio));
      const totalApoios = Array.isArray(d.apoios) ? d.apoios.length : 0;
      const jaApoiou = user && Array.isArray(d.apoios) && d.apoios.includes(user.uid);
      const badgeCritico = totalApoios >= 3 ? `<span class="badge-critico">🔥 Chamado Crítico (${totalApoios} apoios)</span>` : '';

      let seloResolucao = '';
      if (resolvida) {
        if (d.resolvidoPor === 'autor') {
          seloResolucao = `<span class="selo-resolvido-autor">✅ Resolvido pelo autor</span>`;
        } else if (d.resolvidoPor === 'admin') {
          seloResolucao = `<span class="selo-resolvido-admin">✅ Resolvido pela Emlurb/Admin</span>`;
        } else {
          seloResolucao = `<span class="selo-resolvido-admin">✅ Resolvido</span>`;
        }
      }

      const botaoAcao = !resolvida
        ? `<button type="button" class="btn-marcar-resolvido" onclick="marcarComoResolvidoPeloAutor('${escapeHtml(d.id)}')">✔️ Marcar como Resolvido</button>`
        : '';

      const botaoApoio = !resolvida
        ? `<button type="button" class="btn-apoiar ${jaApoiou ? 'apoiado' : ''}" onclick="alternarApoioDenuncia('${escapeHtml(d.id)}')">${jaApoiou ? `✅ Você apoiou (${totalApoios})` : `👍 Eu também vi (${totalApoios})`}</button>`
        : '';

      let blocoVisual = '';
      if (resolvida && fotoResolvidaSegura) {
        blocoVisual = `
          <div class="antes-depois-wrap" style="margin-top:8px;">
            <div class="antes-depois-grid">
              <div class="antes-depois-item">
                <span class="antes-depois-rotulo rotulo-antes">🚨 Antes</span>
                ${fotoSegura ? `<img src="${fotoSegura}" class="antes-depois-foto" alt="Foto Antes">` : '<div class="minha-denuncia-sem-foto">Sem foto</div>'}
              </div>
              <div class="antes-depois-item">
                <span class="antes-depois-rotulo rotulo-depois">✨ Depois (Limpo)</span>
                <img src="${fotoResolvidaSegura}" class="antes-depois-foto" alt="Foto Depois (Limpeza)">
              </div>
            </div>
            ${obsResolucaoSegura ? `<p class="obs-resolucao-texto">💬 "${obsResolucaoSegura}"</p>` : ''}
          </div>
        `;
      }

      return `
        <div class="minha-denuncia-card ${resolvida ? 'resolvida' : ''}">
          ${!fotoResolvidaSegura ? `
            <div class="minha-denuncia-foto">
              ${fotoSegura ? `<img src="${fotoSegura}" alt="Foto da denúncia">` : '<div class="minha-denuncia-sem-foto">Sem foto</div>'}
            </div>
          ` : ''}
          <div class="minha-denuncia-corpo" ${fotoResolvidaSegura ? 'style="grid-column: 1 / -1;"' : ''}>
            <div class="minha-denuncia-topo">
              <span class="turno-pill ${resolvida ? 'turno-MANHA' : 'turno-TARDE'}" style="font-size:0.68rem; padding:3px 8px;">
                ${resolvida ? 'Resolvida' : 'Pendente'}
              </span>
              ${badgeCritico}
              <span class="minha-denuncia-data">${dataFormatada}</span>
            </div>
            <p class="minha-denuncia-desc">${descSegura}</p>
            ${blocoVisual}
            <div class="minha-denuncia-acoes">
              ${seloResolucao}
              ${botaoApoio}
              ${botaoAcao}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (erro) {
    console.error('Erro ao carregar minhas denúncias:', erro);
    if (minhasDenunciasLista) {
      minhasDenunciasLista.innerHTML = `
        <div class="empty-state">
          <strong>Não foi possível carregar suas denúncias</strong>
          Verifique sua conexão e tente novamente.
        </div>
      `;
    }
  }
}

/* ---------------------------------------------------------------------
   0b) MODO ESCURO (THEME SWITCHER)
   --------------------------------------------------------------------- */

const btnTema = document.getElementById('btn-tema');
const temaIcone = document.getElementById('tema-icone');
const temaTexto = document.getElementById('tema-texto');

function atualizarBotaoTema() {
  const isEscuro = document.documentElement.classList.contains('tema-escuro');
  if (temaIcone && temaTexto) {
    temaIcone.textContent = isEscuro ? '☀️' : '🌙';
    temaTexto.textContent = isEscuro ? 'Modo claro' : 'Modo escuro';
  }
}

if (btnTema) {
  atualizarBotaoTema();
  btnTema.addEventListener('click', () => {
    const isEscuro = document.documentElement.classList.toggle('tema-escuro');
    localStorage.setItem('rota_limpa_tema', isEscuro ? 'escuro' : 'claro');
    atualizarBotaoTema();
  });
}

/* ---------------------------------------------------------------------
   1) BUSCA DE ROTAS DE COLETA (coleção "rotas" no Firestore)
   --------------------------------------------------------------------- */

const inputBusca = document.getElementById('busca-rua');
const btnBuscar = document.getElementById('btn-buscar');
const resultadosEl = document.getElementById('resultados');
const sugestoesEl = document.getElementById('sugestoes-lista');

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

function normalizar(texto) {
  return texto
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos para comparar
}

function turnoClasse(turno) {
  const t = normalizar(turno || '');
  if (t.includes('MANH')) return 'turno-MANHA';
  if (t.includes('TARD')) return 'turno-TARDE';
  if (t.includes('NOTURN')) return 'turno-NOTURNO';
  return 'turno-DIURNO';
}

function renderCarregando() {
  resultadosEl.innerHTML = `<div class="loading-state">Buscando rotas...</div>`;
}

function renderVazio(termo) {
  resultadosEl.innerHTML = `
    <div class="empty-state">
      <strong>Nenhuma rota encontrada para "${escapeHtml(termo)}"</strong>
      Tente digitar só o nome da rua, sem "Rua" ou número (ex: "Aprígio Alves").
    </div>`;
}

/* ---------------------------------------------------------------------
   1a) INDICADOR "PASSA HOJE?", STATUS DE HORÁRIO E AVISO DE DESCARTE
   --------------------------------------------------------------------- */

const NOMES_DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

function normalizarDiasColeta(diasSemana) {
  if (!diasSemana) return [];
  const txt = normalizar(diasSemana);

  if (txt.includes('DIARIA') || txt.includes('TODOS OS DIAS')) {
    return [1, 2, 3, 4, 5, 6]; // Seg a Sáb
  }
  if (txt.includes('SEGUNDA A SABADO') || txt.includes('SEG A SAB')) {
    return [1, 2, 3, 4, 5, 6];
  }
  if (txt.includes('SEGUNDA A DOMINGO') || txt.includes('SEG A DOM')) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  if (txt.includes('SEGUNDA A SEXTA') || txt.includes('SEG A SEX')) {
    return [1, 2, 3, 4, 5];
  }

  const dias = [];
  if (txt.includes('DOM')) dias.push(0);
  if (txt.includes('SEG')) dias.push(1);
  if (txt.includes('TER')) dias.push(2);
  if (txt.includes('QUA')) dias.push(3);
  if (txt.includes('QUI')) dias.push(4);
  if (txt.includes('SEX')) dias.push(5);
  if (txt.includes('SAB')) dias.push(6);

  return dias;
}

function extrairHorariosFaixa(faixaHorario, turno) {
  let horaInicio = null;
  let horaFim = null;

  if (faixaHorario) {
    const regexHora = /(\d{1,2})[:hH](\d{2})?/g;
    const matches = [...faixaHorario.matchAll(regexHora)];

    if (matches.length >= 1) {
      const h1 = parseInt(matches[0][1], 10);
      const m1 = matches[0][2] ? parseInt(matches[0][2], 10) : 0;
      horaInicio = { hora: h1, minuto: m1 };
    }
    if (matches.length >= 2) {
      const h2 = parseInt(matches[1][1], 10);
      const m2 = matches[1][2] ? parseInt(matches[1][2], 10) : 0;
      horaFim = { hora: h2, minuto: m2 };
    }
  }

  // Fallbacks inteligentes por turno
  if (!horaInicio) {
    const t = normalizar(turno || '');
    if (t.includes('MANH')) {
      horaInicio = { hora: 7, minuto: 0 };
      horaFim = { hora: 15, minuto: 20 };
    } else if (t.includes('TARD')) {
      horaInicio = { hora: 13, minuto: 0 };
      horaFim = { hora: 21, minuto: 0 };
    } else if (t.includes('NOTURN')) {
      horaInicio = { hora: 19, minuto: 0 };
      horaFim = { hora: 23, minuto: 59 };
    } else {
      horaInicio = { hora: 8, minuto: 0 };
      horaFim = { hora: 17, minuto: 0 };
    }
  } else if (!horaFim) {
    horaFim = { hora: (horaInicio.hora + 4) % 24, minuto: horaInicio.minuto };
  }

  return { horaInicio, horaFim };
}

function formatarHoraStr(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ---------------------------------------------------------------------
   1a) CÁLCULO DE STATUS E CONTAGEM REGRESSIVA EM TEMPO REAL
   --------------------------------------------------------------------- */

function calcularStatusTempo(diasSemana, faixaHorario, turno) {
  const agora = new Date();
  const hoje = agora.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  const diasAtivos = normalizarDiasColeta(diasSemana);

  // Extrai horários de início e fim da faixa
  const { horaInicio, horaFim } = extrairHorariosFaixa(faixaHorario, turno);
  const horaInicioStr = formatarHoraStr(horaInicio.hora, horaInicio.minuto);
  const horaFimStr = formatarHoraStr(horaFim.hora, horaFim.minuto);

  // Calcula próximo dia da semana
  let proximoDiaTexto = '';
  for (let offset = 1; offset <= 7; offset++) {
    const proxDia = (hoje + offset) % 7;
    if (diasAtivos.includes(proxDia)) {
      proximoDiaTexto = offset === 1 ? 'Amanhã (' + NOMES_DIAS_SEMANA[proxDia] + ')' : NOMES_DIAS_SEMANA[proxDia];
      break;
    }
  }

  // 1. Se hoje NÃO for dia de coleta
  if (!diasAtivos.includes(hoje)) {
    return {
      status: 'outro_dia',
      subStatus: 'outro_dia',
      badgesHtml: `<span class="badge-hoje proxima-coleta">📅 Próxima coleta: ${proximoDiaTexto || 'Em breve'} às ${horaInicioStr}</span>`
    };
  }

  // Se hoje É dia de coleta:
  const dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), horaInicio.hora, horaInicio.minuto, 0);
  const dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), horaFim.hora, horaFim.minuto, 0);

  if (dataFim < dataInicio) {
    dataFim.setDate(dataFim.getDate() + 1);
  }

  // 2. Se o horário de hoje já tiver terminado (agora > dataFim)
  if (agora > dataFim) {
    return {
      status: 'encerrada',
      subStatus: 'encerrada',
      badgesHtml: `
        <span class="badge-hoje ja-passou">⚠️ Coleta de hoje encerrada às ${horaFimStr}</span>
        <span class="badge-hoje proxima-coleta">📅 Próxima coleta: ${proximoDiaTexto || 'Próxima semana'} às ${horaInicioStr}</span>
      `
    };
  }

  // 3. Se o horário atual estiver dentro da janela de passagem (horaInicio <= agora <= dataFim)
  if (agora >= dataInicio && agora <= dataFim) {
    return {
      status: 'em_andamento',
      subStatus: 'em_andamento',
      badgesHtml: `<span class="badge-hoje em-andamento">🚚 Coleta em andamento agora!</span>`
    };
  }

  // 4. Se for hoje e ainda faltar tempo para começar (agora < dataInicio)
  const diffMs = dataInicio.getTime() - agora.getTime();
  const minutosRestantes = Math.floor(diffMs / (60 * 1000));
  const horasRestantes = Math.floor(minutosRestantes / 60);

  if (minutosRestantes < 60) {
    const minTxt = Math.max(1, minutosRestantes);
    return {
      status: 'passa_hoje',
      subStatus: 'menos_60min',
      badgesHtml: `<span class="badge-hoje alerta-descarte-urgente">⏳ Faltam ${minTxt} minutos para a coleta!</span>`
    };
  } else if (horasRestantes >= 1 && horasRestantes <= 4) {
    const hTxt = horasRestantes === 1 ? '1 hora' : `${horasRestantes} horas`;
    return {
      status: 'passa_hoje',
      subStatus: 'entre_1_4h',
      badgesHtml: `<span class="badge-hoje alerta-descarte">⏳ Coleta hoje às ${horaInicioStr} (em ${hTxt})</span>`
    };
  } else {
    return {
      status: 'passa_hoje',
      subStatus: 'mais_4h',
      badgesHtml: `<span class="badge-hoje passa-hoje">🟢 Coleta hoje às ${horaInicioStr}</span>`
    };
  }
}

// Compatibilidade
function calcularStatusColetaHorario(diasSemana, faixaHorario, turno) {
  return calcularStatusTempo(diasSemana, faixaHorario, turno);
}

function calcularStatusTurnoConsolidado(turnoObj) {
  if (turnoObj.faixasOriginais && turnoObj.faixasOriginais.length > 0) {
    const statusLista = turnoObj.faixasOriginais.map(faixa =>
      calcularStatusTempo(turnoObj.diasSemana, faixa, turnoObj.turno)
    );

    const emAndamento = statusLista.find(s => s.status === 'em_andamento');
    if (emAndamento) return emAndamento;

    const faltamMinutos = statusLista.find(s => s.subStatus === 'menos_60min');
    if (faltamMinutos) return faltamMinutos;

    const faltamHoras = statusLista.find(s => s.subStatus === 'entre_1_4h');
    if (faltamHoras) return faltamHoras;

    const passaHoje = statusLista.find(s => s.status === 'passa_hoje');
    if (passaHoje) return passaHoje;

    const outroDia = statusLista.find(s => s.status === 'outro_dia');
    if (outroDia && statusLista.every(s => s.status === 'outro_dia')) return outroDia;

    return statusLista[0];
  }

  return calcularStatusTempo(turnoObj.diasSemana, turnoObj.faixaHorario, turnoObj.turno);
}

/* ---------------------------------------------------------------------
   AGRUPAMENTO POR LOGRADOURO E CONSOLIDAÇÃO (1 LINHA POR TURNO)
   --------------------------------------------------------------------- */

function agruparRotasPorLogradouro(docs) {
  const mapaLogradouros = new Map();

  for (const item of docs) {
    const r = item.data ? item.data() : item;
    const nomeLogradouro = (r.logradouro || r.endereco || 'Endereço não informado').trim();
    const chaveLogradouro = nomeLogradouro.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (!mapaLogradouros.has(chaveLogradouro)) {
      mapaLogradouros.set(chaveLogradouro, {
        nome: nomeLogradouro,
        mapaTurnos: new Map()
      });
    }

    const grupo = mapaLogradouros.get(chaveLogradouro);
    const turnoOriginal = (r.turno || 'DIURNO').trim();
    const turnoKey = normalizar(turnoOriginal);

    if (!grupo.mapaTurnos.has(turnoKey)) {
      grupo.mapaTurnos.set(turnoKey, {
        turno: turnoOriginal,
        faixasSet: new Set(),
        diasSet: new Set(),
        rotas: []
      });
    }

    const turnoGrupo = grupo.mapaTurnos.get(turnoKey);
    turnoGrupo.rotas.push(r);

    if (r.faixaHorario && r.faixaHorario.trim() && r.faixaHorario.trim() !== '—') {
      turnoGrupo.faixasSet.add(r.faixaHorario.trim());
    }
    if (r.diasSemana && r.diasSemana.trim() && r.diasSemana.trim() !== '—') {
      turnoGrupo.diasSet.add(r.diasSemana.trim());
    }
  }

  return Array.from(mapaLogradouros.values()).map(g => {
    const turnosConsolidados = Array.from(g.mapaTurnos.values()).map(t => {
      const faixasArray = Array.from(t.faixasSet);
      const diasArray = Array.from(t.diasSet);

      const faixaTexto = faixasArray.length > 0 ? faixasArray.join(' / ') : 'Horário regular do turno';
      const diasTexto = diasArray.length > 0 ? diasArray.join(' / ') : 'Diária';

      return {
        turno: t.turno,
        faixaHorario: faixaTexto,
        diasSemana: diasTexto,
        faixasOriginais: faixasArray,
        diasOriginais: diasArray,
        primeiraRota: t.rotas[0]
      };
    });

    return {
      nome: g.nome,
      turnos: turnosConsolidados
    };
  });
}

function calcularStatusTurnoConsolidado(turnoObj) {
  if (turnoObj.faixasOriginais && turnoObj.faixasOriginais.length > 0) {
    const statusLista = turnoObj.faixasOriginais.map(faixa =>
      calcularStatusColetaHorario(turnoObj.diasSemana, faixa, turnoObj.turno)
    );

    const emAndamento = statusLista.find(s => s.status === 'em_andamento');
    if (emAndamento) return emAndamento;

    const passaHoje = statusLista.find(s => s.status === 'passa_hoje');
    if (passaHoje) return passaHoje;

    const outroDia = statusLista.find(s => s.status === 'outro_dia');
    if (outroDia && statusLista.every(s => s.status === 'outro_dia')) return outroDia;

    return statusLista[0];
  }

  return calcularStatusColetaHorario(turnoObj.diasSemana, turnoObj.faixaHorario, turnoObj.turno);
}

function renderResultados(docs) {
  resultadosEl.innerHTML = '';
  const todosGrupos = agruparRotasPorLogradouro(docs);

  // Aplica o filtro de turno sobre os turnos de cada rua
  const gruposFiltrados = todosGrupos.map(g => {
    let turnosFiltrados = g.turnos;
    if (filtroTurnoAtivo !== 'todos') {
      turnosFiltrados = g.turnos.filter(t => turnoClasse(t.turno) === `turno-${filtroTurnoAtivo}`);
    }
    return {
      ...g,
      turnos: turnosFiltrados
    };
  }).filter(g => g.turnos.length > 0).slice(0, 6);

  if (gruposFiltrados.length === 0) {
    resultadosEl.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma rota encontrada para os filtros selecionados</strong>
        Tente alternar o filtro de turno acima para "Todos" ou verificar o termo digitado.
      </div>`;
    return;
  }

  resultadosEl.innerHTML = gruposFiltrados.map(grupo => {
    const nomeEsc = escapeHtml(grupo.nome);

    const statusTurnos = grupo.turnos.map(t => {
      const statusObj = calcularStatusTurnoConsolidado(t);
      return { turnoItem: t, ...statusObj };
    });

    const turnoPrincipal = statusTurnos.find(s => s.status === 'em_andamento')
      || statusTurnos.find(s => s.status === 'passa_hoje')
      || statusTurnos[0];

    const tPrincipal = turnoPrincipal.turnoItem;
    const endAttr = encodeURIComponent(grupo.nome);
    const turnoAttr = encodeURIComponent(tPrincipal.turno);
    const diasAttr = encodeURIComponent(tPrincipal.diasSemana);
    const faixaAttr = encodeURIComponent(tPrincipal.faixaHorario);

    const turnosNomes = grupo.turnos.map(t => t.turno).join(' &middot; ');

    const linhasTurnosHtml = statusTurnos.map(({ turnoItem: t, badgesHtml }) => {
      return `
        <div class="janela-coleta-row">
          <div class="janela-col-turno">
            <span class="turno-pill ${turnoClasse(t.turno)}">${escapeHtml(t.turno)}</span>
          </div>
          <div class="janela-col-info">
            <div class="janela-dias-horario">
              <span class="janela-dias"><b>Dias:</b> ${escapeHtml(t.diasSemana)}</span>
              <span class="janela-faixa"><b>Horário estimado:</b> ${escapeHtml(t.faixaHorario)}</span>
            </div>
            <div class="ticket-status-badges">
              ${badgesHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card-logradouro">
        <div class="card-logradouro-topo">
          <div class="card-logradouro-info">
            <span class="card-logradouro-tag">📍 Logradouro</span>
            <h3 class="card-logradouro-nome">${nomeEsc}</h3>
            <span class="card-logradouro-total">Turno(s): ${turnosNomes}</span>
          </div>
        </div>
        <div class="card-logradouro-janelas">
          ${linhasTurnosHtml}
        </div>
        <div class="card-logradouro-rodape">
          <button type="button" class="btn-agenda" onclick="abrirMenuLembrete(this, decodeURIComponent('${endAttr}'), decodeURIComponent('${turnoAttr}'), decodeURIComponent('${diasAttr}'), decodeURIComponent('${faixaAttr}'))">
            📅 Criar Lembrete na Agenda
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ---------------------------------------------------------------------
   1a-2) GERADOR DE LEMBRETES NA AGENDA (Google Calendar & .ICS)
   --------------------------------------------------------------------- */

function converterDiasParaGoogleBYDAY(diasSemana) {
  if (!diasSemana) return 'MO,WE,FR';
  const normalizado = normalizar(diasSemana);
  const mapaDias = {
    'SEG': 'MO',
    'TER': 'TU',
    'QUA': 'WE',
    'QUI': 'TH',
    'SEX': 'FR',
    'SAB': 'SA',
    'DOM': 'SU'
  };
  const encontrados = [];
  for (const [chave, val] of Object.entries(mapaDias)) {
    if (normalizado.includes(chave)) {
      encontrados.push(val);
    }
  }
  return encontrados.length > 0 ? encontrados.join(',') : 'MO,WE,FR';
}

function obterHorariosTurno(turno) {
  const t = normalizar(turno || '');
  if (t.includes('MANH')) return { start: '070000', end: '090000' };
  if (t.includes('TARD')) return { start: '130000', end: '150000' };
  if (t.includes('NOTURN')) return { start: '190000', end: '210000' };
  return { start: '080000', end: '100000' };
}

function gerarGoogleCalendarUrl(endereco, turno, diasSemana, faixaHorario) {
  const byDay = converterDiasParaGoogleBYDAY(diasSemana);
  const { start, end } = obterHorariosTurno(turno);

  const agora = new Date();
  const yyyy = agora.getFullYear();
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const dd = String(agora.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const title = encodeURIComponent('🚛 Coleta de Lixo — Rota Limpa Recife');
  const details = encodeURIComponent(
    `Lembrete para colocar o lixo para fora!\nEndereço: ${endereco}\nTurno: ${turno} (${faixaHorario})\nDias da coleta: ${diasSemana}\n\nConsulte suas rotas em Rota Limpa Recife.`
  );
  const location = encodeURIComponent(`${endereco}, Recife - PE, Brasil`);
  const dates = `${dateStr}T${start}/${dateStr}T${end}`;
  const recur = encodeURIComponent(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&recur=${recur}`;
}

function baixarArquivoICS(endereco, turno, diasSemana, faixaHorario) {
  const byDay = converterDiasParaGoogleBYDAY(diasSemana);
  const { start, end } = obterHorariosTurno(turno);

  const agora = new Date();
  const yyyy = agora.getFullYear();
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const dd = String(agora.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const uid = 'rota-limpa-' + Date.now() + '@rotalimpa.recife';
  const dtstamp = agora.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rota Limpa Recife//Coleta de Lixo//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/Recife:${dateStr}T${start}`,
    `DTEND;TZID=America/Recife:${dateStr}T${end}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
    'SUMMARY:🚛 Coleta de Lixo - Rota Limpa Recife',
    `DESCRIPTION:Colocar o lixo para fora na rua: ${endereco}\\nTurno: ${turno} (${faixaHorario})\\nDias: ${diasSemana}`,
    `LOCATION:${endereco}\\, Recife - PE`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'DESCRIPTION:Lembrete de Coleta de Lixo',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `coleta_lixo_${normalizar(endereco).replace(/[^A-Z0-9]/g, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

let popoverAgendaAtivo = null;

function fecharPopoverAgenda() {
  if (popoverAgendaAtivo) {
    popoverAgendaAtivo.remove();
    popoverAgendaAtivo = null;
  }
}

window.abrirMenuLembrete = function(btnElement, endereco, turno, diasSemana, faixaHorario) {
  fecharPopoverAgenda();

  const googleUrl = gerarGoogleCalendarUrl(endereco, turno, diasSemana, faixaHorario);

  const popover = document.createElement('div');
  popover.className = 'agenda-popover';
  popover.innerHTML = `
    <a href="${googleUrl}" target="_blank" rel="noopener noreferrer" class="agenda-link-btn" onclick="fecharPopoverAgenda()">
      📅 Adicionar ao Google Calendar
    </a>
    <button type="button" class="agenda-link-btn" id="btn-baixar-ics-popover">
      📥 Baixar para Apple / Outlook (.ics)
    </button>
  `;

  document.body.appendChild(popover);

  const rect = btnElement.getBoundingClientRect();
  popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
  popover.style.left = `${Math.max(10, rect.left + window.scrollX)}px`;

  popover.querySelector('#btn-baixar-ics-popover').addEventListener('click', () => {
    baixarArquivoICS(endereco, turno, diasSemana, faixaHorario);
    fecharPopoverAgenda();
  });

  popoverAgendaAtivo = popover;
};

document.addEventListener('click', (e) => {
  if (popoverAgendaAtivo && !popoverAgendaAtivo.contains(e.target) && !e.target.closest('.btn-agenda')) {
    fecharPopoverAgenda();
  }
});

/* ---------------------------------------------------------------------
   1b) MAPA PRINCIPAL INTEGRADO (Setores + Denúncias + EcoPontos)
   Fica sempre visível na página principal e reage às buscas e filtros.
   --------------------------------------------------------------------- */

const mapaResultadoWrap = document.getElementById('mapa-resultado-wrap');
let mapaPrincipal = null;
let camadaSetoresPrincipal = null;
let camadaDenunciasPrincipal = null;
let camadaEcopontosPrincipal = null;
let marcadoresBuscaPrincipal = [];
let ecopontosPrincipalVisiveis = false;
let filtroMapaPrincipal = 'todas';

function obterMapaResultado() {
  if (mapaPrincipal) return mapaPrincipal;
  const container = document.getElementById('mapa-resultado');
  if (!container) return null;

  mapaPrincipal = L.map('mapa-resultado', { scrollWheelZoom: false }).setView([RECIFE_LAT, RECIFE_LNG], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapaPrincipal);

  camadaSetoresPrincipal = L.layerGroup().addTo(mapaPrincipal);
  camadaDenunciasPrincipal = L.layerGroup().addTo(mapaPrincipal);
  camadaEcopontosPrincipal = L.layerGroup();

  carregarSetoresNoMapaPrincipal();
  montarCamadaEcopontosPrincipal();
  adicionarLegendaTurnosNoMapa(mapaPrincipal);

  return mapaPrincipal;
}

function inicializarMapaPrincipal() {
  obterMapaResultado();
  if (denunciasMapaCache.length > 0) {
    renderizarDenunciasMapaPrincipal();
  }
}

async function carregarSetoresNoMapaPrincipal() {
  if (!mapaPrincipal || !camadaSetoresPrincipal) return;
  try {
    const setores = await obterSetoresCache();
    camadaSetoresPrincipal.clearLayers();

    setores.forEach(s => {
      const cor = corDoTurno(s.turnoPredominante);
      const raio = 90 + Math.min(s.totalRuas, 40) * 6;

      const circulo = L.circle([s.lat, s.lng], {
        radius: raio,
        color: cor,
        weight: 1.5,
        fillColor: cor,
        fillOpacity: 0.3
      });

      const listaRuas = s.ruas.slice(0, 6).map(r => `<li>${escapeHtml(r)}</li>`).join('');
      circulo.bindPopup(`
        <strong>Setor ${escapeHtml(s.setor)}</strong> — RPA ${escapeHtml(s.rpa)}<br>
        <span style="color:${cor}; font-weight:700;">Turno: ${escapeHtml(s.turnoPredominante)}</span>
        &middot; ${escapeHtml(s.totalRuas)} rua(s)
        <ul style="margin:6px 0 0; padding-left:16px; font-size:0.82rem;">${listaRuas}</ul>
      `);

      circulo.on('click', () => {
        if (inputBusca) {
          inputBusca.value = s.setor;
          buscarRota(s.ruas[0] || s.setor);
        }
      });

      camadaSetoresPrincipal.addLayer(circulo);
    });
  } catch (erro) {
    console.error('Erro ao carregar setores no mapa principal:', erro);
  }
}

function montarCamadaEcopontosPrincipal() {
  if (!camadaEcopontosPrincipal) return;
  camadaEcopontosPrincipal.clearLayers();

  ECOESTACOES_RECIFE.forEach(eco => {
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(eco.nome + ', ' + eco.endereco + ', Recife - PE')}`;
    const popupHtml = `
      <div style="min-width:190px;">
        <strong style="color:#1F8F58; font-size:0.95rem;">♻️ ${escapeHtml(eco.nome)}</strong><br>
        <span style="font-size:0.75rem; background:#FFC93C; color:#111; padding:1px 6px; border-radius:10px; font-weight:700;">${escapeHtml(eco.rpa)}</span><br>
        <p style="margin:6px 0 4px; font-size:0.85rem;">📍 <strong>${escapeHtml(eco.bairro)}:</strong> ${escapeHtml(eco.endereco)}</p>
        <p style="margin:0 0 6px; font-size:0.78rem; color:#516358;">⏰ ${escapeHtml(eco.horario)}</p>
        <a href="${mapsUrl}" target="_blank" rel="noopener" style="display:inline-block; font-size:0.8rem; font-weight:700; color:#2E9CCA; text-decoration:underline;">📍 Abrir no Google Maps</a>
      </div>
    `;
    const marker = L.marker([eco.lat, eco.lng], { icon: iconeEcopontoLeaflet() })
      .bindPopup(popupHtml);
    camadaEcopontosPrincipal.addLayer(marker);
  });
}

function renderizarDenunciasMapaPrincipal() {
  if (!mapaPrincipal || !camadaDenunciasPrincipal) return;
  camadaDenunciasPrincipal.clearLayers();

  const uidAtual = auth.currentUser ? auth.currentUser.uid : null;

  const denunciasFiltradas = denunciasMapaCache.filter(d => {
    if (filtroMapaPrincipal === 'todas') return true;
    return (d.status || 'pendente') === filtroMapaPrincipal;
  });

  denunciasFiltradas.forEach(d => {
    const id = d.id;
    if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
      const fotoSegura = sanitizeUrl(d.foto);
      const fotoResolvidaSegura = sanitizeUrl(d.fotoResolvida);
      const resolvida = d.status === 'resolvida';
      const isAutor = uidAtual && uidAtual === d.autorId;

      let seloResolucao = '';
      if (resolvida) {
        if (d.resolvidoPor === 'autor') {
          seloResolucao = `<span class="selo-resolvido-autor">✅ Resolvido pelo autor</span>`;
        } else if (d.resolvidoPor === 'admin') {
          seloResolucao = `<span class="selo-resolvido-admin">✅ Resolvido pela Emlurb/Admin</span>`;
        } else {
          seloResolucao = `<span class="selo-resolvido-admin">✅ Resolvido</span>`;
        }
      }

      let botaoAcao = '';
      if (!resolvida && isAutor) {
        botaoAcao = `<br><button type="button" class="btn-marcar-resolvido" onclick="marcarComoResolvidoPeloAutor('${escapeHtml(id)}')">✔️ Marcar como Resolvido</button>`;
      }

      let comparativoFotos = '';
      if (resolvida && fotoResolvidaSegura) {
        comparativoFotos = `
          <div class="antes-depois-wrap">
            <div class="antes-depois-grid">
              <div class="antes-depois-item">
                <span class="antes-depois-rotulo rotulo-antes">🚨 Antes</span>
                ${fotoSegura ? `<img src="${fotoSegura}" class="antes-depois-foto" alt="Foto Antes">` : ''}
              </div>
              <div class="antes-depois-item">
                <span class="antes-depois-rotulo rotulo-depois">✨ Depois</span>
                <img src="${fotoResolvidaSegura}" class="antes-depois-foto" alt="Foto Depois (Limpo)">
              </div>
            </div>
            ${d.observacaoResolucao ? `<p class="obs-resolucao-texto">💬 "${escapeHtml(d.observacaoResolucao)}"</p>` : ''}
          </div>
        `;
      } else if (fotoSegura) {
        comparativoFotos = `<br><img src="${fotoSegura}" style="width:160px; max-height:120px; object-fit:cover; border-radius:6px; margin-top:6px;">`;
      }

      const totalApoios = Array.isArray(d.apoios) ? d.apoios.length : 0;
      const jaApoiou = uidAtual && Array.isArray(d.apoios) && d.apoios.includes(uidAtual);
      const badgeCritico = totalApoios >= 3 ? `<div style="margin-top:4px;"><span class="badge-critico">🔥 Chamado Crítico (${totalApoios} apoios)</span></div>` : '';

      let botaoApoio = '';
      if (!resolvida) {
        botaoApoio = `
          <button type="button" class="btn-apoiar ${jaApoiou ? 'apoiado' : ''}" onclick="alternarApoioDenuncia('${escapeHtml(id)}')">
            ${jaApoiou ? `✅ Você apoiou (${totalApoios})` : `👍 Eu também vi (${totalApoios})`}
          </button>
        `;
      }

      const popupHtml = `
        <div class="popup-denuncia-card">
          <strong>Denúncia da comunidade</strong>
          ${resolvida ? ' <span style="color:#1D6B34; font-weight:700;">(resolvida)</span>' : ''}<br>
          ${escapeHtml(d.descricao ? d.descricao : 'Sem descrição adicional.')}
          ${badgeCritico}
          ${comparativoFotos}
          <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
            ${seloResolucao}
            ${botaoApoio}
            ${botaoAcao}
          </div>
        </div>
      `;

      const marker = L.marker([d.latitude, d.longitude], { icon: iconeDenunciaPorStatus(d.status) })
        .bindPopup(popupHtml);
      camadaDenunciasPrincipal.addLayer(marker);
    }
  });
}

function adicionarLegendaTurnosNoMapa(instanciaMapa) {
  if (!instanciaMapa) return;
  const legenda = L.control({ position: 'bottomright' });
  legenda.onAdd = function () {
    const div = L.DomUtil.create('div', 'legenda-turnos');
    div.innerHTML = `
      <strong>Turno predominante</strong>
      ${Object.entries(CORES_TURNO).map(([turno, cor]) => `
        <div class="legenda-item">
          <span class="legenda-dot" style="background:${cor};"></span>${turno.charAt(0)}${turno.slice(1).toLowerCase()}
        </div>
      `).join('')}
      <div class="legenda-obs">Áreas por setor (Emlurb).</div>
    `;
    return div;
  };
  legenda.addTo(instanciaMapa);
}

async function mostrarMapaResultado(docs) {
  const m = obterMapaResultado();
  if (!m) return;

  const setoresInfo = await obterSetoresCache();
  const bySetor = new Map(setoresInfo.map(s => [s.setor, s]));

  const setoresDosResultados = [...new Set(docs.map(d => (d.data ? d.data() : d).setor))]
    .map(setor => bySetor.get(setor))
    .filter(Boolean);

  marcadoresBuscaPrincipal.forEach(marc => m.removeLayer(marc));
  marcadoresBuscaPrincipal = [];

  if (setoresDosResultados.length === 0) return;

  setoresDosResultados.forEach(s => {
    const cor = corDoTurno(s.turnoPredominante);
    const marcador = L.circleMarker([s.lat, s.lng], {
      radius: 14,
      color: '#111814',
      weight: 3,
      fillColor: cor,
      fillOpacity: 0.95
    }).addTo(m);
    marcador.bindPopup(`<strong>📍 Rota Encontrada: Setor ${escapeHtml(s.setor)}</strong><br>Turno: ${escapeHtml(s.turnoPredominante)} &middot; ${escapeHtml(s.totalRuas)} rua(s) no setor`);
    marcadoresBuscaPrincipal.push(marcador);
  });

  if (setoresDosResultados.length === 1) {
    m.setView([setoresDosResultados[0].lat, setoresDosResultados[0].lng], 15);
    if (marcadoresBuscaPrincipal[0]) marcadoresBuscaPrincipal[0].openPopup();
  } else {
    const grupo = L.featureGroup(marcadoresBuscaPrincipal);
    m.fitBounds(grupo.getBounds().pad(0.3));
  }
}

// Filtros do Mapa Principal
const mapaPrincipalFiltrosContainer = document.getElementById('mapa-principal-filtros');
if (mapaPrincipalFiltrosContainer) {
  mapaPrincipalFiltrosContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.mapa-filtro-btn');
    if (!btn) return;
    mapaPrincipalFiltrosContainer.querySelectorAll('.mapa-filtro-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroMapaPrincipal = btn.dataset.filtroMapa;
    renderizarDenunciasMapaPrincipal();
  });
}

const btnToggleEcopontosPrincipal = document.getElementById('btn-toggle-ecopontos-principal');
const textoToggleEcopontosPrincipal = document.getElementById('texto-toggle-ecopontos-principal');

if (btnToggleEcopontosPrincipal) {
  btnToggleEcopontosPrincipal.addEventListener('click', () => {
    const m = obterMapaResultado();
    if (!m || !camadaEcopontosPrincipal) return;

    ecopontosPrincipalVisiveis = !ecopontosPrincipalVisiveis;
    btnToggleEcopontosPrincipal.classList.toggle('ativo', ecopontosPrincipalVisiveis);
    if (textoToggleEcopontosPrincipal) {
      textoToggleEcopontosPrincipal.textContent = ecopontosPrincipalVisiveis ? 'Ocultar EcoPontos' : 'Mostrar EcoPontos';
    }

    if (ecopontosPrincipalVisiveis) {
      camadaEcopontosPrincipal.addTo(m);
    } else {
      m.removeLayer(camadaEcopontosPrincipal);
    }
  });
}

/* ---------------------------------------------------------------------
   LISTA LOCAL DE LOGRADOUROS (ruas.json) & AUTOCOMPLETE INSTANTÂNEO
   Carrega a lista leve uma única vez para busca sem latência.
   --------------------------------------------------------------------- */

let todasAsRuas = [];

fetch('ruas.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    todasAsRuas = Array.isArray(data) ? data : [];
  })
  .catch(err => {
    console.error('Erro ao carregar ruas.json:', err);
  });

const cacheBuscas = {};

async function consultarRotasFirestore(ruaSelecionada) {
  if (!ruaSelecionada) return [];
  const termo = ruaSelecionada.trim();
  const chaveCache = normalizar(termo);

  // Retorna instantaneamente se já consultado
  if (cacheBuscas[chaveCache]) {
    return cacheBuscas[chaveCache];
  }

  try {
    const rotasRef = db.collection('rotas');
    const mapaDocs = new Map();

    const processarDoc = (doc) => {
      const data = doc.data ? doc.data() : doc;
      const id = doc.id || (data.logradouro || data.endereco || Math.random());
      const item = {
        id,
        ...data,
        logradouro: data.logradouro || data.endereco || '',
        endereco: data.logradouro || data.endereco || ''
      };
      if (!mapaDocs.has(id)) {
        mapaDocs.set(id, item);
      }
    };

    // 1. Consulta direta por igualdade exata do logradouro
    const snapExato = await rotasRef.where('logradouro', '==', termo).get();
    if (snapExato && snapExato.docs && snapExato.docs.length > 0) {
      snapExato.docs.forEach(processarDoc);
    } else {
      // Fallback em maiúsculas
      const snapUpper = await rotasRef.where('logradouro', '==', termo.toUpperCase()).get();
      if (snapUpper && snapUpper.docs && snapUpper.docs.length > 0) {
        snapUpper.docs.forEach(processarDoc);
      } else {
        // Fallback por prefixo no logradouroBusca
        const buscaNorm = normalizar(termo);
        const snapBusca = await rotasRef
          .where('logradouroBusca', '>=', buscaNorm)
          .where('logradouroBusca', '<=', buscaNorm + '\uf8ff')
          .limit(8)
          .get();
        if (snapBusca && snapBusca.docs) {
          snapBusca.docs.forEach(processarDoc);
        }
      }
    }

    const resultados = Array.from(mapaDocs.values());
    cacheBuscas[chaveCache] = resultados;
    return resultados;
  } catch (erro) {
    console.error('Erro ao consultar detalhes da rota no Firestore:', erro);
    return [];
  }
}

/* ---------------------------------------------------------------------
   1c) FILTRO POR TURNO NA BUSCA (Manhã / Tarde / Noite / Todos)
   --------------------------------------------------------------------- */

const turnoFiltrosEl = document.getElementById('turno-filtros');
let filtroTurnoAtivo = 'todos';
let ultimosResultadosBusca = [];

function aplicarFiltroTurno(itens) {
  if (filtroTurnoAtivo === 'todos') return itens;
  return itens.filter(r => turnoClasse(r.turno) === `turno-${filtroTurnoAtivo}`);
}

function atualizarResultadosComFiltro() {
  if (!ultimosResultadosBusca || ultimosResultadosBusca.length === 0) return;
  const filtrados = aplicarFiltroTurno(ultimosResultadosBusca);

  if (filtrados.length === 0) {
    resultadosEl.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma rota encontrada para o turno selecionado</strong>
        Tente alternar o filtro de turno acima para "Todos".
      </div>`;
  } else {
    renderResultados(filtrados);
    mostrarMapaResultado(filtrados);
  }
}

if (turnoFiltrosEl) {
  turnoFiltrosEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.filtro-turno-btn');
    if (!btn) return;
    turnoFiltrosEl.querySelectorAll('.filtro-turno-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroTurnoAtivo = btn.dataset.turno;
    atualizarResultadosComFiltro();
  });
}

let buscandoRotaEmAndamento = false;

async function buscarRota(termoForcado) {
  const termo = (termoForcado ?? inputBusca.value).trim();
  if (!termo || buscandoRotaEmAndamento) return;

  buscandoRotaEmAndamento = true;
  if (btnBuscar) {
    btnBuscar.disabled = true;
    btnBuscar.innerHTML = '🔄 Buscando...';
  }

  esconderSugestoes();
  resultadosEl.innerHTML = '';
  renderCarregando();

  try {
    const encontrados = await consultarRotasFirestore(termo);
    ultimosResultadosBusca = encontrados;

    if (ultimosResultadosBusca.length === 0) {
      if (turnoFiltrosEl) turnoFiltrosEl.hidden = true;
      renderVazio(termo);
    } else {
      if (turnoFiltrosEl) turnoFiltrosEl.hidden = false;
      atualizarResultadosComFiltro();
    }
  } catch (erro) {
    console.error('Erro ao buscar rotas:', erro);
    renderVazio(termo);
  } finally {
    buscandoRotaEmAndamento = false;
    if (btnBuscar) {
      btnBuscar.disabled = false;
      btnBuscar.innerHTML = 'Buscar';
    }
  }
}

btnBuscar.addEventListener('click', () => buscarRota());
inputBusca.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const ativa = sugestoesEl.querySelector('.sugestao-item.ativa');
    if (ativa) {
      const rua = ativa.dataset.endereco;
      inputBusca.value = rua;
      buscarRota(rua);
    } else {
      buscarRota();
    }
  }
});


/* ---------------------------------------------------------------------
   AUTOCOMPLETE LOCAL INSTANTÂNEO (com ruas.json e debounce de 200ms)
   --------------------------------------------------------------------- */

let indiceAtivo = -1;

function renderSugestoes(lista) {
  if (lista.length === 0) {
    sugestoesEl.innerHTML = `<div class="sugestoes-vazio">Nenhuma rua encontrada</div>`;
  } else {
    sugestoesEl.innerHTML = lista.map((nomeRua, i) => {
      return `
        <div class="sugestao-item" data-endereco="${escapeHtml(nomeRua)}" data-indice="${i}">
          <span class="nome-rua">${destacarTrecho(nomeRua, inputBusca.value)}</span>
        </div>
      `;
    }).join('');
  }
  sugestoesEl.hidden = false;
  indiceAtivo = -1;
}

function destacarTrecho(logradouro, termo) {
  if (!logradouro) return '';
  if (!termo) return escapeHtml(logradouro);
  const logradouroNorm = normalizar(logradouro);
  const termoNorm = normalizar(termo);

  let idx = logradouroNorm.indexOf(termoNorm);
  let len = termoNorm.length;

  if (idx === -1) return escapeHtml(logradouro);
  const antes = escapeHtml(logradouro.slice(0, idx));
  const meio = escapeHtml(logradouro.slice(idx, idx + len));
  const depois = escapeHtml(logradouro.slice(idx + len));
  return `${antes}<strong>${meio}</strong>${depois}`;
}

function esconderSugestoes() {
  sugestoesEl.hidden = true;
  sugestoesEl.innerHTML = '';
  indiceAtivo = -1;
}

let debounceTimer = null;

inputBusca.addEventListener('input', () => {
  const termo = inputBusca.value.trim();
  clearTimeout(debounceTimer);

  if (termo.length < 2) {
    esconderSugestoes();
    return;
  }

  debounceTimer = setTimeout(() => {
    const termoNorm = normalizar(termo);
    let sugestoes = [];

    if (todasAsRuas.length > 0) {
      sugestoes = todasAsRuas
        .filter(rua => normalizar(rua).includes(termoNorm))
        .slice(0, 6);
    }

    renderSugestoes(sugestoes);
  }, 200);
});

// clique numa sugestão
sugestoesEl.addEventListener('click', (e) => {
  const item = e.target.closest('.sugestao-item');
  if (!item || !item.dataset.endereco) return;
  const rua = item.dataset.endereco;
  inputBusca.value = rua;
  buscarRota(rua);
});

// navegação por teclado (setas + enter)
inputBusca.addEventListener('keydown', (e) => {
  const itens = Array.from(sugestoesEl.querySelectorAll('.sugestao-item'));
  if (sugestoesEl.hidden || itens.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    indiceAtivo = (indiceAtivo + 1) % itens.length;
    marcarAtiva(itens);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    indiceAtivo = (indiceAtivo - 1 + itens.length) % itens.length;
    marcarAtiva(itens);
  } else if (e.key === 'Escape') {
    esconderSugestoes();
  }
});

function marcarAtiva(itens) {
  itens.forEach(it => it.classList.remove('ativa'));
  if (indiceAtivo >= 0) {
    itens[indiceAtivo].classList.add('ativa');
    itens[indiceAtivo].scrollIntoView({ block: 'nearest' });
  }
}

// fecha a lista ao clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-row')) esconderSugestoes();
});


/* ---------------------------------------------------------------------
   2) GEOLOCALIZAÇÃO DO USUÁRIO & SELEÇÃO INTERATIVA NO MAPA
   --------------------------------------------------------------------- */

const geoDot = document.getElementById('geo-dot');
const geoText = document.getElementById('geo-text');

let posicaoAtual = null; // { lat, lng }

function atualizarPosicaoSelecionada(lat, lng, origem = 'manual') {
  posicaoAtual = { lat, lng };

  if (geoDot) {
    geoDot.classList.remove('pending');
    geoDot.classList.add('ok');
  }

  if (geoText) {
    if (origem === 'gps') {
      geoText.textContent = 'Localização obtida via GPS com sucesso.';
    } else if (origem === 'arrasto') {
      geoText.textContent = '📍 Marcador reposicionado no mapa.';
    } else {
      geoText.textContent = '📍 Localização selecionada no mapa.';
    }
  }

  if (mapa) {
    if (marcadorUsuario) {
      marcadorUsuario.setLatLng([lat, lng]);
      marcadorUsuario.openPopup();
    } else {
      criarMarcadorUsuario(lat, lng);
    }
  }
}

function iniciarGeolocalizacao() {
  if (!navigator.geolocation) {
    if (geoText) geoText.textContent = 'Seu navegador não suporta localização automática. Clique no mapa para marcar o local.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (posicao) => {
      atualizarPosicaoSelecionada(posicao.coords.latitude, posicao.coords.longitude, 'gps');
      if (mapa) {
        mapa.setView([posicao.coords.latitude, posicao.coords.longitude], 15);
      }
    },
    (erro) => {
      if (geoDot) geoDot.classList.remove('pending');
      if (geoText) geoText.textContent = 'GPS não disponível. Toque ou clique no mapa para indicar o local da denúncia.';
    }
  );
}


/* ---------------------------------------------------------------------
   3) MAPA (Leaflet) — Lazy Loading e visualização de denúncias
   --------------------------------------------------------------------- */

const RECIFE_LAT = -8.0476;
const RECIFE_LNG = -34.8770;

let mapa = null;
let mapaInicializado = false;
let marcadorUsuario = null;

function criarMarcadorUsuario(lat, lng) {
  if (!mapa) return;
  if (marcadorUsuario) {
    mapa.removeLayer(marcadorUsuario);
  }

  marcadorUsuario = L.marker([lat, lng], {
    draggable: true,
    title: 'Arraste para ajustar o local exato da denúncia'
  }).addTo(mapa);

  marcadorUsuario.bindPopup('📍 <strong>Ponto da denúncia</strong><br><small>Arraste o pin para ajustar o local exato</small>').openPopup();

  marcadorUsuario.on('dragend', (e) => {
    const novaPosicao = e.target.getLatLng();
    atualizarPosicaoSelecionada(novaPosicao.lat, novaPosicao.lng, 'arrasto');
  });
}

function centralizarMapa(lat, lng) {
  if (!mapa) return;
  mapa.setView([lat, lng], 15);
  criarMarcadorUsuario(lat, lng);
}

function inicializarMapaDenuncias() {
  if (mapaInicializado) return;
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;
  mapaInicializado = true;

  mapa = L.map('map').setView([RECIFE_LAT, RECIFE_LNG], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapa);

  // Clique interativo no mapa para posicionar ou ajustar a denúncia
  mapa.on('click', (e) => {
    atualizarPosicaoSelecionada(e.latlng.lat, e.latlng.lng, 'mapa');
  });

  if (posicaoAtual) {
    centralizarMapa(posicaoAtual.lat, posicaoAtual.lng);
  }

  carregarDenunciasNoMapa();
  carregarSetoresNoMapa();
}

/* ---------------------------------------------------------------------
   3b) ZONAS DE COLETA POR SETOR — círculos coloridos por turno
   Carrega setores.json (gerado a partir do dataset da Emlurb, agrupado
   por setor/RPA). As coordenadas são uma aproximação visual da região
   de cada setor dentro da RPA — não é o traçado real da rua, já que o
   dataset oficial não traz geometria.
   --------------------------------------------------------------------- */

const CORES_TURNO = {
  'MANHÃ': '#F2A73B',
  'TARDE': '#E4552E',
  'NOTURNO': '#1D5C8A',
  'DIURNO': '#8A5A00'
};

function corDoTurno(turno) {
  return CORES_TURNO[(turno || '').toUpperCase()] || '#7A8A7A';
}

let camadasSetores = [];
let setoresCache = null; // compartilhado com o mapa de resultado da busca

async function obterSetoresCache() {
  if (setoresCache) return setoresCache;
  const resposta = await fetch('setores.json');
  setoresCache = await resposta.json();
  return setoresCache;
}

async function carregarSetoresNoMapa() {
  try {
    const setores = await obterSetoresCache();

    setores.forEach(s => {
      const cor = corDoTurno(s.turnoPredominante);
      const raio = 90 + Math.min(s.totalRuas, 40) * 6; // raio proporcional ao nº de ruas do setor

      const circulo = L.circle([s.lat, s.lng], {
        radius: raio,
        color: cor,
        weight: 1.5,
        fillColor: cor,
        fillOpacity: 0.35
      }).addTo(mapa);

      const listaRuas = s.ruas.slice(0, 8).map(r => `<li>${escapeHtml(r)}</li>`).join('');
      circulo.bindPopup(`
        <strong>Setor ${escapeHtml(s.setor)}</strong> — RPA ${escapeHtml(s.rpa)}<br>
        <span style="color:${cor}; font-weight:600;">${escapeHtml(s.turnoPredominante)}</span>
        &middot; ${escapeHtml(s.totalRuas)} rua(s) cadastrada(s)
        <ul style="margin:8px 0 0; padding-left:18px; font-size:0.85rem;">${listaRuas}</ul>
      `);

      circulo.on('click', () => {
        inputBusca.value = s.setor;
        resultadosEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        buscarRota(s.ruas[0] || s.setor);
      });

      camadasSetores.push(circulo);
    });

    adicionarLegendaTurnos();
  } catch (erro) {
    console.error('Erro ao carregar setores no mapa:', erro);
  }
}

function adicionarLegendaTurnos() {
  const legenda = L.control({ position: 'bottomright' });
  legenda.onAdd = function () {
    const div = L.DomUtil.create('div', 'legenda-turnos');
    div.innerHTML = `
      <strong>Turno predominante</strong>
      ${Object.entries(CORES_TURNO).map(([turno, cor]) => `
        <div class="legenda-item">
          <span class="legenda-dot" style="background:${cor};"></span>${turno.charAt(0)}${turno.slice(1).toLowerCase()}
        </div>
      `).join('')}
      <div class="legenda-obs">Áreas aproximadas por setor — não é o traçado exato da rua.</div>
    `;
    return div;
  };
  legenda.addTo(mapa);
}

function iconeDenunciaPorStatus(status) {
  const cor = status === 'resolvida' ? '#2BB673' : '#E4552E';
  return L.divIcon({
    className: '',
    html: `<div style="background:${cor}; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}
const iconeDenuncia = iconeDenunciaPorStatus('pendente');

let camadaMarcadoresDenuncias = null;
let denunciasMapaCache = [];
let filtroMapaDenuncias = 'todas';

function renderizarMarcadoresDenunciasNoMapa() {
  if (!mapa) return;

  if (!camadaMarcadoresDenuncias) {
    camadaMarcadoresDenuncias = L.layerGroup().addTo(mapa);
  } else {
    camadaMarcadoresDenuncias.clearLayers();
  }

  const uidAtual = auth.currentUser ? auth.currentUser.uid : null;

  const denunciasFiltradas = denunciasMapaCache.filter(d => {
    if (filtroMapaDenuncias === 'todas') return true;
    return (d.status || 'pendente') === filtroMapaDenuncias;
  });

  denunciasFiltradas.forEach(d => {
    const id = d.id;
    if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
      const fotoSegura = sanitizeUrl(d.foto);
      const fotoResolvidaSegura = sanitizeUrl(d.fotoResolvida);
      const resolvida = d.status === 'resolvida';
      const isAutor = uidAtual && uidAtual === d.autorId;

      let seloResolucao = '';
      if (resolvida) {
        if (d.resolvidoPor === 'autor') {
          seloResolucao = `<span class="selo-resolvido-autor">✅ Resolvido pelo autor</span>`;
        } else if (d.resolvidoPor === 'admin') {
          seloResolucao = `<span class="selo-resolvido-admin">✅ Resolvido pela Emlurb/Admin</span>`;
        } else {
          seloResolucao = `<span class="selo-resolvido-admin">✅ Resolvido</span>`;
        }
      }

      let botaoAcao = '';
      if (!resolvida && isAutor) {
        botaoAcao = `<br><button type="button" class="btn-marcar-resolvido" onclick="marcarComoResolvidoPeloAutor('${escapeHtml(id)}')">✔️ Marcar como Resolvido</button>`;
      }

      let comparativoFotos = '';
      if (resolvida && fotoResolvidaSegura) {
        comparativoFotos = `
          <div class="antes-depois-wrap">
            <div class="antes-depois-grid">
              <div class="antes-depois-item">
                <span class="antes-depois-rotulo rotulo-antes">🚨 Antes</span>
                ${fotoSegura ? `<img src="${fotoSegura}" class="antes-depois-foto" alt="Foto Antes">` : ''}
              </div>
              <div class="antes-depois-item">
                <span class="antes-depois-rotulo rotulo-depois">✨ Depois</span>
                <img src="${fotoResolvidaSegura}" class="antes-depois-foto" alt="Foto Depois (Limpo)">
              </div>
            </div>
            ${d.observacaoResolucao ? `<p class="obs-resolucao-texto">💬 "${escapeHtml(d.observacaoResolucao)}"</p>` : ''}
          </div>
        `;
      } else if (fotoSegura) {
        comparativoFotos = `<br><img src="${fotoSegura}" style="width:160px; max-height:120px; object-fit:cover; border-radius:6px; margin-top:6px;">`;
      }

      const totalApoios = Array.isArray(d.apoios) ? d.apoios.length : 0;
      const jaApoiou = uidAtual && Array.isArray(d.apoios) && d.apoios.includes(uidAtual);
      const badgeCritico = totalApoios >= 3 ? `<div style="margin-top:4px;"><span class="badge-critico">🔥 Chamado Crítico (${totalApoios} apoios)</span></div>` : '';

      let botaoApoio = '';
      if (!resolvida) {
        botaoApoio = `
          <button type="button" class="btn-apoiar ${jaApoiou ? 'apoiado' : ''}" onclick="alternarApoioDenuncia('${escapeHtml(id)}')">
            ${jaApoiou ? `✅ Você apoiou (${totalApoios})` : `👍 Eu também vi (${totalApoios})`}
          </button>
        `;
      }

      const popupHtml = `
        <div class="popup-denuncia-card">
          <strong>Denúncia da comunidade</strong>
          ${resolvida ? ' <span style="color:#1D6B34; font-weight:700;">(resolvida)</span>' : ''}<br>
          ${escapeHtml(d.descricao ? d.descricao : 'Sem descrição adicional.')}
          ${badgeCritico}
          ${comparativoFotos}
          <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
            ${seloResolucao}
            ${botaoApoio}
            ${botaoAcao}
          </div>
        </div>
      `;

      const marker = L.marker([d.latitude, d.longitude], { icon: iconeDenunciaPorStatus(d.status) })
        .bindPopup(popupHtml);
      camadaMarcadoresDenuncias.addLayer(marker);
    }
  });
}

async function carregarDenunciasNoMapa() {
  try {
    const snapshot = await db.collection('denuncias')
      .orderBy('dataEnvio', 'desc')
      .limit(100)
      .get();

    let total = 0, resolvidas = 0;
    denunciasMapaCache = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      const item = { id: doc.id, ...d };
      denunciasMapaCache.push(item);
      total++;
      if (d.status === 'resolvida') resolvidas++;
    });

    renderizarMarcadoresDenunciasNoMapa();
    renderizarDenunciasMapaPrincipal();
    atualizarEstatisticas(total, resolvidas);
  } catch (erro) {
    console.error('Erro ao carregar denúncias:', erro);
  }
}

const mapaFiltrosContainer = document.getElementById('mapa-filtros-denuncias');
if (mapaFiltrosContainer) {
  mapaFiltrosContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.mapa-filtro-btn');
    if (!btn) return;
    mapaFiltrosContainer.querySelectorAll('.mapa-filtro-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroMapaDenuncias = btn.dataset.filtroMapa;
    renderizarMarcadoresDenunciasNoMapa();
  });
}

/* ---------------------------------------------------------------------
   3c) APOIO COMUNITÁRIO ("EU TAMBÉM VI" / UPVOTE)
   --------------------------------------------------------------------- */

window.alternarApoioDenuncia = async function(denunciaId) {
  try {
    if (!auth.currentUser) {
      console.log('[Apoio] Autenticando sessão anônima para registrar apoio...');
      await auth.signInAnonymously();
    }

    const uid = auth.currentUser.uid;
    const docRef = db.collection('denuncias').doc(denunciaId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      alert('Denúncia não encontrada.');
      return;
    }

    const dados = docSnap.data();
    const apoiosAtuais = Array.isArray(dados.apoios) ? dados.apoios : [];
    const jaApoiou = apoiosAtuais.includes(uid);

    if (jaApoiou) {
      await docRef.update({
        apoios: firebase.firestore.FieldValue.arrayRemove(uid)
      });
    } else {
      await docRef.update({
        apoios: firebase.firestore.FieldValue.arrayUnion(uid)
      });
    }

    carregarDenunciasNoMapa();
    carregarMinhasDenuncias();
  } catch (erro) {
    console.error('Erro ao alternar apoio comunitário:', erro);
    alert('Não foi possível registrar seu apoio. Verifique sua conexão.');
  }
};

/* ---------------------------------------------------------------------
   3d) BASE DE DADOS E GESTÃO DAS ECOESTAÇÕES (ECOPONTOS DO RECIFE)
   --------------------------------------------------------------------- */

const ECOESTACOES_RECIFE = [
  {
    nome: "EcoEstação Arruda",
    rpa: "RPA 2",
    bairro: "Arruda",
    endereco: "Rua Zeferino Agra, s/n (próximo ao Estádio do Arruda)",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0267,
    lng: -34.8885
  },
  {
    nome: "EcoEstação Campo Grande",
    rpa: "RPA 2",
    bairro: "Campo Grande",
    endereco: "Rua Odorico Mendes, s/n",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0345,
    lng: -34.8762
  },
  {
    nome: "EcoEstação Torreão",
    rpa: "RPA 2",
    bairro: "Torreão",
    endereco: "Rua Professor Aloísio de Carvalho, s/n",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0418,
    lng: -34.8876
  },
  {
    nome: "EcoEstação Casa Amarela",
    rpa: "RPA 3",
    bairro: "Casa Amarela",
    endereco: "Rua Eugênio Samico, s/n (ao lado do Parque de Casa Amarela)",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0234,
    lng: -34.9145
  },
  {
    nome: "EcoEstação Parnamirim",
    rpa: "RPA 3",
    bairro: "Parnamirim",
    endereco: "Rua Sebastião de Carvalho, s/n",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0321,
    lng: -34.9067
  },
  {
    nome: "EcoEstação Várzea",
    rpa: "RPA 4",
    bairro: "Várzea",
    endereco: "Rua General Polidoro, s/n (próximo à UFPE)",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0456,
    lng: -34.9542
  },
  {
    nome: "EcoEstação Mustardinha",
    rpa: "RPA 5",
    bairro: "Mustardinha",
    endereco: "Rua Major Mário Portela, s/n",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0722,
    lng: -34.9189
  },
  {
    nome: "EcoEstação Totó",
    rpa: "RPA 5",
    bairro: "Totó",
    endereco: "Rua Paulino de Farias, s/n",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0894,
    lng: -34.9658
  },
  {
    nome: "EcoEstação Barro / Areias",
    rpa: "RPA 5",
    bairro: "Barro",
    endereco: "Rua José Natário, s/n",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.0932,
    lng: -34.9385
  },
  {
    nome: "EcoEstação Imbiribeira",
    rpa: "RPA 6",
    bairro: "Imbiribeira",
    endereco: "Av. General Mac Arthur, s/n",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.1065,
    lng: -34.9082
  },
  {
    nome: "EcoEstação Ibura",
    rpa: "RPA 6",
    bairro: "Ibura",
    endereco: "Av. Dois Rios, s/n (próximo à UR-1)",
    horario: "Segunda a Sábado, das 8h às 16h",
    materiais: ["Entulho (até 1m³)", "Podas", "Móveis velhos", "Recicláveis", "Eletrônicos"],
    lat: -8.1189,
    lng: -34.9356
  }
];

let filtroRpaAtivo = 'todas';

function renderEcopontos(lista) {
  const listaEl = document.getElementById('ecopontos-lista');
  if (!listaEl) return;

  if (lista.length === 0) {
    listaEl.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <strong>Nenhuma EcoEstação encontrada</strong>
        Tente buscar por outro bairro ou selecione "Todas as RPAs".
      </div>
    `;
    return;
  }

  listaEl.innerHTML = lista.map(eco => {
    const nomeEsc = escapeHtml(eco.nome);
    const rpaEsc = escapeHtml(eco.rpa);
    const bairroEsc = escapeHtml(eco.bairro);
    const endEsc = escapeHtml(eco.endereco);
    const horarioEsc = escapeHtml(eco.horario);
    const mapsQuery = encodeURIComponent(`${eco.nome}, ${eco.endereco}, Recife - PE`);
    const mapsUrl = `https://maps.google.com/?q=${mapsQuery}`;

    const tagsHtml = eco.materiais.map(m => `<span>${escapeHtml(m)}</span>`).join('');

    return `
      <div class="ecoponto-card">
        <div>
          <div class="ecoponto-topo">
            <h4 class="ecoponto-nome">${nomeEsc}</h4>
            <span class="ecoponto-rpa-tag">${rpaEsc}</span>
          </div>
          <p class="ecoponto-end">📍 <strong>${bairroEsc}:</strong> ${endEsc}</p>
          <p class="ecoponto-horario">⏰ ${horarioEsc}</p>
        </div>
        <div class="ecoponto-materiais">
          ${tagsHtml}
        </div>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-maps">
          📍 Como chegar (Google Maps)
        </a>
      </div>
    `;
  }).join('');
}

function filtrarEcopontos() {
  const buscaInput = document.getElementById('busca-ecoponto');
  const termo = buscaInput ? normalizar(buscaInput.value.trim()) : '';

  const filtrados = ECOESTACOES_RECIFE.filter(eco => {
    const rpaOk = filtroRpaAtivo === 'todas' || eco.rpa === filtroRpaAtivo;
    if (!rpaOk) return false;

    if (!termo) return true;
    return (
      normalizar(eco.nome).includes(termo) ||
      normalizar(eco.bairro).includes(termo) ||
      normalizar(eco.endereco).includes(termo)
    );
  });

  renderEcopontos(filtrados);
}

if (buscaEcopontoInput) {
  buscaEcopontoInput.addEventListener('input', filtrarEcopontos);
}

if (rpaFiltrosContainer) {
  rpaFiltrosContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filtro-rpa-btn');
    if (!btn) return;
    rpaFiltrosContainer.querySelectorAll('.filtro-rpa-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroRpaAtivo = btn.dataset.rpa;
    filtrarEcopontos();
  });
}

/* ---------------------------------------------------------------------
   3e) CAMADA DAS ECOESTAÇÕES NO MAPA LEAFLET
   --------------------------------------------------------------------- */

let camadaEcopontos = null;
let ecopontosVisiveis = false;

function iconeEcopontoLeaflet() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#2BB673; width:26px; height:26px; border-radius:50%; border:2.5px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; font-size:13px;">♻️</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function alternarCamadaEcopontos() {
  if (!mapa) return;
  ecopontosVisiveis = !ecopontosVisiveis;

  if (btnToggleEcopontosMapa) btnToggleEcopontosMapa.classList.toggle('ativo', ecopontosVisiveis);
  if (textoToggleEcopontos) textoToggleEcopontos.textContent = ecopontosVisiveis ? 'Ocultar EcoEstações' : 'Mostrar EcoEstações';

  if (!camadaEcopontos) {
    camadaEcopontos = L.layerGroup();
    ECOESTACOES_RECIFE.forEach(eco => {
      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(eco.nome + ', ' + eco.endereco + ', Recife - PE')}`;
      const popupHtml = `
        <div style="min-width:190px;">
          <strong style="color:#1F8F58; font-size:0.95rem;">♻️ ${escapeHtml(eco.nome)}</strong><br>
          <span style="font-size:0.75rem; background:#FFC93C; color:#111; padding:1px 6px; border-radius:10px; font-weight:700;">${escapeHtml(eco.rpa)}</span><br>
          <p style="margin:6px 0 4px; font-size:0.85rem;">📍 <strong>${escapeHtml(eco.bairro)}:</strong> ${escapeHtml(eco.endereco)}</p>
          <p style="margin:0 0 6px; font-size:0.78rem; color:#516358;">⏰ ${escapeHtml(eco.horario)}</p>
          <a href="${mapsUrl}" target="_blank" rel="noopener" style="display:inline-block; font-size:0.8rem; font-weight:700; color:#2E9CCA; text-decoration:underline;">📍 Abrir no Google Maps</a>
        </div>
      `;
      const marker = L.marker([eco.lat, eco.lng], { icon: iconeEcopontoLeaflet() })
        .bindPopup(popupHtml);
      camadaEcopontos.addLayer(marker);
    });
  }

  if (ecopontosVisiveis) {
    camadaEcopontos.addTo(mapa);
  } else {
    mapa.removeLayer(camadaEcopontos);
  }
}

if (btnToggleEcopontosMapa) {
  btnToggleEcopontosMapa.addEventListener('click', alternarCamadaEcopontos);
}

async function carregarEstatisticasGerais() {
  try {
    const snapshot = await db.collection('denuncias')
      .orderBy('dataEnvio', 'desc')
      .limit(100)
      .get();

    let total = 0, resolvidas = 0;
    const pendentes = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      total++;
      if (d.status === 'resolvida') {
        resolvidas++;
      } else {
        pendentes.push(d);
      }
    });

    atualizarEstatisticas(total, resolvidas);
    calcularEExibirRankingSetores(pendentes);
  } catch (erro) {
    console.error('Erro ao carregar estatísticas gerais:', erro);
  }
}

async function calcularEExibirRankingSetores(denunciasPendentes) {
  const rankingWrap = document.getElementById('ranking-wrap');
  const rankingLista = document.getElementById('ranking-lista');
  if (!rankingWrap || !rankingLista || denunciasPendentes.length === 0) return;

  try {
    const setores = await obterSetoresCache();
    if (!setores || setores.length === 0) return;

    const contagemPorSetor = new Map();

    denunciasPendentes.forEach(d => {
      if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') return;
      let maisProximo = null;
      let menorDist = Infinity;

      for (const s of setores) {
        if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
        const dLat = s.lat - d.latitude;
        const dLng = s.lng - d.longitude;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < menorDist) {
          menorDist = dist;
          maisProximo = s;
        }
      }

      if (maisProximo) {
        const chave = maisProximo.setor;
        const atual = contagemPorSetor.get(chave) || { setor: maisProximo.setor, rpa: maisProximo.rpa, qtd: 0 };
        atual.qtd++;
        contagemPorSetor.set(chave, atual);
      }
    });

    const ordenados = [...contagemPorSetor.values()]
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    if (ordenados.length === 0) return;

    rankingLista.innerHTML = ordenados.map((item, idx) => `
      <div class="ranking-card">
        <span class="ranking-card-pos">#${idx + 1} MAIS CRÍTICO</span>
        <span class="ranking-card-setor">Setor ${escapeHtml(item.setor)} ${item.rpa ? `(RPA ${escapeHtml(item.rpa)})` : ''}</span>
        <span class="ranking-card-qtd">🚨 ${item.qtd} denúncia(s) pendente(s)</span>
      </div>
    `).join('');

    rankingWrap.hidden = false;
  } catch (erro) {
    console.error('Erro ao calcular ranking de setores:', erro);
  }
}

function atualizarEstatisticas(total, resolvidas) {
  const elTotal = document.getElementById('stat-total');
  const elResolvidas = document.getElementById('stat-resolvidas');
  const elPendentes = document.getElementById('stat-pendentes');
  if (!elTotal) return;
  elTotal.textContent = total;
  elResolvidas.textContent = resolvidas;
  elPendentes.textContent = total - resolvidas;
}


/* ---------------------------------------------------------------------
   4) FORMULÁRIO DE DENÚNCIA — foto (Cloudinary) + dados (Firestore)
   --------------------------------------------------------------------- */

const fotoInput = document.getElementById('foto-input');
const photoDrop = document.getElementById('photo-drop');
const photoPreview = document.getElementById('photo-preview');
const photoPlaceholder = document.getElementById('photo-placeholder');
const formDenuncia = document.getElementById('form-denuncia');
const btnEnviar = document.getElementById('btn-enviar');
const formMsg = document.getElementById('form-msg');

let arquivoSelecionado = null;

function resetarFoto() {
  fotoInput.value = '';
  arquivoSelecionado = null;
  photoPreview.src = '';
  photoPreview.style.display = 'none';
  photoPlaceholder.style.display = 'block';
}

photoDrop.addEventListener('click', () => fotoInput.click());

fotoInput.addEventListener('change', () => {
  const arquivo = fotoInput.files[0];
  if (!arquivo) return;

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  // (a) Validação de tipo MIME: deve começar com "image/"
  if (!arquivo.type || !arquivo.type.startsWith('image/')) {
    mostrarMensagem('Formato inválido. Por favor, envie apenas imagens (ex: JPG, PNG).', 'error');
    resetarFoto();
    return;
  }

  // (b) Validação de tamanho: no máximo 5MB
  if (arquivo.size > MAX_SIZE) {
    mostrarMensagem('A imagem é muito grande. O tamanho máximo permitido é 5MB.', 'error');
    resetarFoto();
    return;
  }

  arquivoSelecionado = arquivo;
  formMsg.className = 'form-msg';
  formMsg.textContent = '';

  const leitor = new FileReader();
  leitor.onload = (e) => {
    photoPreview.src = e.target.result;
    photoPreview.style.display = 'block';
    photoPlaceholder.style.display = 'none';
  };
  leitor.readAsDataURL(arquivo);
});

async function enviarFotoParaCloudinary(arquivo) {
  const formData = new FormData();
  formData.append('file', arquivo);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const resposta = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!resposta.ok) throw new Error('Falha no upload da foto');

  const dados = await resposta.json();
  return dados.secure_url;
}

function mostrarMensagem(texto, tipo) {
  formMsg.textContent = texto;
  formMsg.className = `form-msg show ${tipo}`;
}

formDenuncia.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!posicaoAtual) {
    mostrarMensagem('Selecione o local da denúncia no mapa ou aguarde o GPS.', 'error');
    return;
  }
  if (!arquivoSelecionado) {
    mostrarMensagem('Selecione uma foto do local antes de enviar.', 'error');
    return;
  }

  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';

  try {
    // Garante que o usuário esteja autenticado (login anônimo automático se não estiver conectado)
    if (!auth.currentUser) {
      mostrarMensagem('Autenticando para vincular seu report...', 'pending');
      await auth.signInAnonymously();
    }

    const usuario = auth.currentUser;
    const autorNome = usuario.isAnonymous
      ? 'Cidadão Anônimo'
      : (usuario.displayName || usuario.email || 'Cidadão');

    const urlFoto = await enviarFotoParaCloudinary(arquivoSelecionado);

    await db.collection('denuncias').add({
      foto: urlFoto,
      latitude: posicaoAtual.lat,
      longitude: posicaoAtual.lng,
      descricao: document.getElementById('descricao-input').value.trim(),
      status: 'pendente',
      autorId: usuario.uid,
      autorNome: autorNome,
      resolvidoPor: null,
      dataEnvio: firebase.firestore.FieldValue.serverTimestamp()
    });

    const descTexto = document.getElementById('descricao-input').value.trim();
    const latStr = posicaoAtual.lat.toFixed(5);
    const lngStr = posicaoAtual.lng.toFixed(5);

    const zapTexto = encodeURIComponent(
      `🚨 Reportei um ponto de lixo acumulado no Rota Limpa Recife!\n📍 Localização: https://maps.google.com/?q=${latStr},${lngStr}${descTexto ? `\n📝 Detalhes: ${descTexto}` : ''}\nConfira e ajude a fiscalizar.`
    );
    const zapUrl = `https://wa.me/?text=${zapTexto}`;

    formMsg.innerHTML = `
      <span>Denúncia enviada! Obrigado por ajudar a cidade.</span>
      <a href="${zapUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp" aria-label="Compartilhar denúncia no WhatsApp">
        📱 Compartilhar no WhatsApp
      </a>
    `;
    formMsg.className = 'form-msg show success has-zap';
    formDenuncia.reset();
    resetarFoto();

    if (mapa) {
      carregarDenunciasNoMapa();
      carregarEstatisticasGerais();
    }

  } catch (erro) {
    console.error(erro);
    mostrarMensagem('Não foi possível enviar agora. Tente novamente.', 'error');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar denúncia';
  }
});


/* ---------------------------------------------------------------------
   INICIALIZAÇÃO & OBSERVERS
   --------------------------------------------------------------------- */

iniciarGeolocalizacao();
inicializarMapaPrincipal();
carregarEstatisticasGerais();

// Observer para lazy load do mapa quando o elemento #map entrar na viewport
const mapContainerEl = document.getElementById('map');
if (mapContainerEl && 'IntersectionObserver' in window) {
  const mapObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      inicializarMapaDenuncias();
      mapObserver.disconnect();
    }
  }, { rootMargin: '200px' });
  mapObserver.observe(mapContainerEl);
}