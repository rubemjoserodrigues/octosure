/**
 * Renderer-side debug logger: sends to main process to write to /logs.
 * Also captures user clicks globally for faster debugging.
 */
(function () {
  function safeLog(level, category, message, data) {
    if (typeof window.polvo !== 'undefined' && window.polvo.log) {
      try {
        window.polvo.log(level, category, message, data);
      } catch (_) {}
    }
  }

  // Global click capture (capture phase so we see every click)
  document.addEventListener('click', function (e) {
    var target = e.target;
    var id = target.id || null;
    var tag = target.tagName ? target.tagName.toLowerCase() : '';
    var text = (target.textContent || '').trim().slice(0, 60);
    var className = (target.className && typeof target.className === 'string') ? target.className.slice(0, 80) : '';
    safeLog('info', 'USER', 'click', {
      id: id,
      tag: tag,
      class: className,
      text: text,
    });
  }, true);

  /**
   * Build a serializable payload from a Socket.IO connect_error / Error for debugging.
   * Use with __appLog('error', 'SOCKET', 'connect_error', __serializeSocketError(err, url))
   */
  function serializeSocketError(err, url) {
    if (err == null) return { url: url || null, message: 'unknown error' };
    var out = {
      url: url || null,
      message: err.message != null ? String(err.message) : String(err),
      type: err.type != null ? String(err.type) : undefined,
      description: err.description != null ? String(err.description) : undefined,
      context: err.context != null ? err.context : undefined,
      code: err.code != null ? String(err.code) : undefined,
    };
    if (err.stack && typeof err.stack === 'string') out.stack = err.stack;
    return out;
  }

  // Expose for manual logging from app code
  window.__appLog = safeLog;
  window.__serializeSocketError = serializeSocketError;
})();
