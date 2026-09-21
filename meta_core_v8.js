import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const META = {
  platforms: {
    T: { label: 'Т', working: [0.720, 0.745], hard: [0.735, 0.745], target: 0.740, sell: [500, 600] },
    N: { label: 'Н', working: [0.705, 0.735], hard: [0.720, 0.735], target: 0.730, sell: [600, 650] }
  },
  classes: {
    ST: { name: 'Стандарт', targetAvg: 38, profile: [31, 39], allowed: [37.3, 38.7], status: 'confirmed', units: { T: [13, 16], N: [15, 18] } },
    KM: { name: 'Комфорт', targetAvg: 41, profile: [39, 43], allowed: [40.3, 41.7], status: 'confirmed', units: { T: [13, 15], N: [14, 16] } },
    KP: { name: 'Комфорт+', targetAvg: 47, profile: [43, 50], allowed: [46.3, 47.7], status: 'hypothesis', units: { T: [11, 13], N: [12, 14] } },
    BS: { name: 'Бизнес', targetAvg: 62, profile: [53, 999], allowed: [61.3, 62.7], status: 'hypothesis', units: { T: [9, 10], N: [10, 11] } }
  },
  envelopes: {
    ST: {
      T: {
        13: { avg: [37.3, 38.7], sell: [484.9, 503.1], kep: [0.705897, 0.713488], n: 2974 },
        14: { avg: [37.3786, 38.7], sell: [523.3, 541.8], kep: [0.721468, 0.728395], n: 3573 },
        15: { avg: [37.3, 38.7], sell: [559.5, 580.5], kep: [0.734708, 0.741827], n: 4349 },
        16: { avg: [37.3, 38.7], sell: [596.8, 619.2], kep: [0.747095, 0.753994], n: 5162 }
      },
      N: {
        15: { avg: [37.3, 38.7], sell: [559.5, 580.5], kep: [0.697148, 0.704870], n: 4349 },
        16: { avg: [37.3, 38.7], sell: [596.8, 619.2], kep: [0.710598, 0.718117], n: 5162 },
        17: { avg: [37.3, 38.7], sell: [634.1, 657.9], kep: [0.722905, 0.730225], n: 6064 },
        18: { avg: [37.3056, 38.7], sell: [671.5, 696.6], kep: [0.734236, 0.741335], n: 7133 }
      }
    },
    KM: {
      T: {
        13: { avg: [40.3077, 41.7], sell: [524.0, 542.1], kep: [0.721736, 0.728505], n: 3539 },
        14: { avg: [40.3143, 41.7], sell: [564.4, 583.8], kep: [0.736404, 0.742912], n: 4311 },
        15: { avg: [40.3, 41.7], sell: [604.5, 625.5], kep: [0.749510, 0.755867], n: 5176 }
      },
      N: {
        14: { avg: [40.3143, 41.7], sell: [564.4, 583.8], kep: [0.698986, 0.706048], n: 4311 },
        15: { avg: [40.3, 41.7], sell: [604.5, 625.5], kep: [0.713228, 0.720161], n: 5176 },
        16: { avg: [40.3, 41.7], sell: [644.8, 667.2], kep: [0.726244, 0.732981], n: 6189 }
      }
    }
  }
};

const URL = 'https://hdvaibntrlvgdlvlnkat.supabase.co';
const KEY = 'sb_publishable_2Qx_3xRBQJXLzbxEVqYIYQ_Pk--tEsN';
const $ = id => document.getElementById(id);
const val = id => Number($(id)?.value) || 0;
const fmt = (v, d = 0) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v) || 0);
const rub = v => v >= 1e6 ? '≈ ' + fmt(v / 1e6, 1) + ' млн ₽' : '≈ ' + fmt(v / 1e3, 0) + ' тыс. ₽';
const between = (v, r) => v >= r[0] - 1e-9 && v <= r[1] + 1e-9;
const houseType = () => document.querySelector('input[name=type]:checked')?.value || 'T';

function inferClass(avg) {
  const list = Object.entries(META.classes).filter(([, rule]) => between(avg, rule.profile));
  if (!list.length) return null;
  list.sort((a, b) => Math.abs(avg - a[1].targetAvg) - Math.abs(avg - b[1].targetAvg));
  const [id, rule] = list[0];
  return { id, rule, calibrated: rule.status === 'confirmed' && between(avg, rule.allowed) };
}

