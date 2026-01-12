'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useLanguage } from '@/app/context/LanguageContext'

export default function StreamPage() {
  const { t, lang, toggleLanguage } = useLanguage()
  
  // UPDATED: Default to '1epicstory'
  const [mainChannel, setMainChannel] = useState('1epicstory')
  
  const allChannels = [
    '1epicstory', 
    'eurovision', 
    'wiwibloggs', 
    'esc_gabriel'
  ] 

  const handleSwap = (channel: string) => {
    setMainChannel(channel)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen p-2 md:p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1">
        
        {/* NAV */}
        <div className="relative flex justify-center gap-4 md:gap-6 mb-8 border-b border-white/20 pb-4 flex-wrap">
          <Link href="/" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_betting}</Link>
          {/* EPICSTORY (Active) */}
          <Link href="/epicstory" className="px-4 py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-lg md:text-xl transition flex items-center gap-2">
            <Image src="/twitch.png" alt="Twitch" width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 object-contain" />
            {t.nav_stream}
          </Link>
          <Link href="/tv" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_tv}</Link>
          <Link href="/calendar" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="px-4 py-2 text-gray-300 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_leaderboard}</Link>
          <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
        </div>
        <div className="md:hidden flex justify-end mb-4"><button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button></div>

        {/* MAIN STAGE (SPLIT VIEW) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
            
            {/* VIDEO PLAYER (3/4 Width) */}
            <div className="lg:col-span-3">
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-[0_0_40px_rgba(100,65,165,0.3)] border border-purple-500/50 relative">
                    <iframe
                    src={`https://player.twitch.tv/?channel=${mainChannel}&parent=localhost&parent=eurovision-odds.vercel.app&muted=false`}
                    className="absolute top-0 left-0 w-full h-full"
                    allowFullScreen
                    ></iframe>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-purple-400">{mainChannel}</h1>
                        <p className="text-gray-400 text-sm">{t.main_stage}</p>
                    </div>
                </div>
            </div>

            {/* CHAT (1/4 Width) */}
            <div className="lg:col-span-1 h-[500px] lg:h-auto bg-black rounded-xl overflow-hidden border border-purple-500/30 shadow-2xl relative">
                <iframe
                    src={`https://www.twitch.tv/embed/${mainChannel}/chat?parent=localhost&parent=eurovision-odds.vercel.app&darkpopout`}
                    className="absolute top-0 left-0 w-full h-full"
                ></iframe>
            </div>
        </div>

        {/* SIDE STAGES */}
        <div className="border-t border-white/10 pt-6 md:pt-8">
          <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-gray-300">{t.more_streamers}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {allChannels.map((channel) => {
              if (channel === mainChannel) return null
              return (
                <div key={channel} className="glass rounded-lg overflow-hidden relative group">
                  <div className="aspect-video relative bg-black">
                    <iframe
                      src={`https://player.twitch.tv/?channel=${channel}&parent=localhost&parent=eurovision-odds.vercel.app&muted=true`}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    ></iframe>
                    
                    <div 
                      onClick={() => handleSwap(channel)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer backdrop-blur-sm"
                    >
                      <button className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold transform scale-110 shadow-lg border border-white/20 text-sm md:text-base">
                        {t.watch} {channel}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-black/40">
                    <span className="font-bold text-gray-300 flex items-center gap-2 text-sm md:text-base">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        {channel}
                    </span>
                    <button onClick={() => handleSwap(channel)} className="text-[10px] md:text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-purple-300 font-bold border border-white/10 transition">
                      {t.swap}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}