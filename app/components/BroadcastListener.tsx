'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
// FIXED IMPORT: Now points to 'sounds' (plural)
import { playSound } from '@/app/utils/sounds'

export default function BroadcastListener() {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('public:broadcasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts' },
        (payload) => {
          // 1. Play the "Ding" sound
          playSound('broadcast') 
          
          const msg = payload.new.message
          
          // 2. Show the fancy notification
          toast(msg, {
            icon: '📢',
            duration: 6000,
            style: {
              background: 'rgba(0, 0, 0, 0.9)', 
              backdropFilter: 'blur(10px)',
              border: '2px solid #fbbf24', // Gold border
              color: 'white',
              fontWeight: 'bold',
              padding: '16px',
              fontSize: '1.2rem',
              boxShadow: '0 0 30px rgba(251, 191, 36, 0.4)'
            },
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}