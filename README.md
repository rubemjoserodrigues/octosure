# Octosure

Octosure e um sistema de surebets com tres partes principais:

- `programa/`: aplicativo desktop em Electron usado pelo cliente.
- `api/`: backend em Python que busca sinais, normaliza dados, grava no banco e entrega API/Socket.IO.
- `painel/`: painel PHP para login, usuarios, planos, pagamentos, sugestoes e administracao.

O repositorio esta organizado para o proximo dev conseguir entender o fluxo completo sem precisar acessar a VPS primeiro. O ambiente de producao roda em `/opt/octosure` e o dominio publico usa `https://octosure.net`.

## Mapa Rapido

```text
BetBurger
  -> api/LOCALGERALVPS/run_bot_distribuidor_familias.py
  -> api/LOCALGERALVPS/run_local_pipeline.py
  -> PostgreSQL
  -> api/V2/server.py
  -> /api/* e /socket.io/*
  -> programa/ Electron

painel/ PHP
  -> login, cadastro, planos, pagamentos, sugestoes
  -> autenticacao usada pelo app desktop
```

## Estrutura

```text
.
|-- programa/
|   |-- main.js
|   |-- preload.js
|   |-- detached-preload.js
|   |-- script.js
|   |-- mock-socket-server.js
|   |-- installer-shell/
|   |-- src/
|   `-- package.json
|
|-- api/
|   |-- V2/
|   |-- LOCALGERALVPS/
|   |-- TESTELOCAL/
|   |-- etc/
|   `-- .env.octosure
|
`-- painel/
    |-- api/
    |-- assets/
    |-- public/
    |-- scripts/
    |-- sql/
    `-- src/
```

## Programa Desktop

O app desktop fica em `programa/`. Ele e um Electron com HTML, CSS e JavaScript puro.

Responsabilidades principais:

- tela de login e validacao da conta;
- conexao com API e Socket.IO;
- exibicao das surebets em tempo real;
- filtros de casa, esporte, live e pre-live;
- calculadora de stakes;
- abertura das casas em Chrome gerenciado;
- automacao de odds nas casas onde ja existe AutoOdd;
- empacotamento do instalador e atualizacao automatica.

O app usa o endpoint configurado em `SOCKET_URL`. Em producao, o fluxo normal aponta para `https://octosure.net`.

### Rodar Local

```powershell
cd programa
npm install
$env:SOCKET_URL="https://octosure.net"
$env:DETACHED_EXTERNAL_BROWSER="chrome-managed"
$env:DETACHED_SIDEBAR_MODE="1"
$env:DETACHED_PERSIST_BROWSER_PROFILE="1"
npm start
```

Para rodar com socket mockado:

```powershell
cd programa
npm run mock:socket
npm start
```

### Build

```powershell
cd programa
npm run build:nsis
npm run build:visual-installer
```

O `build:nsis` gera o instalador/atualizador usado pelo Electron Updater.
O `build:visual-installer` gera o instalador visual personalizado.

Os arquivos gerados em `dist/`, `dist-installer/`, `.exe`, `.blockmap` e `latest.yml` nao devem ir para o Git. Eles sao publicados separadamente no servidor.

## API

A pasta `api/` e uma copia organizada do que roda na VPS.

### `api/V2`

Servidor principal em Python, com `aiohttp` e `python-socketio`.

Arquivo principal:

```text
api/V2/server.py
```

Funcoes principais:

- autenticar usuario do app usando o painel;
- expor endpoints HTTP para sinais atuais e historico;
- manter Socket.IO para o app desktop;
- ler dados do PostgreSQL;
- servir o estado atual usado pelo dashboard.

Rotas importantes:

```text
POST /api/auth/login
GET  /api/arbs/current
GET  /api/arbs/history
GET  /api/status
```

Em producao o nginx recebe `/api/` e repassa para o backend local em `127.0.0.1:3005`.

### `api/LOCALGERALVPS`

Pipeline que conversa com a BetBurger, normaliza sinais e grava no PostgreSQL.

Arquivos principais:

