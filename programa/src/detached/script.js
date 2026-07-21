(function () {
    const sideEl = document.getElementById('detached-side');
    const bookmakerEl = document.getElementById('detached-bookmaker');
    const eventEl = document.getElementById('detached-event');
    const urlEl = document.getElementById('detached-url');
    const hintEl = document.getElementById('detached-hint');
    const toolbarEl = document.querySelector('.detached-toolbar');
    const urlRowEl = document.querySelector('.detached-url-row');
    const btnCopy = document.getElementById('btn-copy-url');
    const btnMin = document.getElementById('btn-min');
    const btnMax = document.getElementById('btn-max');
    const btnClose = document.getElementById('btn-close');

    let currentSide = 'bet1';
    let currentUrl = '';

    function isValidHttpUrl(raw) {
        if (typeof raw !== 'string') return false;
        const txt = raw.trim();
        if (!/^https?:\/\//i.test(txt)) return false;
        try {
            new URL(txt);
            return true;
        } catch (_) {
            return false;
        }
    }

    function truncateUrl(raw, maxLen) {
        const txt = String(raw || '').trim();
        if (!txt) return '-';
        const safeMax = Number.isFinite(maxLen) ? maxLen : 92;
        if (txt.length <= safeMax) return txt;
        const head = txt.slice(0, 52);
        const tail = txt.slice(-34);
        return `${head}...${tail}`;
    }

    function applyPayload(payload) {
        const side = String((payload && payload.side) || '').trim().toLowerCase();
        const link = String((payload && payload.link) || '').trim();
        const bookmaker = String((payload && payload.bookmaker) || '').trim();
        const eventName = String((payload && payload.event) || '').trim();

        currentSide = side === 'bet2' ? 'bet2' : 'bet1';
        currentUrl = isValidHttpUrl(link) ? link : '';

        if (sideEl) sideEl.textContent = currentSide === 'bet2' ? 'Casa 2' : 'Casa 1';
        if (bookmakerEl) {
            bookmakerEl.textContent = bookmaker || '-';
            bookmakerEl.title = bookmaker || '-';
        }
        if (eventEl) {
            eventEl.textContent = eventName || '-';
            eventEl.title = eventName || '-';
        }
        if (urlEl) {
            urlEl.textContent = truncateUrl(currentUrl, 92);
            urlEl.title = currentUrl || 'Sem URL valida';
        }
        if (btnCopy) btnCopy.disabled = !currentUrl;
        if (hintEl) {
            hintEl.textContent = currentUrl ? 'Carregando evento...' : 'Sem URL valida para abrir.';
            hintEl.style.display = currentUrl ? 'none' : 'flex';
        }
    }

    function notifyUiReady() {
        if (!window.detachedApi || typeof window.detachedApi.notifyUiReady !== 'function') return;
        const toolbarHeight = toolbarEl ? toolbarEl.getBoundingClientRect().height : 56;
        const urlRowHeight = urlRowEl ? urlRowEl.getBoundingClientRect().height : 38;
        const total = Math.ceil(toolbarHeight + urlRowHeight);
        window.detachedApi.notifyUiReady({ toolbarHeight: total });
    }

    function pulseCopied() {
        if (!btnCopy) return;
        const old = btnCopy.textContent;
        btnCopy.textContent = 'Copiado';
        btnCopy.classList.add('copied');
        setTimeout(() => {
            btnCopy.textContent = old;
            btnCopy.classList.remove('copied');
        }, 900);
    }

    if (btnCopy) {
        btnCopy.addEventListener('click', async () => {
            if (!currentUrl) return;
            if (!window.detachedApi || typeof window.detachedApi.copyText !== 'function') return;
            try {
                const ok = await window.detachedApi.copyText(currentUrl);
                if (ok) pulseCopied();
            } catch (_) {}
        });
    }

    if (btnMin) {
        btnMin.addEventListener('click', () => {
            if (!window.detachedApi || typeof window.detachedApi.windowAction !== 'function') return;
            window.detachedApi.windowAction('minimize');
        });
    }

    if (btnMax) {
        btnMax.addEventListener('click', () => {
            if (!window.detachedApi || typeof window.detachedApi.windowAction !== 'function') return;
            window.detachedApi.windowAction('maximize');
        });
    }

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (!window.detachedApi || typeof window.detachedApi.windowAction !== 'function') return;
            window.detachedApi.windowAction('close');
        });
    }

    if (window.detachedApi && typeof window.detachedApi.onLoadPayload === 'function') {
        window.detachedApi.onLoadPayload((payload) => applyPayload(payload || {}));
    }

    window.addEventListener('load', notifyUiReady);
    window.addEventListener('resize', notifyUiReady);
    setTimeout(notifyUiReady, 80);
})();
