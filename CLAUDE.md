# SENTINEL·OPS — Dashboard de Vigilancia

Dashboard CCTV en React 19 + TypeScript + Vite, con backend Express que gestiona streaming RTSP→JPEG, grabación y descubrimiento de cámaras en red. Ver `README.md` para la documentación completa (API, estructura, comandos).

## Checklist al empezar sesión

La cámara Zosi vive en la subred `192.168.138.x`, separada de la LAN principal (`192.168.50.x`). Los alias de red en `en0` se pierden al reiniciar el Mac o cerrar sesión. Antes de levantar el servidor o depurar "cámara no conecta", comprobar:

```bash
ifconfig en0 | grep 138
```

Si no aparece nada, restablecer los alias (pide contraseña de admin la primera vez por sesión):

```bash
osascript -e 'do shell script "ifconfig en0 alias 192.168.138.100 netmask 255.255.255.0 && ifconfig en0 alias 192.168.138.1 netmask 255.255.255.0" with administrator privileges'
```

El usuario `openclaw` no tiene sudo — el admin es `air`, pero el diálogo GUI de `osascript` lo puede disparar cualquier usuario.

## Comandos

```bash
npm run dev:all   # Vite (:5173) + servidor proxy (:3001) en paralelo — desarrollo
npm start         # build + node server.js — producción, un solo puerto (:3001)
npm run typecheck # tsc --noEmit
npm test          # node --test — arranca server.js real (aislado vía CCTV_DATA_DIR) y prueba contra HTTP
```

## Referencia rápida

| Qué | Valor |
|---|---|
| Cámara Zosi ZG2323M | `rtsp://admin:admin@192.168.138.3:554/video1` (H.265, 2304×1296, 15fps) |
| ffmpeg | auto-resuelto (`ffmpeg-static` npm, o `FFMPEG_PATH` env var) — ver sección Portabilidad |
| Telnet cámara | `192.168.138.3:23` · `root` / `123456asj` |
| Config cámaras | `cameras.json` (persistente, no en git) |
| Grabaciones | `recordings/*.mp4` |
| Logs producción (LaunchAgent) | `/tmp/cctv-dashboard.log` / `-err.log` |

## Hardware de la cámara (investigación completa en `~/Documents/obsidian/zosi.md`)

- Chipset **HiSilicon HI3518C**, corre **HiLinux** (BusyBox). Proceso de la cámara: `./NewIPCam.exe`.
- El acceso telnet (`root`/`123456asj`) se descubrió vía credenciales backdoor conocidas de HiSilicon — no vino en la documentación del fabricante.
- **El reloj de la cámara está en epoch (1970), sin NTP activo.** Si algo de metadata/timestamps de la cámara se usa en la app (no solo los timestamps que genera nuestro servidor), tenerlo en cuenta.
- Topología de red completa: router ASUS RT-AX86U (`192.168.50.1`), Mac por ethernet `en0` (`192.168.50.2` + alias `.138.x`), Mac por USB-eth `en7` (`192.168.50.114`, puede variar), otro equipo MacBook Pro por WiFi (`192.168.50.218`).
- Alternativa rápida para ver el stream sin la app (debug): `open -a VLC "rtsp://admin:admin@192.168.138.3:554/video1"` (requiere `brew install --cask vlc`).

## Portabilidad (Mac / Linux)

El servidor está preparado para correr en otra máquina (Mac o Linux) sin tocar código:

