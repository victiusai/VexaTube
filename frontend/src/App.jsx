import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import ProfileEditor from './ProfileEditor.jsx'
import ChannelPage from './ChannelPage.jsx'
import SettingsPage from './SettingsPage.jsx'
import UploadStudio from './UploadStudio.jsx'
import PremiumPage from './PremiumPage.jsx'
import './App.css'

const sections = [
  { id: 'home', icon: '⌂', name: 'Главная' },
  { id: 'clips', icon: '▶', name: 'Клипы' },
  { id: 'subs', icon: '♡', name: 'Подписки' },
  { id: 'library', icon: '▤', name: 'Библиотека' },
  { id: 'premium', icon: '♛', name: 'Premium' },
  { id: 'profile', icon: '◉', name: 'Профиль' },
]

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const [active, setActive] = useState('home')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Для тебя')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [accountProfile, setAccountProfile] = useState(null)

  useEffect(() => {
    if (!user?.id) {
      setAccountProfile(null)
      return
    }

    let active = true

    async function loadAccountProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (active && !error) {
        setAccountProfile(data)
      }
    }

    loadAccountProfile()

    return () => {
      active = false
    }
  }, [user?.id, active])

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message)
      setUser(data?.session?.user ?? null)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleAuth(event) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (password.length < 8) {
      setAuthError('Пароль должен содержать минимум 8 символов.')
      return
    }

    setAuthLoading(true)

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        if (data.session) {
          setUser(data.session.user)
        } else {
          setAuthMessage('Регистрация создана! Проверь почту и перейди по ссылке подтверждения.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error
        setUser(data.user)
      }
    } catch (error) {
      setAuthError(error.message || 'Не удалось выполнить операцию.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
      return
    }

    setUser(null)
    setActive('home')
  }


  function goTo(id) {
    setActive(id)
    setUploadOpen(false)
  }

  const current = sections.find(item => item.id === active)

  if (checking) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <img className="brand-icon" src="/vexatube-logo.png" alt="VexaTube" />
          <h2>VexaTube</h2>
          <p>Подключаем твой аккаунт...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo">
            <img className="brand-icon" src="/vexatube-logo.png" alt="VexaTube" />
            <span>Vexa<span className="brand-light">Tube</span></span>
          </div>

          <div className="auth-heading">
            <span className="auth-eyebrow">ТВОЁ ВИДЕОПРОСТРАНСТВО</span>
            <h1>{authMode === 'login' ? 'С возвращением!' : 'Создай аккаунт'}</h1>
            <p>
              {authMode === 'login'
                ? 'Войди, чтобы продолжить смотреть и создавать видео.'
                : 'Присоединяйся к сообществу VexaTube.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              Электронная почта
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Пароль
              <input
                type="password"
                placeholder="Минимум 8 символов"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                required
              />
            </label>

            {authError && <div className="auth-error">{authError}</div>}
            {authMessage && <div className="auth-message">{authMessage}</div>}

            <button className="auth-submit" type="submit" disabled={authLoading}>
              {authLoading
                ? 'Подожди...'
                : authMode === 'login'
                  ? 'Войти в аккаунт'
                  : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login')
                setAuthError('')
                setAuthMessage('')
              }}
            >
              {authMode === 'login' ? 'Создать аккаунт' : 'Войти'}
            </button>
          </div>

          <div className="auth-security">
            🔒 Твои данные защищены
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => goTo('home')}>
          <img className="brand-icon" src="/vexatube-logo.png" alt="VexaTube" />
          <span>Vexa<span className="brand-light">Tube</span></span>
        </div>

        <div className="search">
          <span>⌕</span>
          <input
            placeholder="Поиск видео..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}>×</button>}
        </div>

        <button className="upload" onClick={() => setUploadOpen(true)}>
          ＋ <span className="upload-label">Создать</span>
        </button>

        <button
          className="avatar"
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          aria-label="Меню аккаунта"
          aria-expanded={accountMenuOpen}
        >
          {accountProfile?.avatar_url ? (
            <img src={accountProfile.avatar_url} alt="" />
          ) : (
            (accountProfile?.display_name || user.email || '◉')[0].toUpperCase()
          )}
        </button>
      </header>

      {accountMenuOpen && (
        <div className="account-menu-backdrop" onClick={() => setAccountMenuOpen(false)}>
          <section className="account-menu" onClick={e => e.stopPropagation()}>
            <div className="account-menu-user">
              <div className="account-menu-avatar">
                {accountProfile?.avatar_url ? (
                  <img src={accountProfile.avatar_url} alt="" />
                ) : (
                  (accountProfile?.display_name || user.email || '◉')[0].toUpperCase()
                )}
              </div>
              <div>
                <strong>{accountProfile?.display_name || 'Мой канал'}</strong>
                <span>@{accountProfile?.username || 'username не задан'}</span>
                <small>{user.email}</small>
              </div>
            </div>

            <div className="account-menu-divider" />

            <button onClick={() => { setAccountMenuOpen(false); goTo('premium') }}>
              <span>♛</span> VexaTube Premium
            </button>
            <button onClick={() => { setAccountMenuOpen(false); goTo('channel') }}>
              <span>◉</span> Зайти на канал
            </button>
            <button onClick={() => { setAccountMenuOpen(false); goTo('profile') }}>
              <span>✎</span> Редактировать профиль
            </button>
            <button onClick={() => { setAccountMenuOpen(false); goTo('settings') }}>
              <span>⚙</span> Настройки
            </button>

            <div className="account-menu-divider" />

            <button onClick={async () => {
              setAccountMenuOpen(false)
              setEmail('')
              setPassword('')
              setAuthMode('login')
              await handleLogout()
            }}>
              <span>⇄</span> Сменить аккаунт
            </button>
            <button onClick={() => { setAccountMenuOpen(false); goTo('home') }}>
              <span>▶</span> VexaTube
            </button>
          </section>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          {sections.map(item => (
            <button
              key={item.id}
              className={active === item.id ? 'nav-item selected' : 'nav-item'}
              onClick={() => {
                if (item.id === 'profile') {
                  setAccountMenuOpen(true)
                } else {
                  goTo(item.id)
                }
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}

          <div className="sidebar-bottom">
            <span>VexaTube</span>
            <small>Новая видеоплатформа</small>
          </div>
        </aside>

        <main className="main">
          <div className="welcome">
            <div>
              <div className="eyebrow">ТВОЁ ВИДЕОПРОСТРАНСТВО</div>
              <h1>
                {active === 'home' ? 'Смотри. Создавай. Делись.' : current?.name}
              </h1>
              <p>Открывай новые видео и создавай собственную историю.</p>
            </div>
            <div className="welcome-symbol">V</div>
          </div>

          {active === 'premium' ? (
            <PremiumPage user={user} />
          ) : active === 'channel' ? (
            <ChannelPage
              user={user}
              onEditProfile={() => goTo('profile')}
            />
          ) : active === 'settings' ? (
            <SettingsPage user={user} />
          ) : active === 'profile' ? (
            <ProfileEditor user={user} onLogout={handleLogout} />
          ) : (
            <>
              <div className="filters">
                {['Для тебя', 'Новое', 'Популярное'].map(name => (
                  <button
                    key={name}
                    onClick={() => setFilter(name)}
                    className={filter === name ? 'filter active-filter' : 'filter'}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <section className="empty">
                <div className="empty-icon">
                  {active === 'clips' ? '▶' : active === 'subs' ? '♡' : active === 'library' ? '▤' : '▣'}
                </div>
                <h2>
                  {active === 'home' && 'Здесь пока тихо'}
                  {active === 'clips' && 'Твои клипы появятся здесь'}
                  {active === 'subs' && 'Подписки ждут тебя'}
                  {active === 'library' && 'Твоя библиотека'}
                </h2>
                <p>
                  {active === 'home' && 'Когда появятся опубликованные видео, они будут здесь.'}
                  {active === 'clips' && 'Здесь будут короткие видео VexaTube.'}
                  {active === 'subs' && 'Здесь будут видео авторов, на которых ты подпишешься.'}
                  {active === 'library' && 'Здесь будут сохранённые и просмотренные видео.'}
                </p>
                <button className="primary-button" onClick={() => setUploadOpen(true)}>
                  ＋ Загрузить видео
                </button>
                <span className="empty-note">VexaTube только начинает свою историю</span>
              </section>
            </>
          )}

          <footer>
            © 2026 VexaTube
            <span>Создано для нового поколения видео</span>
          </footer>
        </main>
      </div>

      <nav className="mobile-nav">
        {sections.map(item => (
          <button
            key={item.id}
            className={active === item.id ? 'mobile-item mobile-active' : 'mobile-item'}
            onClick={() => {
              if (item.id === 'profile') {
                setAccountMenuOpen(true)
              } else {
                goTo(item.id)
              }
            }}
          >
            <span>{item.icon}</span>
            <small>{item.name}</small>
          </button>
        ))}
      </nav>

      {uploadOpen && (
        <UploadStudio
          user={user}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  )
}

export default App
