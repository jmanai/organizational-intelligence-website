import {initialState,numberValue,meetingResults,money,aggregateSnapshot,track} from './meeting-cost-core.mjs';
import {setupContact} from './meeting-cost-contact.mjs';
const $ = id => document.getElementById(id);
async function start() {
  const {default:config} = await import('../data/meeting-cost-config.mjs');
  let state = initialState(config), started = false, announcement;
  for (const [id,options] of [['currency',config.currencies.map(([code,name])=>[code,`${code} — ${name}`])],['frequency',config.frequencies]]) {
    for (const [value,label] of options) $(id).add(new Option(label,value));
  }
  for (let i=0;i<50;i++) {
    const label = document.createElement('label'); label.className='field'; label.htmlFor=`salary-${i}`;
    const title = document.createElement('span'); title.textContent=`Attendee ${i+1}`;
    const wrapper = document.createElement('div'); wrapper.className='money';
    const currency = document.createElement('span'); currency.dataset.currency=''; currency.textContent=state.currency;
    const input = document.createElement('input'); Object.assign(input,{id:`salary-${i}`,type:'text',inputMode:'decimal',autocomplete:'off'});
    input.dataset.salaryIndex=i; input.setAttribute('aria-describedby',`salary-${i}-error`);
    const error = document.createElement('span'); error.id=`salary-${i}-error`; error.className='error'; error.hidden=true; error.textContent='Enter a salary from 0 to 1,000,000,000.';
    wrapper.append(currency,input); label.append(title,wrapper,error); $('salary-list').append(label);
  }
  function error(id,invalid) {
    $(id).setAttribute('aria-invalid',String(invalid));
    const message=$(`${id}-error`);
    if(message)message.hidden=!invalid;
  }
  function syncFields() {
    for (const key of ['currency','attendees','frequency']) $(key).value=state[key];
    $('custom-frequency').value=state.customFrequency;
    $('duration-range').value=config.durations.findIndex(([n])=>n===Number(state.duration));
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
    $('annual-cost').textContent=money(r.annualCost,state.currency);
    $('meeting-cost').classList.toggle('long',$('meeting-cost').textContent.length>18);
    const durationText=config.durations.find(([n])=>n===Number(state.duration))[1];
    $('duration-label').textContent=durationText;$('duration-range').setAttribute('aria-valuetext',durationText);
    const hint = !r.attendees ? 'Enter a whole number of attendees from 1 to 50.' : r.hourly==null ? 'Enter a monthly salary from 0 to 1,000,000,000 for each attendee.' : r.meetings==null ? 'Enter a whole number of meetings per year from 1 to 100,000.' : '';
    $('calculator-error').textContent=hint;$('calculator-error').hidden=!hint;
    if(announce){
      clearTimeout(announcement);announcement=setTimeout(()=>{$('result-announcement').textContent=`${r.meetingCost==null ? hint : `Meeting cost ${money(r.meetingCost,state.currency)}.`} Annual cost ${money(r.annualCost,state.currency)}.`;},450);}
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
    if(el.dataset.salaryIndex!=null)state.salaries[Number(el.dataset.salaryIndex)]=el.value;
    else if(el.name==='salary-mode')state.mode=el.value;
    else if(el.id==='average-salary')state.averageSalary=el.value;
    else if(el.id==='custom-frequency')state.customFrequency=el.value;
    else if(el.id==='duration-range')state.duration=config.durations[Number(el.value)][0];
    else if(['currency','attendees','frequency'].includes(el.id))state[el.id]=el.value;
    render(true);
  });
  $('calculator-inputs').addEventListener('focusout',e=>{if(e.target.id==='average-salary'||e.target.dataset.salaryIndex!=null)e.target.value=displaySalary(e.target.value);});
  $('fill-salaries').addEventListener('click',()=>{
    const count=numberValue(state.attendees,{min:1,max:50,integer:true}); if(!count)return;
    for(let i=0;i<count;i++)state.salaries[i]='25000';syncFields();render(true);
    if(!started){started=true;track('meeting_calculator_started','calculator');}
  });
  $('reset-calculator').addEventListener('click',()=>{
    state=initialState(config);clearTimeout(announcement);syncFields();render(true);
  });
  syncFields();render();$('calculator').hidden=false;$('contact-fields').disabled=false;
  setupContact(()=>aggregateSnapshot(state,config));
}
start().catch(()=>{$('load-error').hidden=false;});
