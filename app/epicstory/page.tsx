'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/app/context/LanguageContext'

export default function StreamPage() {
  const { t, lang, toggleLanguage } = useLanguage()
  const [mainChannel, setMainChannel] = useState('1epicstory')
  
  const allChannels = ['1epicstory', 'eurovision', 'wiwibloggs', 'esc_gabriel'] 

  const handleSwap = (channel: string) => {
    setMainChannel(channel)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* NAV */}
        <div className="relative flex justify-center gap-4 md:gap-6 mb-8 border-b border-gray-700 pb-4 flex-wrap">
          <Link href="/" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_betting}</Link>
          <Link href="/epicstory" className="px-4 py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-lg md:text-xl transition">{t.nav_stream}</Link>
          <Link href="/calendar" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_leaderboard}</Link>
          
          <button onClick={toggleLanguage} className="absolute right-0 top-0 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xl px-3 py-1 rounded-full transition">
            {lang === 'en' ? '🇺🇸' : '🇷🇺'}
          </button>
        </div>

        {/* MAIN STAGE */}
        <div className="flex flex-col items-center mb-12 animate-fade-in">
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-[0_0_40px_rgba(100,65,165,0.3)] border border-purple-500/50 relative">
            <iframe src={`https://player.twitch.tv/?channel=${mainChannel}&parent=localhost&parent=eurovision-odds.vercel.app&muted=false`} className="absolute top-0 left-0 w-full h-full" allowFullScreen></iframe>
          </div>
          <div className="mt-4 text-center flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-400">{mainChannel}</h1>
              <p className="text-gray-400 text-sm">{t.main_stage}</p>
            </div>
            <a href={`https://www.twitch.tv/${mainChannel}`} target="_blank" className="bg-[#6441A5] hover:bg-[#7d5bbe] px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2">
                {t.open_chat}
            </a>
          </div>
        </div>

        {/* SIDE STAGES */}
        <div className="border-t border-gray-800 pt-8">
          <h2 className="text-xl font-bold mb-6 text-gray-300">{t.more_streamers}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allChannels.map((channel) => {
              if (channel === mainChannel) return null
              return (
                <div key={channel} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition group relative">
                  <div className="aspect-video relative bg-black">
                    <iframe src={`https://player.twitch.tv/?channel=${channel}&parent=localhost&parent=eurovision-odds.vercel.app&muted=true`} className="absolute top-0 left-0 w-full h-full pointer-events-none"></iframe>
                    <div onClick={() => handleSwap(channel)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer backdrop-blur-sm">
                      <button className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold transform scale-110 shadow-lg border border-white/20">{t.watch} {channel}</button>
                    </div>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-gray-900">
                    <span className="font-bold text-gray-300 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>{channel}</span>
                    <button onClick={() => handleSwap(channel)} className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-purple-400 font-bold border border-gray-700">{t.swap}</button>
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