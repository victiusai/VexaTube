import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function ChannelPage({ user, onEditProfile }) {
  const [profile, setProfile] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  useEffect(() => {
    let active = true

    async function loadChannel() {
      setLoading(true)
      setError('')

      const [profileResult, videosResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('videos')
          .select('id, title, description, video_url, thumbnail_url, created_at')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
      ])

      if (!active) return

      if (profileResult.error) {
        setError(profileResult.error.message)
      } else {
        setProfile(profileResult.data)
      }

      if (videosResult.error) {
        setError(videosResult.error.message)
      } else {
        setVideos(videosResult.data || [])
      }

      setLoading(false)
    }

    loadChannel()

    return () => {
      active = false
    }
  }, [user.id])

  if (loading) {
    return <section className="channel-page"><p>Загружаем канал...</p></section>
  }

  if (error) {
    return (
      <section className="channel-page">
        <div className="auth-error">{error}</div>
      </section>
    )
  }

  const name = profile?.display_name || 'Мой канал'

  return (
    <section className="channel-page">
      <div className="channel-banner">
        {profile?.banner_url && (
          <img src={profile.banner_url} alt="Баннер канала" />
        )}
      </div>

      <div className="channel-heading">
        <div className="channel-avatar">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={name} />
            : name[0]?.toUpperCase() || '◉'}
        </div>

        <div className="channel-identity">
          <h2>{name}</h2>
          <span>@{profile?.username || 'username не задан'}</span>
          <small>{videos.length} видео</small>
        </div>

        <button className="primary-button" onClick={onEditProfile}>
          Редактировать канал
        </button>
      </div>

      {profile?.bio && (
        <div className="channel-description">
          <h3>О канале</h3>
          <p
            style={{
              display: descriptionExpanded ? 'block' : '-webkit-box',
              WebkitLineClamp: descriptionExpanded ? 'unset' : 1,
              WebkitBoxOrient: 'vertical',
              overflow: descriptionExpanded ? 'visible' : 'hidden',
            }}
          >
            {profile.bio}
          </p>
          {profile.bio.length > 80 && (
            <button
              className="channel-description-toggle"
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            >
              {descriptionExpanded ? 'Свернуть' : 'Развернуть'}
            </button>
          )}
        </div>
      )}

      {profile?.social_links?.length > 0 && (
        <div className="channel-socials">
          {profile.social_links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noreferrer"
            >
              {link.platform}
            </a>
          ))}
        </div>
      )}

      <div className="channel-videos">
        <h3>Видео</h3>

        {videos.length === 0 ? (
          <div className="channel-empty">
            <div>▶</div>
            <h3>Пока нет опубликованных видео</h3>
            <p>Когда ты опубликуешь видео, оно появится здесь.</p>
          </div>
        ) : (
          <div className="channel-video-grid">
            {videos.map(video => (
              <article className="channel-video-card" key={video.id}>
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} />
                ) : (
                  <video src={video.video_url} controls preload="metadata" />
                )}
                <h4>{video.title}</h4>
                <p>{new Date(video.created_at).toLocaleDateString('ru-RU')}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
