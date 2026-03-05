import { API_B64 } from "./config.js";

export function apiUrl(){
  try{
    return atob(API_B64).trim();
  }catch(e){
    return "";
  }
}

export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ss_theme", theme);
}
export function initTheme(){
  const saved = localStorage.getItem("ss_theme");
  if(saved){ setTheme(saved); return; }
  // default: dark
  // setTheme("dark");
  // default: light
setTheme("light");
}

export function toast(msg){
  const t = qs("#toast");
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add("show");
  window.clearTimeout(window.__t_toast);
  window.__t_toast = window.setTimeout(()=>t.classList.remove("show"), 2600);
}

export async function apiGet(action, params={}){
  const url = apiUrl();
  if(!url) throw new Error("API URL not set.");
  const q = new URLSearchParams({ action, ...params });
  const res = await fetch(`${url}?${q.toString()}`, { method:"GET", mode:"cors", cache:"no-store" });
  const data = await res.json();
  if(!data.ok) throw new Error(data.error || "API error");
  return data;
}

export async function apiPost(action, body={}, token=null){
  const url = apiUrl();
  if(!url) throw new Error("API URL not set.");
  const payload = { action, ...body };
  if(token) payload.token = token;

  const res = await fetch(url, {
    method:"POST",
    mode:"cors",
    cache:"no-store",
    headers: { "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(!data.ok) throw new Error(data.error || "API error");
  return data;
}
