const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'roteiros-de-coleta-de-residuos.csv');
const ruasSet = new Set();

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
  for (const r of regras) {
    if (r.regex.test(formatado)) {
      formatado = formatado.replace(r.regex, r.subs);
      break;
    }
  }
  return formatado.toUpperCase();
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ Arquivo CSV não encontrado em: ${CSV_PATH}`);
  process.exit(1);
}

fs.createReadStream(CSV_PATH, { encoding: 'utf-8' })
  .pipe(csv({ separator: ';' }))
  .on('data', (row) => {
    if (row.endereco) {
      ruasSet.add(expandirTipoLogradouro(row.endereco));
    }
  })
  .on('end', () => {
    const listaOrdenada = Array.from(ruasSet).sort();
    
    // Salva na pasta raiz e na pasta public (se existir)
    fs.writeFileSync(path.join(__dirname, 'ruas.json'), JSON.stringify(listaOrdenada));
    
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(publicDir)) {
      fs.writeFileSync(path.join(publicDir, 'ruas.json'), JSON.stringify(listaOrdenada));
    }

    console.log(`✅ Arquivo ruas.json gerado com sucesso contendo ${listaOrdenada.length} ruas!`);
  });