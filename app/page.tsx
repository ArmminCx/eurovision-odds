'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

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
    if (countries.length === 0) {
      const { data: cList } = await supabase.from('countries').select('*').order('name')
      if (cList) setCountries(cList)
    }
    
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
    const prevMy = [...myVotes]
    const prevAll = [...allVotes]
    
    setMyVotes([...myVotes, fakeVote])
    setAllVotes([...allVotes, fakeVote])

    const { error } = await supabase.from('votes').insert({ user_id: user.id, country_id: countryId })
    if (error) { 
        setMyVotes(prevMy)
        setAllVotes(prevAll) 
    } else { 
        await refreshData() 
    }
    setIsVoting(false)
  }

  const removeVote = async (countryId: number) => {
    if (isVoting) return
    const voteToRemove = myVotes.find(v => v.country_id === countryId)
    if (!voteToRemove) return
    setIsVoting(true)

    const prevMy = [...myVotes]
    const prevAll = [...allVotes]
    
    setMyVotes(myVotes.filter(v => v !== voteToRemove))
    setAllVotes(allVotes.filter(v => v.id !== voteToRemove.id))

    const { error } = await supabase.from('votes').delete().eq('id', voteToRemove.id)
    if (error) { 
        setMyVotes(prevMy)
        setAllVotes(prevAll) 
    } else { 
        await refreshData() 
    }
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

  // --- VIEWS ---
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'twitch', options: { redirectTo: `${location.origin}/auth/callback` } })
  }
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null) }

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>

  if (user) {
    const tokensLeft = MAX_TOKENS - myVotes.length

    // SORTING: Lowest odds (Favorite) first
    const sortedCountries = [...countries].sort((a, b) => {
      return getOddsValue(a.id) - getOddsValue(b.id)
    })

    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          {/* Sticky Header */}
          <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4 sticky top-0 bg-gray-900 z-20 py-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-400">Eurovision Market</h1>
              <p className="text-gray-400">User: {user.user_metadata.full_name}</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-mono font-bold ${tokensLeft === 0 ? 'text-gray-600' : 'text-yellow-400'}`}>
                {tokensLeft} / 5
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-widest">Tokens Left</div>
            </div>
          </div>

          {/* Grid */}
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
                  {/* Flag Background */}
                  <div className="h-32 w-full relative overflow-hidden">
                     {/* Standard HTML img tag to avoid Next.js Image config errors */}
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

                  {/* Info Section */}
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

                    {/* Slider */}
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

                    {/* Voting Buttons */}
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">Eurovision Odds</h1>
      <button onClick={handleLogin} className="bg-[#6441A5] text-white px-6 py-3 rounded-lg font-bold">
        Login with Twitch
      </button>
    </div>
  )
}