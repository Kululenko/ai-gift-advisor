import test from "node:test";
import assert from "node:assert/strict";
import { reserveQuota } from "../server/advisor-quota.mjs";
export function memoryStore() {
  let data=null,version=0;
  return {async getWithMetadata(){return data?{data:structuredClone(data),etag:String(version)}:null;},async setJSON(key,next,options){
    await new Promise(resolve=>setImmediate(resolve));
    if(options.onlyIfNew && data || options.onlyIfMatch!==undefined && options.onlyIfMatch!==String(version))return {modified:false};
    data=structuredClone(next);version++;return {modified:true,etag:String(version)};
  },read(){return structuredClone(data);}};
}
const now=Date.parse("2026-11-04T12:00:00Z");
const opts={ip:"test-visitor",secret:"test-secret",now};
test("Concurrent requests cannot exceed the five-request visitor limit",async()=>{
  const store=memoryStore(),results=await Promise.allSettled(Array.from({length:40},()=>reserveQuota(store,opts)));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,5);
  assert.equal(store.read().daySpent,15000);assert.equal(store.read().monthSpent,15000);
  assert.ok(!JSON.stringify(store.read()).includes(opts.ip));
});
test("Rotating IPs cannot bypass shared daily or monthly budgets",async()=>{
  for(const env of [{GIFT_AI_DAILY_BUDGET_USD:"0.009"},{GIFT_AI_MONTHLY_BUDGET_USD:"0.009"}]){
    const store=memoryStore(),results=await Promise.allSettled(Array.from({length:30},(_,i)=>reserveQuota(store,{...opts,env,ip:`visitor-${i}`})));
    assert.equal(results.filter(r=>r.status==="fulfilled").length,3);assert.equal(store.read().monthSpent,9000);
  }
});
test("Rolling ten-minute and 20/day limits work across windows",async()=>{
  const store=memoryStore();
  for(let group=0;group<4;group++)for(let i=0;i<5;i++)await reserveQuota(store,{...opts,now:now+group*600001});
  await assert.rejects(reserveQuota(store,{...opts,now:now+2400004}),e=>e.code==="visitor_daily_limit");
});
test("Daily reset retains monthly spend; old concurrent requests cannot reset it backwards",async()=>{
  const store=memoryStore();await reserveQuota(store,opts);
  await reserveQuota(store,{...opts,now:now+86400000});
  assert.equal(store.read().monthSpent,6000);assert.equal(store.read().daySpent,3000);
  await assert.rejects(reserveQuota(store,opts),e=>e.code==="busy");
  await reserveQuota(store,{...opts,now:Date.parse("2026-12-01T12:00:00Z")});assert.equal(store.read().monthSpent,3000);
});
test("The rolling limit survives Berlin midnight and the month boundary",async()=>{
  for(const before of ["2026-11-04T22:59:00Z","2026-11-30T22:59:00Z"]){
    const store=memoryStore(),t=Date.parse(before);
    for(let i=0;i<5;i++)await reserveQuota(store,{...opts,now:t+i});
    await assert.rejects(reserveQuota(store,{...opts,now:t+60001}),e=>e.code==="visitor_limit");
    await reserveQuota(store,{...opts,now:t+600005});
    assert.equal(store.read().daySpent,3000);
    assert.equal(Object.keys(store.read().previousVisitors).length,0);
    assert.equal(Object.values(store.read().visitors)[0].count,1);
  }
});
test("An existing but corrupt stored document cannot reset the spending budget",async()=>{
  let writes=0;
  for(const data of [null,{},false]){
    const store={getWithMetadata:async()=>({data,etag:"existing"}),setJSON:async()=>{writes++;return {modified:true};}};
    await assert.rejects(reserveQuota(store,opts));
  }
  assert.equal(writes,0);
});
test("Zero budgets, invalid configuration and storage failures fail closed",async()=>{
  await assert.rejects(reserveQuota(memoryStore(),{...opts,env:{GIFT_AI_DAILY_BUDGET_USD:"0"}}),e=>e.code==="site_budget_limit");
  await assert.rejects(reserveQuota(memoryStore(),{...opts,env:{GIFT_AI_DAILY_BUDGET_USD:"NaN"}}));
  await assert.rejects(reserveQuota({getWithMetadata:async()=>{throw Error("offline");}},opts));
  await assert.rejects(reserveQuota(memoryStore(),{...opts,ip:null}));
});
test("Missing ETag can never downgrade an atomic update to last-write-wins",async()=>{
  let writes=0;
  const store={getWithMetadata:async()=>({data:{month:"2026-11",day:"2026-11-04",monthSpent:0,daySpent:0,visitors:{}}}),setJSON:async()=>{writes++;return {modified:true};}};
  await assert.rejects(reserveQuota(store,opts));assert.equal(writes,0);
});

