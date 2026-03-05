import { initTheme, apiGet, toast } from "./utils.js";

initTheme();

(async function main(){
  try{
    const cfg = await apiGet("publicConfig");
    // نظام الإيقاف الفوري
    if(cfg.config.system_status !== "on"){
      window.location.replace("./maintenance.html");
      return;
    }

    if(cfg.config.redirect_mode === "direct"){
      const target = (cfg.config.direct_url || "").trim();
      if(!target){
        toast("لم يتم ضبط رابط التحويل المباشر.");
        return;
      }
      window.location.replace(target);
      return;
    }

    // multi links
    window.location.replace("./links.html");
  }catch(e){
    // عند فشل الـ API: اعرض صفحة الصيانة كـ fallback
    window.location.replace("./maintenance.html?reason=api");
  }
})();
