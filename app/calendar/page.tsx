'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/app/context/LanguageContext'

//⚠️ YOUR ADMIN ID
const ADMIN_ID = 'f15ffc29-f012-4064-af7b-c84feb4d3320'

export default function CalendarPage() {
  const supabase = createClient()
  const { t, lang, toggleLanguage } = useLanguage()
  const [events, setEvents] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [user, setUser] = useState<User | null>(null)

  async function getEvents() {
    const { data } = await supabase.from('calendar_events').select('*')
    if (data) setEvents(data)
  }

  useEffect(() => {
    getEvents()
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleDeleteEvent = async (id: number, title: string) => {
    if (!confirm(`${t.delete_event_confirm} "${title}"?`)) return
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) alert("Error deleting event!")
    else getEvents()
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString(lang === 'ru' ? 'ru' : 'default', { month: 'long' })
  
  const firstDayIndex = new Date(year, month, 1).getDay()
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset))
    setCurrentDate(new Date(newDate))
  }

  // The Heart Path (Standard 24x24 grid)
  const heartPathData = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

  return (
    <div className="min-h-screen p-2 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* NAV */}
        <div className="relative flex overflow-x-auto md:flex-wrap md:justify-center gap-4 mb-4 md:mb-8 border-b border-white/20 pb-4 no-scrollbar">
          <Link href="/" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_betting}</Link>
          <Link href="/epicstory" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition flex items-center gap-2">
            <Image src="/twitch.png" alt="Twitch" width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 object-contain" />
            {t.nav_stream}
          </Link>
          <Link href="/tv" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_tv}</Link>
          <Link href="/calendar" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-sm md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="flex-shrink-0 px-3 py-1 md:px-4 md:py-2 text-gray-300 hover:text-white font-bold text-sm md:text-xl transition">{t.nav_leaderboard}</Link>
          <button onClick={toggleLanguage} className="absolute right-0 top-0 hidden md:block glass hover:bg-white/10 text-xl px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button>
        </div>
        <div className="md:hidden flex justify-end mb-4"><button onClick={toggleLanguage} className="glass hover:bg-white/10 text-sm px-3 py-1 rounded-full transition">{lang === 'en' ? '🇺🇸' : '🇷🇺'}</button></div>

        <div className="flex justify-between items-center mb-4 md:mb-6">
          <button onClick={() => changeMonth(-1)} className="glass hover:bg-white/10 px-3 py-1 md:px-4 md:py-2 rounded font-bold capitalize text-sm md:text-base">{t.prev}</button>
          <h2 className="text-2xl md:text-3xl font-bold capitalize text-white drop-shadow-md">{monthName} {year}</h2>
          <button onClick={() => changeMonth(1)} className="glass hover:bg-white/10 px-3 py-1 md:px-4 md:py-2 rounded font-bold capitalize text-sm md:text-base">{t.next}</button>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="min-w-[600px] md:min-w-0">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-400 font-bold uppercase tracking-wider text-xs md:text-sm">
              {lang === 'en' ? 
                <><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div></> :
                <><div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div></>
              }
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white/5 min-h-[100px] md:min-h-[140px] rounded-lg border border-white/5"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const isToday = dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                const daysEvents = events.filter(e => {
                  const eDate = new Date(e.date)
                  return eDate.getDate() === dayNum && eDate.getMonth() === month && eDate.getFullYear() === year
                })

                return (
                  // ADDED: hover:z-50 to the Day Cell itself. This brings the whole day box to the front on hover.
                  <div 
                    key={dayNum} 
                    className={`glass min-h-[100px] md:min-h-[140px] rounded-lg p-2 relative flex flex-col hover:z-50 transition-all ${isToday ? 'border-pink-500 bg-pink-500/10' : 'border-white/10'}`}
                  >
                    <span className={`text-xs md:text-sm font-bold mb-1 ${isToday ? 'text-pink-400' : 'text-gray-500'}`}>{dayNum}</span>
                    
                    {/* Event Container */}
                    <div className="flex flex-wrap gap-2 justify-center content-center flex-1">
                      {daysEvents.map(event => (
                        <div key={event.id} className="group relative">
                          {user?.id === ADMIN_ID && (
                            <button 
                              onClick={(e) => { e.preventDefault(); handleDeleteEvent(event.id, event.title); }}
                              className="absolute -top-2 -right-2 z-30 bg-red-600 hover:bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition"
                            >✕</button>
                          )}
                          
                          {/* SVG HEART - Size: w-8 (mobile) / w-10 (desktop) */}
                          <a 
                            href={event.link || '#'} target="_blank" rel="noopener noreferrer"
                            className={`block w-8 h-8 md:w-10 md:h-10 transition transform hover:scale-110 hover:z-10 ${event.link ? 'cursor-pointer' : 'cursor-default'}`}
                            onClick={(e) => !event.link && e.preventDefault()}
                          >
                            <svg 
                              viewBox="0 0 24 24" 
                              className="w-full h-full drop-shadow-lg"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <defs>
                                <clipPath id={`heartClip-${event.id}`}>
                                  <path d={heartPathData} />
                                </clipPath>
                              </defs>
                              <image 
                                href={`https://flagcdn.com/w160/${event.country_code.toLowerCase()}.png`} 
                                width="24" 
                                height="24" 
                                clipPath={`url(#heartClip-${event.id})`}
                                preserveAspectRatio="xMidYMid slice" 
                              />
                              <path d={heartPathData} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                            </svg>
                          </a>

                          {/* Hover Tooltip - High Z-Index + Backdrop Blur */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 md:w-48 bg-black/95 p-2 md:p-3 rounded-xl border border-purple-500/50 text-[10px] md:text-xs shadow-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none z-[100] backdrop-blur-xl">
                            <div className="font-bold text-white mb-1 text-center">{event.title}</div>
                            <div className="text-gray-400 text-center">{event.description}</div>
                            {event.link && <div className="text-blue-400 mt-1 text-center font-bold">{t.click_open}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}