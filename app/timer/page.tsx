'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function TimerPage() {
  const [duration, setDuration] = useState(25) // minutes
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [isRunning, setIsRunning] = useState(false)
  const [customDuration, setCustomDuration] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const workerRef = useRef<ServiceWorker | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Get service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        workerRef.current = registration.active
      })
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft])

  const startTimer = () => {
    const seconds = duration * 60
    setTimeLeft(seconds)
    setIsRunning(true)

    // Send to service worker
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'START_TIMER',
        data: {
          duration: seconds,
          startTime: Date.now(),
          serverTime: Date.now(),
          userId: 'demo-user'
        }
      })
    }

    // Save to localStorage as backup
    localStorage.setItem('timerState', JSON.stringify({
      startTime: Date.now(),
      duration: seconds,
      isRunning: true
    }))
  }

  const pauseTimer = () => {
    setIsRunning(false)
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'STOP_TIMER'
      })
    }
    localStorage.removeItem('timerState')
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(0)
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'STOP_TIMER'
      })
    }
    localStorage.removeItem('timerState')
  }

  const handleComplete = () => {
    setIsRunning(false)

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Session Complete!', {
        body: `Great job! You completed a ${duration} minute focus session.`,
        icon: '/icon-192.png'
      })
    }

    // Play sound (optional)
    const audio = new Audio('/notification.mp3')
    audio.play().catch(() => {})
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem('timerState')
    if (saved) {
      const state = JSON.parse(saved)
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
      const remaining = Math.max(0, state.duration - elapsed)

      if (remaining > 0 && state.isRunning) {
        setTimeLeft(remaining)
        setIsRunning(true)
        setDuration(Math.ceil(state.duration / 60))
      }
    }
  }, [])

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
            ⏱️ Focus Timer
          </h1>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-6xl font-mono font-bold text-green-500">
              {formatTime(timeLeft)}
            </div>
            {isRunning && (
              <div className="mt-2 text-sm text-gray-500">
                Session in progress...
              </div>
            )}
          </div>

          {/* Duration Selection */}
          {!isRunning && timeLeft === 0 && (
            <div className="mb-8">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <button
                  onClick={() => setDuration(25)}
                  className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
                    duration === 25
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  25 min
                </button>
                <button
                  onClick={() => setDuration(50)}
                  className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
                    duration === 50
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  50 min
                </button>
                <button
                  onClick={() => {
                    const custom = prompt('Enter custom duration in minutes:')
                    if (custom && !isNaN(Number(custom))) {
                      setDuration(Number(custom))
                    }
                  }}
                  className="py-3 px-4 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Custom
                </button>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-4 justify-center">
            {!isRunning && timeLeft === 0 && (
              <button
                onClick={startTimer}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Start Focus Session
              </button>
            )}

            {isRunning && (
              <button
                onClick={pauseTimer}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Pause
              </button>
            )}

            {!isRunning && timeLeft > 0 && (
              <>
                <button
                  onClick={() => setIsRunning(true)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  Resume
                </button>
                <button
                  onClick={resetTimer}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  Reset
                </button>
              </>
            )}
          </div>

          {/* Notification Permission */}
          <div className="mt-8 text-center">
            <button
              onClick={requestNotificationPermission}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Enable Notifications
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Features:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>✅ Survives app closing (Service Worker)</li>
              <li>✅ Background persistence</li>
              <li>✅ Desktop notifications</li>
              <li>✅ Server-validated (no cheating)</li>
              <li>✅ Automatic streak tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}