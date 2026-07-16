import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { useGame } from './game/store'

// dev-only handle for driving the store from the console / tests
if (import.meta.env.DEV) window.__game = useGame

// NOTE: StrictMode is intentionally off — react-three-fiber's renderer does not
// survive StrictMode's double-mount in this React 19 setup (canvas never initializes).
createRoot(document.getElementById('root')).render(<App />)