```text
api/LOCALGERALVPS/run_bot_distribuidor_familias.py
api/LOCALGERALVPS/run_local_pipeline.py
api/LOCALGERALVPS/localgeralvps/betburger_api.py
api/LOCALGERALVPS/localgeralvps/normalize.py
api/LOCALGERALVPS/localgeralvps/link_resolver.py
api/LOCALGERALVPS/localgeralvps/storage_pg.py
api/LOCALGERALVPS/monitor_betburger_telegram.py
```

Fluxo basico:

1. Le token, filtros live/pre-live e configuracoes do `.env`.
2. Busca paginas da BetBurger em live e prematch.
3. Normaliza os campos de evento, casa, mercado, odd e periodo.
4. Resolve link direto quando possivel.
5. Monta clones a partir das casas maes.
6. Grava tabelas current/history no PostgreSQL.
7. Atualiza a tabela final usada pela API.
8. Monitor envia alerta se o fluxo ficar parado.

### `api/TESTELOCAL`

Tem regras auxiliares para catalogar casas, montar links de clones e testar casas especificas.

Arquivo mais importante:

```text
api/TESTELOCAL/catalogar_casa_local.py
```

Esse arquivo e usado pelo distribuidor para transformar uma casa mae recebida da BetBurger em URLs dos clones usados no programa.

### `api/etc`

Snapshot da configuracao de producao:

```text
api/etc/systemd/system/octosure-api.service
api/etc/systemd/system/octosure-distribuidor.service
api/etc/systemd/system/octosure-betburger-monitor.service
api/etc/nginx/sites-enabled/octosure.net
```

Servicos principais:

```text
octosure-api
octosure-distribuidor
octosure-betburger-monitor
nginx
php-fpm
postgresql
```

## Painel

A pasta `painel/` e o painel PHP.

Responsabilidades:

- login e cadastro;
- validacao de usuarios;
- administracao de usuarios;
- planos;
- pagamentos via Pix;
- webhook Pagou;
- sugestoes e votos;
- controle usado pelo app para liberar acesso.

Arquivos e pastas principais:

```text
painel/public/index.php
painel/public/users.php
painel/api/auth/login.php
painel/api/auth/register.php
painel/api/payments/create_pix.php
painel/api/payments/status.php
painel/api/plans/list.php
painel/api/suggestions/create.php
painel/api/suggestions/list.php
painel/api/suggestions/vote.php
painel/api/webhooks/pagou.php
painel/src/
painel/sql/schema.sql
```

No servidor, o nginx usa `/opt/octosure` como raiz e existe um link:

```text
/opt/octosure/painel -> /opt/octosure/PAINEL
```

Assim, `https://octosure.net/painel/` cai no painel.

## Banco de Dados

O sistema usa PostgreSQL. As credenciais ficam nos arquivos `.env` do ambiente real.

Variaveis importantes:

```text
PG_HOST
PG_USER
PG_PASSWORD
PG_DB
```

Tabelas relevantes do fluxo de sinais:

```text
localgeralvps_arbs_current
localgeralvps_arbs_history
arbs_current
```

O painel tambem tem tabelas proprias, definidas em:

```text
painel/sql/schema.sql
```

## Variaveis de Ambiente

Principais variaveis usadas em producao:

```text
BETBURGER_ACCESS_TOKEN
SEARCH_FILTER_ID_LIVE
SEARCH_FILTER_ID_PREMATCH
MAX_PAGES
PER_PAGE
BETBURGER_LOCALE
PG_HOST
PG_USER
PG_PASSWORD
PG_DB
PANEL_AUTH_ENDPOINT
SOCKET_URL
```

Variaveis uteis no app desktop:

```text
SOCKET_URL
DETACHED_EXTERNAL_BROWSER
DETACHED_SIDEBAR_MODE
DETACHED_PERSIST_BROWSER_PROFILE
DETACHED_MANAGED_CHROME_ZOOM
```

Nao coloque token novo direto em commit publico. Este repositorio veio do ambiente real e e privado, mas antes de dar acesso para terceiros vale revisar token da BetBurger, Telegram, banco e gateway de pagamento.

## Fluxo Completo

