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
const fabDenuncia = document.getElementById('fab-denuncia');
const modalDenunciaBackdrop = document.getElementById('modal-denuncia-backdrop');
const modalDenunciaFechar = document.getElementById('modal-denuncia-fechar');

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
  // o mapa foi criado dentro de um contêiner que estava escondido —
  // precisa recalcular o tamanho dos tiles agora que ficou visível
  setTimeout(() => { if (typeof mapa !== 'undefined') mapa.invalidateSize(); }, 50);
}
function fecharModalDenuncia() {
  modalDenunciaBackdrop.classList.remove('aberto');
  document.body.style.overflow = '';
}

menuAbrirDenuncia.addEventListener('click', abrirModalDenuncia);
fabDenuncia.addEventListener('click', abrirModalDenuncia);
modalDenunciaFechar.addEventListener('click', fecharModalDenuncia);
modalDenunciaBackdrop.addEventListener('click', (e) => {
  if (e.target === modalDenunciaBackdrop) fecharModalDenuncia();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalDenunciaBackdrop.classList.contains('aberto')) fecharModalDenuncia();
  else if (menuPainel.classList.contains('aberto')) fecharMenu();
});

/* ---------------------------------------------------------------------
   1) BUSCA DE ROTAS DE COLETA (coleção "rotas" no Firestore)
   --------------------------------------------------------------------- */

