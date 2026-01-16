'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { User } from '@supabase/supabase-js'
import { useLanguage } from '@/app/context/LanguageContext'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

// ⚠️ YOUR ADMIN ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'

type ViewMode = 'LIST' | 'GAME' | 'STATS' | 'SPECTATE'

export default function PredictionsPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  
  // Data
  const [finals, setFinals] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [predictors, setPredictors] = useState<any[]>([])
  const [spectatorList, setSpectatorList] = useState<any[]>([])
  const [spectatorName, setSpectatorName] = useState('')

  // State
  const [view, setView] = useState<ViewMode>('LIST')
  const [selectedFinal, setSelectedFinal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gradingMode, setGradingMode] = useState(false) 

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      fetchFinals()
    }
    init()
  }, [])

  async function fetchFinals() {
    const { data } = await supabase.from('national_finals').select('*').order('created_at', { ascending: false })
    if (data) setFinals(data)
  }

  // --- NAVIGATION ---
  const openGame = (final: any) => { setSelectedFinal(final); loadGameData(final.id); setGradingMode(false); setView('GAME') }
  const openStats = (final: any, e: React.MouseEvent) => { e.stopPropagation(); setSelectedFinal(final); loadPredictors(final.id); setView('STATS') }
  const openSpectate = async (targetUserId: string, targetUserName: string) => {
    setLoading(true); setSpectatorName(targetUserName)
    const { data: rawParticipants } = await supabase.from('final_participants').select('*').eq('final_id', selectedFinal.id)
    const { data: targetRanking } = await supabase.from('user_rankings').select('*').eq('final_id', selectedFinal.id).eq('user_id', targetUserId).order('rank_position', { ascending: true })
    if (rawParticipants && targetRanking) {
      const sortedList: any[] = []
      targetRanking.forEach(rank => {
        const song = rawParticipants.find(p => p.id === rank.participant_id)
        if (song) sortedList.push({ ...song, user_rank: rank.rank_position }) 
      })
      setSpectatorList(sortedList); setView('SPECTATE')
    }
    setLoading(false)
  }

  // --- DATA LOADING ---
  const loadGameData = async (finalId: number) => {
    setLoading(true); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rawParticipants } = await supabase.from('final_participants').select('*').eq('final_id', finalId).order('actual_rank', { ascending: true, nullsFirst: false })
    if (!rawParticipants) { setLoading(false); return }
    if (user) {
      const { data: savedRankings } = await supabase.from('user_rankings').select('*').eq('user_id', user.id).eq('final_id', finalId).order('rank_position', { ascending: true })
      if (savedRankings && savedRankings.length > 0) {
        const sortedList: any[] = []
        const usedIds = new Set()
        savedRankings.forEach(rank => {
          const song = rawParticipants.find(p => p.id === rank.participant_id)
          if (song) { sortedList.push(song); usedIds.add(song.id) }
        })
        rawParticipants.forEach(p => { if (!usedIds.has(p.id)) sortedList.push(p) })
        setParticipants(sortedList)
      } else { setParticipants(rawParticipants) }
    } else { setParticipants(rawParticipants) }
    setLoading(false)
  }

  const loadPredictors = async (finalId: number) => {
    setLoading(true)
    const { data: results } = await supabase.from('final_participants').select('id, actual_rank').eq('final_id', finalId)
    const resultMap = new Map(); results?.forEach(r => { if(r.actual_rank) resultMap.set(r.id, r.actual_rank) })
    const hasResults = resultMap.size > 0
    const { data } = await supabase.from('user_rankings').select('user_id, username, avatar_url, created_at, participant_id, rank_position').eq('final_id', finalId)
    if (data) {
      const userMap = new Map()
      data.forEach(row => {
        if (!userMap.has(row.user_id)) userMap.set(row.user_id, { 
            user_id: row.user_id, 
            username: row.username, 
            avatar_url: row.avatar_url, 
            created_at: row.created_at, 
            score: 0, 
            isRanked: hasResults,
            displayRank: 0 
        })
        if (hasResults) {
          const actual = resultMap.get(row.participant_id)
          if (actual) {
            const diff = Math.abs(actual - row.rank_position)
            if (diff === 0) userMap.get(row.user_id).score += 3
            else if (diff === 1) userMap.get(row.user_id).score += 1
          }
        }
      })
      const list = Array.from(userMap.values())
      if (hasResults) {
        list.sort((a: any, b: any) => b.score - a.score)
        let currentRank = 1
        for (let i = 0; i < list.length; i++) {
            if (i > 0 && list[i].score === list[i-1].score) {
                list[i].displayRank = list[i-1].displayRank
            } else {
                currentRank = i + 1
                list[i].displayRank = currentRank
            }
        }
      } else {
        list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        list.forEach((item: any, i) => item.displayRank = i + 1)
      }
      setPredictors(list)
    }
    setLoading(false)
  }

  // --- ACTIONS ---
  const move = (index: number, direction: -1 | 1) => {
    const newItems = [...participants]; const target = index + direction
    if (target < 0 || target >= newItems.length) return
    const temp = newItems[index]; newItems[index] = newItems[target]; newItems[target] = temp
    setParticipants(newItems); setSaved(false)
  }

  const savePrediction = async () => {
    if (!user || !selectedFinal) return
    setLoading(true)
    if (user.id !== ADMIN_ID) {
      const { data: currentStatus } = await supabase.from('national_finals').select('status').eq('id', selectedFinal.id).single()
      if (currentStatus?.status !== 'open') {
        alert("⛔ VOTING CLOSED!")
        setLoading(false); setSelectedFinal({ ...selectedFinal, status: currentStatus?.status }); return
      }
    }
    const channel = supabase.channel('final_lock')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'national_finals', filter: `id=eq.${selectedFinal.id}` }, (payload) => {
        setSelectedFinal(payload.new)
      }).subscribe()

    await supabase.from('user_rankings').delete().eq('user_id', user.id).eq('final_id', selectedFinal.id)
    const avatar = user.user_metadata.avatar_url || user.user_metadata.picture
    const rows = participants.map((p, index) => ({ user_id: user.id, final_id: selectedFinal.id, participant_id: p.id, rank_position: index + 1, username: user.user_metadata.full_name, avatar_url: avatar }))
    const { error } = await supabase.from('user_rankings').insert(rows)
    if (!error) setSaved(true)
    setLoading(false)
    supabase.removeChannel(channel)
  }

  const handleDeleteFinal = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation()
    if (!confirm(`${t.delete_confirm} ${name}?`)) return
    await supabase.from('national_finals').delete().eq('id', id) // Cascade handles the rest
    window.location.reload()
  }

  const handleToggleStatus = async (e: React.MouseEvent, id: number, status: boolean) => {
    e.stopPropagation(); await supabase.from('national_finals').update({ is_open: !status }).eq('id', id); fetchFinals()
  }

  const handleCycleStatus = async (e: React.MouseEvent, id: number, currentStatus: string) => {
    e.stopPropagation()
    let nextStatus = 'locked'
    if (!currentStatus || currentStatus === 'locked') nextStatus = 'open'
    else if (currentStatus === 'open') nextStatus = 'closed'
    else if (currentStatus === 'closed') nextStatus = 'locked'
    await supabase.from('national_finals').update({ status: nextStatus }).eq('id', id)
    fetchFinals()
  }

  const handleUpdateResult = async (participantId: number, rankStr: string) => {
    const rank = parseInt(rankStr) || null
    const newParticipants = participants.map(p => p.id === participantId ? { ...p, actual_rank: rank } : p)
    setParticipants(newParticipants)
    await supabase.from('final_participants').update({ actual_rank: rank }).eq('id', participantId)
  }

  // --- NEW: AWARD PRIZES (ADMIN ONLY) ---
  const handleAwardPrizes = async () => {
    if (!confirm("Are you sure? This will give TOKENS to the top 5 users.")) return
    
    // Sort predictors by score to find Top 5
    // NOTE: Predictors list is already sorted by score in loadPredictors()
    const winners = predictors.slice(0, 5)
    
    if (winners.length === 0) {
        toast.error("No winners to award.")
        return
    }

    const prizes = [5, 4, 3, 2, 1] // 1st=5, 2nd=4...
    
    for (let i = 0; i < winners.length; i++) {
        const winner = winners[i]
        const amount = prizes[i] || 1 // Fallback to 1 if > 5th place (shouldn't happen with slice)
        
        await supabase.from('token_rewards').insert({
            user_id: winner.user_id,
            amount: amount,
            reason: `${selectedFinal.name} #${i+1}`
        })
    }
    
    toast.success(`🎁 Awarded tokens to ${winners.length} winners!`)
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } })
  }

  return (
    <div className="min-h-screen p-2 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* NAV */}
        <div className="relative flex overflow-x-auto md:flex-wrap md:justify-center gap-4 md:gap-6 mb-4 md:mb-8 border-b border-white/20 pb-4 no-scrollbar">
          <Link href="/" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_betting}</Link>
          <Link href="/epicstory" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition flex items-center gap-2"><Image src="/twitch.png" alt="Twitch" width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 object-contain" />{t.nav_stream}</Link>
          <Link href="/tv" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_tv}</Link>
          <Link href="/calendar" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-sm md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_leaderboard}</Link>
          <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
        </div>
        <div className="md:hidden flex justify-end mb-4"><button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button></div>

        {/* VIEW 1: LIST */}
        {view === 'LIST' && (
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">{t.select_final}</h1>
            {finals.length === 0 && <p className="text-center text-gray-500">{t.no_finals}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finals.map(final => {
                const isAdmin = user?.id === ADMIN_ID; 
                const status = final.status || 'locked'
                const canEnter = status === 'open' || isAdmin 
                
                let badgeColor = "bg-orange-500 text-black"
                let badgeText = t.status_locked
                if (status === 'open') { badgeColor = "bg-green-500 text-black"; badgeText = t.status_open }
                else if (status === 'closed') { badgeColor = "bg-red-600 text-white"; badgeText = t.status_closed }

                return (
                  <div key={final.id} onClick={() => canEnter && openGame(final)} className={`relative glass p-4 md:p-6 rounded-xl transition flex items-center gap-4 group shadow-lg ${canEnter ? 'hover:bg-white/5 cursor-pointer border border-white/10 hover:border-pink-500' : 'opacity-60 cursor-not-allowed border border-white/5'}`}>
                    <img src={`https://flagcdn.com/w80/${final.country_code.toLowerCase()}.png`} className="w-12 h-8 rounded object-cover shadow-sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg md:text-xl font-bold group-hover:text-pink-300 block">{final.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${badgeColor}`}>{badgeText}</span>
                      </div>
                      <span className="text-xs text-gray-400">{final.event_time}</span>
                    </div>
                    
                    <button onClick={(e) => openStats(final, e)} className="w-10 h-10 rounded-full bg-blue-900/50 hover:bg-blue-600 text-blue-200 flex items-center justify-center transition z-20 border border-blue-700/50">📊</button>
                    
                    {isAdmin && (
                      <div className="flex gap-2 ml-2">
                        <button onClick={(e) => handleCycleStatus(e, final.id, status)} className="w-8 h-8 rounded-full flex items-center justify-center font-bold border bg-gray-700 hover:bg-gray-600">{status === 'open' ? '🔓' : status === 'locked' ? '🟠' : '🔒'}</button>
                        <button onClick={(e) => handleDeleteFinal(e, final.id, final.name)} className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-red-900/50 text-white">✕</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: GAME */}
        {view === 'GAME' && (
          <div>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/60 backdrop-blur-lg py-4 z-10 border-b border-white/20 px-2 rounded-xl">
              <div className="flex gap-2">
                <button onClick={() => setView('LIST')} className="text-gray-300 hover:text-white font-bold text-sm">{t.change_final}</button>
                {user?.id === ADMIN_ID && <button onClick={() => setGradingMode(!gradingMode)} className={`ml-4 text-xs px-2 py-1 rounded font-bold border ${gradingMode ? 'bg-yellow-600 text-black border-yellow-500' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>{gradingMode ? t.admin_grading_on : t.admin_grading}</button>}
              </div>
              {!gradingMode && ((selectedFinal?.status === 'open') || user?.id === ADMIN_ID) ? (
                <button onClick={savePrediction} disabled={loading || saved} className={`px-4 py-2 md:px-6 rounded-lg font-bold transition shadow-lg text-sm md:text-base ${saved ? 'bg-green-600 text-white' : 'bg-pink-600 hover:bg-pink-500 text-white'}`}>{loading ? t.saving : saved ? t.saved : t.save}</button>
              ) : (
                <div className="px-4 py-2 bg-red-900/50 text-red-200 rounded-lg font-bold border border-red-800 flex items-center gap-2">🔒 {selectedFinal?.status === 'locked' ? t.status_locked : t.locked}</div>
              )}
            </div>
            
            <div className="space-y-3 pb-20">
              {participants.map((p, index) => (
                <div key={p.id} className="glass flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-pink-500/30 transition">
                  <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-400">#{index+1}</div>
                  <div className="flex-1 font-bold text-sm md:text-lg">{p.artist} <span className="font-normal text-gray-400 block md:inline md:ml-2 text-xs md:text-sm">{p.song}</span></div>
                  {gradingMode ? (
                    <input type="number" value={p.actual_rank || ''} onChange={(e) => handleUpdateResult(p.id, e.target.value)} className="w-10 bg-gray-700 text-center text-white rounded border border-gray-600 focus:border-yellow-500 outline-none" />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => move(index, -1)} className="text-green-400 hover:bg-gray-700 p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed" disabled={((selectedFinal?.status && selectedFinal?.status !== 'open') && user?.id !== ADMIN_ID)}>▲</button>
                      <button onClick={() => move(index, 1)} className="text-red-400 hover:bg-gray-700 p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed" disabled={((selectedFinal?.status && selectedFinal?.status !== 'open') && user?.id !== ADMIN_ID)}>▼</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: STATS (Leaderboard) */}
        {view === 'STATS' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('LIST')} className="text-gray-300 hover:text-white font-bold">{t.back_list}</button>
                <h1 className="text-xl md:text-2xl font-bold">{t.leaderboard_title}</h1>
              </div>
              
              {/* --- AWARD PRIZES BUTTON (ADMIN ONLY) --- */}
              {user?.id === ADMIN_ID && predictors.length > 0 && (
                <button 
                    onClick={handleAwardPrizes}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center gap-2"
                >
                    🎁 Award Prizes
                </button>
              )}
            </div>

            {loading ? <p>{t.loading}</p> : (
              <div className="grid grid-cols-1 gap-3">
                {predictors.length === 0 ? <p className="text-gray-500">{t.no_predictions}</p> : predictors.map((p, idx) => {
                  const rank = p.displayRank || idx + 1
                  let cardStyle = "glass border-white/10 hover:border-pink-500"
                  let rankDisplay = <span className="font-mono text-gray-500 font-bold w-8 text-center">{rank}.</span>

                  if (p.isRanked) {
                    if (rank === 1) { cardStyle = "bg-yellow-900/30 border-yellow-500"; rankDisplay = <span className="text-2xl w-8 text-center">🥇</span> }
                    else if (rank === 2) { cardStyle = "bg-slate-800 border-slate-400"; rankDisplay = <span className="text-2xl w-8 text-center">🥈</span> }
                    else if (rank === 3) { cardStyle = "bg-orange-900/30 border-orange-600"; rankDisplay = <span className="text-2xl w-8 text-center">🥉</span> }
                  }
                  return (
                    <div key={p.user_id} onClick={() => openSpectate(p.user_id, p.username)} className={`p-4 rounded-lg flex justify-between items-center cursor-pointer border transition ${cardStyle}`}>
                      <div className="flex items-center gap-4">
                        {rankDisplay}
                        {p.avatar_url ? <img src={p.avatar_url} className="w-10 h-10 rounded-full border-2 border-white/10" /> : <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center">👤</div>}
                        <div>
                          <div className="font-bold text-white text-sm md:text-base">{p.username || 'Unknown'}</div>
                          <div className="text-xs text-gray-400">{p.isRanked ? <span className="text-yellow-400 font-bold">{t.score} {p.score} pts</span> : <span>{t.submitted} {new Date(p.created_at).toLocaleDateString()}</span>}</div>
                        </div>
                      </div>
                      <span className="text-pink-400 text-sm font-bold">{t.view}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: SPECTATE */}
        {view === 'SPECTATE' && (
          <div>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/60 backdrop-blur-lg py-4 z-10 border-b border-white/20 px-2 rounded-xl">
              <button onClick={() => setView('STATS')} className="text-gray-300 hover:text-white font-bold text-sm">{t.back_list}</button>
              <div className="text-center"><span className="text-xs text-gray-400 uppercase block">{t.prediction_by}</span><span className="text-xl font-bold text-pink-400">{spectatorName}</span></div>
              <div className="w-10"></div>
            </div>
            <div className="space-y-3 pb-20">
              {spectatorList.map((p, index) => {
                const userRank = index + 1
                const actualRank = p.actual_rank
                let cardClass = "glass border-white/10 opacity-80"
                let statusIcon = null
                if (actualRank) {
                  if (actualRank === userRank) { cardClass = "bg-green-600/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] opacity-100"; statusIcon = <span className="text-green-400 font-bold drop-shadow-md">{t.exact}</span> }
                  else if (Math.abs(actualRank - userRank) === 1) { cardClass = "bg-orange-600/20 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] opacity-100"; statusIcon = <span className="text-orange-400 font-bold text-xs">{t.status_close} ({t.actual} {actualRank})</span> }
                  else { cardClass = "bg-red-900/20 border-red-800 opacity-60"; statusIcon = <span className="text-red-500 text-xs">{t.wrong} ({t.actual} {actualRank})</span> }
                }
                return (
                  <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${cardClass}`}>
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-xl text-white/50">{userRank}</div>
                    <div className="flex-1 font-bold text-sm md:text-lg">{p.artist} <span className="font-normal text-gray-400 block md:inline md:ml-2 text-xs md:text-sm">{p.song}</span></div>
                    <div>{statusIcon}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}