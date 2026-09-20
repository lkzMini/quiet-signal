/* Onboarding state, save-compatibility, localization and wiring contracts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const onboarding=require('../onboarding-state.js');
const fresh=onboarding.normalize(null);
assert.deepEqual(fresh,{briefingComplete:false,tutorialComplete:false,tutorialStep:0},'new profiles should see onboarding');
assert.equal(onboarding.shouldShowBriefing(fresh),true);
assert.equal(onboarding.shouldResumeTutorial(fresh),false);
assert.deepEqual(onboarding.normalize(undefined,{hasPriorRun:true}),{briefingComplete:true,tutorialComplete:true,tutorialStep:0},'legacy active saves must not be interrupted');
assert.equal(onboarding.normalize({runsCompleted:2},{hasCompletedRun:true}).tutorialComplete,true,'legacy completed profiles should not be forced through onboarding');
assert.equal(onboarding.normalize({}).briefingComplete,false,'brand-new profile meta remains eligible');
onboarding.completeBriefing(fresh);
assert.equal(onboarding.shouldResumeTutorial(fresh),true,'briefing completion resumes contextual guide');
onboarding.setStep(fresh,4,7);
const reloaded=onboarding.normalize(JSON.parse(JSON.stringify(fresh)));
assert.equal(reloaded.tutorialStep,4,'tutorial progress survives JSON save/reload');
onboarding.completeTutorial(reloaded);
assert.equal(onboarding.shouldResumeTutorial(reloaded),false);
assert.equal(reloaded.tutorialComplete,true);
assert.equal(onboarding.normalize({tutorialStep:99}).tutorialStep,6,'tutorial step is clamped to supported state range');

const html=fs.readFileSync('index.html','utf8'),game=fs.readFileSync('game.js','utf8'),css=fs.readFileSync('styles.css','utf8');
assert.ok(html.includes('onboarding-state.js') && html.indexOf('onboarding-state.js')<html.indexOf('game.js'),'state helper loads before game');
for(const id of ['briefingDialog','tutorialGuide','helpBtn','menuHelpBtn','macroObjective']) assert.ok(html.includes(`id="${id}"`),`missing onboarding element ${id}`);
for(const phrase of ['startTutorial()','shouldShowBriefing(meta.onboarding)','shouldResumeTutorial(meta.onboarding)','saveMeta()']) assert.ok(game.includes(phrase),`missing runtime flow ${phrase}`);
for(const breakpoint of ['max-width:1200px','max-width:900px','max-width:620px']) assert.ok(css.includes(breakpoint),`responsive breakpoint missing: ${breakpoint}`);

for(const file of ['onboarding-state.js','game.js','locales.js']) require('node:child_process').execFileSync(process.execPath,['--check',file]);
const ctx={window:{},localStorage:{getItem:()=>null,setItem(){}},navigator:{language:'en'},document:{documentElement:{},querySelectorAll(){return[]}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('locales.js','utf8'),ctx);
for(const lang of ['es','en','ko']) for(const key of Object.keys(ctx.window.QS_I18N.translations.en).filter(key=>key.startsWith('onboarding.'))) assert.ok(ctx.window.QS_I18N.has(key,lang),`missing ${lang} translation: ${key}`);
console.log('Onboarding flow, legacy compatibility, reload persistence, ES/EN/KO and responsive contracts: OK');
