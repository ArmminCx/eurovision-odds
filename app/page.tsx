'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

// ⚠️ YOUR ADMIN ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'

export default function Home() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<any[]>([])
  
  // Data States
  const [myVotes, setMyVotes] = useState<any[]>([])
  const [allVotes, setAllVotes] = useState<any[]>([])
  const [myRatings, setMyRatings] = useState<any[]>([])
  const [allRatings, setAllRatings] = useState<any[]>([])
  
  const [isVoting, setIsVoting] = useState(false)
  const MAX_TOKENS = 5

  async function refreshData() {
    // Fetch Countries
    const { data: cList } = await supabase.from('countries').select('*').order('name')
    if (cList) setCountries(cList)
    
    // Fetch all interaction data
    const { data: vList } = await supabase.from('votes').select('*')
    if (vList) setAllVotes(vList)

    const { data: rList } = await supabase.from('ratings').select('*')
    if (rList) setAllRatings(rList)

    // Fetch User Data
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
    if (error) { setMyVotes(prevMy); setAllVotes(prevAll) } 
    else { await refreshData() }
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
    if (error) { setMyVotes(prevMy); setAllVotes(prevAll) } 
    else { await refreshData() }
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

    await supabase.from('ratings').upsert({
      user_id: user.id, country_id: countryId, score: score
    }, { onConflict: 'user_id, country_id' })
    refreshData()
  }

  // --- ADMIN DELETE FUNCTION ---
  const handleDeleteCountry = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will delete ALL votes and ratings for this country.`)) {
      return
    }

    // 1. Delete Votes for this country first
    await supabase.from('votes').delete().eq('country_id', id)
    // 2. Delete Ratings for this country
    await supabase.from('ratings').delete().eq('country_id', id)
    // 3. Delete the Country
    const { error } = await supabase.from('countries').delete().eq('id', id)

    if (error) {
      alert(`Error deleting: ${error.message}`)
    } else {
      refreshData()
    }
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

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'twitch', options: { redirectTo: `${location.origin}/auth/callback` } })
  }
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null) }

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>

  // --- LOGGED IN VIEW ---
  if (user) {
    const tokensLeft = MAX_TOKENS - myVotes.length
    const sortedCountries = [...countries].sort((a, b) => getOddsValue(a.id) - getOddsValue(b.id))

    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4 sticky top-0 bg-gray-900/95 backdrop-blur z-20 py-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-400">Eurovision Market</h1>
              <p className="text-gray-400 text-sm">User: {user.user_metadata.full_name}</p>
            </div>

            <div className="flex items-center gap-6">
              {user.id === ADMIN_ID && (
                <Link href="/admin">
                  <button className="bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white px-4 py-2 rounded text-sm font-bold transition flex items-center gap-2">
                    ⚙️ Admin Panel
                  </button>
                </Link>
              )}

              <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm font-bold underline">
                Log Out
              </button>

              <div className="text-right pl-6 border-l border-gray-700">
                <div className={`text-4xl font-mono font-bold ${tokensLeft === 0 ? 'text-gray-600' : 'text-yellow-400'}`}>
                  {tokensLeft} / 5
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-widest">Tokens Left</div>
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
              
              return (
                <div key={country.id} 
                  className={`bg-gray-800 rounded-xl border-2 overflow-hidden relative group transition-all duration-500
                    ${isFavorite ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'border-gray-700 hover:border-purple-500'}
                  `}
                >
                  {/* ADMIN DELETE BUTTON (Visible only to you) */}
                  {user.id === ADMIN_ID && (
                    <button 
                      onClick={() => handleDeleteCountry(country.id, country.name)}
                      className="absolute top-2 right-2 z-50 bg-red-600/80 hover:bg-red-500 p-2 rounded text-white shadow-lg backdrop-blur"
                      title="Delete Country"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}

                  <div className="h-32 w-full relative overflow-hidden">
                     <img 
                       src={`https://flagcdn.com/w640/${country.code.toLowerCase()}.png`} 
                       alt={country.name}
                       className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
                     <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-3 py-1 rounded text-white font-mono font-bold">
                       #{index + 1}
                     </div>
                  </div>

                  <div className="p-6 pt-0 relative -top-6">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                         <h3 className="text-2xl font-bold drop-shadow-md">{country.name}</h3>
                         <p className="text-gray-300 text-sm">{country.artist}</p>
                      </div>
                      <div className="text-right bg-gray-900/80 p-2 rounded-lg backdrop-blur border border-gray-700">
                        <span className={`block text-2xl font-bold ${isFavorite ? 'text-yellow-400' : 'text-green-400'}`}>
                          {odds}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase block">ODDS</span>
                      </div>
                    </div>
                    
                    <p className="text-purple-300 font-bold text-sm mb-4 truncate">♫ {country.song}</p>

                    <div className="bg-gray-700/30 p-3 rounded-lg mb-4 border border-gray-700">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">Avg: <b className="text-white">{getAvgScore(country.id)}</b></span>
                        <span className="text-gray-400">Me: <b className="text-purple-400">{myScore}</b></span>
                      </div>
                      <input 
                        type="range" min="0" max="10" value={myScore}
                        onChange={(e) => handleRate(country.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button 
                        onClick={() => removeVote(country.id)}
                        disabled={myVotesForThis === 0 || isVoting}
                        className="w-12 h-12 rounded-full bg-red-900/40 text-red-200 hover:bg-red-600 disabled:opacity-20 font-bold text-xl transition"
                      >-</button>
                      
                      <div className="flex-1 text-center bg-gray-900 rounded-lg py-2 border border-gray-700">
                        <span className="text-xs text-gray-500 block">SHARES</span>
                        <span className="text-2xl font-bold text-white">{myVotesForThis}</span>
                      </div>

                      <button 
                        onClick={() => placeVote(country.id)}
                        disabled={tokensLeft === 0 || isVoting}
                        className="w-12 h-12 rounded-full bg-green-900/40 text-green-200 hover:bg-green-600 disabled:opacity-20 font-bold text-xl transition"
                      >+</button>
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

  // --- LOGGED OUT VIEW ---
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">Eurovision Odds</h1>
      <p className="text-xl mb-8 text-gray-400">Community Driven Predictions</p>
      <button 
        onClick={handleLogin}
        className="bg-[#6441A5] hover:bg-[#7d5bbe] text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition transform hover:scale-105"
      >
        Login with Twitch
      </button>
    </div>
  )
}