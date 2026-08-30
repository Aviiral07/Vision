import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register auto-updating PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New updates available for InfraMind PWA. Reload to update?")) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log("InfraMind PWA is ready for offline operation.")
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