function addTag(parent, text, kind = '') {
  const el = document.createElement('span');
  el.className = 'metaTag' + (kind ? ' ' + kind : '');
  el.textContent = text;
  parent.appendChild(el);
}

function addLine(parent, text, strongPrefix = '') {
  const line = document.createElement('div');
  line.className = 'scenario';
  if (strongPrefix) {
    const b = document.createElement('b');
    b.textContent = strongPrefix;
    line.appendChild(b);
  }
  line.appendChild(document.createTextNode(text));
  parent.appendChild(line);
}

function ensureInfoModal() {
  if (document.getElementById('fieldInfoModal')) return;
  const back = document.createElement('div');
  back.id = 'fieldInfoModal';
  back.className = 'modalBack';
  back.innerHTML = '<div class="modal infoModal"><div class="modalTop"><div><h3 id="fieldInfoTitle">Пояснение</h3></div><button type="button" class="close">×</button></div><div id="fieldInfoText" class="infoModalText"></div></div>';
  document.body.appendChild(back);
  const close = () => back.classList.remove('open');
  back.querySelector('.close').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
}

function addInfoButtonToLabel(inputId, title, text) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const label = input.closest('label');
  if (!label || label.parentElement?.classList.contains('fieldWithInfo')) return;

  const wrap = document.createElement('div');
  wrap.className = 'fieldWithInfo';
  label.parentNode.insertBefore(wrap, label);
  wrap.appendChild(label);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'infoBtn';
  btn.textContent = 'i';
  btn.setAttribute('aria-label', 'Пояснение: ' + title);
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('fieldInfoTitle').textContent = title;
    document.getElementById('fieldInfoText').textContent = text;
    document.getElementById('fieldInfoModal').classList.add('open');
  });
  wrap.appendChild(btn);
}

function addTypeInfoButton() {
  const full = document.querySelector('.fields .full');
  if (!full || full.querySelector('.infoBtn')) return;
  full.classList.add('typeWithInfo');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'infoBtn';
  btn.textContent = 'i';
  btn.setAttribute('aria-label', 'Пояснение: тип дома');
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('fieldInfoTitle').textContent = 'Тип дома';
    document.getElementById('fieldInfoText').textContent = 'Т — схема с одним коридором. Н — схема с двумя коридорами. Тип влияет на рабочий диапазон КЭП, целевой КЭП, допустимую квартирность и калибровку по расчётному массиву.';
    document.getElementById('fieldInfoModal').classList.add('open');
  });
  full.appendChild(btn);
}

