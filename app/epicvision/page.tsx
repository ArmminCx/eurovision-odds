'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { useLanguage } from '@/app/context/LanguageContext'

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

export default function EpicvisionPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  
  // Voting State
  const [selectedSongs, setSelectedSongs] = useState<number[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isVotingOpen, setIsVotingOpen] = useState(true) 
  
  // Admin Results State
  const [allVotes, setAllVotes] = useState<any[]>([])
  const [viewVotersFor, setViewVotersFor] = useState<number | null>(null) 

  const [activeTab, setActiveTab] = useState<'vote' | 'predict' | 'results'>('vote')

  // --- PERMISSION CHECK ---
  const isHost = user?.id === ADMIN_ID || user?.id === STREAMER_ID

  useEffect(() => {
    async function init() {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        // 1. Check Voting Status
        const { data: statusData } = await supabase.from('site_content').select('content').eq('key', 'epicvision_voting_status').single()
        setIsVotingOpen((statusData as any)?.content !== 'closed')

        if (user) {
            // 2. Fetch User's Votes
            const { data } = await supabase.from('epicvision_votes').select('song_id').eq('user_id', user.id)
            if (data && data.length > 0) {
                setSelectedSongs(data.map(d => d.song_id))
                setHasSubmitted(true)
            }
        }
        setLoading(false)
    }
    init()

    // 3. Real-time Status Listener
    const channel = supabase.channel('realtime_status')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_content', filter: "key=eq.epicvision_voting_status" },
        (payload) => {
            setIsVotingOpen((payload.new as any).content !== 'closed')
        }
    )
    .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // --- HOST: Toggle Status (Lock/Unlock) ---
  const handleToggleStatus = async () => {
      const newStatus = isVotingOpen ? 'closed' : 'open'
      setIsVotingOpen(!isVotingOpen)
      await supabase.from('site_content').upsert({ key: 'epicvision_voting_status', content: newStatus })
      toast(newStatus === 'open' ? "Voting Opened 🔓" : "Voting Closed 🔒", { icon: newStatus === 'open' ? '🟢' : '🔴' })
  }

  // --- HOST: Fetch Results ---
  useEffect(() => {
      if (activeTab === 'results' && isHost) {
          async function fetchResults() {
              const { data } = await supabase.from('epicvision_votes').select('*')
              if (data) setAllVotes(data)
          }
          fetchResults()
          const interval = setInterval(fetchResults, 5000) 
          return () => clearInterval(interval)
      }
  }, [activeTab, isHost])

  const handleToggleVote = (songId: number) => {
      if (!user) { toast.error(t.ev_login_error); return }
      
      // Prevent editing if closed (Unless Host)
      if (!isVotingOpen && !isHost) {
          toast.error(t.ev_voting_locked_msg)
          return
      }
      
      if (selectedSongs.includes(songId)) {
          setSelectedSongs(prev => prev.filter(id => id !== songId))
          setHasSubmitted(false)
      } else {
          if (selectedSongs.length >= 5) {
              toast.error("You can only select 5 songs!")
              return
          }
          setSelectedSongs(prev => [...prev, songId])
          setHasSubmitted(false)
      }
  }

  const handleSubmitVotes = async () => {
      if (!user) return
      
      if (!isVotingOpen && !isHost) return toast.error(t.ev_voting_closed)

      if (selectedSongs.length === 0) return toast.error("Select at least 1 song")
      
      setSubmitting(true)
      
      await supabase.from('epicvision_votes').delete().eq('user_id', user.id)
      
      const votesToInsert = selectedSongs.map(id => ({
          user_id: user.id,
          song_id: id,
          username: user.user_metadata.full_name || 'Anonymous', 
          avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture 
      }))
      
      const { error } = await supabase.from('epicvision_votes').insert(votesToInsert)
      
      if (error) {
          toast.error("Failed to submit")
      } else {
          toast.success("Votes Submitted! 🗳️")
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.8 } })
          setHasSubmitted(true)
      }
      setSubmitting(false)
  }

  // --- HOST: Reset All Votes ---
  const handleResetVotes = async () => {
      if (!confirm("⚠️ WARNING: This will delete ALL votes from every user. Are you sure?")) return
      if (!confirm("This action cannot be undone. Type 'YES' in your mind to confirm.")) return
      
      const { error } = await supabase.from('epicvision_votes').delete().gt('song_id', 0)
      
      if (error) {
          toast.error("Error: " + error.message)
      } else {
          toast.success("All votes have been reset!")
          setAllVotes([]) 
      }
  }

  const getCountryName = (song: any) => lang === 'ru' ? song.country_ru : song.country

  const resultsData = useMemo(() => {
      const counts: Record<number, number> = {}
      allVotes.forEach(v => {
          counts[v.song_id] = (counts[v.song_id] || 0) + 1
      })
      
      return Object.entries(counts)
          .map(([id, count]) => {
              const song = SONGS.find(s => s.id === parseInt(id))
              return { ...song, count }
          })
          .sort((a, b) => b.count - a.count)
  }, [allVotes])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl font-bold animate-pulse">{t.loading}</div>

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[#0f0c29] relative">
        
        {/* --- VOTER MODAL --- */}
        {viewVotersFor && (
            <VoterListModal 
                songId={viewVotersFor} 
                votes={allVotes} 
                onClose={() => setViewVotersFor(null)} 
                t={t}
            />
        )}

        {/* --- LANGUAGE TOGGLE --- */}
        <button onClick={toggleLanguage} className="absolute top-4 right-4 glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition z-50 shadow-lg border border-white/20">
            {lang === 'en' ? '🇺🇸' : '🇷🇺'}
        </button>

        {/* HEADER */}
        <div className="text-center mb-8 mt-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.6)]">
                EPICVISION
            </h1>
            <p className="text-gray-400 text-sm md:text-lg tracking-widest uppercase mt-2">{t.ev_subtitle}</p>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 bg-black/40 p-2 rounded-xl border border-white/10 backdrop-blur-md">
             <Link href="/" className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/10 transition">{t.ev_home}</Link>
             <button onClick={() => setActiveTab('vote')} className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'vote' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>{t.ev_tab_vote}</button>
             <button onClick={() => setActiveTab('predict')} className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'predict' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>{t.ev_tab_predict}</button>
             
             {/* HOST CONTROLS (Admin + Streamer) */}
             {isHost && (
                <>
                    <button onClick={() => setActiveTab('results')} className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'results' ? 'bg-yellow-600 text-black shadow-lg' : 'text-yellow-500 hover:bg-white/10'}`}>{t.ev_tab_results}</button>
                    
                    {/* LOCK BUTTON */}
                    <button 
                        onClick={handleToggleStatus} 
                        className={`px-6 py-2 rounded-lg font-bold transition border ${isVotingOpen ? 'bg-green-900/30 text-green-400 border-green-600' : 'bg-red-900/30 text-red-400 border-red-600'}`}
                    >
                        {isVotingOpen ? t.ev_status_close : t.ev_status_open}
                    </button>
                </>
             )}
        </div>

        {/* --- TAB: VOTE --- */}
        {activeTab === 'vote' && (
            <div className="w-full max-w-4xl flex flex-col gap-3 pb-32">
                {SONGS.map((song) => {
                    const isSelected = selectedSongs.includes(song.id)
                    // If locked, make cards look disabled (unless selected)
                    const cardStyle = (!isVotingOpen && !isHost) 
                        ? 'opacity-60 grayscale cursor-not-allowed' 
                        : 'cursor-pointer hover:bg-white/10'

                    return (
                        <div 
                            key={song.id}
                            onClick={() => handleToggleVote(song.id)}
                            className={`
                                relative flex items-center p-3 md:p-4 rounded-xl border transition-all duration-200 group
                                ${cardStyle}
                                ${isSelected 
                                    ? 'bg-pink-900/40 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] transform scale-[1.01] !opacity-100 !grayscale-0' 
                                    : 'bg-white/5 border-white/5'
                                }
                            `}
                        >
                            <div className="w-10 md:w-16 font-mono text-gray-500 font-bold text-lg md:text-2xl opacity-50">{song.id.toString().padStart(2, '0')}</div>
                            <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                                <div className="flex items-center gap-4 w-full md:w-5/12">
                                    <div className="w-12 h-9 relative shadow-lg rounded overflow-hidden flex-shrink-0">
                                        <img src={`https://flagcdn.com/w160/${song.code}.png`} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base md:text-lg leading-tight">{getCountryName(song)}</h3>
                                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">{song.artist}</p>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-pink-400 font-bold italic text-sm md:text-base">"{song.song}"</p>
                                </div>
                            </div>
                            <div className="pl-4">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-500 group-hover:border-white'}`}>
                                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}

        {/* --- TAB: RESULTS (HOST ONLY) --- */}
        {activeTab === 'results' && isHost && (
            <div className="w-full max-w-3xl flex flex-col gap-4">
                <div className="text-center mb-4 relative">
                    <h2 className="text-2xl font-bold text-yellow-400">{t.ev_results_title}</h2>
                    <p className="text-gray-400">{t.ev_total_votes}: <span className="text-white font-mono">{allVotes.length}</span></p>
                    
                    <button 
                        onClick={handleResetVotes}
                        className="absolute top-0 right-0 bg-red-900/50 hover:bg-red-600 text-red-200 text-xs px-3 py-1 rounded border border-red-700 transition"
                    >
                        🗑️ Reset All
                    </button>
                </div>

                {resultsData.map((data, index) => (
                    <div 
                        key={data.id} 
                        onClick={() => setViewVotersFor(data.id || null)}
                        className="flex items-center p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-yellow-500/50 cursor-pointer transition"
                    >
                        <div className="w-8 font-bold text-gray-400">#{index + 1}</div>
                        <img src={`https://flagcdn.com/w40/${data.code}.png`} className="w-8 h-6 rounded mr-4" />
                        <div className="flex-1">
                            <div className="font-bold text-white">{getCountryName(data)}</div>
                            <div className="text-xs text-gray-400">{data.artist}</div>
                        </div>
                        <div className="text-xl font-bold text-yellow-400 font-mono">{data.count}</div>
                    </div>
                ))}
            </div>
        )}

        {/* --- TAB: PREDICTIONS (Placeholder) --- */}
        {activeTab === 'predict' && (
            <div className="w-full max-w-3xl glass p-10 rounded-2xl border border-purple-500/30 text-center">
                <h2 className="text-3xl font-bold text-purple-400 mb-4">{t.ev_predict_title}</h2>
                <p className="text-gray-300">{t.ev_predict_desc}</p>
                <div className="mt-8 flex justify-center"><span className="text-6xl animate-bounce">🔮</span></div>
            </div>
        )}

        {/* STICKY FOOTER */}
        {activeTab === 'vote' && (
            <div className={`fixed bottom-0 w-full p-4 backdrop-blur-md border-t border-white/20 text-center z-50 flex flex-col items-center gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] transition-colors duration-500 ${isVotingOpen ? 'bg-black/90' : 'bg-red-900/90 border-red-500'}`}>
                
                {isVotingOpen ? (
                    <>
                        <div className="text-sm font-bold text-gray-300">
                            {t.ev_votes_left}: <span className={`text-xl mx-1 ${selectedSongs.length === 5 ? 'text-green-400' : 'text-yellow-400'}`}>{5 - selectedSongs.length}</span>
                        </div>

                        <button 
                            onClick={handleSubmitVotes}
                            disabled={submitting || selectedSongs.length === 0}
                            className={`
                                px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg w-full max-w-md
                                ${hasSubmitted 
                                    ? 'bg-gray-700 text-gray-300 border border-gray-500' 
                                    : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            {submitting ? 'Sending...' : hasSubmitted ? t.ev_update : t.ev_submit}
                        </button>
                    </>
                ) : (
                    // LOCKED STATE FOOTER
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        🔒 {t.ev_voting_closed}
                    </div>
                )}
            </div>
        )}

    </div>
  )
}