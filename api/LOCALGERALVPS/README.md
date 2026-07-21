# LOCALGERALVPS

Base local enxuta para:

1. Buscar arbs na API da BetBurger (live e prematch).
2. Resolver `casa_mae` por `family_root`.
3. Salvar no Postgres local em tabelas proprias.

## Estrutura

```text
LOCALGERALVPS/
  .env.example
  requirements.txt
  run_local_pipeline.py
  localgeralvps/
    settings.py
    reference_data.py
    betburger_api.py
    normalize.py
    storage_pg.py
```

## Instalar

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python -m pip install -r LOCALGERALVPS\requirements.txt
```

## Configurar

1. Copie `LOCALGERALVPS\.env.example` para `LOCALGERALVPS\.env`.
2. Ajuste token e dados de Postgres local.

## Rodar

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python LOCALGERALVPS\run_local_pipeline.py --cycles 0 --interval 2.0
```

`--cycles 0` = infinito.

## Bot Distribuidor (Novo)

Roda o fetch **uma vez por ciclo** e distribui as linhas para múltiplas casas mães de uma vez só.

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python LOCALGERALVPS\run_bot_distribuidor_local.py --token SEU_TOKEN --cycles 0 --interval 2.0 --preset core
```

`--preset core` usa:

1. Bet7k (root 447) -> `localgeralvps_bet7k_current` / `localgeralvps_bet7k_history`
2. Bet365 (root 10) -> `localgeralvps_bet365_current` / `localgeralvps_bet365_history`

Outros presets disponíveis:

- `plus`: Bet7k + Bet365 + Goldenpalace
- `all`: Bet7k + Bet365 + Goldenpalace + Vbet

Também é possível sobrescrever workers explicitamente:

```bat
python LOCALGERALVPS\run_bot_distribuidor_local.py --token SEU_TOKEN --workers 447:localgeralvps_bet7k_current:localgeralvps_bet7k_history --workers 10:localgeralvps_bet365_current:localgeralvps_bet365_history --cycles 0
```

Todas as linhas salvas mantêm formato de dados necessário para o painel:

`bet1_link`, `bet2_link`, `bet1_casa_mae`, `bet2_casa_mae` e demais campos.

## Bots Individuais (Casa Mae)

Bet7k:

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python LOCALGERALVPS\run_bot_bet7k.py --token SEU_TOKEN --interval 2.0 --cycles 0
```

Bet365:

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python LOCALGERALVPS\run_bot_bet365.py --token SEU_TOKEN --interval 2.0 --cycles 0
```

Goldenpalace:

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python LOCALGERALVPS\run_bot_goldenpalace.py --token SEU_TOKEN --interval 2.0 --cycles 0
```

Vbet:

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python LOCALGERALVPS\run_bot_vbet.py --token SEU_TOKEN --interval 2.0 --cycles 0
```

Observacao: cada bot individual grava em tabela propria por padrao:

1. Bet7k -> `localgeralvps_bet7k_current` / `localgeralvps_bet7k_history`
2. Bet365 -> `localgeralvps_bet365_current` / `localgeralvps_bet365_history`
3. Goldenpalace -> `localgeralvps_goldenpalace_current` / `localgeralvps_goldenpalace_history`
4. Vbet -> `localgeralvps_vbet_current` / `localgeralvps_vbet_history`

Auditoria rapida (links + clones):

```bat
cd /d C:\Users\Micro\Desktop\RUBEMSUREBETSCRAPING
python LOCALGERALVPS\check_links_and_clones.py
```

## Tabelas criadas no Postgres

1. `localgeralvps_arbs_current` (snapshot atual por `row_key`)
2. `localgeralvps_arbs_history` (historico, opcional via `PG_WRITE_HISTORY=1`)

## Observacoes

1. Esse pipeline nao limpa tabela em falha de rede.
2. Resolve `casa_mae` via arquivo de referencia `TODASURLSEFORMATOS.txt`.
3. Se faltar mapeamento, usa o proprio bookmaker da aposta como fallback.
4. Resolve link final via `oddsrabbit_url` por padrao (`LINK_RESOLVE_ENABLED=1`).
5. Para debug rapido sem resolvedor: adicione `--no-link-resolve`.
