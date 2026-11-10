import { createHmac } from "node:crypto";

export class QuotaError extends Error {
  constructor(code, retryAfter=600) { super(code); this.code=code; this.retryAfter=retryAfter; }
}
const units = value => Math.round(value*1000000);
function budget(env,key,fallback) {
  const value=env[key]===undefined?fallback:Number(env[key]);
  if(!Number.isFinite(value)||value<0||value>100)throw new Error("Invalid budget configuration");
  return units(value);
}
// One atomic reservation updates visitor and site limits together. Site-wide (not
// deploy-scoped) storage prevents parallel functions and deployments resetting it.
// Ambiguous writes/timeouts keep their reservation. Never refund a possible call.
export async function reserveQuota(store, {ip, secret, env={}, now=Date.now(), cost=3000}) {
  if(!ip||!secret)throw new Error("Missing trusted request identity");
  const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now));
  const month=day.slice(0,7);
  const identity=createHmac("sha256",secret).update(`${day}|${ip}`).digest("hex");
  const dayLimit=budget(env,"GIFT_AI_DAILY_BUDGET_USD",1), monthLimit=budget(env,"GIFT_AI_MONTHLY_BUDGET_USD",10);
  for(let attempt=0;attempt<8;attempt++) {
    const old=await store.getWithMetadata("quota-v1",{type:"json",consistency:"strong"});
    if(old && (typeof old.etag!=="string" || !old.etag))throw new Error("Missing concurrency token");
    const state=old ? old.data : {month,monthSpent:0,day,daySpent:0,visitors:{}};
    if(!state||!Number.isSafeInteger(state.monthSpent)||state.monthSpent<0||!Number.isSafeInteger(state.daySpent)||state.daySpent<0||!/^\d{4}-\d{2}-\d{2}$/.test(state.day)||!/^\d{4}-\d{2}$/.test(state.month)||!state.visitors||typeof state.visitors!=="object"||Array.isArray(state.visitors))throw new Error("Invalid quota state");
    const next=structuredClone(state);
    if(next.day>day || next.month>month)throw new QuotaError("busy",15);
    if(next.month!==month){next.month=month;next.monthSpent=0;}
    if(next.day!==day){
      // Carry the final ten minutes across midnight without carrying daily counts.
      next.previousDay=next.day;next.previousVisitors=next.visitors;
      next.day=day;next.daySpent=0;next.visitors={};
    }
    if(next.previousVisitors){
      if(typeof next.previousVisitors!=="object"||Array.isArray(next.previousVisitors)||!/^\d{4}-\d{2}-\d{2}$/.test(next.previousDay))throw new Error("Invalid previous quota");
      for(const [key,entry] of Object.entries(next.previousVisitors)){
        if(!Array.isArray(entry?.recent)||entry.recent.some(t=>!Number.isFinite(t)))throw new Error("Invalid previous visitor");
        entry.recent=entry.recent.filter(t=>t>now-600000);
        if(!entry.recent.length)delete next.previousVisitors[key];
        else next.previousVisitors[key]={recent:entry.recent};
      }
    }
    const previousIdentity=next.previousDay?createHmac("sha256",secret).update(`${next.previousDay}|${ip}`).digest("hex"):"";
    const visitor=next.visitors[identity]||{count:0,recent:next.previousVisitors?.[previousIdentity]?.recent.slice()||[]};
    if(!Number.isSafeInteger(visitor.count)||visitor.count<0||!Array.isArray(visitor.recent)||visitor.recent.some(t=>!Number.isFinite(t)))throw new Error("Invalid visitor quota");
    visitor.recent=visitor.recent.filter(t=>t>now-600000).sort((a,b)=>a-b);
    if(visitor.count>=20)throw new QuotaError("visitor_daily_limit",3600);
    if(visitor.recent.length>=5)throw new QuotaError("visitor_limit",Math.max(1,Math.ceil((visitor.recent[0]+600000-now)/1000)));
    if(next.daySpent+cost>dayLimit||next.monthSpent+cost>monthLimit)throw new QuotaError("site_budget_limit",3600);
    visitor.count++;visitor.recent.push(now);next.visitors[identity]=visitor;
    next.daySpent+=cost;next.monthSpent+=cost;
    const result=await store.setJSON("quota-v1",next,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});
    if(result.modified)return {reservedMicroUsd:cost};
  }
  throw new QuotaError("busy",15);
}

