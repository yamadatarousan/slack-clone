import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { NotificationProvider } from './contexts/NotificationContext.tsx'
import { GlobalWebSocketProvider } from './contexts/GlobalWebSocketContext.tsx'
import { OnlineStatusProvider } from './contexts/OnlineStatusContext.tsx'
import { debugManager } from './utils/debug'

// デバッグ機能をグローバルに公開
debugManager.exposeToWindow()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <OnlineStatusProvider>
            <GlobalWebSocketProvider>
              <App />
            </GlobalWebSocketProvider>
          </OnlineStatusProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
)
