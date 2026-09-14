(function () {
  const c = (title, desc, hint, effects = {}, extra = {}) => ({ title, desc, hint, effects, ...extra });
  const e = (id, category, title, text, choices, extra = {}) => ({ id, category, title, text, choices, weight: 10, minDay: 1, maxDay: 99, oncePerRun: true, cooldown: 0, ...extra });

  const scenarios = [
    { id: 'winter', name: 'Turno de invierno', description: 'El turno original. Frío extremo, sistemas envejecidos y una señal desconocida.', days: 12, weather: 'NIEVE LEVE', start: { station: { power: 78, integrity: 82, heat: 76, comms: 70, water: 74 }, resources: { food: 13, waterReserve: 15, fuel: 42, spareParts: 6, medicalSupplies: 3, batteries: 4 } }, modifiers: {} },
    { id: 'red', name: 'Protocolo rojo', description: 'Algo falló antes de tu llegada. Menos suministros, más daños y registros ya abiertos.', days: 10, weather: 'ALERTA ROJA', start: { station: { power: 61, integrity: 56, heat: 68, comms: 64, water: 66 }, resources: { food: 10, waterReserve: 11, fuel: 34, spareParts: 8, medicalSupplies: 2, batteries: 5 } }, modifiers: { eventDanger: 1.15 }, startFlags: ['red_protocol', 'archive_open'] },
    { id: 'orbit', name: 'Silencio de órbita', description: 'Las comunicaciones externas han desaparecido. Restaurar el enlace puede explicar el silencio.', days: 13, weather: 'SIN ENLACE', start: { station: { power: 80, integrity: 78, heat: 75, comms: 38, water: 76 }, resources: { food: 14, waterReserve: 15, fuel: 44, spareParts: 5, medicalSupplies: 3, batteries: 6 } }, modifiers: { signalGain: 1.2 }, startFlags: ['orbital_silence'] },
    { id: 'previous', name: 'El operador anterior', description: 'K-27 conserva cambios no documentados y rastros de quien desapareció.', days: 12, weather: 'REGISTRO INCOMPLETO', locked: true, unlockId: 'scenario_previous', start: { station: { power: 73, integrity: 70, heat: 72, comms: 68, water: 70 }, resources: { food: 12, waterReserve: 14, fuel: 39, spareParts: 7, medicalSupplies: 2, batteries: 5 } }, modifiers: { loreGain: 1.25 }, startFlags: ['previous_operator'] },
    { id: 'longnight', name: 'Noche larga', description: 'El sol no saldrá durante todo el turno. El frío y el aislamiento se intensifican.', days: 15, weather: 'NOCHE POLAR', locked: true, unlockId: 'scenario_longnight', start: { station: { power: 76, integrity: 79, heat: 65, comms: 69, water: 72 }, resources: { food: 16, waterReserve: 17, fuel: 48, spareParts: 6, medicalSupplies: 3, batteries: 5 } }, modifiers: { heatWear: 1.4, stressGain: 1.2 } }
  ];

  const operators = [
    { id: 'elena', name: 'Elena Voss', description: 'Ingeniera de sistemas. Repara mejor, pero los fallos imprevistos la afectan más.', positive: 'Ingeniera: +25% reparación', negative: 'Ansiosa: +25% estrés recibido', effects: { repair: 1.25, stressGain: 1.25 }, start: { health: 90, hunger: 16, thirst: 14, fatigue: 18, stress: 10 } },
    { id: 'marcus', name: 'Marcus Hale', description: 'Especialista de rescate. Tolera la presión, pero consume más alimento.', positive: 'Templado: −25% estrés recibido', negative: 'Metabolismo rápido: +30% hambre', effects: { stressGain: .75, hungerGain: 1.3, explore: 1.15 }, start: { health: 96, hunger: 20, thirst: 15, fatigue: 16, stress: 8 } },
    { id: 'noah', name: 'Noah Kim', description: 'Técnico de comunicaciones. Extrae más información de la señal, con menor resistencia física.', positive: 'Radioaficionado: +30% señal y comunicaciones', negative: 'Constitución ligera: +20% fatiga exterior', effects: { signalGain: 1.3, commsRepair: 1.25, outsideFatigue: 1.2 }, start: { health: 84, hunger: 17, thirst: 16, fatigue: 22, stress: 12 } },
    { id: 'mara', name: 'Mara Kessler', description: 'Ex operadora de K-27. Conoce rutas que no aparecen en ningún plano.', positive: 'Memoria de estación: más lore', negative: 'Recuerdos intrusivos: eventos de señal elevan estrés', locked: true, unlockId: 'operator_mara', effects: { loreGain: 1.5, signalStress: 1.3 }, start: { health: 88, hunger: 16, thirst: 15, fatigue: 20, stress: 22 } }
  ];

  const difficulties = [
    { id: 'normal', name: 'Normal', description: 'Tres acciones diarias y suministros estándar.', actions: 3, wear: 1, needs: 1, reward: 1 },
    { id: 'hard', name: 'Difícil', description: 'Menos margen, desgaste más rápido y recursos reducidos.', actions: 3, wear: 1.22, needs: 1.15, resources: .82, reward: 1.3 },
    { id: 'extreme', name: 'Extremo', description: 'Dos acciones en días severos, clima agresivo y decisiones sin red.', actions: 3, severeActions: 2, wear: 1.48, needs: 1.28, resources: .68, reward: 1.65 }
  ];

  const mutators = [
    { id: 'extreme_temp', name: 'Temperatura extrema', description: 'La calefacción se desgasta 50% más.', reward: .15 },
    { id: 'scarcity', name: 'Escasez', description: 'Comenzás con 25% menos consumibles.', reward: .2 },
    { id: 'constant_storm', name: 'Tormenta constante', description: 'Más desgaste estructural y eventos climáticos.', reward: .2 },
    { id: 'interference', name: 'Interferencia', description: 'Comunicaciones inestables; investigar es más difícil.', reward: .15 },
    { id: 'paranoia', name: 'Paranoia', description: 'Los eventos psicológicos aumentan el estrés.', reward: .2 }
  ];

  const objectives = [
    { id: 'structure60', text: 'Finalizar con estructura ≥ 60', test: r => r.station.integrity >= 60 },
    { id: 'decode3', text: 'Decodificar 3 transmisiones', test: r => (r.counters.transmissions || 0) >= 3 },
    { id: 'no_meds', text: 'Sobrevivir sin usar medicamentos', test: r => (r.counters.meds || 0) === 0 },
    { id: 'explore4', text: 'Explorar el exterior 4 veces', test: r => (r.counters.explore || 0) >= 4 },
    { id: 'stress70', text: 'Mantener estrés final por debajo de 70', test: r => r.operator.stress < 70 },
    { id: 'systems55', text: 'Terminar con todos los sistemas ≥ 55', test: r => Object.values(r.station).every(v => v >= 55) },
    { id: 'signal45', text: 'Alcanzar 45% de conocimiento de señal', test: r => r.signalKnowledge >= 45 },
    { id: 'parts3', text: 'Conservar al menos 3 repuestos', test: r => r.resources.spareParts >= 3 },
    { id: 'health70', text: 'Finalizar con salud ≥ 70', test: r => r.operator.health >= 70 },
    { id: 'repair5', text: 'Realizar 5 reparaciones', test: r => (r.counters.repairs || 0) >= 5 },
    { id: 'lore2', text: 'Descubrir 2 fragmentos de lore', test: r => r.loreFound.length >= 2 },
    { id: 'fuel10', text: 'Conservar al menos 10 unidades de combustible', test: r => r.resources.fuel >= 10 }
  ];

  const events = [
    e('antenna_ice','mantenimiento','Hielo en el conjunto secundario','La antena pierde ganancia bajo una costra de hielo. El viento todavía permite una salida breve.',[
      c('Retirar el hielo','Trabajo exterior; la recepción mejorará.','Comunicaciones +12 · Fatiga +9',{station:{comms:12},operator:{fatigue:9},signalKnowledge:2},{requirements:{operator:{health:25}},counters:{repairs:1}}),
      c('Compensar desde consola','Consume baterías y evita la salida.','Baterías −1 · Comunicaciones +6',{resources:{batteries:-1},station:{comms:6}},{requirements:{resources:{batteries:1}}}),
      c('Esperar','El viento podría limpiar el conjunto.','Consecuencias inciertas',{station:{comms:-9},operator:{stress:3}})
    ],{category:'clima'}),
    e('fuel_leak','mantenimiento','Olor a combustible','Una unión del circuito auxiliar gotea sobre el suelo técnico.',[
      c('Cambiar la junta','Una reparación directa y predecible.','Repuestos −1 · Combustible +5',{resources:{spareParts:-1,fuel:5}},{requirements:{resources:{spareParts:1}},counters:{repairs:1}}),
      c('Recoger y sellar','Improvisás con resina del taller.','Fatiga +5 · Combustible +2',{operator:{fatigue:5},resources:{fuel:2}}),
      c('Cerrar el auxiliar','Detiene la pérdida, reduce redundancia.','Potencia −7',{station:{power:-7},flagsAdd:['aux_offline']})
    ]),
    e('pipe_freeze','supervivencia','Una tubería comienza a congelarse','El ramal norte entrega agua a pulsos. Cada minuto estrecha más el conducto.',[
      c('Calentar el ramal','Desviás energía al conducto.','Potencia −6 · Agua +9',{station:{power:-6,water:9}}),
      c('Abrir el panel','Accedés a la sección dañada.','Repuestos −1 · Agua +14',{resources:{spareParts:-1},station:{water:14}},{requirements:{resources:{spareParts:1}},counters:{repairs:1}}),
      c('Racionar','Conservás reserva, no reparás la causa.','Estrés +4',{operator:{stress:4},flagsAdd:['water_rationing']})
    ],{category:'supervivencia'}),
    e('ration_mold','supervivencia','Moho en las raciones','Tres paquetes tienen el sello húmedo. El olor no permite saber cuánto se perdió.',[
      c('Descartar el lote','Evitás una intoxicación.','Comida −3',{resources:{food:-3}}),
      c('Separar lo utilizable','Recuperás parte con riesgo moderado.','Comida −1 · Salud −3',{resources:{food:-1},operator:{health:-3}}),
      c('Registrar y seguir','No consumís nada todavía.','Estrés +3',{operator:{stress:3}})
    ]),
    e('medical_alarm','accidente','El monitor cardíaco despierta solo','El equipo médico muestra una arritmia durante siete segundos. No estabas conectado.',[
      c('Autodiagnóstico','Usás un suministro para descartar riesgos.','Medicamentos −1 · Estrés −5',{resources:{medicalSupplies:-1},operator:{stress:-5}},{requirements:{resources:{medicalSupplies:1}},counters:{meds:1}}),
      c('Revisar memoria','La lectura pertenece a otra fecha.','Señal +3 · Estrés +6',{signalKnowledge:3,operator:{stress:6}}, {lore:'medical_echo'}),
      c('Apagar el monitor','No necesitás otra alarma.','Estrés −2',{operator:{stress:-2},flagsAdd:['monitor_off']})
    ]),
    e('battery_crate','oportunidad','Una caja detrás del depósito','El inventario no menciona la caja. Dentro hay baterías selladas y una nota sin firma.',[
      c('Incorporarlas','El equipo parece utilizable.','Baterías +3',{resources:{batteries:3}}),
      c('Examinar la nota','La tinta repite una secuencia numérica.','Señal +4',{signalKnowledge:4},{lore:'battery_note'}),
      c('No tocarla','La falta de registro no es casual.','Estrés −1',{operator:{stress:-1}})
    ],{category:'oportunidad'}),
    e('whiteout','clima','La estación desaparece dentro de la nieve','El exterior se vuelve una pared blanca. La estructura vibra bajo ráfagas sostenidas.',[
      c('Asegurar paneles','Reducís daño antes del pico.','Fatiga +8 · Estructura +8',{operator:{fatigue:8},station:{integrity:8}},{counters:{repairs:1}}),
      c('Desviar potencia','Calefacción y estructura reciben apoyo.','Potencia −8 · Calefacción +6',{station:{power:-8,heat:6}}),
      c('Esperar en el núcleo','Conservás fuerzas.','Estructura −10',{station:{integrity:-10}})
    ],{weight:14}),
    e('aurora','señal','La aurora dibuja una retícula','Las bandas verdes se ordenan en ángulos demasiado regulares sobre K-27.',[
      c('Registrar el espectro','La antena obtiene un patrón limpio.','Baterías −1 · Señal +7',{resources:{batteries:-1},signalKnowledge:7},{requirements:{resources:{batteries:1}},counters:{transmissions:1},lore:'aurora_grid'}),
      c('Observar sin equipos','El patrón cambia cuando apartás la mirada.','Estrés +5 · Señal +3',{operator:{stress:5},signalKnowledge:3}),
      c('Cerrar persianas','No todo necesita registrarse.','Estrés −3',{operator:{stress:-3}})
    ],{minDay:3,weight:8}),
    e('roof_stress','mantenimiento','Carga excesiva sobre el techo','Los sensores estructurales marcan una deformación lenta sobre el laboratorio.',[
      c('Salir a despejar','Trabajo duro, daño contenido.','Fatiga +12 · Estructura +12',{operator:{fatigue:12},station:{integrity:12}},{counters:{repairs:1,explore:1}}),
      c('Calentar la cubierta','Derretís nieve usando el circuito térmico.','Combustible −4 · Estructura +7',{resources:{fuel:-4},station:{integrity:7}},{requirements:{resources:{fuel:4}}}),
      c('Cerrar laboratorio','Aceptás una pérdida controlada.','Estructura −7',{station:{integrity:-7},flagsAdd:['lab_closed']})
    ]),
    e('generator_surge','accidente','Sobretensión en el generador','Una carga inesperada recorre la estación y deja olor a aislamiento quemado.',[
      c('Cortar y revisar','Detenés el daño a costa de producción.','Potencia −10 · Repuestos −1',{station:{power:-10},resources:{spareParts:-1}},{requirements:{resources:{spareParts:1}},counters:{repairs:1}}),
      c('Estabilizar manualmente','Mantenés la red viva.','Salud −4 · Potencia +5',{operator:{health:-4},station:{power:5}}),
      c('Dejar actuar protecciones','El sistema decide qué sacrificar.','Resultado incierto',{station:{power:-5,comms:-6}})
    ]),
    e('water_filter','mantenimiento','El filtro devuelve partículas negras','El agua sigue siendo transparente, pero el cartucho retiene un residuo metálico.',[
      c('Cambiar cartucho','Una solución segura.','Repuestos −1 · Agua +10',{resources:{spareParts:-1},station:{water:10}},{requirements:{resources:{spareParts:1}},counters:{repairs:1}}),
      c('Analizar partículas','El patrón químico no corresponde a la tubería.','Fatiga +4 · Señal +4',{operator:{fatigue:4},signalKnowledge:4},{lore:'black_particles'}),
      c('Hervir el consumo','Gastás combustible para ganar tiempo.','Combustible −3',{resources:{fuel:-3}},{requirements:{resources:{fuel:3}}})
    ]),
    e('ventilation','supervivencia','El aire sabe a cobre','La ventilación principal baja de régimen. El dióxido de carbono sube lentamente.',[
      c('Reparar ventilador','Recuperás circulación.','Repuestos −1 · Fatiga +5',{resources:{spareParts:-1},operator:{fatigue:5}},{requirements:{resources:{spareParts:1}},counters:{repairs:1}}),
      c('Abrir esclusa brevemente','Renovás el aire con frío exterior.','Calefacción −9 · Estrés −2',{station:{heat:-9},operator:{stress:-2}}),
      c('Reducir actividad','Conservás oxígeno y tiempo.','Fatiga +3',{operator:{fatigue:3}})
    ]),
    e('footprints','exploración','Huellas alrededor de la torre','Una línea de pisadas rodea la antena y termina contra una pared sin puertas.',[
      c('Seguirlas','La nieve borra el origen, no el final.','Fatiga +8 · Estrés +7',{operator:{fatigue:8,stress:7},signalKnowledge:3},{counters:{explore:1},flagsAdd:['footprints_seen']}),
      c('Revisar cámaras','Catorce segundos faltan en todos los archivos.','Señal +2',{signalKnowledge:2},{lore:'missing_seconds'}),
      c('Sellar la salida','No saldrás hasta que llegue el relevo.','Estrés −2 · Comunicaciones −3',{operator:{stress:-2},station:{comms:-3}})
    ],{minDay:2}),
    e('distress','comunicaciones','Una baliza repite tu indicativo','La llamada de emergencia usa tu código personal, pero llega desde el valle vacío.',[
      c('Responder','Pedís identificación por canal seguro.','Potencia −4 · Señal +6',{station:{power:-4},signalKnowledge:6},{counters:{transmissions:1},flagsAdd:['answered_distress']}),
      c('Triangular','Necesitás dos baterías para fijar origen.','Baterías −2 · Señal +8',{resources:{batteries:-2},signalKnowledge:8},{requirements:{resources:{batteries:2}},lore:'valley_beacon'}),
      c('Silenciar','El protocolo no contempla duplicados.','Estrés +4',{operator:{stress:4}})
    ],{minDay:4}),
    e('supply_cache','oportunidad','Un reflector bajo la nieve','A doscientos metros, un marcador conduce a un depósito de emergencia anterior a K-27.',[
      c('Recuperar el depósito','La salida es larga pero productiva.','Fatiga +12 · Comida +3 · Repuestos +2',{operator:{fatigue:12},resources:{food:3,spareParts:2}},{counters:{explore:1}}),
      c('Tomar sólo combustible','Reducís el tiempo exterior.','Fatiga +7 · Combustible +9',{operator:{fatigue:7},resources:{fuel:9}},{counters:{explore:1}}),
      c('Marcar para después','No arriesgás el turno ahora.','Sin efecto inmediato',{})
    ],{minDay:3}),
    e('broken_radio','comunicaciones','La radio de reserva transmite sola','Una voz enumera temperaturas que coinciden con las próximas seis horas.',[
      c('Grabar la emisión','Las predicciones son demasiado precisas.','Señal +5 · Estrés +5',{signalKnowledge:5,operator:{stress:5}},{counters:{transmissions:1},lore:'forecast_voice'}),
      c('Usarla para planificar','Ajustás calefacción antes del descenso.','Calefacción +8 · Combustible −3',{station:{heat:8},resources:{fuel:-3}},{requirements:{resources:{fuel:3}}}),
      c('Quitar la batería','La radio calla. El receptor principal no.','Estrés −2',{operator:{stress:-2}})
    ],{minDay:4}),
    e('sleep_static','psicológico','Estática detrás de la pared','Intentás dormir, pero el ruido parece moverse entre los paneles.',[
      c('Buscar el origen','No hay cables activos en ese tabique.','Fatiga +6 · Señal +3',{operator:{fatigue:6},signalKnowledge:3},{lore:'wall_static'}),
      c('Usar tapones','Dormís algo mejor.','Fatiga −8 · Estrés −3',{operator:{fatigue:-8,stress:-3}}),
      c('Escuchar','La cadencia coincide con tu respiración.','Señal +5 · Estrés +10',{signalKnowledge:5,operator:{stress:10}})
    ],{minDay:3}),
    e('old_photo','misterio','Una fotografía sin fecha','Cuatro personas posan frente a K-27. Una tiene tu rostro y un uniforme de otra década.',[
      c('Digitalizarla','El reverso revela coordenadas.','Señal +4 · Estrés +4',{signalKnowledge:4,operator:{stress:4}},{lore:'old_photo'}),
      c('Comparar archivos','Ninguno de los nombres coincide.','Fatiga +4 · Señal +3',{operator:{fatigue:4},signalKnowledge:3}),
      c('Guardarla sin mirar más','Quizá el aislamiento distorsiona detalles.','Estrés −2',{operator:{stress:-2}})
    ],{minDay:5}),
    e('corridor_light','psicológico','Una luz al final del corredor','El ala norte está desconectada desde ayer. Sin embargo, una puerta proyecta luz cálida.',[
      c('Abrir la puerta','Dentro sólo hay un grabador encendido.','Estrés +7 · Señal +4',{operator:{stress:7},signalKnowledge:4},{lore:'warm_room'}),
      c('Reactivar el ala','Preferís una explicación eléctrica.','Potencia −6 · Estrés −2',{station:{power:-6},operator:{stress:-2}}),
      c('Ignorarla','La luz desaparece al amanecer.','Estrés +3',{operator:{stress:3}})
    ],{minDay:4}),
    e('sealed_box','misterio','El armario sellado','La llave de emergencia encaja. El sello oficial tiene dos fechas superpuestas.',[
      c('Abrirlo','Hay registros, piezas y una cinta numerada.','Repuestos +2 · Señal +4',{resources:{spareParts:2},signalKnowledge:4},{lore:'sealed_archive',flagsAdd:['cabinet_open']}),
      c('Escanear el contenido','Usás el equipo sin romper el sello.','Baterías −1 · Señal +2',{resources:{batteries:-1},signalKnowledge:2},{requirements:{resources:{batteries:1}}}),
      c('Respetar el sello','El protocolo sigue siendo claro.','Estrés −2',{operator:{stress:-2}})
    ],{minDay:2}),
    e('animal_tracks','exploración','Algo pequeño vive bajo el depósito','Marcas diminutas cruzan la harina derramada. No hay fauna registrada a esta altitud.',[
      c('Preparar una trampa no letal','Tal vez sólo sea un roedor.','Comida −1 · Estrés −2',{resources:{food:-1},operator:{stress:-2}}),
      c('Seguir las marcas','Terminan en una rejilla sellada.','Fatiga +3 · Señal +2',{operator:{fatigue:3},signalKnowledge:2},{lore:'small_tracks'}),
      c('Limpiar y cerrar','No necesitás otra variable.','Fatiga +2',{operator:{fatigue:2}})
    ]),
    e('satellite_delay','comunicaciones','El satélite responde con nueve minutos de retraso','La órbita registrada no permite esa latencia. Cada paquete vuelve con una copia adicional.',[
      c('Comparar copias','Las diferencias forman una frase incompleta.','Señal +7 · Estrés +4',{signalKnowledge:7,operator:{stress:4}},{counters:{transmissions:1},lore:'delayed_packet'}),
      c('Reiniciar enlace','Recuperás estabilidad parcial.','Comunicaciones +7 · Potencia −4',{station:{comms:7,power:-4}}),
      c('Cerrar el canal','Evitás más duplicados.','Comunicaciones −4',{station:{comms:-4}})
    ],{scenario:['orbit'],weight:18}),
    e('pressure_drop','accidente','La esclusa pierde presión','El sello exterior se contrae con el frío. El indicador cae demasiado rápido.',[
      c('Reemplazar sello','La reparación consume material.','Repuestos −2 · Estructura +10',{resources:{spareParts:-2},station:{integrity:10}},{requirements:{resources:{spareParts:2}},counters:{repairs:1}}),
      c('Soldar el marco','Funciona, pero el calor te alcanza.','Salud −5 · Estructura +6',{operator:{health:-5},station:{integrity:6}}),
      c('Cerrar el acceso','Perdés la salida principal.','Estrés +4',{operator:{stress:4},flagsAdd:['main_exit_closed']})
    ]),
    e('clear_sky','oportunidad','Una hora de cielo limpio','El viento cesa y las estrellas aparecen sobre una nieve intacta.',[
      c('Calibrar antena','La ventana es perfecta.','Comunicaciones +10 · Señal +5',{station:{comms:10},signalKnowledge:5},{counters:{transmissions:1}}),
      c('Revisar exterior','Encontrás material útil cerca de la torre.','Fatiga +6 · Repuestos +1',{operator:{fatigue:6},resources:{spareParts:1}},{counters:{explore:1}}),
      c('Tomar aire','Una pausa fuera del metal.','Estrés −9',{operator:{stress:-9}})
    ],{weight:7}),

    e('ice_1','misterio','Golpes bajo el hielo','Tres impactos secos llegan desde debajo del generador. Se repiten cada catorce minutos.',[
      c('Registrar vibraciones','Marcás el patrón para seguirlo.','Señal +3',{signalKnowledge:3},{chain:{id:'ice',stage:1},flagsAdd:['ice_started']}),
      c('Ajustar soportes','Lo tratás como vibración mecánica.','Estructura +4',{station:{integrity:4},flagsAdd:['ice_closed']})
    ],{chain:{id:'ice',stage:1},flagsBlocked:['ice_closed'],minDay:2,weight:13}),
    e('ice_2','exploración','La cavidad térmica','El patrón conduce a una bolsa de aire bajo la plataforma oeste.',[
      c('Perforar una sonda','La cámara contiene metal trabajado.','Repuestos −1 · Señal +5',{resources:{spareParts:-1},signalKnowledge:5},{requirements:{resources:{spareParts:1}},chain:{id:'ice',stage:2},lore:'ice_cavity'}),
      c('Sellar la marca','La cavidad puede comprometer cimientos.','Estructura +3',{station:{integrity:3},flagsAdd:['ice_closed']})
    ],{chain:{id:'ice',stage:2},flagsRequired:['ice_started'],flagsBlocked:['ice_closed'],minDay:4,weight:15}),
    e('ice_3','misterio','Equipo bajo la plataforma','La sonda fotografía un casco antiguo conectado a cables que descienden más.',[
      c('Recuperar el casco','Tiene grabada la frecuencia 14.827.','Fatiga +8 · Señal +7',{operator:{fatigue:8},signalKnowledge:7},{chain:{id:'ice',stage:3},lore:'ice_helmet',flagsAdd:['ice_equipment']}),
      c('Cortar los cables','El golpeteo cesa de inmediato.','Estrés −4',{operator:{stress:-4},flagsAdd:['ice_closed']})
    ],{chain:{id:'ice',stage:3},flagsBlocked:['ice_closed'],minDay:6,weight:18}),
    e('ice_4','misterio','La puerta bajo el hielo','El deshielo revela un marco circular con el emblema de una estación inexistente.',[
      c('Abrir la puerta','El aire de abajo está tibio.','Señal +12 · Estrés +8',{signalKnowledge:12,operator:{stress:8}},{chain:{id:'ice',stage:4},lore:'under_ice_door',flagsAdd:['under_ice_ready']}),
      c('Documentar y sellar','Guardás evidencia sin descender.','Señal +7',{signalKnowledge:7},{chain:{id:'ice',stage:4},lore:'under_ice_door'})
    ],{chain:{id:'ice',stage:4},flagsBlocked:['ice_closed'],minDay:8,weight:22}),

    e('relay_1','comunicaciones','El relé fantasma','Una estación con indicativo K-19 responde desde una frecuencia abandonada.',[
      c('Solicitar identificación','La respuesta incluye tu hora local exacta.','Señal +4',{signalKnowledge:4},{chain:{id:'relay',stage:1},flagsAdd:['relay_started'],counters:{transmissions:1}}),
      c('Bloquear frecuencia','No existe ninguna K-19.','Comunicaciones +2',{station:{comms:2},flagsAdd:['relay_closed']})
    ],{chain:{id:'relay',stage:1},flagsBlocked:['relay_closed'],minDay:2}),
    e('relay_2','señal','Parte meteorológico K-19','El relé anuncia una tormenta que tus sensores todavía no detectan.',[
      c('Confiar en el parte','Preparás K-27 antes del frente.','Estructura +7 · Combustible −2',{station:{integrity:7},resources:{fuel:-2}},{chain:{id:'relay',stage:2},lore:'k19_weather'}),
      c('Exigir coordenadas','K-19 envía la ubicación de K-27.','Señal +6 · Estrés +4',{signalKnowledge:6,operator:{stress:4}},{chain:{id:'relay',stage:2}})
    ],{chain:{id:'relay',stage:2},flagsRequired:['relay_started'],flagsBlocked:['relay_closed'],minDay:4,weight:15}),
    e('relay_3','misterio','La operadora de K-19','La voz se presenta como Mara Kessler. Su expediente dice que dejó Nadir hace seis años.',[
      c('Preguntar por 14.827','Responde: “no es una frecuencia”.','Señal +9 · Estrés +7',{signalKnowledge:9,operator:{stress:7}},{chain:{id:'relay',stage:3},lore:'k19_mara',counters:{transmissions:1}}),
      c('Cortar enlace','La voz sigue cinco segundos sin portadora.','Estrés +3',{operator:{stress:3}},{chain:{id:'relay',stage:3}})
    ],{chain:{id:'relay',stage:3},flagsBlocked:['relay_closed'],minDay:6,weight:18}),
    e('relay_4','señal','Último paquete de K-19','Llega un archivo con dos fechas: mañana y seis años atrás.',[
      c('Descargarlo','Contiene una ruta de evacuación alterada.','Baterías −1 · Señal +10',{resources:{batteries:-1},signalKnowledge:10},{requirements:{resources:{batteries:1}},chain:{id:'relay',stage:4},lore:'k19_last',flagsAdd:['relay_complete']}),
      c('Reenviarlo al exterior','La red confirma recepción desde tu propia estación.','Comunicaciones −5 · Señal +8',{station:{comms:-5},signalKnowledge:8},{chain:{id:'relay',stage:4},flagsAdd:['broadcast_ready']})
    ],{chain:{id:'relay',stage:4},flagsBlocked:['relay_closed'],minDay:8,weight:22}),

    e('kessler_1','misterio','El cuaderno de Kessler','Detrás de un panel aparece un cuaderno con páginas arrancadas y un croquis del subsuelo.',[
      c('Leer las anotaciones','La escritura cambia de mano a mitad del turno.','Señal +5 · Estrés +4',{signalKnowledge:5,operator:{stress:4}},{chain:{id:'kessler',stage:1},flagsAdd:['kessler_started'],lore:'kessler_journal'}),
      c('Guardar el cuaderno','No es momento para archivos personales.','Estrés −2',{operator:{stress:-2},flagsAdd:['kessler_closed']})
    ],{chain:{id:'kessler',stage:1},flagsBlocked:['kessler_closed'],minDay:1,scenario:['winter','previous','red'],weight:14}),
    e('kessler_2','misterio','Página 43','La página faltante aparece dentro del manual del generador, escrita con tinta fresca.',[
      c('Comparar caligrafía','La última línea parece escrita por vos.','Señal +6 · Estrés +6',{signalKnowledge:6,operator:{stress:6}},{chain:{id:'kessler',stage:2},lore:'page_43'}),
      c('Analizar la tinta','Su composición dejó de fabricarse hace doce años.','Fatiga +3 · Señal +4',{operator:{fatigue:3},signalKnowledge:4},{chain:{id:'kessler',stage:2}})
    ],{chain:{id:'kessler',stage:2},flagsRequired:['kessler_started'],flagsBlocked:['kessler_closed'],minDay:4,weight:16}),
    e('kessler_3','psicológico','Grabación de la enfermería','Kessler describe a alguien caminando por la estación mientras ella duerme.',[
      c('Escuchar completa','Al final se oye tu código de acceso.','Señal +8 · Estrés +9',{signalKnowledge:8,operator:{stress:9}},{chain:{id:'kessler',stage:3},lore:'kessler_recording'}),
      c('Extraer sólo datos','Reducís el impacto personal.','Señal +5 · Fatiga +3',{signalKnowledge:5,operator:{fatigue:3}},{chain:{id:'kessler',stage:3}})
    ],{chain:{id:'kessler',stage:3},flagsBlocked:['kessler_closed'],minDay:6,weight:18}),
    e('kessler_4','misterio','La instrucción final','El cuaderno revela un procedimiento para responder sin usar la antena exterior.',[
      c('Preparar el circuito','La estación queda lista para una respuesta distinta.','Repuestos −2 · Señal +10',{resources:{spareParts:-2},signalKnowledge:10},{requirements:{resources:{spareParts:2}},chain:{id:'kessler',stage:4},lore:'kessler_protocol',flagsAdd:['kessler_ready']}),
      c('Archivar el método','La información sobrevivirá aunque no la uses.','Señal +7',{signalKnowledge:7},{chain:{id:'kessler',stage:4},lore:'kessler_protocol'})
    ],{chain:{id:'kessler',stage:4},flagsBlocked:['kessler_closed'],minDay:8,weight:22}),

    e('echo_1','señal','Un eco adelantado','Tu llamada de prueba regresa dos segundos antes de haberla enviado.',[
      c('Repetir la prueba','El desfase aumenta en cada ciclo.','Señal +5 · Potencia −4',{signalKnowledge:5,station:{power:-4}},{chain:{id:'echo',stage:1},flagsAdd:['echo_started'],counters:{transmissions:1}}),
      c('Apagar transmisión','No registrás el segundo intento.','Estrés +2',{operator:{stress:2},flagsAdd:['echo_closed']})
    ],{chain:{id:'echo',stage:1},flagsBlocked:['echo_closed'],minDay:2}),
    e('echo_2','comunicaciones','La respuesta de mañana','El receptor imprime una reparación que todavía no realizaste.',[
      c('Seguir las instrucciones','El fallo aparece horas después, justo donde decía.','Repuestos −1 · Potencia +9',{resources:{spareParts:-1},station:{power:9}},{requirements:{resources:{spareParts:1}},chain:{id:'echo',stage:2},lore:'future_repair',counters:{repairs:1}}),
      c('Cambiar el procedimiento','Intentás romper la secuencia.','Estrés +5 · Señal +4',{operator:{stress:5},signalKnowledge:4},{chain:{id:'echo',stage:2}})
    ],{chain:{id:'echo',stage:2},flagsRequired:['echo_started'],flagsBlocked:['echo_closed'],minDay:4,weight:15}),
    e('echo_3','misterio','Registro de una run inexistente','El archivo enumera decisiones que no tomaste y un final que no conocés.',[
      c('Guardar en Archivo','La meta-información persiste fuera del turno.','Señal +8 · Estrés +5',{signalKnowledge:8,operator:{stress:5}},{chain:{id:'echo',stage:3},lore:'other_run'}),
      c('Buscar diferencias','Una decisión coincide con este mismo momento.','Fatiga +4 · Señal +6',{operator:{fatigue:4},signalKnowledge:6},{chain:{id:'echo',stage:3}})
    ],{chain:{id:'echo',stage:3},flagsBlocked:['echo_closed'],minDay:6,weight:18}),
    e('echo_4','señal','El mensaje que todavía no enviaste','La consola muestra una respuesta dirigida a algo bajo la montaña, firmada con tu nombre.',[
      c('Autorizar transmisión','El mensaje sale sin usar energía medible.','Señal +14 · Estrés +10',{signalKnowledge:14,operator:{stress:10}},{chain:{id:'echo',stage:4},lore:'future_message',flagsAdd:['something_answered']}),
      c('Borrar el mensaje','La copia vuelve a aparecer en el Archivo.','Señal +8',{signalKnowledge:8},{chain:{id:'echo',stage:4},lore:'future_message'})
    ],{chain:{id:'echo',stage:4},flagsBlocked:['echo_closed'],minDay:9,weight:24})
  ];

  const endings = [
    { id:'evacuation', category:'SURVIVAL', title:'Evacuación estándar', text:'El relevo alcanza K-27. Entregás un informe incompleto, pero volvés del turno por tus propios medios.' },
    { id:'station_kept', category:'SURVIVAL', title:'La estación permanece operativa', text:'Cada sistema responde cuando el relevo cruza la esclusa. K-27 queda lista para otro turno, aunque la señal sigue allí.' },
    { id:'contact', category:'MYSTERY', title:'Contacto', text:'Transmitís una pregunta en 14.827. La respuesta llega con tu voz, fechada tres días en el futuro.' },
    { id:'under_ice', category:'SECRET', title:'Bajo el hielo', text:'La puerta circular se abre. Debajo de K-27 hay otra estación, más antigua y todavía encendida.' },
    { id:'broadcast', category:'MYSTERY', title:'La transmisión', text:'Liberás el Archivo por todos los canales. El enlace se cierra desde fuera, pero varias estaciones civiles ya recibieron copias.' },
    { id:'something_answered', category:'SECRET', title:'Algo respondió', text:'La estación se apaga. En la oscuridad, una antena enterrada comienza a transmitir hacia arriba.' },
    { id:'freeze', category:'FAILURE', title:'Noche blanca', text:'Potencia y calefacción caen juntas. La baliza sigue activa bajo una capa de hielo interior.' },
    { id:'medical', category:'FAILURE', title:'Evacuación médica', text:'Tu cuerpo deja de acompañar las decisiones. El protocolo termina el turno antes que la señal.' },
    { id:'dehydration', category:'FAILURE', title:'Reserva cero', text:'La última bomba gira en seco. El relevo encuentra el registro abierto en la página del agua.' },
    { id:'breakdown', category:'FAILURE', title:'Ruido blanco', text:'La voz continúa incluso con el receptor apagado. Activás la baliza y esperás frente a una pantalla negra.' }
  ];

  const achievements = [
    {id:'first_run',name:'PRIMER TURNO',description:'Completa una run.',test:(r,m)=>m.runsCompleted>=1},
    {id:'all_control',name:'TODO BAJO CONTROL',description:'Finaliza con todos los sistemas por encima de 70.',test:r=>Object.values(r.station).every(v=>v>70)},
    {id:'no_sleep',name:'NO NECESITO DORMIR',description:'Completa una run sin usar Dormir.',test:r=>(r.counters.sleep||0)===0},
    {id:'too_much',name:'ESCUCHASTE DEMASIADO',description:'Alcanza 80% de conocimiento de señal.',test:r=>r.signalKnowledge>=80},
    {id:'under_ice',name:'BAJO NADIR',description:'Descubre el final Bajo el hielo.',test:(r,m)=>m.endingsFound.includes('under_ice')},
    {id:'resourceful',name:'CON LO QUE HABÍA',description:'Completa Difícil o Extremo sin quedar sin repuestos.',test:r=>r.difficulty!=='normal'&&r.resources.spareParts>0},
    {id:'ten_days',name:'DIEZ AMANECERES',description:'Sobrevive al menos diez días.',test:r=>r.day>=10},
    {id:'collector',name:'ARCHIVISTA',description:'Descubre 20 eventos distintos.',test:(r,m)=>m.eventsDiscovered.length>=20},
    {id:'signal_fragments',name:'PATRÓN RECURRENTE',description:'Reúne 6 fragmentos de lore.',test:(r,m)=>m.loreDiscovered.length>=6},
    {id:'healthy',name:'PULSO FIRME',description:'Finaliza con salud mayor a 85.',test:r=>r.operator.health>85},
    {id:'scarcity_win',name:'ALACENA VACÍA',description:'Completa una run con Escasez.',test:r=>r.mutators.includes('scarcity')&&r.endingCategory!=='FAILURE'},
    {id:'extreme_win',name:'SIN MARGEN',description:'Completa una run en Extremo.',test:r=>r.difficulty==='extreme'&&r.endingCategory!=='FAILURE'},
    {id:'four_chains',name:'HILOS SUELTOS',description:'Avanza en las cuatro cadenas narrativas.',test:r=>Object.keys(r.chainStages).length>=4},
    {id:'objectives',name:'TURNO IMPECABLE',description:'Completa los tres objetivos de una run.',test:r=>r.objectiveResults?.every(Boolean)},
    {id:'five_runs',name:'PERSONAL PERMANENTE',description:'Completa cinco runs.',test:(r,m)=>m.runsCompleted>=5}
  ];

  const unlocks = [
    {id:'scenario_previous',type:'scenario',name:'Escenario: El operador anterior',cost:90,description:'Más registros, alteraciones y lore.'},
    {id:'scenario_longnight',type:'scenario',name:'Escenario: Noche larga',cost:140,description:'Quince días bajo noche polar.'},
    {id:'operator_mara',type:'operator',name:'Operadora: Mara Kessler',cost:110,description:'Mayor acceso al lore, mayor carga psicológica.'},
    {id:'mutator_extreme_temp',type:'mutator',target:'extreme_temp',name:'Mutador: Temperatura extrema',cost:35,description:'+15% DATA.'},
    {id:'mutator_scarcity',type:'mutator',target:'scarcity',name:'Mutador: Escasez',cost:45,description:'+20% DATA.'},
    {id:'mutator_constant_storm',type:'mutator',target:'constant_storm',name:'Mutador: Tormenta constante',cost:50,description:'+20% DATA.'},
    {id:'mutator_interference',type:'mutator',target:'interference',name:'Mutador: Interferencia',cost:40,description:'+15% DATA.'},
    {id:'mutator_paranoia',type:'mutator',target:'paranoia',name:'Mutador: Paranoia',cost:50,description:'+20% DATA.'}
  ];

  window.QS_DATA = { scenarios, operators, difficulties, mutators, objectives, events, endings, achievements, unlocks };
})();
