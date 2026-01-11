'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

export default function BroadcastListener() {
  const supabase = createClient()

  useEffect(() => {
    // Listen for NEW rows in the 'broadcasts' table
    const channel = supabase
      .channel('public:broadcasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts' },
        (payload) => {
          // Play a sound (optional) and show the toast
          const msg = payload.new.message
          
          toast(msg, {
            icon: '📢',
            duration: 6000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.5)', // Gold border
              color: 'white',
              fontWeight: 'bold',
              padding: '16px',
              fontSize: '1.2rem',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
            },
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // This component doesn't render anything visible
  return null
}