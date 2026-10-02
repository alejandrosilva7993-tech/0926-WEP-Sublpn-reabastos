/**
 * WEP RF — Reabasto (SubLPN)
 * Bit SubLPN Parcial activo (sin UI).
 * Flujo campo a campo; cualquier valor no vacío se acepta.
 */
(function () {
  'use strict';

  var STEPS = [
    'lpnDestino',
    'locOrigen',
    'lpnOrigen',
    'subLpnOrigen',
    'producto',
    'cantidad',
    'lote',
    'locDestino'
  ];

  var STEP_LABELS = {
    lpnDestino: 'LPN destino',
    locOrigen: 'localidad origen',
    lpnOrigen: 'LPN origen',
    subLpnOrigen: 'SubLPN origen',
    producto: 'producto',
    cantidad: 'cantidad',
    lote: 'lote',
    locDestino: 'localidad destino'
  };

  var INPUT_MAP = {
    lpnDestino: 'inputLpnDestino',
    locOrigen: 'inputLocOrigen',
    lpnOrigen: 'inputLpnOrigen',
    subLpnOrigen: 'inputSubLpnOrigen',
    producto: 'inputProducto',
    cantidad: 'inputCantidad',
    lote: 'inputLote',
    locDestino: 'inputLocDestino'
  };

  var SUGGESTED_SUBS = ['SUB-REA-A', 'SUB-REA-B'];

  var state = {
    step: 'lpnDestino',
    done: {},
    doneSubs: [],
    toastTimer: null,
    historico: []
  };

  function $(id) { return document.getElementById(id); }

  function val(id) { return String($(id).value || '').trim(); }

  function showToast(msg, type) {
    var toast = $('toast');
    $('toastMsg').textContent = msg;
    toast.className = 'toast toast--' + (type || 'success');
    toast.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 3800);
    $('srLive').textContent = msg;
  }

  function setErr(id, msg) {
    var el = $(id);
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  function requireValue(inputId, errId, label) {
    setErr(errId, '');
    var v = val(inputId);
    if (!v) {
      setErr(errId, 'Ingresa ' + label + '.');
      return null;
    }
    return v;
  }

  function nextSuggested() {
    return SUGGESTED_SUBS.filter(function (s) {
      return state.doneSubs.indexOf(s) === -1;
    })[0] || ('SUB-' + (state.doneSubs.length + 1));
  }

  function stepEl(name) { return $('step-' + name); }

  function markDone(step, text) {
    state.done[step] = text;
    var el = stepEl(step);
    el.querySelector('[data-editor]').hidden = true;
    el.querySelector('[data-done]').hidden = false;
    el.querySelector('[data-summary-text]').textContent = text;
    el.hidden = false;
  }

  function markActive(step) {
    var el = stepEl(step);
    el.hidden = false;
    el.querySelector('[data-editor]').hidden = false;
    el.querySelector('[data-done]').hidden = true;
  }

  function hideStep(step) {
    var el = stepEl(step);
    el.hidden = true;
    el.querySelector('[data-editor]').hidden = false;
    el.querySelector('[data-done]').hidden = true;
  }

  function render() {
    var idx = STEPS.indexOf(state.step);

    STEPS.forEach(function (step) {
      var i = STEPS.indexOf(step);
      if (i < idx && state.done[step]) markDone(step, state.done[step]);
      else if (i === idx) markActive(step);
      else hideStep(step);
    });

    if (state.step === 'subLpnOrigen') {
      var sug = nextSuggested();
      $('suggestValue').textContent = sug;
      if (!$('inputSubLpnOrigen').value) $('inputSubLpnOrigen').value = sug;
    }

    var esc = $('escHint');
    if (idx <= 0) {
      esc.hidden = true;
    } else {
      esc.hidden = false;
      esc.textContent = 'Esc (cambiar ' + (STEP_LABELS[STEPS[idx - 1]] || 'paso anterior') + ')';
    }

    var input = $(INPUT_MAP[state.step]);
    if (input) setTimeout(function () { input.focus(); }, 30);
  }

  function go(step) {
    state.step = step;
    render();
  }

  function clearInputs(ids) {
    ids.forEach(function (id) { $(id).value = ''; });
  }

  function confirmLpnDestino() {
    var v = requireValue('inputLpnDestino', 'errLpnDestino', 'la LPN destino');
    if (!v) return;
    markDone('lpnDestino', v);
    go('locOrigen');
  }

  function confirmLocOrigen() {
    var v = requireValue('inputLocOrigen', 'errLocOrigen', 'la localidad origen');
    if (!v) return;
    markDone('locOrigen', v);
    go('lpnOrigen');
  }

  function confirmLpnOrigen() {
    var v = requireValue('inputLpnOrigen', 'errLpnOrigen', 'la LPN origen');
    if (!v) return;
    markDone('lpnOrigen', v);
    go('subLpnOrigen');
  }

  function confirmSubLpn() {
    var v = requireValue('inputSubLpnOrigen', 'errSubLpn', 'la SubLPN origen');
    if (!v) return;
    markDone('subLpnOrigen', v);
    go('producto');
  }

  function confirmProducto() {
    var v = requireValue('inputProducto', 'errProducto', 'el producto');
    if (!v) return;
    markDone('producto', v);
    go('cantidad');
  }

  function confirmCantidad() {
    var v = requireValue('inputCantidad', 'errCantidad', 'la cantidad');
    if (!v) return;
    markDone('cantidad', v);
    go('lote');
  }

  function confirmLote() {
    var v = requireValue('inputLote', 'errLote', 'el lote');
    if (!v) return;
    markDone('lote', v);
    go('locDestino');
  }

  function registerHistorico(payload) {
    state.historico.push(payload);
    console.info('[Histórico de Movimientos]', payload);
  }

  function finishCycle() {
    var locDest = state.done.locDestino;
    var isPicking = /^P-/i.test(locDest) || /PICK/i.test(locDest);
    var sub = state.done.subLpnOrigen;

    registerHistorico({
      tipoMovimiento: 'REABASTO_PRODUCTO',
      bitSubLpnParcial: true,
      paramSubLpnPicking: true,
      origen: {
        localidad: state.done.locOrigen,
        lpn: state.done.lpnOrigen,
        subLpn: sub || null
      },
      destino: {
        localidad: locDest,
        lpn: state.done.lpnDestino,
        conservaSubLpn: isPicking
      },
      producto: state.done.producto,
      cantidad: state.done.cantidad,
      lote: state.done.lote,
      politicasAsignacion: 'aplicadas',
      timestamp: new Date().toISOString()
    });

    if (sub) state.doneSubs.push(sub);

    delete state.done.subLpnOrigen;
    delete state.done.producto;
    delete state.done.cantidad;
    delete state.done.lote;
    delete state.done.locDestino;

    clearInputs(['inputSubLpnOrigen', 'inputProducto', 'inputCantidad', 'inputLote', 'inputLocDestino']);

    if (state.doneSubs.length < SUGGESTED_SUBS.length) {
      showToast('Reabasto registrado. Ingresa la siguiente SubLPN', 'success');
      go('subLpnOrigen');
      return;
    }

    showToast('Reabasto completado.', 'success');
    state.doneSubs = [];
    delete state.done.lpnOrigen;
    clearInputs(['inputLpnOrigen']);
    go('lpnOrigen');
  }

  function confirmLocDestino() {
    var v = requireValue('inputLocDestino', 'errLocDestino', 'la localidad destino');
    if (!v) return;
    markDone('locDestino', v);
    finishCycle();
  }

  function back() {
    var idx = STEPS.indexOf(state.step);
    if (idx <= 0) return;

    if (state.step === 'subLpnOrigen' && state.doneSubs.length > 0 && !state.done.subLpnOrigen) {
      showToast('Reabasto finalizado.', 'success');
      resetFlow();
      return;
    }

    var prev = STEPS[idx - 1];
    delete state.done[prev];
    go(prev);
  }

  function resetFlow() {
    state.step = 'lpnDestino';
    state.done = {};
    state.doneSubs = [];
    clearInputs([
      'inputLpnDestino', 'inputLocOrigen', 'inputLpnOrigen', 'inputSubLpnOrigen',
      'inputProducto', 'inputCantidad', 'inputLote', 'inputLocDestino'
    ]);
    STEPS.forEach(hideStep);
    go('lpnDestino');
  }

  function bindEnter(id, fn) {
    $(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); fn(); }
    });
  }

  function init() {
    $('btnNavLeft').onclick = function () {
      showToast('Menú de demostración.', 'warn');
    };

    bindEnter('inputLpnDestino', confirmLpnDestino);
    bindEnter('inputLocOrigen', confirmLocOrigen);
    bindEnter('inputLpnOrigen', confirmLpnOrigen);
    bindEnter('inputSubLpnOrigen', confirmSubLpn);
    bindEnter('inputProducto', confirmProducto);
    bindEnter('inputCantidad', confirmCantidad);
    bindEnter('inputLote', confirmLote);
    bindEnter('inputLocDestino', confirmLocDestino);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') back();
    });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
