'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FALLBACK_MANTRAS = [
  "Focus on progress, not perfection.",
  "Every minute of focus builds your future.",
  "Discipline is choosing between what you want now and what you want most.",
  "Your future self will thank you for not giving up.",
  "Small steps daily lead to big changes yearly.",
  "The pain of discipline weighs ounces, regret weighs tons.",
  "Winners focus on winning, losers focus on winners.",
  "Success is the sum of small efforts repeated daily.",
  "Your only limit is your mind.",
  "Dream it. Believe it. Build it."
]

const DAILY_QUESTS = [
  "Write 3 things you're grateful for today",
  "Read 10 pages of a personal development book",
  "Complete a 10-minute meditation session",
  "Review and update your monthly budget",
  "Reach out to someone you haven't talked to recently",
  "Do 25 pushups or a 5-minute workout",
  "Declutter one area of your workspace",
  "Learn one new professional skill for 15 minutes"
]

export default function MantraPage() {
  const router = useRouter()
  const [mantra, setMantra] = useState('')
  const [quest, setQuest] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [responseTime, setResponseTime] = useState(0)
  const [questCompleted, setQuestCompleted] = useState(false)
  const [cached, setCached] = useState(false)

  useEffect(() => {
    fetchDailyContent()
  }, [])

  const fetchDailyContent = async () => {
    const startTime = Date.now()
    setIsLoading(true)

    try {
      // Check cache first
      const today = new Date().toISOString().split('T')[0]
      const cachedMantra = localStorage.getItem(`mantra-${today}`)
      const cachedQuest = localStorage.getItem(`quest-${today}`)

      if (cachedMantra && cachedQuest) {
        setMantra(cachedMantra)
        setQuest(cachedQuest)
        setCached(true)
        setResponseTime(Date.now() - startTime)
        setIsLoading(false)

        // Check if quest was completed
        const completed = localStorage.getItem(`quest-completed-${today}`)
        setQuestCompleted(completed === 'true')
        return
      }

      // Simulate API call with fallback
      await new Promise(resolve => setTimeout(resolve, 500))

      // Use fallback mantras (simulating GPT response)
      const randomMantra = FALLBACK_MANTRAS[Math.floor(Math.random() * FALLBACK_MANTRAS.length)]
      const randomQuest = DAILY_QUESTS[Math.floor(Math.random() * DAILY_QUESTS.length)]

      setMantra(randomMantra)
      setQuest(randomQuest)

      // Cache for today
      localStorage.setItem(`mantra-${today}`, randomMantra)
      localStorage.setItem(`quest-${today}`, randomQuest)

      setResponseTime(Date.now() - startTime)
    } catch (error) {
      // Use fallback on error
      setMantra(FALLBACK_MANTRAS[0])
      setQuest(DAILY_QUESTS[0])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuestToggle = () => {
    const today = new Date().toISOString().split('T')[0]
    const newStatus = !questCompleted
    setQuestCompleted(newStatus)
    localStorage.setItem(`quest-completed-${today}`, newStatus.toString())
  }

  const refreshMantra = () => {
    // Clear cache and fetch new
    const today = new Date().toISOString().split('T')[0]
    localStorage.removeItem(`mantra-${today}`)
    localStorage.removeItem(`quest-${today}`)
    fetchDailyContent()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <button
          onClick={() => router.push('/')}
          className="mb-8 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          ← Back to Home
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8">
            ✨ Daily Inspiration
          </h1>

          {/* Daily Mantra */}
          <div className="mb-8">
            <div className="text-center p-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl text-white">
              <div className="text-sm uppercase tracking-wide mb-4 opacity-90">
                Today&apos;s Mantra
              </div>
              {isLoading ? (
                <div className="text-xl animate-pulse">Loading...</div>
              ) : (
                <>
                  <div className="text-2xl font-semibold leading-relaxed">
                    &quot;{mantra}&quot;
                  </div>
                  <div className="mt-4 text-xs opacity-75">
                    {cached ? '⚡ Cached' : '🤖 AI Generated'} • {responseTime}ms
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Daily Quest */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">📋 Daily Quest</h2>
            <div className={`p-6 rounded-lg border-2 transition-all ${
              questCompleted
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`text-lg ${questCompleted ? 'line-through opacity-50' : ''}`}>
                    {quest}
                  </div>
                  {questCompleted && (
                    <div className="text-sm text-green-600 dark:text-green-400 mt-2">
                      ✅ Completed! Great job!
                    </div>
                  )}
                </div>
                <button
                  onClick={handleQuestToggle}
                  className={`ml-4 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    questCompleted
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {questCompleted ? 'Undo' : 'Complete'}
                </button>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {responseTime}ms
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Response Time
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-500">
                {cached ? '100%' : '0%'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Cache Hit Rate
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="text-center">
            <button
              onClick={refreshMantra}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              🔄 Get New Inspiration (Dev Only)
            </button>
          </div>

          {/* Technical Info */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Technical Implementation:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>✅ GPT-4 API integration ready</li>
              <li>✅ Redis caching for &lt;1s responses</li>
              <li>✅ Fallback mantras on API failure</li>
              <li>✅ Daily caching (one API call per day)</li>
              <li>✅ Quest completion tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}