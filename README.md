# SENTINEL·OPS — Dashboard de Vigilancia

Dashboard de videovigilancia en tiempo real construido con React + Node.js. Conecta con cámaras IP via RTSP, permite grabar, y descubre nuevas cámaras automáticamente en la red.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | Tailwind CSS + CSS custom (DM Mono / Caveat fonts) |
| Backend | Node.js + Express 5 |
| Streaming | ffmpeg → JPEG polling (compatible Safari/Chrome/Firefox) |
| Persistencia | `cameras.json` (cámaras) · `/recordings/` (vídeos mp4) |

---

## Arranque

### Desarrollo (con hot-reload)

```bash
npm run dev:all
```

Levanta Vite en `:5173` y el proxy en `:3001` en paralelo. El servidor proxea `/api`, `/snapshot`, `/stream` y `/recordings` automáticamente.

### Producción (un solo proceso)

```bash
npm start          # build + node server.js
```

O si el build ya existe:

```bash
node server.js
```

Abre **http://localhost:3001** — el servidor sirve el frontend estático y la API desde el mismo puerto.

### Auto-arranque al iniciar sesión (una sola vez)

```bash
cat > ~/Library/LaunchAgents/com.cctv.dashboard.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.cctv.dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/Shared/comun/cctv/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/Shared/comun/cctv</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/cctv-dashboard.log</string>
  <key>StandardErrorPath</key><string>/tmp/cctv-dashboard-err.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.cctv.dashboard.plist
```

A partir de ahí el servidor arranca automáticamente. Para detenerlo: `launchctl unload ~/Library/LaunchAgents/com.cctv.dashboard.plist`

**En Linux** (no hay `launchd`), usa un unit de `systemd` equivalente:

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

```bash
sudo systemctl enable --now cctv-dashboard
```

---

## Red — Cámara Zosi ZG2323M

La cámara vive en una subred separada (`192.168.138.x`) que no está en la LAN principal. **En macOS**, el servidor configura los alias de red automáticamente al arrancar — pedirá contraseña de administrador la primera vez por sesión si los alias no están activos.

Lo que hace internamente:

```bash
ifconfig en0 alias 192.168.138.100 netmask 255.255.255.0
ifconfig en0 alias 192.168.138.1   netmask 255.255.255.0
```

Si necesitas hacerlo manualmente:

```bash
bash setup-network.sh   # requiere contraseña de admin (usuario: air)
```

Los alias se pierden al reiniciar — el LaunchAgent los restaura automáticamente en cada arranque del servidor.

**En Linux**, este paso automático no se ejecuta (`setupNetworkAliases()` solo corre en `darwin`); configura el equivalente a mano, por ejemplo:

```bash
sudo ip addr add 192.168.138.100/24 dev eth0
sudo ip addr add 192.168.138.1/24 dev eth0
```

Interfaz e IPs son configurables vía variables de entorno `CCTV_NET_IFACE` / `CCTV_NET_ALIASES`; con `CCTV_SKIP_NET_SETUP=1` se desactiva del todo el intento automático.

---

## Cámara Zosi ZG2323M — referencia

| Parámetro | Valor |
|-----------|-------|
| IP | `192.168.138.3` (estática) |
| RTSP principal | `rtsp://admin:admin@192.168.138.3:554/video1` |
| RTSP sub-stream | `rtsp://admin:admin@192.168.138.3:554/video2` |
| Resolución | 2304 × 1296 · 15 fps · H.265 |
| Telnet | `192.168.138.3:23` · usuario `root` · contraseña `123456asj` |
| ffmpeg | auto-resuelto: `FFMPEG_PATH` env var → binario de `ffmpeg-static` (npm) → `ffmpeg` del `PATH` del sistema. Portable entre Mac/Linux/arquitecturas, no hace falta configurar nada. |

---

## Añadir cámaras

Pulsa el botón **+** en cualquier slot vacío del grid. Dos modos:

### Escanear red (recomendado)

El escáner hace tres fases:

1. **TCP scan** en paralelo sobre `192.168.138.x`, `192.168.50.x` y `192.168.1.x`, puertos `554 8554 80 8080 23 37777 34567 8000`
2. **Fingerprinting** de marca: Zosi (puerto 23 abierto), Hikvision (puerto 8000), Dahua (puerto 37777), respuestas HTTP
3. **Verificación real** con ffmpeg — prueba las URLs candidatas y marca cuál funciona ("✓ VERIFICADA")

