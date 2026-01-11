'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/app/context/LanguageContext'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// ⚠️ YOUR ADMIN ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'

// --- GRAPH MODAL ---
function GraphModal({ countryId, countryName, allVotes, onClose }: { countryId: number, countryName: string, allVotes: any[], onClose: () => void }) {
  const data = useMemo(() => {
    const sortedVotes = [...allVotes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    let totalVotes = 0
    let countryVotes = 0
    const history: any[] = []

    sortedVotes.forEach((vote, index) => {
      totalVotes++
      if (vote.country_id === countryId) countryVotes++
      if (index % 5 === 0 || index === sortedVotes.length - 1) {
        if (totalVotes > 10) { 
             const percentage = (countryVotes / totalVotes) * 100
             history.push({
               time: new Date(vote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
               value: percentage.toFixed(1)
             })
        }
      }
    })
    return history
  }, [allVotes, countryId])

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass w-full max-w-2xl p-6 rounded-2xl border border-white/20 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <div><h2 className="text-2xl font-bold text-white">{countryName}</h2><p className="text-sm text-gray-400">Winning Chance History</p></div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>
        <div className="h-64 w-full bg-black/40 rounded-xl p-4 border border-white/5">
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="time" stroke="#666" fontSize={10} minTickGap={30} />
                        <YAxis stroke="#666" fontSize={10} unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                        <Line type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-500">Not enough data yet</div>
            )}
        </div>
      </div>
    </div>
  )
}

