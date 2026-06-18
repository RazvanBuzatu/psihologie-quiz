import { TYPE_LABEL } from '../labels'

const CH_COLORS = ['var(--ch1)', 'var(--ch2)', 'var(--ch3)', 'var(--ch4)', 'var(--ch5)']

function chapterStats(questions, answers, chapterId) {
  const qs = questions.filter(q => q.chapter === chapterId)
  const answered = qs.filter(q => answers[q.id])
  const correct  = answered.filter(q => answers[q.id].correct).length
  // Distinct question types present, in a stable order
  const typesPresent = ['multiple_choice', 'true_false', 'multi_select']
    .filter(t => qs.some(q => q.type === t))
  return {
    total: qs.length,
    answered: answered.length,
    correct,
    pct: answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0,
    typesPresent,
  }
}

export default function HomeScreen({
  chapters, allQuestions, answers, missedCount, theme, onToggleTheme,
  onStartChapter, onStartAll, onStartReview, onResetChapter, onClearMissed, onResetAll,
}) {
  const total         = allQuestions.length
  const answeredTotal = Object.keys(answers).length

  const confirmReset = (msg, fn) => { if (window.confirm(msg)) fn() }

  return (
    <div className="screen">
      <div className="home-top">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Schimbă tema"
          title="Schimbă tema (luminos/întunecat)"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="home-hero slide-up">
        <span className="emoji">🧠</span>
        <h1>Psihologie Quiz</h1>
        <p>Licență 2026 · {total} întrebări</p>
      </div>

      <div className="stats-row slide-up">
        <div className="stat-card">
          <div className="num" style={{ color: 'var(--primary-text)' }}>{answeredTotal}</div>
          <div className="lbl">Răspunse</div>
          <div className="sub">din {total}</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: missedCount > 0 ? 'var(--error-text)' : 'var(--success-text)' }}>
            {missedCount}
          </div>
          <div className="lbl">De revăzut</div>
          <div className="sub">{missedCount > 0 ? 'întrebări greșite' : 'nimic de revăzut'}</div>
        </div>
      </div>

      <button className="all-btn slide-up" onClick={onStartAll}>
        <span style={{ fontSize: '1.7rem' }}>🎯</span>
        <div>
          <div className="ab-title">Toate întrebările</div>
          <div className="ab-sub">
            {answeredTotal > 0 && answeredTotal < total
              ? `Continuă · ${total - answeredTotal} rămase`
              : `${total} întrebări amestecate`}
          </div>
        </div>
      </button>

      {missedCount > 0 && (
        <button className="missed-btn slide-up" onClick={onStartReview}>
          <span style={{ fontSize: '1.7rem' }}>📌</span>
          <div>
            <div className="mb-title">Revizuire greșeli</div>
            <div className="mb-sub">{missedCount} întrebări de revăzut</div>
          </div>
        </button>
      )}

      <div className="section-label">Capitole</div>
      <div className="chapter-list">
        {chapters.map((ch, idx) => {
          const s = chapterStats(allQuestions, answers, ch.id)
          const color = CH_COLORS[idx % CH_COLORS.length]
          const started  = s.answered > 0
          const complete = s.answered >= s.total

          return (
            <div
              key={ch.id}
              className="chapter-card"
              onClick={() => onStartChapter(ch.id)}
              style={{ borderLeftColor: color }}
              role="button"
              tabIndex={0}
            >
              <div className="ch-info">
                <div className="ch-title">{ch.short}</div>

                <div className="ch-progress-row">
                  <div className="ch-bar">
                    <div
                      className="ch-bar-fill"
                      style={{ width: `${(s.answered / s.total) * 100}%`, background: color }}
                    />
                  </div>
                  <span className="ch-progress-text">
                    {started
                      ? `${s.answered}/${s.total} · ${s.pct}% corect`
                      : `${s.total} întrebări`}
                  </span>
                </div>

                <div className="ch-tags">
                  {complete && <span className="ch-tag" style={{ color: 'var(--success-text)', borderColor: 'var(--success-solid)' }}>✓ Finalizat</span>}
                  {s.typesPresent.map(t => (
                    <span key={t} className="ch-tag">{TYPE_LABEL[t]}</span>
                  ))}
                </div>
              </div>

              {started && (
                <button
                  className="ch-reset"
                  aria-label="Resetează capitolul"
                  title="Reia capitolul de la început"
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmReset(`Resetezi progresul pentru „${ch.short}"?`, () => onResetChapter(ch.id))
                  }}
                >
                  ↺
                </button>
              )}
              <span className="ch-arrow">›</span>
            </div>
          )
        })}
      </div>

      {answeredTotal > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 22 }}>Gestionează progresul</div>
          <div className="footer-actions">
            {missedCount > 0 && (
              <button
                className="btn btn-ghost"
                onClick={() => confirmReset('Golești lista de întrebări de revăzut? Întrebările greșite nu vor mai fi marcate.', onClearMissed)}
              >
                🧹 Golește lista „De revăzut”
              </button>
            )}
            <button
              className="btn btn-ghost danger"
              onClick={() => confirmReset('Ștergi TOT progresul? Această acțiune nu poate fi anulată.', onResetAll)}
            >
              ♻️ Resetează tot progresul
            </button>
          </div>
        </>
      )}

      <p className="credit">
        Facultatea de Psihologie și Științele Educației Brașov · 2026
      </p>
    </div>
  )
}
