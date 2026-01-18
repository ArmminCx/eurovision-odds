'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { useLanguage } from '@/app/context/LanguageContext'
import { Reorder } from "framer-motion"

//⚠️ IDS
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'
const STREAMER_ID = '6e0d7faf-060c-4275-92f7-81befc3121ab'

// THE RUNNING ORDER DATA
const SONGS = [
  { id: 1, code: "se", country: "Sweden", country_ru: "Швеция", artist: "Molly Sandén", song: "Hålla mig" },
  { id: 2, code: "ch", country: "Switzerland", country_ru: "Швейцария", artist: "FABER", song: "Berlin Berlin Berlin" },
  { id: 3, code: "us", country: "USA", country_ru: "США", artist: "JAGWAR TWIN", song: "Bad Feeling" },
  { id: 4, code: "by", country: "Belarus", country_ru: "Беларусь", artist: "Иван Здонюк", song: "Больше не горит" },
  { id: 5, code: "de", country: "Germany", country_ru: "Германия", artist: "AYLIVA", song: "Wie" },
  { id: 6, code: "lt", country: "Lithuania", country_ru: "Литва", artist: "P404", song: "Kitokia" },
  { id: 7, code: "cl", country: "Chile", country_ru: "Чили", artist: "SOULFÍA", song: "inmortal" },
  { id: 8, code: "nl", country: "Netherlands", country_ru: "Нидерланды", artist: "KENSINGTON", song: "A Moment" },
  { id: 9, code: "br", country: "Brazil", country_ru: "Бразилия", artist: "Alexia Evellyn", song: "Savage Daughters" },
  { id: 10, code: "mx", country: "Mexico", country_ru: "Мексика", artist: "The WARNING", song: "More" },
  { id: 11, code: "gb", country: "UK", country_ru: "Великобритания", artist: "Paris Paloma", song: "as good a reason" },
  { id: 12, code: "be", country: "Belgium", country_ru: "Бельгия", artist: "Pierre de Maere", song: "Enfant de" },
  { id: 13, code: "ru", country: "Russia", country_ru: "Россия", artist: "Мартин", song: "жду тебя" },
  { id: 14, code: "ca", country: "Canada", country_ru: "Канада", artist: "FAOUZIA", song: "ICE" },
  { id: 15, code: "tw", country: "Taiwan", country_ru: "Тайвань", artist: "JOLIN", song: "DIY" },
  { id: 16, code: "ph", country: "Philippines", country_ru: "Филиппины", artist: "ZILD", song: "I.N.A.S." },
  { id: 17, code: "au", country: "Australia", country_ru: "Австралия", artist: "Jude York", song: "Monaco" },
  { id: 18, code: "jp", country: "Japan", country_ru: "Япония", artist: "ATARASHII GAKKO!", song: "essa hoisa" },
  { id: 19, code: "fr", country: "France", country_ru: "Франция", artist: "Novelists", song: "Turn It Up" },
  { id: 20, code: "tr", country: "Turkey", country_ru: "Турция", artist: "manifest", song: "KTS" },
  { id: 21, code: "kr", country: "South Korea", country_ru: "Южная Корея", artist: "WOODZ", song: "Drowning" },
  { id: 22, code: "kz", country: "Kazakhstan", country_ru: "Казахстан", artist: "ORYNKHAN", song: "qazir bolmasa" },
  { id: 23, code: "es", country: "Spain", country_ru: "Испания", artist: "ANA MENA", song: "Madrid City" },
  { id: 24, code: "pt", country: "Portugal", country_ru: "Португалия", artist: "Sofia Camara", song: "Who Do I Call Now" },
  { id: 25, code: "no", country: "Norway", country_ru: "Норвегия", artist: "SKAAR", song: "Obscene" },
]

// --- INTERNAL MODAL FOR VOTER LIST ---
function VoterListModal({ songId, votes, onClose, t }: { songId: number, votes: any[], onClose: () => void, t: any }) {
    const song = SONGS.find(s => s.id === songId)
    const relevantVotes = votes.filter(v => v.song_id === songId)

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="glass w-full max-w-sm p-6 rounded-2xl border border-white/20 relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{song?.country}</h2>
                        <p className="text-xs text-gray-400">{relevantVotes.length} Votes</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto space-y-3 no-scrollbar">
                    {relevantVotes.map((v, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                            {v.avatar_url ? <img src={v.avatar_url} className="w-8 h-8 rounded-full border border-white/20" /> : <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center text-xs">👤</div>}
                            <span className="font-bold text-sm text-gray-200">{v.username || 'Unknown User'}</span>
                        </div>
                    ))}
                    {relevantVotes.length === 0 && <p className="text-gray-500 text-center text-sm">No details available.</p>}
                </div>
            </div>
        </div>
    )
}

