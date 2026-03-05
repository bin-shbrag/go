import { initTheme, apiGet, qs, setTheme, toast } from "./utils.js";
initTheme();

function svgDataUri(svg){
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function iconForUrl(url){
  const u = String(url || "").toLowerCase();
  const make = (label, path) => svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="${label}">
      <rect x="0" y="0" width="24" height="24" rx="7" fill="rgba(255,255,255,.08)"/>
      <path d="${path}" fill="rgba(255,255,255,.92)"/>
    </svg>
  `);

  if(u.startsWith("mailto:")) return make("Email","M4 7.5c0-1 0-1.5 1.5-1.5h13C20 6 20 6.5 20 7.5v9c0 1 0 1.5-1.5 1.5h-13C4 18 4 17.5 4 16.5v-9Zm2 .5 6 4.2L18 8H6Zm12 1.9-6 4.2L6 9.9V16h12V9.9Z");
  if(u.startsWith("tel:")) return make("Phone","M7.2 3.8c.5-.5 1.2-.5 1.7 0l2 2c.5.5.5 1.2 0 1.7l-1.2 1.2c1 2 2.6 3.6 4.6 4.6l1.2-1.2c.5-.5 1.2-.5 1.7 0l2 2c.5.5.5 1.2 0 1.7l-1 1c-.6.6-1.4.8-2.2.6-6.2-1.6-11.1-6.5-12.7-12.7-.2-.8 0-1.6.6-2.2l1-1Z");

  if(u.includes("wa.me") || u.includes("whatsapp.com")) return make("WhatsApp","M12 4a8 8 0 0 0-6.8 12.2L4 20l3.9-1.1A8 8 0 1 0 12 4Zm0 2a6 6 0 0 1 5.2 9.1l.4 1.5-1.5-.4A6 6 0 1 1 12 6Zm-2 2.8c.2-.2.5-.2.7 0l.9 1c.2.2.2.5 0 .7l-.5.6c.4.9 1.1 1.6 2 2l.6-.5c.2-.2.5-.2.7 0l1 .9c.2.2.2.5 0 .7l-.6.6c-.4.4-1 .6-1.6.4-2.6-.7-4.6-2.7-5.3-5.3-.2-.6 0-1.2.4-1.6l.6-.5Z");
  if(u.includes("instagram.com")) return make("Instagram","M8 7h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm4 2.4A3.6 3.6 0 1 0 15.6 13 3.6 3.6 0 0 0 12 9.4Zm0 2A1.6 1.6 0 1 1 10.4 13 1.6 1.6 0 0 1 12 11.4ZM16.2 9.1a.7.7 0 1 1-.7-.7.7.7 0 0 1 .7.7Z");
  if(u.includes("facebook.com") || u.includes("fb.com")) return make("Facebook","M13.5 8.2V7c0-.6.4-1 1-1H16V4h-1.8C12.4 4 11 5.4 11 7v1.2H9V10h2v10h2.5V10H16l.5-1.8h-3Z");
  if(u.includes("t.me") || u.includes("telegram.me") || u.includes("telegram.org")) return make("Telegram","M19.2 6.2 17 18.8c-.1.7-.8 1-1.4.6l-4-3-2 2c-.2.2-.4.3-.7.3l.4-4 7.2-6.5c.3-.3-.1-.4-.5-.2L6.8 12.2 3.9 11.3c-.7-.2-.7-1.1.1-1.4L18.1 4.7c.7-.3 1.3.2 1.1 1.5Z");
  if(u.includes("tiktok.com")) return make("TikTok","M14 4c.3 1.7 1.5 3 3 3.2V9c-1.2 0-2.3-.4-3-1.1V15a5 5 0 1 1-5-5c.3 0 .7 0 1 .1V12a3 3 0 1 0 2 2.8V4h2Z");
  if(u.includes("youtube.com") || u.includes("youtu.be")) return make("YouTube","M20 12c0-2.2-.2-3.3-.8-4-.6-.6-1.7-.8-4.2-.8H9c-2.5 0-3.6.2-4.2.8-.6.7-.8 1.8-.8 4s.2 3.3.8 4c.6.6 1.7.8 4.2.8h6c2.5 0 3.6-.2 4.2-.8.6-.7.8-1.8.8-4Zm-9 2.5V9.5l4 2.5-4 2.5Z");
  if(u.includes("x.com") || u.includes("twitter.com")) return make("X","M18.5 6h-3l-3 3.6L9.6 6H6.5l4.5 6-4.5 6h3l3-3.7L15.4 18h3.1l-4.6-6 4.6-6Z");
  if(u.includes("linkedin.com")) return make("LinkedIn","M7.3 9H5.4v10h1.9V9Zm0-3.2c0 .6-.5 1.1-1.2 1.1-.7 0-1.2-.5-1.2-1.1S5.4 4.7 6.1 4.7c.7 0 1.2.5 1.2 1.1ZM18.6 13.1V19h-1.9v-5.4c0-1.4-.5-2.3-1.7-2.3-.9 0-1.4.6-1.7 1.2-.1.2-.1.6-.1.9V19H11.3s.1-9 0-10h1.9v1.4c.3-.6 1.1-1.5 2.7-1.5 2 0 3.5 1.3 3.5 4.2Z");

  return make("Website","M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm4 8a7 7 0 0 1-.2 1.6h-2.3c.1-.5.2-1 .2-1.6s-.1-1.1-.2-1.6h2.3A7 7 0 0 1 16 12Z");
}

function renderLinks(payload){
  const { profile, links } = payload;

  qs("#brandLogo").src = profile.avatar_url || "./assets/partner-logo.svg";
  qs("#brandName").textContent = profile.display_name || "روابطنا";
  qs("#name").textContent = profile.display_name || "روابطنا";
  qs("#bio").textContent = profile.description || "";

  qs("#cover").style.backgroundImage = profile.cover_url ? `url('${profile.cover_url}')` : "none";
  qs("#avatar").src = profile.avatar_url || "./assets/partner-logo.svg";

  const list = qs("#links");
  list.innerHTML = "";

  if(!links || !links.length){
    const empty = document.createElement("div");
    empty.className = "small";
    empty.textContent = "لا توجد روابط حالياً.";
    list.appendChild(empty);
    return;
  }

  for(const item of links){
    if(String(item.enabled).trim().toUpperCase() !== "TRUE") continue;

    const a = document.createElement("a");
    a.className = "linkbtn";
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.dataset.id = item.id;

    const left = document.createElement("div");
    left.className = "left";

    const icon = document.createElement("img");
    icon.className = "icon";
    icon.alt = "";
    icon.loading = "lazy";
    icon.decoding = "async";
    icon.src = (item.icon_url && String(item.icon_url).trim()) ? item.icon_url : iconForUrl(item.url);

    const txt = document.createElement("div");
    txt.className = "txt";
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = item.title;
    const s = document.createElement("div");
    s.className = "s";
    s.textContent = item.subtitle || "";

    txt.appendChild(t); txt.appendChild(s);
    left.appendChild(icon); left.appendChild(txt);

    const che = document.createElement("div");
    che.className = "chev";
    che.innerHTML = "›";

    a.appendChild(left);
    a.appendChild(che);

    a.addEventListener("click", ()=>{ apiGet("track", { type:"link", id:item.id }).catch(()=>{}); });

    list.appendChild(a);
  }
}

function wireThemeToggle(){
  const btn = qs("#themeBtn");
  btn.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    setTheme(next);
  });
}

(async function main(){
  try{
    const res = await apiGet("publicLinks");
    if(res.config.system_status !== "on"){ window.location.replace("./maintenance.html"); return; }
    renderLinks(res);
    wireThemeToggle();
    apiGet("track", { type:"page", id:"links" }).catch(()=>{});
  }catch(e){
    toast("تعذر تحميل الروابط. سيتم فتح صفحة الصيانة.");
    window.location.replace("./maintenance.html?reason=api");
  }
})();
