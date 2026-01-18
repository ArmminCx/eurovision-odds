'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation' 

type TickerItem = {
  id: number
  text: string
}

export default function ActivityTicker() {
  const pathname = usePathname()
  const supabase = createClient()
  
  const [items, setItems] = useState<TickerItem[]>([])
  const [countries, setCountries] = useState<any[]>([]) 
  
  const queueRef = useRef<string[]>([])
  const isProcessingRef = useRef(false)
  const hasInited = useRef(false)

  // --- HOOKS MUST RUN EVERY TIME (Do not put 'if' returns above them) ---

  // 1. FETCH COUNTRIES ON MOUNT
  useEffect(() => {
    async function getCountries() {
        const { data } = await supabase.from('countries').select('id, name')
        if (data) setCountries(data)
    }
    getCountries()
  }, [])

  // 2. Add Welcome Message (Once)
  useEffect(() => {
    if (!hasInited.current) {
      hasInited.current = true
      addToQueue("🚀 Welcome to the Eurovision Market! Bets & Predictions are LIVE.")
    }
  }, [])

  const addToQueue = (msg: string) => {
    queueRef.current.push(msg)
    processQueue()
  }

  const processQueue = () => {
    if (isProcessingRef.current) return
    if (queueRef.current.length === 0) return

    isProcessingRef.current = true

    const nextMsg = queueRef.current.shift()
    if (nextMsg) {
      const newItem = { id: Date.now(), text: nextMsg }
      setItems(prev => [...prev, newItem])

      setTimeout(() => {
        isProcessingRef.current = false
        processQueue()
      }, 4000) // 4 seconds spacing

      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== newItem.id))
      }, 16000) // 16s lifetime
    } else {
        isProcessingRef.current = false
    }
  }

  // 3. LISTENERS
  useEffect(() => {
    if (countries.length === 0) return

    const getCountryName = (id: number) => countries.find(x => x.id === id)?.name || "a country"
    const channel = supabase.channel('ticker_feed')
      
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) => {
        const countryName = getCountryName(payload.new.country_id)
        addToQueue(`🔥 Someone just bet on ${countryName}!`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ratings' }, (payload) => {
        const countryName = getCountryName(payload.new.country_id)
        const user = payload.new.username || "Someone"
        const score = payload.new.score
        addToQueue(`⭐ ${user} rated ${countryName} ${score}/10`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_rankings' }, async (payload) => {
        const user = payload.new.username || "A user"
        const { data } = await supabase.from('national_finals').select('name').eq('id', payload.new.final_id).single()
        const eventName = data?.name || "an event"
        addToQueue(`🔮 ${user} just submitted predictions for ${eventName}!`)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [countries])

  // 4. CALENDAR CHECKS
  useEffect(() => {
    const checkEvents = async () => {
      const { data: events } = await supabase.from('national_finals').select('*')
      if (!events) return
      const now = new Date()
      events.forEach(event => {
        if (!event.event_date) return
        const eventDate = new Date(event.event_date)
        const isToday = eventDate.toDateString() === now.toDateString()
        if (isToday) {
           let hoursUntil = 0
           if (event.event_time && event.event_time.includes(':')) {
             const [hours] = event.event_time.split(':')
             const eventHour = parseInt(hours)
             const currentHour = now.getHours()
             hoursUntil = eventHour - currentHour
           }
           if (hoursUntil > 0 && hoursUntil <= 4) {
             addToQueue(`⚠️ ${event.name} starts in ${hoursUntil} hours!`)
           } else if (hoursUntil <= 0 && hoursUntil > -4) {
             addToQueue(`🔴 ${event.name} is LIVE NOW!`)
           }
        }
      })
    }
    const interval = setInterval(checkEvents, 60000)
    return () => clearInterval(interval)
  }, [])

  // --- 5. CONDITIONAL RENDER (Must be AFTER all hooks) ---
  if (pathname?.startsWith('/epicvision')) {
      return null
  }

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-black/90 backdrop-blur-md border-t border-white/20 z-[100] flex items-center overflow-hidden pointer-events-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="relative w-full h-full">
        {items.map((item) => (
          <div key={item.id} className="animate-fly top-1.5 flex items-center gap-2">
            <span className="text-pink-500 text-lg">•</span> 
            <span className="text-xs font-mono font-bold text-gray-200">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}