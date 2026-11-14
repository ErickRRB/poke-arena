export const QUICK_STATS_HOLD_MS = 250;

const number = value => Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 });
const seconds = value => `${number(value)} s`;
const positive = value => Number.isFinite(value) && value > 0;
const stat = (label, value) => ({ label, value: String(value) });
const hitDamage = card => card.burst > 1 ? `${number(card.damage)} × ${card.burst}` : number(card.damage);

// Values are per body and per hit, as in the combat catalog. A summon is not a damage spell.
export function quickStats(card, cards = {}, tile = 24) {
  if (!card) return [];
  const area = () => stat(card.rolling ? 'Recorrido' : 'Radio', `${number((card.rolling ? card.travelDistance : card.splash) / tile)} casillas`);
  if (card.spell) {
    if (card.spawnKey) {
      const summoned = cards[card.spawnKey];
      const rows = [stat('Invoca', `${card.spawnTotal} ${summoned?.name || 'Pokémon'}`)];
      if (positive(summoned?.damage)) rows.push(stat('Daño / invocación', `${hitDamage(summoned)} / golpe`));
      if (positive(card.fieldDuration)) rows.push(stat('Duración', seconds(card.fieldDuration)));
      else if (positive(summoned?.hp)) rows.push(stat('Vida / invocación', number(summoned.hp)));
      return rows;
    }
    if (positive(card.fieldDamage)) {
      let damage = number(card.fieldDamage);
      if (card.airMultiplier > 1) damage += ` · ${number(card.fieldDamage * card.airMultiplier)} al aire`;
      else if (card.buildingMultiplier > 1) damage += ` · ${number(card.fieldDamage * card.buildingMultiplier)} a estructuras`;
      return [stat('Daño / s', damage), stat(positive(card.fieldTowerDamage) ? 'Torres / s' : 'Torres', positive(card.fieldTowerDamage) ? number(card.fieldTowerDamage) : 'No afecta'),
        positive(card.fieldDuration) ? stat('Duración', seconds(card.fieldDuration)) : area()];
    }
    const rows = [];
    if (positive(card.damage)) rows.push(stat('Daño a tropas', number(card.damage)));
    if (Number.isFinite(card.towerDamage)) rows.push(stat('Daño a torres', card.towerDamage > 0 ? number(card.towerDamage) : 'No afecta'));
    if (positive(card.freeze)) rows.push(stat('Congela', seconds(card.freeze)));
    else if (positive(card.splash) || positive(card.travelDistance)) rows.push(area());
    else if (positive(card.fieldDuration)) rows.push(stat('Duración', seconds(card.fieldDuration)));
    return rows.slice(0, 3);
  }
  const rows = [];
  if (card.squad?.length) {
    const members = card.squad.map(key => cards[key]).filter(Boolean);
    const span = field => {
      const values = members.map(member => member[field]).filter(positive);
      if (!values.length) return null;
      const min = Math.min(...values), max = Math.max(...values);
      return min === max ? number(min) : `${number(min)}–${number(max)}`;
    };
    const hp = span('hp'), damage = span('damage');
    if (hp) rows.push(stat('Vida / unidad', hp));
    if (damage) rows.push(stat('Daño / golpe y unidad', damage));
    rows.push(stat('Unidades', card.squad.length));
    return rows;
  }
  if (positive(card.hp)) rows.push(stat(card.count > 1 ? 'Vida / unidad' : 'Vida', number(card.hp)));
  if (card.passive && positive(card.reflect)) {
    rows.push(stat('Devuelve daño directo', `${number(card.reflect * 100)} %`));
    if (positive(card.lifetime)) rows.push(stat('Duración', seconds(card.lifetime)));
  } else if (card.passive && card.summon) {
    rows.push(stat('Invoca', `${card.summonCount || 1} ${cards[card.summon]?.name || 'Pokémon'}`));
    if (positive(card.summonEvery)) rows.push(stat('Cada', seconds(card.summonEvery)));
  } else if (positive(card.heal)) {
    rows.push(stat('Cura', `${number(card.heal)}${positive(card.healEvery) ? ` cada ${seconds(card.healEvery)}` : ''}`));
    if (positive(card.damage)) rows.push(stat('Daño / golpe', hitDamage(card)));
  } else {
    if (positive(card.damage)) rows.push(stat(card.building ? 'Daño a torres / golpe' : card.bolts > 1 ? 'Daño / rayo' : card.burst > 1 ? 'Daño / ráfaga' : card.count > 1 ? 'Daño / golpe y unidad' : 'Daño / golpe', hitDamage(card)));
    if (positive(card.interval) && !card.passive) rows.push(stat('Ataque cada', seconds(card.interval)));
  }
  return rows.slice(0, 3);
}

let tooltipId = 0;

/**
 * No event is cancelled or given pointer capture. The hand's click handler must
 * skip cleanup.isHoldClick(event), which identifies only a completed long press.
 */
