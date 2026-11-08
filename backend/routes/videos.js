const express = require('express')
const { requireAuth } = require('../auth')
const { getUserSupabase } = require('../userSupabase')

const router = express.Router()

router.use(requireAuth)

router.get('/my', async (req, res) => {
  const supabase = getUserSupabase(
    req.headers.authorization.slice(7)
  )

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  res.json({ videos: data })
})

router.post('/draft', async (req, res) => {
  const {
    title,
    description = '',
    video_url,
    thumbnail_url = null,
    hashtags = [],
    mentioned_users = [],
    is_for_kids = false,
    comments_enabled = true,
    remix_enabled = true,
    outro_url = null
  } = req.body

  if (!title?.trim() || !video_url) {
    return res.status(400).json({
      error: 'Название и ссылка на видео обязательны'
    })
  }

  const supabase = getUserSupabase(
    req.headers.authorization.slice(7)
  )

  const { data, error } = await supabase
    .from('videos')
    .insert({
      user_id: req.user.id,
      title: title.trim(),
      description,
      video_url,
      thumbnail_url,
      hashtags,
      mentioned_users,
      is_for_kids,
      comments_enabled,
      remix_enabled,
      outro_url,
      status: 'draft'
    })
    .select()
    .single()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  res.status(201).json({ video: data })
})

router.post('/:id/publish', async (req, res) => {
  const supabase = getUserSupabase(
    req.headers.authorization.slice(7)
  )

  const { data, error } = await supabase
    .from('videos')
    .update({ status: 'published' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  res.json({ video: data })
})

module.exports = router
