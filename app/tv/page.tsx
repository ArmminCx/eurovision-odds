'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/app/context/LanguageContext'
import toast from 'react-hot-toast'

//⚠️ YOUR ADMIN ID & STREAMER ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'
const STREAMER_ID = '6e0d7faf-060c-4275-92f7-81befc3121ab'

export default function TVPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  
  const [streams, setStreams] = useState<string[]>([]) 
  const [layout, setLayout] = useState<'focus' | 'split'>('focus')
  
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
    // FULL HEIGHT CONTAINER (NO SCROLL ON BODY)
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f0c29]">
        
        {/* TOP BAR - Fixed Height */}
        <div className="shrink-0 border-b border-white/10 bg-black/20 p-2">
            <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
                
                {/* NAV */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    <Link href="/" className="text-gray-300 hover:text-white font-bold text-sm transition">{t.nav_betting}</Link>
                    <Link href="/tv" className="text-white border-b-2 border-pink-500 font-bold text-sm transition">{t.nav_tv}</Link>
                    <Link href="/calendar" className="text-gray-300 hover:text-white font-bold text-sm transition">{t.nav_calendar}</Link>
                    <Link href="/predictions" className="text-gray-300 hover:text-white font-bold text-sm transition">{t.nav_predict}</Link>
                    <Link href="/leaderboard" className="text-gray-300 hover:text-white font-bold text-sm transition">{t.nav_leaderboard}</Link>
                </div>

                {/* DATE & CONTROLS */}
                <div className="flex items-center gap-4">
                    <div className="text-center md:text-right">
                        <p className="text-pink-400 font-bold text-[9px] uppercase tracking-widest leading-none">{t.current_date}</p>
                        <h1 className="text-sm font-bold text-white leading-tight">{today}</h1>
                    </div>
                    
                    {streams.length > 1 && (
                        <div className="flex bg-black/40 rounded p-0.5 border border-white/10">
                            <button onClick={() => setLayout('focus')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${layout === 'focus' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Focus</button>
                            <button onClick={() => setLayout('split')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${layout === 'split' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Split</button>
                        </div>
                    )}
                    <button onClick={toggleLanguage} className="glass hover:bg-white/10 text-lg px-2 py-0.5 rounded transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
                </div>
            </div>
        </div>

        {/* MAIN WORKSPACE - Fills remaining height */}
        <div className="flex-1 flex min-h-0 w-full max-w-[1920px] mx-auto p-4 gap-4">
            
            {/* 1. LEFT SIDEBAR (Thumbnails) - Only visible if multiple streams & Focus Mode */}
            {layout === 'focus' && streams.length > 1 && (
                <div className="w-48 hidden md:flex flex-col gap-3 overflow-y-auto pr-1 no-scrollbar shrink-0">
                    {streams.slice(1).map((s, i) => (
                        <div key={i} onClick={() => handleSwap(i + 1)} className="group relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/20 cursor-pointer hover:border-pink-500 transition shadow-lg">
                            <iframe src={getEmbedUrl(s)} className="w-full h-full pointer-events-none opacity-60 group-hover:opacity-100 transition"></iframe>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent">
                                <span className="opacity-0 group-hover:opacity-100 bg-pink-600 text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm">Swap</span>
                            </div>
                            {user?.id === ADMIN_ID && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteStream(s); }} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded hover:bg-red-500 z-50 shadow">🗑️</button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 2. CENTER STAGE (Main Video) */}
            <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative min-w-0">
                {streams.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-gray-500 animate-pulse">Waiting for broadcast...</p>
                    </div>
                ) : (
                    layout === 'focus' ? (
                        // FOCUS MODE: Fill the container
                        <div className="w-full h-full relative group">
                            <iframe src={getEmbedUrl(streams[0])} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
                            {user?.id === ADMIN_ID && (
                                <button onClick={() => handleDeleteStream(streams[0])} className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded hover:bg-red-500 z-50 shadow-lg opacity-0 group-hover:opacity-100 transition">🗑️</button>
                            )}
                        </div>
                    ) : (
                        // SPLIT MODE: Grid 50/50
                        <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-black">
                            {streams.map((s, i) => (
                                <div key={i} className="relative w-full h-full group border-r border-b border-white/10">
                                    <iframe src={getEmbedUrl(s)} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
                                    {i > 0 && <button onClick={() => handleSwap(i)} className="absolute top-2 left-2 bg-purple-600/80 text-white px-2 py-1 rounded text-xs font-bold hover:bg-purple-500 z-50">Swap</button>}
                                    {user?.id === ADMIN_ID && <button onClick={() => handleDeleteStream(s)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded hover:bg-red-500 z-50 shadow-lg opacity-0 group-hover:opacity-100 transition">🗑️</button>}
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* 3. RIGHT SIDEBAR (Chat) - Fixed Width */}
            <div className="w-[350px] shrink-0 flex flex-col glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-full">
                <div className="p-3 border-b border-white/10 bg-black/40 flex justify-between items-center">
                    <h2 className="font-bold text-white text-sm">{t.chat_title}</h2>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/20 text-sm no-scrollbar">
                    {messages.map((msg) => {
                        const isAdmin = msg.user_id === ADMIN_ID
                        const isStreamer = msg.user_id === STREAMER_ID
                        return (
                            <div key={msg.id} className="flex gap-2 animate-fade-in group">
                                {msg.avatar_url ? <img src={msg.avatar_url} className="w-7 h-7 rounded-full flex-shrink-0 border border-white/10" /> : <div className="w-7 h-7 rounded-full bg-purple-900 flex-shrink-0"></div>}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`text-[11px] font-bold truncate ${isAdmin ? 'text-yellow-400' : isStreamer ? 'text-[#9146FF]' : 'text-gray-300'}`}>
                                            {msg.username}
                                        </span>
                                        {isAdmin && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 rounded border border-yellow-500/30">OWNER</span>}
                                        {isStreamer && <Image src="/twitch.png" alt="Streamer" width={10} height={10} className="inline-block" />}
                                    </div>
                                    <p className="text-[13px] text-white break-words leading-snug opacity-90 group-hover:opacity-100">{msg.message}</p>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={chatEndRef} />
                </div>

                {user ? (
                    <form onSubmit={sendMessage} className="p-2 border-t border-white/10 bg-black/40 flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-pink-500 focus:bg-black/50 outline-none transition" placeholder={t.chat_placeholder}/>
                        <button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white px-3 rounded-lg font-bold text-xs transition shadow-lg">➤</button>
                    </form>
                ) : <div className="p-3 text-center text-xs text-gray-500 border-t border-white/10">Log in to chat</div>}
            </div>

        </div>
    </div>
  )
}