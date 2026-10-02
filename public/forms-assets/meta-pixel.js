'use strict';
(() => {
  const form = document.querySelector('#public-flow');
  const pixelId = form?.dataset.metaPixel || '';
  const formId = Number(form?.elements.form_id?.value);
  if (!/^[1-9][0-9]{4,24}$/.test(pixelId) || !Number.isSafeInteger(formId) || formId <= 0) return;
  const preferenceKey = 'badon:meta:v1:' + formId + ':' + pixelId;
  const read = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { sessionStorage.setItem(key, value); } catch {} };
  const privacySignal = navigator.globalPrivacyControl === true;
  let choice = read(preferenceKey);
  let consent = !privacySignal && choice === 'yes';
  let initialized = false, sending = false, stage = {kind: 'cover'};
  const seen = new Set();
  const panel = document.createElement('section');
  panel.className = 'pixel-consent'; panel.setAttribute('aria-label', 'Preferências de medição');
  const title = document.createElement('strong'); title.textContent = 'Medição de anúncios';
  const text = document.createElement('p');
  text.textContent = 'Podemos usar o Pixel da Meta para medir quais etapas são acessadas e os envios concluídos? A Meta recebe dados técnicos, como IP, página e identificadores de publicidade. As respostas não são incluídas nos parâmetros dos eventos. Você pode recusar e preencher normalmente.';
  const policy = document.createElement('a'); policy.href = '/privacidade/'; policy.target = '_blank'; policy.rel = 'noopener'; policy.textContent = 'Política de privacidade';
  const choices = document.createElement('div'); choices.className = 'pixel-consent-actions';
  const yes = document.createElement('button'), no = document.createElement('button'), preferences = document.createElement('button');
  for (const button of [yes, no, preferences]) { button.type = 'button'; button.className = 'button secondary'; }
  yes.textContent = 'Aceitar medição'; no.textContent = 'Recusar medição'; preferences.textContent = 'Alterar preferências de medição';
  yes.disabled = privacySignal;
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  choices.append(yes, no); panel.append(title, text, policy, choices, status, preferences); form.before(panel);
  function updatePreferenceUI() {
    const decided = privacySignal || choice === 'yes' || choice === 'no';
    choices.hidden = decided; text.hidden = decided; policy.hidden = decided;
    preferences.hidden = !decided || privacySignal;
    status.textContent = privacySignal ? 'Medição desativada pelo sinal de privacidade do navegador.' : consent ? 'Medição autorizada nesta sessão. Você pode revogar a qualquer momento.' : decided ? 'Medição recusada. O formulário continua disponível.' : '';
  }
  function load() {
    if (initialized || !consent) return;
    // Evita enviar query strings arbitrárias (que podem conter dados pessoais).
    const url = new URL(location.href);
    const clickId = url.searchParams.get('fbclid');
    url.search = ''; url.hash = '';
    if (form.dataset.pixelPath?.startsWith('/f/')) url.pathname = form.dataset.pixelPath;
    if (clickId && /^[a-zA-Z0-9_-]{1,500}$/.test(clickId)) url.searchParams.set('fbclid', clickId);
    try { history.replaceState(history.state, '', url.pathname + url.search); } catch { consent = false; return; }
    const existing = window.fbq;
    if (!existing) {
      const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      window.fbq = window._fbq = fbq;
    }
    // Modo manual, sem leitura automática dos campos ou eventos automáticos.
    window.fbq('set', 'autoConfig', false, pixelId);
    window.fbq('set', 'smartSetup', false, pixelId);
    window.fbq('consent', 'grant');
    window.fbq('init', pixelId);
    initialized = true;
    if (!existing) {
      const script = document.createElement('script'); script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.referrerPolicy = 'no-referrer'; document.head.append(script);
    }
  }
  function emit(name, details = {}, eventId = '') {
    if (!consent || privacySignal) return;
    const key = eventId || name + ':' + (details.step_index || '');
    if (seen.has(key) || (eventId && read(preferenceKey + ':lead:' + eventId))) return;
    try {
      load(); if (!consent) return;
      const params = {form_id: String(formId), ...details};
      window.fbq(name === 'PageView' || name === 'Lead' ? 'trackSingle' : 'trackSingleCustom',
        pixelId, name, params, eventId ? {eventID: eventId} : {});
      seen.add(key);
      if (eventId) write(preferenceKey + ':lead:' + eventId, '1');
    } catch { /* Falha/bloqueio do Pixel nunca impede o formulário. */ }
  }
  function emitCurrentStage() {
    if (stage.kind === 'step') emit('BadonFormStep', {step_index: stage.index, question_total: stage.total});
    if (stage.kind === 'review') emit('BadonFormReview');
  }
  yes.addEventListener('click', () => {
    if (privacySignal) return;
    consent = true; choice = 'yes'; write(preferenceKey, 'yes');
    emit('PageView'); emitCurrentStage(); updatePreferenceUI();
  });
  no.addEventListener('click', () => {
    consent = false; choice = 'no'; write(preferenceKey, 'no');
    try {
      // Se o SDK ainda não carregou, descarta eventos da fila após a revogação.
      if (window.fbq?.queue) window.fbq.queue = window.fbq.queue.filter(args => !['trackSingle', 'trackSingleCustom'].includes(args[0]));
      window.fbq?.('consent', 'revoke');
    } catch {}
    updatePreferenceUI();
  });
  preferences.addEventListener('click', () => { choices.hidden = false; text.hidden = false; policy.hidden = false; preferences.hidden = true; });
  const error = document.createElement('p'); error.className = 'notice error'; error.hidden = true; error.setAttribute('role', 'alert'); form.append(error);
  window.BadonPixel = {
    canTrack: () => consent && !privacySignal,
    start() { emit('BadonFormStart'); },
    step(index, total) {
      if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || index > total || total > 100) return;
      stage = {kind: 'step', index, total}; emitCurrentStage();
    },
    review() { stage = {kind: 'review'}; emitCurrentStage(); },
    async submit(button) {
      if (sending) return;
      sending = true; error.hidden = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(form.action, {method: 'POST', credentials: 'same-origin',
          headers: {Accept: 'application/json'}, body: new FormData(form), signal: controller.signal});
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok || !/^\/f\/confirmacao\.php\?r=[a-f0-9]{48}$/.test(result.redirect || '')) {
          throw new Error(response.status === 422 ? 'Confira os campos e o consentimento antes de tentar novamente.' : response.status === 409 ? 'O formulário foi atualizado. Abra o link novamente para responder à versão atual.' : response.status === 403 ? 'Sua sessão expirou. Abra o link do formulário novamente.' : response.status === 429 ? 'Aguarde antes de tentar novamente. Se o aviso persistir, tente mais tarde.' : 'Não foi possível confirmar o envio. Tente novamente; uma resposta já recebida não será duplicada.');
        }
        const event = result.pixel;
        if (event?.id === pixelId && event.form_id === formId && /^[a-f0-9]{64}$/.test(event.event_id || '')) emit('Lead', {}, event.event_id);
        // O Pixel só roda na página do formulário, nunca na URL privada do recibo.
        setTimeout(() => location.assign(result.redirect), 250);
      } catch (failure) {
        error.textContent = failure.name === 'AbortError' || failure instanceof TypeError ? 'Não foi possível confirmar o envio. Confira sua conexão e tente novamente; não duplicaremos uma resposta já recebida.' : failure.message;
        error.hidden = false; button.disabled = false; button.textContent = 'Confirmar e enviar'; sending = false;
      } finally { clearTimeout(timer); }
    },
  };
  updatePreferenceUI(); if (consent) emit('PageView');
})();