export function bindQuickStats({ hand, getCard, cards = {}, isPlaying = () => true,
  getSelection = () => hand.querySelector('[aria-pressed="true"]'), holdDelay = QUICK_STATS_HOLD_MS }) {
  const doc = hand.ownerDocument, win = doc.defaultView;
  const tooltip = doc.createElement('div');
  tooltip.id = `quick-stats-${++tooltipId}`;
  tooltip.className = 'quick-stats';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  doc.body.append(tooltip);
  let press = null, timer = null, frame = null, heldClick = null;
  const listeners = [];
  const listen = (target, event, listener, options = { passive: true }) => {
    target.addEventListener(event, listener, options);
    listeners.push(() => target.removeEventListener(event, listener, options));
  };
  const cardAt = target => {
    const card = target?.closest?.('[data-card]');
    return card && hand.contains(card) ? card : null;
  };
  const within = (card, x, y) => {
    const rect = card.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };
  function hide() {
    if (press?.shown) heldClick = { card: press.card, until: Infinity };
    if (press?.card) {
      const ids = (press.card.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tooltip.id);
      if (ids.length) press.card.setAttribute('aria-describedby', ids.join(' '));
      else press.card.removeAttribute('aria-describedby');
    }
    win.clearTimeout(timer); timer = null;
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null; press = null; tooltip.hidden = true;
  }
  function valid() {
    // A native Enter press selects its focused button at keydown. Accept that
    // initial selection once, before the tooltip opens; any later change hides it.
    if (press?.kind === 'keyboard' && press.code === 'Enter' && !press.shown && !press.acceptedEnterSelection &&
      getSelection() !== press.selection && press.card.getAttribute('aria-pressed') === 'true') {
      press.selection = getSelection(); press.acceptedEnterSelection = true;
    }
    return press && press.card.isConnected && !press.card.disabled && isPlaying() && !doc.hidden &&
      !doc.querySelector('dialog[open]') && getCard(press.card) === press.data && getSelection() === press.selection &&
      (press.kind === 'keyboard' ? doc.activeElement === press.card : within(press.card, press.x, press.y));
  }
  function position() {
    const rect = press.card.getBoundingClientRect(), viewport = win.visualViewport;
    const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
    const width = viewport?.width || win.innerWidth;
    const size = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(left + 8, Math.min(rect.left + rect.width / 2 - size.width / 2, left + width - size.width - 8))}px`;
    tooltip.style.top = `${Math.max(top + 8, rect.top - size.height - 10)}px`;
  }
  function monitor() {
    if (!valid()) { hide(); return; }
    if (press.shown) position();
    frame = win.requestAnimationFrame(monitor);
  }
  function show() {
    timer = null;
    if (!valid()) { hide(); return; }
    const rows = quickStats(press.data, cards);
    if (!rows.length) { hide(); return; }
    const title = doc.createElement('strong');
    title.className = 'quick-stats-name'; title.textContent = press.data.name;
    const list = doc.createElement('dl');
    for (const row of rows) {
      const item = doc.createElement('div'), label = doc.createElement('dt'), value = doc.createElement('dd');
      label.textContent = row.label; value.textContent = row.value;
      item.append(label, value); list.append(item);
    }
    tooltip.replaceChildren(title, list); tooltip.hidden = false;
    press.shown = true;
    const ids = new Set((press.card.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(tooltip.id); press.card.setAttribute('aria-describedby', [...ids].join(' '));
    position();
  }
  function begin(card, details) {
    hide(); heldClick = null;
    const data = getCard(card);
    if (!data || card.disabled || !isPlaying() || doc.hidden) return;
    press = { card, data, selection: getSelection(), shown: false, ...details };
    timer = win.setTimeout(show, holdDelay);
    frame = win.requestAnimationFrame(monitor);
  }
  listen(hand, 'pointerdown', event => {
    const card = cardAt(event.target);
    if (!card || event.button !== 0 || event.isPrimary === false) return;
    begin(card, { kind: 'pointer', pointerId: event.pointerId, x: event.clientX, y: event.clientY });
  });
  listen(doc, 'pointermove', event => {
    if (press?.kind !== 'pointer' || event.pointerId !== press.pointerId) return;
    press.x = event.clientX; press.y = event.clientY;
    if (!within(press.card, press.x, press.y)) hide();
  }, { passive: true, capture: true });
  const release = event => {
    if (press?.kind === 'pointer' && event.pointerId === press.pointerId) hide();
    if (heldClick) heldClick.until = win.performance.now() + 400;
  };
  listen(doc, 'pointerup', release, { passive: true, capture: true });
  listen(doc, 'pointercancel', release, { passive: true, capture: true });
  listen(hand, 'keydown', event => {
    const card = cardAt(event.target);
    if (!card || event.repeat || !['Space', 'Enter'].includes(event.code)) return;
    begin(card, { kind: 'keyboard', code: event.code });
  });
  listen(doc, 'keyup', event => {
    if (press?.kind === 'keyboard' && event.code === press.code) hide();
    if (heldClick && ['Space', 'Enter'].includes(event.code)) heldClick.until = win.performance.now() + 400;
  }, { passive: true, capture: true });
  listen(hand, 'focusout', () => { if (press?.kind === 'keyboard') hide(); });
  listen(doc, 'visibilitychange', hide);
  listen(win, 'blur', hide);
  listen(win, 'pagehide', hide);
  listen(win, 'resize', hide);
  listen(doc, 'scroll', hide, { passive: true, capture: true });
  const observer = new win.MutationObserver(() => { if (press && !valid()) hide(); });
  observer.observe(hand, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'disabled'] });
  const cleanup = () => { hide(); heldClick = null; observer.disconnect(); listeners.forEach(remove => remove()); tooltip.remove(); };
  cleanup.hide = hide;
  cleanup.isHoldClick = event => {
    if (press?.shown && cardAt(event.target) === press.card) return true;
    if (!heldClick || win.performance.now() > heldClick.until || cardAt(event.target) !== heldClick.card) return false;
    heldClick = null;
    return true;
  };
  return cleanup;
}
