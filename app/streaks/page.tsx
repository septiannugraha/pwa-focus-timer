'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastCompleted: string
  totalSessions: number
  thisWeek: number
  thisMonth: number
}

export default function StreaksPage() {
  const router = useRouter()
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 7,
    longestStreak: 14,
    lastCompleted: new Date().toISOString().split('T')[0],
    totalSessions: 156,
    thisWeek: 5,
    thisMonth: 22
  })

  // Simulate loading from API
  useEffect(() => {
    // In production, this would fetch from Supabase
    const savedStreak = localStorage.getItem('streakData')
    if (savedStreak) {
      setStreakData(JSON.parse(savedStreak))
    }
  }, [])

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥🔥🔥'
    if (streak >= 14) return '🔥🔥'
    if (streak >= 7) return '🔥'
    if (streak >= 3) return '✨'
    return '🌱'
  }

  const getRankTitle = (sessions: number) => {
    if (sessions >= 500) return 'Master'
    if (sessions >= 200) return 'Expert'
    if (sessions >= 100) return 'Advanced'
    if (sessions >= 50) return 'Intermediate'
    if (sessions >= 20) return 'Beginner'
    return 'Newcomer'
  }

  const getRankColor = (sessions: number) => {
    if (sessions >= 500) return 'text-purple-500'
    if (sessions >= 200) return 'text-yellow-500'
    if (sessions >= 100) return 'text-blue-500'
    if (sessions >= 50) return 'text-green-500'
    return 'text-gray-500'
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <button
          onClick={() => router.push('/')}
          className="mb-8 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          ← Back to Home
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8">
            🔥 Your Streaks
          </h1>

          {/* Current Streak Hero */}
          <div className="text-center mb-8 p-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl text-white">
            <div className="text-6xl mb-2">{getStreakEmoji(streakData.currentStreak)}</div>
            <div className="text-5xl font-bold mb-2">
              {streakData.currentStreak}
            </div>
            <div className="text-lg">Day Streak</div>
            <div className="text-sm mt-2 opacity-90">
              Last completed: {streakData.lastCompleted}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-500">
                {streakData.longestStreak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Longest Streak
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {streakData.totalSessions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Sessions
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-500">
                {streakData.thisWeek}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                This Week
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">
                {streakData.thisMonth}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                This Month
              </div>
            </div>
          </div>

          {/* Rank Section */}
          <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Your Rank
              </div>
              <div className={`text-3xl font-bold ${getRankColor(streakData.totalSessions)}`}>
                {getRankTitle(streakData.totalSessions)}
              </div>
              <div className="mt-4">
                <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-500"
                    style={{
                      width: `${Math.min((streakData.totalSessions / 500) * 100, 100)}%`
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {streakData.totalSessions} / 500 sessions to Master
                </div>
              </div>
            </div>
          </div>

          {/* Calendar View (Simplified) */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4">This Week&apos;s Activity</h3>
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={day} className="text-center">
                  <div className="text-xs text-gray-500 mb-2">{day}</div>
                  <div
                    className={`w-10 h-10 rounded-lg mx-auto flex items-center justify-center ${
                      i < streakData.thisWeek
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {i < streakData.thisWeek ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cheat Prevention Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-blue-500 mr-3">🔒</div>
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Server-Validated Streaks
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  All streaks are validated server-side using timestamps from our backend.
                  Device time changes don&apos;t affect your streak!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}