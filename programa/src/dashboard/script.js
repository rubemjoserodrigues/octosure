// ===== Dashboard Script =====

document.addEventListener('DOMContentLoaded', () => {
    if (window.__appLog) window.__appLog('info', 'PAGE', 'loaded', { page: 'dashboard', url: typeof document !== 'undefined' ? document.URL : null });
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');
    const titlebarLabel = document.getElementById('titlebar-label');
    const navBar = document.querySelector('.nav-bar');
    const navLogo = document.querySelector('.nav-logo');
    const navDataControls = document.querySelector('.nav-data-controls');
    const navTabs = document.querySelectorAll('.nav-tab');
    const subTabs = document.querySelectorAll('.sub-tab');
    const subtabPreLiveBtn = document.querySelector('.sub-tab[data-subtab="pre-live"]');
    const subtabLiveBtn = document.querySelector('.sub-tab[data-subtab="live"]');
    const dataFontControls = document.getElementById('data-font-controls');
    const btnDataFontReset = document.getElementById('btn-data-font-reset');
    const btnDataFontMinus = document.getElementById('btn-data-font-minus');
    const btnDataFontPlus = document.getElementById('btn-data-font-plus');
    const dataFontValue = document.getElementById('data-font-value');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const dataTableBody = document.getElementById('data-table-body');
    const dataTable = document.getElementById('data-table');
    const dataArea = document.getElementById('data-area');
    const dataTableContainer = document.getElementById('data-table-container');
    const contentArea = document.querySelector('.content-area');
    const sidebarPanel = document.querySelector('.sidebar-panel');
    const browserWorkspace = document.getElementById('browser-workspace');
    const browserSplit = browserWorkspace ? browserWorkspace.querySelector('.browser-split') : null;
    const browserDivider = document.getElementById('browser-divider');
    const browserView1 = document.getElementById('browser-view-1');
    const browserView2 = document.getElementById('browser-view-2');
    const browserCurrentIcon = document.getElementById('browser-current-icon');
    const browserCurrentName = document.getElementById('browser-current-name');
    const btnBackToTable = document.getElementById('btn-back-to-table');
    const btnBrowserFocusLeft = document.getElementById('btn-browser-focus-left');
    const btnBrowserFocusSplit = document.getElementById('btn-browser-focus-split');
    const btnBrowserFocusRight = document.getElementById('btn-browser-focus-right');
    const btnBrowserSettings = document.getElementById('btn-browser-settings');
    const browserSettingsModal = document.getElementById('browser-settings-modal');
    const browserOptionsWrap = document.getElementById('browser-options');
    const btnBrowserSettingsClose = document.getElementById('btn-browser-settings-close');
    const appAlertModal = document.getElementById('app-alert-modal');
    const appAlertTitle = document.getElementById('app-alert-title');
    const appAlertMessage = document.getElementById('app-alert-message');
    const appAlertCancel = document.getElementById('app-alert-cancel');
    const appAlertOk = document.getElementById('app-alert-ok');
    const pagePrevBtn = document.getElementById('page-prev');
    const pageNextBtn = document.getElementById('page-next');
    const pageInfoEl = document.getElementById('page-info');
    const chartContainer = document.getElementById('chart-container');
    const socketStatusEl = document.getElementById('socket-status');
    const appVersionLabel = document.getElementById('app-version-label');
    const userEmailEl = document.getElementById('user-email');
    const userDaysEl = document.getElementById('user-days');
    const btnRenew = document.getElementById('btn-renew');
    const btnLogout = document.getElementById('btn-logout');
    const accessLockOverlay = document.getElementById('access-lock-overlay');
    const accessLockTitle = document.getElementById('access-lock-title');
    const accessLockMessage = document.getElementById('access-lock-message');
    const btnUnlockAccess = document.getElementById('btn-unlock-access');
    const preFilterHouseList = document.getElementById('filtro-casa-pre');
    const preFilterSportList = document.getElementById('filtro-esporte-pre');
    const preFilterHouseSearch = document.getElementById('filtro-casa-pre-search');
    const liveFilterHouseList = document.getElementById('filtro-casa-live');
    const liveFilterSportList = document.getElementById('filtro-esporte-live');
    const liveFilterHouseSearch = document.getElementById('filtro-casa-live-search');
    const filterSearchToggleBtns = Array.from(document.querySelectorAll('.filter-search-toggle'));
    const alertSoundEnabledGeneral = document.getElementById('alert-sound-enabled-general');
    const alertSoundSelectGeneral = document.getElementById('alert-sound-select-general');
    const alertSoundEnabledLive = document.getElementById('alert-sound-enabled-live');
    const alertSoundSelectLive = document.getElementById('alert-sound-select-live');
    const cronogramaSportList = document.getElementById('filtro-esporte-crono');
    const preFilterPercentInputs = Array.from(document.querySelectorAll('#panel-pre-filtro .percent-input'));
    const preFilterMaxInline = document.querySelector('#panel-pre-filtro .checkbox-item.inline');
    const preFilterMaxEnabled = preFilterMaxInline ? preFilterMaxInline.querySelector('input[type="checkbox"]') : null;
    const preFilterMaxValue = preFilterMaxInline ? preFilterMaxInline.querySelector('input[type="number"]') : null;
    const calcTable = document.querySelector('.calc-table');
    const casaComboBlue = document.querySelector('.casa-combo-blue');
    const casaComboGreen = document.querySelector('.casa-combo-green');
    const fixarCasaCheckbox = document.getElementById('fixar-casa');
    const autoStakeCheckbox = document.getElementById('auto-stake');
    const calcAutoOddsCheckbox = document.getElementById('calc-auto-odds');
    const signalUrl1Text = document.getElementById('signal-url1-text');
    const signalUrl2Text = document.getElementById('signal-url2-text');
    const btnCopyUrl1 = document.getElementById('btn-copy-url1');
    const btnCopyUrl2 = document.getElementById('btn-copy-url2');
    const detachedEvent1 = document.getElementById('detached-event1');
    const detachedEvent2 = document.getElementById('detached-event2');
    const detachedUrl1 = document.getElementById('detached-url1');
    const detachedUrl2 = document.getElementById('detached-url2');
    const btnDetachedCopy1 = document.getElementById('btn-detached-copy1');
    const btnDetachedCopy2 = document.getElementById('btn-detached-copy2');
    const btnDetachedMin1 = document.getElementById('btn-detached-min1');
    const btnDetachedMin2 = document.getElementById('btn-detached-min2');
    const btnDetachedMax1 = document.getElementById('btn-detached-max1');
    const btnDetachedMax2 = document.getElementById('btn-detached-max2');
    const btnDetachedClose1 = document.getElementById('btn-detached-close1');
    const btnDetachedClose2 = document.getElementById('btn-detached-close2');
    const btnOpenPainel = document.getElementById('btn-open-painel');
    const planilhaPanel = document.getElementById('planilha-panel');
    const reportNavButtons = Array.from(document.querySelectorAll('.report-nav-btn[data-report-view]'));
    const reportViews = Array.from(document.querySelectorAll('.report-view'));
    const reportShellTitle = document.getElementById('report-shell-title');
    const reportShellSubtitle = document.getElementById('report-shell-subtitle');
    const reportNav = document.getElementById('report-nav');
    const reportViewDashboard = document.getElementById('report-view-dashboard');
    const reportViewSurebets = document.getElementById('report-view-surebets');
    const reportAnalysisGlobal = document.getElementById('report-analysis-global');
    const reportAnalysisIndividual = document.getElementById('report-analysis-individual');
    const reportSuggestions = document.getElementById('report-suggestions');
    const reportTooltip = document.getElementById('report-tooltip');
    const reportDashboardPresetButtons = Array.from(document.querySelectorAll('.report-dashboard-pill[data-dashboard-range]'));
    const reportDashboardModeButtons = Array.from(document.querySelectorAll('.report-dashboard-mode-btn[data-dashboard-mode]'));
    const reportDashboardStartDate = document.getElementById('report-dashboard-start-date');
    const reportDashboardEndDate = document.getElementById('report-dashboard-end-date');
    const reportMetricPeriodProfit = document.getElementById('report-metric-period-profit');
    const reportMetricAverageProfit = document.getElementById('report-metric-average-profit');
    const reportMetricAverageRoi = document.getElementById('report-metric-average-roi');
    const reportMetricEntries = document.getElementById('report-metric-entries');
    const reportMetricExpenses = document.getElementById('report-metric-expenses');
    const reportMetricFinalBalance = document.getElementById('report-metric-final-balance');
    const reportChartCumulative = document.getElementById('report-chart-cumulative');
    const reportChartDaily = document.getElementById('report-chart-daily');
    const reportChartWeekday = document.getElementById('report-chart-weekday');
    const reportChartHour = document.getElementById('report-chart-hour');
    const reportChartCumulativeMeta = document.getElementById('report-chart-cumulative-meta');
    const reportChartDailyMeta = document.getElementById('report-chart-daily-meta');
    const planilhaTableBody = document.getElementById('planilha-table-body');
    const btnPlanilhaFechar = document.getElementById('btn-planilha-fechar');
    const btnPlanilhaLimpar = document.getElementById('btn-planilha-limpar');
    const planilhaTotalRegistros = document.getElementById('planilha-total-registros');
    const planilhaLucroMin = document.getElementById('planilha-lucro-min');
    const planilhaRoiMedio = document.getElementById('planilha-roi-medio');
    const planilhaTotalGastos = document.getElementById('planilha-total-gastos');
    const planilhaSaldoFinal = document.getElementById('planilha-saldo-final');
    const planilhaPeriodMonth = document.getElementById('planilha-period-month');
    const planilhaPeriodYear = document.getElementById('planilha-period-year');
    const planilhaSearchInput = document.getElementById('planilha-search-input');
    const planilhaFilterButtons = Array.from(document.querySelectorAll('.planilha-filter-btn[data-planilha-filter-mode]'));
    const btnPlanilhaDefinirDatas = document.getElementById('btn-planilha-definir-datas');
    const btnPlanilhaRecolher = document.getElementById('btn-planilha-recolher');
    const btnPlanilhaRegistrarGastos = document.getElementById('btn-planilha-registrar-gastos');
    const btnPlanilhaRegistrarAposta = document.getElementById('btn-planilha-registrar-aposta');
    const planilhaGastoModal = document.getElementById('planilha-gasto-modal');
    const btnPlanilhaGastoClose = document.getElementById('btn-planilha-gasto-close');
    const btnPlanilhaGastoCancelar = document.getElementById('btn-planilha-gasto-cancelar');
    const btnPlanilhaGastoSalvar = document.getElementById('btn-planilha-gasto-salvar');
    const planilhaGastoDescricao = document.getElementById('planilha-gasto-descricao');
    const planilhaGastoData = document.getElementById('planilha-gasto-data');
    const planilhaGastoValor = document.getElementById('planilha-gasto-valor');
    const planilhaDateFilterModal = document.getElementById('planilha-date-filter-modal');
    const btnPlanilhaDateFilterClose = document.getElementById('btn-planilha-date-filter-close');
    const btnPlanilhaDateFilterCancel = document.getElementById('btn-planilha-date-filter-cancel');
    const btnPlanilhaDateFilterClear = document.getElementById('btn-planilha-date-filter-clear');
    const btnPlanilhaDateFilterApply = document.getElementById('btn-planilha-date-filter-apply');
    const planilhaDateFilterStartInput = document.getElementById('planilha-date-filter-start');
    const planilhaDateFilterEndInput = document.getElementById('planilha-date-filter-end');
    const planilhaApostaModal = document.getElementById('planilha-aposta-modal');
    const btnPlanilhaApostaClose = document.getElementById('btn-planilha-aposta-close');
    const btnPlanilhaApostaCancelar = document.getElementById('btn-planilha-aposta-cancelar');
    const btnPlanilhaApostaSalvar = document.getElementById('btn-planilha-aposta-salvar');
    const planilhaApostaEsporte = document.getElementById('planilha-aposta-esporte');
    const planilhaApostaEsportesList = document.getElementById('planilha-aposta-esportes-list');
    const planilhaApostaLiga = document.getElementById('planilha-aposta-liga');
    const planilhaApostaTipo = document.getElementById('planilha-aposta-tipo');
    const planilhaApostaData1 = document.getElementById('planilha-aposta-data1');
    const planilhaApostaCasa1 = document.getElementById('planilha-aposta-casa1');
    const planilhaApostaEvento = document.getElementById('planilha-aposta-evento');
    const planilhaApostaMercado1 = document.getElementById('planilha-aposta-mercado1');
    const planilhaApostaOdd1 = document.getElementById('planilha-aposta-odd1');
    const planilhaApostaStake1 = document.getElementById('planilha-aposta-stake1');
    const planilhaApostaData2 = document.getElementById('planilha-aposta-data2');
    const planilhaApostaCasa2 = document.getElementById('planilha-aposta-casa2');
    const planilhaApostaCasasList = document.getElementById('planilha-aposta-casas-list');
    const planilhaApostaEvento2 = document.getElementById('planilha-aposta-evento2');
    const planilhaApostaMercado2 = document.getElementById('planilha-aposta-mercado2');
    const planilhaApostaOdd2 = document.getElementById('planilha-aposta-odd2');
    const planilhaApostaStake2 = document.getElementById('planilha-aposta-stake2');

    // ===== Arbs rolling buffer (historico recente do backend) =====
    const ARBS_HISTORY_MAX_PAGES = 20;
    const ARBS_HISTORY_PAGE_SIZE = 100;
    const ARBS_BUFFER_MAX = ARBS_HISTORY_MAX_PAGES * ARBS_HISTORY_PAGE_SIZE;
    let arbsBuffer = []; // array of { arb, timestamp }
    let knownArbKeys = new Set();
    let alertSoundPrimed = false;
    let tableRenderScheduled = false;
    let lastDataLogTime = 0;
    const DATA_LOG_THROTTLE_MS = 2000;
    const preFilterState = {
        houseOptions: [],
        sportOptions: [],
        selectedHouses: new Set(),
        selectedSports: new Set(),
        initialized: false,
        fixedFromServer: false,
    };
    const liveFilterState = {
        houseOptions: [],
        sportOptions: [],
        selectedHouses: new Set(),
        selectedSports: new Set(),
        initialized: false,
        fixedFromServer: false,
    };
    const MIN_HOUSE_FILTER_SELECTIONS = 2;
    const cronogramaFilterState = {
        sportOptions: [],
        selectedSports: new Set(),
        initialized: false,
        fixedFromServer: false,
    };
    const preFilterBucketUpperHours = [3, 6, 12, 18, 24, 36, 48, 72, 96, 120, 144, 168];
    const CRONOGRAMA_TIMEZONE = 'America/Sao_Paulo';
    let cronogramaDateFormatter = null;
    let cronogramaHourFormatter = null;
    try {
        cronogramaDateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: CRONOGRAMA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        cronogramaHourFormatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: CRONOGRAMA_TIMEZONE,
            hour: '2-digit',
            hour12: false,
        });
    } catch (_) {}
    let activeMainTab = 'dados';
    let activeSubtab = 'live';
    let cronogramaSeries = [];
    const TABLE_PAGE_SIZE = ARBS_HISTORY_PAGE_SIZE;
    let currentTablePage = 1;
    let recolhidoMode = false;
    let selectedRowLinks = null;
    let selectedRowKey = '';
    let appAlertConfirmResolver = null;
    let removeAppUpdateStatusListener = null;
    let removeAppUpdateReadyListener = null;
    let appUpdatePromptActive = false;
    let lastPromptedUpdateVersion = '';
    let detachedWindowState = {
        link1: '',
        link2: '',
        event1: '',
        event2: '',
    };
    let browserSplitMode = 'split';
    let browserSplitRatio = 50;
    let browserSplitDragging = false;
    const BROWSER_PREF_KEY = 'octosure_browser_preference';
    const BROWSER_PREF_KEY_LEGACY = 'polvo_browser_preference';
    const ALERT_SOUND_ENABLED_KEY = 'octosure_alert_sound_enabled';
    const ALERT_SOUND_ENABLED_KEY_LEGACY = 'polvo_alert_sound_enabled';
    const ALERT_SOUND_TYPE_KEY = 'octosure_alert_sound_type';
    const ALERT_SOUND_TYPE_KEY_LEGACY = 'polvo_alert_sound_type';
    const DATA_FONT_SCALE_KEY = 'octosure_data_font_scale';
    const DATA_FONT_SCALE_KEY_LEGACY = 'polvo_data_font_scale';
    const USER_PROFILE_KEY = 'octosure_user_profile';
    const USER_PROFILE_KEY_LEGACY = 'polvo_user_profile';
    const CHECKOUT_CONTEXT_KEY = 'octosure_checkout_context';
    const FILTER_SELECTIONS_KEY = 'octosure_filter_selections_v1';
    const DATA_FONT_SCALE_DEFAULT = 0.90;
    const DATA_FONT_SCALE_MIN = 0.70;
    const DATA_FONT_SCALE_MAX = 1.40;
    const DATA_FONT_SCALE_STEP = 0.05;
    const ALERT_SOUND_FILES = {
        beep: '../assets/sounds/beep 2.mp3',
        stop: '../assets/sounds/stop.mp3',
    };
    const ALERT_SOUND_DEFAULT = 'beep';
    const PLANILHA_STORAGE_KEY = 'octosure_planilha_v1';
    const PLANILHA_STORAGE_KEY_LEGACY = 'polvo_planilha_v1';
    const PLANILHA_GASTOS_KEY = 'octosure_planilha_gastos_v1';
    const PLANILHA_STATUS_OPTIONS = ['Pendente', 'Green', 'Meio Green', 'Red', 'Meio Red', 'Devolvido', 'Cashout'];
    const PLANILHA_KNOWN_HOUSES = [
        '1bet',
        '1pra1.bet.br',
        '7games.bet.br',
        '7k.bet.br',
        '888sport',
        'apostas.betwarrior.bet.br',
        'apostaganha.bet.br',
        'bateu.bet.br',
        'bet365.bet.br',
        'betao.bet.br',
        'betano.bet.br',
        'betboo.bet.br',
        'betfair.bet.br',
        'betfusion.bet.br',
        'betmgm.bet.br',
        'betnacional.bet.br',
        'betsson.bet.br',
        'betvip.bet.br',
        'betdasorte.bet.br',
        'blaze.bet.br',
        'br4.bet.br',
        'brx.bet.br',
        'bullsbet.bet.br',
        'cassino.bet.br',
        'donald.bet.br',
        'esporte365.bet.br',
        'esportiva.bet.br',
        'estrelabet.bet.br',
        'jogodeouro.bet.br',
        'kto.bet.br',
        'lotogreen.bet.br',
        'lsbet',
        'luva.bet.br',
        'maxima.bet.br',
        'mcgames.bet.br',
        'novibet.bet.br',
        'ona.bet.br',
        'pagol.bet.br',
        'pinnacle.bet.br',
        'pix.bet.br',
        'r7.bet.br',
        'rico.bet.br',
        'rivalo',
        'sortenabet.bet.br',
        'sports.sportingbet.bet.br',
        'stake.bet.br',
        'start.bet.br',
        'suprema.bet.br',
        'superbet.bet.br',
        'unibet',
        'unibet.com',
        'vaidebet.bet.br',
        'vbet.bet.br',
        'vera.bet.br',
        'winner',
    ];
    const FILTER_CLONE_HOUSES = Object.freeze([
        '1pra1.bet.br',
        '7games.bet',
        '7games.bet.br',
        '7k.bet.br',
        'aposta.bet.br',
        'aposta1.bet.br',
        'apostaganha.bet.br',
        'apostas.betwarrior.bet.br',
        'apostou.bet.br',
        'aviao.bet.br',
        'b1bet.bet.br',
        'bateu.bet.br',
        'bet365.bet.br',
        'bet4.bet.br',
        'betaki.bet.br',
        'betano.bet.br',
        'betao.bet.br',
        'betboo.bet.br',
        'betbra.bet.br',
        'betdasorte.bet.br',
        'betfair.bet.br',
        'betfalcons.bet.br',
        'betfast.bet.br',
        'betfusion.bet.br',
        'betgorillas.bet.br',
        'betmgm.bet.br',
        'betmillion.io',
        'betnacional.bet.br',
        'betpix365.bet.br',
        'betpontobet.bet.br',
        'betsson.bet.br',
        'betvip.bet.br',
        'big.bet.br',
        'bingo.bet.br',
        'blaze.bet.br',
        'br4.bet.br',
        'bra.bet.br',
        'brasildasorte.bet.br',
        'bravo.bet.br',
        'brbet.bet.br',
        'brx.bet.br',
        'bullsbet.bet.br',
        'cassino.bet.br',
        'donald.bet.br',
        'esporte365.bet.br',
        'esportiva.bet.br',
        'estrelabet.bet.br',
        'faz1.bet.br',
        'fazo.bet.br',
        'flabet.bet.br',
        'geralbet.bet.br',
        'goldebet.bet.br',
        'h2.bet.br',
        'ice.bet.br',
        'international.betwarrior.bet',
        'jogao.bet.br',
        'jogodeouro.bet.br',
        'jonbet.bet.br',
        'kingpanda.bet.br',
        'kto.bet.br',
        'lider.bet.br',
        'lotogreen.bet.br',
        'lottoland.bet.br',
        'luva.bet.br',
        'maxima.bet.br',
        'mcgames.bet.br',
        'mmabet.bet.br',
        'multi.bet.br',
        'novibet.bet.br',
        'novibet.gr',
        'ona.bet.br',
        'pagol.bet.br',
        'pin.bet.br',
        'pinnacle.bet.br',
        'pix.bet.br',
        'play.bet.br',
        'playpix.com',
        'r7.bet.br',
        'reals.bet.br',
        'rico.bet.br',
        'seguro.bet.br',
        'seu.bet.br',
        'sortenabet.bet.br',
        'sorteonline.bet.br',
        'sports.sportingbet.bet.br',
        'sporty.bet.br',
        'stake.bet.br',
        'start.bet.br',
        'superbet.bet.br',
        'suprema.bet.br',
        'tivo.bet.br',
        'ultra.bet.br',
        'up.bet.br',
        'vaidebet.bet.br',
        'vbet.bet.br',
        'vera.bet.br',
        'vupi.bet.br',
    ]);
    const FILTER_HOUSE_ALIASES = Object.freeze({
        '7games.bet.br': '7games.bet',
        'bet365.com': 'bet365.bet.br',
        'betwarrior.bet.br': 'apostas.betwarrior.bet.br',
        'sportingbet.bet.br': 'sports.sportingbet.bet.br',
    });
    let alertSoundEnabled = false;
    let alertSoundType = ALERT_SOUND_DEFAULT;
    const PLANILHA_MONTH_LABELS = {
        '01': 'Janeiro',
        '02': 'Fevereiro',
        '03': 'Marco',
        '04': 'Abril',
        '05': 'Maio',
        '06': 'Junho',
        '07': 'Julho',
        '08': 'Agosto',
        '09': 'Setembro',
        '10': 'Outubro',
        '11': 'Novembro',
        '12': 'Dezembro',
    };
    const REPORT_DASHBOARD_WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const REPORT_SUGGESTIONS_DEFAULT_BASE_URL = 'https://octosure.net';
    const REPORT_SUGGESTIONS_REFRESH_MS = 45 * 1000;
    const REPORT_SUGGESTIONS_API_CANDIDATES = [
        'painel/api/suggestions',
        'surebet/api/suggestions',
        'api/suggestions',
    ];
    const REPORT_SUGGESTIONS_TYPE_FILTERS = [
        { value: 'all', label: 'Todos' },
        { value: 'suggestion', label: 'Sugestoes' },
        { value: 'update', label: 'Atualizacoes' },
    ];
    const REPORT_SUGGESTIONS_STATUS_FILTERS = [
        { value: 'all', label: 'Todos status' },
        { value: 'em_votacao', label: 'Em votacao' },
        { value: 'em_desenvolvimento', label: 'Em desenvolvimento' },
        { value: 'lancado', label: 'Lancado' },
    ];
    const REPORT_SUGGESTIONS_SORT_FILTERS = [
        { value: 'votes', label: 'Mais votados' },
        { value: 'recent', label: 'Recentes' },
        { value: 'status', label: 'Status' },
    ];
    let planilhaRegistros = [];
    let planilhaSearchTerm = '';
    let planilhaFilterMode = 'todos';
    let planilhaSelectedYear = '';
    let planilhaSelectedMonth = '';
    let activeReportView = 'dashboard';
    let reportSuggestionsRefreshHandle = 0;
    let reportDashboardRangePreset = '30d';
    let reportDashboardMode = 'todos';
    let reportDashboardStart = '';
    let reportDashboardEnd = '';
    let reportSuggestionsState = {
        apiBase: '',
        baseUrl: '',
        token: '',
        viewer: null,
        stats: null,
        items: [],
        typeFilter: 'all',
        statusFilter: 'all',
        sort: 'votes',
        loading: false,
        submitting: false,
        votingId: 0,
        error: '',
        lastFetchedAt: 0,
        detailId: 0,
        requestSeq: 0,
        draftTitle: '',
        draftDetails: '',
    };
    let planilhaDateFilterStart = '';
    let planilhaDateFilterEnd = '';
    let activeDataAreaMode = 'table';
    let dataFontScale = DATA_FONT_SCALE_DEFAULT;
    const browserPrefs = {
        system: { label: 'Padrao do sistema', iconClass: 'browser-system' },
        chrome: { label: 'Google Chrome', iconClass: 'browser-chrome' },
        edge: { label: 'Microsoft Edge', iconClass: 'browser-edge' },
        firefox: { label: 'Mozilla Firefox', iconClass: 'browser-firefox' },
    };
    const DETACHED_BROWSER_MODE = true;
    let lastOpenUsedDetached = false;
    let detachedPrimeTimer = null;
    let removeBetanoOddUpdateListener = null;
    const LIVE_ODD_OVERRIDE_TTL_MS = 3 * 60 * 1000;
    const liveOddOverrides = {
        bet1: null,
        bet2: null,
    };

    function clampNumber(value, min, max) {
        const num = Number(value);
        if (!Number.isFinite(num)) return min;
        return Math.min(max, Math.max(min, num));
    }

    function readSavedDataFontScale() {
        try {
            const raw = localStorage.getItem(DATA_FONT_SCALE_KEY) ?? localStorage.getItem(DATA_FONT_SCALE_KEY_LEGACY);
            if (raw == null || raw === '') return DATA_FONT_SCALE_DEFAULT;
            return clampNumber(Number.parseFloat(raw), DATA_FONT_SCALE_MIN, DATA_FONT_SCALE_MAX);
        } catch (_) {
            return DATA_FONT_SCALE_DEFAULT;
        }
    }

    function updateDataFontValueLabel() {
        if (!dataFontValue) return;
        dataFontValue.textContent = `${Math.round(dataFontScale * 100)}%`;
    }

    function applyDataFontScale(scale, { persist = true } = {}) {
        const safeScale = clampNumber(scale, DATA_FONT_SCALE_MIN, DATA_FONT_SCALE_MAX);
        dataFontScale = Math.round(safeScale * 100) / 100;
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.style.setProperty('--data-table-font-scale', dataFontScale.toFixed(2));
            const rowScale = 1.10 * (dataFontScale / DATA_FONT_SCALE_DEFAULT);
            document.documentElement.style.setProperty('--data-table-row-scale', rowScale.toFixed(2));
        }
        updateDataFontValueLabel();
        if (!persist) return;
        try {
            localStorage.setItem(DATA_FONT_SCALE_KEY, dataFontScale.toFixed(2));
        } catch (_) {}
    }

    function readAlertSoundEnabled() {
        try {
            const raw = localStorage.getItem(ALERT_SOUND_ENABLED_KEY) ?? localStorage.getItem(ALERT_SOUND_ENABLED_KEY_LEGACY);
            if (raw == null || raw === '') return false;
            const normalized = String(raw).trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
        } catch (_) {
            return false;
        }
    }

    function readAlertSoundType() {
        try {
            const raw = String(localStorage.getItem(ALERT_SOUND_TYPE_KEY) ?? localStorage.getItem(ALERT_SOUND_TYPE_KEY_LEGACY) ?? '').trim().toLowerCase();
            return ALERT_SOUND_FILES[raw] ? raw : ALERT_SOUND_DEFAULT;
        } catch (_) {
            return ALERT_SOUND_DEFAULT;
        }
    }

    function persistAlertSoundSettings() {
        try {
            localStorage.setItem(ALERT_SOUND_ENABLED_KEY, alertSoundEnabled ? '1' : '0');
            localStorage.setItem(ALERT_SOUND_TYPE_KEY, alertSoundType);
        } catch (_) {}
    }

    function getAlertSoundControlPairs() {
        return [
            { checkbox: alertSoundEnabledGeneral, select: alertSoundSelectGeneral },
            { checkbox: alertSoundEnabledLive, select: alertSoundSelectLive },
        ];
    }

    function syncAlertSoundControls() {
        getAlertSoundControlPairs().forEach(({ checkbox, select }) => {
            if (checkbox) checkbox.checked = !!alertSoundEnabled;
            if (select) {
                select.value = alertSoundType;
                select.disabled = !alertSoundEnabled;
            }
        });
    }

    function setAlertSoundEnabled(nextEnabled, { persist = true } = {}) {
        alertSoundEnabled = !!nextEnabled;
        syncAlertSoundControls();
        if (persist) persistAlertSoundSettings();
    }

    function setAlertSoundType(nextType, { persist = true } = {}) {
        alertSoundType = ALERT_SOUND_FILES[nextType] ? nextType : ALERT_SOUND_DEFAULT;
        syncAlertSoundControls();
        if (persist) persistAlertSoundSettings();
    }

    function attachAlertSoundListeners() {
        getAlertSoundControlPairs().forEach(({ checkbox, select }) => {
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    setAlertSoundEnabled(checkbox.checked);
                });
            }
            if (select) {
                select.addEventListener('change', () => {
                    setAlertSoundType(select.value);
                });
            }
        });
    }

    function playBatchAlertSound() {
        if (!alertSoundEnabled) return;
        const soundPath = ALERT_SOUND_FILES[alertSoundType];
        if (!soundPath) return;
        try {
            const audio = new Audio(new URL(soundPath, window.location.href).toString());
            audio.volume = 1;
            const maybePromise = audio.play();
            if (maybePromise && typeof maybePromise.catch === 'function') {
                maybePromise.catch(() => {});
            }
        } catch (_) {}
    }

    function rebuildKnownArbKeys() {
        knownArbKeys = new Set(
            arbsBuffer
                .map((item) => getArbStableKey(item && item.arb))
                .filter(Boolean)
        );
    }

    function readUserProfile() {
        try {
            const raw = localStorage.getItem(USER_PROFILE_KEY) ?? localStorage.getItem(USER_PROFILE_KEY_LEGACY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (_) {
            return null;
        }
    }

    function renderUserChip() {
        const profile = readUserProfile();
        const email = profile && profile.email ? String(profile.email) : '-';
        const kind = profile && profile.kind ? String(profile.kind) : '';
        const sub = profile && profile.subscription && typeof profile.subscription === 'object'
            ? profile.subscription
            : null;
        const daysRemaining = sub && Number.isFinite(Number(sub.daysRemaining))
            ? Number(sub.daysRemaining)
            : null;

        if (userEmailEl) userEmailEl.textContent = email;

        if (userDaysEl) {
            if (kind === 'admin') {
                userDaysEl.textContent = 'Conta admin';
            } else if (daysRemaining == null) {
                userDaysEl.textContent = 'Dias restantes: -';
            } else {
                userDaysEl.textContent = `Dias restantes: ${daysRemaining}`;
            }
        }

        if (btnRenew) {
            const showRenew = kind !== 'admin' && daysRemaining != null && daysRemaining < 12;
            btnRenew.classList.toggle('hidden', !showRenew);
        }
        refreshAccessGate();
    }

    function normalizeAccessType(value) {
        const text = String(value || '').trim().toLowerCase();
        return ['prematch', 'live', 'full'].includes(text) ? text : '';
    }

    function currentUserAccessType() {
        const profile = readUserProfile();
        if (profile && String(profile.kind || '') === 'admin') return 'full';
        const sub = profile && profile.subscription && typeof profile.subscription === 'object'
            ? profile.subscription
            : null;
        const accessType = normalizeAccessType(sub && sub.accessType);
        return accessType || 'full';
    }

    function accessModeLabel(subtab) {
        return subtab === 'pre-live' ? 'Pre-Live' : 'Live';
    }

    function hasAccessToSubtab(subtab) {
        const accessType = currentUserAccessType();
        if (accessType === 'full') return true;
        if (subtab === 'pre-live') return accessType === 'prematch';
        if (subtab === 'live') return accessType === 'live';
        return true;
    }

    function shouldGateCurrentView() {
        const supportsDataView = activeMainTab === 'dados' || activeMainTab === 'pre-filtro' || activeMainTab === 'live-filtro';
        return supportsDataView && activeDataAreaMode === 'table' && !hasAccessToSubtab(activeSubtab);
    }

    function refreshAccessGate() {
        if (!contentArea || !accessLockOverlay) return;
        const locked = shouldGateCurrentView();
        contentArea.classList.toggle('access-locked', locked);
        accessLockOverlay.classList.toggle('hidden', !locked);
        if (!locked) return;

        const modeLabel = accessModeLabel(activeSubtab);
        const accessType = currentUserAccessType();
        const planLabel = accessType === 'live' ? 'Live' : accessType === 'prematch' ? 'Pre-Live' : 'seu plano atual';
        if (accessLockTitle) accessLockTitle.textContent = `${modeLabel} bloqueado`;
        if (accessLockMessage) {
            accessLockMessage.textContent = `Seu plano ${planLabel} nao libera a area ${modeLabel}. Desbloqueie para acessar essas oportunidades.`;
        }
    }

    function openCheckoutForAccess() {
        try {
            const profile = readUserProfile() || {};
            const context = {
                userId: Number(profile.id || 0),
                email: profile.email || '',
                name: profile.name || '',
                hasBillingProfile: profile.hasBillingProfile === true,
                authenticated: true,
                targetAccess: activeSubtab === 'pre-live' ? 'prematch' : 'live',
                source: 'dashboard-access-lock',
                createdAt: Date.now(),
            };
            localStorage.setItem(CHECKOUT_CONTEXT_KEY, JSON.stringify(context));
        } catch (_) {}
        if (window.polvo && typeof window.polvo.navigateToLogin === 'function') {
            window.polvo.navigateToLogin();
        }
    }

    function renderAppVersion() {
        if (!appVersionLabel) return;
        if (!window.polvo || typeof window.polvo.getAppInfo !== 'function') {
            appVersionLabel.textContent = 'v-';
            return;
        }
        Promise.resolve(window.polvo.getAppInfo())
            .then((info = {}) => {
                const version = String((info && info.version) || '').trim();
                appVersionLabel.textContent = version ? `v${version}` : 'v-';
            })
            .catch(() => {
                appVersionLabel.textContent = 'v-';
            });
    }

    function parseNumber(value, fallback = 0) {
        const parsed = Number.parseFloat(String(value == null ? '' : value).replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function parseDateToMs(value) {
        if (value == null || value === '') return null;

        if (typeof value === 'number') {
            const ms = value > 1e12 ? value : value * 1000;
            return Number.isFinite(ms) ? ms : null;
        }

        if (typeof value === 'string') {
            const txt = value.trim();
            if (!txt) return null;

            // Trata como timestamp apenas quando a string for numerica.
            if (/^-?\d+(?:\.\d+)?$/.test(txt)) {
                const numeric = Number.parseFloat(txt);
                if (Number.isFinite(numeric)) {
                    const ms = numeric > 1e12 ? numeric : numeric * 1000;
                    return Number.isFinite(ms) ? ms : null;
                }
            }

            const parsed = Date.parse(txt);
            if (Number.isFinite(parsed)) return parsed;
        }

        return null;
    }

    function parseArbPercentage(arb) {
        if (!arb || arb.percentage == null) return null;
        const pct = parseNumber(arb.percentage, Number.NaN);
        return Number.isFinite(pct) ? pct : null;
    }

    function getArbStableKey(arb) {
        if (!arb || typeof arb !== 'object') return '';
        const candidates = [
            arb.arbId,
            arb.arb_id,
            arb.arbHash,
            arb.arb_hash,
            arb.id,
            arb.uid,
        ];
        for (const candidate of candidates) {
            const key = String(candidate == null ? '' : candidate).trim();
            if (key) return key;
        }
        const b1 = arb.bet1 || {};
        const b2 = arb.bet2 || {};
        const fallback = [
            String(arb.eventName || arb.event_name || '').trim(),
            String(b1.bookmaker || '').trim(),
            String(b2.bookmaker || '').trim(),
            String(b1.entryType || '').trim(),
            String(b2.entryType || '').trim(),
            String(b1.marketAndBetType || '').trim(),
            String(b2.marketAndBetType || '').trim(),
            String(b1.bookmakerEventDirectLink || b1.bookmakerUrl || '').trim(),
            String(b2.bookmakerEventDirectLink || b2.bookmakerUrl || '').trim(),
        ].filter(Boolean).join('|');
        return fallback;
    }

    function appendArbsBatchToBuffer(incomingArbs, timestamp) {
        if (!Array.isArray(incomingArbs) || incomingArbs.length === 0) return;
        const nextTs = timestamp || new Date().toISOString();
        const batchItems = incomingArbs
            .filter((arb) => arb && typeof arb === 'object')
            .map((arb) => ({ arb, timestamp: nextTs }));
        if (!batchItems.length) return;
        arbsBuffer = batchItems.concat(arbsBuffer);
        if (arbsBuffer.length > ARBS_BUFFER_MAX) {
            arbsBuffer = arbsBuffer.slice(0, ARBS_BUFFER_MAX);
        }
    }

    function getArbStartMs(arb) {
        if (!arb || typeof arb !== 'object') return null;
        const b1 = arb.bet1 || {};
        const b2 = arb.bet2 || {};
        const candidates = [
            arb.startsAt,
            arb.startAt,
            arb.startedAt,
            b1.startsAt,
            b2.startsAt,
            b1.startAt,
            b2.startAt,
            b1.started_at,
            b2.started_at,
        ];

        for (const candidate of candidates) {
            const ms = parseDateToMs(candidate);
            if (ms != null) return ms;
        }
        return null;
    }

    function inferArbIsLive(arb) {
        if (!arb || typeof arb !== 'object') return null;
        if (typeof arb.isLive === 'boolean') return arb.isLive;
        if (typeof arb.is_live === 'boolean') return arb.is_live;

        const candidates = [
            arb.isLive,
            arb.is_live,
            arb.live,
            arb.bet1 && (arb.bet1.isLive ?? arb.bet1.is_live),
            arb.bet2 && (arb.bet2.isLive ?? arb.bet2.is_live),
        ];
        for (const candidate of candidates) {
            const liveNum = parseNumber(candidate, Number.NaN);
            if (Number.isFinite(liveNum)) return liveNum !== 0;
        }
        return null;
    }

    function applyLiveSubtabFilter(bufferItems) {
        if (activeSubtab !== 'live' && activeSubtab !== 'pre-live') return bufferItems;
        return (bufferItems || []).filter((item) => {
            const arb = item && item.arb ? item.arb : item;
            const isLive = inferArbIsLive(arb);
            if (isLive == null) return true;
            if (activeSubtab === 'live') return isLive === true;
            return isLive === false;
        });
    }

    function getArbMinPercentThreshold(arb) {
        if (!preFilterPercentInputs.length) return 0;

        const startMs = getArbStartMs(arb);
        if (startMs == null) return 0;
        let bucketIdx = 0;

        const hoursUntilStart = (startMs - Date.now()) / 3600000;
        if (Number.isFinite(hoursUntilStart) && hoursUntilStart > 0) {
            bucketIdx = preFilterBucketUpperHours.findIndex((maxHours) => hoursUntilStart < maxHours);
            if (bucketIdx < 0) bucketIdx = preFilterBucketUpperHours.length - 1;
        }

        const input = preFilterPercentInputs[bucketIdx] || preFilterPercentInputs[0];
        return parseNumber(input && input.value, 0);
    }

    function socketLog(message, level = 'info') {
        const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
        console.log(`[socket] ${message}`);
        void level;
        void time;
    }

    function showSystemAlert(message, title = 'Aviso') {
        if (!appAlertModal || !appAlertTitle || !appAlertMessage) {
            console.warn(message);
            return;
        }
        if (appAlertConfirmResolver) {
            const resolve = appAlertConfirmResolver;
            appAlertConfirmResolver = null;
            resolve(false);
        }
        appAlertModal.classList.remove('confirm-mode');
        appAlertTitle.textContent = title || 'Aviso';
        appAlertMessage.textContent = message || '';
        if (appAlertOk) appAlertOk.textContent = 'OK';
        if (appAlertCancel) appAlertCancel.textContent = 'Cancelar';
        appAlertModal.classList.remove('hidden');
    }

    function showSystemConfirm(message, title = 'Confirmacao', { okText = 'Excluir', cancelText = 'Cancelar' } = {}) {
        if (!appAlertModal || !appAlertTitle || !appAlertMessage) {
            const fallback = window.confirm(message || 'Confirmar?');
            return Promise.resolve(!!fallback);
        }
        if (appAlertConfirmResolver) {
            const resolve = appAlertConfirmResolver;
            appAlertConfirmResolver = null;
            resolve(false);
        }
        appAlertModal.classList.add('confirm-mode');
        appAlertTitle.textContent = title || 'Confirmacao';
        appAlertMessage.textContent = message || 'Confirmar acao?';
        if (appAlertOk) appAlertOk.textContent = okText || 'OK';
        if (appAlertCancel) appAlertCancel.textContent = cancelText || 'Cancelar';
        appAlertModal.classList.remove('hidden');
        return new Promise((resolve) => {
            appAlertConfirmResolver = resolve;
        });
    }

    function hideSystemAlert(confirmResult = null) {
        if (!appAlertModal) return;
        if (appAlertConfirmResolver) {
            const resolve = appAlertConfirmResolver;
            appAlertConfirmResolver = null;
            resolve(!!confirmResult);
        }
        appAlertModal.classList.remove('confirm-mode');
        if (appAlertOk) appAlertOk.textContent = 'OK';
        if (appAlertCancel) appAlertCancel.textContent = 'Cancelar';
        appAlertModal.classList.add('hidden');
    }

    function normalizeUpdateVersionTag(payload = {}) {
        const version = String((payload && payload.version) || '').trim();
        if (version) return version;
        const releaseName = String((payload && payload.releaseName) || '').trim();
        if (releaseName) return releaseName;
        return '__downloaded__';
    }

    async function promptRestartToApplyUpdate(payload = {}) {
        if (appUpdatePromptActive) return;
        appUpdatePromptActive = true;
        const versionTag = normalizeUpdateVersionTag(payload);
        lastPromptedUpdateVersion = versionTag;

        const versionLabel = String((payload && payload.version) || '').trim();
        const message = versionLabel
            ? `A atualizacao ${versionLabel} foi baixada em segundo plano. Deseja reiniciar agora para aplicar?`
            : 'Uma atualizacao foi baixada em segundo plano. Deseja reiniciar agora para aplicar?';

        try {
            const shouldRestart = await showSystemConfirm(message, 'Atualizacao pronta', {
                okText: 'Reiniciar agora',
                cancelText: 'Depois',
            });
            if (!shouldRestart) return;
            if (!window.polvo || typeof window.polvo.restartToApplyUpdate !== 'function') {
                showSystemAlert('Nao foi possivel iniciar a atualizacao automaticamente nesta versao.');
                return;
            }
            const result = await window.polvo.restartToApplyUpdate();
            if (!result || result.ok !== true) {
                showSystemAlert('Nao foi possivel reiniciar para atualizar agora. Tente fechar e abrir o app.');
            }
        } catch (_) {
            showSystemAlert('Falha ao concluir a atualizacao automatica. Tente novamente.');
        } finally {
            appUpdatePromptActive = false;
        }
    }

    function bindAppUpdateBridge() {
        if (!window.polvo) return;

        if (typeof removeAppUpdateStatusListener === 'function') {
            try {
                removeAppUpdateStatusListener();
            } catch (_) {}
            removeAppUpdateStatusListener = null;
        }
        if (typeof removeAppUpdateReadyListener === 'function') {
            try {
                removeAppUpdateReadyListener();
            } catch (_) {}
            removeAppUpdateReadyListener = null;
        }

        if (typeof window.polvo.onAppUpdateReady === 'function') {
            removeAppUpdateReadyListener = window.polvo.onAppUpdateReady((payload = {}) => {
                const versionTag = normalizeUpdateVersionTag(payload);
                if (versionTag === lastPromptedUpdateVersion) return;
                promptRestartToApplyUpdate(payload);
            });
        }

        if (typeof window.polvo.onAppUpdateStatus === 'function') {
            removeAppUpdateStatusListener = window.polvo.onAppUpdateStatus((payload = {}) => {
                if (!payload || typeof payload !== 'object') return;
                if (payload.updateDownloaded || payload.status === 'update-downloaded') {
                    const versionTag = normalizeUpdateVersionTag(payload);
                    if (versionTag === lastPromptedUpdateVersion) return;
                    promptRestartToApplyUpdate(payload);
                }
            });
        }

        if (typeof window.polvo.getAppUpdateState === 'function') {
            Promise.resolve(window.polvo.getAppUpdateState())
                .then((payload = {}) => {
                    if (!payload || typeof payload !== 'object') return;
                    if (!(payload.updateDownloaded || payload.status === 'update-downloaded')) return;
                    const versionTag = normalizeUpdateVersionTag(payload);
                    if (versionTag === lastPromptedUpdateVersion) return;
                    promptRestartToApplyUpdate(payload);
                })
                .catch(() => {});
        }
    }

    function getSavedBrowserPref() {
        try {
            const raw = localStorage.getItem(BROWSER_PREF_KEY) ?? localStorage.getItem(BROWSER_PREF_KEY_LEGACY);
            if (raw && browserPrefs[raw]) return raw;
        } catch (_) {}
        return 'system';
    }

    function hasSavedBrowserPref() {
        try {
            const raw = localStorage.getItem(BROWSER_PREF_KEY) ?? localStorage.getItem(BROWSER_PREF_KEY_LEGACY);
            return !!(raw && browserPrefs[raw]);
        } catch (_) {
            return false;
        }
    }

    function saveBrowserPref(browser) {
        const safe = browserPrefs[browser] ? browser : 'system';
        try {
            localStorage.setItem(BROWSER_PREF_KEY, safe);
        } catch (_) {}
        updateBrowserBadge();
        applyBrowserUserAgent();
        schedulePrimeDetachedWindows(true);
    }

    function getBrowserUserAgent(pref) {
        if (pref === 'chrome') return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
        if (pref === 'edge') return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0';
        if (pref === 'firefox') return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0';
        return '';
    }

    function applyBrowserUserAgent() {
        const pref = getSavedBrowserPref();
        const ua = getBrowserUserAgent(pref);
        [browserView1, browserView2].forEach((wv) => {
            if (!wv) return;
            try {
                if (ua) wv.setUserAgent(ua);
            } catch (_) {}
        });
    }

    function updateBrowserBadge() {
        const pref = getSavedBrowserPref();
        const meta = browserPrefs[pref] || browserPrefs.system;
        if (browserCurrentIcon) {
            browserCurrentIcon.classList.remove('browser-system', 'browser-chrome', 'browser-edge', 'browser-firefox');
            browserCurrentIcon.classList.add(meta.iconClass);
        }
        if (browserCurrentName) browserCurrentName.textContent = meta.label;
        if (!browserOptionsWrap) return;
        browserOptionsWrap.querySelectorAll('.browser-option').forEach((btn) => {
            const key = btn && btn.dataset ? btn.dataset.browser : '';
            btn.classList.toggle('active', key === pref);
        });
    }

    function showBrowserSettingsModal(show) {
        if (!browserSettingsModal) return;
        browserSettingsModal.classList.toggle('hidden', !show);
    }

    function normalizeBetLink(rawLink) {
        if (typeof rawLink !== 'string') return '';
        const trimmed = rawLink.trim();
        if (!/^https?:\/\//i.test(trimmed)) return '';

        try {
            const parsed = new URL(trimmed);
            const host = (parsed.hostname || '').toLowerCase();

            // BetBurger /bets link requires logged session; convert to OddsRabbit direct link when possible.
            if ((host === 'www.betburger.com' || host === 'betburger.com') && /^\/bets\/[^/?#]+/i.test(parsed.pathname)) {
                const m = parsed.pathname.match(/^\/bets\/([^/?#]+)/i);
                const token = (parsed.searchParams.get('access_token') || '').trim();
                const arbHash = (parsed.searchParams.get('arb_hash') || '').trim();
                if (m && token && arbHash) {
                    let betId = m[1];
                    try { betId = decodeURIComponent(betId); } catch (_) {}
                    const locale = (parsed.searchParams.get('locale') || 'en').trim() || 'en';
                    const domain = (parsed.searchParams.get('domain') || '').trim();
                    const out = new URL(`https://lv.oddsrabbit.org/bets/${encodeURIComponent(betId)}`);
                    out.searchParams.set('locale', locale);
                    out.searchParams.set('access_token', token);
                    out.searchParams.set('domain', domain);
                    out.searchParams.set('arb_hash', arbHash);
                    return out.toString();
                }
            }

            return parsed.toString();
        } catch (_) {
            return trimmed;
        }
    }

    function isValidHttpLink(rawLink) {
        if (typeof rawLink !== 'string') return false;
        const trimmed = rawLink.trim();
        if (!/^https?:\/\//i.test(trimmed)) return false;
        try {
            new URL(trimmed);
            return true;
        } catch (_) {
            return false;
        }
    }

    function isEventLikeUrl(rawLink) {
        if (typeof rawLink !== 'string') return false;
        const trimmed = rawLink.trim();
        if (!/^https?:\/\//i.test(trimmed)) return false;

        try {
            const parsed = new URL(trimmed);
            const host = (parsed.hostname || '').toLowerCase();
            const path = ((parsed.pathname || '') + '').trim().toLowerCase();
            const fragment = ((parsed.hash || '').replace(/^#/, '') || '').toLowerCase();
            const query = parsed.search || '';
            const pathWithHash = `${path}#${fragment}`.trim();

            if (host.includes('betburger.com') && parsed.pathname.includes('/users/sign_in')) return false;
            if (host === 'oddsrabbit.org' || host.includes('oddsrabbit.org')) return false;
            if (host.includes('rest-api-lv.betburger.com') || host.includes('rest-api-pr.betburger.com')) return false;

            const tokens = path.split('/').filter(Boolean);
            const tail = tokens[tokens.length - 1] || '';

            const hasEventishQuery = (() => {
                const params = new URLSearchParams(query);
                const keys = new Set([
                    'eventid',
                    'event_id',
                    'event',
                    'match',
                    'matchid',
                    'match_id',
                    'eventcode',
                    'slug',
                    'ev',
                    'bt-path',
                    'bt_path',
                    'btpath'
                ]);
                for (const [key, value] of params.entries()) {
                    const k = String(key || '').toLowerCase();
                    if (!keys.has(k)) continue;
                    const raw = String(value || '').trim();
                    if (!raw) continue;
                    if (k === 'bt-path' || k === 'bt_path' || k === 'btpath') return true;
                    if (/\d/.test(raw) || raw.startsWith('ev')) return true;
                }
                return false;
            })();
            if (hasEventishQuery) return true;

            const isClearlyHome = (() => {
                if (!path || path === '/') return true;
                if (path.startsWith('//')) return true;
                if (tokens.length === 1) {
                    return [
                        'sports', 'apostas', 'esportes', 'live', 'home',
                        'index', 'en', 'pt', 'pt-br', 'aposta-esportiva',
                        'apostas-esportivas', 'aposta', 'apostas-ao-vivo',
                        'sportsbook', 'resultado', 'eventos'
                    ].includes(tokens[0]);
                }
                if (tokens.length >= 2 && ['sports', 'esportes'].includes(tokens[0])) {
                    return ['live', 'prematch', 'odds', 'resultados'].includes(tokens[1]);
                }
                return false;
            })();

            if (isClearlyHome) {
                return false;
            }

            const hasEventishPath = (() => {
                if (/\/ip\/ev\d+/i.test(pathWithHash)) return true;
                if (/\/e-\d{4,}/i.test(pathWithHash)) return true;
                if (/\/le-\d{4,}/i.test(pathWithHash)) return true;
                if (/\/liveevent\//i.test(pathWithHash)) return true;
                if (/\/event(s)?\//i.test(pathWithHash)) return true;
                if (/\/evento/i.test(pathWithHash)) return true;
                if (/\/match(es)?\//i.test(pathWithHash)) return true;
                if (/\/sportsbook\/standard\//i.test(pathWithHash)) return true;
                if (/\/standard\/[^/]+\/[^/]+\/\d+/i.test(pathWithHash)) return true;
                if (/\/odds\/[^/?#]+-\d{4,}$/i.test(pathWithHash)) return true;
                if (/\/#\/[^?#]*\b(le-|e-)\d+/i.test(parsed.hash || '')) return true;
                return false;
            })();
            if (hasEventishPath) return true;

            if (/^ev\d{4,}$/i.test(tail)) return true;
            if (/^le-\d{4,}$/i.test(tail)) return true;
            if (/^e-\d{4,}$/i.test(tail)) return true;
            if (/[a-z]{2,}-\d{4,}/i.test(tail)) return true;
            return false;
        } catch (_) {
            return false;
        }
    }

    function extractBetLink(bet) {
        if (!bet || typeof bet !== 'object') return '';
        const keys = [
            'url',
            'link',
            'eventUrl',
            'event_url',
            'directLink',
            'direct_link',
            'outcomeUrl',
            'outcome_url',
            'marketUrl',
            'market_url',
            'betslipUrl',
            'betslip_url',
            'webUrl',
            'web_url',
        ];
        for (const key of keys) {
            const value = bet[key];
            if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
                const normalized = normalizeBetLink(value);
                if (isValidHttpLink(normalized)) return normalized;
            }
        }
        return '';
    }

    function setDataAreaMode(mode) {
        const safeMode = mode === 'browser' || mode === 'panel' ? mode : 'table';
        activeDataAreaMode = safeMode;

        const isTable = safeMode === 'table';
        const isBrowser = safeMode === 'browser';
        const isPanel = safeMode === 'panel';

        if (!isPanel) {
            stopReportSuggestionsAutoRefresh();
        } else if (activeReportView === 'sugestoes') {
            startReportSuggestionsAutoRefresh();
        }

        if (dataTableContainer) dataTableContainer.style.display = isTable ? '' : 'none';
        const pagination = document.getElementById('data-pagination');
        if (pagination) pagination.style.display = isTable ? '' : 'none';
        if (browserWorkspace) browserWorkspace.style.display = isBrowser ? 'flex' : 'none';
        if (planilhaPanel) planilhaPanel.classList.toggle('hidden', !isPanel);
        if (btnOpenPainel) btnOpenPainel.classList.toggle('active', isPanel);
        if (btnBackToTable) btnBackToTable.style.display = 'none';
        if (navLogo) navLogo.style.display = (isTable || isPanel) ? '' : 'none';
        refreshNavDataControlsVisibility();
        refreshAccessGate();
        scheduleSyncNavDataControlsLeft();
    }

    function refreshNavDataControlsVisibility() {
        if (!navDataControls) return;
        const supportsDataControls = activeMainTab === 'dados' || activeMainTab === 'pre-filtro' || activeMainTab === 'live-filtro';
        const shouldShow = supportsDataControls && activeDataAreaMode === 'table';
        navDataControls.style.display = shouldShow ? 'flex' : 'none';
        if (!subtabPreLiveBtn || !subtabLiveBtn) return;
        if (activeMainTab === 'pre-filtro') {
            subtabPreLiveBtn.style.display = '';
            subtabLiveBtn.style.display = 'none';
            return;
        }
        if (activeMainTab === 'live-filtro') {
            subtabPreLiveBtn.style.display = 'none';
            subtabLiveBtn.style.display = '';
            return;
        }
        subtabPreLiveBtn.style.display = '';
        subtabLiveBtn.style.display = '';
    }

    function syncNavDataControlsLeft() {
        if (!navDataControls || !navBar) return;
        const firstHeader = dataTable ? dataTable.querySelector('thead th') : null;
        const anchor = firstHeader || dataArea;
        if (!anchor) return;
        const navRect = navBar.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const leftPx = Math.max(0, Math.round(anchorRect.left - navRect.left));
        navDataControls.style.left = `${leftPx}px`;
    }

    function scheduleSyncNavDataControlsLeft() {
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(syncNavDataControlsLeft);
            return;
        }
        setTimeout(syncNavDataControlsLeft, 0);
    }

    function setTableVisible(show) {
        setDataAreaMode(show ? 'table' : 'browser');
    }

    function applyBrowserSplitMode(mode) {
        const safeMode = mode === 'left' || mode === 'right' ? mode : 'split';
        browserSplitMode = safeMode;

        if (browserSplit) {
            browserSplit.classList.remove('focus-left', 'focus-right');
            if (safeMode === 'left') browserSplit.classList.add('focus-left');
            if (safeMode === 'right') browserSplit.classList.add('focus-right');
            if (safeMode === 'split') setBrowserSplitRatio(browserSplitRatio);
        }

        if (btnBrowserFocusLeft) btnBrowserFocusLeft.classList.toggle('active', safeMode === 'left');
        if (btnBrowserFocusSplit) btnBrowserFocusSplit.classList.toggle('active', safeMode === 'split');
        if (btnBrowserFocusRight) btnBrowserFocusRight.classList.toggle('active', safeMode === 'right');
    }

    function setBrowserSplitRatio(percent) {
        if (!browserSplit) return;
        const raw = Number(percent);
        const safe = Number.isFinite(raw) ? Math.max(20, Math.min(80, raw)) : 50;
        browserSplitRatio = safe;
        browserSplit.style.setProperty('--browser-left', `${safe}%`);
        browserSplit.style.setProperty('--browser-right', `${100 - safe}%`);
    }

    function updateBrowserSplitRatioFromClientX(clientX) {
        if (!browserSplit) return;
        const rect = browserSplit.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;
        const ratio = ((clientX - rect.left) / rect.width) * 100;
        setBrowserSplitRatio(ratio);
    }

    function endBrowserSplitDrag(pointerId = null) {
        if (!browserSplitDragging) return;
        browserSplitDragging = false;
        document.body.classList.remove('browser-resizing');
        if (!browserDivider || pointerId == null) return;
        if (typeof browserDivider.hasPointerCapture === 'function' &&
            typeof browserDivider.releasePointerCapture === 'function' &&
            browserDivider.hasPointerCapture(pointerId)) {
            try {
                browserDivider.releasePointerCapture(pointerId);
            } catch (_) {}
        }
    }

    function enterRecolhidoMode() {
        recolhidoMode = true;
        document.body.classList.add('layout-recolhido');
        if (contentArea) contentArea.classList.add('recolhido');
        if (btnRecolher) btnRecolher.textContent = 'Expandir';
        setTableVisible(false);
        applyBrowserSplitMode(browserSplitMode);
        if (lastOpenUsedDetached && window.polvo && typeof window.polvo.toggleDetachedLayout === 'function') {
            try {
                window.polvo.toggleDetachedLayout('collapse');
            } catch (_) {}
        }
    }

    function exitRecolhidoMode() {
        recolhidoMode = false;
        document.body.classList.remove('layout-recolhido');
        if (contentArea) contentArea.classList.remove('recolhido');
        if (btnRecolher) btnRecolher.textContent = 'Recolher';
        setTableVisible(true);
        applyBrowserSplitMode('split');
        if (lastOpenUsedDetached) {
            if (window.polvo && typeof window.polvo.toggleDetachedLayout === 'function') {
                try {
                    window.polvo.toggleDetachedLayout('expand');
                } catch (_) {}
            } else if (window.polvo && typeof window.polvo.forceMaximizeApp === 'function') {
                try {
                    window.polvo.forceMaximizeApp();
                } catch (_) {}
            }
        }
    }

    function openDetachedBetWindows(payload) {
        if (!DETACHED_BROWSER_MODE) return false;
        if (!window.polvo || typeof window.polvo.openBetWindows !== 'function') return false;
        try {
            const pref = getSavedBrowserPref();
            const outgoing = {
                ...(payload && typeof payload === 'object' ? payload : {}),
                browserPref: pref,
                browser: pref,
            };
            window.polvo.openBetWindows(outgoing);
            return true;
        } catch (_) {
            return false;
        }
    }

    function schedulePrimeDetachedWindows(immediate = false) {
        if (!DETACHED_BROWSER_MODE) return;
        if (!window.polvo || typeof window.polvo.primeBetWindows !== 'function') return;
        const pref = getSavedBrowserPref();
        if (!pref) return;
        if (detachedPrimeTimer) {
            clearTimeout(detachedPrimeTimer);
            detachedPrimeTimer = null;
        }
        const delayMs = immediate ? 0 : 450;
        detachedPrimeTimer = setTimeout(() => {
            detachedPrimeTimer = null;
            try {
                window.polvo.primeBetWindows({ browserPref: pref, browser: pref });
            } catch (_) {}
        }, delayMs);
    }

    function openSplitBrowsers() {
        if (!selectedRowLinks) {
            showSystemAlert('Selecione um evento para abrir os navegadores.');
            return false;
        }

        const normalizedLink1 = normalizeBetLink(selectedRowLinks.link1 || '');
        const normalizedLink2 = normalizeBetLink(selectedRowLinks.link2 || '');
        const validLink1 = isValidHttpLink(normalizedLink1);
        const validLink2 = isValidHttpLink(normalizedLink2);
        const invalidReasons = [];

        if (!validLink1) {
            invalidReasons.push(selectedRowLinks.bookmaker1 || 'Casa 1');
        }
        if (!validLink2) {
            invalidReasons.push(selectedRowLinks.bookmaker2 || 'Casa 2');
        }

        if (invalidReasons.length) {
            const casas = invalidReasons.join(' / ');
            if (!validLink1 && !validLink2) {
                showSystemAlert(`Nenhuma casa possui link válido (${casas}). Atualize o scraper para incluir links de evento.`);
                return false;
            }

            showSystemAlert(`Atenção: ${casas} sem link válido encontrado. Abrindo só o link válido disponível.`);
        }

        selectedRowLinks.link1 = validLink1 ? normalizedLink1 : '';
        selectedRowLinks.link2 = validLink2 ? normalizedLink2 : '';
        if (window.polvo && typeof window.polvo.log === 'function') {
            window.polvo.log('info', 'BETANO_SYNC_UI', 'openSplitBrowsers', {
                link1: selectedRowLinks.link1,
                link2: selectedRowLinks.link2,
                bookmaker1: selectedRowLinks.bookmaker1 || '',
                bookmaker2: selectedRowLinks.bookmaker2 || '',
                rowKey: selectedRowLinks.rowKey || selectedRowKey || '',
            });
        }
        updateSignalUrlCards(
            selectedRowLinks.link1,
            selectedRowLinks.link2,
            selectedRowLinks.event1 || '',
            selectedRowLinks.event2 || ''
        );
        const detachedOpened = openDetachedBetWindows({
            link1: selectedRowLinks.link1,
            link2: selectedRowLinks.link2,
            bookmaker1: selectedRowLinks.bookmaker1 || 'Casa 1',
            bookmaker2: selectedRowLinks.bookmaker2 || 'Casa 2',
            event1: selectedRowLinks.event1 || '',
            event2: selectedRowLinks.event2 || '',
        });
        lastOpenUsedDetached = detachedOpened;
        if (detachedOpened) {
            if (!recolhidoMode) enterRecolhidoMode();
            return true;
        }
        if (browserView1) browserView1.src = validLink1 ? normalizedLink1 : 'about:blank';
        if (browserView2) browserView2.src = validLink2 ? normalizedLink2 : 'about:blank';
        applyBrowserUserAgent();
        return true;
    }

    function readSelectedRowLinksFromTable() {
        if (!dataTableBody) return null;
        const row = dataTableBody.querySelector('tr.selected');
        if (!row || row.querySelector('td[colspan]')) return null;
        const rowData = getRowSelectionData(row);
        if (!rowData) return null;
        const { link1, link2, bookmaker1, bookmaker2 } = rowData;
        if (!bookmaker1 || !bookmaker2) return null;
        return {
            link1,
            link2,
            bookmaker1,
            bookmaker2,
            odd1: rowData.odd1,
            odd2: rowData.odd2,
            event1: rowData.event1,
            event2: rowData.event2,
            percentage: rowData.percentage,
            rowKey: rowData.rowKey,
        };
    }

    if (pagePrevBtn) {
        pagePrevBtn.addEventListener('click', () => {
            currentTablePage = Math.max(1, currentTablePage - 1);
            scheduleTableRender();
        });
    }

    if (pageNextBtn) {
        pageNextBtn.addEventListener('click', () => {
            currentTablePage += 1;
            scheduleTableRender();
        });
    }

    if (btnDataFontMinus) {
        btnDataFontMinus.addEventListener('click', () => {
            applyDataFontScale(dataFontScale - DATA_FONT_SCALE_STEP);
        });
    }

    if (btnDataFontPlus) {
        btnDataFontPlus.addEventListener('click', () => {
            applyDataFontScale(dataFontScale + DATA_FONT_SCALE_STEP);
        });
    }

    if (btnDataFontReset) {
        btnDataFontReset.addEventListener('click', () => {
            applyDataFontScale(DATA_FONT_SCALE_DEFAULT);
        });
    }

    applyDataFontScale(readSavedDataFontScale(), { persist: false });
    if (dataFontControls) dataFontControls.style.display = '';
    scheduleSyncNavDataControlsLeft();
    window.addEventListener('resize', scheduleSyncNavDataControlsLeft);
    alertSoundEnabled = readAlertSoundEnabled();
    alertSoundType = readAlertSoundType();
    syncAlertSoundControls();
    attachAlertSoundListeners();

    renderUserChip();
    renderAppVersion();
    updateBrowserBadge();
    applyBrowserUserAgent();
    applyBrowserSplitMode('split');
    setTableVisible(true);
    schedulePrimeDetachedWindows(false);
    if (!hasSavedBrowserPref()) {
        showBrowserSettingsModal(true);
    }

    if (btnRenew) {
        btnRenew.addEventListener('click', () => {
            openCheckoutForAccess();
        });
    }

    if (btnUnlockAccess) {
        btnUnlockAccess.addEventListener('click', openCheckoutForAccess);
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            try {
                localStorage.removeItem(USER_PROFILE_KEY);
                localStorage.removeItem(USER_PROFILE_KEY_LEGACY);
            } catch (_) {}
            if (window.polvo.clearSocketToken) window.polvo.clearSocketToken();
            window.polvo.navigateToLogin();
        });
    }

    // ===== Socket.IO connection (after login) =====
    let socket = null;
    let lastSocketDataAt = 0;
    let socketWatchdogTimer = null;

    function setSocketStatus(status) {
        if (!socketStatusEl) return;
        socketStatusEl.classList.remove('connecting', 'connected', 'error');
        if (status) socketStatusEl.classList.add(status);
    }

    function formatTimeAgo(isoString) {
        if (!isoString) return '-';
        try {
            const then = new Date(isoString).getTime();
            const now = Date.now();
            const diffMs = now - then;
            const diffMin = Math.floor(diffMs / 60000);
            const diffSec = Math.floor((diffMs % 60000) / 1000);
            if (diffMin > 0) return `${diffMin} min`;
            return `${diffSec} s`;
        } catch (_) {
            return '-';
        }
    }

    function getArbTimestampMs(item, useBuffer, defaultTimestamp) {
        const arb = useBuffer ? item.arb : item;
        const ts = useBuffer ? item.timestamp : defaultTimestamp;
        const receivedAt = (arb && arb.receivedAt) ? arb.receivedAt : ts;
        const ms = parseDateToMs(receivedAt);
        return ms == null ? 0 : ms;
    }

    function formatOddDisplay(value) {
        const num = parseNumber(value, Number.NaN);
        if (!Number.isFinite(num)) return '-';
        return num.toFixed(2);
    }

    function normalizeFilterText(value, fallback = '-') {
        const txt = value == null ? '' : String(value).trim();
        return txt || fallback;
    }

    function normalizeHouseFilterText(value, fallback = '-') {
        let txt = normalizeFilterText(value, '');
        if (!txt) return fallback;

        txt = txt.toLowerCase();
        txt = txt.replace(/^https?:\/\//, '');
        txt = txt.split('/')[0];
        txt = txt.replace(/^www\./, '');
        txt = txt.replace(/:\d+$/, '');
        txt = txt.trim();

        if (!txt) return fallback;
        return FILTER_HOUSE_ALIASES[txt] || txt;
    }

    function getArbSportName(arb) {
        const b1 = arb && arb.bet1 ? arb.bet1 : {};
        const b2 = arb && arb.bet2 ? arb.bet2 : {};
        const candidates = [
            arb && arb.sportName,
            arb && arb.sport_name,
            arb && arb.sport,
            b1.sportName,
            b1.sport_name,
            b1.sport,
            b2.sportName,
            b2.sport_name,
            b2.sport,
        ];
        for (const candidate of candidates) {
            const txt = candidate == null ? '' : String(candidate).trim();
            if (txt) return txt;
        }
        return '-';
    }

    function parseSportId(value) {
        if (value == null || value === '') return Number.NaN;
        if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
        const txt = String(value).trim();
        if (!txt) return Number.NaN;
        const parsed = Number.parseInt(txt, 10);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    function getArbSportId(arb) {
        const b1 = arb && arb.bet1 ? arb.bet1 : {};
        const b2 = arb && arb.bet2 ? arb.bet2 : {};
        const candidates = [
            arb && arb.sportId,
            arb && arb.sport_id,
            arb && arb.sportID,
            b1 && b1.sportId,
            b1 && b1.sport_id,
            b1 && b1.sportID,
            b2 && b2.sportId,
            b2 && b2.sport_id,
            b2 && b2.sportID,
        ];
        for (const candidate of candidates) {
            const id = parseSportId(candidate);
            if (Number.isFinite(id)) return id;
        }
        return Number.NaN;
    }

    function mapSportIdToName(sportId) {
        if (!Number.isFinite(sportId)) return '';
        // IDs confirmados no fluxo atual:
        if (sportId === 7) return 'Futebol';
        if (sportId === 13) return 'Tênis de Mesa';
        return '';
    }

    function normalizeForSportMatch(value) {
        return String(value == null ? '' : value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function inferSportFromText(text) {
        const t = normalizeForSportMatch(text);
        if (!t) return '';
        if (/(table\s*tennis|tenis de mesa|setka|ping pong|wtt)/.test(t)) return 'Tênis de Mesa';
        if (/(tennis|tenis|atp|wta|itf|challenger|grand slam|davis cup)/.test(t)) return 'Tênis';
        if (/(basketball|basquete|nba|wnba|euroleague|nbl|liga acb|lnbp|lnbpf|ncaab|fiba|cbb|cba\b)/.test(t)) return 'Basquete';
        if (/(football|soccer|futebol|serie a|premier league|la liga|bundesliga|champions league|copa do brasil|libertadores|sudamericana|brasileirao|brasileiro)/.test(t)) return 'Futebol';
        if (/(volleyball|voleibol|volei|v[oô]lei)/.test(t)) return 'Vôlei';
        if (/(hockey|hoquei|nhl|shl)/.test(t)) return 'Hóquei';
        if (/(counter-?strike|cs2|dota|valorant|esports|e-sports|league of legends|\blol\b)/.test(t)) return 'eSports';
        return '';
    }

    function resolveArbSportName(arb) {
        const b1 = arb && arb.bet1 ? arb.bet1 : {};
        const b2 = arb && arb.bet2 ? arb.bet2 : {};
        const idMapped = mapSportIdToName(getArbSportId(arb));
        if (idMapped) return idMapped;
        const direct = getArbSportName(arb);
        if (direct && direct !== '-') {
            const translatedDirect = inferSportFromText(direct);
            return translatedDirect || direct;
        }

        const inferred = inferSportFromText([
            b1.league,
            b2.league,
            b1.eventName,
            b2.eventName,
            b1.entryType,
            b2.entryType,
        ].filter(Boolean).join(' '));

        return inferred || '-';
    }

    function getSportToneClass(sportName) {
        const normalized = normalizeForSportMatch(sportName);

        if (!normalized) return 'sport-tone-default';
        if (normalized.includes('tenis de mesa') || normalized.includes('table tennis') || normalized.includes('tabletennis') || normalized.includes('ping pong') || normalized.includes('setka')) return 'sport-tone-tenis-mesa';
        if (normalized.includes('futebol') || normalized.includes('football') || normalized.includes('soccer')) return 'sport-tone-futebol';
        if (normalized.includes('tenis') || normalized.includes('tennis')) return 'sport-tone-tenis';
        if (normalized.includes('basquete') || normalized.includes('basketball')) return 'sport-tone-basquete';
        if (normalized.includes('volei') || normalized.includes('volleyball') || normalized.includes('voleibol')) return 'sport-tone-volei';
        if (normalized.includes('esports') || normalized.includes('e-sports') || normalized.includes('counter-strike') || normalized.includes('cs2') || normalized.includes('dota') || normalized.includes('valorant')) return 'sport-tone-esports';
        return 'sport-tone-default';
    }

    function formatEntryTypeLabel(entryTypeRaw) {
        const txt = String(entryTypeRaw || '').trim();
        if (!txt) return '';
        const m = txt.match(/^T(\d+)\(([^)]*)\)(.*)$/i);
        if (!m) return txt;
        const n = Number(m[1]);
        if (!Number.isFinite(n)) return txt;
        const suffix = String(m[3] || '').trim();
        const side = n % 2 === 1 ? 'TO' : 'TU';
        return `${side}(${m[2] || ''})${suffix ? ` ${suffix}` : ''}`.trim();
    }

    function extractBracketContextLabel(value) {
        const txt = String(value || '').trim();
        if (!txt) return '';
        const m = txt.match(/\[([^\]]+)\]/);
        return m ? String(m[1] || '').trim() : '';
    }

    function normalizeContextLabel(value) {
        let txt = String(value || '').trim();
        if (!txt) return '';

        txt = txt.replace(/^\[|\]$/g, '').trim();
        if (!txt) return '';

        const n = normalizeForSportMatch(txt);

        if (n.includes('with ot and so') || n.includes('with overtime and so')) {
            return 'with OT and SO';
        }
        if (/^with\s*(overtime|ot)$/.test(n) || n.includes('with overtime') || n.includes('with ot')) {
            return 'with OT';
        }

        return txt.replace(/\s+/g, ' ');
    }

    function getArbContextLabel(arb) {
        if (!arb || typeof arb !== 'object') return '';

        const b1 = arb.bet1 || {};
        const b2 = arb.bet2 || {};

        const explicitCandidates = [
            arb.periodLabel,
            arb.period_label,
            arb.periodTitle,
            arb.period_title,
            arb.period,
            arb.part,
            arb.round,
            arb.stage,
            arb.extraLabel,
            b1.periodLabel,
            b1.period_label,
            b1.periodTitle,
            b1.period_title,
            b1.period,
            b2.periodLabel,
            b2.period_label,
            b2.periodTitle,
            b2.period_title,
            b2.period,
            b1.part,
            b2.part,
        ];

        for (const candidate of explicitCandidates) {
            const normalized = normalizeContextLabel(candidate);
            if (normalized) return normalized;
        }

        const bracketSources = [
            arb.sportName,
            arb.sport_name,
            arb.sport,
            b1.sportName,
            b1.sport_name,
            b1.sport,
            b2.sportName,
            b2.sport_name,
            b2.sport,
            arb.eventName,
            arb.event_name,
        ];

        for (const src of bracketSources) {
            const bracketLabel = extractBracketContextLabel(src);
            const normalized = normalizeContextLabel(bracketLabel);
            if (normalized) return normalized;
        }

        return '';
    }

    function getArbFilterData(arb) {
        const b1 = arb && arb.bet1 ? arb.bet1 : {};
        const b2 = arb && arb.bet2 ? arb.bet2 : {};
        const sport = normalizeFilterText(resolveArbSportName(arb), '-');
        const house1 = normalizeHouseFilterText(b1.bookmaker || '-');
        const house2 = normalizeHouseFilterText(b2.bookmaker || '-');
        return { sport, house1, house2 };
    }

    function formatCronogramaHourLabel(hour) {
        const h = String(hour).padStart(2, '0');
        const next = String((hour + 1) % 24).padStart(2, '0');
        return `${h}h - ${next}h`;
    }

    function getCronogramaDayHour(ms) {
        if (!Number.isFinite(ms)) return null;
        const dt = new Date(ms);
        if (Number.isNaN(dt.getTime())) return null;
        try {
            if (cronogramaDateFormatter && cronogramaHourFormatter) {
                const dayKey = cronogramaDateFormatter.format(dt);
                const hour = Number.parseInt(cronogramaHourFormatter.format(dt), 10);
                if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
                    return { dayKey, hour };
                }
            }
        } catch (_) {}
        const dayKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        return { dayKey, hour: dt.getHours() };
    }

    function buildCronogramaFromArbs(bufferItems) {
        const slots = Array.from({ length: 24 }, (_, hour) => {
            return { hour, label: formatCronogramaHourLabel(hour), live: 0, prelive: 0, total: 0 };
        });
        const nowInfo = getCronogramaDayHour(Date.now());
        const todayKey = nowInfo ? nowInfo.dayKey : null;
        const currentHour = nowInfo ? nowInfo.hour : null;

        (bufferItems || []).forEach((item) => {
            const arb = item && item.arb ? item.arb : item;
            if (!arb || typeof arb !== 'object') return;
            const { sport } = getArbFilterData(arb);
            if (cronogramaFilterState.initialized) {
                if (!cronogramaFilterState.selectedSports.size) return;
                if (!cronogramaFilterState.selectedSports.has(sport)) return;
            }
            const tsMs = getArbTimestampMs(item, true, null);
            const tsInfo = getCronogramaDayHour(tsMs);
            if (!tsInfo) return;
            if (todayKey && tsInfo.dayKey !== todayKey) return;
            if (currentHour != null && tsInfo.hour !== currentHour) return;
            const hour = tsInfo.hour;
            const isLive = inferArbIsLive(arb) === true;
            if (isLive) return;
            slots[hour].prelive += 1;
            slots[hour].total += 1;
        });

        return slots;
    }

    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i += 1) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    function readPersistedFilterSelections() {
        try {
            const raw = localStorage.getItem(FILTER_SELECTIONS_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function persistFilterSelections() {
        try {
            const payload = readPersistedFilterSelections();
            if (preFilterState.initialized) {
                payload.pre = {
                    houses: Array.from(preFilterState.selectedHouses || []),
                    sports: Array.from(preFilterState.selectedSports || []),
                };
            }
            if (liveFilterState.initialized) {
                payload.live = {
                    houses: Array.from(liveFilterState.selectedHouses || []),
                    sports: Array.from(liveFilterState.selectedSports || []),
                };
            }
            localStorage.setItem(FILTER_SELECTIONS_KEY, JSON.stringify(payload));
        } catch (_) {}
    }

    function hasPersistedFilterList(persisted, section, field) {
        return !!(
            persisted &&
            persisted[section] &&
            typeof persisted[section] === 'object' &&
            Array.isArray(persisted[section][field])
        );
    }

    function pickPersistedFilterSet(persisted, section, field, options, normalizer) {
        if (!hasPersistedFilterList(persisted, section, field)) return new Set();
        const available = new Set(options || []);
        const selected = new Set();
        persisted[section][field].forEach((value) => {
            const normalized = normalizer(value, '');
            if (normalized && available.has(normalized)) selected.add(normalized);
        });
        return selected;
    }

    function enforceMinimumHouseSelectionSet(selectedSet, options) {
        if (!selectedSet || !Array.isArray(options) || options.length < MIN_HOUSE_FILTER_SELECTIONS) return;
        for (const option of options) {
            if (selectedSet.size >= MIN_HOUSE_FILTER_SELECTIONS) break;
            selectedSet.add(option);
        }
    }

    function enforceHouseFilterMinimumSelection(list, changedInput = null) {
        if (!list) return;

        const checkboxes = Array.from(list.querySelectorAll('input[type="checkbox"]'));
        if (checkboxes.length < MIN_HOUSE_FILTER_SELECTIONS) return;

        let checked = checkboxes.filter(cb => cb.checked);
        if (checked.length >= MIN_HOUSE_FILTER_SELECTIONS) return;

        if (changedInput && !changedInput.checked) {
            changedInput.checked = true;
        }

        checked = checkboxes.filter(cb => cb.checked);
        for (const cb of checkboxes) {
            if (checked.length >= MIN_HOUSE_FILTER_SELECTIONS) break;
            if (!cb.checked) {
                cb.checked = true;
                checked.push(cb);
            }
        }
    }

    function syncPreFilterSelectionsFromDOM() {
        if (!preFilterHouseList || !preFilterSportList) return;

        const selectedHouses = new Set();
        const selectedSports = new Set();

        preFilterHouseList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            if (cb.checked) selectedHouses.add(normalizeHouseFilterText(cb.value));
        });
        preFilterSportList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            if (cb.checked) selectedSports.add(normalizeFilterText(cb.value));
        });

        preFilterState.selectedHouses = selectedHouses;
        preFilterState.selectedSports = selectedSports;
        persistFilterSelections();
    }

    function syncLiveFilterSelectionsFromDOM() {
        if (!liveFilterHouseList || !liveFilterSportList) return;

        const selectedHouses = new Set();
        const selectedSports = new Set();

        liveFilterHouseList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            if (cb.checked) selectedHouses.add(normalizeHouseFilterText(cb.value));
        });
        liveFilterSportList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            if (cb.checked) selectedSports.add(normalizeFilterText(cb.value));
        });

        liveFilterState.selectedHouses = selectedHouses;
        liveFilterState.selectedSports = selectedSports;
        persistFilterSelections();
    }

    function syncCronogramaSelectionsFromDOM() {
        if (!cronogramaSportList) return;
        const selectedSports = new Set();
        cronogramaSportList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            if (cb.checked) selectedSports.add(normalizeFilterText(cb.value));
        });
        cronogramaFilterState.selectedSports = selectedSports;
    }

    function applyHouseSearchFilter(list, input) {
        if (!list || !input) return;
        const term = normalizeHouseFilterText(input.value || '', '').toLowerCase();
        list.querySelectorAll('.checkbox-item').forEach((item) => {
            const text = normalizeHouseFilterText(item.textContent || '', '').toLowerCase();
            item.classList.toggle('is-search-hidden', !!term && !text.includes(term));
        });
    }

    function applyHouseSearchFilters() {
        applyHouseSearchFilter(preFilterHouseList, preFilterHouseSearch);
        applyHouseSearchFilter(liveFilterHouseList, liveFilterHouseSearch);
    }

    function renderPreFilterList(container, values, selectedSet) {
        if (!container) return;
        if (!values.length) {
            container.innerHTML = '<label class="checkbox-item">Aguardando dados...</label>';
            applyHouseSearchFilters();
            return;
        }

        container.innerHTML = values
            .map((value) => {
                const checked = selectedSet.has(value) ? 'checked' : '';
                const safeText = escapeHtml(value);
                const safeValue = escapeHtml(value);
                return `<label class="checkbox-item"><input type="checkbox" value="${safeValue}" ${checked}> ${safeText}</label>`;
            })
            .join('');
        applyHouseSearchFilters();
    }

    function normalizeAndSortFilterOptions(values, normalizer = (value) => normalizeFilterText(value, '')) {
        const set = new Set();
        (values || []).forEach((value) => {
            const normalized = normalizer(value);
            if (normalized) set.add(normalized);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    function getFixedCloneHouseOptions() {
        return normalizeAndSortFilterOptions(
            FILTER_CLONE_HOUSES,
            (value) => normalizeHouseFilterText(value, '')
        );
    }

    function applyFixedPreFilterOptions(options) {
        if (!options || typeof options !== 'object') return;

        const nextHouseOptions = getFixedCloneHouseOptions();
        const nextSportOptions = normalizeAndSortFilterOptions(options.sports);
        if (!nextHouseOptions.length && !nextSportOptions.length) return;

        const persistedSelections = readPersistedFilterSelections();
        const prevSelectedHouses = new Set(preFilterState.selectedHouses);
        const prevSelectedSports = new Set(preFilterState.selectedSports);
        const hasPersistedPreHouses = hasPersistedFilterList(persistedSelections, 'pre', 'houses');
        const hasPersistedPreSports = hasPersistedFilterList(persistedSelections, 'pre', 'sports');

        const nextSelectedHouses = hasPersistedPreHouses && !preFilterState.initialized
            ? pickPersistedFilterSet(persistedSelections, 'pre', 'houses', nextHouseOptions, normalizeHouseFilterText)
            : new Set();
        if (preFilterState.initialized || !hasPersistedPreHouses) {
            nextHouseOptions.forEach((house) => {
                if (!preFilterState.initialized || !preFilterState.fixedFromServer || prevSelectedHouses.has(house)) {
                    nextSelectedHouses.add(house);
                }
            });
        }
        enforceMinimumHouseSelectionSet(nextSelectedHouses, nextHouseOptions);

        const nextSelectedSports = hasPersistedPreSports && !preFilterState.initialized
            ? pickPersistedFilterSet(persistedSelections, 'pre', 'sports', nextSportOptions, normalizeFilterText)
            : new Set();
        if (!hasPersistedPreSports || preFilterState.initialized) {
            nextSportOptions.forEach((sport) => {
                if (!preFilterState.initialized || !preFilterState.fixedFromServer || prevSelectedSports.has(sport)) {
                    nextSelectedSports.add(sport);
                }
            });
        }

        preFilterState.houseOptions = nextHouseOptions;
        preFilterState.sportOptions = nextSportOptions;
        preFilterState.selectedHouses = nextSelectedHouses;
        preFilterState.selectedSports = nextSelectedSports;
        preFilterState.initialized = true;
        preFilterState.fixedFromServer = true;

        renderPreFilterList(preFilterHouseList, preFilterState.houseOptions, preFilterState.selectedHouses);
        renderPreFilterList(preFilterSportList, preFilterState.sportOptions, preFilterState.selectedSports);

        const prevSelectedHousesLive = new Set(liveFilterState.selectedHouses);
        const prevSelectedSportsLive = new Set(liveFilterState.selectedSports);
        const hasPersistedLiveHouses = hasPersistedFilterList(persistedSelections, 'live', 'houses');
        const hasPersistedLiveSports = hasPersistedFilterList(persistedSelections, 'live', 'sports');

        const nextSelectedHousesLive = hasPersistedLiveHouses && !liveFilterState.initialized
            ? pickPersistedFilterSet(persistedSelections, 'live', 'houses', nextHouseOptions, normalizeHouseFilterText)
            : new Set();
        if (liveFilterState.initialized || !hasPersistedLiveHouses) {
            nextHouseOptions.forEach((house) => {
                if (!liveFilterState.initialized || !liveFilterState.fixedFromServer || prevSelectedHousesLive.has(house)) {
                    nextSelectedHousesLive.add(house);
                }
            });
        }
        enforceMinimumHouseSelectionSet(nextSelectedHousesLive, nextHouseOptions);

        const nextSelectedSportsLive = hasPersistedLiveSports && !liveFilterState.initialized
            ? pickPersistedFilterSet(persistedSelections, 'live', 'sports', nextSportOptions, normalizeFilterText)
            : new Set();
        if (!hasPersistedLiveSports || liveFilterState.initialized) {
            nextSportOptions.forEach((sport) => {
                if (!liveFilterState.initialized || !liveFilterState.fixedFromServer || prevSelectedSportsLive.has(sport)) {
                    nextSelectedSportsLive.add(sport);
                }
            });
        }

        liveFilterState.houseOptions = nextHouseOptions;
        liveFilterState.sportOptions = nextSportOptions;
        liveFilterState.selectedHouses = nextSelectedHousesLive;
        liveFilterState.selectedSports = nextSelectedSportsLive;
        liveFilterState.initialized = true;
        liveFilterState.fixedFromServer = true;

        renderPreFilterList(liveFilterHouseList, liveFilterState.houseOptions, liveFilterState.selectedHouses);
        renderPreFilterList(liveFilterSportList, liveFilterState.sportOptions, liveFilterState.selectedSports);

        const prevCronoSelected = new Set(cronogramaFilterState.selectedSports);
        const nextCronoSports = nextSportOptions;
        const nextCronoSelected = new Set();
        nextCronoSports.forEach((sport) => {
            if (!cronogramaFilterState.initialized || !cronogramaFilterState.fixedFromServer || prevCronoSelected.has(sport)) {
                nextCronoSelected.add(sport);
            }
        });
        cronogramaFilterState.sportOptions = nextCronoSports;
        cronogramaFilterState.selectedSports = nextCronoSelected;
        cronogramaFilterState.initialized = true;
        cronogramaFilterState.fixedFromServer = true;
        renderPreFilterList(cronogramaSportList, cronogramaFilterState.sportOptions, cronogramaFilterState.selectedSports);
        persistFilterSelections();
    }

    function refreshPreFilterOptionsFromBuffer() {
        const hasPreContainers = !!(preFilterHouseList && preFilterSportList);
        const hasLiveContainers = !!(liveFilterHouseList && liveFilterSportList);
        if (!hasPreContainers && !hasLiveContainers) return;
        if (preFilterState.fixedFromServer && liveFilterState.fixedFromServer) return;

        const sportsSet = new Set();

        (preFilterState.sportOptions || []).forEach((sport) => {
            const normalized = normalizeFilterText(sport, '');
            if (normalized) sportsSet.add(normalized);
        });
        (liveFilterState.sportOptions || []).forEach((sport) => {
            const normalized = normalizeFilterText(sport, '');
            if (normalized) sportsSet.add(normalized);
        });

        arbsBuffer.forEach(({ arb }) => {
            const { sport } = getArbFilterData(arb || {});
            if (sport) sportsSet.add(sport);
        });

        const nextHouseOptions = getFixedCloneHouseOptions();
        const nextSportOptions = Array.from(sportsSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

        if (!nextHouseOptions.length && !nextSportOptions.length) return;
        const persistedSelections = readPersistedFilterSelections();

        const sameHousesPre = arraysEqual(nextHouseOptions, preFilterState.houseOptions);
        const sameSportsPre = arraysEqual(nextSportOptions, preFilterState.sportOptions);
        if (hasPreContainers && !(preFilterState.initialized && sameHousesPre && sameSportsPre) && !preFilterState.fixedFromServer) {
            const prevHouses = new Set(preFilterState.houseOptions);
            const prevSports = new Set(preFilterState.sportOptions);
            const hasPersistedPreHouses = hasPersistedFilterList(persistedSelections, 'pre', 'houses');
            const hasPersistedPreSports = hasPersistedFilterList(persistedSelections, 'pre', 'sports');
            const nextSelectedHouses = hasPersistedPreHouses && !preFilterState.initialized
                ? pickPersistedFilterSet(persistedSelections, 'pre', 'houses', nextHouseOptions, normalizeHouseFilterText)
                : new Set();
            const nextSelectedSports = hasPersistedPreSports && !preFilterState.initialized
                ? pickPersistedFilterSet(persistedSelections, 'pre', 'sports', nextSportOptions, normalizeFilterText)
                : new Set();

            if (preFilterState.initialized || !hasPersistedPreHouses) {
                nextHouseOptions.forEach((house) => {
                    if (!preFilterState.initialized || !prevHouses.has(house) || preFilterState.selectedHouses.has(house)) {
                        nextSelectedHouses.add(house);
                    }
                });
            }
            enforceMinimumHouseSelectionSet(nextSelectedHouses, nextHouseOptions);

            if (preFilterState.initialized || !hasPersistedPreSports) {
                nextSportOptions.forEach((sport) => {
                    if (!preFilterState.initialized || !prevSports.has(sport) || preFilterState.selectedSports.has(sport)) {
                        nextSelectedSports.add(sport);
                    }
                });
            }

            preFilterState.houseOptions = nextHouseOptions;
            preFilterState.sportOptions = nextSportOptions;
            preFilterState.selectedHouses = nextSelectedHouses;
            preFilterState.selectedSports = nextSelectedSports;
            preFilterState.initialized = true;

            renderPreFilterList(preFilterHouseList, preFilterState.houseOptions, preFilterState.selectedHouses);
            renderPreFilterList(preFilterSportList, preFilterState.sportOptions, preFilterState.selectedSports);
        }

        const sameHousesLive = arraysEqual(nextHouseOptions, liveFilterState.houseOptions);
        const sameSportsLive = arraysEqual(nextSportOptions, liveFilterState.sportOptions);
        if (hasLiveContainers && !(liveFilterState.initialized && sameHousesLive && sameSportsLive) && !liveFilterState.fixedFromServer) {
            const prevHouses = new Set(liveFilterState.houseOptions);
            const prevSports = new Set(liveFilterState.sportOptions);
            const hasPersistedLiveHouses = hasPersistedFilterList(persistedSelections, 'live', 'houses');
            const hasPersistedLiveSports = hasPersistedFilterList(persistedSelections, 'live', 'sports');
            const nextSelectedHouses = hasPersistedLiveHouses && !liveFilterState.initialized
                ? pickPersistedFilterSet(persistedSelections, 'live', 'houses', nextHouseOptions, normalizeHouseFilterText)
                : new Set();
            const nextSelectedSports = hasPersistedLiveSports && !liveFilterState.initialized
                ? pickPersistedFilterSet(persistedSelections, 'live', 'sports', nextSportOptions, normalizeFilterText)
                : new Set();

            if (liveFilterState.initialized || !hasPersistedLiveHouses) {
                nextHouseOptions.forEach((house) => {
                    if (!liveFilterState.initialized || !prevHouses.has(house) || liveFilterState.selectedHouses.has(house)) {
                        nextSelectedHouses.add(house);
                    }
                });
            }
            enforceMinimumHouseSelectionSet(nextSelectedHouses, nextHouseOptions);

            if (liveFilterState.initialized || !hasPersistedLiveSports) {
                nextSportOptions.forEach((sport) => {
                    if (!liveFilterState.initialized || !prevSports.has(sport) || liveFilterState.selectedSports.has(sport)) {
                        nextSelectedSports.add(sport);
                    }
                });
            }

            liveFilterState.houseOptions = nextHouseOptions;
            liveFilterState.sportOptions = nextSportOptions;
            liveFilterState.selectedHouses = nextSelectedHouses;
            liveFilterState.selectedSports = nextSelectedSports;
            liveFilterState.initialized = true;

            renderPreFilterList(liveFilterHouseList, liveFilterState.houseOptions, liveFilterState.selectedHouses);
            renderPreFilterList(liveFilterSportList, liveFilterState.sportOptions, liveFilterState.selectedSports);
        }

        if (!cronogramaFilterState.fixedFromServer) {
            const sameCronoSports = arraysEqual(nextSportOptions, cronogramaFilterState.sportOptions);
            if (!(cronogramaFilterState.initialized && sameCronoSports)) {
                const prevCronoSports = new Set(cronogramaFilterState.sportOptions);
                const nextCronoSelected = new Set();
                nextSportOptions.forEach((sport) => {
                    if (!cronogramaFilterState.initialized || !prevCronoSports.has(sport) || cronogramaFilterState.selectedSports.has(sport)) {
                        nextCronoSelected.add(sport);
                    }
                });
                cronogramaFilterState.sportOptions = nextSportOptions;
                cronogramaFilterState.selectedSports = nextCronoSelected;
                cronogramaFilterState.initialized = true;
                renderPreFilterList(cronogramaSportList, cronogramaFilterState.sportOptions, cronogramaFilterState.selectedSports);
            }
        }
        persistFilterSelections();
    }

    function applyPreFilters(bufferItems) {
        if (!preFilterState.initialized) return bufferItems;
        if (preFilterState.selectedHouses.size < MIN_HOUSE_FILTER_SELECTIONS || !preFilterState.selectedSports.size) return [];

        return bufferItems.filter((item) => {
            const arb = item && item.arb ? item.arb : {};
            const { sport, house1, house2 } = getArbFilterData(arb);
            const percent = parseArbPercentage(arb);
            if (percent == null) return false;

            const sportOk = preFilterState.selectedSports.has(sport);
            const houseOk = preFilterState.selectedHouses.has(house1) && preFilterState.selectedHouses.has(house2);
            if (!sportOk || !houseOk) return false;

            const minPercent = getArbMinPercentThreshold(arb);
            if (percent < minPercent) return false;

            if (preFilterMaxEnabled && preFilterMaxEnabled.checked) {
                const maxPercent = parseNumber(preFilterMaxValue && preFilterMaxValue.value, Number.POSITIVE_INFINITY);
                if (percent > maxPercent) return false;
            }

            return true;
        });
    }

    function applyLiveFilters(bufferItems) {
        if (!liveFilterState.initialized) return bufferItems;
        if (liveFilterState.selectedHouses.size < MIN_HOUSE_FILTER_SELECTIONS || !liveFilterState.selectedSports.size) return [];

        return bufferItems.filter((item) => {
            const arb = item && item.arb ? item.arb : {};
            const { sport, house1, house2 } = getArbFilterData(arb);
            const sportOk = liveFilterState.selectedSports.has(sport);
            const houseOk = liveFilterState.selectedHouses.has(house1) && liveFilterState.selectedHouses.has(house2);
            return sportOk && houseOk;
        });
    }

    function renderArbsTable(payload) {
        // payload can be { arbs, timestamp } or { buffer: [{ arb, timestamp }, ...] }
        const useBuffer = payload && Array.isArray(payload.buffer);
        // When using buffer: show newest first (buffer is oldestâ†’newest, so reverse for display)
        const baseArbs = useBuffer ? [...payload.buffer] : (payload && Array.isArray(payload.arbs) ? payload.arbs : []);
        const isDadosTable = activeMainTab === 'dados';
        const shouldApplyPreFilter = useBuffer && (
            activeMainTab === 'pre-filtro' ||
            (isDadosTable && activeSubtab === 'pre-live')
        );
        const shouldApplyLiveFilter = useBuffer && (
            activeMainTab === 'live-filtro' ||
            (isDadosTable && activeSubtab === 'live')
        );
        const subtabFiltered = applyLiveSubtabFilter(baseArbs);
        const arbs = shouldApplyPreFilter
            ? applyPreFilters(subtabFiltered)
            : (shouldApplyLiveFilter ? applyLiveFilters(subtabFiltered) : subtabFiltered);
        const defaultTimestamp = payload && payload.timestamp ? payload.timestamp : null;
        const sortedArbs = [...arbs].sort((a, b) =>
            getArbTimestampMs(b, useBuffer, defaultTimestamp) - getArbTimestampMs(a, useBuffer, defaultTimestamp)
        );
        const totalItems = sortedArbs.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / TABLE_PAGE_SIZE));
        if (currentTablePage > totalPages) currentTablePage = totalPages;
        if (currentTablePage < 1) currentTablePage = 1;

        const pageStart = (currentTablePage - 1) * TABLE_PAGE_SIZE;
        const pageEnd = pageStart + TABLE_PAGE_SIZE;
        const pageItems = sortedArbs.slice(pageStart, pageEnd);

        if (pageInfoEl) {
            pageInfoEl.textContent = `Pagina ${currentTablePage}/${totalPages} (${totalItems})`;
        }
        if (pagePrevBtn) pagePrevBtn.disabled = currentTablePage <= 1;
        if (pageNextBtn) pageNextBtn.disabled = currentTablePage >= totalPages;

        if (sortedArbs.length === 0) {
            const hasSocketData = useBuffer && Array.isArray(payload.buffer) && payload.buffer.length > 0;
            let emptyMsg = 'Aguardando dados do socket...';
            if (hasSocketData) {
                emptyMsg = shouldApplyPreFilter || shouldApplyLiveFilter
                    ? 'Nenhum sinal no historico recente corresponde ao filtro atual.'
                    : 'Nenhum sinal disponivel no historico recente.';
            }
            dataTableBody.innerHTML = `<tr><td colspan="10" style="color:rgba(255,255,255,0.4);padding:16px">${emptyMsg}</td></tr>`;
            selectedRowKey = '';
            selectedRowLinks = null;
            updateSignalUrlCards('', '', '', '');
            return;
        }

        const sportToneCounters = new Map();
        const rowsHtml = pageItems.map((item) => {
            const arb = useBuffer ? item.arb : item;
            const timestamp = useBuffer ? item.timestamp : defaultTimestamp;
            const b1 = arb.bet1 || {};
            const b2 = arb.bet2 || {};
            const odd1Display = formatOddDisplay(b1.odd);
            const odd2Display = formatOddDisplay(b2.odd);
            const sportName = resolveArbSportName(arb);
            const entryType1Raw = (b1.entryType || '').trim();
            const entryType2Raw = (b2.entryType || '').trim();
            const entryType1 = formatEntryTypeLabel(entryType1Raw);
            const entryType2 = formatEntryTypeLabel(entryType2Raw);
            const contextLabel = getArbContextLabel(arb);
            const contextDisplay = contextLabel ? contextLabel.substring(0, 16) : '';
            const eventDisplay = (b1.eventName || b2.eventName || '-').substring(0, 40);
            const percentageNumber = parseNumber(arb.percentage, Number.NaN);
            const percentageDisplay = Number.isFinite(percentageNumber)
                ? `${percentageNumber.toFixed(2)}%`
                : '-';
            const cells = [
                formatTimeAgo(timestamp),
                percentageDisplay,
                sportName,
                eventDisplay,
                (b1.bookmaker || '-').substring(0, 16),
                odd1Display.substring(0, 8),
                (b2.bookmaker || '-').substring(0, 16),
                odd2Display.substring(0, 8),
                (entryType1 || '-').substring(0, 24),
                (entryType2 || '-').substring(0, 24),
            ];
            const tds = cells.map((text, idx) => {
                if (idx !== 3) {
                    return `<td title="${escapeHtml((text || '').toString())}">${escapeHtml(text)}</td>`;
                }

                const eventTitle = contextDisplay ? `${contextDisplay} | ${eventDisplay}` : eventDisplay;
                return `<td class="event-cell" title="${escapeHtml(eventTitle)}"><div class="event-cell-stack"><span class="event-cell-context">${contextDisplay ? escapeHtml(contextDisplay) : '&nbsp;'}</span><span class="event-cell-main">${escapeHtml(eventDisplay)}</span></div></td>`;
            }).join('');
            const receivedAt = (arb.receivedAt != null ? arb.receivedAt : (timestamp && typeof timestamp === 'string' ? timestamp : '')) || '';
            const league1 = (b1.league || '').trim();
            const league2 = (b2.league || '').trim();
            const event1 = (b1.eventName || '').trim();
            const event2 = (b2.eventName || '').trim();
            const link1 = extractBetLink(b1);
            const link2 = extractBetLink(b2);
            const bookmaker1 = (b1.bookmaker || '').trim();
            const bookmaker2 = (b2.bookmaker || '').trim();
            const odd1 = odd1Display === '-' ? '' : odd1Display;
            const odd2 = odd2Display === '-' ? '' : odd2Display;
            const percentage = Number.isFinite(percentageNumber) ? percentageNumber.toFixed(2) : '';
            const rowKey = [
                sportName,
                event1 || event2,
                bookmaker1,
                bookmaker2,
                entryType1Raw,
                entryType2Raw,
            ].map((v) => String(v || '').trim().toLowerCase()).join('|');
            const dataAttrs = [
                'data-row-key', escapeHtml(rowKey),
                'data-sport-name', escapeHtml(sportName),
                'data-context-label', escapeHtml(contextDisplay),
                'data-received-at', escapeHtml(receivedAt),
                'data-league1', escapeHtml(league1),
                'data-league2', escapeHtml(league2),
                'data-event1', escapeHtml(event1),
                'data-event2', escapeHtml(event2),
                'data-percentage', escapeHtml(percentage),
                'data-link1', escapeHtml(link1),
                'data-link2', escapeHtml(link2),
                'data-bookmaker1', escapeHtml(bookmaker1),
                'data-entry-type1', escapeHtml(entryType1),
                'data-entry-type1-raw', escapeHtml(entryType1Raw),
                'data-bookmaker2', escapeHtml(bookmaker2),
                'data-entry-type2', escapeHtml(entryType2),
                'data-entry-type2-raw', escapeHtml(entryType2Raw),
                'data-odd1', escapeHtml(odd1),
                'data-odd2', escapeHtml(odd2),
            ];
            const dataStr = dataAttrs.reduce((acc, val, i) => (i % 2 === 0 ? acc + ` ${val}="${dataAttrs[i + 1]}"` : acc), '');
            const toneClass = getSportToneClass(sportName);
            const toneCount = sportToneCounters.get(toneClass) || 0;
            sportToneCounters.set(toneClass, toneCount + 1);
            const rowClasses = [toneClass];
            if (toneClass !== 'sport-tone-default') {
                rowClasses.push(toneCount % 2 === 0 ? 'sport-zebra-a' : 'sport-zebra-b');
            }
            if (selectedRowKey && selectedRowKey === rowKey) rowClasses.push('selected');
            const classAttr = rowClasses.length > 0 ? ` class="${rowClasses.join(' ')}"` : '';
            return `<tr${classAttr}${dataStr}>${tds}</tr>`;
        }).join('');
        dataTableBody.innerHTML = rowsHtml;
        refreshSelectedRowAfterRender();
    }

    // Format receivedAt for display: "2026-02-13T14:41:50.549Z" -> date + time spans
    function formatReceivedAt(receivedAtStr) {
        if (!receivedAtStr || typeof receivedAtStr !== 'string') return { one: '-', span1: '-', span2: '-' };
        try {
            const d = new Date(receivedAtStr);
            if (Number.isNaN(d.getTime())) return { one: receivedAtStr, span1: receivedAtStr, span2: '' };
            const one = d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
            const span1 = d.toLocaleDateString(undefined, { dateStyle: 'short' });
            const span2 = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return { one, span1, span2 };
        } catch (_) {
            return { one: receivedAtStr, span1: receivedAtStr, span2: '' };
        }
    }

    function getRowSelectionData(row) {
        if (!row || row.querySelector('td[colspan]')) return null;
        return {
            rowKey: (row.dataset.rowKey || '').trim(),
            sportName: (row.dataset.sportName || '').trim(),
            contextLabel: (row.dataset.contextLabel || '').trim(),
            receivedAt: (row.dataset.receivedAt || '').trim(),
            league1: (row.dataset.league1 || '').trim(),
            league2: (row.dataset.league2 || '').trim(),
            event1: (row.dataset.event1 || '').trim(),
            event2: (row.dataset.event2 || '').trim(),
            link1: (row.dataset.link1 || '').trim(),
            link2: (row.dataset.link2 || '').trim(),
            bookmaker1: (row.dataset.bookmaker1 || '').trim(),
            bookmaker2: (row.dataset.bookmaker2 || '').trim(),
            entryType1: (row.dataset.entryType1 || '').trim(),
            entryType2: (row.dataset.entryType2 || '').trim(),
            odd1: parseNumber(row.dataset.odd1, 0),
            odd2: parseNumber(row.dataset.odd2, 0),
            percentage: parseNumber(row.dataset.percentage, Number.NaN),
        };
    }

    function applyRowSelection(row, { keepCurrentClasses = false, forceOdds = false, skipSignal = false } = {}) {
        const rowData = getRowSelectionData(row);
        if (!rowData) return null;

        if (!keepCurrentClasses && dataTableBody) {
            dataTableBody.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'));
        }
        row.classList.add('selected');

        selectedRowKey = rowData.rowKey || '';
        selectedRowLinks = {
            link1: rowData.link1,
            link2: rowData.link2,
            bookmaker1: rowData.bookmaker1,
            bookmaker2: rowData.bookmaker2,
            odd1: rowData.odd1,
            odd2: rowData.odd2,
            event1: rowData.event1,
            event2: rowData.event2,
            percentage: rowData.percentage,
            rowKey: selectedRowKey,
        };
        applyLiveOddOverridesToSelectedRow(selectedRowKey);
        updateSignalUrlCards(rowData.link1, rowData.link2, rowData.event1, rowData.event2);

        if (!skipSignal) {
            const signalList = document.getElementById('signal-list');
            if (signalList) {
                const items = signalList.querySelectorAll('.signal-item');
                const rec = formatReceivedAt(rowData.receivedAt);
                const leagueDup = rowData.league1 &&
                    rowData.league2 &&
                    rowData.league1.trim().toLowerCase() === rowData.league2.trim().toLowerCase();
                const eventDup = rowData.event1 &&
                    rowData.event2 &&
                    rowData.event1.trim().toLowerCase() === rowData.event2.trim().toLowerCase();
                const marketContext = rowData.contextLabel || '-';
                setSpanText(items[0], 0, rowData.sportName || '-');
                setSpanText(items[1], 0, rec.span1);
                setSpanText(items[1], 1, rec.span2);
                setSpanText(items[2], 0, rowData.league1 || '-');
                setSpanText(items[3], 0, rowData.league2 || '-');
                setSpanText(items[3], 1, '');
                if (items[3]) items[3].classList.toggle('signal-item-muted', !!leagueDup);
                setSpanText(items[4], 0, rowData.event1 || '-');
                setSpanText(items[5], 0, rowData.event2 || '-');
                setSpanText(items[5], 1, '');
                if (items[5]) items[5].classList.toggle('signal-item-muted', !!eventDup);
                setSpanText(items[6], 0, rowData.bookmaker1 || '-');
                setSpanText(items[7], 0, rowData.entryType1 || '-');
                setSpanText(items[7], 1, marketContext);
                setSpanText(items[8], 0, rowData.bookmaker2 || '-');
                setSpanText(items[9], 0, rowData.entryType2 || '-');
                setSpanText(items[9], 1, marketContext);
            }
        }

        syncCalculatorFromSelection(forceOdds);
        return rowData;
    }

    function refreshSelectedRowAfterRender() {
        if (!dataTableBody || !selectedRowKey) return;
        let matched = null;
        const rows = dataTableBody.querySelectorAll('tr');
        rows.forEach((row) => {
            if (matched || row.querySelector('td[colspan]')) return;
            if ((row.dataset.rowKey || '') === selectedRowKey) {
                matched = row;
            }
        });
        if (!matched) return;
        applyRowSelection(matched, { keepCurrentClasses: true, forceOdds: false, skipSignal: true });
    }

    // Click on data table row: fill all side-menu signal items and calculator
    if (dataTableBody) {
        dataTableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row || row.querySelector('td[colspan]')) return;
            applyRowSelection(row, { forceOdds: true });
            const opened = openSplitBrowsers();
            if (!opened) return;
            if (!lastOpenUsedDetached && !recolhidoMode) {
                enterRecolhidoMode();
            }
        });
    }

    function setSpanText(item, spanIndex, text) {
        if (!item) return;
        const spans = item.querySelectorAll('span');
        const target = spans[spanIndex];
        if (!target) return;

        if (text === undefined || text === null) {
            target.textContent = '-';
        } else {
            target.textContent = String(text).trim();
        }

        if (spans.length > 1) {
            const secondary = (spans[1].textContent || '').trim();
            const hasSecondary = secondary !== '' && secondary !== '-';
            item.classList.toggle('has-secondary', hasSecondary);
        } else {
            item.classList.remove('has-secondary');
        }
    }

    function truncateUrlForPreview(rawUrl, maxLen = 54) {
        const url = (rawUrl || '').trim();
        if (!url) return '-';
        if (url.length <= maxLen) return url;
        const head = url.slice(0, 28);
        const tail = url.slice(-22);
        return `${head}...${tail}`;
    }

    function setSignalUrlLine(textEl, btnEl, rawUrl) {
        if (!textEl || !btnEl) return;
        const normalized = normalizeBetLink(rawUrl || '');
        const isValid = isValidHttpLink(normalized);
        const finalUrl = isValid ? normalized : '';
        textEl.textContent = truncateUrlForPreview(finalUrl);
        textEl.title = finalUrl || 'Sem URL valida';
        textEl.dataset.fullUrl = finalUrl;
        btnEl.dataset.fullUrl = finalUrl;
        btnEl.disabled = !finalUrl;
    }

    function setDetachedCardState(side, payload = {}) {
        const safeSide = side === 2 ? 2 : 1;
        const linkKey = safeSide === 1 ? 'link1' : 'link2';
        const eventKey = safeSide === 1 ? 'event1' : 'event2';
        const normalized = normalizeBetLink(payload.link || '');
        detachedWindowState[linkKey] = isValidHttpLink(normalized) ? normalized : '';
        detachedWindowState[eventKey] = String(payload.event || '').trim();
    }

    function renderDetachedCard(side) {
        const safeSide = side === 2 ? 2 : 1;
        const eventEl = safeSide === 1 ? detachedEvent1 : detachedEvent2;
        const urlEl = safeSide === 1 ? detachedUrl1 : detachedUrl2;
        const copyBtn = safeSide === 1 ? btnDetachedCopy1 : btnDetachedCopy2;
        const minBtn = safeSide === 1 ? btnDetachedMin1 : btnDetachedMin2;
        const maxBtn = safeSide === 1 ? btnDetachedMax1 : btnDetachedMax2;
        const closeBtn = safeSide === 1 ? btnDetachedClose1 : btnDetachedClose2;
        const linkKey = safeSide === 1 ? 'link1' : 'link2';
        const eventKey = safeSide === 1 ? 'event1' : 'event2';
        const link = String(detachedWindowState[linkKey] || '').trim();
        const eventName = String(detachedWindowState[eventKey] || '').trim();

        if (eventEl) {
            eventEl.textContent = eventName || '-';
            eventEl.title = eventName || 'Sem evento';
        }
        if (urlEl) {
            urlEl.textContent = truncateUrlForPreview(link, 46);
            urlEl.title = link || 'Sem URL valida';
            urlEl.dataset.fullUrl = link;
        }
        if (copyBtn) {
            copyBtn.dataset.fullUrl = link;
            copyBtn.disabled = !link;
        }
        [minBtn, maxBtn, closeBtn].forEach((btn) => {
            if (btn) btn.disabled = !link;
        });
    }

    function updateDetachedBrowserCards({ link1 = '', link2 = '', event1 = '', event2 = '' } = {}) {
        setDetachedCardState(1, { link: link1, event: event1 });
        setDetachedCardState(2, { link: link2, event: event2 });
        renderDetachedCard(1);
        renderDetachedCard(2);
    }

    function updateSignalUrlCards(link1, link2, event1 = '', event2 = '') {
        setSignalUrlLine(signalUrl1Text, btnCopyUrl1, link1);
        setSignalUrlLine(signalUrl2Text, btnCopyUrl2, link2);
        updateDetachedBrowserCards({ link1, link2, event1, event2 });
    }

    function sanitizePlanilhaStatus(value) {
        const txt = value == null ? '' : String(value).trim();
        const match = PLANILHA_STATUS_OPTIONS.find((opt) => opt.toLowerCase() === txt.toLowerCase());
        return match || PLANILHA_STATUS_OPTIONS[0];
    }

    function parsePlanilhaBool(value) {
        if (value === true || value === false) return value;
        if (typeof value === 'number') return value !== 0;
        const txt = String(value == null ? '' : value).trim().toLowerCase();
        return txt === '1' || txt === 'true' || txt === 'yes' || txt === 'sim';
    }

    function parsePtBrDateTimeToMs(value) {
        const txt = String(value == null ? '' : value).trim();
        if (!txt) return null;
        const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
        if (!m) return null;
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        const hour = Number(m[4] || 0);
        const minute = Number(m[5] || 0);
        const second = Number(m[6] || 0);
        const dt = new Date(year, month - 1, day, hour, minute, second);
        const ms = dt.getTime();
        return Number.isFinite(ms) ? ms : null;
    }

    function getPlanilhaRecordMs(record) {
        if (!record || typeof record !== 'object') return null;
        const candidates = [record.createdAt, record.eventDate];
        for (const candidate of candidates) {
            const msDirect = parseDateToMs(candidate);
            if (msDirect != null) return msDirect;
            const msPtBr = parsePtBrDateTimeToMs(candidate);
            if (msPtBr != null) return msPtBr;
        }
        return null;
    }

    function getPlanilhaRecordPeriod(record) {
        const ms = getPlanilhaRecordMs(record);
        if (!Number.isFinite(ms)) return null;
        const dt = new Date(ms);
        if (Number.isNaN(dt.getTime())) return null;
        return {
            year: String(dt.getFullYear()),
            month: String(dt.getMonth() + 1).padStart(2, '0'),
        };
    }

    function getPlanilhaStorageKeys() {
        const profile = readUserProfile() || {};
        const email = String(profile.email || '').trim().toLowerCase();
        const suffix = email || 'anon';
        return {
            scopedMain: `${PLANILHA_STORAGE_KEY}:${suffix}`,
            scopedLegacy: `${PLANILHA_STORAGE_KEY_LEGACY}:${suffix}`,
        };
    }

    function getPlanilhaGastosStorageKey() {
        const profile = readUserProfile() || {};
        const email = String(profile.email || '').trim().toLowerCase();
        const suffix = email || 'anon';
        return `${PLANILHA_GASTOS_KEY}:${suffix}`;
    }

    function parseDateInputValueToMs(value, endOfDay = false) {
        const txt = String(value || '').trim();
        const match = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const dt = endOfDay
            ? new Date(year, month, day, 23, 59, 59, 999)
            : new Date(year, month, day, 0, 0, 0, 0);
        const ms = dt.getTime();
        return Number.isFinite(ms) ? ms : null;
    }

    function toLocalDateKey(ms) {
        if (!Number.isFinite(ms)) return '';
        const dt = new Date(ms);
        if (Number.isNaN(dt.getTime())) return '';
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatReportDayLabel(key) {
        const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return key || '-';
        return `${match[3]}/${match[2]}`;
    }

    function formatReportCurrencyCompact(value) {
        const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
        try {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 1,
            }).format(safe);
        } catch (_) {
            return formatCurrencyBRL(safe);
        }
    }

    function hydratePlanilhaGasto(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const valor = toPlanilhaNumber(raw.valor);
        const descricao = String(raw.descricao || '').trim();
        const data = String(raw.data || '').trim();
        const createdAt = String(raw.createdAt || new Date().toISOString());
        if (!(valor > 0) || !data) return null;
        return {
            id: String(raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
            descricao,
            data,
            valor,
            createdAt,
        };
    }

    function loadPlanilhaGastos() {
        try {
            const key = getPlanilhaGastosStorageKey();
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map((item) => hydratePlanilhaGasto(item)).filter(Boolean);
        } catch (_) {
            return [];
        }
    }

    function getPlanilhaGastoMs(gasto) {
        if (!gasto || typeof gasto !== 'object') return null;
        return parseDateInputValueToMs(gasto.data, false)
            ?? parseDateToMs(gasto.createdAt)
            ?? null;
    }

    function syncReportNavButtons() {
        reportNavButtons.forEach((btn) => {
            const view = String(btn.dataset.reportView || '').trim().toLowerCase();
            btn.classList.toggle('is-active', view === activeReportView);
        });
    }

    function syncReportShellHeader(view) {
        const safeView = String(view || '').trim().toLowerCase();
        let title = 'Relatorios';
        let subtitle = 'Estruture, acompanhe e refine a operacao em um unico lugar.';
        let showNav = true;

        if (safeView === 'sugestoes') {
            title = 'Sugestoes';
            subtitle = 'Compartilhe ideias, melhorias e vote nas propostas da comunidade.';
            showNav = false;
        } else if (safeView === 'atualizacoes') {
            title = 'Atualizacoes';
            subtitle = 'Acompanhe novidades e publicacoes oficiais do sistema.';
            showNav = false;
        }

        if (reportShellTitle) reportShellTitle.textContent = title;
        if (reportShellSubtitle) reportShellSubtitle.textContent = subtitle;
        if (reportNav) {
            reportNav.style.display = showNav ? '' : 'none';
            reportNav.setAttribute('aria-hidden', showNav ? 'false' : 'true');
        }
    }

    function hideReportTooltip() {
        if (!reportTooltip) return;
        reportTooltip.classList.remove('is-visible');
        reportTooltip.setAttribute('aria-hidden', 'true');
    }

    function positionReportTooltip(clientX, clientY) {
        if (!reportTooltip) return;
        const padding = 14;
        const rect = reportTooltip.getBoundingClientRect();
        let left = clientX + 16;
        let top = clientY + 18;
        if ((left + rect.width) > (window.innerWidth - padding)) {
            left = clientX - rect.width - 16;
        }
        if ((top + rect.height) > (window.innerHeight - padding)) {
            top = clientY - rect.height - 16;
        }
        reportTooltip.style.left = `${Math.max(padding, left)}px`;
        reportTooltip.style.top = `${Math.max(padding, top)}px`;
    }

    function showReportTooltip(target, clientX, clientY) {
        if (!reportTooltip || !target) return;
        const title = String(target.getAttribute('data-report-title') || '-').trim();
        const value = String(target.getAttribute('data-report-value') || '-').trim();
        const meta = String(target.getAttribute('data-report-meta') || '').trim();
        reportTooltip.innerHTML = [
            `<div class="report-tooltip-title">${escapeHtml(title)}</div>`,
            `<div class="report-tooltip-value">${escapeHtml(value)}</div>`,
            meta ? `<div class="report-tooltip-meta">${escapeHtml(meta)}</div>` : '',
        ].join('');
        reportTooltip.classList.add('is-visible');
        reportTooltip.setAttribute('aria-hidden', 'false');
        positionReportTooltip(clientX, clientY);
    }

    function bindReportTooltipInteractions() {
        if (!planilhaPanel || !reportTooltip) return;
        planilhaPanel.addEventListener('pointermove', (event) => {
            const target = event.target && typeof event.target.closest === 'function'
                ? event.target.closest('[data-report-tooltip="1"]')
                : null;
            if (!target || !planilhaPanel.contains(target)) {
                hideReportTooltip();
                return;
            }
            showReportTooltip(target, event.clientX, event.clientY);
        });
        planilhaPanel.addEventListener('pointerleave', hideReportTooltip);
        planilhaPanel.addEventListener('wheel', hideReportTooltip, { passive: true });
    }

    function updatePlanilhaDateFilterButtonState() {
        if (!btnPlanilhaDefinirDatas) return;
        const hasRange = !!(planilhaDateFilterStart || planilhaDateFilterEnd);
        btnPlanilhaDefinirDatas.classList.toggle('is-active', hasRange);
        if (!hasRange) {
            btnPlanilhaDefinirDatas.textContent = 'Definir Datas';
            return;
        }
        const startLabel = planilhaDateFilterStart ? formatReportDateKeyLong(planilhaDateFilterStart) : '...';
        const endLabel = planilhaDateFilterEnd ? formatReportDateKeyLong(planilhaDateFilterEnd) : '...';
        btnPlanilhaDefinirDatas.textContent = `${startLabel} a ${endLabel}`;
    }

    function showPlanilhaDateFilterModal(show = true) {
        if (!planilhaDateFilterModal) return;
        planilhaDateFilterModal.classList.toggle('hidden', !show);
    }

    function openPlanilhaDateFilterModal() {
        if (planilhaDateFilterStartInput) planilhaDateFilterStartInput.value = planilhaDateFilterStart;
        if (planilhaDateFilterEndInput) planilhaDateFilterEndInput.value = planilhaDateFilterEnd;
        showPlanilhaDateFilterModal(true);
    }

    function closePlanilhaDateFilterModal() {
        showPlanilhaDateFilterModal(false);
    }

    function clearPlanilhaDateFilter({ render = true } = {}) {
        planilhaDateFilterStart = '';
        planilhaDateFilterEnd = '';
        updatePlanilhaDateFilterButtonState();
        closePlanilhaDateFilterModal();
        if (render) renderPlanilhaTable();
    }

    function applyPlanilhaDateFilter() {
        const nextStart = String(planilhaDateFilterStartInput && planilhaDateFilterStartInput.value || '').trim();
        const nextEnd = String(planilhaDateFilterEndInput && planilhaDateFilterEndInput.value || '').trim();
        const startMs = parseDateInputValueToMs(nextStart, false);
        const endMs = parseDateInputValueToMs(nextEnd, true);
        if (nextStart && nextEnd && Number.isFinite(startMs) && Number.isFinite(endMs) && startMs > endMs) {
            showSystemAlert('A data inicial nao pode ser maior que a data final.');
            return;
        }
        planilhaDateFilterStart = nextStart;
        planilhaDateFilterEnd = nextEnd;
        updatePlanilhaDateFilterButtonState();
        closePlanilhaDateFilterModal();
        renderPlanilhaTable();
    }

    function setActiveReportView(view) {
        const safeView = ['dashboard', 'surebets', 'analise-global', 'analise-individual', 'sugestoes', 'atualizacoes'].includes(String(view || '').trim().toLowerCase())
            ? String(view || '').trim().toLowerCase()
            : 'dashboard';
        activeReportView = safeView;
        hideReportTooltip();
        syncReportNavButtons();
        syncReportShellHeader(safeView);
        reportViews.forEach((section) => {
            if (!section || !section.id) return;
            section.classList.toggle('is-active', section.id === `report-view-${safeView}`);
        });
        if (safeView === 'dashboard') {
            renderReportDashboard();
        }
        if (safeView === 'sugestoes') {
            reportSuggestionsState.typeFilter = 'suggestion';
            renderReportSuggestions();
            requestReportSuggestionsRefresh();
            startReportSuggestionsAutoRefresh();
        } else {
            stopReportSuggestionsAutoRefresh();
        }
    }

    function syncReportDashboardPresetButtons() {
        reportDashboardPresetButtons.forEach((btn) => {
            const preset = String(btn.dataset.dashboardRange || '').trim().toLowerCase();
            btn.classList.toggle('is-active', preset === reportDashboardRangePreset);
        });
    }

    function syncReportDashboardModeButtons() {
        reportDashboardModeButtons.forEach((btn) => {
            const mode = String(btn.dataset.dashboardMode || '').trim().toLowerCase();
            btn.classList.toggle('is-active', mode === reportDashboardMode);
        });
    }

    function syncReportDashboardDateInputs() {
        if (reportDashboardStartDate && reportDashboardStartDate.value !== reportDashboardStart) {
            reportDashboardStartDate.value = reportDashboardStart;
        }
        if (reportDashboardEndDate && reportDashboardEndDate.value !== reportDashboardEnd) {
            reportDashboardEndDate.value = reportDashboardEnd;
        }
    }

    function applyReportDashboardPreset(preset, { render = true } = {}) {
        const safePreset = ['1d', '7d', '15d', '30d', 'year', 'custom'].includes(String(preset || '').trim().toLowerCase())
            ? String(preset || '').trim().toLowerCase()
            : '30d';
        const today = new Date();
        const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        let startDate = new Date(endDate);

        if (safePreset === '1d') {
            startDate = new Date(endDate);
        } else if (safePreset === '7d') {
            startDate.setDate(startDate.getDate() - 6);
        } else if (safePreset === '15d') {
            startDate.setDate(startDate.getDate() - 14);
        } else if (safePreset === '30d') {
            startDate.setDate(startDate.getDate() - 29);
        } else if (safePreset === 'year') {
            startDate = new Date(endDate.getFullYear(), 0, 1);
        } else if (safePreset === 'custom' && (!reportDashboardStart || !reportDashboardEnd)) {
            startDate.setDate(startDate.getDate() - 29);
        }

        reportDashboardRangePreset = safePreset;
        if (safePreset !== 'custom' || !reportDashboardStart || !reportDashboardEnd) {
            reportDashboardStart = toDateInputValue(startDate.getTime());
            reportDashboardEnd = toDateInputValue(endDate.getTime());
        }

        syncReportDashboardPresetButtons();
        syncReportDashboardDateInputs();
        if (render) renderReportDashboard();
    }

    function setReportDashboardMode(mode, { render = true } = {}) {
        const safeMode = ['todos', 'pre-live', 'live'].includes(String(mode || '').trim().toLowerCase())
            ? String(mode || '').trim().toLowerCase()
            : 'todos';
        reportDashboardMode = safeMode;
        syncReportDashboardModeButtons();
        if (render) renderReportDashboard();
    }

    function getReportDashboardRange() {
        let startMs = parseDateInputValueToMs(reportDashboardStart, false);
        let endMs = parseDateInputValueToMs(reportDashboardEnd, true);

        if (!Number.isFinite(startMs) && Number.isFinite(endMs)) {
            startMs = parseDateInputValueToMs(reportDashboardEnd, false);
        }
        if (Number.isFinite(startMs) && !Number.isFinite(endMs)) {
            endMs = parseDateInputValueToMs(reportDashboardStart, true);
        }
        if (!Number.isFinite(startMs) && !Number.isFinite(endMs)) {
            const today = toDateInputValue(Date.now());
            startMs = parseDateInputValueToMs(today, false);
            endMs = parseDateInputValueToMs(today, true);
        }
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs > endMs) {
            const safeStart = parseDateInputValueToMs(reportDashboardEnd, false) ?? endMs;
            const safeEnd = parseDateInputValueToMs(reportDashboardStart, true) ?? startMs;
            startMs = safeStart;
            endMs = safeEnd;
        }

        return {
            startMs,
            endMs,
            startKey: toLocalDateKey(startMs),
            endKey: toLocalDateKey(endMs),
        };
    }

    function buildReportDateKeys(startMs, endMs) {
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return [];
        const keys = [];
        const cursor = new Date(startMs);
        cursor.setHours(0, 0, 0, 0);
        const limit = new Date(endMs);
        limit.setHours(0, 0, 0, 0);
        while (cursor.getTime() <= limit.getTime()) {
            keys.push(toLocalDateKey(cursor.getTime()));
            cursor.setDate(cursor.getDate() + 1);
        }
        return keys;
    }

    function renderReportEmptyChart(container, message) {
        if (!container) return;
        container.innerHTML = `<div class="report-chart-empty">${escapeHtml(message || 'Sem dados para o periodo selecionado.')}</div>`;
    }

    function buildReportTooltipAttrs({ title = '', value = '', meta = '' } = {}) {
        return [
            'data-report-tooltip="1"',
            `data-report-title="${escapeHtml(String(title || '-'))}"`,
            `data-report-value="${escapeHtml(String(value || '-'))}"`,
            `data-report-meta="${escapeHtml(String(meta || ''))}"`,
        ].join(' ');
    }

    function buildReportLineChartMarkup(items, {
        valueFormatter = (value) => formatCurrencyBRL(value),
        tooltipMeta = 'Lucro acumulado',
    } = {}) {
        if (!Array.isArray(items) || !items.length) return '';
        const safeItems = items.map((item) => ({
            label: String(item.label || ''),
            value: Number.isFinite(Number(item.value)) ? Number(item.value) : 0,
        }));
        const values = safeItems.map((item) => item.value);
        let minValue = Math.min(...values, 0);
        let maxValue = Math.max(...values, 0);
        if (minValue === maxValue) {
            if (maxValue === 0) maxValue = 1;
            else minValue = Math.min(0, maxValue * 0.5);
        }

        const width = Math.max(480, safeItems.length * 38);
        const height = 250;
        const padLeft = 58;
        const padRight = 20;
        const padTop = 18;
        const padBottom = 46;
        const chartWidth = width - padLeft - padRight;
        const chartHeight = height - padTop - padBottom;
        const range = maxValue - minValue || 1;
        const zeroBaseValue = minValue > 0 ? minValue : (maxValue < 0 ? maxValue : 0);
        const xFor = (index) => (
            safeItems.length > 1
                ? padLeft + (chartWidth * index) / (safeItems.length - 1)
                : padLeft + (chartWidth / 2)
        );
        const yFor = (value) => padTop + ((maxValue - value) / range) * chartHeight;
        const baselineY = yFor(zeroBaseValue);
        const points = safeItems.map((item, index) => `${xFor(index).toFixed(2)},${yFor(item.value).toFixed(2)}`);
        const firstX = xFor(0).toFixed(2);
        const lastX = xFor(safeItems.length - 1).toFixed(2);
        const areaPoints = [`${firstX},${baselineY.toFixed(2)}`, ...points, `${lastX},${baselineY.toFixed(2)}`].join(' ');
        const tickCount = 4;
        const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
            const value = maxValue - (range * index / tickCount);
            const y = yFor(value);
            return [
                `<line x1="${padLeft}" y1="${y.toFixed(2)}" x2="${width - padRight}" y2="${y.toFixed(2)}" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>`,
                `<text x="${padLeft - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end" fill="rgba(223,232,244,0.62)" font-size="11">${escapeHtml(formatReportCurrencyCompact(value))}</text>`,
            ].join('');
        }).join('');
        const xStep = Math.max(1, Math.ceil(safeItems.length / 8));
        const xLabels = safeItems.map((item, index) => {
            if (index !== safeItems.length - 1 && index % xStep !== 0) return '';
            const x = xFor(index);
            return `<text x="${x.toFixed(2)}" y="${height - 12}" text-anchor="middle" fill="rgba(223,232,244,0.56)" font-size="11">${escapeHtml(item.label)}</text>`;
        }).join('');
        const markers = safeItems.map((item, index) => {
            const x = xFor(index).toFixed(2);
            const y = yFor(item.value).toFixed(2);
            const tooltipAttrs = buildReportTooltipAttrs({
                title: item.label,
                value: valueFormatter(item.value),
                meta: tooltipMeta,
            });
            return [
                '<g class="report-chart-point-wrap">',
                `<circle class="report-chart-point-hit report-tooltip-target" cx="${x}" cy="${y}" r="10" fill="transparent" ${tooltipAttrs}></circle>`,
                `<circle class="report-chart-point-core" cx="${x}" cy="${y}" r="4" fill="#0b2236" stroke="#67c0ff" stroke-width="2"></circle>`,
                '</g>',
            ].join('');
        }).join('');

        return [
            '<div class="report-chart-scroll">',
            `<svg class="report-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">`,
            `<line x1="${padLeft}" y1="${baselineY.toFixed(2)}" x2="${width - padRight}" y2="${baselineY.toFixed(2)}" stroke="rgba(70, 155, 255, 0.18)" stroke-width="1.2"/>`,
            yTicks,
            `<polygon class="report-line-area" points="${areaPoints}" fill="rgba(56, 189, 248, 0.16)"/>`,
            `<polyline class="report-line-main" points="${points.join(' ')}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`,
            markers,
            xLabels,
            '</svg>',
            '</div>',
        ].join('');
    }

    function buildReportBarChartMarkup(items, {
        valueFormatter = (value) => formatReportCurrencyCompact(value),
        tooltipMeta = 'Volume',
        positiveFill = '#31c4ff',
        negativeFill = '#ff738c',
    } = {}) {
        if (!Array.isArray(items) || !items.length) return '';
        const safeItems = items.map((item) => ({
            label: String(item.label || ''),
            value: Number.isFinite(Number(item.value)) ? Number(item.value) : 0,
        }));
        const values = safeItems.map((item) => item.value);
        let minValue = Math.min(...values, 0);
        let maxValue = Math.max(...values, 0);
        if (minValue === maxValue) {
            if (maxValue === 0) maxValue = 1;
            else minValue = Math.min(0, maxValue * 0.35);
        }

        const width = Math.max(360, safeItems.length * 34);
        const height = 250;
        const padLeft = 52;
        const padRight = 18;
        const padTop = 18;
        const padBottom = 50;
        const chartWidth = width - padLeft - padRight;
        const chartHeight = height - padTop - padBottom;
        const range = maxValue - minValue || 1;
        const yFor = (value) => padTop + ((maxValue - value) / range) * chartHeight;
        const zeroY = yFor(0);
        const slotWidth = chartWidth / safeItems.length;
        const barWidth = Math.max(10, Math.min(28, slotWidth * 0.64));
        const tickCount = 4;
        const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
            const value = maxValue - (range * index / tickCount);
            const y = yFor(value);
            return [
                `<line x1="${padLeft}" y1="${y.toFixed(2)}" x2="${width - padRight}" y2="${y.toFixed(2)}" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>`,
                `<text x="${padLeft - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end" fill="rgba(223,232,244,0.62)" font-size="11">${escapeHtml(valueFormatter(value))}</text>`,
            ].join('');
        }).join('');
        const xStep = Math.max(1, Math.ceil(safeItems.length / 12));
        const bars = safeItems.map((item, index) => {
            const x = padLeft + (slotWidth * index) + ((slotWidth - barWidth) / 2);
            const yValue = yFor(item.value);
            const top = item.value >= 0 ? yValue : zeroY;
            const barHeight = Math.max(2, Math.abs(zeroY - yValue));
            const fill = item.value >= 0 ? positiveFill : negativeFill;
            const tooltipAttrs = buildReportTooltipAttrs({
                title: item.label,
                value: valueFormatter(item.value),
                meta: tooltipMeta,
            });
            return `<rect class="report-chart-bar report-tooltip-target${item.value < 0 ? ' is-negative' : ''}" x="${x.toFixed(2)}" y="${top.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="6" fill="${fill}" ${tooltipAttrs}></rect>`;
        }).join('');
        const xLabels = safeItems.map((item, index) => {
            if (index !== safeItems.length - 1 && index % xStep !== 0) return '';
            const x = padLeft + (slotWidth * index) + (slotWidth / 2);
            return `<text x="${x.toFixed(2)}" y="${height - 12}" text-anchor="middle" fill="rgba(223,232,244,0.56)" font-size="11">${escapeHtml(item.label)}</text>`;
        }).join('');

        return [
            '<div class="report-chart-scroll">',
            `<svg class="report-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">`,
            `<line x1="${padLeft}" y1="${zeroY.toFixed(2)}" x2="${width - padRight}" y2="${zeroY.toFixed(2)}" stroke="rgba(70, 155, 255, 0.18)" stroke-width="1.2"/>`,
            yTicks,
            bars,
            xLabels,
            '</svg>',
            '</div>',
        ].join('');
    }

    function formatReportDateKeyLong(key) {
        const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return key || '-';
        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    function getReportModeLabel(mode) {
        const safeMode = String(mode || '').trim().toLowerCase();
        if (safeMode === 'live') return 'Live';
        if (safeMode === 'pre-live') return 'Pre-Live';
        if (safeMode === 'pendentes') return 'Pendentes';
        return 'Todos';
    }

    function sortEntriesByValue(entries, limit = 10) {
        const safeEntries = Array.isArray(entries) ? entries.slice() : [];
        return safeEntries
            .sort((a, b) => {
                const diff = Number(b.value || 0) - Number(a.value || 0);
                if (diff !== 0) return diff;
                return String(a.label || '').localeCompare(String(b.label || ''), 'pt-BR');
            })
            .slice(0, limit);
    }

    function buildReportSignalLabel(record) {
        const market1 = String(record && record.market1 || '').trim();
        const market2 = String(record && record.market2 || '').trim();
        const houses = [record && record.house1, record && record.house2]
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        if (market1 && market2) {
            return [market1, market2]
                .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .join(' x ');
        }
        if (market1 || market2) return market1 || market2;
        if (houses.length >= 2) return `${houses[0]} x ${houses[1]}`;
        return String(record && record.event || 'Sem sinal').trim() || 'Sem sinal';
    }

    function buildReportAnalysisDataset(records) {
        const safeRecords = Array.isArray(records) ? records.filter(Boolean) : [];
        const popularityMap = new Map();
        const sportsCountMap = new Map();
        const sportsProfitMap = new Map();
        const houseProfitMap = new Map();
        const crossMap = new Map();
        const signalCountMap = new Map();
        const weekdayCounts = Array.from({ length: 7 }, () => 0);
        const hourCounts = Array.from({ length: 24 }, () => 0);
        const signalHourCounts = Array.from({ length: 24 }, () => 0);
        let totalProfit = 0;
        let totalStake = 0;
        let totalRoi = 0;
        let roiCount = 0;
        let liveCount = 0;
        let preLiveCount = 0;
        let pendingCount = 0;

        safeRecords.forEach((record) => {
            const houses = [record.house1, record.house2]
                .map((item) => String(item || '').trim())
                .filter(Boolean);
            const metrics = computePlanilhaMetrics(record);
            const lucroMinimo = Number.isFinite(metrics.lucroMinimo) ? metrics.lucroMinimo : 0;
            totalProfit += lucroMinimo;
            totalStake += Number.isFinite(metrics.total) ? metrics.total : 0;
            if (Number.isFinite(metrics.roiMinimo)) {
                totalRoi += metrics.roiMinimo;
                roiCount += 1;
            }
            const lucroPorCasa = houses.length ? (lucroMinimo / houses.length) : 0;
            const sport = String(record.sport || 'Sem esporte').trim() || 'Sem esporte';
            const signal = buildReportSignalLabel(record);
            if (record.isLive) liveCount += 1;
            else preLiveCount += 1;
            if (
                sanitizePlanilhaStatus(record.status1).toLowerCase() === 'pendente'
                || sanitizePlanilhaStatus(record.status2).toLowerCase() === 'pendente'
            ) {
                pendingCount += 1;
            }

            houses.forEach((house) => {
                popularityMap.set(house, (popularityMap.get(house) || 0) + 1);
                houseProfitMap.set(house, (houseProfitMap.get(house) || 0) + lucroPorCasa);
            });

            sportsCountMap.set(sport, (sportsCountMap.get(sport) || 0) + 1);
            sportsProfitMap.set(sport, (sportsProfitMap.get(sport) || 0) + lucroMinimo);

            if (houses.length >= 2) {
                const sortedHouses = houses.slice(0, 2).sort((a, b) => a.localeCompare(b, 'pt-BR'));
                const pairKey = sortedHouses.join('|||');
                const current = crossMap.get(pairKey) || { houses: sortedHouses, value: 0 };
                current.value += 1;
                crossMap.set(pairKey, current);
            }

            signalCountMap.set(signal, (signalCountMap.get(signal) || 0) + 1);

            const ms = getPlanilhaRecordMs(record);
            if (Number.isFinite(ms)) {
                const dt = new Date(ms);
                weekdayCounts[dt.getDay()] += 1;
                hourCounts[dt.getHours()] += 1;
                signalHourCounts[dt.getHours()] += 1;
            }
        });

        const popularity = sortEntriesByValue(
            Array.from(popularityMap.entries()).map(([label, value]) => ({ label, value }))
        );
        const topSports = sortEntriesByValue(
            Array.from(sportsCountMap.entries()).map(([label, value]) => ({ label, value }))
        );
        const profitByHouse = sortEntriesByValue(
            Array.from(houseProfitMap.entries()).map(([label, value]) => ({ label, value }))
        );
        const profitBySport = sortEntriesByValue(
            Array.from(sportsProfitMap.entries()).map(([label, value]) => ({ label, value }))
        );
        const topCrosses = sortEntriesByValue(
            Array.from(crossMap.values()).map((item) => ({
                label: item.houses.join(' x '),
                houses: item.houses,
                value: item.value,
                isPair: true,
            }))
        );
        const topSignals = sortEntriesByValue(
            Array.from(signalCountMap.entries()).map(([label, value]) => ({ label, value }))
        );
        const weekdayItems = REPORT_DASHBOARD_WEEKDAY_LABELS.map((label, index) => ({
            label,
            value: weekdayCounts[index] || 0,
        }));
        const hourItems = Array.from({ length: 24 }, (_, hour) => ({
            label: `${String(hour).padStart(2, '0')}h`,
            value: hourCounts[hour] || 0,
        }));
        const signalHourItems = Array.from({ length: 24 }, (_, hour) => ({
            label: `${String(hour).padStart(2, '0')}h`,
            value: signalHourCounts[hour] || 0,
        }));

        return {
            count: safeRecords.length,
            totalProfit,
            averageStake: safeRecords.length ? (totalStake / safeRecords.length) : 0,
            averageRoi: roiCount ? (totalRoi / roiCount) : 0,
            liveCount,
            preLiveCount,
            pendingCount,
            resolvedCount: Math.max(0, safeRecords.length - pendingCount),
            uniqueHouses: popularityMap.size,
            uniqueSports: sportsCountMap.size,
            popularity,
            topSports,
            profitByHouse,
            profitBySport,
            topCrosses,
            topSignals,
            weekdayItems,
            hourItems,
            signalHourItems,
        };
    }

    function buildAnalysisValueText(entry, formatter) {
        if (entry && entry.valueText) return String(entry.valueText);
        if (typeof formatter === 'function') return formatter(Number(entry && entry.value || 0));
        return String(Number(entry && entry.value || 0));
    }

    function buildReportMetricCardMarkup(label, value) {
        return [
            '<article class="report-metric-card">',
            `<span class="report-metric-label">${escapeHtml(label)}</span>`,
            `<strong class="report-metric-value">${escapeHtml(value)}</strong>`,
            '</article>',
        ].join('');
    }

    function buildReportRankingCardMarkup({
        toneClass = 'tone-cyan',
        icon = '#',
        title = '',
        meta = '',
        items = [],
        wide = false,
        emptyText = 'Sem dados suficientes neste recorte.',
        valueFormatter = (value) => String(Math.round(value)),
    } = {}) {
        const safeItems = Array.isArray(items) ? items : [];
        const maxValue = Math.max(1, ...safeItems.map((item) => Number(item.value || 0)));
        const content = safeItems.length
            ? `<div class="report-rank-list">${safeItems.map((item, index) => {
                const width = Math.max(6, Math.min(100, (Number(item.value || 0) / maxValue) * 100));
                const main = item && item.isPair && Array.isArray(item.houses)
                    ? `<div class="report-pair-badges">${item.houses.map((house, pairIndex) => [
                        `<span class="report-pair-chip">${escapeHtml(house)}</span>`,
                        pairIndex === 0 ? '<span class="report-pair-sep">×</span>' : '',
                    ].join('')).join('')}</div>`
                    : `<span class="report-rank-label">${escapeHtml(item.label || '-')}</span>`;
                const tooltipAttrs = buildReportTooltipAttrs({
                    title: item && item.tooltipTitle ? item.tooltipTitle : (item && item.label ? item.label : '-'),
                    value: buildAnalysisValueText(item, valueFormatter),
                    meta: item && item.tooltipMeta ? item.tooltipMeta : title,
                });
                return [
                    `<div class="report-rank-item report-tooltip-target" ${tooltipAttrs}>`,
                    `<span class="report-rank-index">${index + 1}</span>`,
                    `<div class="report-rank-main">${main}</div>`,
                    `<span class="report-rank-value">${escapeHtml(buildAnalysisValueText(item, valueFormatter))}</span>`,
                    `<div class="report-rank-track"><span class="report-rank-fill" style="width:${width.toFixed(2)}%"></span></div>`,
                    '</div>',
                ].join('');
            }).join('')}</div>`
            : `<div class="report-analysis-soon">${escapeHtml(emptyText)}</div>`;

        return [
            `<article class="report-analysis-card ${toneClass}${wide ? ' is-wide' : ''}">`,
            '<div class="report-analysis-titlebar">',
            `<span class="report-analysis-icon">${escapeHtml(icon)}</span>`,
            '<div class="report-analysis-heading">',
            `<h4>${escapeHtml(title)}</h4>`,
            `<span>${escapeHtml(meta)}</span>`,
            '</div>',
            '</div>',
            content,
            '</article>',
        ].join('');
    }

    function buildReportChartCardMarkup({
        toneClass = 'tone-cyan',
        icon = '#',
        title = '',
        meta = '',
        chartMarkup = '',
        wide = false,
        emptyText = 'Sem dados suficientes neste recorte.',
    } = {}) {
        const body = chartMarkup || `<div class="report-analysis-soon">${escapeHtml(emptyText)}</div>`;
        return [
            `<article class="report-analysis-card ${toneClass}${wide ? ' is-wide' : ''}">`,
            '<div class="report-analysis-titlebar">',
            `<span class="report-analysis-icon">${escapeHtml(icon)}</span>`,
            '<div class="report-analysis-heading">',
            `<h4>${escapeHtml(title)}</h4>`,
            `<span>${escapeHtml(meta)}</span>`,
            '</div>',
            '</div>',
            `<div class="report-analysis-chart">${body}</div>`,
            '</article>',
        ].join('');
    }

    function buildReportInsightListCardMarkup({
        toneClass = 'tone-cyan',
        icon = '!',
        title = '',
        meta = '',
        items = [],
        emptyText = 'Sem sinais suficientes para gerar leitura automatica neste recorte.',
        wide = false,
    } = {}) {
        const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
        const body = safeItems.length
            ? `<div class="report-insight-list">${safeItems.map((item) => [
                '<article class="report-insight-item">',
                '<div class="report-insight-topline">',
                `<span class="report-insight-kicker">${escapeHtml(item.kicker || 'Leitura')}</span>`,
                item.tag ? `<span class="report-insight-tag">${escapeHtml(item.tag)}</span>` : '',
                '</div>',
                `<strong>${escapeHtml(item.title || '-')}</strong>`,
                `<p>${escapeHtml(item.text || '')}</p>`,
                '</article>',
            ].join('')).join('')}</div>`
            : `<div class="report-analysis-soon">${escapeHtml(emptyText)}</div>`;
        return [
            `<article class="report-analysis-card ${toneClass}${wide ? ' is-wide' : ''}">`,
            '<div class="report-analysis-titlebar">',
            `<span class="report-analysis-icon">${escapeHtml(icon)}</span>`,
            '<div class="report-analysis-heading">',
            `<h4>${escapeHtml(title)}</h4>`,
            `<span>${escapeHtml(meta)}</span>`,
            '</div>',
            '</div>',
            body,
            '</article>',
        ].join('');
    }

    function getTopNonZeroEntry(items) {
        const safeItems = Array.isArray(items) ? items : [];
        return safeItems.find((item) => Number(item && item.value || 0) > 0) || safeItems[0] || null;
    }

    function formatShareText(part, total) {
        if (!(total > 0)) return '0,0%';
        return `${((Number(part || 0) / total) * 100).toFixed(1)}%`;
    }

    function buildReportSuggestionsInsights(dataset, totalExpenses) {
        const total = Math.max(0, dataset.count || 0);
        const topHouse = getTopNonZeroEntry(dataset.popularity);
        const topSport = getTopNonZeroEntry(dataset.topSports);
        const topSignal = getTopNonZeroEntry(dataset.topSignals);
        const peakHour = getTopNonZeroEntry(dataset.hourItems);
        const houseShare = topHouse ? formatShareText(topHouse.value, total) : '0,0%';
        const pendingShare = formatShareText(dataset.pendingCount, total);
        const expenseShare = dataset.totalProfit > 0 ? `${((totalExpenses / dataset.totalProfit) * 100).toFixed(1)}%` : '0,0%';

        const insights = [];
        const actions = [];

        if (topHouse) {
            insights.push({
                kicker: 'Concentracao',
                tag: topHouse.value >= Math.max(3, Math.ceil(total * 0.45)) ? 'Atencao' : 'Estavel',
                title: `${topHouse.label} lidera o fluxo do recorte`,
                text: `${houseShare} dos registros passam por essa casa. Isso ajuda a identificar dependencias e oportunidades de diversificacao.`,
            });
        }
        if (topSport) {
            insights.push({
                kicker: 'Esporte dominante',
                tag: 'Mapa do volume',
                title: `${topSport.label} esta puxando a operacao`,
                text: `${Math.round(topSport.value)} entradas desse recorte vieram dessa modalidade, o que indica onde sua captura esta mais forte hoje.`,
            });
        }
        if (topSignal) {
            insights.push({
                kicker: 'Sinal recorrente',
                tag: 'Padrao repetido',
                title: `"${topSignal.label}" reapareceu com frequencia`,
                text: `${Math.round(topSignal.value)} registros bateram nesse tipo de mercado. Vale usar isso para validar se esse padrao esta compensando.`,
            });
        }
        if (peakHour && Number(peakHour.value || 0) > 0) {
            insights.push({
                kicker: 'Janela quente',
                tag: 'Horario-chave',
                title: `${peakHour.label} concentrou o maior pico de registros`,
                text: `${Math.round(peakHour.value)} entradas foram registradas nessa faixa. E a melhor janela para monitoramento mais intenso.`,
            });
        }
        insights.push({
            kicker: 'Estado atual',
            tag: dataset.pendingCount > 0 ? 'Monitorar' : 'Saudavel',
            title: `${dataset.pendingCount} surebets ainda estao pendentes`,
            text: dataset.pendingCount
                ? `${pendingShare} do recorte ainda precisa de desfecho. Isso pede revisao de status para nao distorcer leitura de lucro e saldo.`
                : 'Todo o recorte atual ja esta resolvido, o que deixa a leitura de lucro bem mais confiavel.',
        });
        insights.push({
            kicker: 'Custos',
            tag: totalExpenses > 0 ? 'Impacto real' : 'Sem pressao',
            title: `Gastos representam ${expenseShare} da projecao de lucro`,
            text: totalExpenses > 0
                ? `Foram ${formatCurrencyBRL(totalExpenses)} em despesas dentro do recorte. Vale acompanhar esse peso para o saldo final nao perder tracao.`
                : 'Nao existem gastos registrados nesse recorte, então todo o saldo projetado vem limpo das surebets registradas.',
        });

        if (dataset.pendingCount > 0) {
            actions.push({
                kicker: 'Prioridade alta',
                tag: 'Status',
                title: 'Fechar os registros pendentes primeiro',
                text: `Atualize as ${dataset.pendingCount} entradas pendentes para liberar uma leitura mais fiel de lucro, ROI e saldo final.`,
            });
        }
        if (topHouse && total > 0 && (topHouse.value / total) >= 0.45) {
            actions.push({
                kicker: 'Balanceamento',
                tag: 'Diversificar',
                title: `Reduzir dependencia da ${topHouse.label}`,
                text: `Ela ja concentra ${houseShare} do fluxo. Vale observar se outras casas do mesmo grupo podem dividir a carga sem perder volume.`,
            });
        }
        if (topSignal && topSignal.value >= 3) {
            actions.push({
                kicker: 'Escala',
                tag: 'Padrao',
                title: `Monitorar o sinal ${topSignal.label}`,
                text: 'Esse mercado esta aparecendo varias vezes. Pode virar referencia para filtros, automacoes e revisao de desempenho por tipo de entrada.',
            });
        }
        if (peakHour && Number(peakHour.value || 0) > 0) {
            actions.push({
                kicker: 'Agenda',
                tag: 'Operacao',
                title: `Proteger a faixa das ${peakHour.label}`,
                text: 'Concentre acompanhamento manual e revisoes nessa janela porque ela esta entregando o maior volume do recorte.',
            });
        }
        actions.push({
            kicker: 'Higiene',
            tag: 'Rotina',
            title: 'Registrar gastos e resultados no mesmo dia',
            text: 'Isso evita distorcoes nos graficos e deixa as analises global e individual muito mais confiaveis ao longo do tempo.',
        });

        return { insights, actions };
    }

    function renderReportAnalysisGlobal(records, range) {
        if (!reportAnalysisGlobal) return;
        const dataset = buildReportAnalysisDataset(records);
        const rangeText = range
            ? `${formatReportDateKeyLong(range.startKey)} ate ${formatReportDateKeyLong(range.endKey)}`
            : 'Recorte atual';
        const header = [
            '<div class="report-analysis-head">',
            '<div class="report-analysis-copy">',
            '<h3>Analise Global</h3>',
            `<p>Leitura consolidada do recorte geral do Dashboard, agrupando operacao por casa, esporte, cruzamento e horarios.</p>`,
            '</div>',
            `<span class="report-analysis-chip">${escapeHtml(`${dataset.count} registros | ${getReportModeLabel(reportDashboardMode)} | ${rangeText}`)}</span>`,
            '</div>',
        ].join('');
        const countFormatter = (value) => `${Math.round(value)}x`;
        const chartCountFormatter = (value) => String(Math.round(value));
        const hasGlobalData = dataset.count > 0;
        const grid = [
            '<div class="report-analysis-grid">',
            buildReportRankingCardMarkup({
                toneClass: 'tone-cyan',
                icon: 'P',
                title: 'Popularidade',
                meta: 'Casas com maior volume de aparicao',
                items: dataset.popularity,
                valueFormatter: countFormatter,
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-lime',
                icon: 'E',
                title: 'Top 10 Esportes',
                meta: 'Modalidades mais recorrentes no recorte',
                items: dataset.topSports,
                valueFormatter: countFormatter,
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-orange',
                icon: 'X',
                title: 'Top 10 Cruzamentos',
                meta: 'Combinacoes de casas mais repetidas',
                items: dataset.topCrosses,
                wide: true,
                valueFormatter: countFormatter,
            }),
            buildReportChartCardMarkup({
                toneClass: 'tone-lime',
                icon: 'D',
                title: 'Dias da Semana',
                meta: 'Distribuicao de registros por dia',
                chartMarkup: hasGlobalData ? buildReportBarChartMarkup(dataset.weekdayItems, { valueFormatter: chartCountFormatter, tooltipMeta: 'Registros' }) : '',
            }),
            buildReportChartCardMarkup({
                toneClass: 'tone-cyan',
                icon: 'H',
                title: 'Horarios de Pico de Registros',
                meta: 'Faixas horarias mais movimentadas',
                chartMarkup: hasGlobalData ? buildReportBarChartMarkup(dataset.hourItems, { valueFormatter: chartCountFormatter, tooltipMeta: 'Registros' }) : '',
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-green',
                icon: 'S',
                title: 'Top 10 Sinais',
                meta: 'Mercados mais recorrentes do recorte',
                items: dataset.topSignals,
                valueFormatter: countFormatter,
            }),
            buildReportChartCardMarkup({
                toneClass: 'tone-teal',
                icon: 'T',
                title: 'Horario de Pico de Sinais',
                meta: 'Janela com maior recorrencia de sinais',
                chartMarkup: hasGlobalData ? buildReportBarChartMarkup(dataset.signalHourItems, { valueFormatter: chartCountFormatter, tooltipMeta: 'Sinais' }) : '',
            }),
            '</div>',
        ].join('');

        reportAnalysisGlobal.innerHTML = header + grid;
    }

    function renderReportAnalysisIndividual() {
        if (!reportAnalysisIndividual) return;
        const records = getFilteredPlanilhaRegistros();
        const dataset = buildReportAnalysisDataset(records);
        const parts = [];
        if (planilhaSelectedMonth && planilhaSelectedYear) {
            parts.push(`${PLANILHA_MONTH_LABELS[planilhaSelectedMonth] || planilhaSelectedMonth}/${planilhaSelectedYear}`);
        }
        parts.push(getReportModeLabel(planilhaFilterMode));
        if (planilhaSearchTerm) parts.push(`Busca: ${planilhaSearchTerm}`);

        const header = [
            '<div class="report-analysis-head">',
            '<div class="report-analysis-copy">',
            '<h3>Analise Individual</h3>',
            '<p>Leitura focada no recorte atual da aba Surebets. Para afunilar mais, basta ajustar busca, periodo e modo na propria aba.</p>',
            '</div>',
            `<span class="report-analysis-chip">${escapeHtml(`${dataset.count} registros | ${parts.filter(Boolean).join(' | ')}`)}</span>`,
            '</div>',
        ].join('');
        const countFormatter = (value) => `${Math.round(value)}x`;
        const chartCountFormatter = (value) => String(Math.round(value));
        const hasIndividualData = dataset.count > 0;
        const grid = [
            '<div class="report-analysis-grid">',
            buildReportRankingCardMarkup({
                toneClass: 'tone-cyan',
                icon: 'P',
                title: 'Popularidade',
                meta: 'Casas mais presentes no recorte atual',
                items: dataset.popularity,
                valueFormatter: countFormatter,
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-lime',
                icon: 'E',
                title: 'Top 10 Esportes',
                meta: 'Esportes dominantes do recorte',
                items: dataset.topSports,
                valueFormatter: countFormatter,
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-green',
                icon: '$',
                title: 'Lucro por Casa',
                meta: 'Projecao de lucro minimo rateada por casa',
                items: dataset.profitByHouse,
                valueFormatter: (value) => formatCurrencyBRL(value),
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-purple',
                icon: 'R',
                title: 'Lucro por Esporte',
                meta: 'Projecao consolidada por modalidade',
                items: dataset.profitBySport,
                valueFormatter: (value) => formatCurrencyBRL(value),
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-orange',
                icon: 'X',
                title: 'Top 10 Cruzamentos',
                meta: 'Pares de casas mais recorrentes no foco atual',
                items: dataset.topCrosses,
                wide: true,
                valueFormatter: countFormatter,
            }),
            buildReportChartCardMarkup({
                toneClass: 'tone-lime',
                icon: 'D',
                title: 'Dias da Semana',
                meta: 'Distribuicao de registros do recorte',
                chartMarkup: hasIndividualData ? buildReportBarChartMarkup(dataset.weekdayItems, { valueFormatter: chartCountFormatter, tooltipMeta: 'Registros' }) : '',
            }),
            buildReportChartCardMarkup({
                toneClass: 'tone-cyan',
                icon: 'H',
                title: 'Horarios de Pico de Registros',
                meta: 'Janelas mais ativas do recorte',
                chartMarkup: hasIndividualData ? buildReportBarChartMarkup(dataset.hourItems, { valueFormatter: chartCountFormatter, tooltipMeta: 'Registros' }) : '',
            }),
            buildReportRankingCardMarkup({
                toneClass: 'tone-green',
                icon: 'S',
                title: 'Top 10 Sinais',
                meta: 'Mercados mais repetidos no recorte atual',
                items: dataset.topSignals,
                valueFormatter: countFormatter,
            }),
            buildReportChartCardMarkup({
                toneClass: 'tone-teal',
                icon: 'T',
                title: 'Horario de Pico de Sinais',
                meta: 'Faixas com maior repeticao de sinais',
                chartMarkup: hasIndividualData ? buildReportBarChartMarkup(dataset.signalHourItems, { valueFormatter: chartCountFormatter, tooltipMeta: 'Sinais' }) : '',
            }),
            '</div>',
        ].join('');

        reportAnalysisIndividual.innerHTML = header + grid;
    }

    function renderReportSuggestions() {
        if (!reportSuggestions) return;
        const viewerReady = !!(reportSuggestionsState.viewer && reportSuggestionsState.viewer.id);
        const infoChip = reportSuggestionsState.loading
            ? 'Sincronizando mural aprovado...'
            : viewerReady
                ? 'Votacao ativa para sua conta'
                : 'Sessao carregada sem voto liberado';
        const statusMessage = reportSuggestionsState.error
            ? `<div class="report-suggestion-inline-state is-error">${escapeHtml(reportSuggestionsState.error)}</div>`
            : reportSuggestionsState.loading
                ? '<div class="report-suggestion-inline-state">Atualizando publicacoes aprovadas...</div>'
                : '<div class="report-suggestion-inline-state is-ok">Somente itens aprovados aparecem aqui.</div>';

        reportSuggestions.innerHTML = [
            '<div class="report-suggestions-layout report-suggestions-layout--compact">',
            '<section class="report-suggestion-form-card report-suggestion-form-card--top">',
            '<div class="report-suggestion-section-head">',
            '<h4>Central de Sugestoes</h4>',
            '<p>Inovacao constante: sugira melhorias e novas funcionalidades para o software.</p>',
            '</div>',
            '<form class="report-suggestion-form" data-suggestion-form="create">',
            `<input type="text" class="report-suggestion-input" name="title" maxlength="200" placeholder="Resumo da ideia" value="${escapeHtml(reportSuggestionsState.draftTitle || '')}">`,
            `<textarea class="report-suggestion-textarea" name="details" maxlength="4000" placeholder="Detalhes da sugestao">${escapeHtml(reportSuggestionsState.draftDetails || '')}</textarea>`,
            '<div class="report-suggestion-form-foot">',
            `<button type="submit" class="report-suggestion-submit-btn"${reportSuggestionsState.submitting ? ' disabled' : ''}>${reportSuggestionsState.submitting ? 'Enviando...' : 'Enviar Sugestao'}</button>`,
            `<span class="report-suggestions-hero-chip">${escapeHtml(infoChip)}</span>`,
            '</div>',
            '</form>',
            '</section>',
            '<section class="report-suggestion-feed-card report-suggestion-feed-card--board">',
            '<div class="report-suggestion-section-head report-suggestion-section-head-inline">',
            '<div>',
            '<h4>Mural de Ideias</h4>',
            '</div>',
            `<button type="button" class="report-suggestion-link-btn" data-suggestion-action="retry"${reportSuggestionsState.loading ? ' disabled' : ''}>Atualizar</button>`,
            '</div>',
            '<div class="report-suggestion-toolbar">',
            buildReportSuggestionsFilterCompactMarkup(REPORT_SUGGESTIONS_STATUS_FILTERS, 'status', reportSuggestionsState.statusFilter),
            buildReportSuggestionsFilterCompactMarkup(REPORT_SUGGESTIONS_SORT_FILTERS, 'sort', reportSuggestionsState.sort),
            '</div>',
            statusMessage,
            `<div class="report-suggestion-feed">${buildReportSuggestionsFeedMarkup()}</div>`,
            '</section>',
            buildReportSuggestionDetailMarkup(),
            '</div>',
        ].join('');
    }

    function getReportSuggestionsStatsFallback() {
        return {
            total_items: 0,
            updates_total: 0,
            voting_total: 0,
            progress_total: 0,
            launched_total: 0,
            upvotes: 0,
            downvotes: 0,
        };
    }

    function getReportSuggestionsCurrentItem() {
        return (reportSuggestionsState.items || []).find((item) => Number(item && item.id) === Number(reportSuggestionsState.detailId)) || null;
    }

    function formatReportSuggestionDateTime(value) {
        const raw = String(value || '').trim();
        if (!raw) return '-';
        const parsed = Date.parse(raw);
        if (!Number.isFinite(parsed)) return raw;
        try {
            return new Date(parsed).toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (_) {
            return raw;
        }
    }

    function formatReportSuggestionText(value) {
        const text = String(value || '').trim();
        if (!text) return '';
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    function getReportSuggestionPreview(value, maxLen = 200) {
        const clean = String(value || '').replace(/\s+/g, ' ').trim();
        if (clean.length <= maxLen) return clean;
        return `${clean.slice(0, Math.max(0, maxLen - 3)).trim()}...`;
    }

    function getReportSuggestionStatusClass(status) {
        const safe = String(status || '').trim().toLowerCase();
        if (!safe) return 'is-default';
        return `is-${safe.replace(/[^a-z0-9]+/g, '-')}`;
    }

    function getReportSuggestionTypeClass(entryType) {
        return String(entryType || '').trim().toLowerCase() === 'update'
            ? 'is-update'
            : 'is-suggestion';
    }

    function mapReportSuggestionSummary(summary) {
        const upvotes = Number(summary && summary.upvotes) || 0;
        const downvotes = Number(summary && summary.downvotes) || 0;
        const score = Number(summary && summary.score);
        return {
            upvotes,
            downvotes,
            score: Number.isFinite(score) ? score : (upvotes - downvotes),
            viewerVote: (summary && (summary.viewerVote || summary.viewer_vote)) ? String(summary.viewerVote || summary.viewer_vote) : null,
        };
    }

    function updateReportSuggestionItemSummary(suggestionId, summary) {
        const safeId = Number(suggestionId) || 0;
        if (!safeId) return;
        const mapped = mapReportSuggestionSummary(summary);
        reportSuggestionsState.items = (reportSuggestionsState.items || []).map((item) => {
            if (Number(item && item.id) !== safeId) return item;
            return {
                ...item,
                upvotes: mapped.upvotes,
                downvotes: mapped.downvotes,
                score: mapped.score,
                viewerVote: mapped.viewerVote,
            };
        });
    }

    async function getReportSuggestionsSessionConfig(force = false) {
        if (!force && reportSuggestionsState.baseUrl) {
            return {
                baseUrl: reportSuggestionsState.baseUrl,
                token: reportSuggestionsState.token,
            };
        }

        let config = null;
        if (typeof window.polvo !== 'undefined' && window.polvo.getSocketConfig) {
            try {
                config = await window.polvo.getSocketConfig();
            } catch (_) {
                config = null;
            }
        }

        const baseUrl = normalizeBaseUrl((config && config.url) || REPORT_SUGGESTIONS_DEFAULT_BASE_URL);
        const token = String((config && config.token) || '').trim();
        reportSuggestionsState.baseUrl = baseUrl;
        reportSuggestionsState.token = token;
        return { baseUrl, token };
    }

    async function resolveReportSuggestionsApiBase(force = false) {
        if (!force && reportSuggestionsState.apiBase) return reportSuggestionsState.apiBase;
        const session = await getReportSuggestionsSessionConfig(force);
        const headers = {};
        if (session.token) headers['X-Octosure-Token'] = session.token;

        for (const candidate of buildReportSuggestionsApiCandidates(session.baseUrl)) {
            try {
                const response = await fetch(`${candidate}/list.php?limit=1`, { headers });
                if (!response.ok) continue;
                const payload = await response.json().catch(() => null);
                if (payload && payload.ok) {
                    reportSuggestionsState.apiBase = candidate;
                    return candidate;
                }
            } catch (_) {}
        }

        throw new Error('Nao foi possivel localizar a API de sugestoes.');
    }

    function buildReportSuggestionsApiCandidates(baseUrl) {
        const seenBases = new Set();
        const baseVariants = [];
        const pushBase = (raw) => {
            const safe = normalizeBaseUrl(raw, '');
            if (!safe || seenBases.has(safe)) return;
            seenBases.add(safe);
            baseVariants.push(safe);
        };

        const collectBaseVariants = (raw) => {
            pushBase(raw);
            try {
                const parsed = new URL(normalizeBaseUrl(raw, REPORT_SUGGESTIONS_DEFAULT_BASE_URL));
                const origin = `${parsed.protocol}//${parsed.host}`;
                pushBase(origin);
                const pathname = parsed.pathname.replace(/\/+$/, '');
                if (pathname && pathname !== '/') {
                    pushBase(`${origin}${pathname}`);
                }
                if (!/^www\./i.test(parsed.host)) {
                    pushBase(`${parsed.protocol}//www.${parsed.host}${pathname}`);
                } else {
                    pushBase(`${parsed.protocol}//${parsed.host.replace(/^www\./i, '')}${pathname}`);
                }
            } catch (_) {}
        };

        collectBaseVariants(baseUrl);
        collectBaseVariants(REPORT_SUGGESTIONS_DEFAULT_BASE_URL);

        const seenCandidates = new Set();
        const candidates = [];
        baseVariants.forEach((baseVariant) => {
            let parsedBase = null;
            try {
                parsedBase = new URL(baseVariant);
            } catch (_) {
                parsedBase = null;
            }
            const pathName = parsedBase ? parsedBase.pathname.replace(/\/+$/, '').toLowerCase() : '';
            const baseWithSlash = baseVariant.endsWith('/') ? baseVariant : `${baseVariant}/`;
            REPORT_SUGGESTIONS_API_CANDIDATES.forEach((suffix) => {
                if (!suffix) return;
                if (pathName.endsWith('/painel') && suffix.startsWith('painel/')) return;
                const joined = normalizeBaseUrl(new URL(suffix, baseWithSlash).toString(), '');
                if (!joined || seenCandidates.has(joined)) return;
                seenCandidates.add(joined);
                candidates.push(joined);
            });
        });

        return candidates;
    }

    async function reportSuggestionsApiRequest(endpoint, { method = 'GET', params = null, body = null, forceBase = false } = {}) {
        const apiBase = await resolveReportSuggestionsApiBase(forceBase);
        const session = await getReportSuggestionsSessionConfig();
        const url = new URL(`${apiBase}/${endpoint}`);
        if (params && typeof params === 'object') {
            Object.entries(params).forEach(([key, value]) => {
                if (value == null || value === '') return;
                url.searchParams.set(key, String(value));
            });
        }

        const headers = {};
        if (session.token) headers['X-Octosure-Token'] = session.token;
        if (body != null) headers['Content-Type'] = 'application/json';

        const response = await fetch(url.toString(), {
            method,
            headers,
            body: body != null ? JSON.stringify(body) : undefined,
        });

        const raw = await response.text();
        let payload = null;
        try {
            payload = raw ? JSON.parse(raw) : null;
        } catch (_) {
            payload = null;
        }

        if (!response.ok || !payload || payload.ok === false) {
            throw new Error((payload && payload.message) || 'Falha ao comunicar com a central de sugestoes.');
        }

        return payload;
    }

    async function loadReportSuggestions({ force = false, silent = false } = {}) {
        if (!reportSuggestions) return;
        const now = Date.now();
        if (!force && reportSuggestionsState.loading) return;
        if (!force && reportSuggestionsState.lastFetchedAt && (now - reportSuggestionsState.lastFetchedAt) < REPORT_SUGGESTIONS_REFRESH_MS) {
            renderReportSuggestions();
            return;
        }

        const requestSeq = reportSuggestionsState.requestSeq + 1;
        reportSuggestionsState.requestSeq = requestSeq;
        reportSuggestionsState.loading = true;
        if (!silent) reportSuggestionsState.error = '';
        renderReportSuggestions();

        try {
            const payload = await reportSuggestionsApiRequest('list.php', {
                params: {
                    entry_type: 'suggestion',
                    public_status: reportSuggestionsState.statusFilter,
                    sort: reportSuggestionsState.sort,
                    limit: 40,
                },
                forceBase: force,
            });
            if (requestSeq !== reportSuggestionsState.requestSeq) return;

            reportSuggestionsState.viewer = payload.viewer || null;
            reportSuggestionsState.stats = payload.stats || getReportSuggestionsStatsFallback();
            reportSuggestionsState.items = Array.isArray(payload.items)
                ? payload.items.map((item) => ({
                    id: Number(item && item.id) || 0,
                    entryType: String(item && (item.entryType || item.entry_type) || 'suggestion'),
                    entryLabel: String(item && item.entryLabel || 'Sugestao'),
                    title: String(item && item.title || ''),
                    details: String(item && item.details || ''),
                    publicStatus: String(item && (item.publicStatus || item.public_status) || 'em_votacao'),
                    statusLabel: String(item && item.statusLabel || 'Em votacao'),
                    createdAt: String(item && (item.createdAt || item.created_at) || ''),
                    publishAt: item && (item.publishAt || item.publish_at) ? String(item.publishAt || item.publish_at) : '',
                    publishUntil: item && (item.publishUntil || item.publish_until) ? String(item.publishUntil || item.publish_until) : '',
                    upvotes: Number(item && item.upvotes) || 0,
                    downvotes: Number(item && item.downvotes) || 0,
                    score: Number(item && item.score) || 0,
                    viewerVote: item && item.viewerVote ? String(item.viewerVote) : (item && item.viewer_vote ? String(item.viewer_vote) : null),
                }))
                : [];
            if (reportSuggestionsState.detailId && !getReportSuggestionsCurrentItem()) {
                reportSuggestionsState.detailId = 0;
            }
            reportSuggestionsState.error = '';
            reportSuggestionsState.lastFetchedAt = Date.now();
        } catch (err) {
            if (requestSeq !== reportSuggestionsState.requestSeq) return;
            reportSuggestionsState.error = (err && err.message) ? err.message : 'Nao foi possivel carregar as sugestoes.';
        } finally {
            if (requestSeq === reportSuggestionsState.requestSeq) {
                reportSuggestionsState.loading = false;
                renderReportSuggestions();
            }
        }
    }

    function requestReportSuggestionsRefresh(force = false) {
        loadReportSuggestions({
            force,
            silent: !!reportSuggestionsState.items.length,
        });
    }

    function stopReportSuggestionsAutoRefresh() {
        if (reportSuggestionsRefreshHandle) {
            window.clearInterval(reportSuggestionsRefreshHandle);
            reportSuggestionsRefreshHandle = 0;
        }
    }

    function startReportSuggestionsAutoRefresh() {
        stopReportSuggestionsAutoRefresh();
        if (activeReportView !== 'sugestoes') return;
        reportSuggestionsRefreshHandle = window.setInterval(() => {
            if (activeReportView !== 'sugestoes') return;
            requestReportSuggestionsRefresh();
        }, REPORT_SUGGESTIONS_REFRESH_MS);
    }

    function buildReportSuggestionsStatsMarkup() {
        const stats = reportSuggestionsState.stats || getReportSuggestionsStatsFallback();
        const items = [
            { label: 'Publicacoes Online', value: Number(stats.total_items) || 0, meta: 'Aprovadas pelo admin' },
            { label: 'Atualizacoes Ativas', value: Number(stats.updates_total) || 0, meta: 'Itens do tipo atualizacao' },
            { label: 'Em Votacao', value: Number(stats.voting_total) || 0, meta: 'Status publico atual' },
            { label: 'Em Desenvolvimento', value: Number(stats.progress_total) || 0, meta: 'Liberado pelo admin' },
            { label: 'Lancadas', value: Number(stats.launched_total) || 0, meta: 'Ja disponiveis no produto' },
            { label: 'Votos Totais', value: `${Number(stats.upvotes) || 0} / ${Number(stats.downvotes) || 0}`, meta: 'Favor / Contra' },
        ];
        return items.map((item) => [
            '<article class="report-suggestion-stat-card">',
            `<span class="report-suggestion-stat-label">${escapeHtml(item.label)}</span>`,
            `<strong class="report-suggestion-stat-value">${escapeHtml(String(item.value))}</strong>`,
            `<span class="report-suggestion-stat-meta">${escapeHtml(item.meta)}</span>`,
            '</article>',
        ].join('')).join('');
    }

    function buildReportSuggestionsFilterGroupMarkup(title, filters, group, activeValue) {
        const buttons = (Array.isArray(filters) ? filters : []).map((item) => {
            const value = String(item && item.value || '');
            const label = String(item && item.label || value);
            const activeClass = value === activeValue ? ' is-active' : '';
            return `<button type="button" class="report-suggestion-filter-btn${activeClass}" data-suggestion-filter-group="${escapeHtml(group)}" data-suggestion-filter-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
        }).join('');
        return [
            '<div class="report-suggestion-filter-block">',
            `<span class="report-suggestion-filter-title">${escapeHtml(title)}</span>`,
            '<div class="report-suggestion-filter-row">',
            buttons,
            '</div>',
            '</div>',
        ].join('');
    }

    function buildReportSuggestionsFilterCompactMarkup(filters, group, activeValue) {
        const buttons = (Array.isArray(filters) ? filters : []).map((item) => {
            const value = String(item && item.value || '');
            const label = String(item && item.label || value);
            const activeClass = value === activeValue ? ' is-active' : '';
            return `<button type="button" class="report-suggestion-filter-btn${activeClass}" data-suggestion-filter-group="${escapeHtml(group)}" data-suggestion-filter-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
        }).join('');
        return `<div class="report-suggestion-filter-inline">${buttons}</div>`;
    }

    function getReportSuggestionVoteIcon(type) {
        if (String(type || '').toLowerCase() === 'down') {
            return '<svg viewBox="0 0 478.174 478.174" aria-hidden="true"><path d="M457.525,153.074c1.9-5.1,3.7-12,4.2-20c0.7-14.1-2.8-33.9-22.7-51.9c1.3-9.2,1.3-23.8-6.8-38.3c-10.7-19.2-31.6-32.2-62.2-38.7c-20.5-4.4-47.4-5.3-80-2.8c-65.7-1.3-129.7,6.8-133.3,7.3l-23.5,2.8c-6.8-4.8-15.1-7.6-24-7.6h-61c-23,0-41.6,18.7-41.6,41.6v162.5c0,23,18.7,41.6,41.6,41.6h61c7.2,0,13.9-1.8,19.8-5c4.2,9.2,10.4,19.7,19.6,29.4c0.5,0.5,1,1,1.6,1.4c31.4,24.1,68.4,110.9,81.5,146.3c-1.3,11-2.6,34.8,8.4,47.7c4.9,5.7,11.7,8.8,19.3,8.8c7.7,0,34.3-1.8,50.9-24.7c15.7-21.8,16.6-54.4,2.6-97c-11.8-35.8-12.9-51.7-12.5-58.1c5.4,1.2,10.7,2.3,15.8,3.2h0.1c0.9,0.2,22.9,5.1,49.2,6.3c37.4,1.8,64.5-4.7,80.3-19.2c21.8-19.9,19.2-45.3,12.7-61.5c5.6-7.3,12.4-19.2,13-34.4C471.925,178.974,467.325,165.674,457.525,153.074z M109.225,222.674h-61c-8.1,0-14.6-6.6-14.6-14.6v-162.5c0-8.1,6.6-14.6,14.6-14.6h61c8.1,0,14.6,6.6,14.6,14.6v162.5C123.825,216.174,117.325,222.674,109.225,222.674z M430.925,232.374c0,0.1,3.5,5.6,4.7,13.1c1.5,9.3-1.1,17-8.1,23.4c-19.1,17.4-74.1,13.4-104.8,6.6c-0.4-0.1-0.8-0.2-1.3-0.3c-5.5-1-11.4-2.2-17.4-3.5c-6.4-2.3-15.2-2-21.8,3.9c-13.3,11.8-11.8,38.6,4.9,89.5c11,33.4,11.4,58.6,1.2,72.7c-8.6,11.9-22.8,13.4-28.2,13.5c-2.4-4-3.1-17.7-1.3-29c0.3-2.2,0.1-4.5-0.6-6.7c-1.9-5.1-45.8-125.3-90.7-160.9c-11.7-12.7-16.8-27.6-18.6-34.3c1.2-3.9,1.9-8.1,1.9-12.4v-162.4c0-3-0.3-6-0.9-8.8l10.1-1.2h0.1c0.6-0.1,65.7-8.5,130-7.1c0.4,0,0.9,0,1.4,0c30.3-2.4,54.8-1.7,72.9,2.2c22.4,4.8,37.2,13.2,44,25.1c7.1,12.3,3.2,25,2.9,26.2c-2.1,5.6-0.2,11.7,4.6,15.3c29.6,22.2,16,48.1,14.2,51.3c-3.3,5.2-2.5,11.8,1.8,16.3c8.6,9,12.8,18,12.5,26.8c-0.4,13.1-10.5,22.9-11.2,23.5C428.225,219.474,427.325,226.774,430.925,232.374z"/></svg>';
        }
        return '<svg viewBox="0 0 478.2 478.2" aria-hidden="true"><path d="M457.575,325.1c9.8-12.5,14.5-25.9,13.9-39.7c-0.6-15.2-7.4-27.1-13-34.4c6.5-16.2,9-41.7-12.7-61.5c-15.9-14.5-42.9-21-80.3-19.2c-26.3,1.2-48.3,6.1-49.2,6.3h-0.1c-5,0.9-10.3,2-15.7,3.2c-0.4-6.4,0.7-22.3,12.5-58.1c14-42.6,13.2-75.2-2.6-97c-16.6-22.9-43.1-24.7-50.9-24.7c-7.5,0-14.4,3.1-19.3,8.8c-11.1,12.9-9.8,36.7-8.4,47.7c-13.2,35.4-50.2,122.2-81.5,146.3c-0.6,0.4-1.1,0.9-1.6,1.4c-9.2,9.7-15.4,20.2-19.6,29.4c-5.9-3.2-12.6-5-19.8-5h-61c-23,0-41.6,18.7-41.6,41.6v162.5c0,23,18.7,41.6,41.6,41.6h61c8.9,0,17.2-2.8,24-7.6l23.5,2.8c3.6,0.5,67.6,8.6,133.3,7.3c11.9,0.9,23.1,1.4,33.5,1.4c17.9,0,33.5-1.4,46.5-4.2c30.6-6.5,51.5-19.5,62.1-38.6c8.1-14.6,8.1-29.1,6.8-38.3c19.9-18,23.4-37.9,22.7-51.9C461.275,337.1,459.475,330.2,457.575,325.1z M48.275,447.3c-8.1,0-14.6-6.6-14.6-14.6V270.1c0-8.1,6.6-14.6,14.6-14.6h61c8.1,0,14.6,6.6,14.6,14.6v162.5c0,8.1-6.6,14.6-14.6,14.6h-61V447.3z M431.975,313.4c-4.2,4.4-5,11.1-1.8,16.3c0,0.1,4.1,7.1,4.6,16.7c0.7,13.1-5.6,24.7-18.8,34.6c-4.7,3.6-6.6,9.8-4.6,15.4c0,0.1,4.3,13.3-2.7,25.8c-6.7,12-21.6,20.6-44.2,25.4c-18.1,3.9-42.7,4.6-72.9,2.2c-0.4,0-0.9,0-1.4,0c-64.3,1.4-129.3-7-130-7.1h-0.1l-10.1-1.2c0.6-2.8,0.9-5.8,0.9-8.8V270.1c0-4.3-0.7-8.5-1.9-12.4c1.8-6.7,6.8-21.6,18.6-34.3c44.9-35.6,88.8-155.7,90.7-160.9c0.8-2.1,1-4.4,0.6-6.7c-1.7-11.2-1.1-24.9,1.3-29c5.3,0.1,19.6,1.6,28.2,13.5c10.2,14.1,9.8,39.3-1.2,72.7c-16.8,50.9-18.2,77.7-4.9,89.5c6.6,5.9,15.4,6.2,21.8,3.9c6.1-1.4,11.9-2.6,17.4-3.5c0.4-0.1,0.9-0.2,1.3-0.3c30.7-6.7,85.7-10.8,104.8,6.6c16.2,14.8,4.7,34.4,3.4,36.5c-3.7,5.6-2.6,12.9,2.4,17.4c0.1,0.1,10.6,10,11.1,23.3C444.875,295.3,440.675,304.4,431.975,313.4z"/></svg>';
    }

    function buildReportSuggestionCardMarkup(item) {
        const safeItem = item || {};
        const preview = getReportSuggestionPreview(safeItem.details, 120);
        const createdLabel = formatReportSuggestionDateTime(safeItem.publishAt || safeItem.createdAt);
        const untilLabel = safeItem.publishUntil ? formatReportSuggestionDateTime(safeItem.publishUntil) : 'Sem limite';
        const upActive = safeItem.viewerVote === 'up' ? ' is-active' : '';
        const downActive = safeItem.viewerVote === 'down' ? ' is-active is-down' : '';
        const voteBusy = Number(reportSuggestionsState.votingId) === Number(safeItem.id);
        const voteDisabled = voteBusy ? ' disabled' : '';

        return [
            `<article class="report-suggestion-card" data-suggestion-id="${safeItem.id}">`,
            '<div class="report-suggestion-card-head">',
            '<div class="report-suggestion-brand-lockup">',
            '<span class="report-suggestion-brand-mark">',
            '<img src="../assets/logo.svg" alt="Octosure" class="report-suggestion-brand-img">',
            '</span>',
            '<div class="report-suggestion-brand-copy">',
            `<div class="report-suggestion-badges"><span class="report-suggestion-kind ${getReportSuggestionTypeClass(safeItem.entryType)}">${escapeHtml(safeItem.entryLabel || 'Sugestao')}</span><span class="report-suggestion-status ${getReportSuggestionStatusClass(safeItem.publicStatus)}">${escapeHtml(safeItem.statusLabel || 'Em votacao')}</span></div>`,
            `<h4 class="report-suggestion-card-title">${escapeHtml(safeItem.title || 'Sem titulo')}</h4>`,
            '</div>',
            '</div>',
            '<div class="report-suggestion-votes report-suggestion-votes--head">',
            `<button type="button" class="report-suggestion-vote-btn${upActive}" data-suggestion-vote="up" data-suggestion-id="${safeItem.id}"${voteDisabled} aria-label="Votar favor"><span class="report-vote-icon">${getReportSuggestionVoteIcon('up')}</span><strong>${escapeHtml(String(Number(safeItem.upvotes) || 0))}</strong></button>`,
            `<button type="button" class="report-suggestion-vote-btn${downActive}" data-suggestion-vote="down" data-suggestion-id="${safeItem.id}"${voteDisabled} aria-label="Votar contra"><span class="report-vote-icon">${getReportSuggestionVoteIcon('down')}</span><strong>${escapeHtml(String(Number(safeItem.downvotes) || 0))}</strong></button>`,
            '</div>',
            '</div>',
            `<p class="report-suggestion-card-text">${escapeHtml(preview || 'Sem detalhes adicionais.')}</p>`,
            '<div class="report-suggestion-card-meta">',
            `<span>${escapeHtml(createdLabel)}</span>`,
            `<span>${escapeHtml(untilLabel)}</span>`,
            '</div>',
            '<div class="report-suggestion-card-footer">',
            `<button type="button" class="report-suggestion-link-btn" data-suggestion-action="details" data-suggestion-id="${safeItem.id}">Ver mais</button>`,
            '</div>',
            '</article>',
        ].join('');
    }

    function buildReportSuggestionsFeedMarkup() {
        if (reportSuggestionsState.loading && !(reportSuggestionsState.items || []).length) {
            return '<div class="report-suggestion-empty">Carregando central de sugestoes...</div>';
        }

        if (reportSuggestionsState.error && !(reportSuggestionsState.items || []).length) {
            return [
                '<div class="report-suggestion-empty is-error">',
                `<strong>${escapeHtml(reportSuggestionsState.error)}</strong>`,
                '<button type="button" class="report-suggestion-link-btn" data-suggestion-action="retry">Tentar novamente</button>',
                '</div>',
            ].join('');
        }

        if (!(reportSuggestionsState.items || []).length) {
            return '<div class="report-suggestion-empty">Nenhuma publicacao aprovada encontrada nesse filtro.</div>';
        }

        return (reportSuggestionsState.items || []).map((item) => buildReportSuggestionCardMarkup(item)).join('');
    }

    function buildReportSuggestionDetailMarkup() {
        const item = getReportSuggestionsCurrentItem();
        if (!item) return '';
        const voteBusy = Number(reportSuggestionsState.votingId) === Number(item.id);
        const voteDisabled = voteBusy ? ' disabled' : '';
        const upActive = item.viewerVote === 'up' ? ' is-active' : '';
        const downActive = item.viewerVote === 'down' ? ' is-active is-down' : '';
        return [
            '<div class="report-suggestion-detail-backdrop" data-suggestion-action="close-detail">',
            '<div class="report-suggestion-detail-card" role="dialog" aria-modal="true" aria-label="Detalhes da publicacao">',
            '<button type="button" class="report-suggestion-detail-close" data-suggestion-action="close-detail">Fechar</button>',
            '<div class="report-suggestion-detail-head">',
            '<div class="report-suggestion-detail-brand">',
            '<img src="../assets/logo.svg" alt="Octosure" class="report-suggestion-detail-logo">',
            '<div class="report-suggestion-detail-copy">',
            `<div class="report-suggestion-badges"><span class="report-suggestion-kind ${getReportSuggestionTypeClass(item.entryType)}">${escapeHtml(item.entryLabel || 'Sugestao')}</span><span class="report-suggestion-status ${getReportSuggestionStatusClass(item.publicStatus)}">${escapeHtml(item.statusLabel || 'Em votacao')}</span></div>`,
            `<h3>${escapeHtml(item.title || 'Sem titulo')}</h3>`,
            `<span>Publicado em ${escapeHtml(formatReportSuggestionDateTime(item.publishAt || item.createdAt))}</span>`,
            '</div>',
            '</div>',
            `<div class="report-suggestion-score"><strong>${escapeHtml(`${item.score > 0 ? '+' : ''}${Number(item.score) || 0}`)}</strong><span>score</span></div>`,
            '</div>',
            `<div class="report-suggestion-detail-body">${formatReportSuggestionText(item.details || 'Sem detalhes adicionais.')}</div>`,
            '<div class="report-suggestion-detail-meta">',
            `<span>Online ate: ${escapeHtml(item.publishUntil ? formatReportSuggestionDateTime(item.publishUntil) : 'Sem data limite')}</span>`,
            `<span>Votos: ${escapeHtml(String(Number(item.upvotes) || 0))} favor / ${escapeHtml(String(Number(item.downvotes) || 0))} contra</span>`,
            '</div>',
            '<div class="report-suggestion-detail-actions">',
            `<button type="button" class="report-suggestion-vote-btn${upActive}" data-suggestion-vote="up" data-suggestion-id="${item.id}"${voteDisabled} aria-label="Votar favor"><span class="report-vote-icon">${getReportSuggestionVoteIcon('up')}</span><strong>${escapeHtml(String(Number(item.upvotes) || 0))}</strong></button>`,
            `<button type="button" class="report-suggestion-vote-btn${downActive}" data-suggestion-vote="down" data-suggestion-id="${item.id}"${voteDisabled} aria-label="Votar contra"><span class="report-vote-icon">${getReportSuggestionVoteIcon('down')}</span><strong>${escapeHtml(String(Number(item.downvotes) || 0))}</strong></button>`,
            '</div>',
            '</div>',
            '</div>',
        ].join('');
    }

    async function handleReportSuggestionCreate(form) {
        if (!(form instanceof HTMLFormElement)) return;
        const formData = new FormData(form);
        const title = String(formData.get('title') || '').trim();
        const details = String(formData.get('details') || '').trim();
        reportSuggestionsState.draftTitle = title;
        reportSuggestionsState.draftDetails = details;

        if (!title) {
            showSystemAlert('Informe um resumo curto para a sugestao.');
            return;
        }
        if (!details) {
            showSystemAlert('Explique melhor a sua sugestao antes de enviar.');
            return;
        }

        reportSuggestionsState.submitting = true;
        renderReportSuggestions();
        try {
            const payload = await reportSuggestionsApiRequest('create.php', {
                method: 'POST',
                body: { title, details },
            });
            reportSuggestionsState.submitting = false;
            reportSuggestionsState.draftTitle = '';
            reportSuggestionsState.draftDetails = '';
            renderReportSuggestions();
            showSystemAlert((payload && payload.message) || 'Sugestao enviada para aprovacao.');
            requestReportSuggestionsRefresh(true);
        } catch (err) {
            reportSuggestionsState.submitting = false;
            renderReportSuggestions();
            showSystemAlert((err && err.message) || 'Nao foi possivel enviar a sugestao.');
        }
    }

    async function handleReportSuggestionVote(suggestionId, voteType) {
        const safeId = Number(suggestionId) || 0;
        const safeVote = String(voteType || '').trim().toLowerCase();
        if (!safeId || !['up', 'down'].includes(safeVote)) return;
        if (!reportSuggestionsState.viewer || !reportSuggestionsState.viewer.id) {
            showSystemAlert('Sua sessao precisa estar valida para votar nas publicacoes.');
            return;
        }

        reportSuggestionsState.votingId = safeId;
        renderReportSuggestions();
        try {
            const payload = await reportSuggestionsApiRequest('vote.php', {
                method: 'POST',
                body: {
                    suggestionId: safeId,
                    voteType: safeVote,
                },
            });
            updateReportSuggestionItemSummary(safeId, payload && payload.summary ? payload.summary : null);
            reportSuggestionsState.error = '';
        } catch (err) {
            showSystemAlert((err && err.message) || 'Nao foi possivel registrar o voto.');
        } finally {
            reportSuggestionsState.votingId = 0;
            renderReportSuggestions();
        }
    }

    function bindReportSuggestionsInteractions() {
        if (!reportSuggestions) return;

        reportSuggestions.addEventListener('input', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
            if (target.name === 'title') {
                reportSuggestionsState.draftTitle = target.value;
            } else if (target.name === 'details') {
                reportSuggestionsState.draftDetails = target.value;
            }
        });

        reportSuggestions.addEventListener('submit', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLFormElement)) return;
            if (target.getAttribute('data-suggestion-form') !== 'create') return;
            event.preventDefault();
            handleReportSuggestionCreate(target);
        });

        reportSuggestions.addEventListener('click', (event) => {
            const voteButton = event.target && typeof event.target.closest === 'function'
                ? event.target.closest('[data-suggestion-vote]')
                : null;
            if (voteButton) {
                event.preventDefault();
                handleReportSuggestionVote(voteButton.getAttribute('data-suggestion-id'), voteButton.getAttribute('data-suggestion-vote'));
                return;
            }

            const filterButton = event.target && typeof event.target.closest === 'function'
                ? event.target.closest('[data-suggestion-filter-group]')
                : null;
            if (filterButton) {
                event.preventDefault();
                const group = String(filterButton.getAttribute('data-suggestion-filter-group') || '').trim();
                const value = String(filterButton.getAttribute('data-suggestion-filter-value') || '').trim();
                if (group === 'type') reportSuggestionsState.typeFilter = value || 'all';
                if (group === 'status') reportSuggestionsState.statusFilter = value || 'all';
                if (group === 'sort') reportSuggestionsState.sort = value || 'votes';
                requestReportSuggestionsRefresh(true);
                return;
            }

            const actionButton = event.target && typeof event.target.closest === 'function'
                ? event.target.closest('[data-suggestion-action]')
                : null;
            if (!actionButton) return;

            event.preventDefault();
            const action = String(actionButton.getAttribute('data-suggestion-action') || '').trim();
            if (action === 'retry') {
                requestReportSuggestionsRefresh(true);
                return;
            }
            if (action === 'details') {
                reportSuggestionsState.detailId = Number(actionButton.getAttribute('data-suggestion-id')) || 0;
                renderReportSuggestions();
                return;
            }
            if (action === 'close-detail') {
                reportSuggestionsState.detailId = 0;
                renderReportSuggestions();
            }
        });
    }

    function renderReportAnalysisViews(records, range, gastos) {
        renderReportAnalysisGlobal(records, range);
        renderReportAnalysisIndividual();
    }

    function renderReportDashboard() {
        const range = getReportDashboardRange();
        const records = planilhaRegistros
            .filter((record) => {
                const ms = getPlanilhaRecordMs(record);
                if (!Number.isFinite(ms)) return false;
                if (reportDashboardMode === 'live' && !record.isLive) return false;
                if (reportDashboardMode === 'pre-live' && record.isLive) return false;
                if (Number.isFinite(range.startMs) && ms < range.startMs) return false;
                if (Number.isFinite(range.endMs) && ms > range.endMs) return false;
                return true;
            })
            .slice()
            .sort((a, b) => (getPlanilhaRecordMs(a) || 0) - (getPlanilhaRecordMs(b) || 0));
        const gastos = loadPlanilhaGastos().filter((gasto) => {
            const ms = getPlanilhaGastoMs(gasto);
            if (!Number.isFinite(ms)) return false;
            if (Number.isFinite(range.startMs) && ms < range.startMs) return false;
            if (Number.isFinite(range.endMs) && ms > range.endMs) return false;
            return true;
        });

        let totalProfit = 0;
        let totalRoi = 0;
        let roiCount = 0;
        const dailyProfitMap = new Map();
        const weekdayTotals = Array.from({ length: 7 }, () => 0);
        const hourTotals = Array.from({ length: 24 }, () => 0);

        records.forEach((record) => {
            const metrics = computePlanilhaMetrics(record);
            const ms = getPlanilhaRecordMs(record);
            if (!Number.isFinite(ms)) return;
            const lucro = Number.isFinite(metrics.lucroMinimo) ? metrics.lucroMinimo : 0;
            totalProfit += lucro;
            if (Number.isFinite(metrics.roiMinimo)) {
                totalRoi += metrics.roiMinimo;
                roiCount += 1;
            }
            const dayKey = toLocalDateKey(ms);
            dailyProfitMap.set(dayKey, (dailyProfitMap.get(dayKey) || 0) + lucro);
            const dt = new Date(ms);
            weekdayTotals[dt.getDay()] += lucro;
            hourTotals[dt.getHours()] += lucro;
        });

        const totalExpenses = gastos.reduce((sum, gasto) => sum + toPlanilhaNumber(gasto.valor), 0);
        const averageProfit = records.length ? totalProfit / records.length : 0;
        const averageRoi = roiCount ? totalRoi / roiCount : 0;
        const finalBalance = totalProfit - totalExpenses;

        if (reportMetricPeriodProfit) reportMetricPeriodProfit.textContent = formatCurrencyBRL(totalProfit);
        if (reportMetricAverageProfit) reportMetricAverageProfit.textContent = formatCurrencyBRL(averageProfit);
        if (reportMetricAverageRoi) reportMetricAverageRoi.textContent = Number.isFinite(averageRoi) ? `${averageRoi.toFixed(2)}%` : '0,00%';
        if (reportMetricEntries) reportMetricEntries.textContent = String(records.length);
        if (reportMetricExpenses) reportMetricExpenses.textContent = formatCurrencyBRL(totalExpenses);
        if (reportMetricFinalBalance) reportMetricFinalBalance.textContent = formatCurrencyBRL(finalBalance);
        renderReportAnalysisViews(records, range, gastos);

        if (!records.length) {
            if (reportChartCumulativeMeta) reportChartCumulativeMeta.textContent = '0 pontos';
            if (reportChartDailyMeta) reportChartDailyMeta.textContent = '0 dias';
            renderReportEmptyChart(reportChartCumulative, 'Ainda nao existem surebets registradas nesse recorte.');
            renderReportEmptyChart(reportChartDaily, 'Sem lucro diario para desenhar neste periodo.');
            renderReportEmptyChart(reportChartWeekday, 'Sem distribuicao por dia da semana neste recorte.');
            renderReportEmptyChart(reportChartHour, 'Sem distribuicao por hora neste recorte.');
            return;
        }

        const dateKeys = buildReportDateKeys(range.startMs, range.endMs);
        const effectiveKeys = dateKeys.length ? dateKeys : Array.from(dailyProfitMap.keys()).sort();
        let cumulativeValue = 0;
        const cumulativeItems = effectiveKeys.map((key) => {
            cumulativeValue += dailyProfitMap.get(key) || 0;
            return { label: formatReportDayLabel(key), value: cumulativeValue };
        });
        const dailyItems = effectiveKeys.map((key) => ({
            label: formatReportDayLabel(key),
            value: dailyProfitMap.get(key) || 0,
        }));
        const weekdayItems = REPORT_DASHBOARD_WEEKDAY_LABELS.map((label, index) => ({
            label,
            value: weekdayTotals[index] || 0,
        }));
        const hourItems = Array.from({ length: 24 }, (_, hour) => ({
            label: `${String(hour).padStart(2, '0')}h`,
            value: hourTotals[hour] || 0,
        }));

        if (reportChartCumulativeMeta) {
            reportChartCumulativeMeta.textContent = `${cumulativeItems.length} pontos | saldo ${formatReportCurrencyCompact(finalBalance)}`;
        }
        if (reportChartDailyMeta) {
            const activeDays = dailyItems.filter((item) => Math.abs(item.value) > 0.0001).length;
            reportChartDailyMeta.textContent = `${activeDays} dias com movimento`;
        }

        if (reportChartCumulative) reportChartCumulative.innerHTML = buildReportLineChartMarkup(cumulativeItems, { valueFormatter: (value) => formatCurrencyBRL(value), tooltipMeta: 'Lucro acumulado' });
        if (reportChartDaily) reportChartDaily.innerHTML = buildReportBarChartMarkup(dailyItems, { valueFormatter: (value) => formatCurrencyBRL(value), tooltipMeta: 'Lucro diario' });
        if (reportChartWeekday) reportChartWeekday.innerHTML = buildReportBarChartMarkup(weekdayItems, { valueFormatter: (value) => formatCurrencyBRL(value), tooltipMeta: 'Lucro por dia' });
        if (reportChartHour) reportChartHour.innerHTML = buildReportBarChartMarkup(hourItems, { valueFormatter: (value) => formatCurrencyBRL(value), tooltipMeta: 'Lucro por hora' });
    }

    function showPlanilhaModal(modalEl, show = true) {
        if (!modalEl) return;
        modalEl.classList.toggle('hidden', !show);
    }

    function toDateInputValue(source) {
        const ms = parseDateToMs(source) ?? Date.now();
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function toDatetimeLocalValue(source) {
        const ms = parseDateToMs(source) ?? Date.now();
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day}T${hh}:${mm}`;
    }

    function parseDateInputToPtBr(dateValue, fallbackIso) {
        const txt = String(dateValue || '').trim();
        if (!txt) return formatPlanilhaDateTime(fallbackIso || new Date().toISOString());
        const dateOnly = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnly) {
            const iso = `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00`;
            return formatPlanilhaDateTime(iso);
        }
        const dateTime = txt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
        if (!dateTime) return formatPlanilhaDateTime(fallbackIso || new Date().toISOString());
        const iso = `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}T${dateTime[4]}:${dateTime[5]}:00`;
        return formatPlanilhaDateTime(iso);
    }

    function uniqueSortedOptions(values) {
        const map = new Map();
        (values || []).forEach((value) => {
            const txt = String(value || '').trim();
            if (!txt || txt === '-') return;
            const key = txt.toLowerCase();
            if (!map.has(key)) map.set(key, txt);
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    function setDatalistOptions(listEl, options) {
        if (!listEl) return;
        const safe = Array.isArray(options) ? options : [];
        listEl.innerHTML = safe
            .map((opt) => `<option value="${escapeHtml(opt)}"></option>`)
            .join('');
    }

    function getManualApostaHouseOptions() {
        const base = [];
        base.push(...PLANILHA_KNOWN_HOUSES);
        base.push(...(preFilterState.houseOptions || []));
        base.push(...(liveFilterState.houseOptions || []));
        arbsBuffer.forEach(({ arb }) => {
            if (!arb || typeof arb !== 'object') return;
            const b1 = arb.bet1 || {};
            const b2 = arb.bet2 || {};
            if (b1.bookmaker) base.push(String(b1.bookmaker));
            if (b2.bookmaker) base.push(String(b2.bookmaker));
        });
        planilhaRegistros.forEach((record) => {
            if (record && record.house1) base.push(String(record.house1));
            if (record && record.house2) base.push(String(record.house2));
        });
        return uniqueSortedOptions(base);
    }

    function getManualApostaSportOptions() {
        const base = [];
        base.push(...(preFilterState.sportOptions || []));
        base.push(...(liveFilterState.sportOptions || []));
        arbsBuffer.forEach(({ arb }) => {
            const sport = resolveArbSportName(arb || {});
            if (sport) base.push(String(sport));
        });
        planilhaRegistros.forEach((record) => {
            if (record && record.sport) base.push(String(record.sport));
        });
        return uniqueSortedOptions(base);
    }

    function syncManualApostaSuggestions() {
        setDatalistOptions(planilhaApostaCasasList, getManualApostaHouseOptions());
        setDatalistOptions(planilhaApostaEsportesList, getManualApostaSportOptions());
    }

    function openPlanilhaGastoModal() {
        if (planilhaGastoDescricao) planilhaGastoDescricao.value = '';
        if (planilhaGastoData) planilhaGastoData.value = toDateInputValue(new Date().toISOString());
        if (planilhaGastoValor) planilhaGastoValor.value = '';
        showPlanilhaModal(planilhaGastoModal, true);
        if (planilhaGastoDescricao) {
            try { planilhaGastoDescricao.focus(); } catch (_) {}
        }
    }

    function closePlanilhaGastoModal() {
        showPlanilhaModal(planilhaGastoModal, false);
    }

    function savePlanilhaGastoManual() {
        const descricao = String(planilhaGastoDescricao && planilhaGastoDescricao.value || '').trim();
        const dataValue = String(planilhaGastoData && planilhaGastoData.value || '').trim();
        const valor = toPlanilhaNumber(planilhaGastoValor && planilhaGastoValor.value);
        if (!descricao) {
            showSystemAlert('Informe a descricao do gasto.');
            return;
        }
        if (!dataValue) {
            showSystemAlert('Informe a data do gasto.');
            return;
        }
        if (!(valor > 0)) {
            showSystemAlert('Informe um valor de gasto maior que zero.');
            return;
        }
        const gasto = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            descricao,
            data: dataValue,
            valor,
            createdAt: new Date().toISOString(),
        };
        try {
            const key = getPlanilhaGastosStorageKey();
            const raw = localStorage.getItem(key);
            const prev = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(prev) ? prev : [];
            list.unshift(gasto);
            localStorage.setItem(key, JSON.stringify(list));
        } catch (_) {}
        closePlanilhaGastoModal();
        renderPlanilhaTable();
        showSystemAlert('Gasto registrado com sucesso.');
    }

    function openPlanilhaApostaModal() {
        syncManualApostaSuggestions();
        if (planilhaApostaEsporte) planilhaApostaEsporte.value = '';
        if (planilhaApostaLiga) planilhaApostaLiga.value = '';
        if (planilhaApostaTipo) planilhaApostaTipo.value = (activeSubtab === 'live') ? 'live' : 'pre-live';
        if (planilhaApostaData1) planilhaApostaData1.value = '';
        if (planilhaApostaCasa1) planilhaApostaCasa1.value = '';
        if (planilhaApostaEvento) planilhaApostaEvento.value = '';
        if (planilhaApostaMercado1) planilhaApostaMercado1.value = '';
        if (planilhaApostaOdd1) planilhaApostaOdd1.value = '';
        if (planilhaApostaStake1) planilhaApostaStake1.value = '';
        if (planilhaApostaData2) planilhaApostaData2.value = '';
        if (planilhaApostaCasa2) planilhaApostaCasa2.value = '';
        if (planilhaApostaEvento2) planilhaApostaEvento2.value = '';
        if (planilhaApostaMercado2) planilhaApostaMercado2.value = '';
        if (planilhaApostaOdd2) planilhaApostaOdd2.value = '';
        if (planilhaApostaStake2) planilhaApostaStake2.value = '';

        showPlanilhaModal(planilhaApostaModal, true);
        if (planilhaApostaEsporte) {
            try { planilhaApostaEsporte.focus(); } catch (_) {}
        }
    }

    function closePlanilhaApostaModal() {
        showPlanilhaModal(planilhaApostaModal, false);
    }

    function savePlanilhaApostaManual() {
        const esporte = String(planilhaApostaEsporte && planilhaApostaEsporte.value || '').trim();
        const evento1 = String(planilhaApostaEvento && planilhaApostaEvento.value || '').trim();
        const evento2 = String(planilhaApostaEvento2 && planilhaApostaEvento2.value || '').trim();
        const evento = evento1 || evento2;
        const casa1 = String(planilhaApostaCasa1 && planilhaApostaCasa1.value || '').trim();
        const casa2 = String(planilhaApostaCasa2 && planilhaApostaCasa2.value || '').trim();
        const mercado1 = String(planilhaApostaMercado1 && planilhaApostaMercado1.value || '').trim();
        const mercado2 = String(planilhaApostaMercado2 && planilhaApostaMercado2.value || '').trim();
        const odd1 = toPlanilhaNumber(planilhaApostaOdd1 && planilhaApostaOdd1.value);
        const odd2 = toPlanilhaNumber(planilhaApostaOdd2 && planilhaApostaOdd2.value);
        const stake1 = toPlanilhaNumber(planilhaApostaStake1 && planilhaApostaStake1.value);
        const stake2 = toPlanilhaNumber(planilhaApostaStake2 && planilhaApostaStake2.value);
        const date1 = String(planilhaApostaData1 && planilhaApostaData1.value || '').trim();
        const date2 = String(planilhaApostaData2 && planilhaApostaData2.value || '').trim();
        const tipo = String(planilhaApostaTipo && planilhaApostaTipo.value || '').trim().toLowerCase();

        if (!esporte) return showSystemAlert('Informe o esporte.');
        if (!evento) return showSystemAlert('Informe o evento.');
        if (!casa1 || !casa2) return showSystemAlert('Informe as duas casas.');
        if (!(odd1 > 0) || !(odd2 > 0)) return showSystemAlert('Informe odds validas para as duas casas.');
        if (!(stake1 > 0) || !(stake2 > 0)) return showSystemAlert('Informe stake valida para as duas casas.');

        const record = hydratePlanilhaRecord({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            eventDate: parseDateInputToPtBr(date1 || date2, new Date().toISOString()),
            sport: esporte,
            event,
            house1: casa1,
            market1: mercado1 || '-',
            odd1,
            stake1,
            status1: PLANILHA_STATUS_OPTIONS[0],
            house2: casa2,
            market2: mercado2 || '-',
            odd2,
            stake2,
            status2: PLANILHA_STATUS_OPTIONS[0],
            url1: '',
            url2: '',
            createdAt: new Date().toISOString(),
            isLive: tipo === 'live',
            editing: false,
        });
        if (!record) return showSystemAlert('Nao foi possivel salvar a aposta manual.');
        planilhaRegistros.unshift(record);
        savePlanilhaRegistros();
        renderPlanilhaTable();
        closePlanilhaApostaModal();
        showSystemAlert('Aposta manual registrada com sucesso.');
    }

    function formatPlanilhaRegisteredAt(value) {
        const raw = value == null ? '' : String(value).trim();
        if (!raw) return '-';
        const parsed = Date.parse(raw);
        if (!Number.isFinite(parsed)) return raw;
        const dt = new Date(parsed);
        try {
            const date = dt.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `${date} - ${time}`;
        } catch (_) {
            return raw;
        }
    }

    function getPlanilhaStatusClass(status) {
        const txt = sanitizePlanilhaStatus(status).toLowerCase();
        if (txt === 'pendente') return 'status-pendente';
        if (txt === 'green') return 'status-green';
        if (txt === 'meio green') return 'status-meio-green';
        if (txt === 'red') return 'status-red';
        if (txt === 'meio red') return 'status-meio-red';
        if (txt === 'devolvido') return 'status-devolvido';
        if (txt === 'cashout') return 'status-cashout';
        return 'status-pendente';
    }

    function applyPlanilhaStatusSelectClass(selectEl, status) {
        if (!selectEl) return;
        selectEl.classList.remove(
            'status-pendente',
            'status-green',
            'status-meio-green',
            'status-red',
            'status-meio-red',
            'status-devolvido',
            'status-cashout'
        );
        selectEl.classList.add(getPlanilhaStatusClass(status));
    }

    function getPlanilhaSportToneClass(sportName) {
        const tone = getSportToneClass(sportName || '');
        return tone.replace('sport-tone-', 'planilha-tone-');
    }

    function getFilteredPlanilhaRegistros() {
        const needle = String(planilhaSearchTerm || '').trim().toLowerCase();
        const isPendente = (value) => sanitizePlanilhaStatus(value).toLowerCase() === 'pendente';
        const startMs = parseDateInputValueToMs(planilhaDateFilterStart, false);
        const endMs = parseDateInputValueToMs(planilhaDateFilterEnd, true);
        const hasCustomRange = Number.isFinite(startMs) || Number.isFinite(endMs);
        return planilhaRegistros.filter((record) => {
            const period = getPlanilhaRecordPeriod(record);
            const recordMs = getPlanilhaRecordMs(record);
            if (hasCustomRange) {
                if (Number.isFinite(startMs) && (!Number.isFinite(recordMs) || recordMs < startMs)) return false;
                if (Number.isFinite(endMs) && (!Number.isFinite(recordMs) || recordMs > endMs)) return false;
            } else {
                if (planilhaSelectedYear && (!period || period.year !== planilhaSelectedYear)) return false;
                if (planilhaSelectedMonth && (!period || period.month !== planilhaSelectedMonth)) return false;
            }

            if (planilhaFilterMode === 'live' && !record.isLive) return false;
            if (planilhaFilterMode === 'pre-live' && record.isLive) return false;
            if (planilhaFilterMode === 'pendentes') {
                if (!isPendente(record.status1) && !isPendente(record.status2)) return false;
            }
            if (!needle) return true;

            const haystack = [
                record.sport,
                record.event,
                record.house1,
                record.house2,
                record.market1,
                record.market2,
                record.status1,
                record.status2,
            ].map((v) => String(v || '').toLowerCase()).join(' ');

            return haystack.includes(needle);
        });
    }

    function updatePlanilhaFilterButtons() {
        if (!planilhaFilterButtons || !planilhaFilterButtons.length) return;
        planilhaFilterButtons.forEach((btn) => {
            const mode = (btn.dataset.planilhaFilterMode || '').trim().toLowerCase();
            btn.classList.toggle('is-active', mode === planilhaFilterMode);
        });
    }

    function getPlanilhaPeriodsMap() {
        const byYear = new Map();
        planilhaRegistros.forEach((record) => {
            const period = getPlanilhaRecordPeriod(record);
            if (!period) return;
            if (!byYear.has(period.year)) byYear.set(period.year, new Set());
            byYear.get(period.year).add(period.month);
        });
        return byYear;
    }

    function fillSelectOptions(selectEl, items, selectedValue) {
        if (!selectEl) return;
        const safeItems = Array.isArray(items) ? items : [];
        const html = safeItems.map((item) => {
            const value = String(item.value || '');
            const label = String(item.label || value);
            const selected = value === selectedValue ? ' selected' : '';
            return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
        }).join('');
        selectEl.innerHTML = html;
        if (selectedValue) selectEl.value = selectedValue;
    }

    function syncPlanilhaPeriodOptions() {
        const periodsMap = getPlanilhaPeriodsMap();
        let years = Array.from(periodsMap.keys()).sort((a, b) => Number(b) - Number(a));

        if (!years.length) {
            const now = new Date();
            const year = String(now.getFullYear());
            const month = String(now.getMonth() + 1).padStart(2, '0');
            years = [year];
            periodsMap.set(year, new Set([month]));
        }

        if (!planilhaSelectedYear || !periodsMap.has(planilhaSelectedYear)) {
            planilhaSelectedYear = years[0];
        }

        let months = Array.from(periodsMap.get(planilhaSelectedYear) || []).sort((a, b) => Number(b) - Number(a));
        if (!months.length) {
            const nowMonth = String(new Date().getMonth() + 1).padStart(2, '0');
            months = [nowMonth];
        }
        if (!planilhaSelectedMonth || !months.includes(planilhaSelectedMonth)) {
            planilhaSelectedMonth = months[0];
        }

        fillSelectOptions(
            planilhaPeriodYear,
            years.map((year) => ({ value: year, label: year })),
            planilhaSelectedYear
        );
        fillSelectOptions(
            planilhaPeriodMonth,
            months.map((month) => ({ value: month, label: PLANILHA_MONTH_LABELS[month] || month })),
            planilhaSelectedMonth
        );
    }

    function toPlanilhaNumber(value) {
        const parsed = parseNumber(value, 0);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return parsed;
    }

    function formatPlanilhaDateTime(value) {
        const raw = value == null ? '' : String(value).trim();
        if (!raw) return '';
        const parsed = Date.parse(raw);
        if (!Number.isFinite(parsed)) return raw;
        const d = new Date(parsed);
        try {
            return d.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch (_) {
            return raw;
        }
    }

    function computePlanilhaMetrics(record) {
        const odd1 = toPlanilhaNumber(record.odd1);
        const odd2 = toPlanilhaNumber(record.odd2);
        const stake1 = toPlanilhaNumber(record.stake1);
        const stake2 = toPlanilhaNumber(record.stake2);
        const total = stake1 + stake2;

        const lucro1 = (odd1 > 0 && stake1 > 0) ? ((odd1 * stake1) - total) : Number.NaN;
        const lucro2 = (odd2 > 0 && stake2 > 0) ? ((odd2 * stake2) - total) : Number.NaN;
        const pct1 = (total > 0 && Number.isFinite(lucro1)) ? ((lucro1 / total) * 100) : Number.NaN;
        const pct2 = (total > 0 && Number.isFinite(lucro2)) ? ((lucro2 / total) * 100) : Number.NaN;
        const lucroMinimo = Number.isFinite(lucro1) && Number.isFinite(lucro2)
            ? Math.min(lucro1, lucro2)
            : Number.NaN;
        const roiMinimo = (total > 0 && Number.isFinite(lucroMinimo))
            ? ((lucroMinimo / total) * 100)
            : Number.NaN;

        return {
            odd1,
            odd2,
            stake1,
            stake2,
            total,
            lucro1,
            lucro2,
            pct1,
            pct2,
            lucroMinimo,
            roiMinimo,
        };
    }

    function formatPlanilhaPercent(value) {
        if (!Number.isFinite(value)) return '-';
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }

    function hydratePlanilhaRecord(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const record = {
            id: String(raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
            eventDate: String(raw.eventDate || ''),
            sport: String(raw.sport || ''),
            event: String(raw.event || ''),
            house1: String(raw.house1 || ''),
            market1: String(raw.market1 || ''),
            odd1: toPlanilhaNumber(raw.odd1),
            stake1: toPlanilhaNumber(raw.stake1),
            status1: sanitizePlanilhaStatus(raw.status1),
            house2: String(raw.house2 || ''),
            market2: String(raw.market2 || ''),
            odd2: toPlanilhaNumber(raw.odd2),
            stake2: toPlanilhaNumber(raw.stake2),
            status2: sanitizePlanilhaStatus(raw.status2),
            url1: normalizeBetLink(raw.url1 || ''),
            url2: normalizeBetLink(raw.url2 || ''),
            createdAt: String(raw.createdAt || new Date().toISOString()),
            isLive: parsePlanilhaBool(raw.isLive),
        };

        const metrics = computePlanilhaMetrics(record);
        record.odd1 = metrics.odd1;
        record.odd2 = metrics.odd2;
        record.stake1 = metrics.stake1;
        record.stake2 = metrics.stake2;
        record.pct1 = Number.isFinite(metrics.pct1) ? metrics.pct1 : Number.NaN;
        record.pct2 = Number.isFinite(metrics.pct2) ? metrics.pct2 : Number.NaN;
        return record;
    }

    function savePlanilhaRegistros() {
        try {
            const keys = getPlanilhaStorageKeys();
            localStorage.setItem(keys.scopedMain, JSON.stringify(planilhaRegistros));
        } catch (_) {}
    }

    function loadPlanilhaRegistros() {
        let parsed = [];
        try {
            const keys = getPlanilhaStorageKeys();
            const candidates = [
                keys.scopedMain,
                keys.scopedLegacy,
            ];
            for (const key of candidates) {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const maybe = JSON.parse(raw);
                if (Array.isArray(maybe)) {
                    parsed = maybe;
                    if (key === keys.scopedLegacy) {
                        try {
                            localStorage.setItem(keys.scopedMain, raw);
                        } catch (_) {}
                    }
                    break;
                }
            }
        } catch (_) {}
        planilhaRegistros = parsed.map((item) => hydratePlanilhaRecord(item)).filter(Boolean);
        syncPlanilhaPeriodOptions();
    }

    function buildPlanilhaStatusOptions(selectedValue) {
        const selected = sanitizePlanilhaStatus(selectedValue);
        return PLANILHA_STATUS_OPTIONS.map((status) => {
            const selectedAttr = status === selected ? ' selected' : '';
            return `<option value="${escapeHtml(status)}"${selectedAttr}>${escapeHtml(status)}</option>`;
        }).join('');
    }

    function updatePlanilhaSummary(records = planilhaRegistros) {
        const source = Array.isArray(records) ? records : [];
        const total = source.length;
        let sumLucroMin = 0;
        let sumRoiMin = 0;
        let roiCount = 0;
        const startMs = parseDateInputValueToMs(planilhaDateFilterStart, false);
        const endMs = parseDateInputValueToMs(planilhaDateFilterEnd, true);
        const hasCustomRange = Number.isFinite(startMs) || Number.isFinite(endMs);

        source.forEach((record) => {
            const metrics = computePlanilhaMetrics(record);
            if (Number.isFinite(metrics.lucroMinimo)) {
                sumLucroMin += metrics.lucroMinimo;
            }
            if (Number.isFinite(metrics.roiMinimo)) {
                sumRoiMin += metrics.roiMinimo;
                roiCount += 1;
            }
            record.pct1 = Number.isFinite(metrics.pct1) ? metrics.pct1 : Number.NaN;
            record.pct2 = Number.isFinite(metrics.pct2) ? metrics.pct2 : Number.NaN;
        });

        const roiMedio = roiCount > 0 ? (sumRoiMin / roiCount) : Number.NaN;
        const totalGastos = loadPlanilhaGastos().reduce((sum, gasto) => {
            const ms = getPlanilhaGastoMs(gasto);
            if (!Number.isFinite(ms)) return sum;
            if (hasCustomRange) {
                if (Number.isFinite(startMs) && ms < startMs) return sum;
                if (Number.isFinite(endMs) && ms > endMs) return sum;
            } else {
                const dt = new Date(ms);
                const year = String(dt.getFullYear());
                const month = String(dt.getMonth() + 1).padStart(2, '0');
                if (planilhaSelectedYear && year !== planilhaSelectedYear) return sum;
                if (planilhaSelectedMonth && month !== planilhaSelectedMonth) return sum;
            }
            return sum + toPlanilhaNumber(gasto.valor);
        }, 0);
        const saldoFinal = sumLucroMin - totalGastos;

        if (planilhaTotalRegistros) planilhaTotalRegistros.textContent = String(total);
        if (planilhaLucroMin) planilhaLucroMin.textContent = formatCurrencyBRL(sumLucroMin);
        if (planilhaRoiMedio) planilhaRoiMedio.textContent = Number.isFinite(roiMedio) ? `${roiMedio.toFixed(2)}%` : '0,00%';
        if (planilhaTotalGastos) planilhaTotalGastos.textContent = formatCurrencyBRL(totalGastos);
        if (planilhaSaldoFinal) planilhaSaldoFinal.textContent = formatCurrencyBRL(saldoFinal);
        renderReportDashboard();
    }

    function updatePlanilhaRowComputed(row, record) {
        if (!row || !record) return;
        const metrics = computePlanilhaMetrics(record);
        record.odd1 = metrics.odd1;
        record.odd2 = metrics.odd2;
        record.stake1 = metrics.stake1;
        record.stake2 = metrics.stake2;
        record.pct1 = Number.isFinite(metrics.pct1) ? metrics.pct1 : Number.NaN;
        record.pct2 = Number.isFinite(metrics.pct2) ? metrics.pct2 : Number.NaN;

        const pct1Input = row.querySelector('input[data-computed="pct1"]');
        const pct2Input = row.querySelector('input[data-computed="pct2"]');
        if (pct1Input) {
            pct1Input.value = formatPlanilhaPercent(record.pct1);
            pct1Input.classList.remove('pct-positive', 'pct-negative', 'pct-neutral');
            if (!Number.isFinite(record.pct1)) pct1Input.classList.add('pct-neutral');
            else if (record.pct1 >= 0) pct1Input.classList.add('pct-positive');
            else pct1Input.classList.add('pct-negative');
        }
        if (pct2Input) {
            pct2Input.value = formatPlanilhaPercent(record.pct2);
            pct2Input.classList.remove('pct-positive', 'pct-negative', 'pct-neutral');
            if (!Number.isFinite(record.pct2)) pct2Input.classList.add('pct-neutral');
            else if (record.pct2 >= 0) pct2Input.classList.add('pct-positive');
            else pct2Input.classList.add('pct-negative');
        }
    }

    function findPlanilhaRecordById(id) {
        if (!id) return null;
        return planilhaRegistros.find((item) => item.id === id) || null;
    }

    function renderPlanilhaTable() {
        if (!planilhaTableBody) return;
        syncPlanilhaPeriodOptions();
        updatePlanilhaDateFilterButtonState();
        const visibleRecords = getFilteredPlanilhaRegistros();
        if (!visibleRecords.length) {
            planilhaTableBody.innerHTML = '<div class="planilha-empty">Nenhum registro planilhado com os filtros atuais.</div>';
            updatePlanilhaSummary(visibleRecords);
            return;
        }

        const rows = visibleRecords.map((record) => {
            const isEditing = !!record.editing;
            const lockAttrs = isEditing ? '' : ' readonly';
            const lockClass = isEditing ? '' : ' locked';
            const editLabel = isEditing ? 'Salvar' : '✎ Editar';
            const toneClass = getPlanilhaSportToneClass(record.sport || '');
            const status1Class = getPlanilhaStatusClass(record.status1);
            const status2Class = getPlanilhaStatusClass(record.status2);
            const liveClass = record.isLive ? 'is-live' : 'is-prelive';
            const liveText = record.isLive ? 'LIVE' : 'PRE-LIVE';
            const registeredAt = escapeHtml(formatPlanilhaRegisteredAt(record.createdAt || record.eventDate));

            const eventDate = escapeHtml(record.eventDate || '');
            const sport = escapeHtml(record.sport || '');
            const event = escapeHtml(record.event || '');
            const house1 = escapeHtml(record.house1 || '');
            const market1 = escapeHtml(record.market1 || '');
            const odd1 = Number.isFinite(record.odd1) ? record.odd1.toFixed(2) : '0.00';
            const stake1 = Number.isFinite(record.stake1) ? record.stake1.toFixed(2) : '0.00';
            const pct1 = formatPlanilhaPercent(record.pct1);
            const house2 = escapeHtml(record.house2 || '');
            const market2 = escapeHtml(record.market2 || '');
            const odd2 = Number.isFinite(record.odd2) ? record.odd2.toFixed(2) : '0.00';
            const stake2 = Number.isFinite(record.stake2) ? record.stake2.toFixed(2) : '0.00';
            const pct2 = formatPlanilhaPercent(record.pct2);
            const pct1Class = !Number.isFinite(record.pct1) ? 'pct-neutral' : (record.pct1 >= 0 ? 'pct-positive' : 'pct-negative');
            const pct2Class = !Number.isFinite(record.pct2) ? 'pct-neutral' : (record.pct2 >= 0 ? 'pct-positive' : 'pct-negative');

            return [
                `<article class="planilha-card ${toneClass}" data-planilha-id="${escapeHtml(record.id)}">`,
                '<div class="planilha-card-head">',
                '<div class="planilha-card-meta">',
                `<input class="planilha-input planilha-sport-input${lockClass}" data-field="sport" value="${sport}" title="${sport}"${lockAttrs} />`,
                `<span class="planilha-meta-text">Registrado em: ${registeredAt}</span>`,
                `<span class="planilha-live-badge ${liveClass}">${liveText}</span>`,
                '</div>',
                '<div class="planilha-card-actions">',
                `<button type="button" class="planilha-edit-btn" data-action="toggle-edit">${escapeHtml(editLabel)}</button>`,
                '<button type="button" class="planilha-open-btn" data-action="open1">Abrir 1</button>',
                '<button type="button" class="planilha-open-btn" data-action="open2">Abrir 2</button>',
                '<button type="button" class="planilha-remove-btn" data-action="remove">Excluir</button>',
                '</div>',
                '</div>',
                '<div class="planilha-card-table">',
                '<div class="planilha-card-grid planilha-card-grid-head">',
                '<span>Data do Evento</span>',
                '<span>Casa</span>',
                '<span>Evento</span>',
                '<span>Mercado</span>',
                '<span>Odd</span>',
                '<span>Stake</span>',
                '<span>%</span>',
                '<span>Status</span>',
                '</div>',
                '<div class="planilha-card-grid planilha-card-grid-row">',
                `<input class="planilha-input${lockClass}" data-field="eventDate" value="${eventDate}" title="${eventDate}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="house1" value="${house1}" title="${house1}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="event" value="${event}" title="${event}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="market1" value="${market1}" title="${market1}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="odd1" value="${odd1}" title="${odd1}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="stake1" value="${stake1}" title="${stake1}"${lockAttrs} />`,
                `<input class="planilha-input readonly ${pct1Class}" data-computed="pct1" value="${escapeHtml(pct1)}" readonly />`,
                `<select class="planilha-select planilha-status-select ${status1Class}" data-field="status1">${buildPlanilhaStatusOptions(record.status1)}</select>`,
                '</div>',
                '<div class="planilha-card-grid planilha-card-grid-row">',
                `<input class="planilha-input${lockClass}" data-field="eventDate" value="${eventDate}" title="${eventDate}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="house2" value="${house2}" title="${house2}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="event" value="${event}" title="${event}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="market2" value="${market2}" title="${market2}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="odd2" value="${odd2}" title="${odd2}"${lockAttrs} />`,
                `<input class="planilha-input${lockClass}" data-field="stake2" value="${stake2}" title="${stake2}"${lockAttrs} />`,
                `<input class="planilha-input readonly ${pct2Class}" data-computed="pct2" value="${escapeHtml(pct2)}" readonly />`,
                `<select class="planilha-select planilha-status-select ${status2Class}" data-field="status2">${buildPlanilhaStatusOptions(record.status2)}</select>`,
                '</div>',
                '</div>',
                '</article>',
            ].join('');
        }).join('');

        planilhaTableBody.innerHTML = rows;
        planilhaTableBody.querySelectorAll('select.planilha-status-select').forEach((selectEl) => {
            applyPlanilhaStatusSelectClass(selectEl, selectEl.value);
        });
        updatePlanilhaSummary(visibleRecords);
    }

    function removePlanilhaRegistro(id) {
        const prevCount = planilhaRegistros.length;
        planilhaRegistros = planilhaRegistros.filter((item) => item.id !== id);
        if (planilhaRegistros.length === prevCount) return;
        savePlanilhaRegistros();
        renderPlanilhaTable();
    }

    function clearPlanilhaRegistros() {
        planilhaRegistros = [];
        savePlanilhaRegistros();
        renderPlanilhaTable();
    }

    function togglePlanilhaRowEdit(id) {
        const record = findPlanilhaRecordById(id);
        if (!record) return;
        record.editing = !record.editing;
        savePlanilhaRegistros();
        renderPlanilhaTable();
    }

    function ensureSelectionForPlanilha() {
        if (!dataTableBody) return null;
        const selected = dataTableBody.querySelector('tr.selected');
        if (!selected || selected.querySelector('td[colspan]')) return null;
        return getRowSelectionData(selected);
    }

    function createPlanilhaRecordFromRow(rowData) {
        const eventName = (rowData.event1 || rowData.event2 || '').trim();
        const stake1FromCalc = toPlanilhaNumber(calcStakeInput1 ? calcStakeInput1.value : 0);
        const stake2FromCalc = toPlanilhaNumber(calcStakeInput2 ? calcStakeInput2.value : 0);
        const odd1 = toPlanilhaNumber(rowData.odd1);
        const odd2 = toPlanilhaNumber(rowData.odd2);

        const record = hydratePlanilhaRecord({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            eventDate: formatPlanilhaDateTime(rowData.receivedAt || new Date().toISOString()),
            sport: rowData.sportName || '-',
            event: eventName || '-',
            house1: rowData.bookmaker1 || '-',
            market1: rowData.entryType1 || '-',
            odd1,
            stake1: stake1FromCalc > 0 ? stake1FromCalc : 75,
            status1: PLANILHA_STATUS_OPTIONS[0],
            house2: rowData.bookmaker2 || '-',
            market2: rowData.entryType2 || '-',
            odd2,
            stake2: stake2FromCalc > 0 ? stake2FromCalc : 75,
            status2: PLANILHA_STATUS_OPTIONS[0],
            url1: rowData.link1 || '',
            url2: rowData.link2 || '',
            createdAt: new Date().toISOString(),
            isLive: activeSubtab === 'live',
            editing: false,
        });

        return record;
    }

    function addSelectedEventToPlanilha() {
        const rowData = ensureSelectionForPlanilha();
        if (!rowData) {
            showSystemAlert('Selecione um evento na tabela antes de planilhar.');
            return false;
        }
        const record = createPlanilhaRecordFromRow(rowData);
        if (!record) {
            showSystemAlert('Nao foi possivel criar o registro de planilha para este evento.');
            return false;
        }
        planilhaRegistros.unshift(record);
        savePlanilhaRegistros();
        renderPlanilhaTable();
        return true;
    }

    function openPlanilhaRegistro(record, preferredSide) {
        if (!record) return;
        const normalized1 = normalizeBetLink(record.url1 || '');
        const normalized2 = normalizeBetLink(record.url2 || '');
        const valid1 = isValidHttpLink(normalized1);
        const valid2 = isValidHttpLink(normalized2);
        const openOnly1 = preferredSide === 1;
        const openOnly2 = preferredSide === 2;

        if (openOnly1 && !valid1) {
            showSystemAlert('Casa 1 sem URL valida para abrir neste registro.');
            return;
        }
        if (openOnly2 && !valid2) {
            showSystemAlert('Casa 2 sem URL valida para abrir neste registro.');
            return;
        }
        if (!openOnly1 && !openOnly2 && !valid1 && !valid2) {
            showSystemAlert('Registro sem URLs validas para abrir.');
            return;
        }

        const link1 = openOnly2 ? '' : (valid1 ? normalized1 : '');
        const link2 = openOnly1 ? '' : (valid2 ? normalized2 : '');

        selectedRowLinks = {
            link1,
            link2,
            bookmaker1: record.house1 || 'Casa 1',
            bookmaker2: record.house2 || 'Casa 2',
            odd1: toPlanilhaNumber(record.odd1),
            odd2: toPlanilhaNumber(record.odd2),
            event1: record.event || '',
            event2: record.event || '',
            percentage: Number.NaN,
            rowKey: '',
        };

        updateSignalUrlCards(link1, link2, record.event || '', record.event || '');
        const detachedOpened = openDetachedBetWindows({
            link1,
            link2,
            bookmaker1: selectedRowLinks.bookmaker1 || 'Casa 1',
            bookmaker2: selectedRowLinks.bookmaker2 || 'Casa 2',
            event1: record.event || '',
            event2: record.event || '',
        });
        lastOpenUsedDetached = detachedOpened;
        if (detachedOpened) {
            closePlanilhaPanel();
            return;
        }
        if (!recolhidoMode) enterRecolhidoMode();
        setDataAreaMode('browser');
        if (browserView1) browserView1.src = link1 || 'about:blank';
        if (browserView2) browserView2.src = link2 || 'about:blank';
        applyBrowserUserAgent();
        closePlanilhaPanel();
    }

    function openPlanilhaPanel(targetView = 'dashboard') {
        if (activeMainTab !== 'dados') {
            const dadosTab = Array.from(navTabs).find((tab) => (tab.dataset.tab || '') === 'dados');
            if (dadosTab) dadosTab.click();
        }
        if (recolhidoMode) {
            exitRecolhidoMode();
        }
        setDataAreaMode('panel');
        setActiveReportView(targetView);
        updatePlanilhaFilterButtons();
        renderPlanilhaTable();
    }

    function closePlanilhaPanel() {
        setDataAreaMode(recolhidoMode ? 'browser' : 'table');
    }

    function togglePlanilhaPanel() {
        if (activeDataAreaMode === 'panel') {
            closePlanilhaPanel();
            return;
        }
        openPlanilhaPanel();
    }

    function handlePlanilhaFieldChange(input, row, record) {
        if (!input || !row || !record) return;
        const field = input.dataset.field || '';
        if (!field) return;
        if (field === 'status1' || field === 'status2') {
            record[field] = sanitizePlanilhaStatus(input.value);
            if (input.value !== record[field]) input.value = record[field];
            applyPlanilhaStatusSelectClass(input, record[field]);
            savePlanilhaRegistros();
            if (planilhaFilterMode === 'pendentes') {
                renderPlanilhaTable();
            }
            return;
        }

        if (!record.editing) return;
        const numericFields = new Set(['odd1', 'odd2', 'stake1', 'stake2']);

        if (numericFields.has(field)) {
            record[field] = toPlanilhaNumber(input.value);
            updatePlanilhaRowComputed(row, record);
            updatePlanilhaSummary(getFilteredPlanilhaRegistros());
            savePlanilhaRegistros();
            return;
        }

        record[field] = String(input.value || '').trim();
        savePlanilhaRegistros();
    }

    function setupPlanilhaEvents() {
        if (btnOpenPainel) {
            btnOpenPainel.addEventListener('click', () => {
                togglePlanilhaPanel();
            });
        }

        if (btnPlanilhaFechar) {
            btnPlanilhaFechar.addEventListener('click', () => {
                closePlanilhaPanel();
            });
        }

        if (btnPlanilhaLimpar) {
            btnPlanilhaLimpar.addEventListener('click', async () => {
                if (!planilhaRegistros.length) return;
                const ok = await showSystemConfirm(
                    'Tem certeza que deseja excluir todos os registros do painel?',
                    'Confirmar exclusao',
                    { okText: 'Excluir tudo', cancelText: 'Cancelar' }
                );
                if (!ok) return;
                clearPlanilhaRegistros();
            });
        }

        if (btnPlanilhaRecolher) {
            btnPlanilhaRecolher.addEventListener('click', () => {
                closePlanilhaPanel();
            });
        }

        if (btnPlanilhaDefinirDatas) {
            btnPlanilhaDefinirDatas.addEventListener('click', () => {
                openPlanilhaDateFilterModal();
            });
        }

        if (btnPlanilhaDateFilterClose) {
            btnPlanilhaDateFilterClose.addEventListener('click', closePlanilhaDateFilterModal);
        }

        if (btnPlanilhaDateFilterCancel) {
            btnPlanilhaDateFilterCancel.addEventListener('click', closePlanilhaDateFilterModal);
        }

        if (btnPlanilhaDateFilterClear) {
            btnPlanilhaDateFilterClear.addEventListener('click', () => {
                clearPlanilhaDateFilter();
            });
        }

        if (btnPlanilhaDateFilterApply) {
            btnPlanilhaDateFilterApply.addEventListener('click', applyPlanilhaDateFilter);
        }

        if (btnPlanilhaRegistrarGastos) {
            btnPlanilhaRegistrarGastos.addEventListener('click', () => {
                openPlanilhaGastoModal();
            });
        }

        if (btnPlanilhaRegistrarAposta) {
            btnPlanilhaRegistrarAposta.addEventListener('click', () => {
                openPlanilhaApostaModal();
            });
        }

        if (reportNavButtons.length) {
            reportNavButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    setActiveReportView(btn.dataset.reportView || 'dashboard');
                });
            });
        }

        if (reportDashboardPresetButtons.length) {
            reportDashboardPresetButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    applyReportDashboardPreset(btn.dataset.dashboardRange || '30d');
                });
            });
        }

        if (reportDashboardModeButtons.length) {
            reportDashboardModeButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    setReportDashboardMode(btn.dataset.dashboardMode || 'todos');
                });
            });
        }

        if (reportDashboardStartDate) {
            reportDashboardStartDate.addEventListener('change', () => {
                reportDashboardStart = String(reportDashboardStartDate.value || '').trim();
                reportDashboardRangePreset = 'custom';
                syncReportDashboardPresetButtons();
                renderReportDashboard();
            });
        }

        if (reportDashboardEndDate) {
            reportDashboardEndDate.addEventListener('change', () => {
                reportDashboardEnd = String(reportDashboardEndDate.value || '').trim();
                reportDashboardRangePreset = 'custom';
                syncReportDashboardPresetButtons();
                renderReportDashboard();
            });
        }

        if (btnPlanilhaGastoClose) {
            btnPlanilhaGastoClose.addEventListener('click', closePlanilhaGastoModal);
        }
        if (btnPlanilhaGastoCancelar) {
            btnPlanilhaGastoCancelar.addEventListener('click', closePlanilhaGastoModal);
        }
        if (btnPlanilhaGastoSalvar) {
            btnPlanilhaGastoSalvar.addEventListener('click', savePlanilhaGastoManual);
        }

        if (btnPlanilhaApostaClose) {
            btnPlanilhaApostaClose.addEventListener('click', closePlanilhaApostaModal);
        }
        if (btnPlanilhaApostaCancelar) {
            btnPlanilhaApostaCancelar.addEventListener('click', closePlanilhaApostaModal);
        }
        if (btnPlanilhaApostaSalvar) {
            btnPlanilhaApostaSalvar.addEventListener('click', savePlanilhaApostaManual);
        }

        if (planilhaSearchInput) {
            planilhaSearchInput.addEventListener('input', () => {
                planilhaSearchTerm = String(planilhaSearchInput.value || '').trim();
                renderPlanilhaTable();
            });
        }

        if (planilhaPeriodYear) {
            planilhaPeriodYear.addEventListener('change', () => {
                planilhaSelectedYear = String(planilhaPeriodYear.value || '').trim();
                syncPlanilhaPeriodOptions();
                renderPlanilhaTable();
            });
        }

        if (planilhaPeriodMonth) {
            planilhaPeriodMonth.addEventListener('change', () => {
                planilhaSelectedMonth = String(planilhaPeriodMonth.value || '').trim();
                renderPlanilhaTable();
            });
        }

        if (planilhaFilterButtons && planilhaFilterButtons.length) {
            planilhaFilterButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const mode = String(btn.dataset.planilhaFilterMode || '').trim().toLowerCase();
                    if (!mode) return;
                    planilhaFilterMode = mode;
                    updatePlanilhaFilterButtons();
                    renderPlanilhaTable();
                });
            });
        }

        if (!planilhaTableBody) return;

        planilhaTableBody.addEventListener('input', (e) => {
            const input = e.target.closest('input[data-field],select[data-field]');
            if (!input) return;
            const row = input.closest('[data-planilha-id]');
            if (!row) return;
            const record = findPlanilhaRecordById(row.dataset.planilhaId || '');
            if (!record) return;
            handlePlanilhaFieldChange(input, row, record);
        });

        planilhaTableBody.addEventListener('change', (e) => {
            const input = e.target.closest('input[data-field],select[data-field]');
            if (!input) return;
            const row = input.closest('[data-planilha-id]');
            if (!row) return;
            const record = findPlanilhaRecordById(row.dataset.planilhaId || '');
            if (!record) return;
            handlePlanilhaFieldChange(input, row, record);
        });

        planilhaTableBody.addEventListener('focusout', (e) => {
            const input = e.target.closest('input[data-field]');
            if (!input) return;
            const field = input.dataset.field || '';
            if (!['odd1', 'odd2', 'stake1', 'stake2'].includes(field)) return;
            const row = input.closest('[data-planilha-id]');
            if (!row) return;
            const record = findPlanilhaRecordById(row.dataset.planilhaId || '');
            if (!record) return;
            input.value = toPlanilhaNumber(record[field]).toFixed(2);
        });

        planilhaTableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;
            const row = button.closest('[data-planilha-id]');
            if (!row) return;
            const record = findPlanilhaRecordById(row.dataset.planilhaId || '');
            if (!record) return;
            const action = button.dataset.action || '';

            if (action === 'toggle-edit') {
                togglePlanilhaRowEdit(record.id);
                return;
            }
            if (action === 'remove') {
                const ok = await showSystemConfirm(
                    'Tem certeza que deseja excluir este registro?',
                    'Confirmar exclusao',
                    { okText: 'Excluir', cancelText: 'Cancelar' }
                );
                if (!ok) return;
                removePlanilhaRegistro(record.id);
                return;
            }
            if (action === 'open1') {
                openPlanilhaRegistro(record, 1);
                return;
            }
            if (action === 'open2') {
                openPlanilhaRegistro(record, 2);
            }
        });
    }

    async function copyTextToClipboard(text) {
        const value = (text || '').trim();
        if (!value) return false;
        try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(value);
                return true;
            }
        } catch (_) {}

        try {
            const area = document.createElement('textarea');
            area.value = value;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            area.setSelectionRange(0, area.value.length);
            const ok = document.execCommand('copy');
            document.body.removeChild(area);
            return !!ok;
        } catch (_) {
            return false;
        }
    }

    function pulseCopiedButton(btn) {
        if (!btn) return;
        const originalText = btn.textContent;
        btn.textContent = 'Copiado';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 900);
    }

    function controlDetachedWindow(side, action) {
        if (!DETACHED_BROWSER_MODE) return;
        if (!window.polvo || typeof window.polvo.controlBetWindow !== 'function') {
            showSystemAlert('Controle de janela destacada indisponivel nesta versao.');
            return;
        }
        try {
            window.polvo.controlBetWindow(side, action);
        } catch (_) {
            showSystemAlert('Nao foi possivel controlar a janela destacada.');
        }
    }

    function scheduleTableRender() {
        if (tableRenderScheduled) return;
        tableRenderScheduled = true;
        requestAnimationFrame(() => {
            tableRenderScheduled = false;
            renderArbsTable({ buffer: arbsBuffer });
        });
    }

    function resetTablePageAndRender() {
        currentTablePage = 1;
        scheduleTableRender();
    }

    function escapeHtml(s) {
        if (s == null || s === '') return s;
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function normalizeBaseUrl(rawUrl, fallback = REPORT_SUGGESTIONS_DEFAULT_BASE_URL) {
        const txt = String(rawUrl || '').trim().replace(/\s+/g, '');
        if (!txt) return fallback;
        return txt.replace(/\/+$/, '');
    }

    async function connectSocket() {
        socketLog('Iniciando conexÃ£o com o socket...');
        if (window.__appLog) window.__appLog('info', 'SOCKET', 'connectSocket start (dashboard)', {});
        if (typeof window.polvo === 'undefined' || !window.polvo.getSocketConfig) {
            socketLog('Erro: getSocketConfig nÃ£o disponÃ­vel (preload/main).', 'error');
            if (window.__appLog) window.__appLog('error', 'SOCKET', 'getSocketConfig not available', {});
            setSocketStatus('error');
            renderArbsTable({ arbs: [] });
            return;
        }

        let SERVER_URL;
        let token;
        try {
            const config = await window.polvo.getSocketConfig();
            SERVER_URL = (config && config.url) || 'http://localhost:3005';
            token = config && config.token;
            if (window.__appLog) window.__appLog('info', 'SOCKET', 'getSocketConfig received', { url: SERVER_URL, hasToken: !!token });
        } catch (err) {
            socketLog(`Erro ao obter config: ${(err && err.message) || err}`, 'error');
            if (window.__appLog) window.__appLog('error', 'SOCKET', 'getSocketConfig failed', { message: (err && err.message) || String(err) });
            setSocketStatus('error');
            renderArbsTable({ arbs: [] });
            return;
        }

        if (!token) {
            socketLog('Sem token de autenticaÃ§Ã£o. Redirecionando para login.', 'error');
            if (window.__appLog) window.__appLog('warn', 'SOCKET', 'no token, redirect to login', {});
            setSocketStatus('error');
            renderArbsTable({ arbs: [] });
            window.polvo.navigateToLogin();
            return;
        }

        socketLog(`Config: url=${SERVER_URL}, token=***`);
        setSocketStatus('connecting');
        socketLog('Conectando...');

        socket = io(SERVER_URL, {
            transports: ['polling', 'websocket'],
            auth: { token },
            query: { token },
            reconnection: true,
        });
        if (window.__appLog) window.__appLog('info', 'SOCKET', 'io() called, waiting for connect', { url: SERVER_URL });

        socket.on('connect', () => {
            socketLog('Conectado. Solicitando salas...', 'ok');
            setSocketStatus('connected');
            lastSocketDataAt = Date.now();
            if (window.__appLog) window.__appLog('info', 'SOCKET', 'connected, emit getRooms', { url: SERVER_URL, socketId: socket.id, transport: socket.io && socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.name });
            socket.emit('getRooms');
        });

        function findArbsArray(obj, depth) {
            if (depth > 3 || !obj) return null;
            if (Array.isArray(obj) && obj.length > 0 && obj[0] && typeof obj[0] === 'object' && (obj[0].percentage != null || obj[0].bet1 || obj[0].sportName)) {
                return obj;
            }
            if (Array.isArray(obj)) return obj;
            if (typeof obj === 'object') {
                for (const v of Object.values(obj)) {
                    const found = findArbsArray(v, depth + 1);
                    if (found) return found;
                }
            }
            return null;
        }

        function handleArbsPayload(payload) {
            if (!payload || typeof payload !== 'object') return;
            let data = payload.data;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (_) {
                    data = null;
                }
            }

            const prefilterOptions = payload.prefilterOptions || (data && typeof data === 'object' ? data.prefilterOptions : null);
            if (prefilterOptions) {
                applyFixedPreFilterOptions(prefilterOptions);
            }

            const incomingCronograma = payload.cronograma || (data && typeof data === 'object' ? data.cronograma : null);
            if (Array.isArray(incomingCronograma)) {
                cronogramaSeries = incomingCronograma;
            }

            let arbs = null;
            if (Array.isArray(payload.arbs)) {
                arbs = payload.arbs;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.arbs)) {
                    arbs = data.arbs;
                } else if (Array.isArray(data)) {
                    arbs = data;
                } else {
                    arbs = Array.isArray(data.items) ? data.items : Array.isArray(data.results) ? data.results : Array.isArray(data.list) ? data.list : null;
                    if (!arbs) {
                        const firstArray = Object.values(data).find((v) => Array.isArray(v));
                        if (firstArray) arbs = firstArray;
                    }
                }
            } else if (Array.isArray(payload.data)) {
                arbs = payload.data;
            } else if (Array.isArray(payload)) {
                arbs = payload;
            }
            if (!arbs) {
                arbs = findArbsArray(payload, 0);
            }
            if (arbs) {
                const isPartialPayload = Boolean(
                    payload.partial === true ||
                    payload.isPartial === true ||
                    payload.mode === 'partial' ||
                    (data && typeof data === 'object' && (data.partial === true || data.isPartial === true || data.mode === 'partial'))
                );
                if (arbs.length > 0) {
                    lastSocketDataAt = Date.now();
                    const now = Date.now();
                    if (now - lastDataLogTime >= DATA_LOG_THROTTLE_MS) {
                        lastDataLogTime = now;
                        socketLog(`data: arbs=${arbs.length} (buffer=${arbsBuffer.length})${isPartialPayload ? ' [parcial]' : ''}`, 'ok');
                        if (window.__appLog) window.__appLog('info', 'SOCKET', 'data (arbs batch)', { count: arbs.length, bufferLength: arbsBuffer.length, partial: isPartialPayload });
                    }
                }
                let newKeysCount = 0;
                const seenIncomingKeys = new Set();
                for (const arb of arbs) {
                    const key = getArbStableKey(arb);
                    if (!key || seenIncomingKeys.has(key)) continue;
                    seenIncomingKeys.add(key);
                    if (!knownArbKeys.has(key)) {
                        newKeysCount += 1;
                    }
                }
                const ts = payload.timestamp || (data && data.timestamp) || new Date().toISOString();
                appendArbsBatchToBuffer(arbs, ts);
                rebuildKnownArbKeys();
                if (!alertSoundPrimed) {
                    alertSoundPrimed = true;
                } else if (newKeysCount > 0) {
                    playBatchAlertSound();
                }
                refreshPreFilterOptionsFromBuffer();
                scheduleTableRender();
                if (activeMainTab === 'cronograma') {
                    populateChart();
                }
            } else {
                const keys = Object.keys(payload);
                const dataPreview = payload.data == null ? 'null' : typeof payload.data === 'object' ? 'keys=' + Object.keys(payload.data).join(',') : typeof payload.data + '(' + (String(payload.data).length) + ')';
                socketLog(`data: payload keys=[${keys.join(', ')}] data=${dataPreview}`, 'warn');
                if (window.__appLog) window.__appLog('warn', 'SOCKET', 'data payload format not recognized', { payloadKeys: keys, dataPreview });
                if (activeMainTab === 'cronograma' && Array.isArray(incomingCronograma)) {
                    populateChart();
                }
            }
        }

        socket.on('roomsList', (data) => {
            const rooms = (data && data.rooms) || [];
            socketLog(`roomsList: ${rooms.length} sala(s).`);
            const roomSummary = (rooms || []).map((r) => ({ id: r.id, strategy: r.strategy }));
            if (window.__appLog) window.__appLog('info', 'SOCKET', 'roomsList (received)', { roomCount: rooms.length, rooms: roomSummary });

            const targetRoomIds = [];
            if (rooms.length > 0) {
                rooms.forEach((room) => {
                    const strategy = String(room.strategy || '');
                    socketLog(`  Room: ${room.id} (${strategy || '-'})`);
                    if (/BETBURGUER:ARBS_/i.test(strategy) || /BETBURGER:ARBS_/i.test(strategy)) {
                        targetRoomIds.push(room.id);
                    }
                });
                if (targetRoomIds.length > 0) {
                    targetRoomIds.forEach((jobId) => {
                        socketLog(`joinRoom: jobId=${jobId}`, 'ok');
                        if (window.__appLog) window.__appLog('info', 'SOCKET', 'emit joinRoom', { jobId });
                        socket.emit('joinRoom', { jobId });
                    });
                } else {
                    socketLog('Nenhuma sala BetBurger ARBS encontrada (LIVE/PRE).', 'warn');
                    if (window.__appLog) window.__appLog('warn', 'SOCKET', 'target room not found (SPORTS:BETBURGUER:ARBS_*)', { roomCount: rooms.length, strategies: roomSummary.map((r) => r.strategy) });
                }
            } else {
                socketLog('Nenhuma sala ativa.', 'warn');
                if (window.__appLog) window.__appLog('warn', 'SOCKET', 'no rooms in roomsList', {});
                renderArbsTable({ arbs: [] });
            }
        });

        socket.on('data', handleArbsPayload);

        // Log if no data received within 15s after connecting (helps debug "connecting but no data")
        const noDataTimeoutMs = 15000;
        const noDataTimer = setTimeout(() => {
            if (arbsBuffer.length === 0) {
                socketLog('Nenhum dado recebido ainda (timeout 15s). Verifique se o backend envia eventos "data" para esta sala.', 'warn');
                if (window.__appLog) window.__appLog('warn', 'SOCKET', 'no data received within 15s', { bufferLength: arbsBuffer.length });
            }
        }, noDataTimeoutMs);
        socket.once('data', () => clearTimeout(noDataTimer));

        socket.on('connect_error', (err) => {
            const msg = (err && err.message) ? err.message : String(err);
            if (window.__appLog && window.__serializeSocketError) {
                window.__appLog('error', 'SOCKET', 'connect_error', window.__serializeSocketError(err, SERVER_URL));
            }
            socketLog(`connect_error: ${msg}`, 'error');
            setSocketStatus('error');
            if (msg.includes('Session replaced by another connection')) {
                socketLog('SessÃ£o substituÃ­da por outra conexÃ£o.', 'error');
                if (window.polvo.clearSocketToken) window.polvo.clearSocketToken();
                window.polvo.navigateToLogin();
            }
        });

        socket.on('error', (msg) => {
            const str = typeof msg === 'string' ? msg : (msg && msg.message) ? msg.message : String(msg);
            if (window.__appLog) {
                const payload = typeof msg === 'object' && msg !== null && window.__serializeSocketError
                    ? window.__serializeSocketError(msg, SERVER_URL)
                    : { message: str };
                window.__appLog('error', 'SOCKET', 'error', payload);
            }
            if (str.includes('Session replaced by another connection')) {
                socketLog('SessÃ£o substituÃ­da por outra conexÃ£o.', 'error');
                setSocketStatus('error');
                if (window.polvo.clearSocketToken) window.polvo.clearSocketToken();
                window.polvo.navigateToLogin();
            }
        });

        socket.on('disconnect', (reason) => {
            if (window.__appLog) window.__appLog('warn', 'SOCKET', 'disconnect', { reason, url: SERVER_URL, description: typeof reason === 'object' && reason && reason.description ? reason.description : undefined });
            socketLog(`disconnect: ${reason}`, reason === 'io server disconnect' ? 'error' : 'warn');
            setSocketStatus(reason === 'io server disconnect' ? 'error' : 'connecting');
        });

        // Watchdog: if connected but no data for a while, request rooms again.
        if (socketWatchdogTimer) {
            clearInterval(socketWatchdogTimer);
            socketWatchdogTimer = null;
        }
        socketWatchdogTimer = setInterval(() => {
            if (!socket || !socket.connected) return;
            const now = Date.now();
            const silenceMs = lastSocketDataAt > 0 ? (now - lastSocketDataAt) : Number.POSITIVE_INFINITY;
            if (silenceMs > 15000) {
                socketLog(`watchdog: sem dados por ${Math.round(silenceMs / 1000)}s, solicitando salas novamente...`, 'warn');
                if (window.__appLog) window.__appLog('warn', 'SOCKET', 'watchdog rejoin attempt', { silenceMs });
                socket.emit('getRooms');
            }
        }, 5000);
    }

    (async () => {
        try {
            await connectSocket();
        } catch (err) {
            const msg = (err && err.message) || String(err);
            socketLog(`Erro ao conectar socket: ${msg}`, 'error');
            if (window.__appLog) window.__appLog('error', 'SOCKET', 'connectSocket exception', { message: msg, name: (err && err.name) || '', stack: (err && err.stack) || '' });
            setSocketStatus('error');
            renderArbsTable({ arbs: [] });
        }
    })();

    window.addEventListener('beforeunload', () => {
        if (socketWatchdogTimer) {
            clearInterval(socketWatchdogTimer);
            socketWatchdogTimer = null;
        }
        if (typeof removeBetanoOddUpdateListener === 'function') {
            try {
                removeBetanoOddUpdateListener();
            } catch (_) {}
            removeBetanoOddUpdateListener = null;
        }
        if (typeof removeAppUpdateStatusListener === 'function') {
            try {
                removeAppUpdateStatusListener();
            } catch (_) {}
            removeAppUpdateStatusListener = null;
        }
        if (typeof removeAppUpdateReadyListener === 'function') {
            try {
                removeAppUpdateReadyListener();
            } catch (_) {}
            removeAppUpdateReadyListener = null;
        }
    });

    // ===== Window Controls =====
    btnMinimize.addEventListener('click', () => window.polvo.minimizeApp());
    btnMaximize.addEventListener('click', () => window.polvo.maximizeApp());
    btnClose.addEventListener('click', () => window.polvo.closeApp());

    // Toggle maximize/restore icon when window state changes
    window.polvo.onMaximizeChange((isMaximized) => {
        btnMaximize.querySelector('.icon-maximize').style.display = isMaximized ? 'none' : '';
        btnMaximize.querySelector('.icon-restore').style.display = isMaximized ? '' : 'none';
        btnMaximize.title = isMaximized ? 'Restaurar' : 'Maximizar';
    });

    bindAppUpdateBridge();

    function setActiveSubtab(nextSubtab) {
        activeSubtab = nextSubtab || 'all';
        subTabs.forEach((btn) => {
            const btnSubtab = btn.dataset.subtab || 'all';
            btn.classList.toggle('active', btnSubtab === activeSubtab);
        });
        refreshAccessGate();
    }

    // ===== Tab Navigation =====
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (recolhidoMode) {
                exitRecolhidoMode();
            }
            // Update tab button states
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding panel
            activeMainTab = tabName;
            refreshNavDataControlsVisibility();
            if (tabName === 'pre-filtro') {
                setActiveSubtab('pre-live');
            } else if (tabName === 'live-filtro') {
                setActiveSubtab('live');
            }
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
            });

            const targetPanel = document.getElementById(`panel-${tabName}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            // Conteudo da direita:
            // - Dados / Pre-Filtro / Live Filtro: mostra tabela
            // - Cronograma: mostra grafico
            // - Demais abas: nao mostra tabela nem grafico
            if (tabName === 'dados' || tabName === 'pre-filtro' || tabName === 'live-filtro') {
                if (activeDataAreaMode === 'panel') {
                    closePlanilhaPanel();
                } else if (activeDataAreaMode !== 'table') {
                    setDataAreaMode('table');
                }
                if (dataArea) dataArea.style.display = '';
                chartContainer.style.display = 'none';
                titlebarLabel.textContent = tab.textContent.toUpperCase();
                resetTablePageAndRender();
            } else if (tabName === 'cronograma') {
                if (dataArea) dataArea.style.display = 'none';
                chartContainer.style.display = 'flex';
                populateChart();
                titlebarLabel.textContent = 'CRONO';
            } else {
                if (activeDataAreaMode === 'panel') {
                    closePlanilhaPanel();
                }
                if (dataArea) dataArea.style.display = 'none';
                chartContainer.style.display = 'none';
                titlebarLabel.textContent = tab.textContent.toUpperCase();
            }
            refreshAccessGate();
        });
    });

    // ===== Sub-Tab Toggle =====
    subTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const requestedSubtab = tab.dataset.subtab || 'all';
            if (activeMainTab === 'pre-filtro' && requestedSubtab === 'live') {
                setActiveSubtab('pre-live');
            } else if (activeMainTab === 'live-filtro' && requestedSubtab === 'pre-live') {
                setActiveSubtab('live');
            } else {
                setActiveSubtab(requestedSubtab);
            }
            resetTablePageAndRender();
        });
    });

    // Inicializa em Live por padrao.
    setActiveSubtab('live');
    preFilterPercentInputs.forEach((input) => {
        input.value = '0.00';
    });

    // Initial empty state for arbs table (real-time data from socket)
    renderArbsTable({ arbs: [] });

    // ===== Calculator Logic =====
    const calcRows = calcTable ? calcTable.querySelectorAll('tbody tr:not(.calc-total-row)') : [];
    const calcOddInput1 = calcRows[0] ? calcRows[0].querySelectorAll('.calc-input')[0] : null;
    const calcStakeInput1 = calcRows[0] ? calcRows[0].querySelectorAll('.calc-input')[1] : null;
    const calcResult1 = calcRows[0] ? calcRows[0].querySelector('.calc-result') : null;
    const calcOddInput2 = calcRows[1] ? calcRows[1].querySelectorAll('.calc-input')[0] : null;
    const calcStakeInput2 = calcRows[1] ? calcRows[1].querySelectorAll('.calc-input')[1] : null;
    const calcResult2 = calcRows[1] ? calcRows[1].querySelector('.calc-result') : null;
    const calcTotalInput = document.querySelector('.calc-total-row .calc-input');
    const calcResultBtn = document.querySelector('.calc-result-btn');

    function setInputNumber(input, value) {
        if (!input || !Number.isFinite(value)) return;
        input.value = value.toFixed(2);
    }

    function setInputReadonly(input, readonly) {
        if (!input) return;
        input.readOnly = !!readonly;
        input.style.opacity = readonly ? '0.82' : '1';
    }

    function formatCurrencyBRL(value) {
        if (!Number.isFinite(value)) return '-';
        return `R$ ${value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    function setCalculatorHouseNames(bookmaker1, bookmaker2) {
        if (casaComboBlue) casaComboBlue.textContent = bookmaker1 || '-';
        if (casaComboGreen) casaComboGreen.textContent = bookmaker2 || '-';
    }

    function updateCalculatorFieldLocks() {
        // Sempre permite edição manual dos 3 campos de stake (casa1, casa2 e total).
        setInputReadonly(calcStakeInput1, false);
        setInputReadonly(calcStakeInput2, false);
        setInputReadonly(calcTotalInput, false);
    }

    function paintResult(span, value) {
        if (!span) return;
        if (!Number.isFinite(value)) {
            span.textContent = '-';
            span.style.color = '';
            return;
        }
        span.textContent = formatCurrencyBRL(value);
        if (value > 0) span.style.color = '#38f8c5';
        else if (value < 0) span.style.color = '#ef4444';
        else span.style.color = 'rgba(255,255,255,0.75)';
    }

    function paintRoi(roiPercent, lucroTotal) {
        if (!calcResultBtn) return;
        calcResultBtn.classList.remove('roi-positive', 'roi-negative', 'roi-neutral');
        if (!Number.isFinite(roiPercent) || !Number.isFinite(lucroTotal)) {
            calcResultBtn.textContent = '-';
            calcResultBtn.title = '';
            calcResultBtn.classList.add('roi-neutral');
            return;
        }
        calcResultBtn.textContent = `${roiPercent.toFixed(2)}%`;
        calcResultBtn.title = `Lucro minimo: ${formatCurrencyBRL(lucroTotal)}`;
        if (lucroTotal > 0) calcResultBtn.classList.add('roi-positive');
        else if (lucroTotal < 0) calcResultBtn.classList.add('roi-negative');
        else calcResultBtn.classList.add('roi-neutral');
    }

    function updateCalculator(sourceInput = null, options = {}) {
        if (!calcOddInput1 || !calcOddInput2 || !calcStakeInput1 || !calcStakeInput2 || !calcTotalInput) return;
        const commitFormatting = options.commitFormatting !== false;
        const canWriteInput = (input) => commitFormatting || input !== sourceInput;

        const odd1 = Math.max(0, parseNumber(calcOddInput1.value, 0));
        const odd2 = Math.max(0, parseNumber(calcOddInput2.value, 0));
        const autoStake = !!(autoStakeCheckbox && autoStakeCheckbox.checked);
        const fixarCasa = !!(fixarCasaCheckbox && fixarCasaCheckbox.checked);

        let stake1 = Math.max(0, parseNumber(calcStakeInput1.value, 0));
        let stake2 = Math.max(0, parseNumber(calcStakeInput2.value, 0));
        let total = Math.max(0, parseNumber(calcTotalInput.value, stake1 + stake2));

        if (autoStake && odd1 > 0 && odd2 > 0) {
            const denom = odd1 + odd2;
            if (fixarCasa) {
                if (sourceInput === calcStakeInput2) {
                    stake1 = (stake2 * odd2) / odd1;
                } else if (sourceInput === calcTotalInput) {
                    if (denom > 0) {
                        stake1 = (total * odd2) / denom;
                        stake2 = (total * odd1) / denom;
                    }
                } else {
                    stake2 = (stake1 * odd1) / odd2;
                }
                total = stake1 + stake2;
                if (canWriteInput(calcStakeInput1)) setInputNumber(calcStakeInput1, stake1);
                if (canWriteInput(calcStakeInput2)) setInputNumber(calcStakeInput2, stake2);
                if (canWriteInput(calcTotalInput)) setInputNumber(calcTotalInput, total);
            } else {
                if (sourceInput === calcStakeInput1) {
                    stake2 = (stake1 * odd1) / odd2;
                    total = stake1 + stake2;
                } else if (sourceInput === calcStakeInput2) {
                    stake1 = (stake2 * odd2) / odd1;
                    total = stake1 + stake2;
                } else if (denom > 0) {
                    stake1 = (total * odd2) / denom;
                    stake2 = (total * odd1) / denom;
                    total = stake1 + stake2;
                }
                if (canWriteInput(calcStakeInput1)) setInputNumber(calcStakeInput1, stake1);
                if (canWriteInput(calcStakeInput2)) setInputNumber(calcStakeInput2, stake2);
                if (canWriteInput(calcTotalInput)) setInputNumber(calcTotalInput, total);
            }
        } else {
            total = stake1 + stake2;
            if (canWriteInput(calcTotalInput)) setInputNumber(calcTotalInput, total);
        }

        const lucro1 = (odd1 > 0 && stake1 > 0) ? ((stake1 * odd1) - total) : Number.NaN;
        const lucro2 = (odd2 > 0 && stake2 > 0) ? ((stake2 * odd2) - total) : Number.NaN;
        paintResult(calcResult1, lucro1);
        paintResult(calcResult2, lucro2);

        const worstCase = Number.isFinite(lucro1) && Number.isFinite(lucro2) ? Math.min(lucro1, lucro2) : Number.NaN;
        const roi = (total > 0 && Number.isFinite(worstCase)) ? ((worstCase / total) * 100) : Number.NaN;
        paintRoi(roi, worstCase);
        updateCalculatorFieldLocks();
    }

    function syncCalculatorFromSelection(forceOdds = false) {
        if (!selectedRowLinks) return;
        applyLiveOddOverridesToSelectedRow(selectedRowLinks.rowKey || selectedRowKey || '');
        setCalculatorHouseNames(selectedRowLinks.bookmaker1, selectedRowLinks.bookmaker2);

        const shouldSyncOdds = !!forceOdds || !calcAutoOddsCheckbox || calcAutoOddsCheckbox.checked;
        if (shouldSyncOdds) {
            const odd1 = parseNumber(selectedRowLinks.odd1, 0);
            const odd2 = parseNumber(selectedRowLinks.odd2, 0);
            if (odd1 > 0 && calcOddInput1) setInputNumber(calcOddInput1, odd1);
            if (odd2 > 0 && calcOddInput2) setInputNumber(calcOddInput2, odd2);
        }

        updateCalculator();
    }

    function getLiveOddOverride(side, rowKey = '') {
        const key = side === 'bet2' ? 'bet2' : 'bet1';
        const stored = liveOddOverrides[key];
        if (!stored) return null;
        const ageMs = Date.now() - Number(stored.ts || 0);
        if (ageMs > LIVE_ODD_OVERRIDE_TTL_MS) {
            liveOddOverrides[key] = null;
            return null;
        }
        if (rowKey && String(stored.rowKey || '') !== String(rowKey || '')) return null;
        return stored;
    }

    function setLiveOddOverride(side, oddValue, rowKey = '') {
        const key = side === 'bet2' ? 'bet2' : 'bet1';
        const odd = normalizeOddForCalc(oddValue);
        if (!(odd > 0)) return;
        liveOddOverrides[key] = {
            rowKey: String(rowKey || selectedRowKey || ''),
            odd,
            ts: Date.now(),
        };
    }

    function applyLiveOddOverridesToSelectedRow(rowKey = '') {
        if (!selectedRowLinks) return;
        const key = String(rowKey || selectedRowLinks.rowKey || selectedRowKey || '');
        const o1 = getLiveOddOverride('bet1', key);
        const o2 = getLiveOddOverride('bet2', key);
        if (o1 && o1.odd > 0) selectedRowLinks.odd1 = o1.odd;
        if (o2 && o2.odd > 0) selectedRowLinks.odd2 = o2.odd;
    }

    function isSyncedBookmakerLikeValue(value) {
        const v = String(value || '').trim().toLowerCase();
        return !!v && v !== '-' && v !== 'null' && v !== 'undefined';
    }

    function isSyncedBookmakerLikeUrl(value) {
        const v = String(value || '').trim().toLowerCase();
        if (!v) return false;
        try {
            const parsed = new URL(v);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function getOddSyncHost(value) {
        const v = String(value || '').trim();
        if (!v) return '';
        try {
            const parsed = new URL(v);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
            return String(parsed.hostname || '').toLowerCase().replace(/^www\./, '');
        } catch (_) {
            return '';
        }
    }

    function oddSyncHostsMatch(leftUrl, rightUrl) {
        const leftHost = getOddSyncHost(leftUrl);
        const rightHost = getOddSyncHost(rightUrl);
        if (!leftHost || !rightHost) return false;
        return leftHost === rightHost
            || leftHost.endsWith(`.${rightHost}`)
            || rightHost.endsWith(`.${leftHost}`);
    }

    function normalizeOddForCalc(rawValue) {
        const numeric = parseNumber(rawValue, 0);
        if (!Number.isFinite(numeric) || numeric < 1 || numeric > 1000) return 0;
        return Math.round(numeric * 1000) / 1000;
    }

    function applyBetanoOddUpdate(payload = {}) {
        if (!payload || typeof payload !== 'object') return;
        if (!selectedRowLinks) return;
        if (calcAutoOddsCheckbox && !calcAutoOddsCheckbox.checked) return;

        const sideRaw = String(payload.side || '').trim().toLowerCase();
        let side = (sideRaw === 'bet2' || sideRaw === '2' || sideRaw === 'right') ? 'bet2' : 'bet1';
        const sideUrlFromEvent = String(payload.url || '');
        const payloadMatchUrl = sideUrlFromEvent || String(payload.expectedUrl || '');
        const payloadBookmaker = String(payload.bookmaker || '');
        const payloadIsTrackedBookmaker = isSyncedBookmakerLikeValue(payloadBookmaker)
            || isSyncedBookmakerLikeUrl(payloadMatchUrl);
        const opposite = side === 'bet2' ? 'bet1' : 'bet2';

        const getSelectedSideLink = (candidateSide) => candidateSide === 'bet2'
            ? String(selectedRowLinks.link2 || '')
            : String(selectedRowLinks.link1 || '');

        const sideLooksTrackedBookmaker = (candidateSide) => {
            const houseName = candidateSide === 'bet2'
                ? String(selectedRowLinks.bookmaker2 || '')
                : String(selectedRowLinks.bookmaker1 || '');
            const sideLink = getSelectedSideLink(candidateSide);
            return isSyncedBookmakerLikeValue(houseName)
                || isSyncedBookmakerLikeUrl(sideLink)
                || isSyncedBookmakerLikeUrl(sideUrlFromEvent);
        };

        const currentSideIsTrackedBookmaker = sideLooksTrackedBookmaker(side);
        const oppositeSideIsTrackedBookmaker = sideLooksTrackedBookmaker(opposite);
        if (!payloadIsTrackedBookmaker && !currentSideIsTrackedBookmaker && !oppositeSideIsTrackedBookmaker) {
            return;
        }

        if (isSyncedBookmakerLikeUrl(payloadMatchUrl)) {
            const currentMatchesPayload = oddSyncHostsMatch(payloadMatchUrl, getSelectedSideLink(side));
            const oppositeMatchesPayload = oddSyncHostsMatch(payloadMatchUrl, getSelectedSideLink(opposite));
            if (!currentMatchesPayload) {
                if (oppositeMatchesPayload) {
                    side = opposite;
                } else {
                    if (window.polvo && typeof window.polvo.log === 'function') {
                        window.polvo.log('warn', 'BETANO_SYNC_UI', 'Odd recusada por host divergente', {
                            payloadSide: sideRaw || side,
                            payloadUrl: payloadMatchUrl,
                            link1: selectedRowLinks.link1 || '',
                            link2: selectedRowLinks.link2 || '',
                            bookmaker1: selectedRowLinks.bookmaker1 || '',
                            bookmaker2: selectedRowLinks.bookmaker2 || '',
                        });
                    }
                    return;
                }
            }
        }

        if (!currentSideIsTrackedBookmaker) {
            if (oppositeSideIsTrackedBookmaker) {
                side = opposite;
            } else {
                return;
            }
        }

        const targetInput = side === 'bet2' ? calcOddInput2 : calcOddInput1;
        if (!targetInput) return;

        const odd = normalizeOddForCalc(payload.odd);
        if (!(odd > 0)) return;

        const currentOdd = normalizeOddForCalc(targetInput.value);
        if (currentOdd > 0 && Math.abs(currentOdd - odd) < 0.0005) return;

        setInputNumber(targetInput, odd);
        setLiveOddOverride(side, odd, selectedRowLinks.rowKey || selectedRowKey || '');
        if (side === 'bet2') {
            selectedRowLinks.odd2 = odd;
        } else {
            selectedRowLinks.odd1 = odd;
        }
        if (window.polvo && typeof window.polvo.log === 'function') {
            window.polvo.log('debug', 'BETANO_SYNC_UI', 'Odd aplicada na calculadora', {
                side,
                odd,
                rowKey: selectedRowLinks.rowKey || selectedRowKey || '',
                payloadUrl: payloadMatchUrl,
                source: payload.source || '',
                bookmaker1: selectedRowLinks.bookmaker1 || '',
                bookmaker2: selectedRowLinks.bookmaker2 || '',
            });
        }
        updateCalculator(targetInput, { commitFormatting: true });
    }

    const calcInputs = [
        calcOddInput1,
        calcStakeInput1,
        calcOddInput2,
        calcStakeInput2,
        calcTotalInput,
    ].filter(Boolean);

    calcInputs.forEach((input) => {
        input.addEventListener('input', () => updateCalculator(input, { commitFormatting: false }));
        input.addEventListener('change', () => updateCalculator(input, { commitFormatting: true }));
        input.addEventListener('blur', () => updateCalculator(input, { commitFormatting: true }));
    });

    function getStepPrecision(stepValue) {
        const numeric = Number(stepValue);
        if (!Number.isFinite(numeric) || numeric <= 0) return 0;
        const asText = numeric.toString();
        if (asText.includes('e-')) {
            const exp = parseInt(asText.split('e-')[1], 10);
            return Number.isFinite(exp) ? exp : 0;
        }
        const decimals = asText.split('.')[1];
        return decimals ? decimals.length : 0;
    }

    function stepCalcInput(input, direction) {
        if (!input || input.readOnly || input.disabled) return;
        const stepAttr = input.getAttribute('step');
        const step = Number(stepAttr);
        const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
        const precision = getStepPrecision(stepAttr || safeStep);

        let nextValue = parseNumber(input.value, 0) + (safeStep * direction);

        const minAttr = input.getAttribute('min');
        if (minAttr !== null && minAttr !== '') {
            nextValue = Math.max(nextValue, parseNumber(minAttr, nextValue));
        }

        const maxAttr = input.getAttribute('max');
        if (maxAttr !== null && maxAttr !== '') {
            nextValue = Math.min(nextValue, parseNumber(maxAttr, nextValue));
        }

        const factor = Math.pow(10, precision);
        nextValue = Math.round(nextValue * factor) / factor;
        input.value = precision > 0 ? nextValue.toFixed(precision) : String(Math.round(nextValue));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const calcSpinButtons = document.querySelectorAll('.calculator-section .spin-btn');
    calcSpinButtons.forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const wrap = btn.closest('.spin-input-wrap');
            const input = wrap ? wrap.querySelector('.calc-input') : null;
            if (!input) return;
            const direction = btn.classList.contains('spin-down') ? -1 : 1;
            stepCalcInput(input, direction);
        });
    });

    const quickSpinButtons = document.querySelectorAll('.quick-stakes .quick-spin-controls .spin-btn');
    quickSpinButtons.forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const wrap = btn.closest('.quick-input-wrap');
            const input = wrap ? wrap.querySelector('.quick-input') : null;
            if (!input) return;
            const direction = btn.classList.contains('spin-down') ? -1 : 1;
            stepCalcInput(input, direction);
        });
    });

    if (fixarCasaCheckbox) {
        fixarCasaCheckbox.addEventListener('change', updateCalculator);
    }
    if (autoStakeCheckbox) {
        autoStakeCheckbox.addEventListener('change', updateCalculator);
    }
    if (calcAutoOddsCheckbox) {
        calcAutoOddsCheckbox.addEventListener('change', () => syncCalculatorFromSelection(false));
    }
    if (window.polvo && typeof window.polvo.onBetanoOddUpdate === 'function') {
        try {
            removeBetanoOddUpdateListener = window.polvo.onBetanoOddUpdate((payload) => {
                applyBetanoOddUpdate(payload);
            });
        } catch (_) {
            removeBetanoOddUpdateListener = null;
        }
    }

    // ===== Quick Stake Buttons =====
    const quickBtns = document.querySelectorAll('.quick-btn');

    function applyQuickStake(value, targetHouse = 1) {
        const safeValue = Math.max(0, parseNumber(value, 0));
        const autoStake = !!(autoStakeCheckbox && autoStakeCheckbox.checked);
        const odd1 = Math.max(0, parseNumber(calcOddInput1 ? calcOddInput1.value : 0, 0));
        const odd2 = Math.max(0, parseNumber(calcOddInput2 ? calcOddInput2.value : 0, 0));
        const house = targetHouse === 2 ? 2 : 1;

        if (house === 1) {
            setInputNumber(calcStakeInput1, safeValue);
        } else {
            setInputNumber(calcStakeInput2, safeValue);
        }

        if (autoStake && odd1 > 0 && odd2 > 0) {
            let stake1 = Math.max(0, parseNumber(calcStakeInput1 ? calcStakeInput1.value : 0, 0));
            let stake2 = Math.max(0, parseNumber(calcStakeInput2 ? calcStakeInput2.value : 0, 0));

            if (house === 1) {
                stake1 = safeValue;
                stake2 = (stake1 * odd1) / odd2;
            } else {
                stake2 = safeValue;
                stake1 = (stake2 * odd2) / odd1;
            }

            setInputNumber(calcStakeInput1, stake1);
            setInputNumber(calcStakeInput2, stake2);
            setInputNumber(calcTotalInput, stake1 + stake2);
        }

        updateCalculator();
    }

    quickBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const pair = btn.closest('.quick-pair');
            const input = pair ? pair.querySelector('.quick-input') : null;
            if (!input) return;
            const house = parseInt(btn.getAttribute('data-house') || '1', 10);
            applyQuickStake(input.value, house);
        });
    });

    setCalculatorHouseNames('-', '-');
    updateCalculator();
    updateSignalUrlCards('', '', '', '');
    loadPlanilhaRegistros();
    setupPlanilhaEvents();
    bindReportTooltipInteractions();
    bindReportSuggestionsInteractions();
    applyReportDashboardPreset(reportDashboardRangePreset, { render: false });
    setReportDashboardMode(reportDashboardMode, { render: false });
    setActiveReportView(activeReportView);
    updatePlanilhaFilterButtons();
    updatePlanilhaDateFilterButtonState();
    renderPlanilhaTable();

    window.__openPlanilhaPanel = (targetView = 'dashboard') => {
        openPlanilhaPanel(targetView);
    };

    // ===== Signal List Click =====
    const signalItems = document.querySelectorAll('.signal-item');
    signalItems.forEach(item => {
        item.addEventListener('click', () => {
            signalItems.forEach(s => s.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    [btnCopyUrl1, btnCopyUrl2].forEach((btn, idx) => {
        if (!btn) return;
        const sideLabel = idx === 0 ? 'Casa 1' : 'Casa 2';
        btn.addEventListener('click', async () => {
            const fullUrl = (btn.dataset.fullUrl || '').trim();
            if (!fullUrl) {
                showSystemAlert(`${sideLabel} sem URL valida para copiar.`);
                return;
            }
            const copied = await copyTextToClipboard(fullUrl);
            if (!copied) {
                showSystemAlert(`Nao foi possivel copiar a URL da ${sideLabel}.`);
                return;
            }
            pulseCopiedButton(btn);
        });
    });

    [btnDetachedCopy1, btnDetachedCopy2].forEach((btn, idx) => {
        if (!btn) return;
        const sideLabel = idx === 0 ? 'Casa 1' : 'Casa 2';
        btn.addEventListener('click', async () => {
            const fullUrl = (btn.dataset.fullUrl || '').trim();
            if (!fullUrl) {
                showSystemAlert(`${sideLabel} sem URL valida para copiar.`);
                return;
            }
            const copied = await copyTextToClipboard(fullUrl);
            if (!copied) {
                showSystemAlert(`Nao foi possivel copiar a URL da ${sideLabel}.`);
                return;
            }
            pulseCopiedButton(btn);
        });
    });

    if (btnDetachedMin1) btnDetachedMin1.addEventListener('click', () => controlDetachedWindow('bet1', 'minimize'));
    if (btnDetachedMin2) btnDetachedMin2.addEventListener('click', () => controlDetachedWindow('bet2', 'minimize'));
    if (btnDetachedMax1) btnDetachedMax1.addEventListener('click', () => controlDetachedWindow('bet1', 'maximize'));
    if (btnDetachedMax2) btnDetachedMax2.addEventListener('click', () => controlDetachedWindow('bet2', 'maximize'));
    if (btnDetachedClose1) btnDetachedClose1.addEventListener('click', () => controlDetachedWindow('bet1', 'close'));
    if (btnDetachedClose2) btnDetachedClose2.addEventListener('click', () => controlDetachedWindow('bet2', 'close'));

    // ===== Action Buttons =====
    const btnPlanilhar = document.getElementById('btn-planilhar');
    const btnRecolher = document.getElementById('btn-recolher');

    if (btnPlanilhar) {
        btnPlanilhar.addEventListener('click', () => {
            const created = addSelectedEventToPlanilha();
            if (!created) return;
            openPlanilhaPanel();
        });
    }

    if (btnRecolher) {
        btnRecolher.addEventListener('click', () => {
            if (recolhidoMode) {
                exitRecolhidoMode();
                return;
            }

            if (lastOpenUsedDetached && window.polvo && typeof window.polvo.toggleDetachedLayout === 'function') {
                enterRecolhidoMode();
                return;
            }

            if (!recolhidoMode) {
                if (!selectedRowLinks || !selectedRowLinks.bookmaker1 || !selectedRowLinks.bookmaker2) {
                    const fromTable = readSelectedRowLinksFromTable();
                    if (fromTable) {
                        selectedRowLinks = fromTable;
                        if (fromTable.rowKey) selectedRowKey = fromTable.rowKey;
                        syncCalculatorFromSelection(true);
                        updateSignalUrlCards(fromTable.link1, fromTable.link2, fromTable.event1, fromTable.event2);
                    }
                }
                if (!selectedRowLinks || !selectedRowLinks.link1 || !selectedRowLinks.link2) {
                    showSystemAlert('Selecione um evento com Casa 1 e Casa 2 antes de recolher.');
                    return;
                }
                const opened = openSplitBrowsers();
                if (!opened) return;
                if (!lastOpenUsedDetached) {
                    enterRecolhidoMode();
                }
            }
        });
    }

    if (btnBackToTable) {
        btnBackToTable.addEventListener('click', () => {
            if (activeDataAreaMode === 'panel') {
                closePlanilhaPanel();
                return;
            }
            if (recolhidoMode || activeDataAreaMode === 'browser') {
                exitRecolhidoMode();
                return;
            }
            setDataAreaMode('table');
        });
    }

    if (btnBrowserSettings) {
        btnBrowserSettings.addEventListener('click', () => {
            updateBrowserBadge();
            showBrowserSettingsModal(true);
        });
    }

    if (btnBrowserSettingsClose) {
        btnBrowserSettingsClose.addEventListener('click', () => {
            showBrowserSettingsModal(false);
        });
    }

    if (btnBrowserFocusLeft) {
        btnBrowserFocusLeft.addEventListener('click', () => applyBrowserSplitMode('left'));
    }
    if (btnBrowserFocusSplit) {
        btnBrowserFocusSplit.addEventListener('click', () => applyBrowserSplitMode('split'));
    }
    if (btnBrowserFocusRight) {
        btnBrowserFocusRight.addEventListener('click', () => applyBrowserSplitMode('right'));
    }
    if (browserDivider) {
        browserDivider.addEventListener('pointerdown', (e) => {
            if (browserSplitMode !== 'split' || e.button !== 0) return;
            browserSplitDragging = true;
            document.body.classList.add('browser-resizing');
            if (typeof browserDivider.setPointerCapture === 'function') {
                try {
                    browserDivider.setPointerCapture(e.pointerId);
                } catch (_) {}
            }
            updateBrowserSplitRatioFromClientX(e.clientX);
            e.preventDefault();
        });
        browserDivider.addEventListener('pointermove', (e) => {
            if (!browserSplitDragging) return;
            updateBrowserSplitRatioFromClientX(e.clientX);
            e.preventDefault();
        });
        browserDivider.addEventListener('pointerup', (e) => {
            endBrowserSplitDrag(e.pointerId);
        });
        browserDivider.addEventListener('pointercancel', (e) => {
            endBrowserSplitDrag(e.pointerId);
        });
        browserDivider.addEventListener('dblclick', () => {
            setBrowserSplitRatio(50);
            applyBrowserSplitMode('split');
        });
    }
    window.addEventListener('pointerup', () => endBrowserSplitDrag());
    window.addEventListener('blur', () => endBrowserSplitDrag());

    if (browserSettingsModal) {
        browserSettingsModal.addEventListener('click', (e) => {
            if (e.target === browserSettingsModal) {
                showBrowserSettingsModal(false);
            }
        });
    }

    if (browserOptionsWrap) {
        browserOptionsWrap.addEventListener('click', (e) => {
            const btn = e.target.closest('.browser-option');
            if (!btn) return;
            const browser = btn.dataset.browser || 'system';
            saveBrowserPref(browser);
            if (recolhidoMode) {
                openSplitBrowsers();
            }
            showBrowserSettingsModal(false);
        });
    }

    if (appAlertOk) {
        appAlertOk.addEventListener('click', () => {
            if (appAlertConfirmResolver) {
                hideSystemAlert(true);
                return;
            }
            hideSystemAlert();
        });
    }
    if (appAlertCancel) {
        appAlertCancel.addEventListener('click', () => {
            hideSystemAlert(false);
        });
    }
    if (appAlertModal) {
        appAlertModal.addEventListener('click', (e) => {
            if (e.target === appAlertModal) {
                hideSystemAlert(appAlertConfirmResolver ? false : null);
            }
        });
    }

    if (planilhaGastoModal) {
        planilhaGastoModal.addEventListener('click', (e) => {
            if (e.target === planilhaGastoModal) closePlanilhaGastoModal();
        });
    }

    if (planilhaApostaModal) {
        planilhaApostaModal.addEventListener('click', (e) => {
            if (e.target === planilhaApostaModal) closePlanilhaApostaModal();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        hideSystemAlert(appAlertConfirmResolver ? false : null);
        closePlanilhaGastoModal();
        closePlanilhaApostaModal();
    });

    // ===== Geral: Update Button =====
    const btnAtualizar = document.getElementById('btn-atualizar');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', () => {
            const locationInput = document.querySelector('.location-input');
            if (locationInput && locationInput.value.trim()) {
                console.log('Location update:', locationInput.value);
                // TODO: Implement location change
                btnAtualizar.textContent = 'Atualizado!';
                setTimeout(() => {
                    btnAtualizar.textContent = 'Atualizar';
                }, 1500);
            }
        });
    }

    filterSearchToggleBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.searchTarget || '';
            const input = targetId ? document.getElementById(targetId) : null;
            if (!(input instanceof HTMLInputElement)) return;

            const shouldOpen = input.hidden;
            input.hidden = !shouldOpen;
            btn.classList.toggle('active', shouldOpen);
            if (shouldOpen) {
                input.focus();
                input.select();
            } else {
                input.value = '';
                applyHouseSearchFilters();
            }
        });
    });

    [preFilterHouseSearch, liveFilterHouseSearch].forEach((input) => {
        if (!input) return;
        input.addEventListener('input', applyHouseSearchFilters);
        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            input.value = '';
            input.hidden = true;
            filterSearchToggleBtns.forEach((btn) => {
                if (btn.dataset.searchTarget === input.id) btn.classList.remove('active');
            });
            applyHouseSearchFilters();
        });
    });

    // ===== Filter Action Buttons (Todos / Nenhum) =====
    const filterActionBtns = document.querySelectorAll('.filter-action-btn');
    filterActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const action = btn.dataset.action;
            const list = document.getElementById(targetId);
            if (list) {
                const checkboxes = list.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = action === 'all';
                });
                if (targetId === 'filtro-casa-pre' || targetId === 'filtro-casa-live') {
                    enforceHouseFilterMinimumSelection(list);
                }
                if (targetId === 'filtro-casa-pre' || targetId === 'filtro-esporte-pre') {
                    syncPreFilterSelectionsFromDOM();
                    resetTablePageAndRender();
                }
                if (targetId === 'filtro-casa-live' || targetId === 'filtro-esporte-live') {
                    syncLiveFilterSelectionsFromDOM();
                    resetTablePageAndRender();
                }
                if (targetId === 'filtro-esporte-crono') {
                    syncCronogramaSelectionsFromDOM();
                    populateChart();
                }
            }
        });
    });

    if (preFilterHouseList) {
        preFilterHouseList.addEventListener('change', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) || el.type !== 'checkbox') return;
            enforceHouseFilterMinimumSelection(preFilterHouseList, el);
            syncPreFilterSelectionsFromDOM();
            resetTablePageAndRender();
        });
    }
    if (preFilterSportList) {
        preFilterSportList.addEventListener('change', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) || el.type !== 'checkbox') return;
            syncPreFilterSelectionsFromDOM();
            resetTablePageAndRender();
        });
    }
    if (liveFilterHouseList) {
        liveFilterHouseList.addEventListener('change', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) || el.type !== 'checkbox') return;
            enforceHouseFilterMinimumSelection(liveFilterHouseList, el);
            syncLiveFilterSelectionsFromDOM();
            resetTablePageAndRender();
        });
    }
    if (liveFilterSportList) {
        liveFilterSportList.addEventListener('change', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) || el.type !== 'checkbox') return;
            syncLiveFilterSelectionsFromDOM();
            resetTablePageAndRender();
        });
    }
    if (cronogramaSportList) {
        cronogramaSportList.addEventListener('change', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) || el.type !== 'checkbox') return;
            syncCronogramaSelectionsFromDOM();
            populateChart();
        });
    }

    preFilterPercentInputs.forEach((input) => {
        input.addEventListener('input', resetTablePageAndRender);
        input.addEventListener('change', resetTablePageAndRender);
    });
    if (preFilterMaxEnabled) {
        preFilterMaxEnabled.addEventListener('change', resetTablePageAndRender);
    }
    if (preFilterMaxValue) {
        preFilterMaxValue.addEventListener('input', resetTablePageAndRender);
        preFilterMaxValue.addEventListener('change', resetTablePageAndRender);
    }

    // ===== Limpar Lista Button =====
    const btnLimpar = document.querySelector('.filter-btn.btn-red');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            const percentInputs = document.querySelectorAll('.percent-input');
            percentInputs.forEach(input => {
                input.value = '0.00';
            });
            resetTablePageAndRender();
        });
    }

    // ===== Cronograma Chart =====
    function populateChart() {
        const chartBody = document.getElementById('chart-body');
        if (!chartBody) return;

        const source = buildCronogramaFromArbs(arbsBuffer);
        const data = (source || []).map((item, idx) => {
            const hour = Number.isFinite(Number(item && item.hour)) ? Number(item.hour) : idx;
            const label = (item && item.label) ? String(item.label) : formatCronogramaHourLabel(hour);
            const live = parseNumber(item && item.live, 0);
            const prelive = parseNumber(item && item.prelive, 0);
            const total = parseNumber(item && item.total, live + prelive);
            return { label, live, prelive, total };
        });

        const maxTotal = Math.max(1, ...data.map((d) => d.total));
        chartBody.innerHTML = '';

        data.forEach((item, idx) => {
            const total = item.total;
            const barWidth = (total / maxTotal) * 100;
            const barClass = (idx % 2 === 0) ? 'bar-purple' : 'bar-blue';

            const row = document.createElement('div');
            row.className = 'chart-row';
            row.innerHTML = `
                <span class="chart-label">${escapeHtml(item.label)}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar ${barClass}" style="width: ${barWidth}%;"></div>
                    <span class="chart-bar-value">${escapeHtml(String(total))} jogos</span>
                </div>
            `;
            chartBody.appendChild(row);
        });

        requestAnimationFrame(() => {
            chartBody.querySelectorAll('.chart-bar').forEach(bar => {
                const w = bar.style.width;
                bar.style.width = '0%';
                requestAnimationFrame(() => {
                    bar.style.width = w;
                });
            });
        });
    }
});


