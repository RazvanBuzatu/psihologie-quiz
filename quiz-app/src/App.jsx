import { useState, useEffect } from 'react'
import questionsData from './data/questions.json'
import HomeScreen from './components/HomeScreen'
import QuizScreen from './components/QuizScreen'
import ResultScreen from './components/ResultScreen'

const STORAGE_KEY = 'psih_quiz_v3'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function loadStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { answers: data.answers || {}, theme: data.theme || null }
  } catch {
    return { answers: {}, theme: null }
  }
}

function initialTheme(saved) {
  if (saved === 'light' || saved === 'dark') return saved
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

const SAVED = loadStorage()

export default function App() {
  // answers: { [questionId]: { correct: boolean } }
  const [answers, setAnswers] = useState(SAVED.answers)
  const [theme,   setTheme]   = useState(() => initialTheme(SAVED.theme))

  const [screen, setScreen] = useState('home')
  const [quizQuestions, setQuizQuestions] = useState([])
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [sessionResults, setSessionResults] = useState([])

  const missedIds = Object.keys(answers).filter(id => answers[id] && !answers[id].correct)

  // Persist whenever answers or theme change — a single, idempotent write
  // that runs after render (safe under StrictMode, no side-effects in updaters).
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, theme }))
  }, [answers, theme])

  // Apply the theme to the document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  // Save every answer the moment it's given — survives mid-quiz exit.
  const recordAnswer = (questionId, correct) => {
    setAnswers(prev => ({ ...prev, [questionId]: { correct } }))
  }

  const startQuiz = (chapterId, reviewMode = false) => {
    const all = questionsData.questions
    let pool

    if (reviewMode) {
      pool = all.filter(q => missedIds.includes(q.id))
      if (pool.length === 0) return
    } else if (chapterId !== null) {
      const chapterQs  = all.filter(q => q.chapter === chapterId)
      const unanswered = chapterQs.filter(q => !answers[q.id])
      pool = unanswered.length > 0 ? unanswered : chapterQs  // resume, or replay if done
    } else {
      const unanswered = all.filter(q => !answers[q.id])
      pool = unanswered.length > 0 ? unanswered : all
    }

    setQuizQuestions(shuffle(pool))
    setIsReviewMode(reviewMode)
    setSessionResults([])
    setScreen('quiz')
  }

  const finishQuiz = (results) => {
    setSessionResults(results)
    setScreen('results')
  }

  // ── Reset controls ──
  const resetChapter = (chapterId) => {
    const ids = new Set(
      questionsData.questions.filter(q => q.chapter === chapterId).map(q => q.id)
    )
    setAnswers(prev => {
      const next = {}
      for (const [id, val] of Object.entries(prev)) if (!ids.has(id)) next[id] = val
      return next
    })
  }

  const clearMissed = () => {
    setAnswers(prev => {
      const next = {}
      for (const [id, val] of Object.entries(prev)) if (val.correct) next[id] = val
      return next
    })
  }

  const resetAll = () => setAnswers({})

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          chapters={questionsData.chapters}
          allQuestions={questionsData.questions}
          answers={answers}
          missedCount={missedIds.length}
          theme={theme}
          onToggleTheme={toggleTheme}
          onStartChapter={id => startQuiz(id, false)}
          onStartAll={()     => startQuiz(null, false)}
          onStartReview={()  => startQuiz(null, true)}
          onResetChapter={resetChapter}
          onClearMissed={clearMissed}
          onResetAll={resetAll}
        />
      )}
      {screen === 'quiz' && (
        <QuizScreen
          questions={quizQuestions}
          isReviewMode={isReviewMode}
          onAnswer={recordAnswer}
          onFinish={finishQuiz}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'results' && (
        <ResultScreen
          results={sessionResults}
          missedTotal={missedIds.length}
          isReviewMode={isReviewMode}
          onHome={() => setScreen('home')}
          onReviewMissed={() => startQuiz(null, true)}
          onRetry={() => {
            setQuizQuestions(shuffle(quizQuestions))
            setSessionResults([])
            setScreen('quiz')
          }}
        />
      )}
    </div>
  )
}
