(function () {
  'use strict';

  const PROFILES_KEY = 'quiet-signal-profiles-v1';
  const RUN_KEY = 'quiet-signal-run-v1';
  const META_KEY = 'quiet-signal-meta-v1';
  const SETTINGS_KEY = 'quiet-signal-settings-v1';
  const LEGACY_RUN_KEY = 'quiet-signal-v02';
  const D = window.QS_DATA;
  const I18N = window.QS_I18N;
  const ONBOARDING = window.QS_ONBOARDING;
  const { metrics:METRICS, state:metricState, isGood:metricIsGood, forecast:forecastMetric } = window.QS_SYSTEMS;
  const $ = id => document.getElementById(id);
  const STATION_STATS = [['power','stats.station.power'],['integrity','stats.station.structure'],['heat','stats.station.heat'],['comms','stats.station.comms'],['water','stats.station.water']];
  const OPERATOR_STATS = [['health','stats.operator.health',false],['hunger','stats.operator.hunger',true],['thirst','stats.operator.thirst',true],['fatigue','stats.operator.fatigue',true],['stress','stats.operator.stress',true]];
  const RESOURCE_META = [['food','stats.resource.food'],['waterReserve','stats.resource.water'],['fuel','stats.resource.fuel'],['spareParts','stats.resource.parts'],['medicalSupplies','stats.resource.medicine'],['batteries','stats.resource.batteries']];
  function metricValue(runState, metric, key) { return metric.scope === 'signal' ? runState.signalKnowledge : runState[metric.scope][key]; }
  function eventImpact(choice) {
    const effects=JSON.parse(JSON.stringify(choice.effects||{})),op=currentOperator(),scenario=currentScenario();
    if(effects.operator?.stress>0) effects.operator.stress *= (op.effects.stressGain||1)*(scenario.modifiers.stressGain||1)*(run.mutators.includes('paranoia')?1.3:1)*(currentEvent.category==='señal'?(op.effects.signalStress||1):1);
    if(effects.signalKnowledge){effects.signalKnowledge *= (op.effects.signalGain||1)*(scenario.modifiers.signalGain||1);if(run.mutators.includes('interference'))effects.signalKnowledge*=.75;}
    const rows=renderPreview(effects,run);
    const immediate=rows || esc(choice.deferred?.length ? I18N.t('ui.preview.delayed') : dataText(choice,'hint') || I18N.t('ui.preview.uncertain'));
    const delayed=(choice.deferred||[]).map(item=>`<span class="preview-line delayed-preview">⌛ ${esc(I18N.t('ui.preview.due',{days:item.days}))}: ${renderPreview(item.effects||{},run)||esc(I18N.t('ui.preview.uncertain'))}</span>`).join('');
    return immediate+delayed;
  }
  function actionPreview(action, state) {
    const op=currentOperator(); const effects={station:{},operator:{},resources:{},signalKnowledge:0};
    const set=(scope,key,val)=>{if(scope==='signalKnowledge')effects.signalKnowledge=val;else effects[scope][key]=val;};
    switch(action.id){
      case 'repair': { const key=STATION_STATS.map(([id])=>id).sort((a,b)=>state.station[a]-state.station[b])[0]; let n=12*(op.effects.repair||1);if(key==='comms')n*=op.effects.commsRepair||1;set('station',key,n);set('resources','spareParts',-1);set('operator','fatigue',5);break; }
      case 'eat':set('resources','food',-1);set('operator','hunger',-28);break;
      case 'drink':set('resources','waterReserve',-1);set('operator','thirst',-32);break;
      case 'sleep':set('operator','fatigue',-27);set('operator','stress',-4);break;
      case 'explore':set('operator','fatigue',9*(op.effects.outsideFatigue||1));set('operator','thirst',5);break;
      case 'logs':set('signalKnowledge','signalKnowledge',3*(op.effects.signalGain||1));set('operator','fatigue',3);break;
      case 'antenna':set('resources','batteries',-1);set('station','comms',8*(op.effects.commsRepair||1));set('signalKnowledge','signalKnowledge',3*(op.effects.signalGain||1));break;
      case 'maintenance':set('resources','spareParts',-1);for(const [key] of STATION_STATS)set('station',key,3*(op.effects.repair||1));set('operator','fatigue',6);break;
      case 'investigate':set('station','power',-4);set('signalKnowledge','signalKnowledge',6*(op.effects.signalGain||1)*(state.mutators.includes('interference')?.75:1));set('operator','stress',3*(op.effects.stressGain||1));break;
      case 'craft':set('resources','batteries',-1);set('resources','fuel',-2);set('resources','spareParts',1);set('operator','fatigue',5);break;
      case 'rest':set('operator','fatigue',-12);set('operator','stress',-7);break;
      case 'treat':set('resources','medicalSupplies',-1);set('operator','health',20);break;
    }
    return effects;
  }
  function renderPreview(effects,state) {
    const lines=[];
    for(const scope of ['station','operator','resources']) for(const [key,delta] of Object.entries(effects[scope]||{})){
      const metric=METRICS[key];if(!metric)continue;const before=metricValue(state,metric,key), after=forecastMetric(before,delta,metric);if(after===before)continue;
      const status=metricState(after,metric);const danger=status==='critical'||status==='low';const good=metricIsGood(delta,metric);
      lines.push(`<span class="preview-line ${good?'delta-good':'delta-bad'} ${danger?'resource-alert '+status:''}">${metric.icon} ${esc(I18N.t(metric.label))}: ${Math.round(before)} → ${Math.round(after)} · ${esc(I18N.t(good?'ui.preview.good':'ui.preview.bad'))}${danger?` · ${esc(I18N.t(`ui.state.${status}`))}`:''}</span>`);
    }
    if(effects.signalKnowledge){const m=METRICS.signalKnowledge,b=state.signalKnowledge,a=clamp(b+effects.signalKnowledge);lines.push(`<span class="preview-line delta-good">∿ ${esc(I18N.t(m.label))}: ${Math.round(b)} → ${Math.round(a)} · ${esc(I18N.t('ui.preview.good'))}</span>`)}
    return lines.join('');
  }

  let profileStore = initializeProfiles();
  let activeProfile = profileStore.profiles.find(profile => profile.id === profileStore.selectedProfileId) || profileStore.profiles[0];
  profileStore.selectedProfileId = activeProfile.id;
  saveProfiles();
  let profileRunKey = profileKey('run');
  let profileMetaKey = profileKey('meta');
  let meta = normalizeMeta(loadJson(profileMetaKey, null), Boolean(loadJson(profileRunKey, null)));
  let settings = loadJson(SETTINGS_KEY, { textScale: 100, reduceMotion: false });
  settings = { textScale: Number(settings?.textScale) || 100, reduceMotion: Boolean(settings?.reduceMotion), language: I18N.getLocale() };
  let run = loadJson(profileRunKey, null);
  let currentEvent = null;

  function createMeta() {
    return {
      data: 0, runsCompleted: 0, totalDaysSurvived: 0, bestRun: 0,
      endingsFound: [], eventsDiscovered: [], loreDiscovered: [], achievements: [],
      operatorsUnlocked: ['elena','marcus','noah'], scenariosUnlocked: ['winter','red','orbit'],
      mutatorsUnlocked: [], perksUnlocked: [], unlocksPurchased: [], runHistory: [],
      onboarding: ONBOARDING.create()
    };
  }

  function profileKey(kind, profileId = activeProfile?.id) { return `quiet-signal:${profileId}:${kind}`; }

  function createProfile(name = null) {
    const generated = !name;
    name = name || I18N?.t?.('profile.defaultName') || (navigator.language?.toLowerCase().startsWith('ko') ? '플레이어 1' : navigator.language?.toLowerCase().startsWith('en') ? 'Player 1' : 'Jugador 1');
    const now = new Date().toISOString();
    return { id: `p-${Date.now()}-${Math.random().toString(16).slice(2)}`, name, defaultGenerated: generated, createdAt: now, lastPlayedAt: null };
  }

  function initializeProfiles() {
    const existing = loadJson(PROFILES_KEY, null);
    if (existing?.profiles?.length) { const profile=existing.profiles.find(item=>item.defaultGenerated || item.name==='Jugador 1'); if(profile && (profile.defaultGenerated || profile.name==='Jugador 1')) { profile.defaultGenerated=true; profile.name=I18N.t('profile.defaultName'); } return existing; }
    const profile = createProfile();
    const store = { version: 1, selectedProfileId: profile.id, profiles: [profile] };
    const legacyRun = loadJson(RUN_KEY, null) || migrateLegacyRun(loadJson(LEGACY_RUN_KEY, null));
    const legacyMeta = loadJson(META_KEY, null);
    if (legacyRun) localStorage.setItem(`quiet-signal:${profile.id}:run`, JSON.stringify(legacyRun));
    if (legacyMeta) localStorage.setItem(`quiet-signal:${profile.id}:meta`, JSON.stringify(legacyMeta));
    localStorage.setItem(PROFILES_KEY, JSON.stringify(store));
    return store;
  }

  function saveProfiles() { localStorage.setItem(PROFILES_KEY, JSON.stringify(profileStore)); }

  function loadProfileState() {
    profileRunKey = profileKey('run');
    profileMetaKey = profileKey('meta');
    meta = normalizeMeta(loadJson(profileMetaKey, null), Boolean(loadJson(profileRunKey, null)));
    run = loadJson(profileRunKey, null);
    currentEvent = null;
    if (run && !run.complete) currentEvent = run.currentEventId === 'final_shift' ? finalEvent() : byId(D.events, run.currentEventId) || pickEvent();
  }

  function touchProfile() {
    activeProfile.lastPlayedAt = new Date().toISOString();
    saveProfiles();
  }

  function normalizeMeta(value, hasPriorRun = false) {
    const base = createMeta();
    if (!value || typeof value !== 'object') {
      if (hasPriorRun) value = { ...base, onboarding: { briefingComplete:true, tutorialComplete:true, tutorialStep:0 } };
      else return base;
    }
    if (value.onboarding == null) value.onboarding = ONBOARDING.normalize(null, {hasPriorRun, hasCompletedRun:Number(value.runsCompleted)>0});
    for (const key of Object.keys(base)) {
      if (Array.isArray(base[key]) && !Array.isArray(value[key])) value[key] = [...base[key]];
      else if (value[key] == null) value[key] = base[key];
    }
    value.onboarding = ONBOARDING.normalize(value.onboarding, {hasPriorRun, hasCompletedRun:Number(value.runsCompleted)>0});
    return value;
  }
  meta = normalizeMeta(meta);

  function loadJson(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (error) { console.warn(`No se pudo leer ${key}.`, error); return fallback; }
  }

  function saveRun() { if (run) { localStorage.setItem(profileRunKey, JSON.stringify(run)); touchProfile(); } }
  function saveMeta() { localStorage.setItem(profileMetaKey, JSON.stringify(meta)); }
  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function clamp(value, min = 0, max = 100) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function byId(collection, id) { return collection.find(item => item.id === id); }
  function uniquePush(list, value) { if (!list.includes(value)) list.push(value); }
  function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }
  function esc(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function dataText(item, field) { const key = item && item[`${field}Key`]; if (key) return I18N.t(key); return item?.[field] ?? ''; }
  function profileDisplayName(profile) { return profile?.defaultGenerated ? I18N.t('profile.defaultName') : profile?.name; }
  function weatherText(value) { return I18N.t(`weather.${value}`, {}) === `weather.${value}` ? value : I18N.t(`weather.${value}`); }
  function categoryText(value) { const key=`event.category.${value}`; return I18N.has(key) ? I18N.t(key) : (I18N.getLocale()==='es' ? value : I18N.t('ui.common.eventCategory')); }
  function runtimeText(text) { return I18N.getLocale()==='es' ? text : (I18N.getLocale()==='ko' ? '행동이 기록되었습니다.' : 'Action recorded.'); }

  function scenarioUnlocked(scenario) { return !scenario.locked || meta.scenariosUnlocked.includes(scenario.id) || meta.unlocksPurchased.includes(scenario.unlockId); }
  function operatorUnlocked(operator) { return !operator.locked || meta.operatorsUnlocked.includes(operator.id) || meta.unlocksPurchased.includes(operator.unlockId); }

  function selectObjectives() {
    return [...D.objectives].sort(() => Math.random() - .5).slice(0, 3).map(objective => objective.id);
  }

  function migrateLegacyRun(legacy) {
    if (!legacy || legacy.complete || typeof legacy.day !== 'number') return null;
    const migrated = createRun({ scenario:'winter', operator:'elena', difficulty:'normal', mutators:[] });
    migrated.day = clamp(legacy.day, 1, migrated.maxDays);
    migrated.time = legacy.time || migrated.time;
    migrated.signalKnowledge = clamp((legacy.signal || 0) * 8);
    for (const key of Object.keys(migrated.station)) if (Number.isFinite(legacy[key])) migrated.station[key] = legacy[key];
    for (const key of Object.keys(migrated.operator)) if (Number.isFinite(legacy[key])) migrated.operator[key] = legacy[key];
    migrated.flags = { ...(legacy.flags || {}), legacy_run: true };
    migrated.usedEvents = Array.isArray(legacy.used) ? [...legacy.used] : [];
    migrated.history = Array.isArray(legacy.history) ? [...legacy.history, 'Partida migrada desde Prototype 0.2.'] : ['Partida migrada desde Prototype 0.2.'];
    return migrated;
  }

  function createRun(config) {
    const scenario = byId(D.scenarios, config.scenario);
    const operator = byId(D.operators, config.operator);
    const difficulty = byId(D.difficulties, config.difficulty);
    const resourceScale = (difficulty.resources || 1) * (config.mutators.includes('scarcity') ? .75 : 1);
    const resources = Object.fromEntries(Object.entries(scenario.start.resources).map(([key, value]) => [key, Math.max(0, Math.round(value * resourceScale))]));
    return {
      version: 1, startedAt: new Date().toISOString(), complete: false,
      scenario: scenario.id, operatorId: operator.id, difficulty: difficulty.id, mutators: config.mutators,
      day: 1, maxDays: scenario.days, time: '06:40', actionsRemaining: difficulty.actions,
      station: { ...scenario.start.station }, operator: { ...operator.start }, resources,
      signalKnowledge: 0, flags: Object.fromEntries((scenario.startFlags || []).map(flag => [flag, true])),
      chainStages: {}, usedEvents: [], eventCooldowns: {}, currentEventId: null, eventResolved: false,
      history: [{key:'ui.log.started', vars:{day:1, operator:dataText(operator,'name')}}], counters: {}, loreFound: [], newEvents: [],
      objectives: selectObjectives(), objectiveResults: [], ending: null, endingCategory: null
    };
  }

  function startRun(config) {
    if (run && !run.complete && !confirm(I18N.t('ui.common.replaceRun'))) return false;
    run = createRun(config);
    currentEvent = pickEvent();
    run.currentEventId = currentEvent.id;
    discoverEvent(currentEvent.id);
    saveRun();
    closeDialog('newGameDialog');
    hideMenu();
    render();
    if (ONBOARDING.shouldShowBriefing(meta.onboarding)) openBriefing(true);
    else if (ONBOARDING.shouldResumeTutorial(meta.onboarding)) startTutorial();
    return true;
  }

  function currentScenario() { return byId(D.scenarios, run.scenario); }
  function currentOperator() { return byId(D.operators, run.operatorId); }
  function currentDifficulty() { return byId(D.difficulties, run.difficulty); }

  function requirementMet(requirements = {}) {
    for (const [scope, values] of Object.entries(requirements)) {
      if (scope === 'flags' && !values.every(flag => run.flags[flag])) return false;
      if (scope === 'signalKnowledge' && run.signalKnowledge < values) return false;
      if (scope === 'resources' || scope === 'station' || scope === 'operator') {
        if (Object.entries(values).some(([key, value]) => run[scope][key] < value)) return false;
      }
    }
    return true;
  }

  function eventEligible(event) {
    if (run.day < event.minDay || run.day > event.maxDay) return false;
    if (event.scenario && !event.scenario.includes(run.scenario)) return false;
    if (event.flagsRequired && event.flagsRequired.some(flag => !run.flags[flag])) return false;
    if (event.flagsBlocked && event.flagsBlocked.some(flag => run.flags[flag])) return false;
    if (event.oncePerRun && run.usedEvents.includes(event.id)) return false;
    if (event.cooldown && run.day - (run.eventCooldowns[event.id] || -99) < event.cooldown) return false;
    if (event.chain && (run.chainStages[event.chain.id] || 0) !== event.chain.stage - 1) return false;
    return true;
  }

  function eventWeight(event) {
    let weight = event.weight || 10;
    if (run.mutators.includes('constant_storm') && event.category === 'clima') weight *= 2;
    if (run.mutators.includes('paranoia') && event.category === 'psicológico') weight *= 2;
    if (run.scenario === 'orbit' && ['comunicaciones','señal'].includes(event.category)) weight *= 1.5;
    return weight;
  }

  function weightedPick(events) {
    const total = events.reduce((sum, event) => sum + eventWeight(event), 0);
    let cursor = Math.random() * total;
    for (const event of events) { cursor -= eventWeight(event); if (cursor <= 0) return event; }
    return events[events.length - 1];
  }

  function pickEvent() {
    if (run.day > run.maxDays) return finalEvent();
    const available = D.events.filter(eventEligible);
    if (available.length) return weightedPick(available);
    return D.events.find(event => !run.usedEvents.includes(event.id)) || D.events[0];
  }

  function finalEvent() {
    const choices = [
      { titleKey:'ui.game.finalWait', descKey:'ui.game.finalWaitDesc', hintKey:'ui.game.finalWaitHint', endingResolver: () => Object.values(run.station).every(v => v >= 60) ? 'station_kept' : 'evacuation' },
      { titleKey:'ui.game.finalContact', descKey:'ui.game.finalContactDesc', hintKey:'ui.game.finalContactHint', ending:'contact', requirements:{signalKnowledge:55,station:{comms:35}} },
      { titleKey:'ui.game.finalIce', descKey:'ui.game.finalIceDesc', hintKey:'ui.game.finalIceHint', ending:'under_ice', requirements:{flags:['under_ice_ready']} },
      { titleKey:'ui.game.finalArchive', descKey:'ui.game.finalArchiveDesc', hintKey:'ui.game.finalArchiveHint', ending:'broadcast', requirements:{signalKnowledge:40,station:{comms:50}} },
      { titleKey:'ui.game.finalFuture', descKey:'ui.game.finalFutureDesc', hintKey:'ui.game.finalFutureHint', ending:'something_answered', requirements:{flags:['something_answered']} }
    ];
    return { id:'final_shift', category:'misterio', titleKey:'ui.game.finalTitle', textKey:'ui.game.finalText', weather:'AMANECER · VIENTO CALMO', choices };
  }

  function applyDelta(target, changes, multiplier = 1) {
    if (!changes) return;
    for (const [key, value] of Object.entries(changes)) target[key] = (target[key] || 0) + value * (value > 0 ? multiplier : 1);
  }

  function applyEffects(effects = {}, category = '') {
    const operator = currentOperator();
    const scenario = currentScenario();
    applyDelta(run.station, effects.station);
    if (effects.operator) {
      const adjusted = { ...effects.operator };
      if (adjusted.stress > 0) adjusted.stress *= (operator.effects.stressGain || 1) * (scenario.modifiers.stressGain || 1) * (run.mutators.includes('paranoia') ? 1.3 : 1) * (category === 'señal' ? operator.effects.signalStress || 1 : 1);
      applyDelta(run.operator, adjusted);
    }
    applyDelta(run.resources, effects.resources);
    if (effects.signalKnowledge) {
      let gain = effects.signalKnowledge * (operator.effects.signalGain || 1) * (scenario.modifiers.signalGain || 1);
      if (run.mutators.includes('interference')) gain *= .75;
      run.signalKnowledge += gain;
    }
  }

  function normalizeRun() {
    run.deferredConsequences = Array.isArray(run.deferredConsequences) ? run.deferredConsequences : [];
    run.storyThreads = run.storyThreads && typeof run.storyThreads === 'object' ? run.storyThreads : {};
    for (const key of Object.keys(run.station)) run.station[key] = clamp(run.station[key]);
    for (const key of Object.keys(run.operator)) run.operator[key] = clamp(run.operator[key]);
    for (const key of Object.keys(run.resources)) run.resources[key] = Math.max(0, Math.round(run.resources[key]));
    run.signalKnowledge = clamp(run.signalKnowledge);
  }

  function discoverEvent(id) {
    if (!meta.eventsDiscovered.includes(id)) { meta.eventsDiscovered.push(id); uniquePush(run.newEvents, id); saveMeta(); }
  }

  function discoverLore(id) {
    if (!id) return;
    uniquePush(run.loreFound, id);
    uniquePush(meta.loreDiscovered, id);
    saveMeta();
  }

  function chooseEvent(choice) {
    if (!requirementMet(choice.requirements)) return;
    if (choice.ending || choice.endingResolver) { finishRun(choice.ending || choice.endingResolver()); return; }
    applyEffects(choice.effects, currentEvent.category);
    for (const consequence of choice.deferred || []) run.deferredConsequences.push({ id:consequence.id, dueDay:run.day + Math.max(1,consequence.days||1), effects:consequence.effects||{}, flagsAdd:consequence.flagsAdd||[] });
    if (choice.thread) run.storyThreads[choice.thread.id] = choice.thread.stage;
    for (const flag of choice.flagsAdd || []) run.flags[flag] = true;
    if (choice.chain) run.chainStages[choice.chain.id] = choice.chain.stage;
    for (const [key, value] of Object.entries(choice.counters || {})) run.counters[key] = (run.counters[key] || 0) + value;
    discoverLore(choice.lore);
    run.usedEvents.push(currentEvent.id);
    run.eventCooldowns[currentEvent.id] = run.day;
    run.history.push({key:'ui.log.choice', vars:{day:run.day, choice:dataText(choice,'title')}});
    run.eventResolved = true;
    normalizeRun();
    const failure = checkFailure();
    if (failure) finishRun(failure); else { saveRun(); render(); }
  }

  const ACTIONS = [
    { id:'repair', name:'Reparar sistema crítico', hint:'Repuestos −1 · sistema más bajo +10–16', available:r=>r.resources.spareParts>=1, perform:r=>{ const key=STATION_STATS.map(x=>x[0]).sort((a,b)=>r.station[a]-r.station[b])[0]; let amount=12*(currentOperator().effects.repair||1); if(key==='comms') amount*=currentOperator().effects.commsRepair||1; r.resources.spareParts--; r.station[key]+=amount; r.operator.fatigue+=5; r.counters.repairs=(r.counters.repairs||0)+1; return `Reparaste ${STATION_STATS.find(x=>x[0]===key)[1].toLowerCase()}.`; } },
    { id:'eat', name:'Comer', hint:'Raciones −1 · hambre −28', available:r=>r.resources.food>=1&&r.operator.hunger>0, perform:r=>{r.resources.food--;r.operator.hunger-=28;return 'Comiste una ración caliente.';} },
    { id:'drink', name:'Beber', hint:'Agua −1 · sed −32', available:r=>r.resources.waterReserve>=1&&r.operator.thirst>0, perform:r=>{r.resources.waterReserve--;r.operator.thirst-=32;return 'Usaste una reserva de agua.';} },
    { id:'sleep', name:'Dormir', hint:'fatiga −27 · estrés −4', available:r=>r.operator.fatigue>0||r.operator.stress>0, perform:r=>{r.operator.fatigue-=27;r.operator.stress-=4;r.counters.sleep=(r.counters.sleep||0)+1;return 'Dormiste durante parte del turno.';} },
    { id:'explore', name:'Explorar exterior', hint:'riesgo físico · recursos posibles', available:r=>!r.flags.main_exit_closed, perform:r=>{const gain=randomItem([{food:2},{fuel:6},{spareParts:1},{batteries:2}]);applyDelta(r.resources,gain);r.operator.fatigue+=9*(currentOperator().effects.outsideFatigue||1);r.operator.thirst+=5;r.counters.explore=(r.counters.explore||0)+1;return `Exploraste el perímetro y recuperaste ${Object.values(gain)[0]} unidad(es).`;} },
    { id:'logs', name:'Revisar registros', hint:'señal +2–4 · fatiga +3', perform:r=>{r.signalKnowledge+=3*(currentOperator().effects.signalGain||1);r.operator.fatigue+=3;return 'Comparaste registros históricos.';} },
    { id:'antenna', name:'Ajustar antena', hint:'baterías −1 · comunicaciones +8 · señal +3', available:r=>r.resources.batteries>=1, perform:r=>{r.resources.batteries--;r.station.comms+=8*(currentOperator().effects.commsRepair||1);r.signalKnowledge+=3*(currentOperator().effects.signalGain||1);r.counters.transmissions=(r.counters.transmissions||0)+1;return 'Ajustaste la antena principal.';} },
    { id:'maintenance', name:'Mantenimiento general', hint:'repuestos −1 · todos los sistemas +2–4', available:r=>r.resources.spareParts>=1, perform:r=>{r.resources.spareParts--;for(const key of Object.keys(r.station))r.station[key]+=3*(currentOperator().effects.repair||1);r.operator.fatigue+=6;r.counters.repairs=(r.counters.repairs||0)+1;return 'Realizaste mantenimiento preventivo.';} },
    { id:'investigate', name:'Investigar señal', hint:'potencia −4 · señal +5–8 · estrés +3', available:r=>r.station.power>=5, perform:r=>{r.station.power-=4;r.signalKnowledge+=6*(currentOperator().effects.signalGain||1)*(r.mutators.includes('interference')?.75:1);r.operator.stress+=3*(currentOperator().effects.stressGain||1);r.counters.transmissions=(r.counters.transmissions||0)+1;return 'Aislaste otro patrón de 14.827.';} },
    { id:'craft', name:'Fabricar pieza', hint:'baterías −1 · combustible −2 · repuestos +1', available:r=>r.resources.batteries>=1&&r.resources.fuel>=2, perform:r=>{r.resources.batteries--;r.resources.fuel-=2;r.resources.spareParts++;r.operator.fatigue+=5;return 'Fabricaste un repuesto compatible.';} },
    { id:'rest', name:'Descansar', hint:'fatiga −12 · estrés −7', available:r=>r.operator.fatigue>0||r.operator.stress>0, perform:r=>{r.operator.fatigue-=12;r.operator.stress-=7;return 'Te apartaste de las consolas un momento.';} },
    { id:'treat', name:'Tratar lesión', hint:'medicina −1 · salud +20', available:r=>r.resources.medicalSupplies>=1&&r.operator.health<95, perform:r=>{r.resources.medicalSupplies--;r.operator.health+=20;r.counters.meds=(r.counters.meds||0)+1;return 'Usaste el equipo médico de campaña.';} }
  ];

  function performAction(action) {
    if (run.actionsRemaining <= 0 || (action.available && !action.available(run))) return;
    const message = action.perform(run);
    run.actionsRemaining--;
    run.history.push({key:'ui.log.action', vars:{day:run.day, action:runtimeText(message)}});
    normalizeRun();
    const failure = checkFailure();
    if (failure) finishRun(failure); else { saveRun(); render(); }
  }

  function applyDailyUpkeep() {
    const difficulty = currentDifficulty();
    const scenario = currentScenario();
    let wear = difficulty.wear * (scenario.modifiers.eventDanger || 1);
    if (run.mutators.includes('constant_storm')) wear *= 1.25;
    const heatWear = wear * (scenario.modifiers.heatWear || 1) * (run.mutators.includes('extreme_temp') ? 1.5 : 1);
    run.resources.fuel -= 3;
    run.resources.waterReserve -= 1;
    run.station.integrity -= 3 * wear;
    run.station.comms -= 2.5 * wear;
    run.station.water -= 2 * wear;
    run.station.heat -= 3 * heatWear;
    if (run.resources.fuel <= 0) { run.station.power -= 10 * wear; run.station.heat -= 7 * heatWear; }
    else run.station.power -= 3 * wear;
    const needs = difficulty.needs;
    run.operator.hunger += 11 * needs * (currentOperator().effects.hungerGain || 1);
    run.operator.thirst += 12 * needs;
    run.operator.fatigue += 9 * needs;
    run.operator.stress += 3 * needs * (currentOperator().effects.stressGain || 1);
    if (run.resources.waterReserve <= 0) run.operator.thirst += 8;
    if (run.station.heat < 35) { run.operator.health -= 6; run.operator.fatigue += 5; }
    if (run.operator.hunger > 72) run.operator.health -= 5;
    if (run.operator.thirst > 75) run.operator.health -= 9;
    if (run.operator.fatigue > 82) { run.operator.health -= 3; run.operator.stress += 6; }
    if (run.operator.stress > 88) run.operator.health -= 4;
  }

  function endDay() {
    if (!run.eventResolved) return;
    applyDailyUpkeep();
    normalizeRun();
    const failure = checkFailure();
    if (failure) { finishRun(failure); return; }
    run.day++;
    resolveDeferredConsequences();
    const deferredFailure=checkFailure();
    if(deferredFailure){finishRun(deferredFailure);return;}
    const difficulty = currentDifficulty();
    run.actionsRemaining = difficulty.id === 'extreme' && run.day % 3 === 0 ? difficulty.severeActions : difficulty.actions;
    run.time = run.day % 3 === 0 ? '21:30' : run.day % 2 === 0 ? '14:10' : '07:20';
    run.eventResolved = false;
    currentEvent = pickEvent();
    run.currentEventId = currentEvent.id;
    discoverEvent(currentEvent.id);
    saveRun();
    render();
  }

  function checkFailure() {
    if (run.operator.health <= 4) return 'medical';
    if (run.station.heat <= 3 && run.station.power <= 10) return 'freeze';
    if (run.resources.waterReserve <= 0 && run.operator.thirst >= 96) return 'dehydration';
    if (run.operator.stress >= 100) return 'breakdown';
    return null;
  }

  function calculateObjectives() {
    return run.objectives.map(id => byId(D.objectives, id).test(run));
  }

  function finishRun(endingId) {
    if (run.complete) return;
    const ending = byId(D.endings, endingId) || byId(D.endings, 'evacuation');
    normalizeRun();
    run.complete = true;
    run.ending = ending.id;
    run.endingCategory = categoryText(ending.category);
    run.objectiveResults = calculateObjectives();
    const newEnding = !meta.endingsFound.includes(ending.id);
    uniquePush(meta.endingsFound, ending.id);
    meta.runsCompleted++;
    meta.totalDaysSurvived += Math.min(run.day, run.maxDays);
    meta.bestRun = Math.max(meta.bestRun, Math.min(run.day, run.maxDays));
    const difficulty = currentDifficulty();
    const mutatorBonus = run.mutators.reduce((sum, id) => sum + (byId(D.mutators, id)?.reward || 0), 0);
    const baseData = Math.min(run.day, run.maxDays) * 2 + run.objectiveResults.filter(Boolean).length * 20 + run.newEvents.length + run.loreFound.length * 5 + (newEnding ? 30 : 0);
    const dataEarned = Math.round(baseData * difficulty.reward * (1 + mutatorBonus));
    meta.data += dataEarned;
    const history = { operator:currentOperator().name, operatorId:currentOperator().id, scenario:currentScenario().name, scenarioId:currentScenario().id, days:Math.min(run.day,run.maxDays), ending:dataText(ending,'title'), endingId:ending.id, objectives:run.objectiveResults.filter(Boolean).length, difficulty:difficulty.name, difficultyId:difficulty.id, data:dataEarned, date:new Date().toISOString() };
    meta.runHistory.unshift(history);
    meta.runHistory = meta.runHistory.slice(0,20);
    for (const achievement of D.achievements) if (!meta.achievements.includes(achievement.id) && achievement.test(run,meta)) meta.achievements.push(achievement.id);
    saveRun(); saveMeta();
    $('endingCategory').textContent = dataText(ending,'category') || categoryText(ending.category);
    $('endingTitle').textContent = dataText(ending,'title');
    $('endingText').textContent = dataText(ending,'text');
    $('endingStats').innerHTML = `<span>${I18N.t('ui.common.day')} ${Math.min(run.day,run.maxDays)} / ${run.maxDays}</span><span>${I18N.t('ui.common.signal')} ${Math.round(run.signalKnowledge)}%</span><span>${I18N.t('ui.common.health')} ${Math.round(run.operator.health)}</span><span>${I18N.t('ui.common.station')} ${Math.round(average(Object.values(run.station)))}</span><span>${I18N.t('ui.common.objectives')} ${run.objectiveResults.filter(Boolean).length}/3</span><span>${dataText(difficulty,'name')}</span>`;
    $('rewardSummary').innerHTML = `<strong>+${dataEarned} DATA</strong><span>${I18N.t(newEnding ? 'ui.ending.new' : 'ui.ending.known')}</span>`;
    $('endingDialog').showModal();
  }

  function statusText(value, metric) { return I18N.t(`ui.state.${metricState(value,metric)}`); }

  function resolveDeferredConsequences() {
    const pending=run.deferredConsequences||[];
    const due=pending.filter(item=>item.dueDay<=run.day);
    run.deferredConsequences=pending.filter(item=>item.dueDay>run.day);
    for(const item of due){applyEffects(item.effects);for(const flag of item.flagsAdd||[])run.flags[flag]=true;run.history.push({key:'ui.log.deferred',vars:{day:run.day}});}
    if(due.length) normalizeRun();
  }

  function meter(key, label, inverted, scope) {
    const value = clamp(run[scope][key]);
    const metric=METRICS[key], state=metricState(value,metric);
    const severity = state==='critical'?'bad':state==='low'?'warn':'good';
    const row = document.createElement('div');
    row.className = 'meter-row';
    row.innerHTML = `<div class="meter-head"><span class="meter-label">${I18N.t(label)}</span><strong>${Math.round(value)}</strong></div><div class="meter"><div class="meter-fill ${severity}" style="width:${value}%"></div></div><span class="meter-state ${severity}">${statusText(value,metric)}</span>`;
    return row;
  }

  function renderMeters() {
    $('stationStats').replaceChildren(...STATION_STATS.map(([key,label]) => meter(key,label,false,'station')));
    $('operatorStats').replaceChildren(...OPERATOR_STATS.map(([key,label,inverted]) => meter(key,label,inverted,'operator')));
    const stationAverage = average(Object.values(run.station));
    const risk = average([100-run.operator.health,run.operator.hunger,run.operator.thirst,run.operator.fatigue,run.operator.stress]);
    const stationState=metricState(stationAverage,{higher:true,low:45,critical:25});
    setStatus($('stationStatus'), stationState==='normal'?I18N.t('ui.common.stable'):stationState==='low'?I18N.t('ui.common.degraded'):I18N.t('ui.common.critical'), stationState);
    const operatorState=metricState(risk,{higher:false,low:35,critical:60});
    setStatus($('operatorStatus'), operatorState==='normal'?I18N.t('ui.common.functional'):operatorState==='low'?I18N.t('ui.common.demanding'):I18N.t('ui.common.critical'), operatorState);
  }

  function setStatus(element, text, state) {
    element.textContent = text;
    element.className = `status-pill ${state==='critical'?'bad':state==='low'?'warn':'good'}`;
  }

  function average(values) { return values.reduce((a,b)=>a+b,0)/values.length; }

  function renderResources() {
    $('resources').replaceChildren(...RESOURCE_META.map(([key,label]) => {
      const item = document.createElement('div');
      const metric=METRICS[key],state=metricState(run.resources[key],metric);
      item.className = `resource ${state!=='normal'?'low':''} ${state}`;
      item.innerHTML = `<span>${metric.icon} ${I18N.t(label)}${state!=='normal'?` · ${I18N.t(`ui.state.${state}`)}`:''}</span><strong>${Math.max(0,Math.round(run.resources[key]))}</strong>`;
      return item;
    }));
  }

  function renderObjectives() {
    const objectiveKey = currentScenario().id === 'red' ? 'onboarding.macro.red' : currentScenario().id === 'orbit' ? 'onboarding.macro.orbit' : 'onboarding.macro.default';
    $('macroObjective').textContent = I18N.t(objectiveKey);
    $('objectives').replaceChildren(...run.objectives.map(id => {
      const objective = byId(D.objectives,id);
      const complete = objective.test(run);
      const item = document.createElement('div');
      item.className = `objective ${complete ? 'complete' : ''}`;
      item.innerHTML = `<span>${complete?'✓':'○'}</span><p>${esc(dataText(objective,'text'))}</p>`;
      return item;
    }));
  }

  function renderActions() {
    $('actionsCounter').textContent = I18N.plural(run.actionsRemaining,{one:'ui.actions.remainingOne',other:'ui.actions.remaining'});
    const quick=$('operatorQuickStatus');
    quick.replaceChildren(...[['health',run.operator.health],['hunger',run.operator.hunger],['thirst',run.operator.thirst],['fatigue',run.operator.fatigue],['stress',run.operator.stress]].map(([key,value])=>{const metric=METRICS[key],state=metricState(value,metric),chip=document.createElement('span');chip.className=`context-chip ${state}`;chip.innerHTML=`${metric.icon} ${esc(I18N.t(metric.label))} <strong>${Math.round(value)}</strong> ${state!=='normal'?`<b>${esc(I18N.t(`ui.state.${state}`))}</b>`:''}`;return chip;}));
    $('dailyActions').replaceChildren(...ACTIONS.map(action => {
      const button = document.createElement('button');
      const available = run.actionsRemaining > 0 && (!action.available || action.available(run));
      button.className = 'daily-action'; button.disabled = !available; button.dataset.action = action.id;
      const effects=actionPreview(action,run);
      const relevant=(action.id==='eat'&&run.operator.hunger>=50)||(action.id==='drink'&&run.operator.thirst>=50)||(action.id==='sleep'&&run.operator.fatigue>=55)||(action.id==='treat'&&run.operator.health<65);
      button.classList.toggle('relevant',relevant);
      const actionIcons={repair:'🔧',eat:'🍖',drink:'💧',sleep:'😴',explore:'🥾',logs:'▤',antenna:'📡',maintenance:'🛠',investigate:'∿',craft:'⚙',rest:'☕',treat:'🩹'};
      const uncertainty=action.id==='explore'?`<span class="preview-line delta-neutral">${esc(I18N.t('ui.preview.outcomeUncertain'))}</span>`:'';
      button.innerHTML = `<strong><span aria-hidden="true">${actionIcons[action.id]}</span> ${esc(I18N.t(`action.${action.id}.name`))}</strong><span class="action-preview">${renderPreview(effects,run)}${uncertainty}</span>`;
      button.onclick = () => performAction(action);
      return button;
    }));
  }

  function contextHint() {
    const warnings = [];
    if(metricState(run.station.power,METRICS.power)!=='normal')warnings.push(I18N.t('ui.warning.lowPower')); if(metricState(run.station.heat,METRICS.heat)!=='normal')warnings.push(I18N.t('ui.warning.unstableHeat'));
    if(metricState(run.resources.fuel,METRICS.fuel)!=='normal')warnings.push(I18N.t('ui.warning.lowFuel')); if(metricState(run.resources.waterReserve,METRICS.waterReserve)!=='normal')warnings.push(I18N.t('ui.warning.lowWater'));
    if(metricState(run.operator.thirst,METRICS.thirst)!=='normal')warnings.push(I18N.t('ui.warning.dehydration')); if(metricState(run.operator.hunger,METRICS.hunger)!=='normal')warnings.push(I18N.t('ui.warning.severeHunger'));
    if(metricState(run.operator.fatigue,METRICS.fatigue)!=='normal')warnings.push(I18N.t('ui.warning.extremeFatigue')); if(metricState(run.operator.stress,METRICS.stress)!=='normal')warnings.push(I18N.t('ui.warning.extremeStress'));
    return warnings.length ? I18N.t('ui.context.warning',{items:warnings.join(' · ')}) : I18N.t('ui.context.clear');
  }

  function renderEvent() {
    $('chapterLabel').textContent = run.day > run.maxDays ? I18N.t('ui.game.close') : I18N.t('ui.game.dayLabel',{day:run.day,time:run.time});
    $('weatherLabel').textContent = weatherText(currentEvent.weather || currentScenario().weather);
    $('weatherCaption').textContent = weatherText(currentEvent.weather || currentScenario().weather);
    $('eventCategory').textContent = categoryText(currentEvent.category || 'evento').toUpperCase();
    $('eventRarity').textContent = currentEvent.chain ? I18N.t('ui.game.chain',{stage:currentEvent.chain.stage}) : '';
    $('eventTitle').textContent = dataText(currentEvent,'title');
    $('eventText').textContent = dataText(currentEvent,'text');
    $('contextLine').textContent = contextHint();
    const relevant=[...new Set((currentEvent.choices||[]).flatMap(choice=>Object.keys(choice.effects?.station||{})))];
    $('eventSystems').replaceChildren(...(relevant.length?[Object.assign(document.createElement('strong'),{className:'context-summary-title',textContent:I18N.t('ui.event.relevantSystems')}),...relevant.map(key=>{const metric=METRICS[key],value=run.station[key],state=metricState(value,metric),chip=document.createElement('span');chip.className=`context-chip ${state}`;chip.innerHTML=`${metric.icon} ${esc(I18N.t(metric.label))} <strong>${Math.round(value)}</strong> · ${esc(I18N.t(`ui.state.${state}`))}`;return chip;})]:[]));
    if (run.eventResolved) {
      $('choices').innerHTML = `<div class="resolved-event">${I18N.t('ui.game.resolved')}</div>`;
      $('endDayBtn').hidden = false;
    } else {
      $('choices').replaceChildren(...currentEvent.choices.map(choice => {
        const enabled = requirementMet(choice.requirements);
        const button = document.createElement('button');
        button.className = 'choice'; button.disabled = !enabled;
        button.innerHTML = `<div><strong>${esc(dataText(choice,'title'))}</strong><span>${esc(dataText(choice,'desc'))}</span></div><em class="choice-impact">${esc(enabled ? '' : I18N.t('ui.common.requirements'))}</em>`;
        if(enabled) button.querySelector('.choice-impact').innerHTML=eventImpact(choice);
        button.onclick = () => chooseEvent(choice);
        return button;
      }));
      $('endDayBtn').hidden = true;
    }
  }

  function renderLog() {
    $('log').replaceChildren(...run.history.slice().reverse().map(text => {
      const entry = document.createElement('div'); entry.className = 'log-entry'; entry.textContent = typeof text === 'string' ? (I18N.getLocale()==='es' ? text : I18N.t('ui.log.legacy')) : I18N.t(text.key,text.vars); return entry;
    }));
  }

  function renderIntel() {
    $('intelText').textContent = run.signalKnowledge < 20 ? I18N.t('ui.game.intel1') : run.signalKnowledge < 50 ? I18N.t('ui.game.intel2') : run.signalKnowledge < 80 ? I18N.t('ui.game.intel3') : I18N.t('ui.game.intel4');
    const flags = Object.keys(run.flags).filter(key => run.flags[key]);
    $('flagsList').replaceChildren(...(flags.length ? flags.map(flag => { const span=document.createElement('span');span.className='flag';span.textContent=flag.replaceAll('_',' ');return span; }) : [Object.assign(document.createElement('span'),{className:'flag',textContent:I18N.t('ui.common.noFindings')})]));
  }

  function render() {
    if (!run) return;
    normalizeRun();
    $('dayValue').textContent = `${Math.min(run.day,run.maxDays)} / ${run.maxDays}`;
    $('timeValue').textContent = run.time;
    $('actionsValue').textContent = `${run.actionsRemaining} / ${currentDifficulty().actions}`;
    $('signalValue').textContent = `${Math.round(run.signalKnowledge)}%`;
    const scenario = currentScenario();
    const operator = currentOperator();
    const difficulty = currentDifficulty();
    const scenarioName = dataText(scenario,'name');
    const operatorName = dataText(operator,'name');
    const difficultyName = dataText(difficulty,'name');
    $('runContext').textContent = `${scenarioName} · ${difficultyName}`;
    $('sceneCaption').textContent = `${I18N.t('ui.common.station')} K-27 · ${scenarioName}`;
    $('operatorKicker').textContent = `${I18N.t('ui.common.operator')} · ${operatorName.toUpperCase()}`;
    $('traitSummary').innerHTML = `<span>＋ ${esc(dataText(operator,'positive'))}</span><span>− ${esc(dataText(operator,'negative'))}</span>`;
    renderMeters(); renderResources(); renderObjectives(); renderActions(); renderEvent(); renderLog(); renderIntel();
    renderTutorial();
    saveRun();
  }

  function formatProfileDate(isoDate) {
    if (!isoDate) return I18N.t('ui.profile.never');
    const locale = I18N.getLocale() === 'es' ? 'es-AR' : I18N.getLocale();
    return I18N.t('ui.profile.lastPlayed', { date: new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(isoDate)) });
  }

  function updateLocalizedUi() {
    I18N.applyStatic(document);
    const text = {
      archiveBtn:'ui.menu.archive', settingsBtn:'ui.menu.settings', menuBtn:'ui.menu.menu',
      continueBtn:'ui.menu.continue', newGameBtn:'ui.menu.newGame', menuArchiveBtn:'ui.menu.archive', menuSettingsBtn:'ui.menu.settings',
      menuHelpBtn:'onboarding.help', helpBtn:'onboarding.help', changeProfileBtn:'ui.profile.change', createProfileBtn:'ui.profile.create'
    };
    Object.entries(text).forEach(([id,key])=>{ const node=$(id); if(node) node.textContent=I18N.t(key); });
    const select=$('languageSelect'); if(select) select.value=I18N.getLocale();
    const labels={stationStatus:'ui.common.stable',operatorStatus:'ui.common.functional'};
    Object.entries(labels).forEach(([id,key])=>{const node=$(id);if(node)node.textContent=I18N.t(key);});
    const scale=$('textScale'); if(scale){ scale.options[0].text=I18N.t('ui.settings.normal'); scale.options[1].text=I18N.t('ui.settings.large'); scale.options[2].text=I18N.t('ui.settings.veryLarge'); }
    if (!run) { $('chapterLabel').textContent=I18N.t('ui.game.dayLabel',{day:1,time:'06:40'}); $('actionsCounter').textContent=I18N.plural(3,{one:'ui.actions.remainingOne',other:'ui.actions.remaining'}); }
    if (run && !run.complete) render(); else showMenu();
  }

  const BRIEFING_STEPS = ['location','signal','loop','objective'];
  const TOUR_STEPS = ['event','station','operator','resources','actions','investigate','closeDay'];
  let briefingIndex = 0, briefingAutomatic = false, tutorialVisible = false, tutorialManual = false, manualTutorialStep = 0;
  function openBriefing(automatic = false) {
    briefingAutomatic = automatic; briefingIndex = 0;
    renderBriefing();
    if (!$('briefingDialog').open) $('briefingDialog').showModal();
  }
  function renderBriefing() {
    const key = BRIEFING_STEPS[briefingIndex];
    $('briefingTitle').textContent = I18N.t(`onboarding.briefing.${key}.title`);
    $('briefingText').textContent = I18N.t(`onboarding.briefing.${key}.text`);
    $('briefingProgress').textContent = I18N.t('onboarding.progress',{current:briefingIndex+1,total:BRIEFING_STEPS.length});
    $('briefingBack').disabled = briefingIndex === 0;
    $('briefingSkip').hidden = !briefingAutomatic;
    $('briefingTour').hidden = briefingAutomatic || !run || run.complete;
    $('briefingNext').textContent = I18N.t(briefingIndex === BRIEFING_STEPS.length - 1 ? 'onboarding.begin' : 'onboarding.next');
  }
  function finishBriefing(skipped = false) {
    if (briefingAutomatic) { ONBOARDING.completeBriefing(meta.onboarding); saveMeta(); }
    $('briefingDialog').close();
    if (briefingAutomatic && run && !run.complete) startTutorial();
  }
  function startTutorial(manual = false) {
    if (!run || run.complete) return;
    tutorialVisible = true; tutorialManual = manual;
    if (manual) manualTutorialStep = 0;
    else { meta.onboarding.tutorialStep = Math.min(meta.onboarding.tutorialStep, TOUR_STEPS.length - 1); saveMeta(); }
    renderTutorial();
  }
  function renderTutorial() {
    const guide = $('tutorialGuide');
    document.querySelectorAll('.tutorial-target').forEach(node => node.classList.remove('tutorial-target'));
    if (!tutorialVisible || !run || run.complete || (!tutorialManual && meta.onboarding.tutorialComplete)) { guide.hidden = true; return; }
    const step = Math.min(tutorialManual ? manualTutorialStep : meta.onboarding.tutorialStep, TOUR_STEPS.length - 1), id = TOUR_STEPS[step];
    const selectors = {event:'#choices',station:'#stationStats',operator:'#operatorStats',resources:'#resources',actions:'#dailyActions',investigate:'[data-action="investigate"]',closeDay:'#endDayBtn'};
    const target = document.querySelector(selectors[id]);
    if (target) { target.classList.add('tutorial-target'); target.scrollIntoView({block:'center',behavior:settings.reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); }
    $('tutorialProgress').textContent = I18N.t('onboarding.tourProgress',{current:step+1,total:TOUR_STEPS.length});
    $('tutorialTitle').textContent = I18N.t(`onboarding.tour.${id}.title`);
    $('tutorialText').textContent = I18N.t(`onboarding.tour.${id}.text`);
    $('tutorialNext').textContent = I18N.t(step === TOUR_STEPS.length - 1 ? 'onboarding.tourFinish' : 'onboarding.tourNext');
    guide.hidden = false;
  }
  function advanceTutorial() {
    const step = tutorialManual ? manualTutorialStep : meta.onboarding.tutorialStep;
    if (step >= TOUR_STEPS.length - 1) {
      if (!tutorialManual) { ONBOARDING.completeTutorial(meta.onboarding); saveMeta(); }
      tutorialVisible = false; tutorialManual = false; renderTutorial(); return;
    }
    if (tutorialManual) manualTutorialStep++;
    else { ONBOARDING.setStep(meta.onboarding,step+1,TOUR_STEPS.length); saveMeta(); }
    renderTutorial();
  }
  function skipTutorial() { if(!tutorialManual){ONBOARDING.completeTutorial(meta.onboarding);saveMeta();} tutorialVisible = false; tutorialManual = false; renderTutorial(); }

  function openProfiles() {
    renderProfiles();
    $('profileDialog').showModal();
  }

  function renderProfiles() {
    $('profilesList').replaceChildren(...profileStore.profiles.map(profile => {
      const row = document.createElement('div');
      row.className = `profile-row ${profile.id === activeProfile.id ? 'active' : ''}`;
      const info = document.createElement('div');
      info.innerHTML = `<strong>${esc(profileDisplayName(profile))}</strong><small>${formatProfileDate(profile.lastPlayedAt)}</small>`;
      const select = document.createElement('button');
      select.className = 'profile-select'; select.type = 'button';
      select.textContent = profile.id === activeProfile.id ? I18N.t('ui.profile.activeButton') : I18N.t('ui.profile.select');
      select.disabled = profile.id === activeProfile.id;
      select.onclick = () => switchProfile(profile.id);
      const rename = document.createElement('button');
      rename.className = 'profile-action'; rename.type = 'button'; rename.textContent = I18N.t('ui.profile.rename');
      rename.onclick = () => renameProfile(profile.id);
      const remove = document.createElement('button');
      remove.className = 'profile-action profile-delete'; remove.type = 'button'; remove.textContent = I18N.t('ui.profile.delete');
      remove.disabled = profileStore.profiles.length === 1;
      remove.onclick = () => deleteProfile(profile.id);
      row.append(info, select, rename, remove);
      return row;
    }));
  }

  function switchProfile(profileId) {
    if (profileId === activeProfile.id) return;
    saveRun();
    const next = profileStore.profiles.find(profile => profile.id === profileId);
    if (!next) return;
    activeProfile = next;
    profileStore.selectedProfileId = next.id;
    saveProfiles();
    loadProfileState();
    tutorialVisible = false;
    closeDialog('profileDialog');
    showMenu();
  }

  function profileNameFromPrompt(current = '') {
    const raw = prompt(I18N.t(current ? 'ui.common.renameProfile' : 'ui.common.profileName'), current);
    if (raw === null) return null;
    const value = raw.trim();
    if (!value || value.length > 24) { if (value) alert(I18N.t('ui.common.invalidProfile')); return null; }
    return value;
  }

  function createLocalProfile() {
    if (profileStore.profiles.length >= 10) { alert(I18N.t('ui.common.maxProfiles')); return; }
    const name = profileNameFromPrompt();
    if (!name) return;
    const profile = createProfile(name);
    profileStore.profiles.push(profile);
    saveProfiles();
    switchProfile(profile.id);
  }

  function renameProfile(profileId) {
    const profile = profileStore.profiles.find(item => item.id === profileId);
    if (!profile) return;
    const name = profileNameFromPrompt(profile.name);
    if (!name) return;
    profile.name = name;
    saveProfiles();
    renderProfiles();
    showMenu();
  }

  function deleteProfile(profileId) {
    if (profileStore.profiles.length === 1) { alert(I18N.t('ui.common.lastProfile')); return; }
    const profile = profileStore.profiles.find(item => item.id === profileId);
    if (!profile || !confirm(I18N.t('ui.common.deleteProfile',{name:profile.name}))) return;
    localStorage.removeItem(profileKey('run', profileId));
    localStorage.removeItem(profileKey('meta', profileId));
    profileStore.profiles = profileStore.profiles.filter(item => item.id !== profileId);
    if (activeProfile.id === profileId) {
      activeProfile = profileStore.profiles[0];
      profileStore.selectedProfileId = activeProfile.id;
      loadProfileState();
    }
    saveProfiles();
    renderProfiles();
    showMenu();
  }

  function showMenu() {
    tutorialVisible = false; renderTutorial();
    $('mainMenu').classList.remove('hidden');
    const active = run && !run.complete;
    $('continueBtn').disabled = !active;
    $('continueBtn').textContent = active ? I18N.t('ui.menu.continueDay',{day:run.day}) : I18N.t('ui.menu.continue');
    $('metaSummary').innerHTML = `<span>${meta.data} DATA</span><span>${meta.runsCompleted} ${I18N.getLocale()==='ko'?'작전':I18N.getLocale()==='en'?'runs':'runs'}</span><span>${meta.endingsFound.length}/${D.endings.length} ${I18N.getLocale()==='ko'?'결말':I18N.getLocale()==='en'?'endings':'finales'}</span>`;
    $('activeProfileName').textContent = profileDisplayName(activeProfile);
    $('activeProfileMeta').textContent = `${formatProfileDate(activeProfile.lastPlayedAt)} · ${profileStore.profiles.length} ${I18N.getLocale()==='ko'?'프로필':I18N.getLocale()==='en'?'profile':'perfil'}${profileStore.profiles.length === 1 ? '' : 's'}`;
  }
  function hideMenu() { $('mainMenu').classList.add('hidden'); }

  function renderNewGame() {
    const radioCards = (items,name,isUnlocked) => items.map((item,index) => {
      const unlocked = isUnlocked(item);
      return `<label class="select-card ${unlocked?'':'locked'}"><input type="radio" name="${name}" value="${item.id}" ${unlocked&&index===items.findIndex(isUnlocked)?'checked':''} ${unlocked?'':'disabled'}><strong>${esc(dataText(item,'name'))}</strong><span>${esc(dataText(item,'description'))}</span>${unlocked?'':`<em>${I18N.t('ui.common.locked')}</em>`}</label>`;
    }).join('');
    $('scenarioOptions').innerHTML = radioCards(D.scenarios,'scenario',scenarioUnlocked);
    $('operatorOptions').innerHTML = radioCards(D.operators,'operator',operatorUnlocked);
    $('difficultyOptions').innerHTML = radioCards(D.difficulties,'difficulty',()=>true);
    const unlockedMutators = D.mutators.filter(mutator => meta.mutatorsUnlocked.includes(mutator.id));
    $('mutatorOptions').innerHTML = unlockedMutators.length ? unlockedMutators.map(mutator => `<label class="mutator-option"><input type="checkbox" name="mutator" value="${mutator.id}"><span><strong>${esc(dataText(mutator,'name'))}</strong><small>${esc(dataText(mutator,'description'))} · +${Math.round(mutator.reward*100)}% DATA</small></span></label>`).join('') : `<p class="empty-copy">${I18N.t('ui.newGame.noMutators')}</p>`;
    updateRunPreview();
    $('newGameDialog').showModal();
  }

  function updateRunPreview() {
    const form = new FormData($('newGameForm'));
    const scenario = byId(D.scenarios,form.get('scenario'));
    const operator = byId(D.operators,form.get('operator'));
    const difficulty = byId(D.difficulties,form.get('difficulty'));
    if (!scenario || !operator || !difficulty) return;
    const mutators = form.getAll('mutator');
    const bonus = mutators.reduce((sum,id)=>sum+(byId(D.mutators,id)?.reward||0),0);
      $('runPreview').innerHTML = `<span>${esc(dataText(scenario,'name'))}</span><span>${esc(dataText(operator,'name'))}</span><span>${esc(dataText(difficulty,'name'))}</span><strong>${difficulty.actions} ${I18N.t('ui.newGame.actionsPerDay')} · ×${(difficulty.reward*(1+bonus)).toFixed(2)} DATA</strong>`;
  }

  function openArchive() {
    $('archiveSummary').innerHTML = `<div><span>DATA</span><strong>${meta.data}</strong></div><div><span>RUNS</span><strong>${meta.runsCompleted}</strong></div><div><span>DÍAS</span><strong>${meta.totalDaysSurvived}</strong></div><div><span>EVENTOS</span><strong>${meta.eventsDiscovered.length}/${D.events.length}</strong></div>`;
    $('unlocksList').replaceChildren(...D.unlocks.map(unlock => {
      const purchased = meta.unlocksPurchased.includes(unlock.id);
      const button = document.createElement('button');
      button.className = 'unlock'; button.disabled = purchased || meta.data < unlock.cost;
      button.innerHTML = `<span><strong>${esc(dataText(unlock,'name'))}</strong><small>${esc(dataText(unlock,'description'))}</small></span><em>${purchased?I18N.t('ui.archive.acquired'):`${unlock.cost} DATA`}</em>`;
      button.onclick = () => purchaseUnlock(unlock);
      return button;
    }));
    $('endingsArchive').innerHTML = D.endings.map(ending => meta.endingsFound.includes(ending.id) ? `<div class="known"><strong>${esc(dataText(ending,'title'))}</strong><span>${categoryText(ending.category)}</span></div>` : `<div><strong>???</strong><span>${I18N.t('ui.common.unknownEnding')}</span></div>`).join('');
    $('achievementsArchive').innerHTML = D.achievements.map(a => meta.achievements.includes(a.id) ? `<div class="known"><strong>${esc(dataText(a,'name'))}</strong><span>${esc(dataText(a,'description'))}</span></div>` : `<div><strong>???</strong><span>${I18N.t('ui.common.unknownAchievement')}</span></div>`).join('');
    const loreIds = [...new Set(D.events.map(event => event.choices.map(choice => choice.lore)).flat().filter(Boolean))];
    $('loreArchive').innerHTML = loreIds.map(id => meta.loreDiscovered.includes(id) ? `<div class="known"><strong>${esc(id.replaceAll('_',' '))}</strong><span>${I18N.t('ui.common.recoveredFragment')}</span></div>` : `<div><strong>???</strong><span>${I18N.t('ui.common.unknownFragment')}</span></div>`).join('');
    const historyLabel = item => {
      const ending = (item.endingId && byId(D.endings,item.endingId)) || D.endings.find(x=>x.title===item.ending);
      const operator = (item.operatorId && byId(D.operators,item.operatorId)) || D.operators.find(x=>x.name===item.operator);
      const scenario = (item.scenarioId && byId(D.scenarios,item.scenarioId)) || D.scenarios.find(x=>x.name===item.scenario);
      const difficulty = (item.difficultyId && byId(D.difficulties,item.difficultyId)) || D.difficulties.find(x=>x.name===item.difficulty);
      return { ending: ending ? dataText(ending,'title') : item.ending, operator: operator ? dataText(operator,'name') : item.operator, scenario: scenario ? dataText(scenario,'name') : item.scenario, difficulty: difficulty ? dataText(difficulty,'name') : item.difficulty };
    };
    $('runHistory').innerHTML = meta.runHistory.length ? meta.runHistory.map(item => { const label=historyLabel(item); return `<div><strong>${esc(label.ending)}</strong><span>${esc(label.operator)} · ${esc(label.scenario)}</span><span>${esc(label.difficulty)} · ${item.days} ${I18N.t('ui.common.days')} · ${item.objectives}/3 ${I18N.t('ui.common.objectives').toLowerCase()}</span><em>+${item.data} DATA</em></div>`; }).join('') : `<p class="empty-copy">${I18N.t('ui.common.noRuns')}</p>`;
    $('archiveDialog').showModal();
  }

  function purchaseUnlock(unlock) {
    if (meta.data < unlock.cost || meta.unlocksPurchased.includes(unlock.id)) return;
    if (!confirm(I18N.t('ui.unlock.confirm', { name: dataText(unlock,'name'), cost: unlock.cost }))) return;
    meta.data -= unlock.cost;
    meta.unlocksPurchased.push(unlock.id);
    if (unlock.type === 'scenario') uniquePush(meta.scenariosUnlocked, unlock.id.replace('scenario_',''));
    if (unlock.type === 'operator') uniquePush(meta.operatorsUnlocked, unlock.id.replace('operator_',''));
    if (unlock.type === 'mutator') uniquePush(meta.mutatorsUnlocked, unlock.target);
    saveMeta(); openArchiveRefresh();
  }

  function openArchiveRefresh() { $('archiveDialog').close(); openArchive(); }
  function openSettings() { $('textScale').value=String(settings.textScale);$('reduceMotion').checked=settings.reduceMotion;$('languageSelect').value=I18N.getLocale();$('settingsDialog').showModal(); }
  function applySettings() { document.documentElement.style.setProperty('--text-scale',`${settings.textScale/100}`);document.body.classList.toggle('reduce-motion',settings.reduceMotion); }
  function closeDialog(id) { const dialog=$(id);if(dialog.open)dialog.close(); }

  $('continueBtn').onclick = () => { if(run&&!run.complete){ currentEvent = run.currentEventId==='final_shift'?finalEvent():byId(D.events,run.currentEventId)||pickEvent();hideMenu();render(); if(ONBOARDING.shouldShowBriefing(meta.onboarding))openBriefing(true);else if(ONBOARDING.shouldResumeTutorial(meta.onboarding))startTutorial(); } };
  $('newGameBtn').onclick = renderNewGame;
  $('menuArchiveBtn').onclick = openArchive;
  $('menuSettingsBtn').onclick = openSettings;
  $('changeProfileBtn').onclick = openProfiles;
  $('createProfileBtn').onclick = createLocalProfile;
  $('archiveBtn').onclick = openArchive;
  $('settingsBtn').onclick = openSettings;
  $('helpBtn').onclick = () => openBriefing(false);
  $('menuHelpBtn').onclick = () => openBriefing(false);
  $('menuBtn').onclick = showMenu;
  $('endDayBtn').onclick = endDay;
  $('briefingClose').onclick = () => finishBriefing(false);
  $('briefingBack').onclick = () => { if(briefingIndex>0){briefingIndex--;renderBriefing();} };
  $('briefingNext').onclick = () => { if(briefingIndex<BRIEFING_STEPS.length-1){briefingIndex++;renderBriefing();}else finishBriefing(false); };
  $('briefingSkip').onclick = () => finishBriefing(true);
  $('briefingTour').onclick = () => { $('briefingDialog').close(); startTutorial(true); };
  $('tutorialNext').onclick = advanceTutorial;
  $('tutorialSkip').onclick = skipTutorial;
  $('restartBtn').onclick = () => { closeDialog('endingDialog');renderNewGame(); };
  $('endingArchiveBtn').onclick = () => { closeDialog('endingDialog');openArchive(); };

  $('newGameForm').addEventListener('change', updateRunPreview);
  $('newGameForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startRun({scenario:form.get('scenario'),operator:form.get('operator'),difficulty:form.get('difficulty'),mutators:form.getAll('mutator')});
  });

  $('textScale').onchange = event => { settings.textScale=Number(event.target.value);saveSettings();applySettings(); };
  $('languageSelect').onchange = event => { I18N.setLocale(event.target.value); settings.language=I18N.getLocale(); saveSettings(); updateLocalizedUi(); };
  $('reduceMotion').onchange = event => { settings.reduceMotion=event.target.checked;saveSettings();applySettings(); };
  $('deleteRunBtn').onclick = () => { if(!run||run.complete){alert(I18N.t('ui.common.noActiveRun'));return;}if(confirm(I18N.t('ui.common.deleteRunConfirm'))){localStorage.removeItem(profileRunKey);run=null;closeDialog('settingsDialog');showMenu();} };
  $('deleteAllBtn').onclick = () => { const answer=prompt(I18N.t('ui.common.deleteAllPrompt'));if(answer=== (I18N.getLocale()==='ko'?'DELETE ALL':I18N.getLocale()==='en'?'DELETE ALL':'BORRAR TODO')){localStorage.removeItem(profileRunKey);localStorage.removeItem(profileMetaKey);run=null;meta=createMeta();saveMeta();closeDialog('settingsDialog');showMenu();} };

  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => closeDialog(button.dataset.close));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();}));

  I18N.onChange(() => { updateLocalizedUi(); });
  applySettings();
  if (run && !run.complete) currentEvent = run.currentEventId === 'final_shift' ? finalEvent() : byId(D.events,run.currentEventId) || pickEvent();
  updateLocalizedUi();
})();
