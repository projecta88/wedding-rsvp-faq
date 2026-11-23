const $=id=>document.getElementById(id);
let currentGuest=null, currentDesign={};
async function api(path, options={}) {
  const res=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await res.json().catch(()=>({error:'Unexpected server response'}));
  if(!res.ok) throw new Error(data.error||'Something went wrong');
  return data;
}
function message(t,isError=false){$('message').textContent=t;$('message').style.color=isError?'#a33':'varColor(--accent)';}
function applyDesign(d){
 currentDesign=d||{};
 const map={pageBg:'--page-bg',cardBg:'--card-bg',sectionBg:'--section-bg',textColor:'--text',mutedColor:'--muted',accentColor:'--accent',buttonBg:'--button-bg',buttonText:'--button-text',borderColor:'--border',headingFont:'--heading-font',bodyFont:'--body-font',headingSize:'--heading-size',bodySize:'--body-size'};
 for(const [k,v] of Object.entries(map)) if(currentDesign[k]) document.documentElement.style.setProperty(v,currentDesign[k]);
 const ids={eyebrow:'eyebrow',heading:'heading',intro:'intro',guestLabel:'guestLabel',lookupButton:'lookupButton',attendanceLabel:'attendanceLabel',yesText:'yesText',noText:'noText',companionsLabel:'companionsLabel',companionsHint:'companionsHint',submitButton:'submitButton',footerText:'footerText'};
 for(const [key,id] of Object.entries(ids)) if(typeof d?.[key]==='string') $(id).textContent=d[key];
 document.title=d?.pageTitle||'Wedding RSVP';
}
async function loadDesign(){try{const d=await api('/design');applyDesign(d.design)}catch(e){console.warn(e)}}
$('lookupForm').addEventListener('submit',async e=>{
 e.preventDefault(); message('Looking up your invitation…');
 try{
  const data=await api('/lookup',{method:'POST',body:JSON.stringify({fullName:$('guestName').value})});
  currentGuest=data.guest;
  $('welcomeText').textContent=`Welcome, ${currentGuest.name}`;
  $('seatText').textContent=`Your invitation includes ${currentGuest.seatAllowance} seat(s), including you.`;
  $('companionsWrap').hidden=currentGuest.seatAllowance<=1;
  $('companionInputs').innerHTML='';
  for(let i=1;i<currentGuest.seatAllowance;i++){
   const label=document.createElement('label');label.textContent=`Companion ${i} full name`;
   const input=document.createElement('input');input.required=true;input.maxLength=120;input.placeholder='Enter companion full name';input.dataset.companion='true';
   $('companionInputs').append(label,input);
  }
  $('invitation').hidden=false;$('lookupForm').hidden=true;message('');
 }catch(err){message(err.message,true)}
});
document.querySelectorAll('input[name=attendance]').forEach(r=>r.addEventListener('change',()=>{
 $('companionsWrap').hidden=r.value!=='yes'||!r.checked||currentGuest.seatAllowance<=1;
}));
$('rsvpForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!currentGuest)return;
 const attendance=document.querySelector('input[name=attendance]:checked')?.value;
 if(!attendance){message('Please select your attendance.',true);return}
 const companions=attendance==='yes'?[...document.querySelectorAll('[data-companion]')].map(x=>x.value.trim()):[];
 if(attendance==='yes'&&companions.length!==currentGuest.seatAllowance-1){message('Please enter every companion name.',true);return}
 $('submitButton').disabled=true;message('Submitting your response…');
 try{
  await api('/rsvp',{method:'POST',body:JSON.stringify({guestId:currentGuest.id,attending:attendance==='yes',companions})});
  $('rsvpForm').hidden=true;message(currentDesign.successMessage||'Thank you! Your RSVP has been recorded.');
 }catch(err){message(err.message,true);$('submitButton').disabled=false}
});
loadDesign();
