const { supabase } = require('./supabase')

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : ''

  if (!token) {
    return res.status(401).json({
      error: 'Требуется авторизация'
    })
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({
      error: 'Недействительная или истёкшая сессия'
    })
  }

  req.user = data.user
  next()
}

module.exports = { requireAuth }
