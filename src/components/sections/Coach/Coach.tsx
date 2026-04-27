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

const INSIGHT_TYPE_LABEL: Record<string, string> = {
  progress: 'Progress',
  nutrition: 'Nutrition',
  recovery: 'Recovery',
  tip: 'Tip',
}

export default function Coach(): React.JSX.Element {
  const { t } = useTranslation()
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
  } = useCoachData()

  const [question, setQuestion] = useState('')
  const [lastAnswer, setLastAnswer] = useState<CoachAnswer | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    if (!isActive || hasLoaded || !canUse('aiCoach')) return
    setHasLoaded(true)
    loadSummary()
  }, [isActive, hasLoaded, canUse, loadSummary])

  const suggestedQuestions = [
    t('How do I break my plateau?'),
    t('Am I eating enough protein?'),
    t('Should I deload this week?'),
    t('How can I improve my recovery?'),
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
          <div className={styles.premiumIcon}>🤖</div>
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
              <span className={styles.summaryIcon}>✨</span>
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
          <div className={styles.emptyIcon}>📊</div>
          <p className={styles.emptyTitle}>{t('Not enough data yet')}</p>
          <p className={styles.emptyText}>
            {t('Train for at least 2 weeks and the AI Coach will generate personalized insights for you.')}
          </p>
        </div>
      )}

      {/* Ask the Coach */}
      <div className={styles.askSection}>
        <div className={styles.askTitle}>{t('Ask the Coach')}</div>

        <div className={styles.askChips}>
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              className={styles.askChip}
              onClick={() => handleAsk(q)}
              disabled={askLoading}
            >
              {q}
            </button>
          ))}
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
