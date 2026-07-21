// ===== Loading Screen Script =====

document.addEventListener('DOMContentLoaded', () => {
    if (window.__appLog) window.__appLog('info', 'PAGE', 'loaded', { page: 'loading', url: typeof document !== 'undefined' ? document.URL : null });
    const progressBar = document.getElementById('progress-bar');
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');

    // Window controls
    btnMinimize.addEventListener('click', () => window.polvo.minimizeApp());
    btnMaximize.addEventListener('click', () => window.polvo.maximizeApp());
    btnClose.addEventListener('click', () => window.polvo.closeApp());

    // Toggle maximize/restore icon when window state changes
    window.polvo.onMaximizeChange((isMaximized) => {
        btnMaximize.querySelector('.icon-maximize').style.display = isMaximized ? 'none' : '';
        btnMaximize.querySelector('.icon-restore').style.display = isMaximized ? '' : 'none';
        btnMaximize.title = isMaximized ? 'Restaurar' : 'Maximizar';
    });

    // Simulate loading progress
    let progress = 0;
    const totalDuration = 3000; // 3 seconds
    const interval = 30;
    const steps = totalDuration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
        // Add some randomness to make it feel more natural
        const randomFactor = 0.5 + Math.random();
        progress += increment * randomFactor;

        if (progress >= 100) {
            progress = 100;
            progressBar.style.width = '100%';
            clearInterval(timer);

            // Brief pause at 100% then navigate (if dev token exists, go to dashboard)
            setTimeout(async () => {
                try {
                    const config = await window.polvo.getSocketConfig();
                    if (config && config.token) {
                        window.polvo.navigateToDashboard();
                    } else {
                        window.polvo.navigateToLogin();
                    }
                } catch (_) {
                    window.polvo.navigateToLogin();
                }
            }, 400);
        } else {
            progressBar.style.width = progress + '%';
        }
    }, interval);
});
