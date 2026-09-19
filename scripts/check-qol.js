/* Lightweight content/save contract checks for Quiet Signal. Run: node scripts/check-qol.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const systems = require('../systems.js');
const context = { window: {}, Math, Date };
vm.runInNewContext(fs.readFileSync('data.js', 'utf8'), context, { filename: 'data.js' });
const { events } = context.window.QS_DATA;
const ids = events.map(event => event.id);
assert.equal(new Set(ids).size, ids.length, 'event IDs must remain unique');
assert.ok(events.length >= 52, 'expected at least 12 additions to the existing 40 events');
assert.ok(events.every(event => event.title && event.text && event.choices?.length), 'every event needs a title, text and choices');
const chains = new Map();
for (const event of events) if (event.chain) chains.set(event.chain.id, [...(chains.get(event.chain.id) || []), event.chain.stage]);
for (const id of ['beacon', 'crate', 'window']) assert.deepEqual(chains.get(id), [1, 2], `${id} should be a two-stage chain`);
assert.ok(events.filter(event => event.flagsRequired || event.scenario || event.minDay > 1).length >= 4, 'expected multiple conditional events');
const deferred = events.flatMap(event => event.choices.flatMap(choice => choice.deferred || []));
assert.ok(deferred.length >= 3, 'expected at least three delayed consequences');
assert.ok(deferred.every(item => item.id && item.days >= 1 && item.effects), 'delayed consequences need stable IDs, due days and effects');
const threads = new Set(events.flatMap(event => event.choices.map(choice => choice.thread?.id).filter(Boolean)));
assert.ok(threads.has('beacon') && threads.has('crate') && threads.has('window'), 'expected persistent narrative threads');
for (const [id, metric] of Object.entries(systems.metrics)) {
  assert.ok(metric.label && metric.icon && Number.isFinite(metric.low) && Number.isFinite(metric.critical), `${id} needs a label, icon and thresholds`);
  assert.ok(['station','operator','resources','signal'].includes(metric.scope), `${id} needs a supported scope`);
}
assert.equal(systems.state(20, systems.metrics.power), 'critical');
assert.equal(systems.state(40, systems.metrics.power), 'low');
assert.equal(systems.state(70, systems.metrics.power), 'normal');
assert.equal(systems.state(80, systems.metrics.hunger), 'critical');
assert.equal(systems.isGood(-20, systems.metrics.hunger), true, 'lower hunger is beneficial');
assert.equal(systems.isGood(5, systems.metrics.stress), false, 'higher stress is harmful');
assert.equal(systems.isGood(10, systems.metrics.health), true, 'higher health is beneficial');
assert.equal(systems.forecast(96, 20, systems.metrics.health), 100, 'operator previews clamp to the meter maximum');
assert.equal(systems.forecast(1, -1, systems.metrics.food), 0, 'resource previews cannot go below zero');
for (const event of events) for (const choice of event.choices) {
  for (const scope of ['station', 'operator', 'resources']) for (const [key, value] of Object.entries(choice.effects?.[scope] || {})) {
    assert.equal(typeof value, 'number', `${event.id}: ${scope}.${key} must be numeric`);
  }
}
const game = fs.readFileSync('game.js', 'utf8');
assert.match(game, /run\.deferredConsequences = Array\.isArray\(run\.deferredConsequences\)/, 'old saves must default the deferred queue');
assert.match(game, /run\.storyThreads = run\.storyThreads && typeof run\.storyThreads === 'object'/, 'old saves must default story thread progress');
assert.match(game, /resolveDeferredConsequences\(\);\s*const deferredFailure=checkFailure\(\)/, 'delayed effects must run failure checks before the next event');
assert.match(game, /quiet-signal-v02/, 'legacy save migration key must remain supported');
assert.match(game, /choice\.deferred\s*\|\|\[\]/, 'deferred consequences must be visible in the choice preview');
const normalizeBody=game.match(/function normalizeRun\(\) \{([\s\S]*?)\n  \}/)?.[1];
assert.ok(normalizeBody, 'run normalization must be testable for legacy saves');
const oldSave={station:{power:75,integrity:70,heat:80,comms:68,water:72},operator:{health:90,hunger:20,thirst:15,fatigue:10,stress:8},resources:{food:8,waterReserve:7,fuel:20,spareParts:3,medicalSupplies:1,batteries:2},signalKnowledge:12};
Function('run','clamp',`return function(){${normalizeBody}}`)(oldSave,value=>Math.max(0,Math.min(100,Number(value)||0)))();
assert.deepEqual(oldSave.deferredConsequences,[], 'existing saves default to an empty deferred queue');
assert.deepEqual(oldSave.storyThreads,{}, 'existing saves default to empty thread progress');
const resolverBody=game.match(/function resolveDeferredConsequences\(\) \{([\s\S]*?)\n  \}/)?.[1];
assert.ok(resolverBody, 'deferred consequence resolver must exist');
const effects=[]; const delayedRun={day:4,deferredConsequences:[{id:'due',dueDay:4,effects:{station:{power:-3}}},{id:'later',dueDay:5,effects:{station:{heat:-2}}}],flags:{},history:[]};
Function('run','applyEffects','normalizeRun',`return function(){${resolverBody}}`)(delayedRun,effects.push.bind(effects),()=>{})();
assert.equal(effects.length,1, 'only consequences due this day resolve');
assert.deepEqual(delayedRun.deferredConsequences.map(item=>item.id),['later'], 'future consequences remain queued');
assert.equal(delayedRun.history[0].key,'ui.log.deferred', 'resolved consequences leave a localized history entry');
const css=fs.readFileSync('styles.css', 'utf8');
for (const width of [1200,900,620]) assert.ok(css.includes(`max-width:${width}px`), `responsive layout breakpoint ${width}px must remain`);
console.log(`QoL content/save checks: PASS (${events.length} events, ${chains.size} chains, ${deferred.length} delayed consequences)`);
