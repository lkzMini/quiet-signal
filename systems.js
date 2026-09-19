(function (root) {
  'use strict';
  const metrics = {
    power:{scope:'station',label:'stats.station.power',icon:'⚡',higher:true,low:45,critical:25}, integrity:{scope:'station',label:'stats.station.structure',icon:'▰',higher:true,low:45,critical:25}, heat:{scope:'station',label:'stats.station.heat',icon:'🔥',higher:true,low:45,critical:25}, comms:{scope:'station',label:'stats.station.comms',icon:'📡',higher:true,low:45,critical:25}, water:{scope:'station',label:'stats.station.water',icon:'💧',higher:true,low:45,critical:25},
    health:{scope:'operator',label:'stats.operator.health',icon:'♥',higher:true,low:55,critical:25}, hunger:{scope:'operator',label:'stats.operator.hunger',icon:'🍖',higher:false,low:55,critical:75}, thirst:{scope:'operator',label:'stats.operator.thirst',icon:'💧',higher:false,low:55,critical:75}, fatigue:{scope:'operator',label:'stats.operator.fatigue',icon:'😴',higher:false,low:60,critical:82}, stress:{scope:'operator',label:'stats.operator.stress',icon:'◉',higher:false,low:60,critical:85},
    food:{scope:'resources',label:'stats.resource.food',icon:'🍖',higher:true,low:3,critical:1}, waterReserve:{scope:'resources',label:'stats.resource.water',icon:'💧',higher:true,low:3,critical:1}, fuel:{scope:'resources',label:'stats.resource.fuel',icon:'⛽',higher:true,low:7,critical:3}, spareParts:{scope:'resources',label:'stats.resource.parts',icon:'🔩',higher:true,low:2,critical:0}, medicalSupplies:{scope:'resources',label:'stats.resource.medicine',icon:'✚',higher:true,low:1,critical:0}, batteries:{scope:'resources',label:'stats.resource.batteries',icon:'🔋',higher:true,low:2,critical:0}, signalKnowledge:{scope:'signal',label:'ui.common.signal',icon:'∿',higher:true,low:20,critical:8}
  };
  const state = (value, metric) => metric.higher ? (value <= metric.critical ? 'critical' : value <= metric.low ? 'low' : 'normal') : (value >= metric.critical ? 'critical' : value >= metric.low ? 'low' : 'normal');
  const isGood = (delta, metric) => delta !== 0 && (delta > 0) === metric.higher;
  const forecast = (before, delta, metric) => metric.scope === 'resources' ? Math.max(0, Math.round(before + delta)) : Math.max(0, Math.min(100, before + delta));
  root.QS_SYSTEMS = { metrics, state, isGood, forecast };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.QS_SYSTEMS;
})(typeof window === 'undefined' ? globalThis : window);
