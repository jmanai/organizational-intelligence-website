import assert from 'node:assert/strict';
import config from '../assets/data/meeting-cost-config.mjs';
import {initialState,meetingResults,numberValue,money,aggregateSnapshot} from '../assets/js/meeting-cost-core.mjs';
import {onRequestPost,onRequestGet} from '../functions/api/meeting-cost-contact.js';
let checks=0;const check=(condition)=>{assert.ok(condition);checks++;};const near=(actual,expected)=>check(Math.abs(actual-expected)<1e-7);
let state=initialState(config),r=meetingResults(state,config);
near(r.meetingCost,865.3846153846154);near(r.annualCost,45000);near(r.hours,6);near(r.annualHours,312);
state={...state,attendees:3,mode:'individual',salaries:['10000','20000','30000'],duration:30,frequency:'biweekly'};
r=meetingResults(state,config);near(r.meetingCost,173.07692307692307);near(r.annualCost,4500);near(r.hours,1.5);near(r.annualHours,39);
for(const [minutes] of config.durations)for(const [frequency,,meetings] of config.frequencies.filter(([k])=>k!=='custom')){
 r=meetingResults({...initialState(config),duration:minutes,frequency},config);near(r.meetingCost,150000*12/2080*minutes/60);near(r.annualCost,150000*12/2080*minutes/60*meetings);near(r.annualHours,6*minutes/60*meetings);
}
for(const [currency] of config.currencies){r=meetingResults({...initialState(config),currency},config);near(r.annualCost,45000);check(money(r.meetingCost,currency).includes(currency));}
check(money(1,'KWD').endsWith('1.000'));check(money(1,'AED').endsWith('1.00'));
for(const value of ['',null,undefined,-1,'-1','NaN','Infinity','1e10','25,00','1,2','abc',{},[]])check(numberValue(value)===null);
check(numberValue('25,000.25')===25000.25);check(numberValue('0')===0);check(numberValue(1e-12)===1e-12);check(numberValue('1.5',{integer:true})===null);
for(const attendees of [0,51,1.5,''])check(meetingResults({...initialState(config),attendees},config).meetingCost===null);
check(meetingResults({...state,salaries:['0','','20000']},config).meetingCost===null);
check(meetingResults({...state,salaries:['0','0','0']},config).meetingCost===0);
check(meetingResults({...initialState(config),frequency:'custom',customFrequency:''},config).annualCost===null);
near(meetingResults({...initialState(config),frequency:'custom',customFrequency:100000},config).annualHours,600000);
check(meetingResults({...initialState(config),frequency:'custom',customFrequency:100001},config).annualCost===null);
r=meetingResults({...initialState(config),attendees:50,averageSalary:'1000000000',duration:180,frequency:'custom',customFrequency:100000},config);check(Number.isFinite(r.annualCost));
const snapshot=aggregateSnapshot(initialState(config),config);check(!JSON.stringify(snapshot).includes('salary'));check(!Object.hasOwn(snapshot,'averageSalary'));
const env={HUBSPOT_PORTAL_ID:'test',HUBSPOT_CONTACT_FORM_ID:'test',RESEND_API_KEY:'test-only',EMAIL_FROM:'test@example.com',CONTACT_TO_EMAIL:'test@example.com'};
const base={firstName:'Example',email:'example@example.com',company:'Synthetic Co',message:'Better decisions',consent:true,meeting:snapshot};
const request=(body,origin='http://localhost')=>new Request('http://localhost/api/meeting-cost-contact',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
const call=async(body=base,mode=env,origin)=>onRequestPost({request:request(body,origin),env:mode});
check((await onRequestGet({env:{INTEGRATIONS_MODE:'mock'}}).json()).available);check(!(await onRequestGet({env:{TURNSTILE_SECRET_KEY:'test'}}).json()).available);
const originalFetch=globalThis.fetch;let calls=[];
try{
 globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response('{}',{status:200});};
 let res=await call(base,{INTEGRATIONS_MODE:'mock'});check((await res.json()).mock===true);check(calls.length===0);
 res=await call();check(res.status===200);check(calls.length===2);
 const notification=calls[1].body.text.replace(/\s/g," ");check(notification.includes('AED 45,000.00'));check(notification.includes('312 person-hours'));check(!notification.includes('25,000'));check(!notification.includes('averageSalary'));
 check(calls[0].body.fields.map(f=>f.name).join(',')==='email,firstname,company,message');
 for(const body of [{...base,consent:false},{...base,email:'invalid'},{...base,meeting:{...snapshot,currency:'XXX'}},{...base,meeting:{...snapshot,attendees:-1}},{...base,meeting:{...snapshot,combinedHourlyCost:"Infinity"}},{...base,meeting:{...snapshot,salaries:[25000]}},{...base,meeting:{...snapshot,meetingCost:1}}]){res=await call(body);check(res.status===400);}
 res=await call(base,env,'https://bad.example');check(res.status===403);
 res=await call({...base,website:'bot'});check((await res.json()).discarded===true);
 res=await call({...base,meeting:{...snapshot,combinedHourlyCost:null}});check(res.status===200);
 res=await call({...base,meeting:{...snapshot,attendees:null,combinedHourlyCost:null}});check(res.status===200);
 res=await call(base,{...env,TURNSTILE_SECRET_KEY:'test'});check(res.status===400);
 let verificationCalls=0;globalThis.fetch=async(url,options)=>{verificationCalls++;return new Response(String(url).includes('siteverify')?'{"success":true}':'{}',{status:200});};
 res=await call({...base,turnstileToken:'synthetic-token'},{...env,TURNSTILE_SECRET_KEY:'test'});check(res.status===200);check(verificationCalls===3);
 globalThis.fetch=async()=>new Response('{"success":false}',{status:200});res=await call({...base,turnstileToken:'synthetic-token'},{...env,TURNSTILE_SECRET_KEY:'test'});check(res.status===400);
 globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response('{}',{status:200});};
 res=await call({...base,message:'<script>alert(1)</script>'});check(res.status===200);check(calls.at(-1).body.html.includes('&lt;script&gt;'));check(!calls.at(-1).body.html.includes('<script>'));

 globalThis.fetch=async()=>new Response('{}',{status:400});res=await call();check(res.status===502);check(!(await res.json()).uncertain);
 globalThis.fetch=async()=>new Response('{}',{status:503});res=await call();check((await res.json()).uncertain===true);
 let count=0;globalThis.fetch=async()=>new Response('{}',{status:++count===1?200:500});res=await call();check((await res.json()).uncertain===true);
 globalThis.fetch=async()=>{throw new DOMException('Timeout','TimeoutError');};res=await call();check((await res.json()).uncertain===true);
 check(calls.length>=2);
}finally{globalThis.fetch=originalFetch;}
console.log(`Meeting calculator: ${checks} checks passed; all integrations intercepted or mocked.`);