// --- FULL PREDICTION MODAL ---
function PredictionModal({ prediction, onClose, t, getCountryName }: any) {
    const orderedSongs = prediction.ranking_order.map((id: number) => SONGS.find(s => s.id === id)).filter(Boolean)

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="glass w-full max-w-md p-6 rounded-2xl border border-white/20 relative h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        {prediction.avatar_url ? <img src={prediction.avatar_url} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center">👤</div>}
                        <div>
                            <h2 className="text-lg font-bold text-white">{prediction.username}</h2>
                            <p className="text-xs text-gray-400">Prediction</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                    {orderedSongs.map((song: any, i: number) => (
                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${i===0 ? 'bg-yellow-900/20 border-yellow-500' : 'bg-white/5 border-white/5'}`}>
                            <div className={`w-8 font-mono font-bold text-center ${i===0 ? 'text-yellow-400 text-xl' : 'text-gray-500'}`}>{i + 1}</div>
                            <img src={`https://flagcdn.com/w40/${song.code}.png`} className="w-8 h-6 rounded" />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm truncate">{getCountryName(song)}</div>
                                <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function EpicvisionPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  
  // Vote State
  const [selectedSongs, setSelectedSongs] = useState<number[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isVotingOpen, setIsVotingOpen] = useState(true) 
  
  // Prediction State
  const [predictionList, setPredictionList] = useState<any[]>(SONGS) 
  const [officialResults, setOfficialResults] = useState<any[]>(SONGS) 
  const [hasOfficialResults, setHasOfficialResults] = useState(false) 
  const [hasPredicted, setHasPredicted] = useState(false)
  const [communityPredictions, setCommunityPredictions] = useState<any[]>([])
  
  // Views - Removed 'feed' from type since we removed the button
  const [predictView, setPredictView] = useState<'mine' | 'set_results' | 'leaderboard'>('mine')
  const [viewPrediction, setViewPrediction] = useState<any>(null) 
  const [isPredLocked, setIsPredLocked] = useState(false)

  // Shared State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [allVotes, setAllVotes] = useState<any[]>([])
  const [viewVotersFor, setViewVotersFor] = useState<number | null>(null) 
  const [activeTab, setActiveTab] = useState<'vote' | 'predict' | 'results'>('vote')

  const isHost = user?.id === ADMIN_ID || user?.id === STREAMER_ID
  const getCountryName = (song: any) => lang === 'ru' ? song.country_ru : song.country

  useEffect(() => {
    async function init() {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        // Load Statuses
        const { data: vStatus } = await supabase.from('site_content').select('content').eq('key', 'epicvision_voting_status').single()
        setIsVotingOpen((vStatus as any)?.content !== 'closed')
        
        const { data: pStatus } = await supabase.from('site_content').select('content').eq('key', 'epicvision_predictions_locked').single()
        setIsPredLocked((pStatus as any)?.content === 'locked')

        // Load Official Results
        const { data: resultData } = await supabase.from('site_content').select('content').eq('key', 'epicvision_results').single()
        if (resultData?.content) {
             setHasOfficialResults(true)
             const resultIds: number[] = JSON.parse(resultData.content)
             const sorted = resultIds.map(id => SONGS.find(s => s.id === id)).filter(Boolean)
             const missing = SONGS.filter(s => !resultIds.includes(s.id))
             setOfficialResults([...sorted, ...missing])
        } else {
             setHasOfficialResults(false)
        }

        if (user) {
            const { data } = await supabase.from('epicvision_votes').select('song_id').eq('user_id', user.id)
            if (data && data.length > 0) { setSelectedSongs(data.map(d => d.song_id)); setHasSubmitted(true) }

            const { data: pred } = await supabase.from('epicvision_predictions').select('ranking_order').eq('user_id', user.id).single()
            if (pred) {
                const savedOrder = pred.ranking_order.map((id: number) => SONGS.find(s => s.id === id)).filter(Boolean)
                const missing = SONGS.filter(s => !pred.ranking_order.includes(s.id))
                setPredictionList([...savedOrder, ...missing])
                setHasPredicted(true)
            }
        }
        setLoading(false)
    }
    init()

    // Real-time Status Listeners
    const channel = supabase.channel('realtime_status')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content' }, (payload) => {
        if ((payload.new as any).key === 'epicvision_voting_status') {
             setIsVotingOpen((payload.new as any).content !== 'closed')
        }
        if ((payload.new as any).key === 'epicvision_predictions_locked') {
             setIsPredLocked((payload.new as any).content === 'locked')
        }
        if ((payload.new as any).key === 'epicvision_results') {
             setHasOfficialResults(true)
             const resultIds: number[] = JSON.parse((payload.new as any).content)
             const sorted = resultIds.map(id => SONGS.find(s => s.id === id)).filter(Boolean)
             setOfficialResults([...sorted, ...SONGS.filter(s => !resultIds.includes(s.id))])
        }
    }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // --- FETCH FEEDS (Now only for Leaderboard) ---
  useEffect(() => {
      // Removed 'feed' check, only load when leaderboard is viewed or for admin
      if (activeTab === 'predict' && predictView === 'leaderboard') {
          async function fetchFeed() {
              const { data } = await supabase.from('epicvision_predictions').select('*').order('created_at', { ascending: false })
              if (data) setCommunityPredictions(data)
          }
          fetchFeed()
      }
      if (activeTab === 'results' && isHost) {
          async function fetchResults() { const { data } = await supabase.from('epicvision_votes').select('*'); if (data) setAllVotes(data) }
          fetchResults()
          const interval = setInterval(fetchResults, 5000); return () => clearInterval(interval)
      }
  }, [activeTab, predictView, isHost])

  // --- ADMIN ACTIONS ---
  const handleToggleStatus = async () => {
      const newStatus = isVotingOpen ? 'closed' : 'open'
      setIsVotingOpen(!isVotingOpen)
      await supabase.from('site_content').upsert({ key: 'epicvision_voting_status', content: newStatus })
      toast(newStatus === 'open' ? "Voting Opened 🔓" : "Voting Closed 🔒", { icon: newStatus === 'open' ? '🟢' : '🔴' })
  }

  const handleTogglePredLock = async () => {
      const newState = !isPredLocked
      setIsPredLocked(newState)
      await supabase.from('site_content').upsert({ key: 'epicvision_predictions_locked', content: newState ? 'locked' : 'open' })
      toast(newState ? "Predictions Locked 🔒" : "Predictions Unlocked 🔓", { icon: newState ? '🔴' : '🟢' })
  }

  // --- PREDICTION LOGIC ---
  const onReorderPrediction = (newOrder: any[]) => {
      if (isPredLocked) return
      setPredictionList(newOrder)
      setHasPredicted(false)
  }
  
  const onReorderResults = (newOrder: any[]) => {
      setOfficialResults(newOrder)
  }

  const moveSong = (list: any[], setList: any, index: number, direction: -1 | 1, isOfficial = false) => {
      if (!isOfficial && isPredLocked && !isHost) {
          toast.error(t.ev_pred_locked_msg || "Predictions are locked!")
          return
      }

      const newList = [...list]
      const target = index + direction
      if (target < 0 || target >= newList.length) return
      const temp = newList[index]
      newList[index] = newList[target]
      newList[target] = temp
      setList(newList)
      if (!isOfficial) setHasPredicted(false) 
  }

  const handleSubmitPrediction = async () => {
      if (!user) return
      if (isPredLocked && !isHost) { toast.error(t.ev_pred_locked_msg || "Locked!"); return }

      setSubmitting(true)
      const rankingOrder = predictionList.map(s => s.id)
      
      const { error } = await supabase.from('epicvision_predictions').upsert({
          user_id: user.id,
          username: user.user_metadata.full_name,
          avatar_url: user.user_metadata.avatar_url,
          ranking_order: rankingOrder
      }, { onConflict: 'user_id' })

      if (error) toast.error("Failed: " + error.message)
      else { toast.success("Prediction Saved! 🔮"); setHasPredicted(true) }
      setSubmitting(false)
  }

  const handleSaveResults = async () => {
      const ids = officialResults.map(s => s.id)
      await supabase.from('site_content').upsert({ key: 'epicvision_results', content: JSON.stringify(ids) })
      setHasOfficialResults(true)
      toast.success("Official Results Updated! 🏆")
      const { data } = await supabase.from('epicvision_predictions').select('*')
      if (data) setCommunityPredictions(data)
  }
  
  const handleResetResults = async () => {
      if(!confirm("Reset Official Results? Leaderboard points will be hidden.")) return
      await supabase.from('site_content').delete().eq('key', 'epicvision_results')
      setHasOfficialResults(false)
      toast.success("Results Cleared!")
  }

  const handleResetAllPredictions = async () => {
      if(!confirm("⚠️ Delete ALL user predictions? This cannot be undone.")) return
      const { error } = await supabase.from('epicvision_predictions').delete().neq('username', 'placeholder_impossible_string')
      if (error) toast.error("Error: " + error.message)
      else {
          toast.success("All Predictions Wiped")
          setCommunityPredictions([])
      }
  }

  const predictionLeaderboard = useMemo(() => {
      if (!communityPredictions || communityPredictions.length === 0) return []
      
      if (!hasOfficialResults) {
          return communityPredictions.map(p => ({ ...p, score: null }))
      }
      
      const officialIds = officialResults.map(s => s.id)

      return communityPredictions.map(userPred => {
          let score = 0
          userPred.ranking_order.forEach((songId: number, userIndex: number) => {
              const userRank = userIndex + 1
              const actualIndex = officialIds.indexOf(songId)
              if (actualIndex !== -1) {
                  const actualRank = actualIndex + 1
                  const diff = Math.abs(userRank - actualRank)
                  if (diff === 0) score += 3 
                  else if (diff === 1) score += 1 
              }
          })
          return { ...userPred, score }
      }).sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [communityPredictions, officialResults, hasOfficialResults])

  const handleToggleVote = (songId: number) => {
      if (!user) { toast.error(t.ev_login_error); return }
      if (!isVotingOpen && !isHost) { toast.error(t.ev_voting_locked_msg); return }
      
      if (selectedSongs.includes(songId)) {
          setSelectedSongs(prev => prev.filter(id => id !== songId))
          setHasSubmitted(false)
      } else {
          if (selectedSongs.length >= 5) { toast.error("Max 5 songs!"); return }
          setSelectedSongs(prev => [...prev, songId])
          setHasSubmitted(false)
      }
  }

  const handleSubmitVotes = async () => {
      if (!user) return
      if (!isVotingOpen && !isHost) return toast.error(t.ev_voting_closed)
      if (selectedSongs.length !== 5) { toast.error("Select exactly 5 songs!"); return }
      setSubmitting(true)
      await supabase.from('epicvision_votes').delete().eq('user_id', user.id)
      const votesToInsert = selectedSongs.map(id => ({ user_id: user.id, song_id: id, username: user.user_metadata.full_name, avatar_url: user.user_metadata.avatar_url }))
      const { error } = await supabase.from('epicvision_votes').insert(votesToInsert)
      if (error) toast.error("Failed to submit")
      else { toast.success("Votes Submitted! 🗳️"); setHasSubmitted(true) }
      setSubmitting(false)
  }

  const handleResetVotes = async () => {
      if (!confirm("Reset ALL votes?")) return
      await supabase.from('epicvision_votes').delete().gt('song_id', 0)
      toast.success("Reset Complete"); setAllVotes([]) 
  }

  const resultsData = useMemo(() => {
      const counts: Record<number, number> = {}
      allVotes.forEach(v => { counts[v.song_id] = (counts[v.song_id] || 0) + 1 })
      return Object.entries(counts).map(([id, count]) => { const song = SONGS.find(s => s.id === parseInt(id)); return { ...song, count } }).sort((a, b) => b.count - a.count)
  }, [allVotes])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl font-bold animate-pulse">{t.loading}</div>

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[#0f0c29] relative">
        {viewVotersFor && <VoterListModal songId={viewVotersFor} votes={allVotes} onClose={() => setViewVotersFor(null)} t={t} />}
        {viewPrediction && <PredictionModal prediction={viewPrediction} onClose={() => setViewPrediction(null)} t={t} getCountryName={getCountryName} />}
        <button onClick={toggleLanguage} className="absolute top-4 right-4 glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition z-50 shadow-lg border border-white/20">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
        <div className="text-center mb-8 mt-4"><h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.6)]">EPICVISION</h1><p className="text-gray-400 text-sm md:text-lg tracking-widest uppercase mt-2">{t.ev_subtitle}</p></div>
        
        <div className="flex flex-wrap justify-center gap-4 mb-8 bg-black/40 p-2 rounded-xl border border-white/10 backdrop-blur-md">
             <Link href="/" className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/10 transition">{t.ev_home}</Link>
             <button onClick={() => setActiveTab('vote')} className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'vote' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>{t.ev_tab_vote}</button>
             <button onClick={() => setActiveTab('predict')} className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'predict' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>{t.ev_tab_predict}</button>
             {isHost && (<><button onClick={() => setActiveTab('results')} className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'results' ? 'bg-yellow-600 text-black shadow-lg' : 'text-yellow-500 hover:bg-white/10'}`}>{t.ev_tab_results}</button><button onClick={handleToggleStatus} className={`px-6 py-2 rounded-lg font-bold transition border ${isVotingOpen ? 'bg-green-900/30 text-green-400 border-green-600' : 'bg-red-900/30 text-red-400 border-red-600'}`}>{isVotingOpen ? t.ev_status_close : t.ev_status_open}</button></>)}
        </div>

        {activeTab === 'vote' && (
            <div className="w-full max-w-4xl flex flex-col gap-3 pb-32">
                {SONGS.map((song) => {
                    const isSelected = selectedSongs.includes(song.id)
                    const cardStyle = (!isVotingOpen && !isHost) ? 'opacity-60 grayscale cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
                    return (<div key={song.id} onClick={() => handleToggleVote(song.id)} className={`relative flex items-center p-3 md:p-4 rounded-xl border transition-all duration-200 group ${cardStyle} ${isSelected ? 'bg-pink-900/40 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] transform scale-[1.01] !opacity-100 !grayscale-0' : 'bg-white/5 border-white/5'}`}><div className="w-10 md:w-16 font-mono text-gray-500 font-bold text-lg md:text-2xl opacity-50">{song.id.toString().padStart(2, '0')}</div><div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"><div className="flex items-center gap-4 w-full md:w-5/12"><div className="w-12 h-9 relative shadow-lg rounded overflow-hidden flex-shrink-0"><img src={`https://flagcdn.com/w160/${song.code}.png`} className="w-full h-full object-cover" /></div><div><h3 className="font-bold text-white text-base md:text-lg leading-tight">{getCountryName(song)}</h3><p className="text-xs text-gray-400 uppercase font-bold tracking-wide">{song.artist}</p></div></div><div className="flex-1"><p className="text-pink-400 font-bold italic text-sm md:text-base">"{song.song}"</p></div></div><div className="pl-4"><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-500 group-hover:border-white'}`}>{isSelected && <span className="text-white text-xs font-bold">✓</span>}</div></div></div>)
                })}
            </div>
        )}

        {activeTab === 'predict' && (
            <div className="w-full max-w-4xl pb-32">
                <div className="flex flex-col items-center gap-2 mb-6">
                    <div className="bg-black/40 p-1 rounded-lg border border-white/10 flex">
                        <button onClick={() => setPredictView('mine')} className={`px-4 py-2 rounded-md font-bold text-sm transition ${predictView === 'mine' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t.ev_pred_tab_mine}</button>
                        {/* REMOVED: Community Feed Button */}
                        <button onClick={() => setPredictView('leaderboard')} className={`px-4 py-2 rounded-md font-bold text-sm transition ${predictView === 'leaderboard' ? 'bg-yellow-600 text-black' : 'text-yellow-500 hover:text-yellow-300'}`}>{t.ev_pred_tab_leaderboard}</button>
                        {isHost && (<><button onClick={() => setPredictView('set_results')} className={`px-4 py-2 rounded-md font-bold text-sm transition ${predictView === 'set_results' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-white'}`}>{t.ev_pred_tab_set_results}</button><button onClick={handleTogglePredLock} className={`px-3 py-1 text-xs rounded border font-bold ${isPredLocked ? 'border-red-600 text-red-500' : 'border-green-600 text-green-500'}`}>{isPredLocked ? t.ev_pred_unlock_btn : t.ev_pred_lock_btn}</button></>)}
                    </div>
                </div>

                {predictView === 'mine' && (
                    <div className="flex flex-col gap-2">
                        <p className="text-center text-gray-400 mb-4">{t.ev_pred_subtitle}</p>
                        <Reorder.Group axis="y" values={predictionList} onReorder={onReorderPrediction} className="space-y-2">
                            {predictionList.map((song, index) => (
                                <Reorder.Item key={song.id} value={song} dragListener={!isPredLocked}>
                                    <div className={`flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 transition select-none ${isPredLocked ? 'opacity-70' : 'cursor-grab active:cursor-grabbing hover:border-purple-500/30'}`}>
                                        <div className={`font-mono font-bold text-xl w-8 text-center ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-600'}`}>{index + 1}</div>
                                        <div className="flex items-center gap-3 flex-1"><img src={`https://flagcdn.com/w40/${song.code}.png`} className="w-8 h-6 rounded shadow-sm pointer-events-none" /><div><div className="font-bold text-white text-sm">{getCountryName(song)}</div><div className="text-xs text-gray-400">{song.artist}</div></div></div>
                                        {(!isPredLocked) && (<div className="flex flex-col gap-1 border-l border-white/10 pl-2"><button onPointerDown={(e) => { e.stopPropagation(); moveSong(predictionList, setPredictionList, index, -1) }} className="text-green-400 hover:bg-white/10 p-1 rounded text-xs">▲</button><button onPointerDown={(e) => { e.stopPropagation(); moveSong(predictionList, setPredictionList, index, 1) }} className="text-red-400 hover:bg-white/10 p-1 rounded text-xs">▼</button></div>)}
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                        <div className="fixed bottom-0 w-full p-4 bg-black/90 backdrop-blur-md border-t border-white/20 text-center z-50 flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)]" style={{ left: 0 }}>
                            {(!isPredLocked) ? (
                                <button onClick={handleSubmitPrediction} disabled={submitting} className={`px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg w-full max-w-md ${hasPredicted ? 'bg-gray-700 text-gray-300 border border-gray-500' : 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 active:scale-95'}`}><span>{submitting ? 'Saving...' : hasPredicted ? t.ev_pred_update : t.ev_pred_save}</span></button>
                            ) : (
                                <div className="text-xl font-bold text-white flex items-center gap-2"><span>🔒 {t.ev_pred_locked_msg}</span></div>
                            )}
                        </div>
                    </div>
                )}

                {predictView === 'set_results' && isHost && (
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center mb-4 bg-blue-900/20 p-4 rounded-xl border border-blue-500/50"><div><h2 className="text-xl font-bold text-blue-400">Set Official Results</h2><button onClick={handleResetResults} className="text-xs text-red-400 hover:text-red-300 underline">Reset Results</button></div><div className="flex gap-2"><button onClick={handleResetAllPredictions} className="bg-red-900/50 hover:bg-red-700 text-white px-3 py-2 rounded font-bold border border-red-500 text-xs">Reset Predictions</button><button onClick={handleSaveResults} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold shadow-lg"><span>{t.ev_save_results}</span></button></div></div>
                        <Reorder.Group axis="y" values={officialResults} onReorder={onReorderResults} className="space-y-2">
                            {officialResults.map((song, index) => (
                            <Reorder.Item key={song.id} value={song} className="cursor-grab active:cursor-grabbing">
                                <div className="flex items-center gap-4 bg-blue-900/10 p-3 rounded-xl border border-blue-500/30 select-none"><div className="font-mono font-bold text-xl w-8 text-center text-blue-400">{index + 1}</div><div className="flex items-center gap-3 flex-1"><img src={`https://flagcdn.com/w40/${song.code}.png`} className="w-8 h-6 rounded shadow-sm pointer-events-none" /><div><div className="font-bold text-white text-sm">{getCountryName(song)}</div><div className="text-xs text-gray-400">{song.artist}</div></div></div><div className="text-gray-500 px-2">☰</div></div>
                            </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    </div>
                )}
                
                {predictView === 'leaderboard' && (
                    <div className="space-y-3">
                         <h2 className="text-2xl font-bold text-yellow-400 text-center mb-4"><span>{t.ev_pred_tab_leaderboard}</span></h2>
                         {predictionLeaderboard.map((p, i) => {
                             let rankStyle = "bg-white/5 border-white/10"; let rankIcon = <span className="text-gray-500 font-mono">#{i+1}</span>
                             if (i===0) { rankStyle = "bg-yellow-900/20 border-yellow-500"; rankIcon = <span>🥇</span> } else if (i===1) { rankStyle = "bg-slate-800/50 border-slate-400"; rankIcon = <span>🥈</span> } else if (i===2) { rankStyle = "bg-orange-900/20 border-orange-600"; rankIcon = <span>🥉</span> }
                             
                             // CLICK LOGIC: Only allow if results are set OR if User is HOST
                             const handleClick = () => {
                                 if (hasOfficialResults || isHost) setViewPrediction(p)
                                 else toast("🤫 Results hidden until reveal!")
                             }
                             const cursorClass = (hasOfficialResults || isHost) ? 'cursor-pointer hover:bg-white/10' : 'cursor-default opacity-80'

                             return (
                                <div key={p.user_id} onClick={handleClick} className={`flex items-center justify-between p-4 rounded-xl border transition ${rankStyle} ${cursorClass}`}>
                                    <div className="flex items-center gap-4"><div className="text-xl font-bold w-8 text-center">{rankIcon}</div>{p.avatar_url ? <img src={p.avatar_url} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center">👤</div>}<div><div className="font-bold text-white">{p.username}</div><div className="text-xs text-gray-400">Date: {new Date(p.created_at).toLocaleDateString()}</div></div></div><div className="text-right"><span className="block text-2xl font-bold text-white">{p.score !== null ? p.score : '-'}</span><span className="text-[10px] uppercase text-gray-500 font-bold"><span>{t.ev_points}</span></span></div></div>
                             )
                         })}
                         {predictionLeaderboard.length === 0 && <p className="text-center text-gray-500">Waiting for predictions...</p>}
                    </div>
                )}
            </div>
        )}

        {/* ... (Results & Vote Tabs unchanged) ... */}
        {activeTab === 'results' && isHost && (
            <div className="w-full max-w-3xl flex flex-col gap-4">
                <div className="text-center mb-4 relative"><h2 className="text-2xl font-bold text-yellow-400"><span>{t.ev_results_title}</span></h2><p className="text-gray-400"><span>{t.ev_total_votes}</span>: <span className="text-white font-mono">{allVotes.length}</span></p><button onClick={handleResetVotes} className="absolute top-0 right-0 bg-red-900/50 hover:bg-red-600 text-red-200 text-xs px-3 py-1 rounded border border-red-700 transition">🗑️ Reset All</button></div>
                {resultsData.map((data, index) => (<div key={data.id} onClick={() => setViewVotersFor(data.id || null)} className="flex items-center p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-yellow-500/50 cursor-pointer transition"><div className="w-8 font-bold text-gray-400">#{index + 1}</div><img src={`https://flagcdn.com/w40/${data.code}.png`} className="w-8 h-6 rounded mr-4" /><div className="flex-1"><div className="font-bold text-white">{getCountryName(data)}</div><div className="text-xs text-gray-400">{data.artist}</div></div><div className="text-xl font-bold text-yellow-400 font-mono">{data.count}</div></div>))}
            </div>
        )}

        {activeTab === 'vote' && (
            <div className={`fixed bottom-0 w-full p-4 backdrop-blur-md border-t border-white/20 text-center z-50 flex flex-col items-center gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] transition-colors duration-500 ${isVotingOpen ? 'bg-black/90' : 'bg-red-900/90 border-red-500'}`}>
                {isVotingOpen ? (
                    <><div className="text-sm font-bold text-gray-300"><span>{t.ev_votes_left}</span>: <span className={`text-xl mx-1 ${selectedSongs.length === 5 ? 'text-green-400' : 'text-red-400'}`}>{5 - selectedSongs.length}</span></div><button onClick={handleSubmitVotes} disabled={submitting || selectedSongs.length !== 5} className={`px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg w-full max-w-md ${hasSubmitted ? 'bg-gray-700 text-gray-300 border border-gray-500' : (selectedSongs.length === 5 ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:scale-105 active:scale-95' : 'bg-gray-700 text-gray-500 cursor-not-allowed')}`}>{submitting ? 'Sending...' : hasSubmitted ? <span>{t.ev_update}</span> : <span>{t.ev_submit}</span>}</button></>
                ) : <div className="text-xl font-bold text-white flex items-center gap-2"><span>🔒 {t.ev_voting_closed}</span></div>}
            </div>
        )}

    </div>
  )
}