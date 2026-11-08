require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { requireAuth } = require('./auth')
const videoRoutes = require('./routes/videos')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]
}))

app.use(express.json({ limit: '10mb' }))
app.use('/api/videos', videoRoutes)

app.get('/', (req, res) => {
  res.json({
    name: 'VexaTube Backend',
    status: 'online'
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VexaTube API'
  })
})

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    authenticated: true
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VexaTube Backend запущен на порту ${PORT}`)
})
