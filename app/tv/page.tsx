'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/app/context/LanguageContext'
import toast from 'react-hot-toast'
import LiveTranslator from '@/app/components/LiveTranslator'

//⚠️ YOUR ADMIN ID & STREAMER ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'
const STREAMER_ID = '6e0d7faf-060c-4275-92f7-81befc3121ab'

export default function TVPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  
  const [streams, setStreams] = useState<string[]>([]) 
  const [layout, setLayout] = useState<'focus' | 'split'>('focus')
  const [isCinemaMode, setIsCinemaMode] = useState(false)
  
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('site_content').select('content').eq('key', 'live_tv_url').single()
      if (data?.content) {
          try {
              const parsed = JSON.parse(data.content)
              if (Array.isArray(parsed)) setStreams(parsed)
              else setStreams([data.content])
          } catch {
              setStreams([data.content])
          }
      }
      
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      const { data: msgs } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(50)
      if (msgs) setMessages(msgs.reverse())
    }
    init()

    const channel = supabase.channel('live_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView() }, [messages])

  // --- CINEMA MODE LOGIC ---
  const toggleCinemaMode = () => {
    if (!isCinemaMode) {
        document.documentElement.requestFullscreen().catch((e) => console.log(e))
        setIsCinemaMode(true)
    } else {
        if (document.fullscreenElement) document.exitFullscreen()
        setIsCinemaMode(false)
    }
  }

  useEffect(() => {
      const handleEsc = () => {
          if (!document.fullscreenElement && isCinemaMode) setIsCinemaMode(false)
      }
      document.addEventListener('fullscreenchange', handleEsc)
      return () => document.removeEventListener('fullscreenchange', handleEsc)
  }, [isCinemaMode])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return
    const msg = newMessage; setNewMessage('')
    const avatar = user.user_metadata.avatar_url || user.user_metadata.picture
    await supabase.from('chat_messages').insert({
        user_id: user.id, username: user.user_metadata.full_name,
        avatar_url: avatar, message: msg
    })
  }

  const handleSwap = (index: number) => {
      const newStreams = [...streams]
      const temp = newStreams[0]
      newStreams[0] = newStreams[index]
      newStreams[index] = temp
      setStreams(newStreams)
  }

  const handleDeleteStream = async (urlToDelete: string) => {
      if(!confirm("Remove this stream?")) return
      const newStreams = streams.filter(s => s !== urlToDelete)
      setStreams(newStreams)
      if (newStreams.length <= 1) setLayout('focus')
      const { error } = await supabase.from('site_content').upsert({
          key: 'live_tv_url',
          content: JSON.stringify(newStreams)
      })
      if(error) toast.error("Failed to delete")
      else toast.success("Stream Removed")
  }

  const getEmbedUrl = (url: string | null) => {
    if (!url) return ''
    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/')
    if (url.includes('youtube.com/live/')) return url.replace('live/', 'embed/')
    if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/')
    if (url.includes('twitch.tv/')) {
        const channel = url.split('/').pop()
        return `https://player.twitch.tv/?channel=${channel}&parent=eurovision-odds.vercel.app&parent=localhost&muted=false`
    }
    return url
  }

  return (
    <>
        {/* --- PRIVATE TRANSLATOR (Visible on top of everything) --- */}
        {user && <LiveTranslator userId={user.id} />}

        {/* --- MAIN PAGE LAYOUT --- */}
        {/* Only apply layout styling if NOT in cinema mode to avoid background leaks */}
        <div className={`min-h-screen flex flex-col h-screen overflow-hidden ${isCinemaMode ? 'bg-black' : 'p-2 md:p-6'}`}>
            
            {/* HIDE NAV & HEADER IN CINEMA MODE */}
            {!isCinemaMode && (
                <div className="max-w-[1600px] mx-auto w-full">
                    {/* NAV */}
                    <div className="relative flex justify-center gap-4 md:gap-6 mb-2 border-b border-white/20 pb-2 flex-wrap">
                        <Link href="/" className="px-4 py-1 text-gray-300 hover:text-white font-bold text-sm md:text-lg transition">{t.nav_betting}</Link>
                        <Link href="/epicstory" className="px-4 py-1 text-gray-300 hover:text-white font-bold text-sm md:text-lg transition flex items-center gap-2"><Image src="/twitch.png" alt="Twitch" width={20} height={20} className="object-contain" />{t.nav_stream}</Link>
                        <Link href="/tv" className="px-4 py-1 text-white border-b-2 border-pink-500 font-bold text-sm md:text-lg transition">{t.nav_tv}</Link>
                        <Link href="/calendar" className="px-4 py-1 text-gray-300 hover:text-white font-bold text-sm md:text-lg transition">{t.nav_calendar}</Link>
                        <Link href="/predictions" className="px-4 py-1 text-gray-300 hover:text-white font-bold text-sm md:text-lg transition">{t.nav_predict}</Link>
                        <Link href="/leaderboard" className="px-4 py-1 text-gray-300 hover:text-white font-bold text-sm md:text-lg transition">{t.nav_leaderboard}</Link>
                        <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
                    </div>

                    {/* HEADER + LAYOUT CONTROLS */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-2 h-[50px] shrink-0">
                        <div className="text-center md:text-left mb-2 md:mb-0">
                            <p className="text-pink-400 font-bold text-[10px] uppercase tracking-widest">{t.current_date}</p>
                            <h1 className="text-xl md:text-2xl font-bold text-white">{today}</h1>
                        </div>
                        {streams.length > 1 && (
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                <button onClick={() => setLayout('focus')} className={`px-3 py-1 rounded text-xs font-bold transition ${layout === 'focus' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Focus</button>
                                <button onClick={() => setLayout('split')} className={`px-3 py-1 rounded text-xs font-bold transition ${layout === 'split' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Split</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            {/* If Cinema Mode: Use fixed positioning to fill screen. Else: Use normal flex layout. */}
            <div className={isCinemaMode ? "fixed inset-0 w-screen h-screen z-[500] bg-black" : "flex-1 flex gap-4 w-full max-w-[1600px] mx-auto min-h-0 pb-4"}>
                
                {/* 1. LEFT SIDEBAR (Only in Focus mode + Normal View + >1 stream) */}
                {/* HIDDEN IN CINEMA MODE */}
                {!isCinemaMode && layout === 'focus' && streams.length > 1 && (
                   <div className="hidden md:flex w-48 flex-col gap-3 overflow-y-auto shrink-0 pr-1 no-scrollbar">
                       {streams.slice(1).map((s, i) => (
                           <div key={i} className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/20 group shadow-lg shrink-0 cursor-pointer hover:border-pink-500 transition" onClick={() => handleSwap(i + 1)}>
                               <iframe src={getEmbedUrl(s)} className="w-full h-full pointer-events-none opacity-60 group-hover:opacity-100 transition"></iframe>
                               <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent">
                                    <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">Click to Swap</span>
                               </div>
                               {user?.id === ADMIN_ID && (
                                   <button onClick={(e) => { e.stopPropagation(); handleDeleteStream(s); }} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded hover:bg-red-500 z-50 shadow">🗑️</button>
                               )}
                           </div>
                       ))}
                   </div>
                )}

                {/* 2. CENTER: VIDEO STAGE (The only thing visible in Cinema Mode) */}
                <div className={`flex-1 flex flex-col min-w-0 ${isCinemaMode ? 'w-full h-full' : ''}`}>
                    {streams.length === 0 ? (
                        <div className="glass w-full h-full flex items-center justify-center rounded-2xl border border-white/10">
                            <p className="text-gray-500 animate-pulse">Waiting for broadcast signal...</p>
                        </div>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            
                            {/* FOCUS MODE */}
                            {layout === 'focus' && (
                                <div className={`
                                    bg-black overflow-hidden shadow-2xl relative transition-all duration-300 group
                                    ${isCinemaMode ? 'w-full h-full' : 'aspect-video w-full max-h-full rounded-xl border border-white/10'}
                                `}>
                                    <iframe src={getEmbedUrl(streams[0])} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
                                    
                                    {/* CINEMA BUTTON - Always visible on hover */}
                                    <button 
                                        onClick={toggleCinemaMode}
                                        className="absolute bottom-4 right-4 z-[100] bg-black/80 hover:bg-pink-600 text-white px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-md transition shadow-lg font-bold text-xs flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                    >
                                        {isCinemaMode ? '↙ Exit Fullscreen' : '⛶ Cinema Mode'}
                                    </button>

                                    {!isCinemaMode && user?.id === ADMIN_ID && (
                                        <button onClick={() => handleDeleteStream(streams[0])} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded hover:bg-red-500 z-50 shadow-lg">🗑️</button>
                                    )}
                                </div>
                            )}

                            {/* SPLIT MODE */}
                            {layout === 'split' && (
                                <div className="grid grid-cols-2 gap-4 w-full h-full">
                                    {streams.map((s, i) => (
                                        <div key={i} className={`relative bg-black overflow-hidden shadow-2xl flex items-center justify-center group ${isCinemaMode ? '' : 'rounded-xl border border-white/10'}`}>
                                            <div className="w-full h-full relative">
                                                <iframe src={getEmbedUrl(s)} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
                                            </div>
                                            {!isCinemaMode && i > 0 && <button onClick={() => handleSwap(i)} className="absolute top-2 left-2 bg-purple-600/80 text-white px-2 py-1 rounded text-xs font-bold hover:bg-purple-500 z-50">Swap 🔄</button>}
                                            {!isCinemaMode && user?.id === ADMIN_ID && <button onClick={() => handleDeleteStream(s)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded hover:bg-red-500 z-50 shadow-lg">🗑️</button>}
                                        </div>
                                    ))}
                                    {/* Note: Cinema Mode on Split View doesn't have a dedicated exit button inside the grid, user uses ESC */}
                                    {isCinemaMode && (
                                        <button 
                                            onClick={toggleCinemaMode}
                                            className="fixed bottom-4 right-4 z-[100] bg-black/80 hover:bg-pink-600 text-white px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-md transition shadow-lg font-bold text-xs"
                                        >
                                            ↙ Exit
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. RIGHT: CHAT (Hidden in Cinema Mode) */}
                {!isCinemaMode && (
                    <div className="w-[350px] shrink-0 hidden lg:flex lg:flex-col h-full">
                        <div className="flex flex-col glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-full">
                            <div className="p-3 border-b border-white/10 bg-black/40"><h2 className="font-bold text-white text-sm">{t.chat_title}</h2></div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar bg-black/20 text-sm">
                                {messages.map((msg) => {
                                    const isAdmin = msg.user_id === ADMIN_ID
                                    const isStreamer = msg.user_id === STREAMER_ID
                                    return (
                                        <div key={msg.id} className="flex gap-2 animate-fade-in">
                                            {msg.avatar_url ? <img src={msg.avatar_url} className="w-6 h-6 rounded-full flex-shrink-0" /> : <div className="w-6 h-6 rounded-full bg-purple-900 flex-shrink-0"></div>}
                                            <div>
                                                <span className={`text-[10px] font-bold flex items-center gap-1 ${isAdmin ? 'text-yellow-400' : isStreamer ? 'text-[#9146FF]' : 'text-gray-400'}`}>
                                                    {msg.username}
                                                    {isAdmin && " 👑"}
                                                    {isStreamer && <Image src="/twitch.png" alt="Streamer" width={10} height={10} className="inline-block" />}
                                                </span>
                                                <p className="text-xs text-white break-all leading-tight">{msg.message}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={chatEndRef} />
                            </div>
                            {user ? (
                                <form onSubmit={sendMessage} className="p-2 border-t border-white/10 bg-black/40 flex gap-2">
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 bg-white/10 border-none rounded px-3 py-2 text-white text-xs focus:ring-1 focus:ring-pink-500 outline-none" placeholder={t.chat_placeholder}/>
                                    <button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white px-3 rounded font-bold text-xs transition">{t.chat_send}</button>
                                </form>
                            ) : <div className="p-2 text-center text-[10px] text-gray-500 border-t border-white/10">Log in to chat</div>}
                        </div>
                    </div>
                )}

            </div>
        </div>
    </>
  )
}