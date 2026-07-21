// ===== Dev Bypass Script =====

document.addEventListener('DOMContentLoaded', () => {
    if (window.__appLog) window.__appLog('info', 'PAGE', 'loaded', { page: 'dev-bypass' });

    const btnGoDashboard = document.getElementById('btn-go-dashboard');
    const linkBack = document.getElementById('link-back');
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');

    // Window controls
    if (btnMinimize) btnMinimize.addEventListener('click', () => window.polvo.minimizeApp());
    if (btnMaximize) btnMaximize.addEventListener('click', () => window.polvo.maximizeApp());
    if (btnClose) btnClose.addEventListener('click', () => window.polvo.closeApp());

    window.polvo.onMaximizeChange((isMaximized) => {
        if (btnMaximize) {
            const iconMax = btnMaximize.querySelector('.icon-maximize');
            const iconRest = btnMaximize.querySelector('.icon-restore');
            if (iconMax) iconMax.style.display = isMaximized ? 'none' : '';
            if (iconRest) iconRest.style.display = isMaximized ? '' : 'none';
            btnMaximize.title = isMaximized ? 'Restaurar' : 'Maximizar';
        }
    });

    // Dev token and mock server URL (must match mock-socket-server port)
    const DEV_TOKEN = 'dev-user:0:dev';
    const DEV_SOCKET_URL = 'http://localhost:3005';

    btnGoDashboard.addEventListener('click', async () => {
        btnGoDashboard.disabled = true;
        btnGoDashboard.textContent = 'Abrindo...';
        try {
            await window.polvo.setSocketToken(DEV_TOKEN, DEV_SOCKET_URL);
            window.polvo.navigateToDashboard();
        } catch (err) {
            if (window.__appLog) window.__appLog('error', 'DEV_BYPASS', 'setSocketToken failed', { message: err && err.message });
            btnGoDashboard.disabled = false;
            btnGoDashboard.textContent = 'Ir para dashboard (dev)';
        }
    });

    linkBack.addEventListener('click', (e) => {
        e.preventDefault();
        window.polvo.navigateToLogin();
    });
});
