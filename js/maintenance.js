import { initTheme, apiGet, qs, toast } from "./utils.js";
initTheme();

function startCountdown(targetIso){
  const el = qs("#countdown");
  if(!targetIso){ el.style.display="none"; return; }
  const target = new Date(targetIso).getTime();
  if(Number.isNaN(target)){ el.style.display="none"; return; }

  el.style.display="block";

  const tick = ()=>{
    const now = Date.now();
    const d = target - now;
    if(d <= 0){
      el.textContent = "الآن";
      return;
    }
    const h = Math.floor(d/1000/60/60);
    const m = Math.floor((d/1000/60)%60);
    const s = Math.floor((d/1000)%60);
    el.textContent = `${h}س : ${m}د : ${s}ث`;
    requestAnimationFrame(()=>setTimeout(tick, 1000));
  };
  tick();
}

(async function main(){
  try{
    const res = await apiGet("publicMaintenance");
    const m = res.maintenance || {};
    qs("#msg").textContent = m.message || "نقوم حالياً بأعمال صيانة لتحسين الخدمة.";
    qs("#contactAi").href = `tel:${res.contacts.ai.replace(/\s+/g,"")}`;
    qs("#contactSupport").href = `tel:${res.contacts.support.replace(/\s+/g,"")}`;
    qs("#contactEmail").href = `mailto:${res.contacts.email}`;
    qs("#contactSite").href = `https://${res.contacts.site}`;
    startCountdown(m.countdown_to || "");
  }catch(e){
    // fallback static
    toast("تعذر تحميل بيانات الصيانة.");
  }
})();
