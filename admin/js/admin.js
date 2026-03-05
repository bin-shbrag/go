import { initTheme, apiPost, apiGet, qs, qsa, toast } from "../../js/utils.js";
initTheme();

const state = {
  token: null,
  config: null,
  links: [],
  logs: []
};

function setLoggedIn(on){
  qs("#loginView").style.display = on ? "none" : "block";
  qs("#appView").style.display = on ? "block" : "none";
  qs("#logoutBtn").style.display = on ? "inline-flex" : "none";
}

function setStatusBadge(status){
  const b = qs("#statusBadge");
  b.className = "badge " + (status === "on" ? "on" : "off");
  b.textContent = status === "on" ? "ON" : "OFF";
  qs("#kpiStatus").textContent = status === "on" ? "تشغيل" : "إيقاف";
}

function setMode(mode){
  qs("#kpiMode").textContent = mode === "direct" ? "Direct" : "Multi";
}

function switchTab(name){
  qsa(".tab").forEach(t=>t.classList.toggle("active", t.dataset.tab===name));
  qsa(".tabpage").forEach(p=>p.style.display="none");
  qs(`#tab-${name}`).style.display="block";
}

function openModal(){
  qs("#modal").classList.add("show");
  qs("#modal").setAttribute("aria-hidden","false");
}
function closeModal(){
  qs("#modal").classList.remove("show");
  qs("#modal").setAttribute("aria-hidden","true");
}

function sanitizeUrl(url){
  try{
    const u = new URL(url);
    return u.toString();
  }catch(e){
    return "";
  }
}

async function login(){
  const pw = qs("#pw").value;
  if(!pw){ toast("أدخل كلمة المرور"); return; }

  try{
    const res = await apiPost("login", { password: pw });
    state.token = res.token;
    localStorage.setItem("ss_token", state.token);
    toast("تم تسجيل الدخول");
    setLoggedIn(true);
    await refreshAll();
  }catch(e){
    toast("فشل الدخول: " + e.message);
  }
}

function logout(){
  state.token = null;
  localStorage.removeItem("ss_token");
  setLoggedIn(false);
  toast("تم تسجيل الخروج");
}

async function refreshAll(){
  try{
    const res = await apiGet("adminSnapshot", { token: state.token });
    state.config = res.config;
    state.links = res.links || [];
    state.logs = res.logs || [];
    renderAll(res.stats || {});
  }catch(e){
    toast("تعذر التحديث: " + e.message);
  }
}

function renderAll(stats){
  setStatusBadge(state.config.system_status);
  setMode(state.config.redirect_mode);

  qs("#redirectMode").value = state.config.redirect_mode || "multi";
  qs("#directUrl").value = state.config.direct_url || "";
  qs("#maintMsg").value = (state.config.maintenance_message || "");
  qs("#maintCountdown").value = (state.config.maintenance_countdown_to || "");

  qs("#kpiToday").textContent = stats.today || "0";
  qs("#kpiTotal").textContent = stats.total || "0";

  renderLinksTable();
  renderLogs();
}

function renderLinksTable(){
  const tb = qs("#linksTbody");
  tb.innerHTML = "";

  // sort by order
  const items = [...state.links].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));

  for(const item of items){
    const tr = document.createElement("tr");
    tr.draggable = true;
    tr.dataset.id = item.id;
    tr.classList.add("drag");

    tr.innerHTML = `
      <td>${item.sort_order}</td>
      <td><b>${escapeHtml(item.title)}</b><div class="small">${escapeHtml(item.subtitle||"")}</div></td>
      <td class="small" style="max-width:340px; word-break:break-word">${escapeHtml(item.url)}</td>
      <td>${item.enabled === "TRUE" ? "نعم" : "لا"}</td>
      <td>
        <div class="row-actions">
          <button class="btn" data-act="edit">تعديل</button>
        </div>
      </td>
    `;

    tr.querySelector('[data-act="edit"]').addEventListener("click", ()=>editLink(item.id));

    // Drag and drop reorder
    tr.addEventListener("dragstart", (e)=>{
      e.dataTransfer.setData("text/plain", item.id);
      e.dataTransfer.effectAllowed = "move";
    });
    tr.addEventListener("dragover", (e)=>{ e.preventDefault(); });
    tr.addEventListener("drop", (e)=>{
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain");
      const toId = item.id;
      if(fromId === toId) return;
      reorderLocal(fromId, toId);
      renderLinksTable();
    });

    tb.appendChild(tr);
  }
}

function reorderLocal(fromId, toId){
  const sorted = [...state.links].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  const fromIdx = sorted.findIndex(x=>x.id===fromId);
  const toIdx = sorted.findIndex(x=>x.id===toId);
  if(fromIdx<0 || toIdx<0) return;
  const [moved] = sorted.splice(fromIdx, 1);
  sorted.splice(toIdx, 0, moved);
  // reassign sort_order
  sorted.forEach((x,i)=>x.sort_order = String(i+1));
  state.links = sorted;
}

