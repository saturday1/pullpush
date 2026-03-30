import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import App from './App'
import './global.scss'

const rootElement: HTMLElement | null = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
