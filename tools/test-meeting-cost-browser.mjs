import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const base=process.env.QA_BASE_URL||'http://localhost:8790';
const readiness=await fetch(`${base}/api/meeting-cost-contact`).then(r=>r.json());
if(readiness.mock!==true)throw new Error('Browser checks require INTEGRATIONS_MODE=mock. No form submissions performed.');
const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH}:{});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const pass=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
const text=id=>page.locator('#'+id).innerText();
async function open(){await page.goto(`${base}/meeting-cost`);await page.locator('#calculator').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#contact-fields').disabled && !document.querySelector('#meeting-contact [type=submit]').disabled);await page.evaluate(()=>document.fonts.ready);}
const output=process.env.QA_OUTPUT_DIR?pathToFileURL(resolve(process.env.QA_OUTPUT_DIR)+'/'):new URL('../output/meeting-cost-20261118/',import.meta.url);await mkdir(output,{recursive:true});
try{
 await open();pass('Default calculation',(await text('meeting-cost')).includes('865.38'));
 pass('Default annual cost',(await text('annual-cost')).includes('45,000.00'));
 await page.getByRole('button',{name:'Add one attendee',exact:true}).click();pass('Plus button updates attendee count',await page.locator('#attendees').inputValue()==='7');pass('Plus button updates employee time',(await text('person-hours')).includes('7 person-hours'));
 await page.getByRole('button',{name:'Remove one attendee',exact:true}).click();pass('Minus button updates attendee count',await page.locator('#attendees').inputValue()==='6');
 await page.locator('#attendees').fill('1');pass('Minus button disabled at minimum',!(await page.getByRole('button',{name:'Remove one attendee',exact:true}).isEnabled()));
 await page.locator('#attendees').fill('50');pass('Plus button disabled at maximum',!(await page.getByRole('button',{name:'Add one attendee',exact:true}).isEnabled()));await page.locator('#attendees').fill('6');
 await page.locator('[value=individual]').check();pass('Incomplete salaries suppress cost',(await text('meeting-cost'))==='—');
 await page.setViewportSize({width:792,height:782});await page.locator('#salary-0').focus();
 const focusGeometry=await page.locator('#salary-0').evaluate(input=>{
  const wrapper=input.closest('.mc-money-input'),prefix=wrapper.querySelector('span');
  const outer=getComputedStyle(wrapper),inner=getComputedStyle(input),box=wrapper.getBoundingClientRect(),text=prefix.getBoundingClientRect();
  return {innerOutline:inner.outlineStyle,outerOutline:outer.outlineStyle,width:parseFloat(outer.outlineWidth),prefixInside:text.left>=box.left&&text.right<=box.right};
 });
 pass('Salary focus includes the prefix without an internal outline',focusGeometry.innerOutline==='none'&&focusGeometry.outerOutline==='solid'&&focusGeometry.width>=2&&focusGeometry.prefixInside);
 await page.setViewportSize({width:1440,height:1000});

 await page.locator('#fill-salaries').click();await page.locator('#salary-2').fill('30000');await page.locator('#attendees').fill('2');await page.locator('#attendees').fill('3');pass('Removed attendee salary restored',(await page.locator('#salary-2').inputValue()).replaceAll(',','')==='30000');
 await page.locator('[value=average]').check();pass('Average salary preserved',(await page.locator('#average-salary').inputValue())==='25,000');await page.locator('[value=individual]').check();pass('Individual salary preserved',(await page.locator('#salary-2').inputValue()).replaceAll(',','')==='30000');
 await page.locator('#salary-0').fill('10000');await page.locator('#salary-1').fill('20000');await page.locator('#duration').selectOption('30');await page.locator('#frequency').selectOption('biweekly');pass('Individual fixture per meeting',(await text('meeting-cost')).includes('173.08'));pass('Individual fixture annually',(await text('annual-cost')).includes('4,500.00'));
 await page.locator('#currency').selectOption('KWD');pass('Currency uses three decimals without conversion',(await text('meeting-cost')).includes('173.077'));
 await page.locator('#frequency').selectOption('custom');pass('Custom field appears',await page.locator('#custom-frequency').isVisible());pass('Blank custom suppresses annual cost',(await text('annual-cost'))==='—');await page.locator('#custom-frequency').fill('8');pass('Custom annual time',(await text('annual-hours'))==='12');await page.locator('#custom-frequency').fill('-1');pass('Invalid custom marked',await page.locator('#custom-frequency').getAttribute('aria-invalid')==='true');
 await page.locator('#frequency').selectOption('once');pass('Custom field hides',!(await page.locator('#custom-frequency').isVisible()));pass('One-time annual note',(await text('annual-note')).includes('one meeting'));
 await page.locator('#salary-0').fill('');pass('Blank does not become zero',(await text('meeting-cost'))==='—');pass('Time remains available',(await text('person-hours')).includes('1.5'));
 await page.locator('#salary-0').fill('-1');pass('Negative salary flagged',await page.locator('#salary-0').getAttribute('aria-invalid')==='true');
 await page.locator('#salary-0').fill('25,000.50');await page.locator('#salary-0').press('Tab');pass('Pasted grouping accepted',await page.locator('#salary-0').getAttribute('aria-invalid')==='false');
 await page.locator('#attendees').fill('50');await page.locator('#fill-salaries').click();pass('Fifty salary fields',await page.locator('#salary-list label:visible').count()===50);
 for(const width of [360,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  pass(`No overflow at ${width} with 50 attendees`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  pass(`No broken values at ${width}`,!(/NaN|Infinity/.test(await page.locator('body').innerText())));
 }
 await page.locator('#reset-calculator').click();pass('Clear resets salary and cost',(await text('meeting-cost'))==='—');await page.locator('#average-salary').fill('0');pass('Zero salary valid',(await text('meeting-cost')).includes('0.00'));
 await page.locator('#average-salary').fill('1000000000');await page.locator('#attendees').fill('50');await page.locator('#duration').selectOption('180');await page.locator('#frequency').selectOption('custom');await page.locator('#custom-frequency').fill('100000');
 for(const width of [360,768,1440]){await page.setViewportSize({width,height:1000});pass(`Large costs fit at ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await open();await page.locator('#average-salary').fill('');await page.locator('#first-name').fill('Synthetic');await page.locator('#contact-email').fill('synthetic@example.com');await page.locator('#company').fill('Example Co');await page.locator('#contact-consent').check();
 let payload,posts=0;page.on('request',request=>{if(request.url().includes('/api/meeting-cost-contact')&&request.method()==='POST'){payload=request.postDataJSON();posts++;}});
 await page.locator('#meeting-contact [type=submit]').click();await page.getByText('Preview complete. No information was sent.').waitFor();pass('Mock handoff succeeds with incomplete estimate',true);pass('No raw salary payload',!JSON.stringify(payload).includes('averageSalary')&&!JSON.stringify(payload).includes('salaries'));pass('Incomplete aggregate explicit',payload.meeting.combinedHourlyCost===null);pass('No calculator storage',await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0));
 await page.route('**/api/meeting-cost-contact',route=>route.request().method()==='POST'?route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({ok:false,error:'Please correct the request.'})}):route.continue());
 await page.locator('#meeting-contact [type=submit]').click();await page.getByText('Please correct the request.').waitFor();pass('Known rejection retains contact details',await page.locator('#first-name').inputValue()==='Synthetic');pass('Known rejection allows correction',await page.locator('#meeting-contact [type=submit]').isEnabled());
 await page.unroute('**/api/meeting-cost-contact');await page.route('**/api/meeting-cost-contact',route=>route.request().method()==='POST'?route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({ok:false,uncertain:true,error:'Delivery unconfirmed. Please email us.'})}):route.continue());
 const before=posts;await page.locator('#meeting-contact [type=submit]').click();await page.getByText('Delivery unconfirmed. Please email us.').waitFor();pass('Uncertain delivery prevents duplicate retry',!(await page.locator('#meeting-contact [type=submit]').isEnabled()));pass('Exactly one POST for uncertain delivery',posts===before+1);
 await page.unroute('**/api/meeting-cost-contact');await open();await page.locator('#first-name').fill('Synthetic');await page.locator('#contact-email').fill('synthetic@example.com');await page.locator('#company').fill('Example Co');await page.locator('#contact-consent').check();await page.route('**/api/meeting-cost-contact',route=>route.request().method()==='POST'?route.abort():route.continue());await page.locator('#meeting-contact [type=submit]').click();await page.getByText(/We could not confirm delivery/).waitFor();pass('Network error prevents duplicate retry',!(await page.locator('#meeting-contact [type=submit]').isEnabled()));
 await page.unroute('**/api/meeting-cost-contact');await open();await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:new URL('desktop.png',output).pathname,fullPage:true});await page.screenshot({path:new URL('desktop-preview.png',output).pathname});
 await page.setViewportSize({width:390,height:844});await page.locator('#meeting-breakdown').evaluate(el=>!el.open);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:new URL('mobile.png',output).pathname,fullPage:true});await page.screenshot({path:new URL('mobile-preview.png',output).pathname});
 await page.emulateMedia({reducedMotion:'reduce'});pass('Reduced motion honored',await page.locator('#average-fields').evaluate(el=>getComputedStyle(el).animationName)==='none');
 await page.locator('#attendees').focus();await page.keyboard.press('Tab');pass('Keyboard reaches plus control',await page.evaluate(()=>document.activeElement.getAttribute('aria-label')==='Add one attendee'));await page.keyboard.press('Tab');pass('Keyboard moves to salary mode',await page.evaluate(()=>document.activeElement.name==='salary-mode'));await page.keyboard.press('ArrowRight');pass('Keyboard switches salary mode',await page.locator('[value=individual]').isChecked());
 const labels=await page.locator('input:not([type=hidden]):not([name=website]),select,textarea').evaluateAll(els=>els.filter(el=>!el.disabled&&el.offsetParent!==null).every(el=>el.labels?.length));pass('Visible controls have labels',labels);
 pass('No JavaScript page errors',errors.length===0);
 const report={date:'2026-11-18',base,checks,errors,limits:['Native iOS/VoiceOver, formal WCAG audit, live delivery, and hosted behavior unverified.'],screenshots:['desktop.png','mobile.png']};await writeFile(new URL('browser-verification.json',output),JSON.stringify(report,null,2));console.log(`${checks.length} browser checks passed. No external submissions made.`);
}finally{await browser.close();}
