/**
 * Smart Soft — Dynamic Smart Redirect System (DSRS)
 * Backend: Google Apps Script + Google Sheets
 *
 * Endpoints:
 *  GET  ?action=publicConfig
 *  GET  ?action=publicLinks
 *  GET  ?action=publicMaintenance
 *  GET  ?action=track&type=page|link&id=...
 *  GET  ?action=adminSnapshot&token=...
 *
 *  POST {action:"login", password:"..."}
 *  POST {action:"updateConfig", token:"...", patch:{...}}
 *  POST {action:"upsertLink", token:"...", link:{...}}
 *  POST {action:"deleteLink", token:"...", id:"Lxxxx"}
 *  POST {action:"reorderLinks", token:"...", order:[{id,sort_order}]}
 *  POST {action:"uploadIcon", token:"...", filename, mime, base64}
 */

const SHEETS = {
  CONFIG: "Config",
  LINKS: "Links",
  VISITS: "Visits",
  LOGS: "Logs"
};

const CONFIG_KEYS = [
  "system_status",               // on/off
  "redirect_mode",               // direct/multi
  "direct_url",                  // direct target
  "maintenance_message",         // text
  "maintenance_countdown_to",    // ISO string optional
  "profile_display_name",
  "profile_description",
  "profile_avatar_url",
  "profile_cover_url"
];

function doGet(e){
  try{
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "publicConfig";

    if(action === "publicConfig"){
      return jsonOk({ config: getPublicConfig() });
    }
    if(action === "publicLinks"){
      const config = getPublicConfig();
      const payload = getPublicLinks();
      payload.config = config;
      payload.contacts = getContacts();
      return jsonOk(payload);
    }
    if(action === "publicMaintenance"){
      const m = getMaintenance();
      return jsonOk({ maintenance: m, contacts: getContacts() });
    }
    if(action === "track"){
      const type = String(e.parameter.type || "page");
      const id = String(e.parameter.id || "");
      trackVisit(type, id);
      return jsonOk({ tracked: true });
    }
    if(action === "adminSnapshot"){
      const token = String(e.parameter.token || "");
      requireAuth(token);

      const config = getConfigMap();
      const links = getLinks();
      const logs = getLogs(50);
      const stats = getStats();

      return jsonOk({ config, links, logs, stats });
    }

    return jsonErr("Unknown action");
  }catch(err){
    return jsonErr(String(err && err.message ? err.message : err));
  }
}

function doPost(e){
  try{
    const body = parseJson_(e.postData && e.postData.contents);
    const action = String(body.action || "");

    if(action === "login"){
      const pw = String(body.password || "");
      const ok = checkPassword_(pw);
      if(!ok) return jsonErr("Invalid password");
      const token = makeToken_();
      logAction_("login", "admin login");
      return jsonOk({ token });
    }

    // All below require auth
    const token = String(body.token || "");
    requireAuth(token);

    if(action === "updateConfig"){
      const patch = body.patch || {};
      updateConfig_(patch);
      logAction_("updateConfig", JSON.stringify(patch).slice(0, 500));
      return jsonOk({ saved:true });
    }

    if(action === "upsertLink"){
      const link = body.link || {};
      upsertLink_(link);
      logAction_("upsertLink", link.id + " " + (link.title||""));
      return jsonOk({ saved:true });
    }

    if(action === "deleteLink"){
      const id = String(body.id || "");
      deleteLink_(id);
      logAction_("deleteLink", id);
      return jsonOk({ deleted:true });
    }

    if(action === "reorderLinks"){
      const order = body.order || [];
      reorderLinks_(order);
      logAction_("reorderLinks", "count=" + order.length);
      return jsonOk({ saved:true });
    }

    if(action === "uploadIcon"){
      const fileUrl = uploadIcon_(String(body.filename||"icon"), String(body.mime||"image/png"), String(body.base64||""));
      logAction_("uploadIcon", fileUrl);
      return jsonOk({ url: fileUrl });
    }

    return jsonErr("Unknown action");
  }catch(err){
    return jsonErr(String(err && err.message ? err.message : err));
  }
}

/* ---------------------- Security ---------------------- */

function requireAuth(token){
  if(!verifyToken_(token)){
    throw new Error("Unauthorized");
  }
}

function checkPassword_(plain){
  const props = PropertiesService.getScriptProperties();
  const stored = String(props.getProperty("ADMIN_PASSWORD_SHA256") || "");
  if(!stored) throw new Error("ADMIN_PASSWORD_SHA256 is not configured.");

  const hash = sha256Hex_(plain);
  return hash.toLowerCase() === stored.toLowerCase();
}

