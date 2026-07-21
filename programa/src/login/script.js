// ===== Login Screen Script =====

document.addEventListener('DOMContentLoaded', () => {
    if (window.__appLog) window.__appLog('info', 'PAGE', 'loaded', { page: 'login', url: typeof document !== 'undefined' ? document.URL : null });
    const form = document.getElementById('login-form');
    const inputEmail = document.getElementById('input-email');
    const inputPassword = document.getElementById('input-password');
    const inputName = document.getElementById('input-name');
    const inputDocument = document.getElementById('input-document');
    const inputPhone = document.getElementById('input-phone');
    const loginTitle = document.getElementById('login-title');
    const authTabs = document.querySelector('.auth-tabs');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const registerFields = document.getElementById('register-fields');
    const registerAccountStep = document.getElementById('register-account-step');
    const registerPlanStep = document.getElementById('register-plan-step');
    const authInputGroups = document.querySelectorAll('.auth-input-group');
    const plansPanel = document.getElementById('plans-panel');
    const pixPanel = document.getElementById('pix-panel');
    const pixStatus = document.getElementById('pix-status');
    const pixCode = document.getElementById('pix-code');
    const pixQrImage = document.getElementById('pix-qr-image');
    const pixQrFallback = document.getElementById('pix-qr-fallback');
    const btnCopyPix = document.getElementById('btn-copy-pix');
    const step2fa = document.getElementById('step-2fa');
    const inputCode = document.getElementById('input-code');
    const btnVerifyCode = document.getElementById('btn-verify-code');
    const btnValidate = document.getElementById('btn-validate');
    const loginError = document.getElementById('login-error');
    const registerNotice = document.getElementById('register-notice');
    const registerNoticeText = document.getElementById('register-notice-text');
    const btnRegisterLogin = document.getElementById('btn-register-login');
    const btnRegisterPlan = document.getElementById('btn-register-plan');
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');
    const supportLink = document.getElementById('support-link');
    const btnRenewPlaceholder = document.getElementById('btn-renew-placeholder');

    let tempToken = null;
    let config = null;
    let authMode = 'login';
    let registerStep = 'account';
    let checkoutFromLogin = false;
    let registeredUser = null;
    let selectedPlanId = null;
    let currentPayment = null;
    let paymentPollTimer = null;
    let pixQrRenderSeq = 0;
    let checkoutTargetAccess = '';
    const SAVED_CREDENTIALS_KEY = 'octosure_saved_credentials';
    const SAVED_CREDENTIALS_KEY_LEGACY = 'polvo_saved_credentials';
    const USER_PROFILE_KEY = 'octosure_user_profile';
    const CHECKOUT_CONTEXT_KEY = 'octosure_checkout_context';
    const DEFAULT_BASE_URL = 'https://octosure.net';

    function normalizeBaseUrl(rawUrl) {
        const txt = String(rawUrl || '').trim().replace(/\s+/g, '');
        if (!txt) return DEFAULT_BASE_URL;
        return txt.replace(/\/+$/, '');
    }

    function apiUrl(baseUrl, path) {
        const base = normalizeBaseUrl(baseUrl);
        const cleanPath = String(path || '').replace(/^\/+/, '');
        return `${base}/painel/api/${cleanPath}`;
    }

    function readCheckoutContext() {
        try {
            const raw = localStorage.getItem(CHECKOUT_CONTEXT_KEY);
            localStorage.removeItem(CHECKOUT_CONTEXT_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const createdAt = Number(parsed.createdAt || 0);
            if (createdAt && Date.now() - createdAt > 10 * 60 * 1000) return null;
            return parsed;
        } catch (_) {
            return null;
        }
    }

    function onlyDigits(value) {
        return String(value || '').replace(/[^0-9]/g, '');
    }

    function formatCpfCnpj(value) {
        const digits = onlyDigits(value).slice(0, 14);
        if (digits.length <= 11) {
            return digits
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        return digits
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    function formatPhone(value) {
        const digits = onlyDigits(value).slice(0, 11);
        if (digits.length <= 10) {
            return digits
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
        }
        return digits
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    }

    function isValidCpf(cpf) {
        const digits = onlyDigits(cpf);
        if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
        let digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== Number(digits[9])) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        return digit === Number(digits[10]);
    }

    function isValidCnpj(cnpj) {
        const digits = onlyDigits(cnpj);
        if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
        const calc = (size) => {
            const weights = size === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            const sum = weights.reduce((acc, weight, index) => acc + Number(digits[index]) * weight, 0);
            const rest = sum % 11;
            return rest < 2 ? 0 : 11 - rest;
        };
        return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
    }

    function isValidDocument(value) {
        const digits = onlyDigits(value);
        return (digits.length === 11 && isValidCpf(digits)) || (digits.length === 14 && isValidCnpj(digits));
    }

    function isValidPhone(value) {
        const digits = onlyDigits(value);
        return (digits.length === 10 || digits.length === 11) && !/^(\d)\1+$/.test(digits);
    }

    function loadSavedCredentials() {
        try {
            const raw = localStorage.getItem(SAVED_CREDENTIALS_KEY) ?? localStorage.getItem(SAVED_CREDENTIALS_KEY_LEGACY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;
            if (inputEmail && typeof parsed.email === 'string') inputEmail.value = parsed.email;
            if (inputPassword && typeof parsed.password === 'string') inputPassword.value = parsed.password;
        } catch (_) {}
    }

    function saveCredentials(email, password) {
        try {
            localStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({
                email: String(email || ''),
                password: String(password || ''),
            }));
        } catch (_) {}
    }

    // Window controls
    btnMinimize.addEventListener('click', () => window.polvo.minimizeApp());
    btnMaximize.addEventListener('click', () => window.polvo.maximizeApp());
    btnClose.addEventListener('click', () => window.polvo.closeApp());

    window.polvo.onMaximizeChange((isMaximized) => {
        btnMaximize.querySelector('.icon-maximize').style.display = isMaximized ? 'none' : '';
        btnMaximize.querySelector('.icon-restore').style.display = isMaximized ? '' : 'none';
        btnMaximize.title = isMaximized ? 'Restaurar' : 'Maximizar';
    });

    function getLoginErrorCode(raw, data) {
        const code = (raw && raw.code) || (data && data.code) || '';
        return String(code || '').trim().toUpperCase();
    }

    function resolveLoginError(raw, data) {
        const code = getLoginErrorCode(raw, data);
        if (code === 'NO_ACTIVE_PLAN') {
            return { code, message: 'Conta sem plano ativo. Assine um plano para continuar.' };
        }
        if (code === 'ACCOUNT_DISABLED') {
            return { code, message: 'Este usuario foi desativado. Fale com o suporte.' };
        }
        if (code === 'PLAN_EXPIRED') {
            return { code, message: 'Plano vencido. Assine um plano para continuar.' };
        }
        return {
            code,
            message: (raw && raw.message) || (data && data.message) || 'E-mail ou senha invalidos.',
        };
    }

    function showError(message, options = {}) {
        const code = String(options.code || '').trim().toUpperCase();
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
        if (btnRenewPlaceholder) {
            btnRenewPlaceholder.style.display = (code === 'PLAN_EXPIRED' || code === 'NO_ACTIVE_PLAN') ? 'block' : 'none';
        }
    }

    function paymentStatusLabel(status) {
        const key = String(status || '').trim().toLowerCase();
        const labels = {
            created: 'Criado',
            waiting_payment: 'Aguardando pagamento',
            pending: 'Aguardando pagamento',
            processing: 'Processando pagamento',
            paid: 'Pago',
            captured: 'Pago',
            approved: 'Pago',
            completed: 'Pago',
            canceled: 'Cancelado',
            cancelled: 'Cancelado',
            expired: 'Expirado',
            failed: 'Falhou',
            refused: 'Recusado',
            refunded: 'Reembolsado',
        };
        return labels[key] || (key ? key.replace(/_/g, ' ') : 'Aguardando pagamento');
    }

    function hideRegisterNotice() {
        if (registerNotice) registerNotice.style.display = 'none';
    }

    function showRegisterNotice(message, options = {}) {
        if (!registerNotice || !registerNoticeText) return;
        registerNoticeText.textContent = message;
        registerNotice.style.display = 'grid';
        if (btnRegisterPlan) btnRegisterPlan.style.display = options.showPlan ? '' : 'none';
        if (btnRegisterLogin) btnRegisterLogin.style.display = options.showLogin === false ? 'none' : '';
    }

    function clearError() {
        if (loginError) {
            loginError.textContent = '';
            loginError.style.display = 'none';
        }
        hideRegisterNotice();
        if (btnRenewPlaceholder) {
            btnRenewPlaceholder.style.display = 'none';
        }
        inputEmail.classList.remove('error');
        inputPassword.classList.remove('error');
        if (inputName) inputName.classList.remove('error');
        if (inputDocument) inputDocument.classList.remove('error');
        if (inputPhone) inputPhone.classList.remove('error');
        if (inputCode) inputCode.classList.remove('error');
    }

    function submitLabel() {
        if (authMode !== 'register') return 'Entrar';
        return registerStep === 'account' ? 'Continuar' : 'Gerar Pix';
    }

    function setRegisterStep(step) {
        registerStep = step === 'plan' ? 'plan' : 'account';
        if (registerAccountStep) registerAccountStep.style.display = registerStep === 'account' ? 'grid' : 'none';
        if (registerPlanStep) registerPlanStep.style.display = registerStep === 'plan' ? 'grid' : 'none';
        authInputGroups.forEach((group) => {
            group.style.display = (checkoutFromLogin || registerStep === 'plan') ? 'none' : '';
        });
        if (loginTitle) {
            if (checkoutFromLogin) {
                loginTitle.innerHTML = registerStep === 'plan'
                    ? 'Escolha seu <strong>plano</strong>'
                    : 'Complete seus <strong>dados</strong>';
            } else {
                loginTitle.innerHTML = registerStep === 'plan'
                    ? 'Escolha seu <strong>plano</strong>'
                    : 'Crie sua <strong>conta</strong>';
            }
        }
        if (registerFields) registerFields.style.display = 'grid';
        if (pixPanel) pixPanel.style.display = 'none';
        if (btnValidate) {
            btnValidate.style.display = '';
            btnValidate.textContent = submitLabel();
        }
        if (registerStep === 'plan') loadPlans();
    }

    function setAuthMode(mode, options = {}) {
        authMode = mode === 'register' ? 'register' : 'login';
        checkoutFromLogin = authMode === 'register' && options.checkoutFromLogin === true;
        document.body.classList.toggle('auth-login', authMode === 'login');
        document.body.classList.toggle('auth-register', authMode === 'register');
        document.body.classList.toggle('plan-checkout', checkoutFromLogin);
        if (authTabs) authTabs.style.display = checkoutFromLogin ? 'none' : '';
        if (tabLogin) tabLogin.classList.toggle('active', authMode === 'login');
        if (tabRegister) tabRegister.classList.toggle('active', authMode === 'register');
        if (registerFields) registerFields.style.display = authMode === 'register' ? 'grid' : 'none';
        if (btnValidate) {
            btnValidate.style.display = '';
            btnValidate.textContent = submitLabel();
        }
        if (pixPanel && authMode !== 'register') pixPanel.style.display = 'none';
        clearError();
        if (authMode === 'register') {
            if (!checkoutFromLogin) registeredUser = null;
            setRegisterStep('account');
        } else {
            checkoutFromLogin = false;
            document.body.classList.remove('plan-checkout');
            if (authTabs) authTabs.style.display = '';
            authInputGroups.forEach((group) => { group.style.display = ''; });
            if (loginTitle) loginTitle.innerHTML = 'Entre com <strong>e-mail</strong> e <strong>senha</strong>';
        }
    }

    function formatMoney(cents) {
        const value = Number(cents || 0) / 100;
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function loadPlans() {
        if (!plansPanel || plansPanel.dataset.loaded === '1') return;
        try {
            if (!config) config = await window.polvo.getSocketConfig();
            const baseUrl = normalizeBaseUrl((config && config.url) || DEFAULT_BASE_URL);
            const res = await fetch(apiUrl(baseUrl, 'plans/list.php'));
            const raw = await res.json().catch(() => ({}));
            if (!res.ok || raw.success === false) throw new Error(raw.message || 'Falha ao carregar planos.');
            const durations = raw.data && Array.isArray(raw.data.durations) ? raw.data.durations : [];
            renderPlans(durations);
            plansPanel.dataset.loaded = '1';
        } catch (err) {
            plansPanel.innerHTML = `<p class="plans-loading">${(err && err.message) || 'Nao foi possivel carregar os planos.'}</p>`;
        }
    }

    function renderPlans(durations) {
        if (!plansPanel) return;
        const firstDuration = durations[0];
        const firstVisiblePlan = firstDuration && firstDuration.plans && firstDuration.plans[0] ? firstDuration.plans[0] : null;
        const targetAccess = String(checkoutTargetAccess || '').trim().toLowerCase();
        const firstMatchingPlan = firstDuration && Array.isArray(firstDuration.plans)
            ? firstDuration.plans.find((plan) => String(plan.accessType || '').toLowerCase() === targetAccess)
            : null;
        selectedPlanId = (firstMatchingPlan || firstVisiblePlan) ? (firstMatchingPlan || firstVisiblePlan).id : null;
        const durationButtons = durations.map((duration, index) => (
            `<button type="button" class="duration-btn ${index === 0 ? 'active' : ''}" data-duration="${Number(duration.days || 0)}">${escapeHtml(duration.label)}</button>`
        )).join('');
        const groups = durations.map((duration, index) => {
            const cards = (duration.plans || []).map((plan, planIndex) => (
                `<button type="button" class="plan-card ${Number(plan.id || 0) === Number(selectedPlanId || 0) ? 'active' : ''}" data-plan-id="${Number(plan.id || 0)}" data-access-type="${escapeHtml(plan.accessType || '')}">
                    <strong>${escapeHtml(plan.name)}</strong>
                    <span>${escapeHtml(plan.description || '')}</span>
                    <b>${formatMoney(plan.priceCents)}</b>
                </button>`
            )).join('');
            return `<div class="plans-group" data-duration-group="${Number(duration.days || 0)}" style="${index === 0 ? '' : 'display:none'}">${cards}</div>`;
        }).join('');
        plansPanel.innerHTML = `<div class="duration-row">${durationButtons}</div>${groups}`;
    }

    if (plansPanel) {
        plansPanel.addEventListener('click', (event) => {
            const durationBtn = event.target.closest('.duration-btn');
            if (durationBtn) {
                const duration = durationBtn.getAttribute('data-duration');
                plansPanel.querySelectorAll('.duration-btn').forEach((btn) => btn.classList.toggle('active', btn === durationBtn));
                plansPanel.querySelectorAll('.plans-group').forEach((group) => {
                    const show = group.getAttribute('data-duration-group') === duration;
                    group.style.display = show ? '' : 'none';
                    if (show) {
                        const target = checkoutTargetAccess
                            ? group.querySelector(`.plan-card[data-access-type="${checkoutTargetAccess}"]`)
                            : null;
                        const first = target || group.querySelector('.plan-card');
                        if (first) first.click();
                    }
                });
                return;
            }
            const planCard = event.target.closest('.plan-card');
            if (planCard) {
                plansPanel.querySelectorAll('.plan-card').forEach((card) => card.classList.toggle('active', card === planCard));
                selectedPlanId = Number(planCard.getAttribute('data-plan-id') || 0);
            }
        });
    }

    async function registerAccount(email, password) {
        if (!config) config = await window.polvo.getSocketConfig();
        const baseUrl = normalizeBaseUrl((config && config.url) || DEFAULT_BASE_URL);
        const documentNumber = inputDocument ? onlyDigits(inputDocument.value) : '';
        const phoneNumber = inputPhone ? onlyDigits(inputPhone.value) : '';
        const res = await fetch(apiUrl(baseUrl, 'auth/register.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: inputName ? inputName.value.trim() : '',
                email,
                password,
                document: documentNumber,
                phone: phoneNumber,
            }),
        });
        const raw = await res.json().catch(() => ({}));
        if (!res.ok || raw.success === false) {
            const code = String((raw && raw.code) || '').toUpperCase();
            if (code === 'EMAIL_EXISTS') {
                const data = raw && raw.data && typeof raw.data === 'object' ? raw.data : {};
                const hasActivePlan = data.hasActivePlan === true;
                const passwordMatches = data.passwordMatches === true;
                registeredUser = {
                    userId: data.userId ? Number(data.userId) : 0,
                    name: inputName ? inputName.value.trim() : '',
                    email,
                    password,
                    document: documentNumber,
                    phone: phoneNumber,
                    baseUrl,
                    existing: true,
                };
                if (hasActivePlan && checkoutFromLogin && passwordMatches) {
                    hideRegisterNotice();
                    setRegisterStep('plan');
                    return registeredUser;
                }
                if (hasActivePlan) {
                    showRegisterNotice('Este e-mail ja esta cadastrado. Faca login para acessar sua conta.', { showLogin: true, showPlan: false });
                    return null;
                }
                if (!passwordMatches) {
                    showRegisterNotice('Este e-mail ja esta cadastrado. Use a senha dessa conta para assinar ou faca login.', { showLogin: true, showPlan: false });
                    return null;
                }
                if (checkoutFromLogin) {
                    hideRegisterNotice();
                } else {
                    showRegisterNotice('Este e-mail ja esta cadastrado e nao possui plano ativo. Escolha um plano para assinar.', { showLogin: true, showPlan: false });
                }
                setRegisterStep('plan');
                return registeredUser;
            }
            throw new Error(raw.message || 'Nao foi possivel criar cadastro.');
        }
        registeredUser = {
            userId: raw.data && raw.data.userId ? Number(raw.data.userId) : 0,
            name: inputName ? inputName.value.trim() : '',
            email,
            password,
            document: documentNumber,
            phone: phoneNumber,
            baseUrl,
        };
        return registeredUser;
    }

    async function createRegistrationPix() {
        if (!registeredUser) {
            throw new Error('Finalize os dados da conta antes de escolher o plano.');
        }
        const res = await fetch(apiUrl(registeredUser.baseUrl, 'payments/create_pix.php'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: registeredUser.userId,
                name: registeredUser.name,
                email: registeredUser.email,
                planId: selectedPlanId,
                document: registeredUser.document,
                phone: registeredUser.phone,
            }),
        });
        const raw = await res.json().catch(() => ({}));
        if (!res.ok || raw.success === false) {
            const message = raw.message || 'Nao foi possivel gerar Pix.';
            if (registeredUser && registeredUser.existingAuthenticated && /CPF|CNPJ|telefone|DDD|document|phone/i.test(message)) {
                showRegisterNotice('Complete seus dados uma vez para gerar o Pix com seguranca. Depois disso o app usa esses dados automaticamente.', { showLogin: false, showPlan: false });
                setRegisterStep('account');
            }
            throw new Error(message);
        }
        currentPayment = raw.data && raw.data.payment ? raw.data.payment : null;
        if (!currentPayment && raw.data && raw.data.externalRef) currentPayment = raw.data;
        showPixPayment(currentPayment, registeredUser.baseUrl);
    }

    function renderPixQr(qrImage, qrCodeText) {
        const seq = ++pixQrRenderSeq;
        if (pixQrImage) {
            pixQrImage.removeAttribute('src');
            pixQrImage.style.display = 'none';
        }
        if (pixQrFallback) {
            pixQrFallback.textContent = qrImage ? 'Carregando QR Code...' : 'QR Code indisponivel. Use o Pix copia e cola.';
            pixQrFallback.style.display = '';
        }
        if (!qrImage) {
            if (window.__appLog) {
                window.__appLog('warn', 'PIX_QR', 'API nao retornou imagem do QR Code', {
                    pixLength: String(qrCodeText || '').length,
                    pixStart: String(qrCodeText || '').slice(0, 32),
                });
            }
            return;
        }
        if (pixQrImage) {
            pixQrImage.onload = () => {
                if (seq === pixQrRenderSeq && pixQrFallback) pixQrFallback.style.display = 'none';
            };
            pixQrImage.onerror = () => {
                if (window.__appLog) {
                    window.__appLog('error', 'PIX_QR', 'Imagem do QR Code da API nao carregou', {
                        imageStart: String(qrImage || '').slice(0, 64),
                        pixLength: String(qrCodeText || '').length,
                    });
                }
                if (seq === pixQrRenderSeq && pixQrFallback) {
                    pixQrFallback.textContent = 'Nao foi possivel carregar a imagem do QR Code. Use o Pix copia e cola.';
                    pixQrFallback.style.display = '';
                }
            };
            pixQrImage.src = qrImage;
            pixQrImage.style.display = '';
        }
    }

    function showPixPayment(payment, baseUrl) {
        if (!payment || !pixPanel || !pixCode || !pixStatus) return;
        if (registerFields) registerFields.style.display = 'none';
        if (btnValidate) btnValidate.style.display = 'none';
        authInputGroups.forEach((group) => { group.style.display = 'none'; });
        if (loginTitle) loginTitle.innerHTML = 'Pague com <strong>Pix</strong>';
        pixPanel.style.display = 'grid';
        pixStatus.textContent = `Status: ${paymentStatusLabel(payment.status)}`;
        const qrCodeText = payment.pix && payment.pix.qrCode ? payment.pix.qrCode : '';
        const qrImage = payment.pix && payment.pix.qrImage ? payment.pix.qrImage : '';
        pixCode.value = qrCodeText;
        renderPixQr(qrImage, qrCodeText);
        if (registeredUser) saveCredentials(registeredUser.email, registeredUser.password);
        if (paymentPollTimer) clearInterval(paymentPollTimer);
        paymentPollTimer = setInterval(async () => {
            try {
                const url = `${apiUrl(baseUrl, 'payments/status.php')}?external_ref=${encodeURIComponent(payment.externalRef || '')}`;
                const res = await fetch(url);
                const raw = await res.json().catch(() => ({}));
                const status = raw && raw.data && raw.data.status ? raw.data.status : '';
                if (status) pixStatus.textContent = `Status: ${paymentStatusLabel(status)}`;
                if (status === 'paid' || status === 'captured') {
                    clearInterval(paymentPollTimer);
                    paymentPollTimer = null;
                    pixStatus.textContent = 'Pagamento confirmado. Seu plano foi ativado.';
                    setAuthMode('login');
                }
            } catch (_) {}
        }, 5000);
    }

    function setLoading(loading) {
        btnValidate.disabled = loading;
        if (loading) {
            btnValidate.classList.add('loading');
            btnValidate.textContent = 'Conectando...';
        } else {
            btnValidate.classList.remove('loading');
            btnValidate.textContent = submitLabel();
        }
        if (btnVerifyCode) {
            btnVerifyCode.disabled = loading;
            if (loading) btnVerifyCode.classList.add('loading');
            else btnVerifyCode.classList.remove('loading');
        }
    }

    inputEmail.addEventListener('input', clearError);
    inputPassword.addEventListener('input', clearError);
    if (inputCode) {
        inputCode.addEventListener('input', () => {
            clearError();
            inputCode.value = inputCode.value.replace(/[^0-9]/g, '');
        });
    }
    if (inputDocument) {
        inputDocument.addEventListener('input', () => {
            clearError();
            inputDocument.value = formatCpfCnpj(inputDocument.value);
        });
    }
    if (inputPhone) {
        inputPhone.addEventListener('input', () => {
            clearError();
            inputPhone.value = formatPhone(inputPhone.value);
        });
    }
    if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => setAuthMode('register'));
    if (btnRegisterLogin) {
        btnRegisterLogin.addEventListener('click', () => {
            setAuthMode('login');
            if (inputEmail) inputEmail.focus();
        });
    }
    if (btnRegisterPlan) {
        btnRegisterPlan.addEventListener('click', () => {
            hideRegisterNotice();
            setRegisterStep('plan');
        });
    }
    if (btnCopyPix) {
        btnCopyPix.addEventListener('click', async () => {
            const value = pixCode ? pixCode.value : '';
            if (!value) return;
            try {
                await navigator.clipboard.writeText(value);
                btnCopyPix.textContent = 'Copiado';
                setTimeout(() => { btnCopyPix.textContent = 'Copiar Pix'; }, 1400);
            } catch (_) {}
        });
    }

    /**
     * Decode base64 or base64url socketKey to token string (userId:timestamp:signature).
     */
    function decodeSocketKey(socketKeyBase64) {
        let b64 = (socketKeyBase64 || '').trim();
        if (!b64) return null;
        // Base64URL: replace - and _ with + and /
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4;
        if (pad) b64 += '===='.slice(0, 4 - pad);
        try {
            return atob(b64);
        } catch (e) {
            return null;
        }
    }

    async function connectSocketAndNavigate(socketKeyBase64, userProfile) {
        if (!config || typeof io === 'undefined') {
            showError('ConfiguraÃ§Ã£o ou Socket nÃ£o disponÃ­vel.');
            setLoading(false);
            return;
        }
        const socketBase = normalizeBaseUrl((config && config.url) || DEFAULT_BASE_URL);
        const token = decodeSocketKey(socketKeyBase64);
        if (!token || token.split(':').length !== 3) {
            showError('Token invÃ¡lido (formato esperado: userId:timestamp:signature).');
            setLoading(false);
            return;
        }
        const socket = io(socketBase, {
            transports: ['polling', 'websocket'],
            auth: { token },
            query: { token },
        });
        socket.on('connect', () => {
            if (window.__appLog) window.__appLog('info', 'SOCKET', 'connect success', { url: socketBase, socketId: socket.id, transport: socket.io && socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.name });
            window.polvo.setSocketToken(token, socketBase).then(() => {
                try {
                    if (userProfile && typeof userProfile === 'object') {
                        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
                    }
                } catch (_) {}
                window.polvo.navigateToDashboard();
            });
        });
        socket.on('connect_error', (err) => {
            if (window.__appLog && window.__serializeSocketError) {
                window.__appLog('error', 'SOCKET', 'connect_error', window.__serializeSocketError(err, config && config.url));
            }
            const msg = (err && err.message) ? err.message : String(err);
            showError(msg || 'Falha ao conectar. Tente novamente.');
            setLoading(false);
        });
        socket.on('error', (msg) => {
            const str = typeof msg === 'string' ? msg : (msg && msg.message) ? msg.message : String(msg);
            if (window.__appLog) {
                const payload = typeof msg === 'object' && msg !== null
                    ? window.__serializeSocketError(msg, config && config.url)
                    : { message: str };
                window.__appLog('error', 'SOCKET', 'error', payload);
            }
            if (str.includes('Session replaced')) {
                showError('SessÃ£o substituÃ­da por outra conexÃ£o.');
            } else if (str) {
                showError(str);
            }
            setLoading(false);
        });
    }

    // Step 1: email + password submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (step2fa && step2fa.style.display !== 'none') {
            // Step 2 is visible: do not submit form for 2FA (handled by btn-verify-code)
            return;
        }

        const directAuthenticatedCheckout = authMode === 'register'
            && checkoutFromLogin
            && registeredUser
            && registeredUser.existingAuthenticated === true;
        const email = (inputEmail && inputEmail.value)
            ? inputEmail.value.trim()
            : (directAuthenticatedCheckout ? String(registeredUser.email || '') : '');
        const password = (inputPassword && inputPassword.value) ? inputPassword.value : '';

        if (!email) {
            showError('Informe o e-mail.');
            if (inputEmail) inputEmail.classList.add('error');
            inputEmail.focus();
            return;
        }
        if (!password && !directAuthenticatedCheckout) {
            showError('Informe a senha.');
            if (inputPassword) inputPassword.classList.add('error');
            inputPassword.focus();
            return;
        }

        clearError();
        setLoading(true);

        try {
            if (authMode === 'register') {
                if (registerStep === 'account') {
                    const name = inputName ? inputName.value.trim() : '';
                    const documentNumber = inputDocument ? onlyDigits(inputDocument.value) : '';
                    const phoneNumber = inputPhone ? onlyDigits(inputPhone.value) : '';
                    if (!name) {
                        showError('Informe seu nome completo.');
                        if (inputName) inputName.classList.add('error');
                        setLoading(false);
                        return;
                    }
                    if (!isValidDocument(documentNumber)) {
                        showError('Informe CPF ou CNPJ valido.');
                        if (inputDocument) inputDocument.classList.add('error');
                        setLoading(false);
                        return;
                    }
                    if (!isValidPhone(phoneNumber)) {
                        showError('Informe telefone com DDD valido.');
                        if (inputPhone) inputPhone.classList.add('error');
                        setLoading(false);
                        return;
                    }
                    if (directAuthenticatedCheckout) {
                        registeredUser.name = name;
                        registeredUser.document = documentNumber;
                        registeredUser.phone = phoneNumber;
                        setRegisterStep('plan');
                        setLoading(false);
                        return;
                    }
                    const account = await registerAccount(email, password);
                    if (!account) {
                        setLoading(false);
                        return;
                    }
                    setRegisterStep('plan');
                    setLoading(false);
                    return;
                }

                if (!selectedPlanId) {
                    showError('Escolha um plano.');
                    setLoading(false);
                    return;
                }
                await createRegistrationPix();
                setLoading(false);
                return;
            }

            if (!config) config = await window.polvo.getSocketConfig();
            const baseUrl = normalizeBaseUrl((config && config.url) || DEFAULT_BASE_URL);
            const loginUrl = apiUrl(baseUrl, 'auth/login.php');
            const bodyPayload = { email, password: password ? '***' : '' };
            const loginStart = Date.now();
            if (window.__appLog) window.__appLog('info', 'BACKEND', 'POST /api/auth/login (request)', { url: loginUrl, body: bodyPayload });

            const res = await fetch(loginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const durationMs = Date.now() - loginStart;
            const raw = await res.json().catch(() => ({}));
            const data = raw.data != null ? raw.data : raw;

            if (window.__appLog) {
                const respPayload = { status: res.status, statusText: res.statusText, ok: res.ok, durationMs, requires2fa: data.requires2fa, hasSocketKey: !!data.socketKey };
                if (!res.ok) respPayload.errorMessage = (raw.message || data.message) || res.statusText;
                window.__appLog('info', 'BACKEND', 'POST /api/auth/login (response)', respPayload);
            }

            if (!res.ok) {
                const loginErrorInfo = resolveLoginError(raw, data);
                showError(loginErrorInfo.message, { code: loginErrorInfo.code });
                setLoading(false);
                return;
            }

            if (data.requires2fa === true && data.tempToken) {
                tempToken = data.tempToken;
                if (step2fa) step2fa.style.display = 'block';
                if (inputCode) {
                    inputCode.value = '';
                    inputCode.focus();
                }
                if (btnVerifyCode) btnVerifyCode.style.display = '';
                setLoading(false);
                return;
            }

            if (data.socketKey) {
                saveCredentials(email, password);
                await connectSocketAndNavigate(data.socketKey, data.user);
                return;
            }

            showError('Resposta invÃ¡lida do servidor.');
            setLoading(false);
        } catch (err) {
            if (window.__appLog) window.__appLog('error', 'BACKEND', 'POST /api/auth/login (exception)', { message: err && err.message, name: err && err.name, stack: err && err.stack });
            const detail = (err && err.message) ? String(err.message) : 'falha desconhecida';
            showError(`Erro de rede (${detail}). Verifique a conexao com a API.`);
            setLoading(false);
        }
    });

    // Step 2: verify 2FA code
    if (btnVerifyCode) {
        btnVerifyCode.addEventListener('click', async () => {
            const code = (inputCode && inputCode.value) ? inputCode.value.trim() : '';
            if (!code || code.length !== 6) {
                showError('Informe o cÃ³digo de 6 dÃ­gitos.');
                if (inputCode) inputCode.classList.add('error');
                return;
            }
            if (!tempToken) {
                showError('SessÃ£o expirada. FaÃ§a login novamente.');
                return;
            }

            clearError();
            setLoading(true);
            btnVerifyCode.classList.add('loading');
            btnVerifyCode.textContent = 'Verificando...';

            try {
                if (!config) config = await window.polvo.getSocketConfig();
                const baseUrl = normalizeBaseUrl((config && config.url) || DEFAULT_BASE_URL);
                const verifyUrl = apiUrl(baseUrl, 'auth/verify-2fa.php');
                const verifyStart = Date.now();
                if (window.__appLog) window.__appLog('info', 'BACKEND', 'POST /api/auth/verify-2fa (request)', { url: verifyUrl, codeLength: (code || '').length });

                const res = await fetch(verifyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tempToken, code }),
                });
                const durationMs = Date.now() - verifyStart;
                const raw = await res.json().catch(() => ({}));
                const data = raw.data != null ? raw.data : raw;

                if (window.__appLog) {
                    const respPayload = { status: res.status, statusText: res.statusText, ok: res.ok, durationMs, hasSocketKey: !!data.socketKey };
                    if (!res.ok) respPayload.errorMessage = (raw.message || data.message) || res.statusText;
                    window.__appLog('info', 'BACKEND', 'POST /api/auth/verify-2fa (response)', respPayload);
                }

                if (!res.ok) {
                    showError((raw.message || data.message) || 'CÃ³digo invÃ¡lido.');
                    setLoading(false);
                    btnVerifyCode.classList.remove('loading');
                    btnVerifyCode.textContent = 'Verificar cÃ³digo';
                    return;
                }

                if (data.socketKey) {
                    await connectSocketAndNavigate(data.socketKey, data.user);
                    return;
                }

                showError('Resposta invÃ¡lida do servidor.');
                setLoading(false);
            } catch (err) {
                if (window.__appLog) window.__appLog('error', 'BACKEND', 'POST /api/auth/verify-2fa (exception)', { message: err && err.message, name: err && err.name, stack: err && err.stack });
                const detail = (err && err.message) ? String(err.message) : 'falha desconhecida';
                showError(`Erro de rede (${detail}). Verifique a conexao com a API.`);
                setLoading(false);
            }
            btnVerifyCode.classList.remove('loading');
            btnVerifyCode.textContent = 'Verificar cÃ³digo';
        });
    }

    supportLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Support link clicked');
    });

    if (btnRenewPlaceholder) {
        btnRenewPlaceholder.addEventListener('click', (e) => {
            e.preventDefault();
            const email = inputEmail ? inputEmail.value : '';
            const password = inputPassword ? inputPassword.value : '';
            if (!email || !password) {
                showError('Informe e-mail e senha para continuar.');
                return;
            }
            registeredUser = null;
            setAuthMode('register', { checkoutFromLogin: true });
            if (inputEmail) inputEmail.value = email;
            if (inputPassword) inputPassword.value = password;
            hideRegisterNotice();
            if (inputName) inputName.focus();
        });
    }

    (async () => {
        const checkoutContext = readCheckoutContext();
        checkoutTargetAccess = checkoutContext && checkoutContext.targetAccess
            ? String(checkoutContext.targetAccess).trim().toLowerCase()
            : '';
        setAuthMode(checkoutContext ? 'register' : 'login', checkoutContext ? { checkoutFromLogin: true } : {});
        loadSavedCredentials();
        config = await window.polvo.getSocketConfig();
        if (checkoutContext && inputEmail && checkoutContext.email) {
            inputEmail.value = String(checkoutContext.email);
        }
        if (checkoutContext && checkoutContext.authenticated && Number(checkoutContext.userId || 0) > 0) {
            const baseUrl = normalizeBaseUrl((config && config.url) || DEFAULT_BASE_URL);
            registeredUser = {
                userId: Number(checkoutContext.userId || 0),
                name: String(checkoutContext.name || ''),
                email: String(checkoutContext.email || ''),
                password: '',
                document: '',
                phone: '',
                baseUrl,
                existing: true,
                existingAuthenticated: true,
            };
            hideRegisterNotice();
            setRegisterStep('plan');
        } else if (checkoutContext && inputPassword) {
            inputPassword.focus();
        }
    })();
    if (inputEmail && authMode === 'login') inputEmail.focus();
});

