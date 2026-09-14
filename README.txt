QUIET SIGNAL — Prototype 0.3
============================

QUÉ ES
------
Una experiencia narrativa/survival local de runs cortas. Gestionás la estación
K-27 y a su operador durante 10–15 días mientras investigás la señal 14.827.

Funciona sólo con HTML, CSS y JavaScript vanilla. No usa npm, frameworks, backend,
CDN ni build step: abrí index.html directamente en Brave.

BUCLE DE JUEGO
--------------
Cada día ofrece:
- un evento narrativo con decisiones y requisitos
- una cantidad limitada de acciones
- consumo de recursos y desgaste de estación
- aumento de hambre, sed, fatiga y estrés

Las acciones personales compiten con mantenimiento e investigación. Después de
resolver el evento podés gastar acciones restantes o finalizar el día.

CONTENIDO DE 0.3
----------------
- 5 escenarios definidos; 3 disponibles inicialmente
- 4 operadores definidos; 3 disponibles inicialmente
- 3 dificultades
- 5 mutadores desbloqueables
- 40 eventos condicionales y ponderados
- 4 cadenas narrativas de cuatro etapas
- 12 objetivos de run
- 10 finales
- 15 logros
- 8 desbloqueos comprables con DATA

ESTACIÓN, OPERADOR Y RECURSOS
-----------------------------
Condición de estación:
Potencia, Estructura, Calefacción, Comunicaciones y Agua.

Estado del operador:
Salud, Hambre, Sed, Fatiga y Estrés.

Recursos consumibles separados:
Raciones, reserva de agua, combustible, repuestos, suministros médicos y baterías.

OPERADORES Y TRAITS
-------------------
Elena repara con mayor eficiencia pero recibe más estrés. Marcus tolera mejor la
presión y explora mejor, aunque gana hambre más rápido. Noah mejora comunicaciones
e investigación de señal, pero se fatiga más en el exterior.

RUNS Y META-PROGRESIÓN
----------------------
Al finalizar una operación recibís DATA según días sobrevividos, eventos y lore
nuevos, objetivos, dificultad, mutadores y finales inéditos.

El Archivo permite:
- comprar escenarios, operador y mutadores
- revisar finales y logros conocidos
- consultar fragmentos de lore
- conservar las últimas 20 operaciones

Los desbloqueos priorizan variedad y opciones; no existen mejoras acumulativas de
estadísticas desproporcionadas.

GUARDADO LOCAL
--------------
La información se separa en tres claves de localStorage:

quiet-signal-run-v1       run actual
quiet-signal-meta-v1      DATA, Archivo, desbloqueos, logros e historial
quiet-signal-settings-v1  escala de texto y reducción de animaciones

Empezar una partida nueva reemplaza sólo la run. Configuración permite borrar la
run actual o borrar todo el progreso mediante una confirmación reforzada.

INTERFAZ Y 4K
-------------
El layout usa 92% del viewport hasta 1960px y separa estado (columna izquierda)
de narrativa/decisiones (columna derecha). La tipografía escala con clamp() y el
texto narrativo mantiene un ancho legible. Hay adaptaciones para 1080p, 1440p,
4K, ultrawide, tablet y móvil.

ARCHIVOS
--------
index.html   estructura y diálogos
styles.css   layout, legibilidad y atmósfera
data.js      escenarios, operadores, eventos, cadenas, finales y progresión
game.js      estado, motor de runs, persistencia y UI

PRUEBA RÁPIDA
-------------
1. Abrí index.html en Brave.
2. Elegí Nueva partida, escenario, operador y dificultad.
3. Resolvé el evento, usá acciones y cerrá varios días.
4. Recargá y elegí Continuar para comprobar el guardado.
5. Finalizá o provocá un fallo y revisá DATA, Archivo e historial.
