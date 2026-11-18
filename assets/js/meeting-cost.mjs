import {initialState,numberValue,meetingResults,money,quantity,summaryRows,aggregateSnapshot,track} from './meeting-cost-core.mjs';
import {setupContact} from './meeting-cost-contact.mjs';
const $ = id => document.getElementById(id);
async function start() {
  const response = await fetch('/assets/data/meeting-cost.json');
  if (!response.ok) throw new Error('Configuration unavailable');
  const config = await response.json();
  let state = initialState(config), started = false, announcement;
  for (const [id,options] of [['currency',config.currencies.map(([code,name])=>[code,`${code} — ${name}`])],['duration',config.durations],['frequency',config.frequencies]]) {
    for (const [value,label] of options) $(id).add(new Option(label,value));
  }
  for (let i=0;i<50;i++) {
    const label = document.createElement('label'); label.className='mc-field'; label.htmlFor=`salary-${i}`;
    const title = document.createElement('span'); title.textContent=`Attendee ${i+1}`;
    const wrapper = document.createElement('div'); wrapper.className='mc-money-input';
    const currency = document.createElement('span'); currency.dataset.currency=''; currency.textContent=state.currency;
    const input = document.createElement('input'); Object.assign(input,{id:`salary-${i}`,type:'text',inputMode:'decimal',autocomplete:'off'});
    input.dataset.salaryIndex=i; input.setAttribute('aria-describedby',`salary-${i}-error salary-help`);
    const error = document.createElement('span'); error.id=`salary-${i}-error`; error.className='mc-error'; error.hidden=true; error.textContent='Enter a salary from 0 to 1,000,000,000.';
    wrapper.append(currency,input); label.append(title,wrapper,error); $('salary-list').append(label);
  }
  function error(id,invalid) {$(id).setAttribute('aria-invalid',String(invalid)); $(id === 'average-salary' ? 'average-error' : id === 'custom-frequency' ? 'custom-error' : `${id}-error`).hidden=!invalid;}
  function syncFields() {
    for (const key of ['currency','attendees','duration','frequency']) $(key).value=state[key];
    $('custom-frequency').value=state.customFrequency;
    $('average-salary').value=displaySalary(state.averageSalary);
    document.querySelectorAll('[name=salary-mode]').forEach(input=>input.checked=input.value===state.mode);
    document.querySelectorAll('[data-salary-index]').forEach(input=>input.value=displaySalary(state.salaries[Number(input.dataset.salaryIndex)]));
  }
  function displaySalary(value) {const n=numberValue(value,{max:config.maxSalary});return n == null ? value : new Intl.NumberFormat('en-US',{maximumFractionDigits:20}).format(n);}
  function render(announce=false) {
    const r = meetingResults(state,config);
    $('average-fields').hidden=state.mode!=='average'; $('individual-fields').hidden=state.mode!=='individual'; $('custom-fields').hidden=state.frequency!=='custom';
    document.querySelectorAll('[data-currency]').forEach(el=>el.textContent=state.currency);
    document.querySelectorAll('[data-salary-index]').forEach(input=>{
      const i=Number(input.dataset.salaryIndex),active=r.attendees!=null && i<r.attendees;
      input.closest('label').hidden=!active;input.disabled=!active || state.mode!=='individual';
      error(input.id,active && state.mode==='individual' && state.salaries[i]!=='' && numberValue(state.salaries[i],{max:config.maxSalary})==null);
    });
    $('average-salary').disabled=state.mode!=='average'; $('custom-frequency').disabled=state.frequency!=='custom';
    error('attendees',r.attendees==null);
    document.querySelectorAll('[data-attendee-step]').forEach(button=>{
      const next=r.attendees==null ? null : r.attendees+Number(button.dataset.attendeeStep);
      button.disabled=next==null || next<1 || next>50;
    });
    error('average-salary',state.mode==='average' && state.averageSalary!=='' && numberValue(state.averageSalary,{max:config.maxSalary})==null);
    error('custom-frequency',state.frequency==='custom' && state.customFrequency!=='' && r.meetings==null);
    $('meeting-cost').textContent=money(r.meetingCost,state.currency);
    $('person-hours').textContent=r.hours==null ? 'Employee time unavailable' : `${quantity(r.hours)} person-hours`;
    $('annual-cost').textContent=money(r.annualCost,state.currency); $('annual-hours').textContent=quantity(r.annualHours);
    $('result-attendees').textContent=quantity(r.attendees); $('hourly-cost').textContent=money(r.hourly,state.currency);
    $('result-duration').textContent=config.durations.find(([minutes])=>minutes===r.duration)?.[1] ?? '—'; $('result-frequency').textContent=quantity(r.meetings);
    const hint = !r.attendees ? 'Enter 1 to 50 attendees to see the estimate.' : r.hourly==null ? 'Enter all monthly salaries to see the cost.' : '';
    $('result-hint').textContent=hint; $('result-hint').hidden=!hint;
    $('annual-note').textContent=r.meetings==null ? 'Enter a valid number of meetings per year to see annual totals.' : r.frequency==='once' ? 'Based on one meeting this year.' : `Based on ${quantity(r.meetings)} meetings per year.`;
    $('frequency-note').textContent=r.frequency==='daily' ? 'Daily assumes 260 working days per year.' : r.meetings!=null ? `${config.frequencies.find(([key])=>key===r.frequency)?.[1]} assumes ${quantity(r.meetings)} meeting${r.meetings===1?'':'s'} per year.` : 'Enter 1 to 100,000 meetings per year.';
    const fragment=document.createDocumentFragment();
    for (const [key,value] of summaryRows(r,config)) {const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;row.append(dt,dd);fragment.append(row);}
    $('contact-summary').replaceChildren(fragment);
    if(announce){
      clearTimeout(announcement);announcement=setTimeout(()=>{$('result-announcement').textContent=`${r.meetingCost==null ? hint : `Meeting cost ${money(r.meetingCost,state.currency)}.`} ${r.hours==null?'':`${quantity(r.hours)} person-hours.`} Annual cost ${money(r.annualCost,state.currency)}.`;},450);}
  }
  document.querySelectorAll('[data-attendee-step]').forEach(button=>button.addEventListener('click',()=>{
    const count=numberValue(state.attendees,{min:1,max:50,integer:true});
    if(count==null)return;
    const next=count+Number(button.dataset.attendeeStep);
    if(next<1 || next>50)return;
    $('attendees').value=String(next);
    $('attendees').dispatchEvent(new Event('input',{bubbles:true}));
  }));
  $('calculator-inputs').addEventListener('submit',e=>e.preventDefault());
  $('calculator-inputs').addEventListener('input',e=>{
    const el=e.target;
    if(!started){started=true;track('meeting_calculator_started','calculator');}
    $('example-note').textContent='Your estimate updates as you change the figures.';
    if(el.dataset.salaryIndex!=null)state.salaries[Number(el.dataset.salaryIndex)]=el.value;
    else if(el.name==='salary-mode')state.mode=el.value;
    else if(el.id==='average-salary')state.averageSalary=el.value;
    else if(el.id==='custom-frequency')state.customFrequency=el.value;
    else if(['currency','attendees','duration','frequency'].includes(el.id))state[el.id]=el.value;
    render(true);
  });
  $('calculator-inputs').addEventListener('focusout',e=>{if(e.target.id==='average-salary'||e.target.dataset.salaryIndex!=null)e.target.value=displaySalary(e.target.value);});
  $('fill-salaries').addEventListener('click',()=>{
    const count=numberValue(state.attendees,{min:1,max:50,integer:true}); if(!count)return;
    for(let i=0;i<count;i++)state.salaries[i]='25000';syncFields();render(true);
    if(!started){started=true;track('meeting_calculator_started','calculator');}
    $('example-note').textContent='Your estimate updates as you change the figures.';
  });
  $('reset-calculator').addEventListener('click',()=>{
    state={...initialState(config),averageSalary:''};clearTimeout(announcement);syncFields();render(true);
    $('example-note').textContent='Inputs cleared. Enter figures for a new estimate.';$('average-salary').focus();
  });
  document.querySelectorAll('[data-redesign-cta]').forEach(link=>link.addEventListener('click',()=>{track('meeting_redesign_cta_click','calculator');$('first-name').focus({preventScroll:true});}));
  const compact = matchMedia('(max-width:700px)');
  const resizeSummary=()=>{$('meeting-breakdown').open=!compact.matches;};
  compact.addEventListener('change',resizeSummary);resizeSummary();
  syncFields();render();$('calculator').hidden=false;$('contact-fields').disabled=false;
  setupContact(()=>aggregateSnapshot(state,config));
}
start().catch(()=>{$('load-error').hidden=false;});