function ensureUi() {
  const build = $('build');
  if (build?.closest('label')) {
    const label = build.closest('label');
    if (label.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.textContent = 'Площадь этажа для расчета КЭП, м²';
  }

  if (!$('smr')) {
    const price = $('price');
    const label = document.createElement('label');
    label.appendChild(document.createTextNode('СМР, ₽/м²'));
    const input = document.createElement('input');
    input.id = 'smr';
    input.type = 'number';
    input.value = '85000';
    input.min = '0';
    label.appendChild(input);
    price?.closest('label')?.after(label);
  }

  const validation = $('validation');
  if (validation && !document.getElementById('kepMethodNote')) {
    const note = document.createElement('div');
    note.id = 'kepMethodNote';
    note.className = 'note';
    note.style.marginTop = '10px';
    note.textContent = 'Для КЭП используйте площадь этажа по наружной грани ограждающих конструкций за вычетом лифтовых шахт и балконов.';
    validation.before(note);
    validation.style.marginTop = '6px';
  }

  const rows = document.querySelector('.output .rows');
  if (rows && !document.getElementById('workGap')) {
    const row = document.createElement('div');
    row.className = 'row';
    const span = document.createElement('span');
    span.textContent = 'До целевого минимума';
    const b = document.createElement('b');
    b.id = 'workGap';
    row.append(span, b);
    const targetRow = $('target')?.closest('.row');
    rows.insertBefore(row, targetRow || null);
  }

  const rf = $('rf');
  if (rf?.parentElement?.querySelector('small')) rf.parentElement.querySelector('small').textContent = 'Резерв до минимума / этаж';
  const rt = $('rt');
  if (rt?.parentElement?.querySelector('small')) rt.parentElement.querySelector('small').textContent = 'Резерв до минимума / дом';
  const effect = $('effect');
  if (effect?.parentElement?.querySelector('small')) effect.parentElement.querySelector('small').textContent = 'Потенциал до минимума';

  const metrics = document.querySelector('.output .metrics');
  if (metrics && !document.getElementById('metaBox')) {
    const box = document.createElement('div');
    box.id = 'metaBox';
    box.className = 'analysisBox';
    metrics.after(box);
  }

  if (!document.getElementById('metaCoreStyle')) {
    const style = document.createElement('style');
    style.id = 'metaCoreStyle';
    style.textContent = '.fieldWithInfo{position:relative;min-width:0}.fieldWithInfo>label{display:block}.fieldWithInfo>.infoBtn,.typeWithInfo>.infoBtn{position:absolute;top:-1px;right:0}.typeWithInfo{position:relative}.infoBtn{width:18px;height:18px;min-width:18px;border-radius:50%;border:1px solid #aeb7b2;background:#f5f6f3;color:#6d7772;font-size:11px;font-weight:800;line-height:16px;padding:0;cursor:pointer;box-shadow:none}.infoBtn:hover{background:#e9ece8;border-color:#8f9a94;color:#4f5a54;box-shadow:none}.infoModal{width:min(560px,100%)}.infoModalText{margin-top:14px;line-height:1.6;font-size:14px;color:#343d38;white-space:pre-line}.analysisBox{margin-top:12px;padding:13px;border-radius:10px;background:#f5f6f3;color:#28322d;border:1px solid #d5dad5;line-height:1.5}.analysisBox b{color:#24302a}.analysisBox .metaHead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:7px}.analysisBox .metaTag{display:inline-block;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;background:#e2e9e4;color:#315b49}.analysisBox .metaTag.warn{background:#f0e4bc;color:#6a5a27}.analysisBox .metaTag.bad{background:#efd8d5;color:#7c413b}.analysisBox .scenario{margin-top:8px;padding-top:8px;border-top:1px solid #d9ddd8}';
    document.head.appendChild(style);
  }
}

function calculate() {
  const b = val('build');
  const a = val('apt');
  const c = Math.max(1, Math.round(val('count')));
  // Средняя площадь — производный показатель: площадь квартир / количество квартир.
  const avgInput = a > 0 && c > 0 ? a / c : 0;
  const avgField = $('avg');
  if (avgField) avgField.value = avgInput > 0 ? avgInput.toFixed(2) : '';
  const floors = Math.max(1, Math.round(val('floors')));
  const price = val('price');
  const smr = val('smr');
  const type = houseType();
  const platform = META.platforms[type];
  const box = $('metaBox');

  if (!b || !a || a > b) {
    if (box) {
      box.textContent = '';
      const head = document.createElement('div');
      head.className = 'metaHead';
      addTag(head, 'ПРОВЕРЬТЕ ДАННЫЕ', 'bad');
      box.appendChild(head);
      box.appendChild(document.createTextNode('Площадь квартир должна быть больше 0 и меньше площади этажа.'));
    }
    return;
  }

  const kep = a / b;
  const avgCalc = a / c;
  const minKep = platform.working[0];
  const maxKep = platform.working[1];
  const target = platform.target;

  const belowMin = kep < minKep;
  const aboveMax = kep > maxKep;
  const inTargetZone = !belowMin && !aboveMax;

  // Base reserve is counted ONLY up to the minimum of the target range.
  const minSellArea = minKep * b;
  const reserveFloor = belowMin ? Math.max(0, minSellArea - a) : 0;
  const minBuildArea = a / minKep;
  const buildReductionToMin = belowMin ? Math.max(0, b - minBuildArea) : 0;
  const reserveHouse = reserveFloor * floors;
  const revenuePotential = reserveHouse * price;
  const costPotential = buildReductionToMin * floors * smr;

  // Higher reference target is not treated as mandatory or as automatic profit.
  const targetSellArea = target * b;
  const targetSell = Math.max(0, targetSellArea - a);
  const targetAvg = targetSellArea / c;
  const targetBuild = a / target;

  let level;
  let badgeBg;
  if (belowMin) {
    level = 'НИЖЕ ЦЕЛЕВОГО МИНИМУМА';
    badgeBg = 'var(--bad)';
  } else if (inTargetZone) {
    level = 'ЦЕЛЕВОЙ ДИАПАЗОН';
    badgeBg = 'var(--good)';
  } else {
    level = 'ВЫШЕ ЦЕЛЕВОГО ДИАПАЗОНА — ПРОВЕРИТЬ БАЛАНС';
    badgeBg = 'var(--warn)';
  }

  const cls = inferClass(avgCalc);
  const reasons = [];
  let envelope = null;
  let currentConfirmed = false;
  let targetCompatible = false;
  let calibrationText = 'Подтвержденная расчетная комбинация для текущих параметров не найдена.';

  if (cls) {
    const units = cls.rule.units[type];
    const countOk = between(c, units);

    if (!countOk) {
      reasons.push('квартирность ' + c + ' вне диапазона ' + units[0] + '–' + units[1] + ' для ' + cls.rule.name + ' / ' + platform.label);
    }
    if (!cls.calibrated) {
      reasons.push('Sср ' + fmt(avgCalc, 1) + ' м² вне подтвержденного диапазона ' + fmt(cls.rule.allowed[0], 1) + '–' + fmt(cls.rule.allowed[1], 1) + ' м²');
    }

    if (cls.calibrated && countOk && META.envelopes[cls.id]?.[type]?.[c]) {
      envelope = META.envelopes[cls.id][type][c];
      currentConfirmed =
        between(avgCalc, envelope.avg) &&
        between(a, envelope.sell) &&
        between(kep, envelope.kep);

      targetCompatible =
        between(target, envelope.kep) &&
        between(targetSellArea, envelope.sell) &&
        between(targetAvg, envelope.avg);

      calibrationText =
        cls.rule.name + ' / ' + platform.label + ' / ' + c +
        ' кв.: расчетный диапазон Sср ' + fmt(envelope.avg[0], 1) + '–' + fmt(envelope.avg[1], 1) +
        ' м²; Sпрод ' + fmt(envelope.sell[0], 1) + '–' + fmt(envelope.sell[1], 1) +
        ' м²; КЭП ' + fmt(envelope.kep[0], 3) + '–' + fmt(envelope.kep[1], 3) +
        ' (' + fmt(envelope.n, 0) + ' вариантов).';

      if (!currentConfirmed) {
        reasons.push('текущая комбинация Sср / Sпрод / КЭП не полностью попадает в расчетный диапазон для данной квартирности');
      }
    } else if (cls.rule.status === 'hypothesis') {
      reasons.push('для класса ' + cls.rule.name + ' пока нет подтвержденного массива вариантов');
    }
  } else {
    reasons.push('Sср ' + fmt(avgCalc, 1) + ' м² вне профилей, на которых откалибрована расчетная модель');
  }

  if (!between(a, platform.sell)) {
    reasons.push('Sпрод ' + fmt(a, 1) + ' м² вне базового диапазона платформы ' + fmt(platform.sell[0], 0) + '–' + fmt(platform.sell[1], 0) + ' м²');
  }

  $('kep').textContent = fmt(kep, 3);
  $('badge').textContent = level;
  $('badge').style.background = badgeBg;
  $('range').textContent = fmt(minKep, 3) + ' — ' + fmt(maxKep, 3);
  $('target').textContent = fmt(target, 3);
  $('delta').textContent = belowMin ? '+' + fmt(minKep - kep, 3) : '0,000';
  $('workGap').textContent = belowMin ? '+' + fmt(reserveFloor, 1) + ' м²/этаж' : 'достигнут';
  $('rf').textContent = belowMin ? '+' + fmt(reserveFloor, 1) + ' м²' : '—';
  $('rt').textContent = belowMin ? '+' + fmt(reserveHouse, 0) + ' м²' : '—';
  $('effect').textContent = belowMin ? rub(revenuePotential) : '—';

  const targetRow = $('target')?.closest('.row');
  if (targetRow?.querySelector('span')) targetRow.querySelector('span').textContent = 'Ориентир внутри диапазона';
  const deltaRow = $('delta')?.closest('.row');
  if (deltaRow?.querySelector('span')) deltaRow.querySelector('span').textContent = 'Δ до целевого минимума';
  const rangeRow = $('range')?.closest('.row');
  if (rangeRow?.querySelector('span')) rangeRow.querySelector('span').textContent = 'Целевой диапазон';

  if ($('validation')) {
    $('validation').textContent =
      'Средняя площадь рассчитывается автоматически: ' + fmt(a, 1) +
      ' м² / ' + c + ' кв. = ' + fmt(avgCalc, 2) + ' м².';
  }

  box.textContent = '';
  const head = document.createElement('div');
  head.className = 'metaHead';
  addTag(
    head,
    belowMin ? 'КЭП НИЖЕ ЦЕЛЕВОГО МИНИМУМА' :
    inTargetZone ? 'ЦЕЛЕВОЙ ДИАПАЗОН ДОСТИГНУТ' :
    'ВЫШЕ ЦЕЛЕВОГО ДИАПАЗОНА',
    belowMin ? 'bad' : aboveMax ? 'warn' : ''
  );
  if (currentConfirmed) addTag(head, 'ТЕКУЩАЯ КОМБИНАЦИЯ ПОДТВЕРЖДЕНА');
  if (cls) addTag(head, cls.rule.name, cls.calibrated ? '' : 'warn');
  box.appendChild(head);

  const calib = document.createElement('div');
  const cb = document.createElement('b');
  cb.textContent = 'Математическая калибровка: ';
  calib.append(
    cb,
    document.createTextNode(
      calibrationText +
      ' Геометрия конкретного этажа и соответствие Атрибутивной модели этим расчетом не подтверждаются.'
    )
  );
  box.appendChild(calib);

  if (belowMin) {
    addLine(
      box,
      ' Фактический КЭП ' + fmt(kep, 3) + ' ниже целевого минимума ' + fmt(minKep, 3) +
      '. Разрыв до минимального уровня — ' + fmt(minKep - kep, 3) +
      '. Теоретический резерв составляет ' + fmt(reserveFloor, 1) +
      ' м² продаваемой площади на этаж и ' + fmt(reserveHouse, 0) + ' м² по дому.',
      'Базовый резерв.'
    );

    addLine(
      box,
      ' Потенциальный эффект до целевого минимума — ' + rub(revenuePotential) +
      ' дополнительной выручки за ' + floors +
      ' типовых этажей. Альтернативный сценарий при сохранении площади квартир — сокращение расчетной площади этажа с ' +
      fmt(b, 1) + ' до ' + fmt(minBuildArea, 1) +
      ' м², что соответствует верхней оценке снижения СМР до ' + rub(costPotential) + '.',
      'Деньги.'
    );
  } else if (inTargetZone) {
    addLine(
      box,
      ' Фактический КЭП ' + fmt(kep, 3) + ' находится внутри целевого диапазона ' +
      fmt(minKep, 3) + '–' + fmt(maxKep, 3) +
      '. Базовый резерв эффективности и денежный профит не фиксируются.',
      'Результат.'
    );
  } else {
    addLine(
      box,
      ' Фактический КЭП ' + fmt(kep, 3) + ' выше верхней границы целевого диапазона ' +
      fmt(maxKep, 3) +
      '. Дополнительный денежный профит по КЭП не рассчитывается; рекомендуется проверить баланс продукта, МОП и квартирографии.',
      'Результат.'
    );
  }

  if (!aboveMax && target > kep) {
    const targetScenario =
      ' Математически ориентир КЭП ' + fmt(target, 3) +
      ' при сохранении площади этажа соответствует Sпрод ' + fmt(targetSellArea, 1) +
      ' м² и Sср ' + fmt(targetAvg, 1) + ' м² при ' + c +
      ' квартирах. Альтернатива — при сохранении ' + fmt(a, 1) +
      ' м² квартир сократить расчетную площадь этажа до ' + fmt(targetBuild, 1) +
      ' м². Этот сценарий может рассматриваться только если полученные параметры удовлетворяют Атрибутивной модели, квартирографии и геометрии этажа. Увеличение Sср само по себе не является рекомендацией.';
    addLine(box, targetScenario, 'Дополнительный сценарий.');
    if (targetCompatible) {
      addLine(
        box,
        ' Сценарий попадает в математический диапазон расчетной выборки, но все равно требует проверки соответствия Атрибутивной модели.',
        'Проверка.'
      );
    }
  }

  if (reasons.length) {
    addLine(box, ' ' + reasons.join('; ') + '.', 'Ограничения.');
  }

  addLine(
    box,
    ' Расчет является предварительной оценкой. Для подтверждения решения требуется проверка Атрибутивной модели и конкретной геометрии типового этажа.',
    'Реализуемость.'
  );

  window.__PROEKTSET_META_CORE_STATE__ = {
    type, b, a, c, av: avgCalc, floors, price, smr, kep,
    target, lo: minKep, hi: maxKep,
    delta: belowMin ? minKep - kep : 0,
    reserveFloor, reserveHouse,
    revenuePotential, costPotential,
    currentConfirmed, targetCompatible,
    baseGap: belowMin,
    status: level
  };
}

async function saveMetaResult() {
  const state = window.__PROEKTSET_META_CORE_STATE__;
  const statusEl = $('saveStatus');
  if (!state) return;
  const show = (text, err = false) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'status show' + (err ? ' err' : '');
  };
  try {
    show('Сохраняем…');
    const sb = createClient(URL, KEY);
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const anon = await sb.auth.signInAnonymously();
      if (anon.error) throw anon.error;
      session = anon.data.session;
    }
    const confirmedReserveFloor = state.baseGap ? state.reserveFloor : 0;
    const confirmedReserveHouse = state.baseGap ? state.reserveHouse : 0;
    const confirmedEffect = state.baseGap ? state.revenuePotential : 0;
    const { error } = await sb.from('calculations').insert({
      user_id: session.user.id,
      house_type: state.type,
      building_area: state.b,
      apartment_area: state.a,
      apartment_count: state.c,
      avg_apartment_area: state.av,
      typical_floors: state.floors,
      sale_price: state.price,
      kep: state.kep,
      status: state.status + (state.baseGap ? ' | BELOW_MIN' : ' | TARGET_ZONE'),
      target_kep: state.target,
      range_low: state.lo,
      range_high: state.hi,
      delta_kep: state.delta,
      reserve_floor: confirmedReserveFloor,
      reserve_total: confirmedReserveHouse,
      realization_coeff: state.baseGap ? 1 : 0,
      economic_effect: confirmedEffect,
      complex_name: $('complex')?.value.trim() || null,
      region: $('region')?.value.trim() || null
    });
    if (error) throw error;
    show(state.baseGap ? 'Расчет сохранен. В статистику включен резерв только до целевого минимума.' : 'Расчет сохранен. Денежный резерв не зафиксирован, так как КЭП находится в целевом диапазоне или выше него.');
  } catch (e) {
    console.error(e);
    show('Не удалось сохранить расчет: ' + (e?.message || 'ошибка'), true);
  }
}

