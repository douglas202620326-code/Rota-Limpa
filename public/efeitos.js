/* =====================================================================
   ROTA LIMPA — RECIFE
   efeitos.js — Efeitos visuais extras (fade ao rolar e contadores)
   ===================================================================== */

(function () {
  const prefereReducaoMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Animação de contagem suave para estatísticas (#stat-total, #stat-resolvidas, #stat-pendentes)
  function animarContador(elemento, valorFinal, duracaoMs = 1000) {
    if (prefereReducaoMovimento) {
      elemento.textContent = valorFinal;
      return;
    }

    const valorInicial = 0;
    const inicioTempo = performance.now();
    elemento.dataset.animando = 'true';

    function atualizar(tempoAtual) {
      const decorrido = tempoAtual - inicioTempo;
      const progresso = Math.min(decorrido / duracaoMs, 1);
      // Easing suave (easeOutQuart)
      const ease = 1 - Math.pow(1 - progresso, 4);
      const atual = Math.round(valorInicial + (valorFinal - valorInicial) * ease);
      elemento.textContent = atual;

      if (progresso < 1) {
        requestAnimationFrame(atualizar);
      } else {
        elemento.textContent = valorFinal;
        delete elemento.dataset.animando;
      }
    }

    requestAnimationFrame(atualizar);
  }

  function monitorarEstatisticas() {
    const ids = ['stat-total', 'stat-resolvidas', 'stat-pendentes'];
    const elementos = ids.map(id => document.getElementById(id)).filter(Boolean);

    if (elementos.length === 0) return;

    if (prefereReducaoMovimento) return;

    const estadoStats = new Map();
    elementos.forEach(el => {
      estadoStats.set(el, {
        noViewport: false,
        valorAlvo: null,
        animado: false
      });
    });

    function verificarEAnimar(el) {
      const estado = estadoStats.get(el);
      if (!estado || estado.animado || !estado.noViewport || estado.valorAlvo === null) return;
      estado.animado = true;
      animarContador(el, estado.valorAlvo, 1000);
    }

    // Observer para detectar quando as estatísticas entram na tela
    const statIntersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const estado = estadoStats.get(el);
          if (estado) {
            estado.noViewport = true;
            verificarEAnimar(el);
          }
        }
      });
    }, {
      rootMargin: '0px 0px -20px 0px',
      threshold: 0.15
    });

    elementos.forEach(el => statIntersectionObserver.observe(el));

    // MutationObserver para observar valores injetados pelo app.js
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        const el = (m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest('#stat-total, #stat-resolvidas, #stat-pendentes');
        if (!el) return;
        if (el.dataset && el.dataset.animando === 'true') return;

        const texto = (el.textContent || '').trim();
        const numero = parseInt(texto, 10);
        if (!isNaN(numero) && numero >= 0) {
          const estado = estadoStats.get(el);
          if (estado && estado.valorAlvo !== numero) {
            estado.valorAlvo = numero;
            verificarEAnimar(el);
          }
        }
      });
    });

    elementos.forEach(el => {
      // Checar se já tem valor
      const texto = (el.textContent || '').trim();
      const num = parseInt(texto, 10);
      if (!isNaN(num) && num >= 0) {
        const estado = estadoStats.get(el);
        if (estado) estado.valorAlvo = num;
      }
      mutationObserver.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  // 2. IntersectionObserver para fade suave ao rolar nas seções e cartões
  function iniciarObservadorRolagem() {
    if (prefereReducaoMovimento) {
      document.querySelectorAll('section:not(.hero), .stat-box, .about-card, .ranking-wrap, .card-logradouro').forEach(el => {
        el.classList.add('visivel');
      });
      return;
    }

    const scrollObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visivel');
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });

    function observarElementos(raiz = document) {
      const seletores = 'section:not(.hero), .stat-box, .about-card, .ranking-wrap, .card-logradouro';
      raiz.querySelectorAll(seletores).forEach(el => {
        if (!el.classList.contains('fade-scroll')) {
          el.classList.add('fade-scroll');
          scrollObserver.observe(el);
        }
      });
    }

    // Elementos iniciais
    observarElementos();

    // Observa novos cartões adicionados dinamicamente em #resultados pelo app.js
    const resultadosContainer = document.getElementById('resultados');
    if (resultadosContainer) {
      const containerObserver = new MutationObserver(() => {
        observarElementos(resultadosContainer);
      });
      containerObserver.observe(resultadosContainer, { childList: true, subtree: true });
    }
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      iniciarObservadorRolagem();
      monitorarEstatisticas();
    });
  } else {
    iniciarObservadorRolagem();
    monitorarEstatisticas();
  }
})();