const inputBusca = document.getElementById('busca-rua');
const btnBuscar = document.getElementById('btn-buscar');
const resultadosEl = document.getElementById('resultados');
const sugestoesEl = document.getElementById('sugestoes-lista');

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
      <strong>Nenhuma rota encontrada para "${termo}"</strong>
      Tente digitar só o nome da rua, sem "Rua" ou número (ex: "Aprígio Alves").
    </div>`;
}

function renderResultados(docs) {
  resultadosEl.innerHTML = docs.map(d => {
    const r = d.data ? d.data() : d;
    return `
      <div class="ticket">
        <div class="ticket-code">
          <span>Setor</span>
          ${r.setor || '—'}
        </div>
        <div class="ticket-main">
          <p class="rua">${r.endereco || 'Endereço não informado'}</p>
          <div class="ticket-meta">
            <span><b>Dias:</b> ${r.diasSemana || '—'}</span>
            <span><b>Horário estimado:</b> ${r.faixaHorario || '—'}</span>
          </div>
        </div>
        <span class="turno-pill ${turnoClasse(r.turno)}">${r.turno || '—'}</span>
      </div>
    `;
  }).join('');
}

/* ---------------------------------------------------------------------
   1b) MAPA DA BUSCA — mostra a localização aproximada (por setor)
   assim que uma busca encontra resultados
   --------------------------------------------------------------------- */

const mapaResultadoWrap = document.getElementById('mapa-resultado-wrap');
let mapaResultado = null;
let marcadoresResultado = [];

function obterMapaResultado() {
  if (mapaResultado) return mapaResultado;
  mapaResultado = L.map('mapa-resultado', { scrollWheelZoom: false }).setView([RECIFE_LAT, RECIFE_LNG], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapaResultado);
  return mapaResultado;
}

function esconderMapaResultado() {
  mapaResultadoWrap.hidden = true;
}

async function mostrarMapaResultado(docs) {
  const setoresInfo = await obterSetoresCache();
  const bySetor = new Map(setoresInfo.map(s => [s.setor, s]));

  // pega os setores únicos entre os resultados encontrados (até 20 já limitados)
  const setoresDosResultados = [...new Set(docs.map(d => (d.data ? d.data() : d).setor))]
    .map(setor => bySetor.get(setor))
    .filter(Boolean);

  if (setoresDosResultados.length === 0) {
    esconderMapaResultado();
    return;
  }

  mapaResultadoWrap.hidden = false;
  const m = obterMapaResultado();
  setTimeout(() => m.invalidateSize(), 50); // contêiner acabou de virar visível

  marcadoresResultado.forEach(marc => m.removeLayer(marc));
  marcadoresResultado = [];

  setoresDosResultados.forEach(s => {
    const cor = corDoTurno(s.turnoPredominante);
    const marcador = L.circleMarker([s.lat, s.lng], {
      radius: 12,
      color: '#1F2A24',
      weight: 2,
      fillColor: cor,
      fillOpacity: 0.9
    }).addTo(m);
    marcador.bindPopup(`<strong>Setor ${s.setor}</strong><br>${s.turnoPredominante} &middot; ${s.totalRuas} rua(s)`);
    marcadoresResultado.push(marcador);
  });

  if (setoresDosResultados.length === 1) {
    m.setView([setoresDosResultados[0].lat, setoresDosResultados[0].lng], 15);
    marcadoresResultado[0].openPopup();
  } else {
    const grupo = L.featureGroup(marcadoresResultado);
    m.fitBounds(grupo.getBounds().pad(0.3));
  }
}

/* ---------------------------------------------------------------------
   Cache local dos documentos de "rotas" — carregado uma única vez,
   usado tanto para o autocomplete quanto para a busca em si.
   Evita reler o Firestore inteiro a cada tecla digitada.
   --------------------------------------------------------------------- */
let cacheRotas = [];
let cachePronto = false;

async function carregarCacheRotas() {
  try {
    const snapshot = await db.collection('rotas').get();
    cacheRotas = snapshot.docs.map(doc => doc.data());
    cachePronto = true;
  } catch (erro) {
    console.error('Erro ao carregar rotas:', erro);
  }
}

function buscarNoCache(termo) {
  const termoNormalizado = normalizar(termo);
  return cacheRotas.filter(r => normalizar(r.endereco || '').includes(termoNormalizado));
}

async function buscarRota(termoForcado) {
  const termo = (termoForcado ?? inputBusca.value).trim();
  if (!termo) return;

  esconderSugestoes();
  renderCarregando();

  if (!cachePronto) await carregarCacheRotas();

  const encontrados = buscarNoCache(termo);

  if (encontrados.length === 0) {
    renderVazio(termo);
    esconderMapaResultado();
  } else {
    const resultadosLimitados = encontrados.slice(0, 20); // limita a 20 cartões
    renderResultados(resultadosLimitados);
    mostrarMapaResultado(resultadosLimitados);
  }
}

btnBuscar.addEventListener('click', () => buscarRota());
inputBusca.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const ativa = sugestoesEl.querySelector('.sugestao-item.ativa');
    if (ativa) {
      buscarRota(ativa.dataset.endereco);
    } else {
      buscarRota();
    }
  }
});


/* ---------------------------------------------------------------------
   AUTOCOMPLETE — sugestões de rua enquanto o usuário digita
   --------------------------------------------------------------------- */

let indiceAtivo = -1;

function ruasUnicas(lista) {
  const vistos = new Set();
  const unicas = [];
  for (const r of lista) {
    const chave = r.endereco;
    if (chave && !vistos.has(chave)) {
      vistos.add(chave);
      unicas.push(r);
    }
  }
  return unicas;
}

function renderSugestoes(lista) {
  if (lista.length === 0) {
    sugestoesEl.innerHTML = `<div class="sugestoes-vazio">Nenhuma rua encontrada</div>`;
  } else {
    sugestoesEl.innerHTML = lista.slice(0, 8).map((r, i) => `
      <div class="sugestao-item" data-endereco="${r.endereco}" data-indice="${i}">
        <span class="nome-rua">${destacarTrecho(r.endereco, inputBusca.value)}</span>
        <span class="sugestao-setor">Setor ${r.setor || '—'}</span>
      </div>
    `).join('');
  }
  sugestoesEl.hidden = false;
  indiceAtivo = -1;
}

function destacarTrecho(endereco, termo) {
  if (!termo) return endereco;
  const idx = normalizar(endereco).indexOf(normalizar(termo));
  if (idx === -1) return endereco;
  const antes = endereco.slice(0, idx);
  const meio = endereco.slice(idx, idx + termo.length);
  const depois = endereco.slice(idx + termo.length);
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

  debounceTimer = setTimeout(async () => {
    if (!cachePronto) await carregarCacheRotas();
    const encontrados = ruasUnicas(buscarNoCache(termo));
    renderSugestoes(encontrados);
  }, 150);
});

// clique numa sugestão
sugestoesEl.addEventListener('click', (e) => {
  const item = e.target.closest('.sugestao-item');
  if (!item || !item.dataset.endereco) return;
  inputBusca.value = item.dataset.endereco;
  buscarRota(item.dataset.endereco);
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

// pré-carrega o cache assim que a página abre, pra sugestão ficar instantânea
carregarCacheRotas();


/* ---------------------------------------------------------------------
   2) GEOLOCALIZAÇÃO DO USUÁRIO
   --------------------------------------------------------------------- */

const geoDot = document.getElementById('geo-dot');
const geoText = document.getElementById('geo-text');

let posicaoAtual = null; // { lat, lng }

function iniciarGeolocalizacao() {
  if (!navigator.geolocation) {
    geoText.textContent = 'Seu navegador não suporta localização automática.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (posicao) => {
      posicaoAtual = {
        lat: posicao.coords.latitude,
        lng: posicao.coords.longitude
      };
      geoDot.classList.remove('pending');
      geoDot.classList.add('ok');
      geoText.textContent = 'Localização obtida com sucesso.';
      centralizarMapa(posicaoAtual.lat, posicaoAtual.lng);
    },
    (erro) => {
      geoDot.classList.remove('pending');
      geoText.textContent = 'Não foi possível obter sua localização. Ative o GPS/permissão e recarregue a página.';
    }
  );
}


/* ---------------------------------------------------------------------
   3) MAPA (Leaflet) — mostra a posição do usuário e denúncias existentes
   --------------------------------------------------------------------- */

const RECIFE_LAT = -8.0476;
const RECIFE_LNG = -34.8770;

const mapa = L.map('map').setView([RECIFE_LAT, RECIFE_LNG], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(mapa);

let marcadorUsuario = null;

function centralizarMapa(lat, lng) {
  mapa.setView([lat, lng], 15);
  if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
  marcadorUsuario = L.circleMarker([lat, lng], {
    radius: 8,
    color: '#1D5C8A',
    fillColor: '#1D5C8A',
    fillOpacity: 0.9,
    weight: 2
  }).addTo(mapa).bindPopup('Você está aqui');
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

      const listaRuas = s.ruas.slice(0, 8).map(r => `<li>${r}</li>`).join('');
      circulo.bindPopup(`
        <strong>Setor ${s.setor}</strong> — RPA ${s.rpa}<br>
        <span style="color:${cor}; font-weight:600;">${s.turnoPredominante}</span>
        &middot; ${s.totalRuas} rua(s) cadastrada(s)
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

