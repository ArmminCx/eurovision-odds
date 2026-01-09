'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/app/context/LanguageContext'

export default function StreamPage() {
  const { t, lang, toggleLanguage } = useLanguage()
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
    <div className="min-h-screen p-2 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* RESPONSIVE NAV */}
        <div className="relative flex overflow-x-auto md:flex-wrap md:justify-center gap-4 mb-4 md:mb-8 border-b border-white/20 pb-4 no-scrollbar">
          <Link href="/" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_betting}</Link>
          
          {/* EPICSTORY TAB (Active + Icon) */}
          <Link href="/epicstory" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-sm md:text-xl transition flex items-center gap-2">
            {/* Using standard img tag to force load */}
            <img 
              src="/twitch.png" 
              alt="Twitch" 
              className="w-5 h-5 md:w-6 md:h-6 object-contain" 
            />
            {t.nav_stream}
          </Link>
          
          <Link href="/calendar" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_leaderboard}</Link>
          
          <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
        </div>
        <div className="md:hidden flex justify-end mb-4"><button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button></div>

        {/* MAIN STAGE */}
        <div className="flex flex-col items-center mb-8 md:mb-12 animate-fade-in">
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-[0_0_40px_rgba(100,65,165,0.3)] border border-purple-500/50 relative">
            <iframe
              src={`https://player.twitch.tv/?channel=${mainChannel}&parent=localhost&parent=eurovision-odds.vercel.app&muted=false`}
              className="absolute top-0 left-0 w-full h-full"
              allowFullScreen
            ></iframe>
          </div>

          <div className="mt-4 text-center flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-purple-400">{mainChannel}</h1>
              <p className="text-gray-400 text-xs md:text-sm">{t.main_stage}</p>
            </div>
            <a 
                href={`https://www.twitch.tv/${mainChannel}`} 
                target="_blank" 
                className="bg-[#6441A5] hover:bg-[#7d5bbe] px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 shadow-lg"
            >
                {t.open_chat}
            </a>
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
                  
                  {/* Small Player */}
                  <div className="aspect-video relative bg-black">
                    <iframe
                      src={`https://player.twitch.tv/?channel=${channel}&parent=localhost&parent=eurovision-odds.vercel.app&muted=true`}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    ></iframe>
                    
                    {/* Hover Overlay */}
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