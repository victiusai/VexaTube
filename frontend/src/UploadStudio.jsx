import { useEffect, useState } from 'react'
import * as tus from 'tus-js-client'
import { supabase } from './lib/supabase'
import './UploadStudio.css'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024

function UploadStudio({ user, onClose }) {
  const [file, setFile] = useState(null)
  const [thumbnail, setThumbnail] = useState(null)
  const [preview, setPreview] = useState('')
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [query, setQuery] = useState('')
  const [foundUsers, setFoundUsers] = useState([])
  const [mentioned, setMentioned] = useState([])
  const [kids, setKids] = useState(false)
  const [comments, setComments] = useState(true)
  const [remixes, setRemixes] = useState(true)
  const [drafts, setDrafts] = useState([])
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('create')

  useEffect(() => {
    loadDrafts()
  }, [user?.id])

  useEffect(() => {
    if (query.trim().length < 2) {
      setFoundUsers([])
      return
    }

    let active = true

    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .limit(8)

      if (active && !error) {
        setFoundUsers(data || [])
      }
    }, 350)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    }
  }, [preview, thumbnailPreview])

  async function loadDrafts() {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('videos')
      .select('id, title, description, created_at, thumbnail_url')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })

    if (!error) setDrafts(data || [])
  }

  function selectVideo(event) {
    const selected = event.target.files?.[0]
    if (!selected) return

    setError('')
    setMessage('')

    if (!selected.type.startsWith('video/')) {
      setError('Выбери видеофайл.')
      return
    }

    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(selected.type)) {
      setError('Поддерживаются MP4, WebM и MOV.')
      return
    }

    if (selected.size > MAX_VIDEO_SIZE) {
      setError('Размер видео превышает 500 МБ.')
      return
    }

    if (preview) URL.revokeObjectURL(preview)

    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  function selectThumbnail(event) {
    const selected = event.target.files?.[0]
    if (!selected) return

    setError('')

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Обложка должна быть JPG, PNG или WebP.')
      return
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('Размер обложки не должен превышать 10 МБ.')
      return
    }

    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)

    setThumbnail(selected)
    setThumbnailPreview(URL.createObjectURL(selected))
  }

  function addMention(person) {
    if (mentioned.some(item => item.id === person.id)) return
    setMentioned(previous => [...previous, person])
    setQuery('')
    setFoundUsers([])
  }

  function removeMention(id) {
    setMentioned(previous => previous.filter(item => item.id !== id))
  }

  async function uploadVideo(session) {
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-100)

    const objectName =
      `${user.id}/${Date.now()}-${safeName}`

    // Небольшие видео загружаем обычным Storage API.
    // Для больших файлов используем TUS.
    if (file.size <= 6 * 1024 * 1024) {
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(objectName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      setProgress(100)
      return data.path
    }

    const projectRef = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]
    const endpoint =
      `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`

    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'x-upsert': 'false',
        },
        metadata: {
          bucketName: 'videos',
          objectName,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024,
        uploadDataDuringCreation: false,
        removeFingerprintOnSuccess: true,

        onError(error) {
          const xhr = error?.originalRequest
            ?.getUnderlyingObject?.()
          const cause = error?.causingError

          const diagnostic = {
            message: error?.message,
            cause: cause?.type || cause?.message || String(cause),
            status: xhr?.status,
            readyState: xhr?.readyState,
            response: xhr?.responseText,
            responseURL: xhr?.responseURL,
            responseHeaders: xhr?.getAllResponseHeaders?.(),
            online: navigator.onLine,
          }

          console.error('VexaTube TUS NETWORK ERROR:', diagnostic)

          reject(new Error(
            'TUS PATCH: ' +
            JSON.stringify(diagnostic)
          ))
        },

        onProgress(uploaded, total) {
          setProgress(Math.round((uploaded / total) * 100))
        },

        onSuccess() {
          resolve(objectName)
        },
      })

      upload.findPreviousUploads().then(previous => {
        if (previous.length) {
          upload.resumeFromPreviousUpload(previous[0])
        }

        upload.start()
      }).catch(reject)
    })
  }

  async function uploadThumbnail() {
    if (!thumbnail) return null

    const extension = thumbnail.type.split('/')[1]
    const path = `${user.id}/${Date.now()}.${extension}`

    const { error } = await supabase.storage
      .from('video-thumbnails')
      .upload(path, thumbnail, {
        contentType: thumbnail.type,
        upsert: false,
      })

    if (error) throw error

    const { data } = supabase.storage
      .from('video-thumbnails')
      .getPublicUrl(path)

    return data.publicUrl
  }

  async function saveVideo(status) {
    setError('')
    setMessage('')

    if (!user?.id) {
      setError('Сначала войди в аккаунт.')
      return
    }

    if (!file) {
      setError('Сначала выбери видео.')
      return
    }

    if (!title.trim()) {
      setError('Укажи название видео.')
      return
    }

    setBusy(true)
    setProgress(0)

    let videoPath = null
    let currentStep = 'Проверка авторизации'

    try {
      currentStep = 'Проверка авторизации'
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const session = sessionData.session

      if (!session?.access_token) {
        throw new Error('Сессия завершена. Войди в аккаунт снова.')
      }

      currentStep = 'Загрузка видео'
      setMessage('Загружаем видео...')
      videoPath = await uploadVideo(session)

      currentStep = 'Загрузка обложки'
      setMessage('Загружаем обложку...')
      const thumbnailUrl = await uploadThumbnail()

      const { data: publicVideo } = supabase.storage
        .from('videos')
        .getPublicUrl(videoPath)

      const tags = hashtags
        .split(/[\s,]+/)
        .map(tag => tag.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean)

      currentStep = 'Сохранение видео в базе данных'
      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          video_url: publicVideo.publicUrl,
          thumbnail_url: thumbnailUrl,
          hashtags: [...new Set(tags)],
          mentioned_users: mentioned.map(person => person.id),
          is_for_kids: kids,
          comments_enabled: comments,
          remix_enabled: remixes,
          status,
        })

      if (insertError) throw insertError

      setMessage(
        status === 'published'
          ? 'Видео опубликовано!'
          : 'Видео сохранено в черновиках!'
      )

      setFile(null)
      setThumbnail(null)
      setPreview('')
      setThumbnailPreview('')
      setTitle('')
      setDescription('')
      setHashtags('')
      setMentioned([])
      setProgress(100)

      currentStep = 'Обновление списка видео'
      await loadDrafts()

      if (status === 'published') {
        setTimeout(onClose, 1200)
      } else {
        setTab('drafts')
      }
    } catch (err) {
      setError(currentStep + ': ' + (err.message || 'Не удалось сохранить видео.'))
      setMessage('')
    } finally {
      setBusy(false)
    }
  }

  async function publishDraft(id) {
    setError('')
    setBusy(true)

    try {
      const { data, error } = await supabase
        .from('videos')
        .update({ status: 'published' })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select('id')
        .single()

      if (error) throw error
      if (!data) throw new Error('Черновик не найден.')

      await loadDrafts()
      setMessage('Черновик опубликован!')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteDraft(id) {
    if (!confirm('Удалить этот черновик?')) return

    setError('')
    setBusy(true)

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'draft')

      if (error) throw error

      await loadDrafts()
      setMessage('Черновик удалён.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upload-studio-backdrop" onClick={onClose}>
      <section
        className="upload-studio"
        onClick={event => event.stopPropagation()}
      >
        <header className="studio-header">
          <div>
            <span className="studio-kicker">VEXATUBE CREATOR</span>
            <h2>Студия публикации</h2>
          </div>
          <button className="studio-close" onClick={onClose}>×</button>
        </header>

        <div className="studio-tabs">
          <button
            className={tab === 'create' ? 'selected' : ''}
            onClick={() => setTab('create')}
          >
            Новое видео
          </button>
          <button
            className={tab === 'drafts' ? 'selected' : ''}
            onClick={() => {
              setTab('drafts')
              loadDrafts()
            }}
          >
            Черновики ({drafts.length})
          </button>
        </div>

        {error && <div className="studio-alert error">{error}</div>}
        {message && <div className="studio-alert">{message}</div>}

        {tab === 'create' ? (
          <div className="studio-content">
            <label className="studio-label">Видеофайл</label>
            <label className="studio-file">
              <span>＋</span>
              <strong>{file ? file.name : 'Выбрать видео'}</strong>
              <small>MP4, WebM или MOV · до 500 МБ</small>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={selectVideo}
                disabled={busy}
              />
            </label>

            {preview && (
              <video className="studio-video" src={preview} controls />
            )}

            <label className="studio-label">Название</label>
            <input
              className="studio-input"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Название твоего видео"
              maxLength={150}
              disabled={busy}
            />

            <label className="studio-label">Описание</label>
            <textarea
              className="studio-input studio-textarea"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Расскажи зрителям о видео..."
              maxLength={5000}
              disabled={busy}
            />

            <label className="studio-label">Обложка видео</label>
            <label className="studio-file studio-small-file">
              <strong>{thumbnail ? thumbnail.name : 'Выбрать изображение'}</strong>
              <small>JPG, PNG или WebP · до 10 МБ</small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectThumbnail}
                disabled={busy}
              />
            </label>

            {thumbnailPreview && (
              <img
                className="studio-thumbnail"
                src={thumbnailPreview}
                alt="Предпросмотр обложки"
              />
            )}

            <label className="studio-label">Хэштеги</label>
            <input
              className="studio-input"
              value={hashtags}
              onChange={event => setHashtags(event.target.value)}
              placeholder="#музыка #видео #vexatube"
              disabled={busy}
            />

            <label className="studio-label">Отметить пользователей</label>
            <input
              className="studio-input"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Поиск по username"
              disabled={busy}
            />

            {foundUsers.length > 0 && (
              <div className="studio-user-results">
                {foundUsers.map(person => (
                  <button
                    key={person.id}
                    onClick={() => addMention(person)}
                    disabled={busy}
                  >
                    <span>{person.display_name || person.username}</span>
                    <small>@{person.username}</small>
                  </button>
                ))}
              </div>
            )}

            {mentioned.length > 0 && (
              <div className="studio-tags">
                {mentioned.map(person => (
                  <button
                    key={person.id}
                    onClick={() => removeMention(person.id)}
                    disabled={busy}
                  >
                    @{person.username} ×
                  </button>
                ))}
              </div>
            )}

            <div className="studio-options">
              <label>
                <span>Видео для детей</span>
                <input
                  type="checkbox"
                  checked={kids}
                  onChange={event => setKids(event.target.checked)}
                  disabled={busy}
                />
              </label>

              <label>
                <span>Разрешить комментарии</span>
                <input
                  type="checkbox"
                  checked={comments}
                  onChange={event => setComments(event.target.checked)}
                  disabled={busy}
                />
              </label>

              <label>
                <span>Разрешить ремиксы</span>
                <input
                  type="checkbox"
                  checked={remixes}
                  onChange={event => setRemixes(event.target.checked)}
                  disabled={busy}
                />
              </label>
            </div>

            {busy && (
              <div className="studio-progress">
                <div>
                  <span>Загрузка</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="studio-progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="studio-actions">
              <button
                className="studio-secondary"
                onClick={() => saveVideo('draft')}
                disabled={busy || !file || !title.trim()}
              >
                Сохранить черновик
              </button>

              <button
                className="studio-primary"
                onClick={() => saveVideo('published')}
                disabled={busy || !file || !title.trim()}
              >
                {busy ? 'Подожди...' : 'Опубликовать'}
              </button>
            </div>
          </div>
        ) : (
          <div className="studio-content">
            {drafts.length === 0 ? (
              <div className="studio-empty">
                <span>▤</span>
                <strong>Черновиков пока нет</strong>
                <small>Сохраняй видео и возвращайся к ним позже.</small>
              </div>
            ) : (
              <div className="studio-drafts">
                {drafts.map(draft => (
                  <article key={draft.id}>
                    {draft.thumbnail_url ? (
                      <img src={draft.thumbnail_url} alt="" />
                    ) : (
                      <div className="draft-placeholder">▶</div>
                    )}
                    <div className="draft-info">
                      <strong>{draft.title}</strong>
                      <small>
                        {new Date(draft.created_at).toLocaleDateString()}
                      </small>
                      <div>
                        <button
                          onClick={() => publishDraft(draft.id)}
                          disabled={busy}
                        >
                          Опубликовать
                        </button>
                        <button
                          onClick={() => deleteDraft(draft.id)}
                          disabled={busy}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default UploadStudio