- **ffmpeg**: `server.js` lo resuelve en este orden — `FFMPEG_PATH` (env var) → binario empaquetado por `ffmpeg-static` (npm, coincide con el OS/arch automáticamente) → `ffmpeg` en el `PATH` del sistema. Ya no hay ninguna ruta hardcodeada a este Mac. Si ninguno se encuentra, el servidor falla al arrancar con un mensaje claro en vez de fallar en el primer request.
- **Decodificación por hardware (opcional, `FFMPEG_HWACCEL`)**: el pipeline de vista en directo (`getOrStartStream`) puede decodificar por GPU en vez de CPU — pero está **desactivado por defecto**. Se probó `FFMPEG_HWACCEL=videotoolbox` en este Mac (el binario de `ffmpeg-static` sí trae `videotoolbox` compilado, confirmado con `ffmpeg -hwaccels`) y el resultado no fue fiable: dos pruebas A/B seguidas contra la misma cámara en vivo dieron resultados contradictorios (una vez ~40% más CPU con hwaccel, otra vez ~25% menos) — con la carga real de esta máquina (3 streams + detección de movimiento corriendo a la vez) la medición es demasiado ruidosa para confiar, y el filtro `-vf scale=...` por software después de un decode por hardware fuerza una copia de la superficie GPU a memoria de sistema en cada frame que puede compensar o superar el ahorro del decode. Para activarlo y probarlo con la máquina en reposo: `FFMPEG_HWACCEL=videotoolbox` (macOS) o `FFMPEG_HWACCEL=vaapi` (Linux, necesita un render node real — por defecto `/dev/dri/renderD128`, override con `FFMPEG_HWACCEL_DEVICE`; sin `-hwaccel_output_format vaapi` a propósito, para no romper el filtro de escalado por software existente). Sin la env var, comportamiento idéntico a antes (decode 100% software). Ver `resolveHwaccelArgs()` en `server.js`.
- **Alias de red de la cámara**: `setupNetworkAliases()` solo se ejecuta en `darwin` (macOS) — en Linux se salta con un aviso y hay que configurar el equivalente manualmente (`ip addr add <ip>/24 dev <iface>`). Interfaz y IPs configurables vía `CCTV_NET_IFACE` / `CCTV_NET_ALIASES`; se puede desactivar del todo con `CCTV_SKIP_NET_SETUP=1`.
- **Descubrimiento de red**: `getActiveSubnets()` usa `os.networkInterfaces()` de Node (no `ifconfig`) — funciona igual en Mac/Linux/Windows. Los flags de `ping` se adaptan por plataforma (macOS/BSD usa milisegundos, Linux usa segundos enteros). La lectura de vecinos ARP prueba `arp -an` y cae a `ip neigh` si no está disponible (Linux mínimo sin `net-tools`).
- **Arranque en Linux**: el `LaunchAgent` (`.plist`) del README es solo macOS. En Linux usa un unit de `systemd` equivalente:
  ```ini
  # /etc/systemd/system/cctv-dashboard.service
  [Unit]
  Description=CCTV Dashboard
  After=network.target

  [Service]
  WorkingDirectory=/ruta/al/proyecto/cctv
  ExecStart=/usr/bin/node server.js
  Restart=always
  Environment=PORT=3001

  [Install]
  WantedBy=multi-user.target
  ```
  `sudo systemctl enable --now cctv-dashboard`

**Nota:** los tres `spawn(FFMPEG, ...)` y el `spawn('ping', ...)` ahora tienen handler de `'error'` — si el binario no existe o no es ejecutable (p.ej. tras mover el proyecto a otra máquina y que `FFMPEG_PATH`/ffmpeg del sistema esté mal puesto), se loguea y se limpia el estado en vez de tumbar el proceso Node entero (un `spawn` sin listener de `'error'` revienta todo el proceso si el binario no arranca). Esto es defensivo de cara a portar el proyecto — no es la causa confirmada de la caída de la sesión anterior, que probablemente fue simplemente que `node server.js` corría pegado a una terminal (sin `nohup`/`systemd`/`launchd`) y murió al cerrarse esa sesión de shell.

## Alertas por Telegram (opcional)

Cada alerta de movimiento puede mandar automáticamente una foto a Telegram (usa `entry.latestFrame`, el frame en vivo del momento — no espera a que termine ninguna grabación). Desactivado hasta que se configure; no requiere ninguna librería nueva (`fetch`/`FormData`/`Blob` nativos de Node, verificado en Node 26).

