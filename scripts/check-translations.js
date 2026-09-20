/* Translation coverage check. Run: node scripts/check-translations.js */
const fs = require('fs');
const source = fs.readFileSync('locales.js','utf8');
const vm = require('vm');
const context = {window:{},localStorage:{getItem:()=>null,setItem(){}},navigator:{language:'en'},document:{documentElement:{},querySelectorAll(){return[]}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data.js','utf8'),context);
vm.runInContext(source,context);
const ui = context.window.QS_I18N.translations;
const flatten = (o,p='',r={}) => { for (const [k,v] of Object.entries(o||{})) { const key=p?`${p}.${k}`:k; if(v&&typeof v==='object'&&!Array.isArray(v)) flatten(v,key,r); else r[key]=v; } return r; };
const sets = Object.fromEntries(Object.entries(ui).map(([lang,dict])=>[lang,new Set(Object.keys(flatten(dict)))]));
// Event-category and weather labels are generated from data at runtime; their
// fallback logic is covered by check-i18n.js, so compare authored UI keys here.
const generated = key => /^event\..+\.category$/.test(key) || key.startsWith('weather.');
const all = new Set([...sets.es,...sets.en,...sets.ko].filter(key=>!generated(key)));
let failed=false;
for(const lang of ['es','en','ko']) { const authored=new Set([...sets[lang]].filter(key=>!generated(key))); const missing=[...all].filter(k=>!authored.has(k)); const extra=[...authored].filter(k=>!all.has(k)); console.log(`${lang}: ${authored.size}/${all.size} keys`); if(missing.length||extra.length){failed=true; if(missing.length) console.log('  missing:',missing.join(', ')); if(extra.length) console.log('  extra:',extra.join(', '));} }
if(failed) process.exitCode=1; else console.log('Translation coverage: PASS');
