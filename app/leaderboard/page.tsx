'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'

export default function LeaderboardPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getLeaders() {
      const { data } = await supabase.from('global_leaderboard').select('*').order('total_score', { ascending: false })
      if (data) setLeaders(data)
      setLoading(false)
    }
    getLeaders()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* NAV */}
        <div className="relative flex justify-center gap-4 md:gap-6 mb-8 border-b border-gray-700 pb-4 flex-wrap">
          <Link href="/" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_betting}</Link>
          <Link href="/epicstory" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_stream}</Link>
          <Link href="/calendar" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="px-4 py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-lg md:text-xl transition">{t.nav_leaderboard}</Link>
          
          <button onClick={toggleLanguage} className="absolute right-0 top-0 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xl px-3 py-1 rounded-full transition">
            {lang === 'en' ? '🇺🇸' : '🇷🇺'}
          </button>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">{t.championship}</h1>
          <p className="text-gray-400">{t.total_points}</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 bg-black/20 text-gray-400 font-bold text-sm uppercase tracking-wider">
            <div className="col-span-2 text-center">{t.rank}</div>
            <div className="col-span-6">{t.user}</div>
            <div className="col-span-2 text-center">{t.events}</div>
            <div className="col-span-2 text-right">{t.points}</div>
          </div>

          {loading ? <div className="p-8 text-center text-gray-500">{t.loading_scores}</div> : 
           leaders.length === 0 ? <div className="p-8 text-center text-gray-500">{t.no_scores}</div> : (
            <div className="divide-y divide-gray-700">
              {leaders.map((user, index) => {
                const rank = index + 1
                let rowClass = "hover:bg-gray-700/50 transition"
                let rankDisplay = <span className="font-mono text-gray-500">#{rank}</span>
                
                if (rank === 1) { rowClass = "bg-yellow-900/10 hover:bg-yellow-900/20"; rankDisplay = <span className="text-3xl">🥇</span> }
                else if (rank === 2) { rowClass = "bg-slate-800/50 hover:bg-slate-800/80"; rankDisplay = <span className="text-3xl">🥈</span> }
                else if (rank === 3) { rowClass = "bg-orange-900/10 hover:bg-orange-900/20"; rankDisplay = <span className="text-3xl">🥉</span> }

                return (
                  <div key={user.user_id} className={`grid grid-cols-12 gap-4 p-4 items-center ${rowClass}`}>
                    <div className="col-span-2 text-center font-bold">{rankDisplay}</div>
                    <div className="col-span-6 flex items-center gap-3">
                      {user.avatar_url ? <img src={user.avatar_url} className={`w-10 h-10 rounded-full border-2 ${rank === 1 ? 'border-yellow-500' : 'border-gray-600'}`} /> : <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center text-lg">👤</div>}
                      <div className="font-bold text-white truncate">{user.username || 'Unknown'}</div>
                    </div>
                    <div className="col-span-2 text-center"><span className="bg-gray-900 text-gray-400 px-2 py-1 rounded text-xs font-bold border border-gray-700">{user.events_played}</span></div>
                    <div className="col-span-2 text-right"><span className={`text-xl font-bold ${rank === 1 ? 'text-yellow-400' : 'text-purple-400'}`}>{user.total_score}</span></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}