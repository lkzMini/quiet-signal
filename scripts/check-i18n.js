/* Strict i18n audit for Quiet Signal. Run: node scripts/check-i18n.js */
const fs=require('fs'),vm=require('vm'),cp=require('child_process');
for(const file of ['data.js','locales.js','game.js']) cp.execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
const ctx={window:{},localStorage:{getItem:()=>null,setItem(){}},navigator:{language:'en'},document:{documentElement:{},querySelectorAll(){return[]}}}; vm.createContext(ctx); vm.runInContext(fs.readFileSync('data.js','utf8'),ctx); vm.runInContext(fs.readFileSync('locales.js','utf8'),ctx);
const d=ctx.window.QS_DATA,t=ctx.window.QS_I18N.translations, keys=[];
for(const collection of ['scenarios','operators','difficulties','mutators','objectives','events','endings','achievements','unlocks']) for(const item of d[collection]||[]){ for(const f of ['nameKey','descriptionKey','positiveKey','negativeKey','titleKey','textKey']) if(item[f]) keys.push(item[f]); for(const c of item.choices||[]) for(const f of ['titleKey','descKey','hintKey']) if(c[f]) keys.push(c[f]); }
const all=[...new Set(keys)], missing={}; for(const lang of ['es','en','ko']) missing[lang]=all.filter(k=>!t[lang]||!Object.prototype.hasOwnProperty.call(t[lang],k));
const html=fs.readFileSync('index.html','utf8'); const hardcoded=[]; for(const m of html.matchAll(/>([^<>{}\n]{2,})</g)){const text=m[1].trim(); if(!text||/^(Quiet Signal|QUIET SIGNAL|K-27|14\.827|—|\d+\s·\s)/.test(text)) continue; const before=html.slice(Math.max(0,m.index-100),m.index); if(!/data-i18n\s*=/.test(before)) hardcoded.push(text);}
const unique=[...new Set(hardcoded)]; console.log(`Missing ES keys: ${missing.es.length}`); console.log(`Missing EN keys: ${missing.en.length}`); console.log(`Missing KO keys: ${missing.ko.length}`); console.log(`Hardcoded UI strings: ${unique.length}`); if(unique.length) console.log(unique.join(' | ')); if(Object.values(missing).some(x=>x.length)||unique.length) process.exitCode=1;


