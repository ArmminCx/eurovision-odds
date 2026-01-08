'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'

// ⚠️ YOUR ADMIN ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'

// --- VIDEO PLAYER (Glass Style) ---
function VideoPlayer({ videoId, onClose }: { videoId: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl border border-white/20" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-50 bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center transition"
        >
          ✕
        </button>
        <div className="aspect-video">
          <iframe 
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
            className="w-full h-full" 
            allow="autoplay; encrypted-media; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<any[]>([])
  
  const [myVotes, setMyVotes] = useState<any[]>([])
  const [allVotes, setAllVotes] = useState<any[]>([])
  const [myRatings, setMyRatings] = useState<any[]>([])
  const [allRatings, setAllRatings] = useState<any[]>([])
  
  const [isVoting, setIsVoting] = useState(false)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const MAX_TOKENS = 5

  async function refreshData() {
    const { data: cList } = await supabase.from('countries').select('*').order('name')
    if (cList) setCountries(cList)
    
    const { data: vList } = await supabase.from('votes').select('*')
    if (vList) setAllVotes(vList)

    const { data: rList } = await supabase.from('ratings').select('*')
    if (rList) setAllRatings(rList)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data: mvList } = await supabase.from('votes').select('*').eq('user_id', user.id)
      if (mvList) setMyVotes(mvList)
      
      const { data: mrList } = await supabase.from('ratings').select('*').eq('user_id', user.id)
      if (mrList) setMyRatings(mrList)
    }
    setLoading(false)
  }

  useEffect(() => {
    refreshData()
    const interval = setInterval(() => refreshData(), 5000)
    return () => clearInterval(interval)
  }, [])

  // --- ACTIONS ---
  const placeVote = async (countryId: number) => {
    if (!user || isVoting || myVotes.length >= MAX_TOKENS) return
    setIsVoting(true)
    const fakeVote = { id: Math.random(), country_id: countryId, user_id: user.id }
    const prevMy = [...myVotes]; const prevAll = [...allVotes]
    setMyVotes([...myVotes, fakeVote]); setAllVotes([...allVotes, fakeVote])
    const { error } = await supabase.from('votes').insert({ user_id: user.id, country_id: countryId })
    if (error) { setMyVotes(prevMy); setAllVotes(prevAll) } else { await refreshData() }
    setIsVoting(false)
  }

  const removeVote = async (countryId: number) => {
    if (isVoting) return
    const voteToRemove = myVotes.find(v => v.country_id === countryId)
    if (!voteToRemove) return
    setIsVoting(true)
    const prevMy = [...myVotes]; const prevAll = [...allVotes]
    setMyVotes(myVotes.filter(v => v !== voteToRemove))
    setAllVotes(allVotes.filter(v => v.id !== voteToRemove.id))
    const { error } = await supabase.from('votes').delete().eq('id', voteToRemove.id)
    if (error) { setMyVotes(prevMy); setAllVotes(prevAll) } else { await refreshData() }
    setIsVoting(false)
  }

  const handleRate = async (countryId: number, score: number) => {
    if (!user) return
    const newRating = { user_id: user.id, country_id: countryId, score: score }
    const existing = myRatings.find(r => r.country_id === countryId)
    if (existing) {
      setMyRatings(myRatings.map(r => r.country_id === countryId ? { ...r, score } : r))
    } else {
      setMyRatings([...myRatings, newRating])
    }
    await supabase.from('ratings').upsert({ user_id: user.id, country_id: countryId, score: score }, { onConflict: 'user_id, country_id' })
    refreshData()
  }

  const handleDeleteCountry = async (id: number, name: string) => {
    if (!confirm(`${t.delete_confirm} ${name}?`)) return
    await supabase.from('votes').delete().eq('country_id', id)
    await supabase.from('ratings').delete().eq('country_id', id)
    await supabase.from('countries').delete().eq('id', id)
    refreshData()
  }

  // --- HELPERS ---
  const getOddsValue = (countryId: number) => {
    const total = allVotes.length
    const count = allVotes.filter(v => v.country_id === countryId).length
    if (total === 0 || count === 0) return 100.0
    return 1 / (count / total)
  }

  const getAvgScore = (countryId: number) => {
    const ratings = allRatings.filter(r => r.country_id === countryId)
    if (ratings.length === 0) return "0.0"
    const sum = ratings.reduce((acc, curr) => acc + curr.score, 0)
    return (sum / ratings.length).toFixed(1)
  }

  const getYoutubeId = (url: string) => {
    if (!url) return null
    try {
      const validUrl = url.startsWith('http') ? url : `https://${url}`
      if (validUrl.includes('youtu.be/')) return validUrl.split('youtu.be/')[1].split('?')[0]
      const urlObj = new URL(validUrl)
      return urlObj.searchParams.get('v')
    } catch { return null }
  }

  const handleLogin = async () => { await supabase.auth.signInWithOAuth({ provider: 'twitch', options: { redirectTo: `${location.origin}/auth/callback` } }) }
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null) }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl tracking-widest animate-pulse">{t.loading}</div>

  if (user) {
    const tokensLeft = MAX_TOKENS - myVotes.length
    const sortedCountries = [...countries].sort((a, b) => getOddsValue(a.id) - getOddsValue(b.id))

    return (
      <div className="min-h-screen p-8">
        
        {/* --- FIXED VIDEO PLAYER --- */}
        {playingVideo && (
          <VideoPlayer videoId={playingVideo} onClose={() => setPlayingVideo(null)} />
        )}
        
        <div className="max-w-6xl mx-auto">
          
          {/* NAV WITH LANGUAGE TOGGLE */}
          <div className="relative flex justify-center gap-4 md:gap-6 mb-8 border-b border-white/20 pb-4 flex-wrap">
            <Link href="/" className="px-4 py-2 text-white border-b-2 border-pink-500 font-bold text-lg md:text-xl drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] transition">{t.nav_betting}</Link>
            <Link href="/epicstory" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{t.nav_stream}</Link>
            <Link href="/calendar" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{t.nav_calendar}</Link>
            <Link href="/predictions" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{t.nav_predict}</Link>
            <Link href="/leaderboard" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{t.nav_leaderboard}</Link>
            
            <button onClick={toggleLanguage} className="absolute right-0 top-0 glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">
              {lang === 'en' ? '🇺🇸' : '🇷🇺'}
            </button>
          </div>

          {/* HEADER */}
          <div className="flex justify-between items-center mb-8 border-b border-white/20 pb-4 sticky top-0 bg-black/40 backdrop-blur-lg z-20 py-4 rounded-xl px-4">
            <div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 drop-shadow-sm">Eurovision Market</h1>
              <p className="text-gray-300 text-sm">{t.user}: <span className="font-bold text-white">{user.user_metadata.full_name}</span></p>
            </div>
            <div className="flex items-center gap-6">
              {user.id === ADMIN_ID && (
                <Link href="/admin">
                  <button className="glass px-4 py-2 rounded-lg text-sm font-bold transition hover:bg-white/20 flex items-center gap-2">{t.admin_panel}</button>
                </Link>
              )}
              <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm font-bold underline">{t.logout}</button>
              <div className="text-right pl-6 border-l border-white/20">
                <div className={`text-4xl font-mono font-bold ${tokensLeft === 0 ? 'text-gray-500' : 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]'}`}>{tokensLeft} / 5</div>
                <div className="text-xs text-gray-300 uppercase tracking-widest">{t.tokens_left}</div>
              </div>
            </div>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCountries.map((country, index) => {
              const myVotesForThis = myVotes.filter(v => v.country_id === country.id).length
              const myRatingObj = myRatings.find(r => r.country_id === country.id)
              const myScore = myRatingObj ? myRatingObj.score : 0
              const odds = getOddsValue(country.id).toFixed(2)
              const isFavorite = index === 0 && allVotes.length > 0
              const videoId = getYoutubeId(country.youtube_url)
              
              return (
                // UPDATED: Using 'glass' class instead of bg-gray-800
                <div key={country.id} className={`glass rounded-xl overflow-hidden relative group transition-all duration-500 ${isFavorite ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'hover:border-pink-500/50'}`}>
                  {user.id === ADMIN_ID && (
                    <button onClick={() => handleDeleteCountry(country.id, country.name)} className="absolute top-2 right-2 z-40 bg-red-600/80 hover:bg-red-500 p-2 rounded text-white shadow-lg backdrop-blur">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}

                  <div className="h-32 w-full relative overflow-hidden cursor-pointer" onClick={() => videoId ? setPlayingVideo(videoId) : alert(t.no_video)}>
                     <img src={`https://flagcdn.com/w640/${country.code.toLowerCase()}.png`} alt={country.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition duration-500" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                     <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-3 py-1 rounded text-white font-mono font-bold border border-white/10">#{index + 1}</div>
                     {videoId && (
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                         <div className="bg-pink-600/90 rounded-full p-3 shadow-[0_0_20px_rgba(236,72,153,0.6)] transform scale-110">
                           <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                         </div>
                       </div>
                     )}
                  </div>

                  <div className="p-6 pt-0 relative -top-6">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                         <h3 className="text-2xl font-bold drop-shadow-md text-white">{country.name}</h3>
                         <p className="text-gray-300 text-sm">{country.artist}</p>
                      </div>
                      <div className="text-right glass p-2 rounded-lg">
                        <span className={`block text-2xl font-bold ${isFavorite ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-green-400'}`}>{odds}</span>
                        <span className="text-[10px] text-gray-400 uppercase block">{t.odds}</span>
                      </div>
                    </div>
                    
                    <p 
                      className={`font-bold text-sm mb-4 truncate flex items-center gap-2 ${videoId ? 'text-pink-400 hover:text-pink-200 cursor-pointer underline decoration-dotted' : 'opacity-70 text-gray-400 cursor-default'}`}
                      onClick={() => videoId && setPlayingVideo(videoId)}
                      title={videoId ? "Click to Watch Video" : t.no_video}
                    >
                      <span>♫ {country.song}</span>
                      {videoId && <span className="text-xs bg-pink-900/50 px-1 rounded border border-pink-500/30">▶ {t.video}</span>}
                    </p>

                    <div className="bg-black/30 p-3 rounded-lg mb-4 border border-white/5">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">{t.avg}: <b className="text-white">{getAvgScore(country.id)}</b></span>
                        <span className="text-gray-400">{t.me}: <b className="text-pink-400">{myScore}</b></span>
                      </div>
                      <input type="range" min="0" max="10" value={myScore} onChange={(e) => handleRate(country.id, parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button onClick={() => removeVote(country.id)} disabled={myVotesForThis === 0 || isVoting} className="w-12 h-12 rounded-full bg-red-900/40 text-red-200 hover:bg-red-600 disabled:opacity-20 font-bold text-xl transition shadow-[0_0_10px_rgba(220,38,38,0.3)]">-</button>
                      <div className="flex-1 text-center bg-black/40 rounded-lg py-2 border border-white/10">
                        <span className="text-xs text-gray-500 block">{t.shares}</span>
                        <span className="text-2xl font-bold text-white">{myVotesForThis}</span>
                      </div>
                      <button onClick={() => placeVote(country.id)} disabled={tokensLeft === 0 || isVoting} className="w-12 h-12 rounded-full bg-green-900/40 text-green-200 hover:bg-green-600 disabled:opacity-20 font-bold text-xl transition shadow-[0_0_10px_rgba(22,163,74,0.3)]">+</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // LOGGED OUT VIEW
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-white">
      <div className="glass p-12 rounded-2xl text-center shadow-[0_0_50px_rgba(255,0,85,0.2)]">
        <h1 className="text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 drop-shadow-sm">Eurovision Odds</h1>
        <p className="text-xl mb-8 text-gray-200">Community Driven Predictions</p>
        <button onClick={handleLogin} className="bg-[#6441A5] hover:bg-[#7d5bbe] text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition transform hover:scale-105 shadow-lg mx-auto">
          {t.login}
        </button>
      </div>
    </div>
  )
}