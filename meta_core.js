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
    span.textContent = 'До нижней рабочей границы';
    const b = document.createElement('b');
    b.id = 'workGap';
    row.append(span, b);
    const targetRow = $('target')?.closest('.row');
    rows.insertBefore(row, targetRow || null);
  }

  const rf = $('rf');
  if (rf?.parentElement?.querySelector('small')) rf.parentElement.querySelector('small').textContent = 'Теоретический разрыв / этаж';
  const rt = $('rt');
  if (rt?.parentElement?.querySelector('small')) rt.parentElement.querySelector('small').textContent = 'Теоретический разрыв / дом';
  const effect = $('effect');
  if (effect?.parentElement?.querySelector('small')) effect.parentElement.querySelector('small').textContent = 'Потенциал выручки до цели';

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
    style.textContent = '.analysisBox{margin-top:12px;padding:13px;border-radius:10px;background:#f5f6f3;color:#28322d;border:1px solid #d5dad5;line-height:1.5}.analysisBox b{color:#24302a}.analysisBox .metaHead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:7px}.analysisBox .metaTag{display:inline-block;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;background:#e2e9e4;color:#315b49}.analysisBox .metaTag.warn{background:#f0e4bc;color:#6a5a27}.analysisBox .metaTag.bad{background:#efd8d5;color:#7c413b}.analysisBox .scenario{margin-top:8px;padding-top:8px;border-top:1px solid #d9ddd8}';
    document.head.appendChild(style);
  }
}