async function carregarDenunciasNoMapa() {
  try {
    const snapshot = await db.collection('denuncias')
      .orderBy('dataEnvio', 'desc')
      .limit(100)
      .get();

    let total = 0, resolvidas = 0;

    snapshot.forEach(doc => {
      const d = doc.data();
      total++;
      if (d.status === 'resolvida') resolvidas++;

      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        const popupHtml = `
          <strong>Denúncia da comunidade</strong>
          ${d.status === 'resolvida' ? ' <span style="color:#1D6B34; font-weight:700;">(resolvida)</span>' : ''}<br>
          ${d.descricao ? d.descricao : 'Sem descrição adicional.'}
          ${d.foto ? `<br><img src="${d.foto}" style="width:160px; border-radius:6px; margin-top:6px;">` : ''}
        `;
        L.marker([d.latitude, d.longitude], { icon: iconeDenunciaPorStatus(d.status) })
          .addTo(mapa)
          .bindPopup(popupHtml);
      }
    });

    atualizarEstatisticas(total, resolvidas);
  } catch (erro) {
    console.error('Erro ao carregar denúncias:', erro);
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

photoDrop.addEventListener('click', () => fotoInput.click());

fotoInput.addEventListener('change', () => {
  const arquivo = fotoInput.files[0];
  if (!arquivo) return;

  arquivoSelecionado = arquivo;
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
    mostrarMensagem('Aguarde a localização ser obtida antes de enviar.', 'error');
    return;
  }
  if (!arquivoSelecionado) {
    mostrarMensagem('Selecione uma foto do local antes de enviar.', 'error');
    return;
  }

  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';

  try {
    const urlFoto = await enviarFotoParaCloudinary(arquivoSelecionado);

    await db.collection('denuncias').add({
      foto: urlFoto,
      latitude: posicaoAtual.lat,
      longitude: posicaoAtual.lng,
      descricao: document.getElementById('descricao-input').value.trim(),
      status: 'pendente',
      dataEnvio: firebase.firestore.FieldValue.serverTimestamp()
    });

    mostrarMensagem('Denúncia enviada! Obrigado por ajudar a cidade.', 'success');
    formDenuncia.reset();
    photoPreview.style.display = 'none';
    photoPlaceholder.style.display = 'block';
    arquivoSelecionado = null;

    L.marker([posicaoAtual.lat, posicaoAtual.lng], { icon: iconeDenunciaPorStatus('pendente') })
      .addTo(mapa)
      .bindPopup('Sua denúncia foi registrada aqui.')
      .openPopup();

  } catch (erro) {
    console.error(erro);
    mostrarMensagem('Não foi possível enviar agora. Tente novamente.', 'error');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar denúncia';
  }
});


/* ---------------------------------------------------------------------
   INICIALIZAÇÃO
   --------------------------------------------------------------------- */

iniciarGeolocalizacao();
carregarDenunciasNoMapa();
carregarSetoresNoMapa();