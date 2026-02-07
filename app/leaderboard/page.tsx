'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/app/context/LanguageContext'
import UserProfileModal from '@/app/components/UserProfileModal'

//⚠️ YOUR ADMIN ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'

export default function LeaderboardPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    async function getLeaders() {
      setLoading(true)
      
      // 1. Fetch Leaderboard (Ranked by Points)
      const { data: scoreData } = await supabase
        .from('global_leaderboard')
        .select('*')
        .order('total_score', { ascending: false })

      // 2. Fetch Token Balances
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('user_id, current_balance')

      if (scoreData) {
        // 3. Merge Tokens into Leaderboard Data
        const mergedData = scoreData.map(user => {
            const balanceInfo = balanceData?.find(b => b.user_id === user.user_id)
            return {
                ...user,
                // Default to 5 if not found in balance view
                token_balance: balanceInfo ? balanceInfo.current_balance : 5 
            }
        })
        setLeaders(mergedData)
      }
      setLoading(false)
    }
    getLeaders()
  }, [])

  return (
    <div className="min-h-screen p-2 md:p-8">
      
      {/* PROFILE MODAL */}
      {selectedUser && <UserProfileModal userId={selectedUser} onClose={() => setSelectedUser(null)} />}

      <div className="max-w-5xl mx-auto">
        
        {/* NAV (Epicvision Removed) */}
        <div className="relative flex justify-center gap-4 md:gap-6 mb-8 border-b border-white/20 pb-4 flex-wrap">
          <Link href="/" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_betting}</Link>
          <Link href="/epicstory" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition flex items-center gap-2"><Image src="/twitch.png" alt="Twitch" width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 object-contain" />{t.nav_stream}</Link>
          <Link href="/tv" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_tv}</Link>
          <Link href="/calendar" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_predict}</Link>
          {/* Active Tab */}
          <Link href="/leaderboard" className="px-4 py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-lg md:text-xl transition">{t.nav_leaderboard}</Link>
          
          <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
        </div>
        <div className="md:hidden flex justify-end mb-4"><button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button></div>

        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 mb-2">{t.championship}</h1>
          <p className="text-gray-400 text-sm md:text-base">{t.total_points}</p>

          <div className="mt-6 inline-block bg-gradient-to-r from-yellow-600/20 to-yellow-900/20 border border-yellow-500/50 rounded-lg px-6 py-3 shadow-[0_0_15px_rgba(234,179,8,0.2)] max-w-lg mx-auto">
            <p className="text-yellow-200 font-bold text-sm md:text-base animate-pulse">
              {t.prize_message}
            </p>
          </div>
        </div>

        <div className="glass rounded-xl border border-white/10 shadow-xl overflow-hidden">
          {/* HEADER ROW */}
          <div className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 border-b border-white/10 bg-black/20 text-gray-400 font-bold text-xs md:text-sm uppercase tracking-wider">
            <div className="col-span-1 text-center">{t.rank}</div>
            <div className="col-span-5">{t.user}</div>
            <div className="col-span-2 text-center">{t.events}</div>
            <div className="col-span-2 text-center text-green-400">{t.col_tokens}</div>
            <div className="col-span-2 text-right text-pink-400">{t.points}</div>
          </div>

          {loading ? <div className="p-8 text-center text-gray-500">{t.loading_scores}</div> : 
           leaders.length === 0 ? <div className="p-8 text-center text-gray-500">{t.no_scores}</div> : (
            <div className="divide-y divide-white/10">
              {leaders.map((user, index) => {
                const rank = index + 1
                let rowClass = "hover:bg-white/5 transition cursor-pointer"
                let rankDisplay = <span className="font-mono text-gray-500">#{rank}</span>
                
                if (rank === 1) { rowClass = "bg-yellow-900/20 hover:bg-yellow-900/30 cursor-pointer"; rankDisplay = <span className="text-2xl md:text-3xl">🥇</span> }
                else if (rank === 2) { rowClass = "bg-slate-800/50 hover:bg-slate-800/80 cursor-pointer"; rankDisplay = <span className="text-2xl md:text-3xl">🥈</span> }
                else if (rank === 3) { rowClass = "bg-orange-900/20 hover:bg-orange-900/30 cursor-pointer"; rankDisplay = <span className="text-2xl md:text-3xl">🥉</span> }

                return (
                  <div 
                    key={user.user_id} 
                    onClick={() => setSelectedUser(user.user_id)} 
                    className={`grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 items-center ${rowClass}`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 text-center font-bold">{rankDisplay}</div>
                    
                    {/* User */}
                    <div className="col-span-5 flex items-center gap-2 md:gap-3">
                      {user.avatar_url ? <img src={user.avatar_url} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 ${rank === 1 ? 'border-yellow-500' : 'border-gray-600'}`} /> : <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-900 flex items-center justify-center text-sm md:text-lg">👤</div>}
                      <div className="font-bold text-white text-xs md:text-base truncate">
                        {user.username || 'Unknown'}
                        {user.user_id === ADMIN_ID && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-400 px-1 rounded border border-yellow-500/50">👑</span>}
                      </div>
                    </div>

                    {/* Events */}
                    <div className="col-span-2 text-center"><span className="bg-white/10 text-gray-300 px-2 py-1 rounded text-[10px] md:text-xs font-bold">{user.events_played}</span></div>
                    
                    {/* Token Balance */}
                    <div className="col-span-2 text-center">
                        <span className="text-green-400 font-mono font-bold text-sm md:text-base">{user.token_balance} 🪙</span>
                    </div>

                    {/* Points */}
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