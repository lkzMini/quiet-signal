# Quiet Signal

Quiet Signal es una experiencia narrativa/survival local hecha con HTML, CSS y JavaScript vanilla. Se puede abrir directamente con `index.html` o publicar como sitio estático.

## Player profiles

- Los perfiles son **locales** y permiten separar varios jugadores en el mismo navegador o dispositivo.
- Cada perfil conserva su propia run, DATA, Archivo, finales, logros, desbloqueos e historial.
- Se pueden crear, seleccionar, renombrar y eliminar perfiles desde la pantalla principal.
- El límite es de 10 perfiles; no se puede eliminar el último.
- No hay cuentas online, login, servidor ni sincronización cloud.
- Los datos se guardan en `localStorage` usando una clave maestra de perfiles y claves por ID estable (`quiet-signal:<profileId>:run` y `meta`).
- La configuración visual permanece global al navegador.
- En la primera carga, el save anterior se migra automáticamente a `Jugador 1` sin perder progreso.

## Jugar

Abrí [Quiet Signal](https://lkzMini.github.io/quiet-signal/) en Brave, elegí un perfil y comenzá una operación. Cada navegador/dispositivo tiene su propio almacenamiento local; los perfiles sólo separan jugadores dentro del mismo navegador.

## Desarrollo local

Abrí `index.html` directamente. No requiere npm, dependencias, backend ni build step.

## Languages / Idiomas

Quiet Signal supports **Spanish**, **English**, and **Korean**. The first visit detects `navigator.language` (`es-*`, `ko-*`, `en-*`; other languages default to English). The language selector lives in Settings and changes the interface immediately without restarting or changing a run. The preference is persisted in `quiet-signal-settings-v1` alongside the existing visual settings.

Translations use stable semantic keys and an English fallback when a key is missing; development builds log missing keys to the console. Data-driven content is resolved at render time, so saves keep IDs and remain language-neutral. To add another language (for example Portuguese), add its dictionary to `locales.js`, include it in `supported`, and add a selector option. Run `node scripts/check-i18n.js` for the strict key and hardcoded-UI audit.
