/* Translation coverage check. Run: node scripts/check-translations.js */
const fs = require('fs');
const source = fs.readFileSync('locales.js','utf8');
const match = source.match(/const ui = (\{[\s\S]*?\r?\n  \});\r?\n  const metricLabels/);
if (!match) throw new Error('Could not locate translation dictionaries');
const ui = Function(`return (${match[1]})`)();
const flatten = (o,p='',r={}) => { for (const [k,v] of Object.entries(o||{})) { const key=p?`${p}.${k}`:k; if(v&&typeof v==='object'&&!Array.isArray(v)) flatten(v,key,r); else r[key]=v; } return r; };
const sets = Object.fromEntries(Object.entries(ui).map(([lang,dict])=>[lang,new Set(Object.keys(flatten(dict)))]));
const all = new Set([...sets.es,...sets.en,...sets.ko]);
let failed=false;
for(const lang of ['es','en','ko']) { const missing=[...all].filter(k=>!sets[lang].has(k)); const extra=[...sets[lang]].filter(k=>!all.has(k)); console.log(`${lang}: ${sets[lang].size}/${all.size} keys`); if(missing.length||extra.length){failed=true; if(missing.length) console.log('  missing:',missing.join(', ')); if(extra.length) console.log('  extra:',extra.join(', '));} }
if(failed) process.exitCode=1; else console.log('Translation coverage: PASS');
