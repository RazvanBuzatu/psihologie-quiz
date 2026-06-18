import { useState, useCallback } from 'react'
import { TYPE_LABEL } from '../labels'

function isCorrect(question, given) {
  const ans = question.answer
  if (question.type === 'multi_select') {
    const correct = new Set(Array.isArray(ans) ? ans : [ans])
    const givenSet = new Set(given)
    return correct.size === givenSet.size && [...correct].every(x => givenSet.has(x))
  }
  return String(ans).toLowerCase() === String(given).toLowerCase()
}

/* ── Multiple choice (single answer) ── */
function MCOptions({ question, onAnswer, submitted, givenAnswer }) {
  const correctLetter = String(question.answer).toLowerCase()
  return (
    <div className="options-list">
      {question.options.map(opt => {
        const letter = opt.letter.toLowerCase()
        let cls = 'option-btn'
        if (submitted) {
          if (letter === correctLetter) cls += ' correct'
          else if (letter === givenAnswer) cls += ' wrong'
        } else if (letter === givenAnswer) {
          cls += ' selected'
        }
        return (
          <button key={letter} className={cls} disabled={submitted}
                  onClick={() => !submitted && onAnswer(letter)}>
            <span className="option-letter">{letter}</span>
            <span>{opt.text}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── True / False ── */
function TFOptions({ question, onAnswer, submitted, givenAnswer }) {
  const correctAns = question.answer
  const getClass = (val) => {
    let cls = 'tf-btn'
    if (submitted) {
      if (val === correctAns) cls += ' correct'
      else if (val === givenAnswer) cls += ' wrong'
    } else if (val === givenAnswer) cls += ' selected-tf'
    return cls
  }
  return (
    <div className="tf-row">
      <button className={getClass('T')} disabled={submitted} onClick={() => !submitted && onAnswer('T')}>
        <span className="tf-emoji">✅</span><span>Adevărat</span>
      </button>
      <button className={getClass('F')} disabled={submitted} onClick={() => !submitted && onAnswer('F')}>
        <span className="tf-emoji">❌</span><span>Fals</span>
      </button>
    </div>
  )
}

/* ── Multi-select ── */
function MultiOptions({ question, onAnswer, submitted, givenAnswer }) {
  const [checked, setChecked] = useState(new Set())
  const correctSet = new Set(Array.isArray(question.answer) ? question.answer : [question.answer])

  const toggle = (letter) => {
    if (submitted) return
    setChecked(prev => {
      const next = new Set(prev)
      next.has(letter) ? next.delete(letter) : next.add(letter)
      return next
    })
  }

  return (
    <>
      <p className="ms-hint">Selectează una sau mai multe variante, apoi apasă Verifică.</p>
      <div className="options-list">
        {question.options.map(opt => {
          const letter = opt.letter.toLowerCase()
          const isChecked = checked.has(letter)
          const given = givenAnswer || []
          let cls = 'checkbox-opt'
          if (submitted) {
            if (correctSet.has(letter) && given.includes(letter)) cls += ' correct'
            else if (!correctSet.has(letter) && given.includes(letter)) cls += ' wrong'
            else if (correctSet.has(letter) && !given.includes(letter)) cls += ' missed'
          } else if (isChecked) cls += ' checked'

          return (
            <button key={letter} className={cls} disabled={submitted} onClick={() => toggle(letter)}>
              <span className="cb-box">{isChecked || (submitted && given.includes(letter)) ? '✓' : ''}</span>
              <span><strong>{letter})</strong> {opt.text}</span>
            </button>
          )
        })}
      </div>
      {!submitted && (
        <button className="btn btn-primary" onClick={() => checked.size > 0 && onAnswer([...checked])}
                disabled={checked.size === 0} style={{ marginBottom: 16 }}>
          Verifică răspunsul
        </button>
      )}
    </>
  )
}

/* ── Feedback banner ── */
function Feedback({ correct, question }) {
  if (correct) {
    return (
      <div className="feedback feedback-correct slide-up">
        <span className="fb-icon">✓</span><span>Corect!</span>
      </div>
    )
  }
  let detail = null
  if (question.type === 'true_false') {
    detail = <>Corect: <strong>{question.answer === 'T' ? 'Adevărat' : 'Fals'}</strong></>
  } else if (question.type === 'multi_select') {
    const arr = Array.isArray(question.answer) ? question.answer : [question.answer]
    detail = <>Corect: <strong>{arr.map(l => l.toUpperCase()).join(', ')}</strong></>
  } else {
    const opt = question.options.find(o => o.letter.toLowerCase() === String(question.answer).toLowerCase())
    detail = opt ? <>Corect: <strong>{opt.letter.toUpperCase()}. {opt.text}</strong></> : null
  }
  return (
    <div className="feedback feedback-wrong slide-up">
      <span className="fb-icon">✗</span>
      <span>Răspuns greșit. {detail}</span>
    </div>
  )
}

/* ── Main QuizScreen ── */
export default function QuizScreen({ questions, isReviewMode, onAnswer, onFinish, onBack }) {
  const [idx, setIdx] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [givenAnswer, setGivenAnswer] = useState(null)
  const [correct, setCorrect] = useState(null)
  const [results, setResults] = useState([])

  const question = questions[idx]
  const progress = (idx / questions.length) * 100
  const correctSoFar = results.filter(r => r.correct).length

  const handleAnswer = useCallback((given) => {
    if (submitted) return
    const ok = isCorrect(question, given)
    setGivenAnswer(given)
    setCorrect(ok)
    setSubmitted(true)
    setResults(prev => [...prev, { questionId: question.id, correct: ok }])
    onAnswer(question.id, ok)   // ← persists immediately
  }, [submitted, question, onAnswer])

  const handleNext = () => {
    if (idx < questions.length - 1) {
      setIdx(i => i + 1)
      setSubmitted(false)
      setGivenAnswer(null)
      setCorrect(null)
    } else {
      onFinish(results)
    }
  }

  if (!question) return null

  return (
    <div className="screen">
      <div className="quiz-header">
        <button className="back-btn" onClick={onBack} aria-label="Înapoi">‹</button>
        {results.length > 0 && <span className="quiz-score">✓ {correctSoFar}</span>}
        <div className="quiz-counter">
          {isReviewMode && '📌 '}{idx + 1} / {questions.length}
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="question-card slide-up" key={question.id}>
        <div className="question-type-badge">
          <span className="badge">{TYPE_LABEL[question.type]}</span>
        </div>
        <p className="question-text">{question.text}</p>
      </div>

      {question.type === 'multiple_choice' && (
        <MCOptions question={question} onAnswer={handleAnswer} submitted={submitted} givenAnswer={givenAnswer} />
      )}
      {question.type === 'true_false' && (
        <TFOptions question={question} onAnswer={handleAnswer} submitted={submitted} givenAnswer={givenAnswer} />
      )}
      {question.type === 'multi_select' && (
        <MultiOptions key={question.id} question={question} onAnswer={handleAnswer} submitted={submitted} givenAnswer={givenAnswer} />
      )}

      {submitted && <Feedback correct={correct} question={question} />}

      {submitted && (
        <button className={`btn slide-up ${correct ? 'btn-success' : 'btn-primary'}`} onClick={handleNext}>
          {idx < questions.length - 1 ? 'Întrebarea următoare →' : 'Vezi rezultatele'}
        </button>
      )}
    </div>
  )
}
