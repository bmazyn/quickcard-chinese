import { useNavigate } from 'react-router-dom'
import './NotFound.css'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <p>Page not found</p>
        <button onClick={() => navigate('/')} className="not-found-btn">
          Go Home
        </button>
      </div>
    </div>
  )
}
