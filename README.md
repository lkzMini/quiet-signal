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
