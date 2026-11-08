import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './PremiumPage.css'

const plans = [
  {
    id: 'monthly',
    name: 'На месяц',
    description: 'Попробуй все преимущества Premium',
    price: 'Цена скоро',
    period: '30 дней',
  },
  {
    id: 'yearly',
    name: 'На год',
    description: 'Максимум возможностей на весь год',
    price: 'Цена скоро',
    period: '365 дней',
    popular: true,
  },
  {
    id: 'lifetime',
    name: 'Навсегда',
    description: 'Единственная покупка без продления',
    price: 'Цена скоро',
    period: 'Бессрочно',
  },
]

function PremiumPage({ user }) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('yearly')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSubscription() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('status, plan, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        setError(
          error.code === '42P01' || error.code === 'PGRST205'
            ? 'Таблица подписок ещё не создана в Supabase.'
            : error.message
        )
      } else {
        setSubscription(data)
      }

      setLoading(false)
    }

    if (user?.id) loadSubscription()

    return () => {
      mounted = false
    }
  }, [user?.id])

  const isPremium =
    subscription?.status === 'active' &&
    (
      !subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date()
    )

  return (
    <div className="premium-page">
      <section className="premium-hero">
        <div className="premium-crown">♛</div>

        <div className="premium-eyebrow">
          VEXATUBE EXCLUSIVE
        </div>

        <h1>
          VexaTube <span>Premium</span>
        </h1>

        <p>
          Больше возможностей. Больше свободы.
          Совершенно новый уровень просмотра видео.
        </p>

        <div className="premium-status">
          {loading
            ? 'Проверяем подписку...'
            : isPremium
              ? '✦ ТВОЯ ПОДПИСКА PREMIUM АКТИВНА'
              : 'ОТКРОЙ МИР PREMIUM'}
        </div>
      </section>

      <section className="premium-benefits">
        <h2>Твои преимущества</h2>

        <div className="premium-benefit-grid">
          <article>
            <span>◈</span>
            <h3>Без рекламы</h3>
            <p>Комфортный просмотр без рекламных вставок VexaTube.</p>
          </article>

          <article>
            <span>↓</span>
            <h3>Офлайн-видео</h3>
            <p>Скачивание доступных видео для просмотра без интернета.</p>
          </article>

          <article>
            <span>✧</span>
            <h3>Эксклюзивный стиль</h3>
            <p>Особые оформления и золотой значок Premium.</p>
          </article>

          <article>
            <span>♛</span>
            <h3>Особый статус</h3>
            <p>Выделяйся среди пользователей VexaTube.</p>
          </article>

          <article>
            <span>▣</span>
            <h3>Расширенная библиотека</h3>
            <p>Больше возможностей для организации контента.</p>
          </article>

          <article>
            <span>⚡</span>
            <h3>Premium-возможности</h3>
            <p>Доступ к дополнительным функциям платформы.</p>
          </article>
        </div>
      </section>

      <section className="premium-plans">
        <div className="premium-section-heading">
          <span>ВЫБЕРИ СВОЙ УРОВЕНЬ</span>
          <h2>Тарифы Premium</h2>
          <p>Выбери подходящий вариант подписки.</p>
        </div>

        <div className="premium-plan-list">
          {plans.map(plan => (
            <button
              key={plan.id}
              className={`premium-plan ${
                selectedPlan === plan.id ? 'plan-selected' : ''
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <div className="plan-radio">
                {selectedPlan === plan.id ? '●' : '○'}
              </div>

              <div className="plan-info">
                <strong>{plan.name}</strong>
                <span>{plan.description}</span>
              </div>

              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>

              {plan.popular && (
                <span className="plan-popular">ПОПУЛЯРНЫЙ</span>
              )}
            </button>
          ))}
        </div>

        {isPremium ? (
          <div className="premium-active-card">
            <strong>✦ Premium подключён!</strong>
            <p>
              {subscription.plan === 'lifetime'
                ? 'У тебя бессрочная подписка.'
                : 'Твой Premium-статус активен.'}
            </p>
          </div>
        ) : (
          <button
            className="premium-buy-button"
            disabled
          >
            Скоро будет доступна оплата
          </button>
        )}

        <p className="premium-payment-note">
          Безопасная оплата появится после подключения платёжной системы.
          Выбранный тариф пока не списывает деньги.
        </p>

        {error && (
          <div className="premium-error">
            {error}
          </div>
        )}
      </section>

      <div className="premium-footer">
        VexaTube Premium · Твой новый уровень
      </div>
    </div>
  )
}

export default PremiumPage
