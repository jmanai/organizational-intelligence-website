// No DOM or integration dependencies: used by the browser and Pages Function.
export function numberValue(value, {min = 0, max = Infinity, integer = false} = {}) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)) ? value : null;
  const raw = String(value).trim();
  // Accept conventional thousands grouping, but reject malformed grouping and exponents.
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?$/.test(raw)) return null;
  const n = Number(raw.replaceAll(',', ''));
  return Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n)) ? n : null;
}
export function money(value, currency) {
  return value == null ? '—' : new Intl.NumberFormat('en-US', {style:'currency', currency, currencyDisplay:'code'}).format(value);
}
export function quantity(value) {
  return value == null ? '—' : new Intl.NumberFormat('en-US', {maximumFractionDigits:2}).format(value);
}
export function initialState(config) {
  return {...config.defaults, salaries:Array(50).fill('')};
}
export function meetingResults(state, config, aggregate = false) {
  const currency = config.currencies.some(([code]) => code === state.currency) ? state.currency : null;
  const attendees = numberValue(state.attendees, {min:1,max:50,integer:true});
  const duration = config.durations.some(([minutes]) => minutes === Number(state.duration)) ? Number(state.duration) : null;
  const mode = ['average','individual'].includes(state.mode) ? state.mode : null;
  const frequency = config.frequencies.find(([key]) => key === state.frequency);
  const meetings = frequency ? (frequency[0] === 'custom' ? numberValue(state.customFrequency,{min:1,max:config.maxMeetings,integer:true}) : frequency[2]) : null;
  let hourly = null;
  if (attendees && mode && currency) {
    if (aggregate) {
      hourly = numberValue(state.combinedHourlyCost, {max:config.maxSalary * 12 / config.workingHours * attendees});
    } else if (mode === 'average') {
      const salary = numberValue(state.averageSalary,{max:config.maxSalary});
      if (salary != null) hourly = salary * 12 / config.workingHours * attendees;
    } else {
      const salaries = Array.from({length:attendees},(_,i)=>numberValue(state.salaries?.[i],{max:config.maxSalary}));
      if (salaries.every(v=>v != null)) hourly = salaries.reduce((sum,salary)=>sum + salary * 12 / config.workingHours,0);
    }
  }
  const meetingCost = hourly != null && duration ? hourly * duration / 60 : null;
  const hours = attendees && duration ? attendees * duration / 60 : null;
  const annualCost = meetingCost != null && meetings ? meetingCost * meetings : null;
  const annualHours = hours != null && meetings ? hours * meetings : null;
  return {currency,attendees,duration,mode,frequency:frequency?.[0] ?? null,meetings,hourly,meetingCost,hours,annualCost,annualHours};
}
export function aggregateSnapshot(state, config) {
  const r = meetingResults(state,config);
  return {currency:state.currency,attendees:r.attendees,mode:state.mode,duration:r.duration,frequency:state.frequency,
    customFrequency:state.frequency === 'custom' ? r.meetings : null,combinedHourlyCost:r.hourly};
}
export function summaryRows(r, config) {
  return [
    ['Currency',r.currency ?? 'Unavailable'], ['Attendees',quantity(r.attendees)],
    ['Salary entry',r.mode === 'individual' ? 'Individual salaries' : 'One average salary'],
    ['Meeting duration',config.durations.find(([n])=>n === r.duration)?.[1] ?? 'Unavailable'],
    ['Frequency',config.frequencies.find(([key])=>key === r.frequency)?.[1] ?? 'Unavailable'],
    ['Meetings per year',quantity(r.meetings)], ['Combined hourly cost',money(r.hourly,r.currency ?? 'AED')],
    ['Meeting cost',money(r.meetingCost,r.currency ?? 'AED')], ['Annual cost',money(r.annualCost,r.currency ?? 'AED')],
    ['Employee time per meeting',r.hours == null ? 'Unavailable' : `${quantity(r.hours)} person-hours`],
    ['Annual employee time',r.annualHours == null ? 'Unavailable' : `${quantity(r.annualHours)} person-hours`]
  ];
}
export function track(event, placement) {
  // The released site chrome has an older event handler. Enforce consent here too.
  let consent; try { consent = localStorage.getItem('oi_analytics_consent'); } catch { return; }
  if (!['orgintelligence.io','www.orgintelligence.io'].includes(location.hostname) || consent !== 'granted' || !window.gtag) return;
  window.gtag('event',event,{form_type:'meeting_cost',placement});
}
