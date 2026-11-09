# Rota Limpa – Coleta de Resíduos do Recife

Projeto acadêmico de Análise e Desenvolvimento de Sistemas ligado ao **ODS 11 – Cidades e Comunidades Sustentáveis**.

🔗 **Site:** https://coleta-lixo-recife.web.app

## Sobre o projeto

Muitos moradores não sabem quando o caminhão de lixo passa na sua rua, nem onde reclamar quando o lixo acumula. O Rota Limpa resolve esses dois problemas em um só lugar.

## Funcionalidades

- **Consultar:** digite o nome da rua e veja os dias, o turno e se a coleta é hoje ou qual é a próxima. Também é possível adicionar um lembrete na agenda.
- **Denunciar:** envie uma foto e a localização do ponto com lixo, entrando com conta Google ou de forma anônima.
- **Acompanhar:** as denúncias aparecem no mapa, junto com os setores de coleta por turno e as EcoEstações. É possível apoiar uma denúncia com "Eu também vi"; com 3 apoios ela vira chamado crítico.
- **Painel de moderação:** a equipe da Emlurb entra com e-mail e senha, filtra as denúncias, marca como resolvidas e exporta em CSV.

## Dados

Base oficial da Emlurb, do Portal de Dados Abertos do Recife: 5.046 trechos de rua e 127 setores de coleta. A base não traz localização, então os setores exibidos no mapa são aproximados.

## Tecnologias

- HTML, CSS e JavaScript
- Firebase (Firestore, Authentication e Hosting)
- Leaflet (mapa)
- Cloudinary (armazenamento das fotos das denúncias)
- Node.js (scripts de tratamento e importação dos dados)

## Como funciona

1. O CSV da Emlurb (`roteiros-de-coleta-de-residuos.csv`) é tratado pelo script Node e importado no Firestore em lotes.
2. O site lê o Firestore e monta o mapa com o Leaflet.
3. Na denúncia, a foto vai para o Cloudinary, que devolve um link; o link é salvo no Firestore junto com a localização.

## Estrutura do repositório

- `public/`: arquivos do site
- `importar-rotas.js`: importa as rotas para o Firestore
- `gerar-ruas-json.js`: gera a lista de ruas usada no autocomplete
- `firestore.rules`: regras de segurança do banco
- `firebase.json` e `.firebaserc`: configuração do Firebase
- `roteiros-de-coleta-de-residuos.csv`: base de dados da Emlurb

## Como executar

1. Clone o repositório e instale as dependências com `npm install`.
2. Configure o acesso ao seu projeto Firebase. A chave de acesso não está no repositório.
3. Rode os scripts de importação com `node importar-rotas.js` e `node gerar-ruas-json.js`.

## Segurança

Login com Firebase Authentication, regras de validação no banco, validação das fotos, proteção contra XSS e chave de acesso fora do Git.

## Limitações e próximos passos

- Coordenadas dos setores aproximadas
- Sem rastreamento do caminhão em tempo real
- Organizar melhor o código

## Equipe

- **Douglas Elton:** parte técnica (Firebase, Leaflet, scripts Node, Cloudinary e regras do banco)
- **Pedro Manoel:** HTML, CSS e identidade visual
- **Lucas Vitorio:** tratamento do CSV da Emlurb
- **Clara Freire:** textos e documentação
- **Guilherme Henry:** pesquisa com usuários e vídeo de apresentação
