'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker registered:', registration)
        },
        (error) => {
          console.log('Service Worker registration failed:', error)
        }
      )
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('Install prompt outcome:', outcome)
      setDeferredPrompt(null)
    }
  }

  if (!mounted) return null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-4xl font-bold text-center">
            🎯 Focus Timer Pro
          </h1>

          <p className="text-center text-gray-600 dark:text-gray-400 max-w-md">
            Build better habits with focus sessions, streaks, and daily motivation.
            A Progressive Web App that works offline.
          </p>

          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              📱 Install App
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">⏱️ Focus Timer</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                25/50/custom minute sessions that survive app closing
              </p>
              <button
                onClick={() => router.push('/timer')}
                className="text-blue-500 hover:underline"
              >
                Start Timer →
              </button>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">🔥 Streaks</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Server-validated streak tracking, no cheating possible
              </p>
              <button
                onClick={() => router.push('/streaks')}
                className="text-blue-500 hover:underline"
              >
                View Streaks →
              </button>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">✨ Daily Mantra</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                AI-powered motivation, cached for instant loading
              </p>
              <button
                onClick={() => router.push('/mantra')}
                className="text-blue-500 hover:underline"
              >
                Get Inspired →
              </button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold mb-4">Features</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div>✅ OAuth Authentication</div>
              <div>✅ Stripe Subscriptions</div>
              <div>✅ Offline Support</div>
              <div>✅ Background Timer</div>
              <div>✅ GPT-4 Integration</div>
              <div>✅ Cheat Prevention</div>
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-500">
            <a
              href="https://github.com/septiannugraha/pwa-focus-timer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}