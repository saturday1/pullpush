import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useSubscription } from '../../../context/SubscriptionContext'
import { useCoachData, type CoachAnswer, type CoachHistoryItem } from '../../../hooks/useCoachData'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Skeleton from '../../Skeleton/Skeleton'
import styles from './Coach.module.scss'

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}

const INSIGHT_TYPE_CLASS: Record<string, string> = {
  progress: styles.insightTypeProgress,
  nutrition: styles.insightTypeNutrition,
  recovery: styles.insightTypeRecovery,
  tip: styles.insightTypeTip,
}

export default function Coach(): React.JSX.Element {
  const { t, i18n } = useTranslation()

  const INSIGHT_TYPE_LABEL: Record<string, string> = {
    progress: t('Progress'),
    nutrition: t('Nutrition'),
    recovery: t('Recovery'),
    tip: t('Tip'),
  }
  const { pathname } = useLocation()
  const isActive = pathname === '/coach'
  const { canUse, requireUpgrade } = useSubscription()

  const {
    summary,
    summaryLoading,
    summaryError,
    loadSummary,
    askQuestion,
    askLoading,
    askError,
    questionsUsed,
    questionsMax,
    history,
    historyLoading,
    loadHistory,
    loadQuestionCount,
  } = useCoachData(i18n.language)

  const [question, setQuestion] = useState('')
  const [lastAnswer, setLastAnswer] = useState<CoachAnswer | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const currentLang = i18n.language
  const [loadedLang, setLoadedLang] = useState<string | null>(null)

  useEffect(() => {
    if (!isActive || !canUse('aiCoach')) return
    if (loadedLang === currentLang) return
    setLoadedLang(currentLang)
    loadSummary()
    if (!hasLoaded) {
      setHasLoaded(true)
      loadQuestionCount()
    }
  }, [isActive, canUse, loadSummary, loadQuestionCount, currentLang, loadedLang, hasLoaded])

  const suggestedRow1 = [
    t('How do I break my plateau?'),
    t('Am I eating enough protein?'),
    t('Should I deload this week?'),
    t('How can I improve my recovery?'),
    t('What should I eat before training?'),
    t('How much water should I drink?'),
  ]
  const suggestedRow2 = [
    t('Is my training volume enough?'),
    t('How do I build more muscle?'),
    t('Should I change my program?'),
    t('How important is sleep for gains?'),
    t('Can I train with sore muscles?'),
    t('How do I stay motivated?'),
  ]

  async function handleAsk(q: string): Promise<void> {
    if (!q.trim() || askLoading) return
    try {
      const answer = await askQuestion(q.trim())
      setLastAnswer(answer)
      setQuestion('')
      if (showHistory) loadHistory()
    } catch {
      // error is set in hook
    }
  }

  // Premium gate
  if (!canUse('aiCoach')) {
    return (
      <section className={styles.container}>
        <SectionHeader number="09" title={t('AI Coach')} />
        <div className={styles.premiumGate}>
          <div className={styles.premiumIcon}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5h-2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1z"/><path d="M19.5 6.5h-2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1z"/><path d="M7.5 12h9"/><path d="M2 9.5v5M22 9.5v5"/><path d="M11 2l1 2.5L13 2"/><path d="M9 3.5l.75 1.5M15 3.5l-.75 1.5"/>
            </svg>
          </div>
          <p className={styles.premiumTitle}>{t('AI Coach')}</p>
          <p className={styles.premiumText}>
            {t('Get personalized training insights and coaching powered by AI. Available for Premium subscribers.')}
          </p>
          <button
            type="button"
            className={styles.premiumBtn}
            onClick={() => requireUpgrade('aiCoach')}
          >
            {t('Upgrade')}
          </button>
        </div>
      </section>
    )
  }

  // Loading skeleton
  if (summaryLoading && !summary) {
    return (
      <section className={styles.container}>
        <SectionHeader number="09" title={t('AI Coach')} />
        <div className={styles.skeletonCard}>
          <Skeleton height={16} width="50%" style={{ marginBottom: 16 }} />
          <Skeleton height={12} width="90%" style={{ marginBottom: 10 }} />
          <Skeleton height={12} width="80%" style={{ marginBottom: 10 }} />
          <Skeleton height={12} width="85%" style={{ marginBottom: 10 }} />
          <Skeleton height={12} width="70%" />
        </div>
        <div className={styles.skeletonInsights}>
          {[0, 1].map(i => (
            <div key={i} className={styles.skeletonInsightCard}>
              <Skeleton height={10} width="40%" style={{ marginBottom: 10 }} />
              <Skeleton height={14} width="70%" style={{ marginBottom: 8 }} />
              <Skeleton height={10} width="90%" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={styles.container}>
      <SectionHeader number="09" title={t('AI Coach')} />

      {/* Error state */}
      {summaryError && !summary && (
        <div className={styles.errorCard}>
          <p className={styles.errorText}>{summaryError}</p>
          <button type="button" className={styles.retryBtn} onClick={loadSummary}>
            {t('Try again')}
          </button>
        </div>
      )}

      {/* Weekly summary */}
      {summary && (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.summaryTitle}>
              <span className={styles.summaryIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                </svg>
              </span>
              {t('Weekly Summary')}
            </div>
            <ul className={styles.summaryList}>
              {summary.summary.map((item, i) => (
                <li key={i} className={styles.summaryItem} dangerouslySetInnerHTML={{ __html: formatMarkdown(item) }} />
              ))}
            </ul>
          </div>

          {/* Insight cards */}
          {summary.insights.length > 0 && (
            <div className={styles.insightsScroll}>
              {summary.insights.map((insight, i) => (
                <div key={i} className={styles.insightCard}>
                  <div className={`${styles.insightType} ${INSIGHT_TYPE_CLASS[insight.type] ?? ''}`}>
                    {INSIGHT_TYPE_LABEL[insight.type] ?? insight.type}
                  </div>
                  <div className={styles.insightTitle}>{insight.title}</div>
                  <div className={styles.insightBody} dangerouslySetInnerHTML={{ __html: formatMarkdown(insight.body) }} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* No data state */}
      {!summary && !summaryLoading && !summaryError && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16l4-8 4 4 4-6"/>
            </svg>
          </div>
          <p className={styles.emptyTitle}>{t('Not enough data yet')}</p>
          <p className={styles.emptyText}>
            {t('Train for at least 2 weeks and the AI Coach will generate personalized insights for you.')}
          </p>
        </div>
      )}

      {/* Ask the Coach */}
      <div className={styles.askSection}>
        <div className={styles.askTitle}>{t('Ask the Coach')}</div>

        {questionsUsed >= questionsMax ? (
          <div className={styles.limitReached}>
            <div className={styles.limitReachedIcon}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className={styles.limitReachedTitle}>{t('Weekly limit reached')}</p>
            <p className={styles.limitReachedText}>
              {t('You have used all {{max}} questions this week. New questions unlock next Monday.', { max: questionsMax })}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.marqueeWrap}>
              <div className={styles.marqueeTrack}>
                <div className={styles.marqueeSlide}>
                  {suggestedRow1.map((q, i) => (
                    <button key={i} type="button" className={styles.askChip} onClick={() => handleAsk(q)} disabled={askLoading}>{q}</button>
                  ))}
                </div>
                <div className={styles.marqueeSlide} aria-hidden>
                  {suggestedRow1.map((q, i) => (
                    <button key={`d-${i}`} type="button" className={styles.askChip} onClick={() => handleAsk(q)} disabled={askLoading}>{q}</button>
                  ))}
                </div>
              </div>
              <div className={`${styles.marqueeTrack} ${styles.marqueeReverse}`}>
                <div className={styles.marqueeSlide}>
                  {suggestedRow2.map((q, i) => (
                    <button key={i} type="button" className={styles.askChip} onClick={() => handleAsk(q)} disabled={askLoading}>{q}</button>
                  ))}
                </div>
                <div className={styles.marqueeSlide} aria-hidden>
                  {suggestedRow2.map((q, i) => (
                    <button key={`d-${i}`} type="button" className={styles.askChip} onClick={() => handleAsk(q)} disabled={askLoading}>{q}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.askInputRow}>
              <input
                type="text"
                className={styles.askInput}
                placeholder={t('Ask a question...')}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAsk(question) }}
                disabled={askLoading}
                maxLength={500}
              />
              <button
                type="button"
                className={styles.askBtn}
                onClick={() => handleAsk(question)}
                disabled={askLoading || !question.trim()}
              >
                {askLoading ? (
                  <span className={styles.askBtnDots}>
                    <span /><span /><span />
                  </span>
                ) : t('Ask')}
              </button>
            </div>

            <div className={styles.rateLimit}>
              {t('{{used}} of {{max}} questions this week', { used: questionsUsed, max: questionsMax })}
            </div>

            {askLoading && (
              <div className={styles.thinkingCard}>
                <div className={styles.thinkingDots}>
                  <span /><span /><span />
                </div>
                <span className={styles.thinkingText}>{t('AI Coach')} ...</span>
              </div>
            )}

            {askError && (
              <div className={styles.errorCard}>
                <p className={styles.errorText}>{askError}</p>
              </div>
            )}
          </>
        )}

        {lastAnswer && !askLoading && (
          <div className={styles.answerCard}>
            <div className={styles.answerLabel}>AI Coach</div>
            <div className={styles.answerText} dangerouslySetInnerHTML={{ __html: formatMarkdown(lastAnswer.answer) }} />
          </div>
        )}

        {/* History toggle */}
        <button
          type="button"
          className={styles.historyToggle}
          onClick={() => {
            const next = !showHistory
            setShowHistory(next)
            if (next && history.length === 0) loadHistory()
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {showHistory ? t('Hide history') : t('Show history')}
        </button>

        {showHistory && (
          <div className={styles.historySection}>
            {historyLoading && (
              <div className={styles.historyLoading}>
                <div className={styles.thinkingDots}><span /><span /><span /></div>
              </div>
            )}
            {!historyLoading && history.length === 0 && (
              <p className={styles.historyEmpty}>{t('No questions yet')}</p>
            )}
            {history.map(item => (
              <button
                key={item.id}
                type="button"
                className={`${styles.historyItem} ${expandedId === item.id ? styles.historyItemExpanded : ''}`}
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className={styles.historyHeader}>
                  <span className={styles.historyQuestion}>{item.question}</span>
                  <span className={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {expandedId === item.id && (
                  <div
                    className={styles.historyAnswer}
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(item.answer) }}
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