function makeToken_(){
  const props = PropertiesService.getScriptProperties();
  const secret = String(props.getProperty("TOKEN_SECRET") || "");
  if(!secret) throw new Error("TOKEN_SECRET is not configured.");

  const expMs = Date.now() + 1000 * 60 * 60 * 12; // 12h
  const payloadObj = { exp: expMs, n: Utilities.getUuid() };
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify(payloadObj));
  const sigBytes = Utilities.computeHmacSha256Signature(payload, secret);
  const sig = Utilities.base64EncodeWebSafe(sigBytes);
  return payload + "." + sig;
}

function verifyToken_(token){
  if(!token || token.indexOf(".") < 0) return false;
  const props = PropertiesService.getScriptProperties();
  const secret = String(props.getProperty("TOKEN_SECRET") || "");
  if(!secret) return false;

  const parts = token.split(".");
  const payload = parts[0];
  const sig = parts[1];

  const expectedBytes = Utilities.computeHmacSha256Signature(payload, secret);
  const expected = Utilities.base64EncodeWebSafe(expectedBytes);
  if(expected !== sig) return false;

  const payloadJson = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payload)).getDataAsString());
  if(!payloadJson.exp || Date.now() > Number(payloadJson.exp)) return false;

  // Optional: origin restriction (best-effort)
  enforceAllowedOrigin_();

  return true;
}

function enforceAllowedOrigin_(){
  const props = PropertiesService.getScriptProperties();
  const allowed = String(props.getProperty("ALLOWED_ORIGINS") || "").trim();
  if(!allowed) return; // not enforced

  // Apps Script doesn't expose Origin header directly in all cases.
  // Best-effort: use "referer" param if present or skip.
}

/* ---------------------- Data Layer ---------------------- */

function ss_(){
  const id = String(PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || "");
  if(!id) throw new Error("SPREADSHEET_ID is not configured.");
  return SpreadsheetApp.openById(id);
}

function sh_(name){
  const sheet = ss_().getSheetByName(name);
  if(!sheet) throw new Error("Missing sheet: " + name);
  return sheet;
}

function getConfigMap(){
  const sheet = sh_(SHEETS.CONFIG);
  const values = sheet.getRange(1,1, sheet.getLastRow(), 2).getValues();
  const map = {};
  values.forEach(r=>{
    const k = String(r[0]||"").trim();
    if(!k) return;
    map[k] = String(r[1]||"");
  });
  // Ensure defaults
  if(!map.system_status) map.system_status = "on";
  if(!map.redirect_mode) map.redirect_mode = "multi";
  return map;
}

function getPublicConfig(){
  const m = getConfigMap();
  return {
    system_status: m.system_status || "on",
    redirect_mode: m.redirect_mode || "multi",
    direct_url: m.direct_url || "",
    maintenance_message: m.maintenance_message || "",
    maintenance_countdown_to: m.maintenance_countdown_to || ""
  };
}

function getMaintenance(){
  const m = getConfigMap();
  return {
    message: m.maintenance_message || "نقوم حالياً بأعمال صيانة لتحسين الخدمة.",
    countdown_to: m.maintenance_countdown_to || ""
  };
}

function getPublicLinks(){
  const m = getConfigMap();
  const links = getLinks().filter(l=>String(l.enabled)==="TRUE");
  const profile = {
    display_name: m.profile_display_name || "Smart Soft",
    description: m.profile_description || "تابعنا عبر الروابط الرسمية.",
    avatar_url: m.profile_avatar_url || "",
    cover_url: m.profile_cover_url || ""
  };
  return { profile, links, config: getPublicConfig() };
}

function updateConfig_(patch){
  const sheet = sh_(SHEETS.CONFIG);
  const map = getConfigMap();
  Object.keys(patch||{}).forEach(k=>{
    if(CONFIG_KEYS.indexOf(k) < 0) return;
    map[k] = String(patch[k]);
  });

  // Write back as 2 columns key/value
  const rows = [];
  CONFIG_KEYS.forEach(k=>{
    if(k in map) rows.push([k, map[k]]);
    else rows.push([k, ""]);
  });

  sheet.getRange(1,1, rows.length, 2).setValues(rows);
}

