# PAINEL (PHP + MySQL)

Painel administrativo separado do motor, com layout no estilo do app:
- Login
- Lista de usuarios
- Status de assinatura
- Modal para adicionar usuario
- Modal para atualizar assinatura
- Gestao de admins
- Configuracoes do painel
- Logs do sistema
- Dashboard com graficos
- Financeiro com transacoes
- Relatorios completos + export CSV

## Estrutura

- `public/index.php`: login
- `public/users.php`: dashboard de usuarios/assinaturas
- `public/logout.php`: sair
- `public/assets/css/painel.css`: visual
- `public/assets/js/painel.js`: modais
- `src/`: autenticao, conexao e repositorio
- `sql/schema.sql`: banco e tabelas
- `scripts/create_admin.php`: cria admin via CLI

## Setup rapido

1. Copie `.env.example` para `.env` e ajuste MySQL.
2. Execute `sql/schema.sql` no seu MySQL.
3. Crie admin:
   - `php scripts/create_admin.php admin@seuemail.com suasenha`
4. Sirva a pasta `public` no PHP:
   - `php -S localhost:8080 -t public`
5. Acesse:
   - `http://localhost:8080/index.php`

## cPanel em /surebet (upload unico)

Agora funciona em modo "subir pasta e usar".

Passos:

1. Envie a pasta `PAINEL` inteira para `public_html/surebet/`.
2. Crie `public_html/surebet/.env` com as credenciais.
3. Importe `sql/schema.sql` no banco.
4. Acesse `https://meupack.site/surebet/`.

Sem precisar apontar `public`.

## Observacao

Este painel ainda nao esta interligado ao sistema Electron/socket. Foi criado separado, como base pronta de administracao.
