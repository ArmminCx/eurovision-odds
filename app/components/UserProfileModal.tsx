'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/app/context/LanguageContext'

// ⚠️ YOUR ADMIN ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'

export default function UserProfileModal({ userId, onClose }: { userId: string, onClose: () => void }) {
  const supabase = createClient()
  const { t } = useLanguage()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      // Fetch user data from our Magic Leaderboard View
      const { data } = await supabase
        .from('global_leaderboard')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      setStats(data || { user_id: userId, events_played: 0, total_score: 0 })
      setLoading(false)
    }
    fetchStats()
  }, [userId])

  // --- BADGE LOGIC ---
  const getBadges = () => {
    const badges = []
    
    // 1. ADMIN BADGE
    if (userId === ADMIN_ID) {
      badges.push({ label: t.badge_admin, icon: "👑", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500" })
    }

    // 2. VETERAN (Played 3+ events)
    if (stats?.events_played >= 3) {
      badges.push({ label: t.badge_veteran, icon: "🎖️", color: "bg-purple-500/20 text-purple-400 border-purple-500" })
    }

    // 3. ORACLE (Score > 15)
    if (stats?.total_score >= 15) {
      badges.push({ label: t.badge_oracle, icon: "🔮", color: "bg-blue-500/20 text-blue-400 border-blue-500" })
    }

    // 4. NEWBIE (Default)
    if (badges.length === 0 && !loading) {
      badges.push({ label: t.badge_newbie, icon: "🌱", color: "bg-green-500/20 text-green-400 border-green-500" })
    }

    return badges
  }

  if (!userId) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass w-full max-w-sm p-6 rounded-2xl border border-white/20 relative transform transition-all scale-100" onClick={(e) => e.stopPropagation()}>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">✕</button>

        {loading ? (
          <div className="p-8 text-center text-gray-500">{t.loading}</div>
        ) : (
          <div className="flex flex-col items-center">
            
            {/* AVATAR */}
            <div className="relative mb-4">
              {stats?.avatar_url ? (
                <img src={stats.avatar_url} className="w-24 h-24 rounded-full border-4 border-white/10 shadow-xl" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-purple-900 flex items-center justify-center text-4xl shadow-xl">👤</div>
              )}
              {userId === ADMIN_ID && <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold border-2 border-black">ADMIN</div>}
            </div>

            {/* NAME */}
            <h2 className="text-2xl font-bold text-white mb-1">{stats?.username || 'Unknown User'}</h2>
            <p className="text-xs text-gray-400 font-mono mb-6 truncate max-w-[200px]">{userId}</p>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                <div className="text-2xl font-bold text-pink-400">{stats?.total_score || 0}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">{t.stat_score}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats?.events_played || 0}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">{t.stat_events}</div>
              </div>
            </div>

            {/* BADGES */}
            <div className="w-full">
              <h3 className="text-sm font-bold text-gray-300 mb-3 border-b border-white/10 pb-1">{t.badges}</h3>
              <div className="flex flex-wrap gap-2">
                {getBadges().map((badge, i) => (
                  <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${badge.color}`}>
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}