import { useState } from 'react'
import './App.css'

const sections = [
  { id: 'home', icon: '⌂', name: 'Главная' },
  { id: 'clips', icon: '▶', name: 'Клипы' },
  { id: 'subs', icon: '♡', name: 'Подписки' },
  { id: 'library', icon: '▤', name: 'Библиотека' },
  { id: 'profile', icon: '◉', name: 'Профиль' },
]

function App() {
  const [active, setActive] = useState('home')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Для тебя')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [video, setVideo] = useState(null)

  const current = sections.find(item => item.id === active)

  function chooseVideo(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('Выбери видеофайл')
      return
    }

    setVideo({
      name: file.name,
      url: URL.createObjectURL(file)
    })
  }

  function goTo(id) {
    setActive(id)
    setUploadOpen(false)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => goTo('home')}>
          <div className="brand-icon">V</div>
          <span>Vexa<span className="brand-light">Tube</span></span>
        </div>

        <div className="search">
          <span>⌕</span>
          <input
            placeholder="Поиск видео..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}>×</button>
          )}
        </div>

        <button className="upload" onClick={() => setUploadOpen(true)}>
          <span>＋</span> <span className="upload-label">Создать</span>
        </button>

        <button className="avatar" onClick={() => goTo('profile')}>◉</button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          {sections.map(item => (
            <button
              key={item.id}
              className={active === item.id ? 'nav-item selected' : 'nav-item'}
              onClick={() => goTo(item.id)}
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
                {active === 'home'
                  ? 'Смотри. Создавай. Делись.'
                  : current?.name}
              </h1>
              <p>Открывай новые видео и создавай собственную историю.</p>
            </div>
            <div className="welcome-symbol">V</div>
          </div>

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

          {search ? (
            <section className="empty">
              <div className="empty-icon">⌕</div>
              <h2>Поиск: {search}</h2>
              <p>Пока нет опубликованных видео для поиска.</p>
              <button className="primary-button" onClick={() => setSearch('')}>
                Очистить поиск
              </button>
            </section>
          ) : (
            <section className="empty">
              <div className="empty-icon">
                {active === 'clips' ? '▶' : active === 'profile' ? '◉' : '▣'}
              </div>

              <h2>
                {active === 'home' && 'Здесь пока тихо'}
                {active === 'clips' && 'Твои клипы появятся здесь'}
                {active === 'subs' && 'Подписки ждут тебя'}
                {active === 'library' && 'Твоя библиотека'}
                {active === 'profile' && 'Твой профиль'}
              </h2>

              <p>
                {active === 'home' && 'Когда появятся настоящие видео, они будут здесь.'}
                {active === 'clips' && 'Здесь будут короткие видео в оригинальном формате VexaTube.'}
                {active === 'subs' && 'Здесь будут видео авторов, на которых ты подпишешься.'}
                {active === 'library' && 'Здесь будут сохранённые и просмотренные видео.'}
                {active === 'profile' && 'Здесь будут твой канал, видео и настройки профиля.'}
              </p>

              <button className="primary-button" onClick={() => setUploadOpen(true)}>
                ＋ Загрузить видео
              </button>

              <span className="empty-note">
                VexaTube только начинает свою историю
              </span>
            </section>
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
            onClick={() => goTo(item.id)}
          >
            <span>{item.icon}</span>
            <small>{item.name}</small>
          </button>
        ))}
      </nav>

      {uploadOpen && (
        <div className="modal-backdrop" onClick={() => setUploadOpen(false)}>
          <div className="upload-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setUploadOpen(false)}>×</button>
            <h2>📤 Загрузка видео</h2>
            <p>Выбери видео из галереи своего телефона.</p>

            <label className="file-picker">
              <span>＋</span>
              <strong>Выбрать видео</strong>
              <small>Нажми, чтобы открыть файлы телефона</small>
              <input type="file" accept="video/*" onChange={chooseVideo} />
            </label>

            {video && (
              <div className="video-preview">
                <video src={video.url} controls />
                <strong>{video.name}</strong>
                <p>Предварительный просмотр выбранного видео</p>
              </div>
            )}

            <button className="primary-button modal-done" onClick={() => setUploadOpen(false)}>
              Готово
            </button>
            <small className="modal-note">
              Пока это локальный предпросмотр. Публикация появится после подключения сервера.
            </small>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