// --- RATING MODAL (FOR ME TO RATE) ---
function RatingModal({ country, currentRating, onClose, onSave, t }: { country: any, currentRating: any, onClose: () => void, onSave: (r: any) => void, t: any }) {
  const [c1, setC1] = useState(currentRating?.song_quality || 5)
  const [c2, setC2] = useState(currentRating?.live_performance || 5)
  const [c3, setC3] = useState(currentRating?.jury_appeal || 5)
  const [c4, setC4] = useState(currentRating?.public_appeal || 5)
  const [c5, setC5] = useState(currentRating?.vocals || 5)
  const [c6, setC6] = useState(currentRating?.staging || 5)

  const average = ((c1 + c2 + c3 + c4 + c5 + c6) / 6).toFixed(1)

  const handleSave = () => {
    onSave({
      song_quality: c1,
      live_performance: c2,
      jury_appeal: c3,
      public_appeal: c4,
      vocals: c5,
      staging: c6,
      score: Math.round((c1+c2+c3+c4+c5+c6)/6)
    })
    onClose()
  }

  const SliderRow = ({ label, val, setVal }: any) => (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">{label}</span><span className="text-pink-400 font-bold">{val}</span></div>
      <input type="range" min="1" max="10" value={val} onChange={(e) => setVal(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass w-full max-w-md p-6 rounded-2xl border border-white/20 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <div><h2 className="text-xl font-bold text-white">Rate {country.name}</h2><p className="text-xs text-gray-400">{t.your_avg}: <span className="text-yellow-400 font-bold text-lg">{average}</span></p></div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>
        <div className="space-y-1">
            <SliderRow label={t.criteria_song} val={c1} setVal={setC1} />
            <SliderRow label={t.criteria_live} val={c2} setVal={setC2} />
            <SliderRow label={t.criteria_jury} val={c3} setVal={setC3} />
            <SliderRow label={t.criteria_public} val={c4} setVal={setC4} />
            <SliderRow label={t.criteria_vocals} val={c5} setVal={setC5} />
            <SliderRow label={t.criteria_staging} val={c6} setVal={setC6} />
        </div>
        <button onClick={handleSave} className="w-full mt-6 bg-pink-600 hover:bg-pink-500 text-white py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105">{t.save_rating} ({average})</button>
      </div>
    </div>
  )
}

// --- READ ONLY RATING MODAL (VIEW OTHERS) ---
function ReadOnlyRatingModal({ rating, onClose, t }: { rating: any, onClose: () => void, t: any }) {
    const average = ((rating.song_quality + rating.live_performance + rating.jury_appeal + rating.public_appeal + rating.vocals + rating.staging) / 6).toFixed(1)
  
    const SliderRow = ({ label, val }: any) => (
      <div className="mb-4 opacity-80">
        <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">{label}</span><span className="text-pink-300 font-bold">{val}</span></div>
        <input type="range" min="1" max="10" value={val} disabled className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-not-allowed accent-gray-500" />
      </div>
    )
  
    return (
      <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="glass w-full max-w-md p-6 rounded-2xl border border-white/20 relative" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                 {rating.avatar_url ? <img src={rating.avatar_url} className="w-10 h-10 rounded-full border border-white/20"/> : <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center">👤</div>}
                 <div>
                    <h2 className="text-lg font-bold text-white">{rating.username || 'Unknown'}</h2>
                    <p className="text-xs text-gray-400">Average Score: <span className="text-yellow-400 font-bold">{average}</span></p>
                 </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
          </div>
          <div className="space-y-1">
              <SliderRow label={t.criteria_song} val={rating.song_quality} />
              <SliderRow label={t.criteria_live} val={rating.live_performance} />
              <SliderRow label={t.criteria_jury} val={rating.jury_appeal} />
              <SliderRow label={t.criteria_public} val={rating.public_appeal} />
              <SliderRow label={t.criteria_vocals} val={rating.vocals} />
              <SliderRow label={t.criteria_staging} val={rating.staging} />
          </div>
        </div>
      </div>
    )
  }

// --- RATING LIST MODAL (WHO RATED) ---
function RatingListModal({ country, onClose, t }: { country: any, onClose: () => void, t: any }) {
    const supabase = createClient()
    const [ratings, setRatings] = useState<any[]>([])
    const [selectedRating, setSelectedRating] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchRatings() {
            const { data } = await supabase.from('ratings').select('*').eq('country_id', country.id)
            if (data) setRatings(data)
            setLoading(false)
        }
        fetchRatings()
    }, [country])

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            {selectedRating && <ReadOnlyRatingModal rating={selectedRating} onClose={() => setSelectedRating(null)} t={t} />}
            
            <div className="glass w-full max-w-sm p-6 rounded-2xl border border-white/20 relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white">Ratings for {country.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
                </div>
                
                {loading ? <p className="text-center text-gray-500">{t.loading}</p> : 
                 ratings.length === 0 ? <p className="text-center text-gray-500">No ratings yet.</p> : (
                    <div className="max-h-[60vh] overflow-y-auto space-y-3 no-scrollbar">
                        {ratings.map(r => {
                            const avg = ((r.song_quality + r.live_performance + r.jury_appeal + r.public_appeal + r.vocals + r.staging) / 6).toFixed(1)
                            return (
                                <div key={r.id} onClick={() => setSelectedRating(r)} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition">
                                    <div className="flex items-center gap-3">
                                        {r.avatar_url ? <img src={r.avatar_url} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center text-xs">👤</div>}
                                        <span className="font-bold text-sm text-gray-200">{r.username || 'Unknown'}</span>
                                    </div>
                                    <span className="text-yellow-400 font-bold font-mono">{avg}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// --- ONLINE USERS MODAL ---
function OnlineUsersModal({ onClose, users }: { onClose: () => void, users: any[] }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass w-full max-w-sm p-6 rounded-2xl border border-white/20 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
            Online Now ({users.length})
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 no-scrollbar">
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
              {u.avatar_url ? <img src={u.avatar_url} className="w-8 h-8 rounded-full border border-white/20" /> : <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center text-xs">👤</div>}
              <div className="flex flex-col">
                <span className="font-bold text-sm text-gray-200 flex items-center gap-2">{u.username || 'Anonymous'}{u.user_id === ADMIN_ID && <span className="bg-yellow-500/20 text-yellow-400 text-[9px] px-1.5 rounded border border-yellow-500/50">👑</span>}</span>
                <span className="text-[10px] text-gray-500">Joined: {new Date(u.online_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- CMS RULES MODAL ---
function RulesModal({ onClose, t, user }: { onClose: () => void, t: any, user: User | null }) {
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [bettingText, setBettingText] = useState(t.help_betting_desc)
  const [predictText, setPredictText] = useState(t.help_predict_desc)
  const [calendarText, setCalendarText] = useState(t.help_calendar_desc)
  const [leaderboardText, setLeaderboardText] = useState(t.help_leaderboard_desc)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContent() {
      const { data } = await supabase.from('site_content').select('*')
      if (data) {
        const bet = data.find(r => r.key === 'rules_betting')
        const pred = data.find(r => r.key === 'rules_prediction')
        const cal = data.find(r => r.key === 'rules_calendar')
        const lead = data.find(r => r.key === 'rules_leaderboard')
        
        if (bet) setBettingText(bet.content)
        if (pred) setPredictText(pred.content)
        if (cal) setCalendarText(cal.content)
        if (lead) setLeaderboardText(lead.content)
      }
      setLoading(false)
    }
    loadContent()
  }, [])

  const handleSave = async () => {
    await supabase.from('site_content').upsert({ key: 'rules_betting', content: bettingText })
    await supabase.from('site_content').upsert({ key: 'rules_prediction', content: predictText })
    await supabase.from('site_content').upsert({ key: 'rules_calendar', content: calendarText })
    await supabase.from('site_content').upsert({ key: 'rules_leaderboard', content: leaderboardText })
    setIsEditing(false)
    toast.success("Rules updated!")
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl border border-white/20 relative no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 sticky top-0 bg-black/80 backdrop-blur-md z-10 -mx-6 px-6 -mt-2 py-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">{t.help_title}</h2>
            {user?.id === ADMIN_ID && (
              <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`text-xs px-2 py-1 rounded border font-bold transition ${isEditing ? 'bg-green-600 border-green-500 text-white' : 'bg-white/10 border-white/20 text-gray-400 hover:text-white'}`}>
                {isEditing ? '💾 Save' : '✏️ Edit'}
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>
        <div className="space-y-8 text-gray-200">
          <div><h3 className="text-lg font-bold text-yellow-400 mb-2">{t.help_betting_title}</h3>{isEditing ? <textarea value={bettingText} onChange={(e) => setBettingText(e.target.value)} className="w-full h-20 bg-black/50 border border-white/20 rounded p-2 text-sm text-white focus:border-pink-500 outline-none"/> : <p className="text-sm leading-relaxed text-gray-300">{loading ? '...' : bettingText}</p>}</div>
          <div><h3 className="text-lg font-bold text-purple-400 mb-2">{t.help_predict_title}</h3>{isEditing ? <textarea value={predictText} onChange={(e) => setPredictText(e.target.value)} className="w-full h-20 bg-black/50 border border-white/20 rounded p-2 text-sm text-white focus:border-pink-500 outline-none"/> : <p className="text-sm leading-relaxed text-gray-300">{loading ? '...' : predictText}</p>}</div>
          <div><h3 className="text-lg font-bold text-blue-400 mb-2">{t.help_calendar_title}</h3>{isEditing ? <textarea value={calendarText} onChange={(e) => setCalendarText(e.target.value)} className="w-full h-20 bg-black/50 border border-white/20 rounded p-2 text-sm text-white focus:border-pink-500 outline-none"/> : <p className="text-sm leading-relaxed text-gray-300">{loading ? '...' : calendarText}</p>}</div>
          <div><h3 className="text-lg font-bold text-orange-400 mb-2">{t.help_leaderboard_title}</h3>{isEditing ? <textarea value={leaderboardText} onChange={(e) => setLeaderboardText(e.target.value)} className="w-full h-20 bg-black/50 border border-white/20 rounded p-2 text-sm text-white focus:border-pink-500 outline-none"/> : <p className="text-sm leading-relaxed text-gray-300">{loading ? '...' : leaderboardText}</p>}</div>
        </div>
        <button onClick={onClose} className="w-full mt-8 bg-white/10 hover:bg-white/20 py-3 rounded-lg font-bold transition">{t.close_modal}</button>
      </div>
    </div>
  )
}

// --- VIDEO PLAYER ---
function VideoPlayer({ videoId, onClose }: { videoId: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-2 md:p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl border border-white/20" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 z-50 bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center transition">✕</button>
        <div className="aspect-video"><iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen></iframe></div>
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
  const [showRules, setShowRules] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [showOnlineList, setShowOnlineList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [graphCountry, setGraphCountry] = useState<any>(null)
  const [ratingCountry, setRatingCountry] = useState<any>(null)
  const [viewRatingList, setViewRatingList] = useState<any>(null)
  
  // ⚠️ CHANGED TO 100 FOR TESTING
  const MAX_TOKENS = 100 

  // --- 1. REAL-TIME PRESENCE ---
  useEffect(() => {
    const channel = supabase.channel('global_presence')
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const rawUsers: any[] = []
        for (const id in state) { rawUsers.push(...state[id] as any[]) }
        const uniqueUsers = Array.from(new Map(rawUsers.map((u: any) => [u.user_id, u])).values())
        uniqueUsers.sort((a: any, b: any) => new Date(a.online_at).getTime() - new Date(b.online_at).getTime())
        setOnlineUsers(uniqueUsers)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: user?.id || 'anon-' + Math.random(),
            username: user?.user_metadata.full_name || 'Anonymous',
            avatar_url: user?.user_metadata.avatar_url || user?.user_metadata.picture || null
          })
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [user]) 

  // --- 2. DATA REFRESH (FIXED LOGIC HERE) ---
  async function refreshData() {
    const { data: cList } = await supabase.from('countries').select('*').order('name')
    if (cList) setCountries(cList)
    
    // Fetch all votes/ratings
    const { data: vList } = await supabase.from('votes').select('*')
    if (vList) setAllVotes(vList)
    const { data: rList } = await supabase.from('ratings').select('*')
    if (rList) setAllRatings(rList) // Store EVERYONE's ratings in allRatings

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data: mvList } = await supabase.from('votes').select('*').eq('user_id', user.id)
      if (mvList) setMyVotes(mvList)
      
      // FIXED: Specifically fetch MY ratings
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
    if (!user || isVoting) return
    if (myVotes.length >= MAX_TOKENS) { toast.error("No tokens left!"); return }
    setIsVoting(true)
    try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ec4899', '#a855f7', '#fbbf24'] })
        const { error } = await supabase.from('votes').insert({ user_id: user.id, country_id: countryId })
        if (error) { toast.error("Failed to vote") } else { toast.success("Vote Placed!") }
        await refreshData()
    } catch (e) { toast.error("Something went wrong") } finally { setIsVoting(false) }
  }

  const removeVote = async (countryId: number) => {
    if (isVoting) return
    const voteToRemove = myVotes.find(v => v.country_id === countryId)
    if (!voteToRemove) return
    setIsVoting(true)
    try {
        const { error } = await supabase.from('votes').delete().eq('id', voteToRemove.id)
        if (error) { toast.error("Failed to remove") } else { toast("Token Returned", { icon: '↩️' }) }
        await refreshData()
    } catch (e) { toast.error("Something went wrong") } finally { setIsVoting(false) }
  }

  // --- SAVE RATING ---
  const handleRate = async (ratingData: any) => {
    if (!user || !ratingCountry) return
    const avatar = user.user_metadata.avatar_url || user.user_metadata.picture || user.user_metadata.profile_image_url
    const username = user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'Unknown User'
    const { error } = await supabase.from('ratings').upsert({
        user_id: user.id,
        country_id: ratingCountry.id,
        username: username, 
        avatar_url: avatar,
        ...ratingData
    }, { onConflict: 'user_id, country_id' })

    if (error) { toast.error("Failed to save rating") } else { toast.success("Rating Saved!"); refreshData() }
  }

  const handleDeleteCountry = async (id: number, name: string) => {
    if (!confirm(`${t.delete_confirm} ${name}?`)) return
    await supabase.from('votes').delete().eq('country_id', id)
    await supabase.from('ratings').delete().eq('country_id', id)
    await supabase.from('countries').delete().eq('id', id)
    toast.success("Deleted " + name)
    refreshData()
  }

  const getOddsValue = (countryId: number) => {
    const total = allVotes.length
    const count = allVotes.filter(v => v.country_id === countryId).length
    if (total === 0 || count === 0) return 100.0
    return 1 / (count / total)
  }

  // FIXED: CALCULATE ACTUAL GLOBAL AVERAGE
  const getAvgScore = (countryId: number) => {
    const relevantRatings = allRatings.filter(r => r.country_id === countryId)
    if (relevantRatings.length === 0) return "0.0"
    
    // Sum up the 'score' property of all ratings for this country
    const totalScore = relevantRatings.reduce((acc, curr) => acc + (curr.score || 0), 0)
    
    // Calculate mean
    const avg = totalScore / relevantRatings.length
    return avg.toFixed(1)
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
    const filteredCountries = countries.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.song.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const sortedCountries = filteredCountries.sort((a, b) => getOddsValue(a.id) - getOddsValue(b.id))

    return (
      <div className="min-h-screen p-2 md:p-8">
        {playingVideo && <VideoPlayer videoId={playingVideo} onClose={() => setPlayingVideo(null)} />}
        {showRules && <RulesModal onClose={() => setShowRules(false)} t={t} user={user} />}
        {showOnlineList && <OnlineUsersModal onClose={() => setShowOnlineList(false)} users={onlineUsers} />}
        {graphCountry && <GraphModal countryId={graphCountry.id} countryName={graphCountry.name} allVotes={allVotes} onClose={() => setGraphCountry(null)} />}
        
        {ratingCountry && (
            <RatingModal 
                country={ratingCountry} 
                currentRating={myRatings.find(r => r.country_id === ratingCountry.id)} 
                onClose={() => setRatingCountry(null)}
                onSave={handleRate}
                t={t}
            />
        )}

        {viewRatingList && (
            <RatingListModal country={viewRatingList} onClose={() => setViewRatingList(null)} t={t} />
        )}
        
        <div className="max-w-6xl mx-auto">
          
          {/* NAV WITH LANGUAGE TOGGLE */}
          <div className="relative flex justify-center gap-4 md:gap-6 mb-8 border-b border-white/20 pb-4 flex-wrap">
            <Link href="/" className="px-4 py-2 text-white border-b-2 border-pink-500 font-bold text-lg md:text-xl drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] transition">{t.nav_betting}</Link>
            <Link href="/epicstory" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] flex items-center gap-2"><Image src="/twitch.png" alt="Twitch" width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 object-contain" />{t.nav_stream}</Link>
            <Link href="/calendar" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{t.nav_calendar}</Link>
            <Link href="/predictions" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{t.nav_predict}</Link>
            <Link href="/leaderboard" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{t.nav_leaderboard}</Link>
            <div className="absolute right-0 top-0 flex items-center gap-2">
                <button onClick={() => setShowRules(true)} className="glass hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-purple-300 transition" title="How to Play">?</button>
                <button onClick={toggleLanguage} className="glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
            </div>
          </div>
          <div className="md:hidden flex justify-end mb-4 gap-2">
                <button onClick={() => setShowRules(true)} className="glass hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-purple-300">?</button>
                <button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
          </div>

          {/* HEADER */}
          <div className="relative flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12 border-b border-white/20 pb-6 sticky top-0 bg-black/70 backdrop-blur-xl z-20 py-4 md:py-6 rounded-2xl px-6 min-h-[140px] shadow-2xl">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto mb-4 md:mb-0 z-10">
              <div onClick={() => setShowOnlineList(true)} className="glass px-4 py-1.5 rounded-full flex items-center gap-2 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer hover:bg-white/10 transition">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]"></div>
                <span className="text-sm font-bold text-green-300 font-mono">{onlineUsers.length} Online</span>
              </div>
              <p className="text-gray-300 text-sm font-bold text-white hidden md:block">{user.user_metadata.full_name}</p>
            </div>
            <div className="order-first md:absolute md:left-1/2 md:top-1/2 md:-translate-y-1/2 md:-translate-x-1/2 mb-4 md:mb-0 z-0 pointer-events-none">
                <Image src="/logo.png" alt="Eurovision" width={600} height={300} className="h-24 md:h-40 w-auto drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] filter brightness-110" priority />
            </div>
            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-end z-10">
              {user.id === ADMIN_ID && <Link href="/admin"><button className="glass px-4 py-2 rounded-xl text-sm font-bold transition hover:bg-white/20 flex items-center gap-2 shadow-lg">{t.admin_panel}</button></Link>}
              <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm font-bold underline transition hover:scale-105">{t.logout}</button>
              <div className="text-right pl-6 border-l border-white/20">
                <div className={`text-3xl md:text-5xl font-mono font-bold ${tokensLeft === 0 ? 'text-gray-500' : 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]'}`}>{tokensLeft}</div>
                <div className="text-xs text-gray-300 uppercase tracking-widest font-bold">{t.tokens_left}</div>
              </div>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="mb-6 flex justify-center">
            <div className="glass flex items-center w-full max-w-md px-4 py-3 rounded-full border border-white/20 focus-within:border-pink-500 transition">
              <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder={t.search_placeholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-white w-full placeholder-gray-500"/>
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white">✕</button>}
            </div>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {sortedCountries.length === 0 && <div className="col-span-full text-center py-10 text-gray-500">No countries found.</div>}
            {sortedCountries.map((country, index) => {
              const myVotesForThis = myVotes.filter(v => v.country_id === country.id).length
              const myRatingObj = myRatings.find(r => r.country_id === country.id)
              
              const myScore = myRatingObj ? (
                (
                 (myRatingObj.song_quality || 5) + 
                 (myRatingObj.live_performance || 5) + 
                 (myRatingObj.jury_appeal || 5) + 
                 (myRatingObj.public_appeal || 5) + 
                 (myRatingObj.vocals || 5) + 
                 (myRatingObj.staging || 5)
                ) / 6
              ).toFixed(1) : "0.0"
              
              const odds = getOddsValue(country.id).toFixed(2)
              const isFavorite = index === 0 && allVotes.length > 0 && !searchQuery
              const videoId = getYoutubeId(country.youtube_url)
              
              return (
                <div key={country.id} className={`glass rounded-xl overflow-hidden relative group transition-all duration-500 ${isFavorite ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'hover:border-pink-500/50'}`}>
                  {user.id === ADMIN_ID && (
                    <button onClick={() => handleDeleteCountry(country.id, country.name)} className="absolute top-2 right-2 z-40 bg-red-600/80 hover:bg-red-500 p-2 rounded text-white shadow-lg backdrop-blur">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <div className="h-24 md:h-32 w-full relative overflow-hidden cursor-pointer" onClick={() => videoId ? setPlayingVideo(videoId) : toast.error(t.no_video)}>
                     <img src={`https://flagcdn.com/w640/${country.code.toLowerCase()}.png`} alt={country.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition duration-500" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                     <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 md:px-3 md:py-1 rounded text-white font-mono font-bold text-xs md:text-base border border-white/10">#{index + 1}</div>
                     {videoId && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300"><div className="bg-pink-600/90 rounded-full p-2 md:p-3 shadow-[0_0_20px_rgba(236,72,153,0.6)] transform scale-110"><svg className="w-6 h-6 md:w-8 md:h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>}
                  </div>
                  <div className="p-4 md:p-6 pt-0 relative -top-4 md:-top-6">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                         <h3 className="text-xl md:text-2xl font-bold drop-shadow-md text-white">{country.name}</h3>
                         <p className="text-gray-300 text-xs md:text-sm">{country.artist}</p>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setGraphCountry(country)} className="w-8 h-8 rounded-full bg-blue-600/50 hover:bg-blue-500 flex items-center justify-center transition border border-blue-400/50">📈</button>
                          <div className="text-right glass p-1 md:p-2 rounded-lg"><span className={`block text-xl md:text-2xl font-bold ${isFavorite ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-green-400'}`}>{odds}</span><span className="text-[10px] text-gray-400 uppercase block">{t.odds}</span></div>
                      </div>
                    </div>
                    <p className={`font-bold text-sm mb-4 truncate flex items-center gap-2 ${videoId ? 'text-pink-400 hover:text-pink-200 cursor-pointer underline decoration-dotted' : 'opacity-70 text-gray-400 cursor-default'}`} onClick={() => videoId && setPlayingVideo(videoId)} title={videoId ? "Click to Watch Video" : t.no_video}><span>♫ {country.song}</span>{videoId && <span className="text-[10px] md:text-xs bg-pink-900/50 px-1 rounded border border-pink-500/30">▶ {t.video}</span>}</p>
                    
                    {/* NEW: RATING BUTTON AREA + CLICKABLE AVG */}
                    <div className="bg-black/30 p-2 md:p-3 rounded-lg mb-4 border border-white/5 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-gray-400 block">{t.me}: <b className="text-pink-400 text-sm">{myScore}</b></span>
                        <span 
                            onClick={() => setViewRatingList(country)} // CLICKABLE AVG
                            className="text-gray-500 text-[10px] hover:text-white cursor-pointer underline decoration-dotted"
                            title="See all ratings"
                        >
                            {t.avg}: {getAvgScore(country.id)}
                        </span>
                      </div>
                      <button 
                        onClick={() => setRatingCountry(country)}
                        className="bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 border border-pink-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        {t.rate_button} 📝
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:gap-4">
                      <button onClick={() => removeVote(country.id)} disabled={myVotesForThis === 0 || isVoting} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-900/40 text-red-200 hover:bg-red-600 disabled:opacity-20 font-bold text-lg md:text-xl transition shadow-[0_0_10px_rgba(220,38,38,0.3)]">-</button>
                      <div className="flex-1 text-center bg-black/40 rounded-lg py-1 md:py-2 border border-white/10"><span className="text-[10px] md:text-xs text-gray-500 block">{t.shares}</span><span className="text-xl md:text-2xl font-bold text-white">{myVotesForThis}</span></div>
                      <button onClick={() => placeVote(country.id)} disabled={tokensLeft === 0 || isVoting} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-900/40 text-green-200 hover:bg-green-600 disabled:opacity-20 font-bold text-lg md:text-xl transition shadow-[0_0_10px_rgba(22,163,74,0.3)]">+</button>
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
    <div className="flex min-h-screen flex-col items-center justify-center text-white p-4">
      <div className="glass p-8 md:p-12 rounded-2xl text-center shadow-[0_0_50px_rgba(255,0,85,0.2)] max-w-md w-full">
        <Image src="/logo.png" alt="Eurovision" width={300} height={150} className="w-48 md:w-64 mx-auto mb-6 drop-shadow-2xl" priority />
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 drop-shadow-sm">Eurovision Odds</h1>
        <p className="text-lg md:text-xl mb-8 text-gray-200">Community Driven Predictions</p>
        <button onClick={handleLogin} className="bg-[#6441A5] hover:bg-[#7d5bbe] text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold flex items-center gap-3 transition transform hover:scale-105 shadow-lg mx-auto w-full justify-center">{t.login}</button>
      </div>
    </div>
  )
}