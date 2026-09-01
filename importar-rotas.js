const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// 1. Inicializa credenciais
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const CSV_PATH = path.join(__dirname, 'roteiros-de-coleta-de-residuos.csv');

// 2. Expande abreviações para nomes completos por extenso
function expandirTipoLogradouro(endereco) {
  if (!endereco) return '';
  let formatado = endereco.trim();

  const regras = [
    { regex: /^R\s+/i, subs: 'RUA ' },
    { regex: /^AV\s+/i, subs: 'AVENIDA ' },
    { regex: /^TV\s+/i, subs: 'TRAVESSA ' },
    { regex: /^PÇA\s+/i, subs: 'PRAÇA ' },
    { regex: /^PCA\s+/i, subs: 'PRAÇA ' },
    { regex: /^ESTR\s+/i, subs: 'ESTRADA ' },
    { regex: /^BC\s+/i, subs: 'BECO ' },
    { regex: /^LD\s+/i, subs: 'LADEIRA ' },
    { regex: /^LRG\s+/i, subs: 'LARGO ' },
    { regex: /^AC\s+/i, subs: 'ACESSO ' },
    { regex: /^V\s+/i, subs: 'VILA ' }
  ];

  for (const regra of regras) {
    if (regra.regex.test(formatado)) {
      formatado = formatado.replace(regra.regex, regra.subs);
      break;
    }
  }

  return formatado;
}

// 3. Normaliza para busca sem acentos
function normalizarParaBusca(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function formatarTurno(turnoBruto) {
  if (!turnoBruto) return 'Manhã';
  const t = turnoBruto.toUpperCase().trim();
  if (t.includes('NOT')) return 'Noturno';
  if (t.includes('TAR')) return 'Tarde';
  return 'Manhã';
}

async function importarRotas() {
  console.log('📦 Lendo e formatando logradouros da Emlurb...');
  const rotas = [];

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ Arquivo CSV não encontrado em: ${CSV_PATH}`);
    process.exit(1);
  }

  fs.createReadStream(CSV_PATH, { encoding: 'utf-8' })
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => {
      const enderecoBruto = (row.endereco || '').trim();
      if (!enderecoBruto) return;

      const enderecoExpandido = expandirTipoLogradouro(enderecoBruto);
      const setor = (row.setor || '').trim();
      const rpa = setor ? setor.charAt(0) : '';

      rotas.push({
        logradouro: enderecoExpandido.toUpperCase(),
        logradouroBusca: normalizarParaBusca(enderecoExpandido),
        logradouroOriginal: enderecoBruto.toUpperCase(),
        setor: setor,
        rpa: rpa ? `RPA ${rpa}` : '',
        turno: formatarTurno(row.turno),
        faixaHorario: (row.intervalo || '').trim(),
        diasSemana: (row.frequencia || '').trim().toUpperCase(),
        rotaSetor: row.rota_setor ? parseInt(row.rota_setor, 10) : null,
        tipoColeta: 'Domiciliar'
      });
    })
    .on('end', async () => {
      console.log(`✅ Total de rotas formatadas: ${rotas.length}`);
      console.log('🚀 Sobrescrevendo e atualizando registros no Firestore...');

      const BATCH_SIZE = 450;
      let totalProcessado = 0;

      for (let i = 0; i < rotas.length; i += BATCH_SIZE) {
        const lote = rotas.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        lote.forEach((rota) => {
          const docRef = db.collection('rotas').doc();
          batch.set(docRef, rota);
        });

        await batch.commit();
        totalProcessado += lote.length;
        console.log(`[Lote ${Math.ceil(totalProcessado / BATCH_SIZE)}/${Math.ceil(rotas.length / BATCH_SIZE)}] ${totalProcessado} rotas atualizadas...`);

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('🎉 Banco atualizado com sucesso! Agora todas as ruas começam com "RUA", "AVENIDA", etc.');
      process.exit(0);
    })
    .on('error', (erro) => {
      console.error('❌ Erro na leitura do CSV:', erro);
    });
}

importarRotas();