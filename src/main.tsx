import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Production only — registering a service worker during `npm run dev`
// would start caching Vite's dev assets/HMR traffic, which breaks hot
// reload in confusing ways. `import.meta.env.PROD` is Vite's own flag for
// this, no extra config needed.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
