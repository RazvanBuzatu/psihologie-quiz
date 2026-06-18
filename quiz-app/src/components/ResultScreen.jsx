export default function ResultScreen({
  results, missedTotal, isReviewMode,
  onHome, onReviewMissed, onRetry,
}) {
  if (!results) return null

  const total   = results.length
  const correct = results.filter(r => r.correct).length
  const wrong   = total - correct
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

  const emoji =
    pct >= 90 ? '🏆' :
    pct >= 70 ? '🎉' :
    pct >= 50 ? '📚' : '💪'

  const message =
    pct >= 90 ? 'Excelent! Ai stăpânit materia!' :
    pct >= 70 ? 'Bine! Continuă să exersezi.' :
    pct >= 50 ? 'Aproape! Mai mult antrenament.' :
    'Revizuiește și încearcă din nou!'

  return (
    <div className="screen">
      <div className="result-hero slide-up">
        <span className="result-emoji">{emoji}</span>
        <div className="score-circle">
          <span className="sc-pct">{pct}%</span>
          <span className="sc-lbl">Scor</span>
        </div>
        <h2 style={{ marginBottom: 6 }}>{message}</h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
          {correct} din {total} răspunsuri corecte
        </p>
      </div>

      <div className="result-summary slide-up">
        <div className="summary-row">
          <span className="sr-label">Întrebări în această sesiune</span>
          <span className="sr-value">{total}</span>
        </div>
        <div className="summary-row">
          <span className="sr-label">Corecte</span>
          <span className="sr-value good">{correct}</span>
        </div>
        <div className="summary-row">
          <span className="sr-label">Greșite</span>
          <span className="sr-value bad">{wrong}</span>
        </div>
        <div className="summary-row">
          <span className="sr-label">Total de revăzut</span>
          <span className="sr-value" style={{ color: missedTotal > 0 ? 'var(--error-text)' : 'var(--success-text)' }}>
            {missedTotal}
          </span>
        </div>
        {isReviewMode && correct > 0 && (
          <div className="summary-row">
            <span className="summary-note">✓ {correct} întrebări eliminate din lista de greșeli</span>
          </div>
        )}
      </div>

      <div className="result-actions slide-up">
        {missedTotal > 0 && (
          <button className="btn btn-error" onClick={onReviewMissed}>
            📌 Revizuiește greșelile ({missedTotal})
          </button>
        )}
        <button className="btn btn-outline" onClick={onRetry}>
          🔄 Repetă același set
        </button>
        <button className="btn btn-primary" onClick={onHome}>
          🏠 Meniu principal
        </button>
      </div>
    </div>
  )
}