1. Habla con **@BotFather** en Telegram → `/newbot` → sigue los pasos → te da un token tipo `123456789:AAF...`. Ese es `TELEGRAM_BOT_TOKEN`.
2. Consigue tu `TELEGRAM_CHAT_ID`: manda cualquier mensaje a tu bot recién creado, luego abre en el navegador `https://api.telegram.org/bot<TU_TOKEN>/getUpdates` — ahí aparece `"chat":{"id": ...}`. Ese número (puede ser negativo si es un grupo) es `TELEGRAM_CHAT_ID`.
3. Copia `.env.example` a `.env` (en la raíz del proyecto) y rellena las dos variables ahí — `server.js` lo carga solo al arrancar (`process.loadEnvFile()`, nativo de Node 22+, sin dependencia `dotenv`). `.env` está en `.gitignore`: nunca se commitea, así el token real nunca toca el repo.
   Alternativa sin `.env` (p. ej. en el `.plist` del LaunchAgent / unit de `systemd`, como `Environment=`/`EnvironmentVariables`), o pasándolas inline al arrancar — pero evita teclear el token real directamente en `server.js` u otro fichero versionado.

Al arrancar, si están las dos variables, el log muestra `Telegram alerts: enabled`. El envío es "fire-and-forget" (no bloquea el tick de detección de movimiento de ninguna cámara) y usa el mismo cooldown de 60s por cámara que ya limita las alertas — no hay spam adicional que vigilar.

Además del movimiento, Telegram también avisa (mismo `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`, sin configuración adicional) de:
- **Cámara sin señal / recuperada** — barrido cada 30s (`checkCameraStatusTransitions`) sobre las cámaras `enabled`. Solo avisa de cambios reales (2 lecturas seguidas iguales antes de dar por bueno el cambio, y nunca en la primera observación de una cámara) y solo monitoriza cámaras cuyo stream ya está corriendo por otro motivo (vista en directo abierta o detección de movimiento activa) — no arranca ffmpeg solo para vigilar la conexión.
- **Análisis de detección de objetos terminado** — si `EJECUTAR ANÁLISIS` encuentra algo, un mensaje resumen (con foto del hit de mayor confianza si hay un frame disponible). Silencioso si no hay nada nuevo que analizar o si se cancela.
- **Limpieza automática de almacenamiento** — mismo mensaje tanto si la dispara el barrido periódico como el botón manual "FORZAR LIMPIEZA AHORA" en Ajustes (ambos llaman a `enforceRetention()`).

Estos tres usan `sendTelegramMessage()` (texto plano, `sendMessage`) cuando no hay foto de por medio, en vez de `sendTelegramAlert()` (que siempre manda una foto vía `sendPhoto` y por tanto no sirve para "cámara offline" o "limpieza de almacenamiento", donde no hay ninguna imagen relevante que adjuntar).

## Autenticación (opcional)

Sin login por defecto — cualquiera en la red que llegue al puerto puede ver cámaras en directo, borrar grabaciones, etc. Para exigir usuario/contraseña (HTTP Basic — el propio navegador muestra el diálogo, sin pantalla de login que mantener):

1. En `.env`, define `AUTH_USER` y `AUTH_PASS`.
2. Reinicia el servidor — el log muestra `Auth: enabled (HTTP Basic)` si están las dos.
3. Protege **todo**, incluidos los ficheros estáticos (`dist/`, grabaciones, snapshots) — el middleware corre antes que cualquier ruta.

Comparación usuario/contraseña con `crypto.timingSafeEqual` (no `===`), para no filtrar por timing cuánto de la contraseña acertaste. Sin las dos variables, comportamiento idéntico a antes (sin login).

## Decisiones no obvias

