import {track} from './meeting-cost-core.mjs';
export function setupContact(snapshot) {
  const form=document.getElementById('meeting-contact'),fields=document.getElementById('contact-fields'),feedback=document.getElementById('contact-feedback'),button=form.querySelector('[type=submit]');
  let busy=false,widgetId=null;button.disabled=true;
  async function prepareVerification(){
    try {
      const res=await fetch('/api/meeting-cost-contact');
      if(!res.ok)throw new Error('unavailable');
      const config=await res.json();
      if(!config.available)throw new Error('unavailable');
      if(!config.verificationRequired)button.disabled=false;
      if(config.verificationRequired){
        button.disabled=true;
        const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
        await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.head.append(script);});
        widgetId=window.turnstile.render('#meeting-turnstile',{sitekey:config.turnstileSiteKey,callback:()=>{button.disabled=false;},'expired-callback':()=>{button.disabled=true;},'error-callback':()=>{button.disabled=true;say('Human verification could not load. Please email hello@orgintelligence.io.');}});
      }
    }catch{button.disabled=true;say('This form is temporarily unavailable. Please email hello@orgintelligence.io.');}
  }
  prepareVerification();
  function say(message){feedback.textContent=message;feedback.hidden=false;feedback.focus();}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    feedback.hidden=true;
    const invalid=[];
    for(const name of ['firstName','email','company','consent']) {
      const el=form.elements[name];
      const valid=el.type==='checkbox' ? el.checked : el.checkValidity() && !!el.value.trim();
      el.setAttribute('aria-invalid',String(!valid));if(!valid)invalid.push(el);
    }
    if(invalid.length){say('Please complete your first name, a valid email, company, and contact agreement.');invalid[0].focus();return;}
    const data=new FormData(form),qs=new URLSearchParams(location.search);
    // Explicit allowlist prevents salary input or arbitrary form fields from crossing the boundary.
    const payload={firstName:data.get('firstName'),email:data.get('email'),company:data.get('company'),message:data.get('message'),consent:true,website:data.get('website'),meeting:snapshot(),
      utm_source:qs.get('utm_source')||'',utm_medium:qs.get('utm_medium')||'',utm_campaign:qs.get('utm_campaign')||'',turnstileToken:data.get('cf-turnstile-response')||''};
    busy=true;fields.disabled=true;button.textContent='Sending…';
    try {
      // A network failure may follow successful receipt; never automatically retry a lead POST.
      const response=await fetch('/api/meeting-cost-contact',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
      const body=await response.json();
      if(response.ok && body.ok===true){
        if(body.mock){say('Preview complete. No information was sent.');fields.disabled=false;button.textContent='Request my free consultation';busy=false;return;}
        fields.hidden=true;form.reset();say("Your request has been sent. We'll contact you to arrange a time.");if(!body.discarded)track('consultation_submitted','meeting_cost_form');return;
      }
      if(body.uncertain){button.textContent='Please contact us by email';say(body.error||'Your request may have been received. Please email hello@orgintelligence.io before submitting again.');return;}
      fields.disabled=false;busy=false;button.textContent='Request my free consultation';if(widgetId!==null){button.disabled=true;window.turnstile.reset(widgetId);}say(body.error||'Please check your details and try again.');
    } catch {
      button.textContent='Please contact us by email';say('We could not confirm delivery. Your request may have been received. Please email hello@orgintelligence.io before submitting again.');
    }
  });
  form.addEventListener('input',e=>{if(e.target.hasAttribute('aria-invalid'))e.target.setAttribute('aria-invalid','false');});
}