function getLinks(){
  const sheet = sh_(SHEETS.LINKS);
  const last = sheet.getLastRow();
  if(last < 2) return [];
  const values = sheet.getRange(1,1,last,7).getValues();
  const head = values[0].map(String);
  const rows = values.slice(1);

  const idx = {};
  head.forEach((h,i)=>idx[h]=i);

  return rows
    .filter(r=>String(r[idx.id]||"").trim())
    .map(r=>({
      id: String(r[idx.id]||""),
      title: String(r[idx.title]||""),
      subtitle: String(r[idx.subtitle]||""),
      url: String(r[idx.url]||""),
      icon_url: String(r[idx.icon_url]||""),
      enabled: String(r[idx.enabled]||"TRUE"),
      sort_order: String(r[idx.sort_order]||"1")
    }));
}

function upsertLink_(link){
  const sheet = sh_(SHEETS.LINKS);
  const id = String(link.id||"").trim();
  if(!id) throw new Error("Missing link id");

  const last = sheet.getLastRow();
  const values = last >= 2 ? sheet.getRange(2,1,last-1,7).getValues() : [];
  const rowIndex = values.findIndex(r=>String(r[0])===id);

  const record = [
    id,
    String(link.title||""),
    String(link.subtitle||""),
    String(link.url||""),
    String(link.icon_url||""),
    String(link.enabled||"TRUE"),
    String(link.sort_order||"1")
  ];

  if(rowIndex >= 0){
    sheet.getRange(2 + rowIndex, 1, 1, 7).setValues([record]);
  }else{
    sheet.appendRow(record);
  }
}

function deleteLink_(id){
  const sheet = sh_(SHEETS.LINKS);
  const last = sheet.getLastRow();
  if(last < 2) return;
  const values = sheet.getRange(2,1,last-1,1).getValues().map(r=>String(r[0]));
  const idx = values.findIndex(x=>x===id);
  if(idx >= 0){
    sheet.deleteRow(2 + idx);
  }
}

function reorderLinks_(order){
  const map = {};
  order.forEach(o=>{
    map[String(o.id||"")] = String(o.sort_order||"");
  });

  const sheet = sh_(SHEETS.LINKS);
  const last = sheet.getLastRow();
  if(last < 2) return;

  const range = sheet.getRange(2,1,last-1,7);
  const rows = range.getValues();

  rows.forEach(r=>{
    const id = String(r[0]||"");
    if(map[id]){
      r[6] = map[id];
    }
  });

  range.setValues(rows);
}

function trackVisit(type, id){
  const sheet = sh_(SHEETS.VISITS);
  sheet.appendRow([new Date(), String(type||""), String(id||""), Session.getActiveUser().getEmail() || "anon"]);
}

function getStats(){
  const sheet = sh_(SHEETS.VISITS);
  const last = sheet.getLastRow();
  if(last < 2) return { today:0, total:0 };

  const values = sheet.getRange(2,1,last-1,1).getValues().flat();
  const total = values.length;

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  let today = 0;
  values.forEach(d=>{
    const s = Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), "yyyy-MM-dd");
    if(s === todayStr) today++;
  });

  return { today, total };
}

function logAction_(action, details){
  const sheet = sh_(SHEETS.LOGS);
  sheet.insertRowBefore(2);
  sheet.getRange(2,1,1,3).setValues([[new Date(), String(action||""), String(details||"")]]);
}

function getLogs(limit){
  const sheet = sh_(SHEETS.LOGS);
  const last = sheet.getLastRow();
  if(last < 2) return [];
  const take = Math.min(limit||50, last-1);
  const values = sheet.getRange(2,1,take,3).getValues();
  return values.map(r=>({
    ts: Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    action: String(r[1]||""),
    details: String(r[2]||"")
  }));
}

function uploadIcon_(filename, mime, base64Data){
  if(!base64Data) throw new Error("Empty file");
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mime, filename);

  const folder = getOrCreateFolder_("DSRS_Icons");
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Direct download URL (works for public view)
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

function getOrCreateFolder_(name){
  const it = DriveApp.getFoldersByName(name);
  if(it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

function getContacts(){
  return {
    ai: "00967 735098666",
    support: "00967 770522788",
    email: "contact@smart-soft.io",
    site: "smart-soft.io"
  };
}

/* ---------------------- Helpers ---------------------- */

function jsonOk(obj){
  const out = Object.assign({ ok:true }, obj || {});
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonErr(msg){
  const out = { ok:false, error: String(msg||"Error") };
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseJson_(s){
  if(!s) return {};
  return JSON.parse(String(s));
}

function sha256Hex_(text){
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}
