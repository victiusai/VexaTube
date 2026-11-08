import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const emptyLinks = Array.from({ length: 5 }, () => ({
  platform: '',
  url: '',
}))

export default function ProfileEditor({ user, onLogout }) {
  const [profile, setProfile] = useState({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: '',
    banner_url: '',
    social_links: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [links, setLinks] = useState(emptyLinks)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setError(error.message)
      } else if (data) {
        setProfile({
          username: data.username || '',
          display_name: data.display_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          banner_url: data.banner_url || '',
          social_links: data.social_links || [],
        })

        const savedLinks = data.social_links || []
        setLinks([
          ...savedLinks,
          ...Array.from(
            { length: Math.max(0, 5 - savedLinks.length) },
            () => ({ platform: '', url: '' })
          ),
        ])
      } else {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            display_name: user.email?.split('@')[0] || 'Новый пользователь',
          })

        if (insertError && active) setError(insertError.message)
        if (active) {
          setProfile(p => ({
            ...p,
            display_name: user.email?.split('@')[0] || 'Новый пользователь',
          }))
        }
      }

      if (active) setLoading(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [user.id, user.email])

  function update(field, value) {
    setProfile(current => ({ ...current, [field]: value }))
  }

  function updateLink(index, field, value) {
    setLinks(current => current.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    ))
  }

  async function uploadImage(event, type) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Выбери изображение.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Размер изображения не должен превышать 10 МБ.')
      return
    }

    setError('')
    setMessage('')
    setUploading(type)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${type}-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('profile-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('profile-media')
        .getPublicUrl(path)

      update(type === 'avatar' ? 'avatar_url' : 'banner_url', data.publicUrl)
      setMessage('Изображение загружено. Не забудь сохранить профиль.')
    } catch (err) {
      setError(err.message || 'Не удалось загрузить изображение.')
    } finally {
      setUploading('')
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    const username = profile.username.trim().replace(/^@/, '')

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError('Username: от 3 до 30 символов, только латинские буквы, цифры и _.')
      setSaving(false)
      return
    }

    if (!profile.display_name.trim()) {
      setError('Укажи отображаемое имя.')
      setSaving(false)
      return
    }

    const socialLinks = links
      .map(link => ({
        platform: link.platform.trim(),
        url: link.url.trim(),
      }))
      .filter(link => link.platform || link.url)

    for (const link of socialLinks) {
      try {
        const parsed = new URL(link.url)
        if (!['http:', 'https:'].includes(parsed.protocol) || !link.platform) {
          throw new Error()
        }
      } catch {
        setError('Проверь социальные ссылки: укажи название и полный адрес https://...')
        setSaving(false)
        return
      }
    }

    try {
      const { error: saveError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          display_name: profile.display_name.trim(),
          bio: profile.bio.trim(),
          avatar_url: profile.avatar_url,
          banner_url: profile.banner_url,
          social_links: socialLinks,
          updated_at: new Date().toISOString(),
        })

      if (saveError) throw saveError

      setProfile(current => ({ ...current, username }))
      setLinks([
        ...socialLinks,
        ...Array.from(
          { length: Math.max(0, 5 - socialLinks.length) },
          () => ({ platform: '', url: '' })
        ),
      ])
      setMessage('Профиль успешно сохранён!')
    } catch (err) {
      setError(
        err.code === '23505'
          ? 'Этот username уже занят. Выбери другой.'
          : err.message || 'Не удалось сохранить профиль.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <section className="profile-card"><p>Загружаем профиль...</p></section>
  }

  return (
    <section className="profile-editor">
      <div className="profile-editor-heading">
        <div>
          <span className="eyebrow">ТВОЙ КАНАЛ</span>
          <h2>Мой профиль</h2>
          <p>{user.email}</p>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>
          Выйти
        </button>
      </div>

      <form onSubmit={saveProfile}>
        <div className="profile-banner-preview">
          {profile.banner_url && (
            <img src={profile.banner_url} alt="Баннер канала" />
          )}
          <label className="profile-image-button">
            {uploading === 'banner' ? 'Загрузка...' : 'Изменить баннер'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={e => uploadImage(e, 'banner')}
              disabled={!!uploading}
            />
          </label>
        </div>

        <div className="profile-avatar-row">
          <div className="profile-avatar-preview">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="Аватар" />
              : profile.display_name?.[0]?.toUpperCase() || '◉'}
          </div>
          <label className="profile-image-button">
            {uploading === 'avatar' ? 'Загрузка...' : 'Изменить аватар'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={e => uploadImage(e, 'avatar')}
              disabled={!!uploading}
            />
          </label>
        </div>

        <div className="profile-fields">
          <label>
            Username
            <div className="username-input">
              <span>@</span>
              <input
                value={profile.username}
                onChange={e => update('username', e.target.value)}
                placeholder="my_channel"
                maxLength={30}
                required
              />
            </div>
          </label>

          <label>
            Отображаемое имя
            <input
              value={profile.display_name}
              onChange={e => update('display_name', e.target.value)}
              placeholder="Как тебя зовут?"
              maxLength={60}
              required
            />
          </label>

          <label>
            Описание канала
            <textarea
              value={profile.bio}
              onChange={e => update('bio', e.target.value)}
              placeholder="Расскажи о себе и своём канале..."
              maxLength={1000}
              rows={5}
            />
            <small>{profile.bio.length}/1000</small>
          </label>
        </div>

        <div className="social-editor">
          <h3>Социальные сети</h3>
          <p>Добавь не менее пяти ссылок или больше — сколько тебе нужно.</p>

          {links.map((link, index) => (
            <div className="social-link-row" key={index}>
              <input
                value={link.platform}
                onChange={e => updateLink(index, 'platform', e.target.value)}
                placeholder="Название сети"
                aria-label={`Название социальной сети ${index + 1}`}
              />
              <input
                value={link.url}
                onChange={e => updateLink(index, 'url', e.target.value)}
                placeholder="https://..."
                type="url"
                aria-label={`Ссылка ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => setLinks(current => current.filter((_, i) => i !== index))}
                aria-label="Удалить ссылку"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            className="add-social-button"
            onClick={() => setLinks(current => [...current, { platform: '', url: '' }])}
          >
            ＋ Добавить социальную сеть
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-message">{message}</div>}

        <button className="auth-submit profile-save" type="submit" disabled={saving || !!uploading}>
          {saving ? 'Сохраняем...' : 'Сохранить профиль'}
        </button>
      </form>
    </section>
  )
}