1. BetBurger entrega sinais de live e prematch usando filtros salvos na conta.
2. `run_bot_distribuidor_familias.py` chama `run_local_pipeline.py`.
3. O pipeline baixa paginas, normaliza os sinais e grava no PostgreSQL.
4. A API `V2/server.py` consulta o banco e publica `/api/arbs/current`.
5. O app Electron autentica o usuario via painel e consome API/Socket.IO.
6. O usuario clica no evento.
7. O app abre duas janelas/abas gerenciadas do Chrome, uma para cada casa.
8. Se a casa tiver AutoOdd implementado, o script tenta localizar mercado/odd e montar o bilhete.
9. O painel controla usuarios, vencimento, planos e pagamentos.

## AutoOdd

AutoOdd e a parte mais sensivel do projeto. Ela fica principalmente em:

```text
programa/main.js
programa/detached-preload.js
programa/src/detached/
```

Conceito:

- o app recebe casa, evento, mercado, odd e periodo;
- abre a URL da casa em Chrome gerenciado;
- tira snapshots do DOM;
- identifica mercados e botoes de odd;
- clica na odd correta;
- confirma se o bilhete apareceu.

Cada casa pode ter plataforma diferente. Mesmo clones da mesma casa mae podem mudar estrutura de DOM, iframe, idioma, layout mobile/desktop ou formato de mercado. Nao assumir que uma regra serve para todos os clones.

Roteiro recomendado para adicionar uma casa:

1. Pegar um sinal real no app.
2. Abrir a casa pelo proprio programa.
3. Verificar se a URL cai no evento ou apenas na home.
4. Inspecionar DOM, iframes e textos do mercado.
5. Localizar mercado, linha, periodo e odd.
6. Criar regra pequena e isolada para a plataforma.
7. Registrar logs de sucesso e falha.
8. Testar live, prematch, futebol e pelo menos um esporte alternativo quando existir.

Logs ajudam mais que tentativa cega. Quando uma casa falhar, procurar por termos como:

```text
AutoOdd
snapshot
target
iframe
not-tracked
empty
detached
open-bet-windows
```

## Publicacao no Servidor

O ambiente de producao fica em:

```text
/opt/octosure
```

Servicos:

```bash
systemctl restart octosure-api
systemctl restart octosure-distribuidor
systemctl restart octosure-betburger-monitor
```

Ver logs:

```bash
journalctl -u octosure-api -n 120 --no-pager -l
journalctl -u octosure-distribuidor -n 160 --no-pager -l
journalctl -u octosure-betburger-monitor -n 120 --no-pager -l
```

Checar API local na VPS:

```bash
curl -s "http://127.0.0.1:3005/api/arbs/current?page_size=5&subtab=live"
curl -s "http://127.0.0.1:3005/api/arbs/current?page_size=5&subtab=prematch"
```

Checar nginx:

```bash
nginx -T | grep -nEi "server_name|location|proxy_pass|root|alias"
```

## Atualizador e Instalador

O app usa `electron-updater` com provider generico:

```text
https://octosure.net/updates
```

Arquivos esperados no servidor:

```text
/var/www/octosure.net/updates/latest.yml
/var/www/octosure.net/updates/Octosure Setup X.Y.Z.exe
/var/www/octosure.net/updates/Octosure Setup X.Y.Z.exe.blockmap
/var/www/octosure.net/instalador.exe
```

O link publico do instalador e:

```text
https://octosure.net/instalador.exe
```

O instalador nao fica no Git porque passa do limite normal do GitHub. Ele deve ser enviado direto para o servidor.

## Cuidados Antes de Mexer

- Nao alterar token ou filtros da BetBurger sem validar na VPS.
- Nao limpar tabela current sem entender o ciclo do distribuidor.
- Nao assumir que filtro local substitui filtro da BetBurger.
- Nao mudar AutoOdd de uma casa testada sem registrar antes qual evento foi usado.
- Nao commitar `node_modules`, build, instalador, blockmap, logs ou backup pesado.
- Antes de mexer em producao, conferir `systemctl status` e `journalctl`.

## Estado Esperado do Repositorio

```text
programa/  codigo do app desktop
api/       codigo e configuracao do backend da VPS
painel/    painel PHP e schema
README.md documentacao tecnica do projeto
```

Com isso, um dev novo consegue:

1. Rodar o app local apontando para a API real.
2. Entender onde a API busca e entrega sinais.
3. Entender como o painel autentica e libera usuarios.
4. Trabalhar em AutoOdd por casa sem mexer no restante do sistema.
5. Publicar build e atualizacao no servidor quando necessario.
