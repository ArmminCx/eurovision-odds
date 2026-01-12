'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/app/context/LanguageContext'

export default function TVPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  const [liveUrl, setLiveUrl] = useState<string | null>(null) // Changed to null for safety
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    async function init() {
      // Fetch URL
      const { data } = await supabase.from('site_content').select('content').eq('key', 'live_tv_url').single()
      if (data) setLiveUrl(data.content)
      
      // Fetch User
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      // Fetch Chat
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

  // --- SMART URL PARSER ---
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
    <div className="min-h-screen p-2 md:p-8 flex flex-col">
        <div className="max-w-6xl mx-auto w-full">
            
            {/* NAV */}
            <div className="relative flex justify-center gap-4 md:gap-6 mb-4 border-b border-white/20 pb-4 flex-wrap">
                <Link href="/" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_betting}</Link>
                <Link href="/epicstory" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition flex items-center gap-2"><Image src="/twitch.png" alt="Twitch" width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 object-contain" />{t.nav_stream}</Link>
                <Link href="/tv" className="px-4 py-2 text-white border-b-2 border-pink-500 font-bold text-sm md:text-xl transition">{t.nav_tv}</Link>
                <Link href="/calendar" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_calendar}</Link>
                <Link href="/predictions" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_predict}</Link>
                <Link href="/leaderboard" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_leaderboard}</Link>
                <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
            </div>
            <div className="md:hidden flex justify-end mb-4"><button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button></div>

            {/* DATE HEADER */}
            <div className="text-center mb-6">
                <p className="text-pink-400 font-bold text-xs uppercase tracking-widest">{t.current_date}</p>
                <h1 className="text-2xl md:text-4xl font-bold text-white">{today}</h1>
            </div>
        </div>

        {/* CONTENT GRID */}
        <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* LEFT: TV SCREEN */}
            <div className="lg:col-span-3 flex flex-col glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                
                <div className="w-full aspect-video relative bg-black">
                    {/* Only render iframe if we have a URL */}
                    {liveUrl ? (
                        <iframe 
                            src={getEmbedUrl(liveUrl)}
                            className="absolute inset-0 w-full h-full" 
                            allowFullScreen 
                            allow="autoplay; encrypted-media; picture-in-picture"
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse">
                            Loading Stream...
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-black/60 flex justify-between items-center text-xs text-gray-400">
                    <span>{t.stream_blocked}</span>
                    {liveUrl && <a href={liveUrl} target="_blank" className="text-pink-400 hover:text-white underline">{t.open_external}</a>}
                </div>
            </div>

            {/* RIGHT: CHAT */}
            <div className="lg:col-span-1 flex flex-col glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[500px] lg:h-auto">
                <div className="p-4 border-b border-white/10 bg-black/40"><h2 className="font-bold text-white">{t.chat_title}</h2></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-black/20">
                    {messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3 animate-fade-in">
                            {msg.avatar_url ? <img src={msg.avatar_url} className="w-8 h-8 rounded-full flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-purple-900 flex-shrink-0"></div>}
                            <div><span className="text-xs font-bold text-gray-400 block">{msg.username}</span><p className="text-sm text-white break-all">{msg.message}</p></div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                {user ? (
                    <form onSubmit={sendMessage} className="p-3 border-t border-white/10 bg-black/40 flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 bg-white/10 border-none rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-pink-500 outline-none" placeholder={t.chat_placeholder}/>
                        <button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white px-4 rounded-lg font-bold text-sm transition">{t.chat_send}</button>
                    </form>
                ) : <div className="p-4 text-center text-xs text-gray-500 border-t border-white/10">Log in to chat</div>}
            </div>

        </div>
    </div>
  )
}