function renderLogs(){
  const tb = qs("#logsTbody");
  tb.innerHTML = "";
  const items = (state.logs || []).slice(0,50);

  for(const row of items){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="small">${escapeHtml(row.ts||"")}</td>
      <td><b>${escapeHtml(row.action||"")}</b></td>
      <td class="small">${escapeHtml(row.details||"")}</td>
    `;
    tb.appendChild(tr);
  }
}

function newId(){
  return "L" + Math.random().toString(16).slice(2,10).toUpperCase();
}

function editLink(id){
  const item = state.links.find(x=>x.id===id);
  if(!item){ toast("لم يتم العثور على الرابط"); return; }
  qs("#modalTitle").textContent = "تعديل رابط";
  qs("#linkId").value = item.id;
  qs("#linkTitle").value = item.title || "";
  qs("#linkSubtitle").value = item.subtitle || "";
  qs("#linkUrl").value = item.url || "";
  qs("#linkEnabled").value = item.enabled || "TRUE";
  qs("#deleteLinkBtn").style.display = "inline-flex";
  openModal();
}

function addLink(){
  qs("#modalTitle").textContent = "إضافة رابط";
  qs("#linkId").value = newId();
  qs("#linkTitle").value = "";
  qs("#linkSubtitle").value = "";
  qs("#linkUrl").value = "";
  qs("#linkEnabled").value = "TRUE";
  qs("#iconFile").value = "";
  qs("#deleteLinkBtn").style.display = "none";
  openModal();
}

async function saveRedirect(){
  const mode = qs("#redirectMode").value;
  const directUrl = qs("#directUrl").value.trim();
  const safeUrl = directUrl ? sanitizeUrl(directUrl) : "";

  if(mode === "direct" && !safeUrl){
    toast("رابط Direct غير صالح.");
    return;
  }

  try{
    await apiPost("updateConfig", { token: state.token, patch: { redirect_mode: mode, direct_url: safeUrl } }, state.token);
    toast("تم الحفظ");
    await refreshAll();
  }catch(e){
    toast("فشل الحفظ: " + e.message);
  }
}

async function toggleSystem(){
  const next = state.config.system_status === "on" ? "off" : "on";
  try{
    await apiPost("updateConfig", { token: state.token, patch: { system_status: next } }, state.token);
    toast("تم التغيير");
    await refreshAll();
  }catch(e){
    toast("فشل: " + e.message);
  }
}

async function saveMaintenance(){
  const msg = qs("#maintMsg").value.trim();
  const cd = qs("#maintCountdown").value.trim();
  try{
    await apiPost("updateConfig", { token: state.token, patch: { maintenance_message: msg, maintenance_countdown_to: cd } }, state.token);
    toast("تم الحفظ");
    await refreshAll();
  }catch(e){
    toast("فشل: " + e.message);
  }
}

async function saveLink(){
  const id = qs("#linkId").value;
  const title = qs("#linkTitle").value.trim();
  const subtitle = qs("#linkSubtitle").value.trim();
  const url = sanitizeUrl(qs("#linkUrl").value.trim());
  const enabled = qs("#linkEnabled").value;

  if(!title || !url){
    toast("العنوان والرابط مطلوبان وبصيغة صحيحة.");
    return;
  }

  let iconUrl = null;
  const file = qs("#iconFile").files?.[0];
  if(file){
    const b64 = await fileToBase64(file);
    try{
      const up = await apiPost("uploadIcon", { token: state.token, filename: file.name, mime: file.type, base64: b64 }, state.token);
      iconUrl = up.url;
    }catch(e){
      toast("فشل رفع الأيقونة: " + e.message);
      return;
    }
  }

  const current = state.links.find(x=>x.id===id);
  const sort_order = current?.sort_order || String((state.links.length||0)+1);

  const payload = {
    id, title, subtitle, url,
    enabled,
    sort_order,
    ...(iconUrl ? { icon_url: iconUrl } : {})
  };

  try{
    await apiPost("upsertLink", { token: state.token, link: payload }, state.token);
    toast("تم الحفظ");
    closeModal();
    await refreshAll();
  }catch(e){
    toast("فشل حفظ الرابط: " + e.message);
  }
}

async function deleteLink(){
  const id = qs("#linkId").value;
  if(!id) return;
  if(!confirm("هل أنت متأكد من حذف الرابط؟")) return;

  try{
    await apiPost("deleteLink", { token: state.token, id }, state.token);
    toast("تم الحذف");
    closeModal();
    await refreshAll();
  }catch(e){
    toast("فشل الحذف: " + e.message);
  }
}

async function saveOrder(){
  // state.links already updated locally
  const order = [...state.links].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order))
    .map(x=>({ id:x.id, sort_order:x.sort_order }));

  try{
    await apiPost("reorderLinks", { token: state.token, order }, state.token);
    toast("تم حفظ الترتيب");
    await refreshAll();
  }catch(e){
    toast("فشل حفظ الترتيب: " + e.message);
  }
}

function escapeHtml(s){
  return String(s??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=> {
      const dataUrl = String(r.result||"");
      const b64 = dataUrl.split(",")[1] || "";
      resolve(b64);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function wireUI(){
  qs("#loginBtn").addEventListener("click", login);
  qs("#logoutBtn").addEventListener("click", logout);
  qs("#refreshBtn").addEventListener("click", refreshAll);
  qs("#toggleBtn").addEventListener("click", toggleSystem);
  qs("#saveRedirectBtn").addEventListener("click", saveRedirect);
  qs("#saveMaintBtn").addEventListener("click", saveMaintenance);

  qsa(".tab").forEach(t=>t.addEventListener("click", ()=>switchTab(t.dataset.tab)));
  qs("#addLinkBtn").addEventListener("click", addLink);
  qs("#saveOrderBtn").addEventListener("click", saveOrder);

  qs("#closeModalBtn").addEventListener("click", closeModal);
  qs("#saveLinkBtn").addEventListener("click", saveLink);
  qs("#deleteLinkBtn").addEventListener("click", deleteLink);

  // close modal on backdrop click
  qs("#modal").addEventListener("click", (e)=>{
    if(e.target.id === "modal") closeModal();
  });

  // Enter to login
  qs("#pw").addEventListener("keydown", (e)=>{
    if(e.key === "Enter") login();
  });
}

(async function boot(){
  wireUI();
  const token = localStorage.getItem("ss_token");
  if(token){
    state.token = token;
    setLoggedIn(true);
    await refreshAll();
  }else{
    setLoggedIn(false);
  }
})();
