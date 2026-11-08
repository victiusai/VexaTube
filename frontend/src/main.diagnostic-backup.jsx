import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('VexaTube error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{background:'#090909',color:'white',minHeight:'100vh',padding:25,fontFamily:'Arial'}}>
          <h1>Ошибка VexaTube</h1>
          <pre style={{whiteSpace:'pre-wrap',color:'#ff7777'}}>{this.state.error.stack || this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