function calculate() {
  const b = val('build');
  const a = val('apt');
  const c = Math.max(1, Math.round(val('count')));
  const avInput = val('avg');
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
  const workingMin = platform.working[0];
  const target = platform.target;
  const entrySell = Math.max(0, workingMin * b - a);
  const entryBuild = a / workingMin;
  const targetSellArea = target * b;
  const targetSell = Math.max(0, targetSellArea - a);
  const targetAvg = targetSellArea / c;
  const targetBuild = a / target;
  const targetBuildDelta = Math.max(0, b - targetBuild);
  const reserveHouse = targetSell * floors;
  const revenuePotential = reserveHouse * price;
  const costPotential = targetBuildDelta * floors * smr;

  let level = 'НИЗКИЙ';
  let badgeBg = 'var(--bad)';
  if (kep >= workingMin && kep < target - 0.003) { level = 'РАБОЧИЙ'; badgeBg = 'var(--good)'; }
  else if (kep >= target - 0.003 && kep <= platform.working[1] + 0.004) { level = 'ЦЕЛЕВОЙ'; badgeBg = 'var(--good)'; }
  else if (kep >= workingMin - 0.015 && kep < workingMin) { level = 'НИЖЕ РАБОЧЕГО'; badgeBg = 'var(--warn)'; }
  else if (kep > platform.working[1] + 0.004) { level = 'ВЫСОКИЙ — ПРОВЕРИТЬ БАЛАНС'; badgeBg = 'var(--warn)'; }

  const cls = inferClass(avgCalc);
  const reasons = [];
  let envelope = null;
  let mathConfirmed = false;
  let calibrationText = 'Подтвержденная калибровка для этой комбинации не найдена.';

  if (cls) {
    const units = cls.rule.units[type];
    const countOk = between(c, units);
    if (!countOk) reasons.push('квартирность ' + c + ' вне диапазона ' + units[0] + '–' + units[1] + ' для ' + cls.rule.name + ' / ' + platform.label);
    if (!cls.calibrated) reasons.push('Sср ' + fmt(avgCalc, 1) + ' м² вне подтвержденного диапазона ' + fmt(cls.rule.allowed[0], 1) + '–' + fmt(cls.rule.allowed[1], 1) + ' м²');

    if (cls.calibrated && countOk && META.envelopes[cls.id]?.[type]?.[c]) {
      envelope = META.envelopes[cls.id][type][c];
      calibrationText = cls.rule.name + ' / ' + platform.label + ' / ' + c + ' кв.: калиброванный КЭП ' + fmt(envelope.kep[0], 3) + '–' + fmt(envelope.kep[1], 3) + ' (' + fmt(envelope.n, 0) + ' вариантов).';
      const targetInKep = between(target, envelope.kep);
      const growthPossible = between(targetSellArea, envelope.sell) && between(targetAvg, envelope.avg) && targetInKep;
      const reductionPossible = between(a, envelope.sell) && targetInKep;
      mathConfirmed = growthPossible || reductionPossible;
      if (!targetInKep) reasons.push('цель ' + fmt(target, 3) + ' вне калиброванного диапазона КЭП для этой квартирности');
      if (!growthPossible && !reductionPossible && targetInKep) reasons.push('для цели требуется изменить баланс Sпрод / Sср или конфигурацию этажа');
    } else if (cls.rule.status === 'hypothesis') {
      reasons.push('для класса ' + cls.rule.name + ' в загруженном ядре нет подтвержденного массива кандидатов');
    }
  } else {
    reasons.push('Sср ' + fmt(avgCalc, 1) + ' м² вне профилей, на которых откалибровано ядро МЕТА');
    const confirmedRanges = Object.values(META.classes).filter(x => x.status === 'confirmed').map(x => x.units[type]);
    const minUnits = Math.min(...confirmedRanges.map(x => x[0]));
    const maxUnits = Math.max(...confirmedRanges.map(x => x[1]));
    if (c < minUnits || c > maxUnits) reasons.push('для подтвержденных классов платформы ' + platform.label + ' квартирность находится в диапазоне ' + minUnits + '–' + maxUnits + ', введено ' + c);
  }

  if (!between(a, platform.sell)) reasons.push('Sпрод ' + fmt(a, 1) + ' м² вне базового диапазона платформы ' + fmt(platform.sell[0], 0) + '–' + fmt(platform.sell[1], 0) + ' м²');

  const consistency = Math.abs(c * avInput - a) / Math.max(a, 1);
  if (consistency > 0.05) reasons.unshift('введенная Sср не согласована с Sквартир / N более чем на 5%');

  $('kep').textContent = fmt(kep, 3);
  $('badge').textContent = level;
  $('badge').style.background = badgeBg;
  $('range').textContent = fmt(platform.working[0], 3) + ' — ' + fmt(platform.working[1], 3);
  $('target').textContent = fmt(target, 3);
  $('delta').textContent = target > kep ? '+' + fmt(target - kep, 3) : '0,000';
  $('workGap').textContent = entrySell > 0 ? '+' + fmt(entrySell, 1) + ' м²/этаж' : 'достигнута';
  $('rf').textContent = targetSell > 0 ? '+' + fmt(targetSell, 1) + ' м²' : '—';
  $('rt').textContent = targetSell > 0 ? '+' + fmt(reserveHouse, 0) + ' м²' : '—';
  $('effect').textContent = targetSell > 0 ? rub(revenuePotential) : '—';

  if ($('validation')) {
    $('validation').textContent = 'Расчетная Sср = Sквартир / N = ' + fmt(avgCalc, 1) + ' м². ' + (consistency > 0.05 ? 'Введено ' + fmt(avInput, 1) + ' м² — данные нужно сверить.' : 'Введенная Sср согласована с расчетной.');
  }

  box.textContent = '';
  const head = document.createElement('div');
  head.className = 'metaHead';
  addTag(head, mathConfirmed ? 'МЕТА: ЦЕЛЬ МАТЕМАТИЧЕСКИ ПОДТВЕРЖДАЕТСЯ' : 'ТЕОРЕТИЧЕСКИЙ ПОТЕНЦИАЛ', mathConfirmed ? '' : 'bad');
  if (cls) addTag(head, cls.rule.name, cls.calibrated ? '' : 'warn');
  box.appendChild(head);

  const calib = document.createElement('div');
  const cb = document.createElement('b');
  cb.textContent = 'Калибровка МЕТА: ';
  calib.append(cb, document.createTextNode(calibrationText + ' Основа — математический массив 67 468 вариантов; геометрия конкретного этажа этим расчетом не подтверждается.'));
  box.appendChild(calib);

  const entryText = entrySell > 0
    ? ' До нижней рабочей границы ' + fmt(workingMin, 3) + ': теоретически +' + fmt(entrySell, 1) + ' м² продаваемой площади на этаж или сокращение площади этажа с ' + fmt(b, 1) + ' до ' + fmt(entryBuild, 1) + ' м².'
    : ' Нижняя рабочая граница ' + fmt(workingMin, 3) + ' уже достигнута.';
  addLine(box, entryText, 'Рабочая граница.');

  const targetText = targetSell > 0
    ? ' Теоретический разрыв до КЭП ' + fmt(target, 3) + ' — ' + fmt(targetSell, 1) + ' м² продаваемой площади на этаж. При ' + c + ' квартирах Sср должна измениться с ' + fmt(avgCalc, 1) + ' до ' + fmt(targetAvg, 1) + ' м². Альтернатива — сохранить ' + fmt(a, 1) + ' м² квартир и сократить площадь этажа с ' + fmt(b, 1) + ' до ' + fmt(targetBuild, 1) + ' м².'
    : ' Целевой КЭП ' + fmt(target, 3) + ' уже достигнут или превышен.';
  addLine(box, targetText, 'Цель.');

  const moneyText = targetSell > 0
    ? ' Рост продаваемой площади дает верхнюю теоретическую оценку ' + rub(revenuePotential) + ' дополнительной выручки за ' + floors + ' типовых этажей. Альтернатива через сокращение площади — до ' + rub(costPotential) + ' снижения СМР при ставке ' + fmt(smr, 0) + ' ₽/м².'
    : ' Дополнительный денежный резерв до целевого КЭП не рассчитывается.';
  addLine(box, moneyText, 'Деньги.');

  if (reasons.length) addLine(box, ' ' + reasons.join('; ') + '.', 'Ограничения.');

  addLine(
    box,
    mathConfirmed
      ? ' Цель подтверждается математическим массивом МЕТА для этой комбинации. Геометрия и квартирография конкретного этажа требуют отдельной проверки.'
      : ' Это теоретическая верхняя граница. Реализуемость требует проверки квартирографии и геометрии этажа.',
    'Реализуемость.'
  );

  window.__PROEKTSET_META_CORE_STATE__ = {
    type, b, a, c, av: avgCalc, floors, price, smr, kep,
    target, lo: platform.working[0], hi: platform.working[1],
    delta: Math.max(0, target - kep), reserveFloor: targetSell, reserveHouse,
    revenuePotential, costPotential, mathConfirmed, status: level
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
    const confirmedReserveFloor = state.mathConfirmed ? state.reserveFloor : 0;
    const confirmedReserveHouse = state.mathConfirmed ? state.reserveHouse : 0;
    const confirmedEffect = state.mathConfirmed ? state.revenuePotential : 0;
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
      status: state.status + (state.mathConfirmed ? ' | META_OK' : ' | THEORETICAL'),
      target_kep: state.target,
      range_low: state.lo,
      range_high: state.hi,
      delta_kep: state.delta,
      reserve_floor: confirmedReserveFloor,
      reserve_total: confirmedReserveHouse,
      realization_coeff: state.mathConfirmed ? 1 : 0,
      economic_effect: confirmedEffect,
      complex_name: $('complex')?.value.trim() || null,
      region: $('region')?.value.trim() || null
    });
    if (error) throw error;
    show(state.mathConfirmed ? 'Расчет сохранен. Потенциал подтвержден математической калибровкой МЕТА.' : 'Расчет сохранен как теоретический; неподтвержденный эффект не включен в общую статистику.');
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

calculate();