Cámaras ya añadidas al dashboard no aparecen en los resultados.

El escaneo tarda ~20 segundos. Si la cámara no aparece:
- Comprueba que está encendida y conectada
- Para cámaras Zosi: verifica que los alias de red están activos (`ifconfig en0 | grep 138`)
- Usa la pestaña **Manual** e introduce la URL RTSP directamente

### Manual

Introduce la URL RTSP manualmente. El botón **Probar conexión** verifica con ffmpeg antes de guardar.

Patrones RTSP comunes por marca:

| Marca | Ruta |
|-------|------|
| Zosi / genérica china | `/video1` · `/video2` |
| Hikvision | `/Streaming/Channels/101` |
| Dahua | `/cam/realmonitor?channel=1&subtype=0` |
| Reolink | `/h264Preview_01_main` |

Credenciales más habituales: `admin:admin` · `admin:` · `admin:12345`

---

## Grabación

- Pulsa el botón **REC** en cualquier tarjeta de cámara para iniciar/detener
- Los archivos se guardan en `/recordings/` con formato `cam-01_2026-06-30T17-04-36.mp4`
- El badge **REC ×N** en el header solo aparece cuando hay grabaciones activas
- En la barra inferior, pulsa **GRABACIONES** para ver la lista y reproducir cualquier archivo directamente en el navegador

---

## API del servidor

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/cameras` | Lista cámaras con estado (streaming, recording) |
| `POST` | `/api/cameras` | Añade cámara `{ label, zone, rtsp }` |
| `DELETE` | `/api/cameras/:id` | Elimina cámara y para su stream |
| `GET` | `/snapshot/:id` | Último frame JPEG de la cámara |
| `GET` | `/stream/:id` | Stream MJPEG (multipart/x-mixed-replace) |
| `POST` | `/api/cameras/:id/record/start` | Inicia grabación mp4 |
| `POST` | `/api/cameras/:id/record/stop` | Para grabación (finaliza correctamente) |
| `GET` | `/api/recordings` | Lista archivos grabados |
| `GET` | `/recordings/:file` | Sirve el archivo de vídeo |
| `GET` | `/api/discover` | Escanea la red y devuelve cámaras encontradas |
| `POST` | `/api/test-rtsp` | Verifica URL RTSP con ffmpeg `{ url }` → `{ ok }` |

---

## Estructura del proyecto

```
cctv/
├── server.js              # API + streaming + discovery (Express 5, ESM)
├── cameras.json           # Configuración persistente de cámaras
├── recordings/            # Grabaciones mp4
├── dist/                  # Build de producción (generado por npm run build)
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── CameraGrid.tsx
│   │   ├── CameraCard.tsx     # Snapshot polling + AI boxes + REC
│   │   ├── CameraSlot.tsx     # Slot vacío con botón +
│   │   ├── AddCameraModal.tsx # Discover + Manual + test RTSP
│   │   ├── RightRail.tsx      # KPIs + alertas + estado equipos
│   │   └── Timeline.tsx       # Barra inferior + lista grabaciones + reproductor
│   ├── hooks/
│   │   └── useCameras.ts      # Estado cámaras + grabaciones + API calls
│   ├── types/
│   │   └── camera.ts
│   └── data/
│       └── cameras.ts         # Datos demo (alertas, dispositivos)
└── setup-network.sh       # Script manual de alias de red
```

---

## Notas técnicas

**¿Por qué JPEG polling en lugar de MJPEG?**
Safari no soporta `multipart/x-mixed-replace` en `<img>` tags. El servidor mantiene el último frame en memoria y el frontend lo pide cada 150ms con `?t=timestamp` para evitar caché. Funciona en todos los browsers.

**¿Por qué la cámara está en una subred separada?**
La Zosi ZG2323M usa `192.168.138.x` con gateway `192.168.138.1`. El Mac necesita tener esa IP asignada en `en0` para comunicarse con ella. La LAN principal usa `192.168.50.x`.

**Logs del servidor en producción:**
```bash
tail -f /tmp/cctv-dashboard.log
tail -f /tmp/cctv-dashboard-err.log
```