ensureUi();

const watched = ['build', 'apt', 'count', 'avg', 'floors', 'price', 'smr'];
for (const id of watched) $(id)?.addEventListener('input', calculate);
document.querySelectorAll('input[name=type]').forEach(el => el.addEventListener('change', calculate));

if ($('saveBtn')) $('saveBtn').onclick = saveMetaResult;

ensureInfoModal();
addTypeInfoButton();
addInfoButtonToLabel('build', 'Площадь этажа для расчета КЭП', 'Площадь типового этажа по наружной грани строительных ограждающих конструкций, за вычетом площадей лифтовых шахт и балконов. Это знаменатель формулы КЭП.');
addInfoButtonToLabel('apt', 'Площадь квартир', 'Суммарная площадь квартир типового этажа с учетом лоджий. Это числитель формулы КЭП.');
addInfoButtonToLabel('count', 'Количество квартир', 'Количество квартир на типовом этаже. Используется вместе с площадью квартир для расчета фактической средней площади. Любое изменение квартирности или Sср должно дополнительно проверяться на соответствие Атрибутивной модели.');
addInfoButtonToLabel('avg', 'Средняя площадь квартиры', 'Автоматически рассчитывается как площадь квартир / количество квартир. Ручной ввод отключен. Изменение Sср за счет квартирографии может рассматриваться только при соответствии Атрибутивной модели.');
addInfoButtonToLabel('floors', 'Количество типовых этажей', 'Используется для перевода эффекта одного типового этажа в эффект по дому: резерв площади, дополнительная выручка и возможное снижение СМР.');
addInfoButtonToLabel('price', 'Цена реализации', 'Цена продажи 1 м². Используется для оценки верхней границы дополнительной выручки от потенциального роста продаваемой площади.');
addInfoButtonToLabel('smr', 'СМР', 'Стоимость строительно-монтажных работ на 1 м². Используется в альтернативном сценарии: оценка экономии при сокращении строительной площади без уменьшения площади квартир.');

calculate();
