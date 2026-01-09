'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
    <div className="min-h-screen p-2 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* NAV */}
        <div className="relative flex overflow-x-auto md:flex-wrap md:justify-center gap-4 mb-4 md:mb-8 border-b border-white/20 pb-4 no-scrollbar">
          <Link href="/" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_betting}</Link>
          
          <Link href="/epicstory" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition flex items-center gap-2">
            <Image src="/twitch.png" alt="Twitch" width={24} height={24} className="w-5 h-5 md:w-6 md:h-6" />
            {t.nav_stream}
          </Link>
          
          <Link href="/calendar" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-sm md:text-xl transition">{t.nav_leaderboard}</Link>
          <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
        </div>
        <div className="md:hidden flex justify-end mb-4"><button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button></div>

        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 mb-2">{t.championship}</h1>
          <p className="text-gray-400 text-sm md:text-base">{t.total_points}</p>
        </div>

        <div className="glass rounded-xl border border-white/10 shadow-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 border-b border-white/10 bg-black/20 text-gray-400 font-bold text-xs md:text-sm uppercase tracking-wider">
            <div className="col-span-2 text-center">{t.rank}</div>
            <div className="col-span-6">{t.user}</div>
            <div className="col-span-2 text-center">{t.events}</div>
            <div className="col-span-2 text-right">{t.points}</div>
          </div>

          {loading ? <div className="p-8 text-center text-gray-500">{t.loading_scores}</div> : 
           leaders.length === 0 ? <div className="p-8 text-center text-gray-500">{t.no_scores}</div> : (
            <div className="divide-y divide-white/10">
              {leaders.map((user, index) => {
                const rank = index + 1
                let rowClass = "hover:bg-white/5 transition"
                let rankDisplay = <span className="font-mono text-gray-500">#{rank}</span>
                
                if (rank === 1) { rowClass = "bg-yellow-900/20 hover:bg-yellow-900/30"; rankDisplay = <span className="text-2xl md:text-3xl">🥇</span> }
                else if (rank === 2) { rowClass = "bg-slate-800/50 hover:bg-slate-800/80"; rankDisplay = <span className="text-2xl md:text-3xl">🥈</span> }
                else if (rank === 3) { rowClass = "bg-orange-900/20 hover:bg-orange-900/30"; rankDisplay = <span className="text-2xl md:text-3xl">🥉</span> }

                return (
                  <div key={user.user_id} className={`grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 items-center ${rowClass}`}>
                    <div className="col-span-2 text-center font-bold">{rankDisplay}</div>
                    <div className="col-span-6 flex items-center gap-2 md:gap-3">
                      {user.avatar_url ? <img src={user.avatar_url} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 ${rank === 1 ? 'border-yellow-500' : 'border-gray-600'}`} /> : <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-900 flex items-center justify-center text-sm md:text-lg">👤</div>}
                      <div className="font-bold text-white text-xs md:text-base truncate">{user.username || 'Unknown'}</div>
                    </div>
                    <div className="col-span-2 text-center"><span className="bg-white/10 text-gray-300 px-2 py-1 rounded text-[10px] md:text-xs font-bold">{user.events_played}</span></div>
                    <div className="col-span-2 text-right"><span className={`text-lg md:text-xl font-bold ${rank === 1 ? 'text-yellow-400' : 'text-pink-400'}`}>{user.total_score}</span></div>
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