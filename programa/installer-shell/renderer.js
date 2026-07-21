const btnInstall = document.getElementById('btn-install');
const btnOpen = document.getElementById('btn-open');
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const statusPill = document.getElementById('status-pill');
const statusTitle = document.getElementById('status-title');
const statusText = document.getElementById('status-text');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const errorText = document.getElementById('error-text');
let started = false;

function setProgress(percent) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  progressBar.style.width = `${value}%`;
  progressLabel.textContent = `${Math.round(value)}%`;
}

function setBusy(busy) {
  btnInstall.disabled = busy;
  btnInstall.textContent = busy ? 'Instalando...' : 'Instalar agora';
}

btnMinimize.addEventListener('click', () => window.octosureInstaller.minimize());
btnClose.addEventListener('click', () => window.octosureInstaller.close());

async function startInstall() {
  if (started) return;
  started = true;
  errorText.hidden = true;
  setBusy(true);
  statusPill.textContent = 'Em andamento';
  statusTitle.textContent = 'Instalando Octosure';
  statusText.textContent = 'Preparando sua central de surebets. Nao feche esta janela durante o processo.';
  setProgress(2);

  const result = await window.octosureInstaller.start();
  if (!result || !result.ok) {
    setBusy(false);
    statusPill.textContent = 'Erro';
    statusTitle.textContent = 'Nao foi possivel instalar';
    statusText.textContent = 'Feche o Octosure caso ele esteja aberto e tente executar o instalador novamente.';
    errorText.textContent = result && result.message ? result.message : 'Falha desconhecida.';
    errorText.hidden = false;
    started = false;
  }
}

btnInstall.addEventListener('click', startInstall);

btnOpen.addEventListener('click', () => window.octosureInstaller.openApp());

window.octosureInstaller.onProgress((payload) => {
  if (!payload) return;
  if (payload.percent != null) setProgress(payload.percent);
  if (payload.stage) {
    statusTitle.textContent = payload.stage;
  }
  if (payload.error) {
    statusPill.textContent = 'Erro';
    errorText.textContent = payload.error;
    errorText.hidden = false;
    setBusy(false);
  }
  if (payload.done) {
    statusPill.textContent = 'Concluido';
    statusTitle.textContent = 'Octosure instalado';
    statusText.textContent = 'Pronto. Agora e so abrir o app e entrar com sua conta.';
    btnInstall.hidden = true;
    btnOpen.hidden = false;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(startInstall, 450);
});
