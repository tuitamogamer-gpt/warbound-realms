import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'

// NOTE: StrictMode is intentionally off — react-three-fiber's renderer does not
// survive StrictMode's double-mount in this React 19 setup (canvas never initializes).
createRoot(document.getElementById('root')).render(<App />)
