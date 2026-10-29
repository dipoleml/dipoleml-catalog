import React from 'react'
import ReactDOM from 'react-dom/client'
import { ToastProvider } from './ui/Toast'
import App from './App'
import './styles/tokens.css'
import './styles/themes/index.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
)