- **PWA sin `vite-plugin-pwa` ni ningún generador de imágenes**: `public/manifest.json` y `public/sw.js` están escritos a mano (mismo criterio que el resto del proyecto de evitar una dependencia nueva para algo pequeño — ver ffmpeg-static, fetch/FormData nativo para Telegram). Los iconos (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) se generan con `scripts/generate-pwa-icons.mjs`, que escribe PNGs válidos a mano (chunks IHDR/IDAT/IEND + CRC32, solo con `node:zlib` para el DEFLATE) — un círculo cian relleno sobre el fondo oscuro de las tarjetas, el mismo tratamiento de color que la insignia del logo en `Sidebar.tsx`. Es una marca de marcador de posición, no arte final; el script no corre como parte del build normal, solo se re-ejecuta a mano si cambia el diseño del icono. El service worker (`sw.js`) es *stale-while-revalidate* solo para el shell de la app construida (JS/CSS/HTML/iconos) — **nunca** cachea `/api/`, `/snapshot/`, `/stream/`, `/recordings/`, `/snapshots/` ni `/detection-frames/`: esto es un dashboard de vigilancia en vivo, una cámara o lista de grabaciones cacheada por error parecería actual sin serlo, que es mucho peor que un fallo de red visible. El registro (`src/main.tsx`) solo ocurre en build de producción (`import.meta.env.PROD`) — registrarlo en `npm run dev` interferiría con el HMR de Vite cacheando sus assets de desarrollo.
- **Responsive con `useLayoutMode()` (hook + `matchMedia`), no CSS con media queries**: todo el árbol de componentes usa `style={{...}}` inline de forma consistente (no hay CSS modules ni clases utilitarias reales pese a que `tailwind.config.js`/`postcss.config.js` siguen en el repo — son restos de una fase anterior con OpenCode, sin uso real, ver nota de `AGENTS.md` más abajo). Migrar todo a clases CSS para poder usar `@media` habría sido una reescritura mucho mayor; en su lugar, `src/hooks/useLayoutMode.ts` expone `'mobile' | 'tablet' | 'desktop'` (breakpoints en 768px y 1100px) vía `window.matchMedia`, y cada componente relevante decide su propio layout con ese valor. Tres franjas, no dos: `mobile` (<768px, cambia de verdad de shell: sidebar como barra inferior, `RightRail` como overlay a pantalla completa, grid de cámaras a una sola columna con scroll) vs `tablet` (768–1099px, mantiene el shell de escritorio pero `RightRail` empieza colapsado y el grid limita a 2 columnas) vs `desktop` (≥1100px, sin cambios respecto a antes de este pase).
- **`Header.tsx` y el footer de `Timeline.tsx` usan scroll horizontal como red de seguridad en móvil, no un rediseño completo de cada control.** Ambos empaquetan controles que de verdad necesitan un tamaño mínimo usable (la pista de tiempo debe seguir siendo arrastrable/tocable en una posición concreta; los botones de cabecera son acciones reales, no decorativas) — en vez de recortar funcionalidad para forzar que quepa todo en 375px, se ocultan subtítulos/etiquetas de texto no esenciales y el resto conserva su tamaño normal, con `overflowX: 'auto'` como red de seguridad para el caso raro que no quepa (p. ej. el aviso de red de cámara desconectada). No es "perfecto en móvil", es la versión que no rompe visualmente.
- **Miniaturas de grabaciones (`GET /api/recordings/:file/thumbnail`)**: se generan bajo demanda con ffmpeg (`-ss 1` para buscar rápido sin decodificar desde el frame 0) y se cachean como `.jpg` en `THUMBNAILS_DIR`, así que solo la primera petición de cada grabación lanza ffmpeg — el resto sirve el fichero cacheado directamente. Si `-ss 1` falla (grabación de menos de 1s — REC manual parado casi al instante, o un clip en modo snapshot) se reintenta una vez con `-ss 0` en vez de devolver 500 directamente, porque ese caso es razonablemente común, no un error real. La caché se limpia junto con `removeDetectionForFile` en los tres sitios donde se borra una grabación (borrado individual, borrado masivo, barrido de retención) para no dejar miniaturas huérfanas.
- **Selección múltiple en `CameraRecsModal` reutiliza `onDelete` (borrado individual) en un bucle secuencial, no un endpoint de borrado masivo nuevo.** `onDelete` ya re-consulta la lista de grabaciones tras cada llamada — hacerlo en paralelo con `Promise.all` dispararía N fetches redundantes simultáneos para lo que normalmente son unos pocos ficheros seleccionados. La descarga múltiple tampoco genera un ZIP (sin dependencia nueva): dispara descargas de `<a download>` una a una con ~300ms de margen entre cada una, porque varios navegadores descartan en silencio las descargas que no sean la primera si se disparan todas en el mismo tick sin un gesto de usuario fresco por click.
- **Preset de calidad "PERSONALIZADO" por cámara (`streamPreset: 'custom'` + `customStream`)**: solo existe a nivel de cámara, no como opción global — el "Optimizar" del footer del Timeline siempre es uno de los 4 presets fijos de `streamPresets.json`. `camera.customStream` guarda `{width, height, q, fps}` validados contra `CUSTOM_STREAM_BOUNDS` en `server.js` (160–3840px de ancho, 120–2160px de alto, fps 1–30, calidad `q` 1–31 donde 1 es mejor calidad en `-q:v` de ffmpeg) — los mismos límites se repiten en el formulario del frontend (`CameraCard.tsx`) solo para deshabilitar el botón "APLICAR" antes de tiempo; la validación real y la que importa es la del servidor. Elegir `streamPreset: null` limpia también `customStream` (no se queda huérfano por si se vuelve a elegir "PERSONALIZADO" más tarde con datos viejos).
- **Los tests (`tests/api.test.mjs`) arrancan el `server.js` real como proceso hijo, no importan sus funciones.** El fichero tiene demasiados efectos secundarios a nivel de módulo (resolución de ffmpeg, alias de red, `mkdirSync`) para trocearlo cómodamente en unidades importables sin reescribirlo. En vez de eso, cada suite lanza `node server.js` con `CCTV_DATA_DIR` apuntando a un directorio temporal aislado (nunca toca `cameras.json`/`recordings/` reales) y `CCTV_SKIP_NET_SETUP=1`, y prueba contra HTTP real — automatiza exactamente el mismo patrón de verificación manual con `curl` que ya se usaba en toda la sesión de desarrollo. `node --test tests/` (con la barra) falla con `MODULE_NOT_FOUND` en Node 26 — usar `node --test` a secas (auto-descubre `**/*.test.mjs`) o apuntar al fichero exacto.
- **JPEG polling, no MJPEG**: Safari no soporta `multipart/x-mixed-replace` en `<img>`. El servidor guarda el último frame en memoria (`latestFrame`) y el frontend hace polling a `/snapshot/:id?t=timestamp` cada ~150ms. No volver a MJPEG para el feed del navegador.
- **`AGENTS.md`** en la raíz es de una fase anterior del proyecto (scaffolding con OpenCode, antes de que existiera código de aplicación) y está desactualizado — no lo uses como referencia del estado actual del repo.
- **`testRtsp()` usa `-loglevel info`, no `error`** — la línea `Stream ... Video:` que se busca en `stderr` solo se emite a nivel `info`; con `error` la verificación (botón "Probar conexión" y el campo `verified` del discovery) siempre fallaba en silencio, incluso con streams que funcionaban perfectamente. No bajar el loglevel sin comprobar que el grep sigue encontrando la línea.
- **`/api/discover` distingue cámaras ya conocidas de conflictos de IP duplicada por MAC, no por IP.** Cada cámara guarda su `mac` (capturada por ARP al añadirla). Un host activo en la IP de una cámara configurada con la MISMA mac se omite (ya sabido); con MAC DISTINTA se devuelve marcado con `conflictsWith: {id, label}` en vez de ocultarse — esto es justo lo que pasa si dos cámaras Zosi de fábrica comparten la misma IP por defecto.
- **`/snapshot/:id` tenía una condición de carrera que tumbaba TODO el proceso Node**, no solo esa request: si el deadline de 4s disparaba un 503 justo cuando el primer frame llegaba un instante después, el `setInterval` seguía vivo, encontraba el frame, e intentaba `res.setHeader`/`res.send` sobre una respuesta ya enviada → `ERR_HTTP_HEADERS_SENT` sin capturar, que revienta el proceso entero. Pasaba con cámaras recién añadidas cuyo primer frame tarda un poco más de 4s. Arreglado: el `setInterval` comprueba `!res.headersSent` antes de escribir, y el `deadline` limpia el `interval` también. Cualquier código nuevo que toque timers + respuestas HTTP debe protegerse igual.
- **Tras editar `server.js`, reinicia el proceso antes de dar nada por probado.** Ya pasó una vez en esta sesión: varios fixes se probaron contra un proceso viejo que seguía corriendo desde antes de los cambios (comprobar con `lsof -iTCP:3001 -sTCP:LISTEN -P` + `ps -p <pid> -o lstart` vs la fecha de modificación del archivo). Si no coincide, `kill` y relanza.
- **Reconfigurar la IP de una cámara Zosi de forma persistente**: por telnet (`root`/`123456asj`), editar `/config/NetCfgParam.CFG` (JSON en texto plano, sección `Rj45Info.IPAddr`/`Gateway`) y `reboot` — un `ifconfig` en caliente en la cámara NO persiste, se revierte a lo que diga ese archivo en el siguiente arranque. Ver memoria del proyecto para el procedimiento completo (backup + `sed -i` + reboot, verificado end-to-end en cam-02).
- **Grabación en `-c:v copy -c:a aac` (no `-c copy` a secas)**: la cámara Zosi manda audio en PCM A-law, que el muxer MP4 de ffmpeg rechaza directamente con `-c copy` puro ("codec not currently supported in container", exit code 234, archivo de 0 bytes). El vídeo (H.265) sí se copia tal cual sin problema — solo el audio necesita transcodificarse (barato en CPU comparado con el vídeo). Verificado con `ffprobe`: vídeo sale como `hevc`, audio como `aac`, y el proceso de grabación pasa de ~130% CPU (recodificando con libx264) a ~8% CPU.
- **Detección de movimiento usa `@tensorflow/tfjs` (JS puro), no `@tensorflow/tfjs-node`** — este último tiene bindings nativos rotos en Node v26 (`tf.sub()` lanza `TypeError` por una API de Node ya eliminada). El downscale a 96x54 en gris se hace en JS puro con **promedio de bloque**, no vecino-más-cercano (el vecino-más-cercano deja pasar el ruido de sensor íntegro — de noche/IR eso solía leerse como "58% de píxeles cambiados" en una escena 100% estática; con promedio de bloque baja a 0.00%). Hay un límite superior (`MOTION_PCT_CEILING = 40`) para descartar cambios de escena globales (parpadeo de exposición/IR, no movimiento) — cam-01 y cam-02 tienen auto-exposición/IR inestables y generan estos "scene reset" con frecuencia; es esperado, no un bug, y no genera alertas falsas. Detalle completo y hallazgos en la memoria del proyecto.
- **Barrido de streams inactivos (`IDLE_STOP_MS`/`IDLE_SWEEP_INTERVAL_MS` en server.js)**: para los procesos ffmpeg de vista en vivo (`/snapshot/:id`, lo que usa cada tile) si no reciben peticiones en 45s, revisando cada 20s. `getOrStartStream` los reinicia solo en la siguiente petición. Verificado en logs reales: incluso con una pestaña de Safari "abierta" pero en segundo plano (el navegador la limita agresivamente, llegan peticiones sueltas cada ~60s en vez de cada 150ms), el barrido libera la CPU entre esas peticiones esporádicas sin que se note.
- **`scripts/zosi-net-config.js`** automatiza justo eso (telnet + backup + `sed -i` + reboot) para no tener que repetirlo a mano por telnet cada vez: `node scripts/zosi-net-config.js <ip-actual> --static <ip-nueva> [--gateway <gw>]` o `--dhcp` para que la cámara pida IP al router real (recomendado para cámaras nuevas — así caen en `192.168.50.x`, que el Mac ya alcanza sin alias manual, y `/api/discover` las encuentra solas). Requiere que la cámara ya sea alcanzable en `<ip-actual>` (alias de red si hace falta). El patrón `sed` con `\t` fue verificado contra el `sed` real de BusyBox de estas cámaras antes de confiar en el script.
- **`GET /api/recordings/meta` cachea `{nombre → duración}` en memoria (`recordingMetaCache`)** — antes recalculaba la duración de TODAS las grabaciones en CADA llamada (lanzando un proceso `ffmpeg -i` por archivo, cada 30s, por cada pestaña abierta), sin límite de crecimiento a medida que se acumulan grabaciones. La clave de invalidación es el `size` del archivo: una grabación finalizada no cambia de tamaño, así que un cache-hit exige que el tamaño coincida con la última vez que se sondeó (una grabación aún activa sigue creciendo, así que se re-sondea hasta que se finaliza). Medido: 14 archivos, primera llamada ~1.6s (sondea todo), segunda llamada ~0.16s (todo cacheado). La caché se limpia al borrar una grabación (individual o en bloque) para no acumular entradas de archivos que ya no existen.
