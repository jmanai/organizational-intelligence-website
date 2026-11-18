import config from '../../assets/data/meeting-cost-config.mjs';
import {meetingResults,summaryRows} from '../../assets/js/meeting-cost-core.mjs';
import {assertSameOrigin,clean,escapeHtml,HttpError,json,readJson,validEmail} from '../_lib/common.js';


export function onRequestGet({env}) {
  const mock=clean(env.INTEGRATIONS_MODE).toLowerCase()==='mock';
  const siteKey=mock ? '' : clean(env.TURNSTILE_SITE_KEY,200);
  return json({mock,turnstileSiteKey:siteKey,verificationRequired:!mock && !!env.TURNSTILE_SECRET_KEY,available:mock || !env.TURNSTILE_SECRET_KEY || !!siteKey});
}

// Same contact field schema and services as /api/contact. Bounded requests and
// redacted error handling keep salary-derived summaries out of upstream logs.
export async function onRequestPost(context) {
  let deliveryStarted=false,received=false;
  try {
    const {request,env}=context;
    assertSameOrigin(request,env);
    const input=await readJson(request,12000);
    if(!input||typeof input!=='object'||Array.isArray(input))throw new HttpError(400,'Invalid request.');
    if(clean(input.website,200))return json({ok:true,discarded:true});
    const firstName=clean(input.firstName,100),email=clean(input.email,254).toLowerCase(),company=clean(input.company,200),message=clean(input.message,2500);
    if(!firstName||!company||!validEmail(email)||input.consent!==true)throw new HttpError(400,'Complete your name, email, company, and contact agreement.');
    const meeting=input.meeting;
    if(!meeting||typeof meeting!=='object'||Array.isArray(meeting))throw new HttpError(400,'Meeting summary is missing.');
    if(Object.keys(meeting).some(key=>!['currency','attendees','mode','duration','frequency','customFrequency','combinedHourlyCost'].includes(key)))throw new HttpError(400,'Unexpected meeting summary fields.');
    const result=meetingResults(meeting,config,true);
    if(!result.currency||!result.mode||!result.frequency)throw new HttpError(400,'Select a valid currency, salary mode, and frequency.');
    for(const [key,value] of [['attendees',result.attendees],['duration',result.duration],['combinedHourlyCost',result.hourly]]) {
      if(meeting[key]!==null && value===null)throw new HttpError(400,'Invalid meeting summary. Please check the calculator.');
    }
    if(meeting.frequency==='custom' && meeting.customFrequency!==null && result.meetings===null)throw new HttpError(400,'Invalid custom frequency.');
    const summary=summaryRows(result,config).map(([k,v])=>`${k}: ${v}`).join('\n');
    const fullMessage=`Meeting redesign — free 30-minute consultation\n\nUser-provided estimate; salary-derived aggregate only.\n${summary}\n\nContact agreement: accepted\n\nMeeting challenge:\n${message||'Not provided'}\n\nCampaign: ${clean(input.utm_campaign,200)||'—'}\nSource: ${clean(input.utm_source,200)||'—'}\nMedium: ${clean(input.utm_medium,200)||'—'}`;
    const mock=clean(env.INTEGRATIONS_MODE).toLowerCase()==='mock';
    if(mock)return json({ok:true,mock:true});
    if(!env.HUBSPOT_PORTAL_ID||!env.HUBSPOT_CONTACT_FORM_ID||!env.RESEND_API_KEY||!env.EMAIL_FROM||!validEmail(env.CONTACT_TO_EMAIL||''))throw new HttpError(503,'This form is temporarily unavailable. Please email hello@orgintelligence.io.');
    const send=async(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(8000)});
    if(env.TURNSTILE_SECRET_KEY){
      const token=clean(input.turnstileToken,2048);if(!token)throw new HttpError(400,'Please confirm you are human.');
      const verification=await send('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token})});
      if(!verification.ok||!(await verification.json()).success)throw new HttpError(400,'Human verification failed. Please try again.');
    }
    deliveryStarted=true;
    const hubspot=await send(`https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(env.HUBSPOT_PORTAL_ID)}/${encodeURIComponent(env.HUBSPOT_CONTACT_FORM_ID)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:[{name:'email',value:email},{name:'firstname',value:firstName},{name:'company',value:company},{name:'message',value:fullMessage}],context:{pageUri:`${new URL(request.url).origin}/meeting-cost`,pageName:'OI — Meeting redesign request'}})
    });
    if(!hubspot.ok){deliveryStarted=hubspot.status>=500;if(deliveryStarted)throw new Error('upstream');throw new HttpError(502,'Your request was not accepted. Please email hello@orgintelligence.io.');}
    received=true;
    const notification=await send('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[env.CONTACT_TO_EMAIL],reply_to:email,subject:`Meeting redesign request — ${company}`,text:`Name: ${firstName}\nEmail: ${email}\nCompany: ${company}\n\n${fullMessage}`,html:`<h1>Meeting redesign request</h1><p>${escapeHtml(firstName)} · ${escapeHtml(company)}</p><p>${escapeHtml(email)}</p><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(fullMessage)}</pre>`})});
    if(!notification.ok)throw new Error('notification');
    return json({ok:true});
  } catch(error) {
    if(deliveryStarted)return json({ok:false,uncertain:true,error:received?'Your request was received, but we could not confirm the notification. Please email hello@orgintelligence.io rather than submitting again.':'We could not confirm delivery. Please email hello@orgintelligence.io before submitting again.'},502);
    if(error instanceof HttpError)return json({ok:false,error:error.message},error.status);
    return json({ok:false,error:'This form is temporarily unavailable. Please email hello@orgintelligence.io.'},503);
  }
}
