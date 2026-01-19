'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { playSound } from '@/app/utils/sounds'

export default function DailyRewardChecker() {
  const supabase = createClient()
  const hasChecked = useRef(false)

  useEffect(() => {
    async function checkRewardAndLocation() {
      if (hasChecked.current) return
      hasChecked.current = true

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // --- 1. DETECT & SAVE FULL COUNTRY NAME ---
      try {
        // CHANGED: 'country' -> 'country_name' to get "Norway" instead of "NO"
        const res = await fetch('https://ipapi.co/country_name/')
        if (res.ok) {
           const countryName = await res.text()
           // Save to Supabase
           await supabase.rpc('update_user_country', { country_code: countryName.trim() })
        }
      } catch (err) {
        console.log("Could not detect location")
      }

      // --- 2. CLAIM REWARD ---
      const { data: success, error } = await supabase.rpc('claim_daily_reward')

      if (error) {
        console.error("Daily Reward Error:", error)
        return
      }

      if (success) {
        playSound('success')
        confetti({
          particleCount: 150,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#FFD700', '#FBBF24']
        })
        
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-yellow-600 to-yellow-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <span className="text-3xl">🌞</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-white">Daily Login Bonus!</p>
                  <p className="text-sm text-yellow-100">
                    You received +1 Token for visiting today.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ), { duration: 5000 })
      }
    }

    checkRewardAndLocation()
  }, [])

  return null
}