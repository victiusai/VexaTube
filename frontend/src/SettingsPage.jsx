import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function SettingsPage({ user }) {
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function changePassword(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (password.length < 8) {
      setError('Новый пароль должен содержать минимум 8 символов.')
      return
    }

    if (password !== repeatPassword) {
      setError('Пароли не совпадают.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setPassword('')
    setRepeatPassword('')
    setMessage('Пароль успешно изменён.')
  }

  return (
    <section className="settings-page">
      <div className="settings-section">
        <h2>Аккаунт</h2>
        <div className="settings-row">
          <span>Электронная почта</span>
          <strong>{user.email}</strong>
        </div>
      </div>

      <form className="settings-section" onSubmit={changePassword}>
        <h2>Безопасность</h2>
        <p>Измени пароль для защиты своего аккаунта.</p>

        <label>
          Новый пароль
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Минимум 8 символов"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>

        <label>
          Повтори новый пароль
          <input
            type="password"
            value={repeatPassword}
            onChange={e => setRepeatPassword(e.target.value)}
            placeholder="Повтори пароль"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-message">{message}</div>}

        <button className="primary-button" disabled={loading}>
          {loading ? 'Сохраняем...' : 'Изменить пароль'}
        </button>
      </form>

      <div className="settings-section">
        <h2>О приложении</h2>
        <div className="settings-row">
          <span>Название</span>
          <strong>VexaTube</strong>
        </div>
        <div className="settings-row">
          <span>Версия</span>
          <strong>1.0.0</strong>
        </div>
      </div>
    </section>
  )
}
