import type { Alert, Device } from '@/types/camera'

export const ALERTS: Alert[] = [
  { time: '14:32:08', cam: 'CAM 01', zone: 'Entrada', type: 'Persona detectada', sev: 'ALTA', icon: 'user-round', tone: 'red' },
  { time: '14:30:55', cam: 'CAM 05', zone: 'Perimetro Este', type: 'Perimetro cruzado', sev: 'ALTA', icon: 'shield-alert', tone: 'red' },
  { time: '14:28:12', cam: 'CAM 04', zone: 'Pasillo B2', type: 'Movimiento inusual', sev: 'MEDIA', icon: 'radar', tone: 'amber' },
  { time: '14:22:40', cam: 'CAM 02', zone: 'Parking Norte', type: 'Vehiculo detectado', sev: 'BAJA', icon: 'car', tone: 'cyan' },
  { time: '14:15:03', cam: 'CAM 03', zone: 'Recepcion', type: 'Acceso autorizado', sev: 'INFO', icon: 'door-open', tone: 'green' },
  { time: '14:09:47', cam: 'CAM 06', zone: 'Almacen', type: 'Camara sin senal', sev: 'MEDIA', icon: 'video-off', tone: 'amber' },
  { time: '13:58:21', cam: 'CAM 01', zone: 'Entrada', type: 'Movimiento detectado', sev: 'BAJA', icon: 'radar', tone: 'cyan' },
]

export const DEVICES: Device[] = [
  { id: 'CAM 01', zone: 'Entrada Principal', on: true, status: 'ONLINE' },
  { id: 'CAM 02', zone: 'Parking Norte', on: true, status: 'ONLINE' },
  { id: 'CAM 03', zone: 'Recepcion', on: true, status: 'ONLINE' },
  { id: 'CAM 04', zone: 'Pasillo B2 · bat 82%', on: true, status: 'ONLINE' },
  { id: 'CAM 05', zone: 'Perimetro Este · bat 64%', on: true, status: 'ONLINE' },
  { id: 'CAM 06', zone: 'Almacen', on: false, status: 'OFFLINE' },
]
