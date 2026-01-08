'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'

// ⚠️ YOUR ADMIN ID
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
    if (error) alert("Error!")
    else getEvents()
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  // Manual month names for better translation control or rely on locale
  const monthName = currentDate.toLocaleString(lang === 'ru' ? 'ru' : 'default', { month: 'long' })
  
  const firstDayIndex = new Date(year, month, 1).getDay()
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset))
    setCurrentDate(new Date(newDate))
  }

  const heartPath = "path('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z')"

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* NAV */}
        <div className="relative flex justify-center gap-4 md:gap-6 mb-8 border-b border-gray-700 pb-4 flex-wrap">
          <Link href="/" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_betting}</Link>
          <Link href="/epicstory" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_stream}</Link>
          <Link href="/calendar" className="px-4 py-2 text-purple-400 border-b-2 border-purple-400 font-bold text-lg md:text-xl transition">{t.nav_calendar}</Link>
          <Link href="/predictions" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_predict}</Link>
          <Link href="/leaderboard" className="px-4 py-2 text-gray-400 hover:text-white font-bold text-lg md:text-xl transition">{t.nav_leaderboard}</Link>
          
          <button onClick={toggleLanguage} className="absolute right-0 top-0 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xl px-3 py-1 rounded-full transition">
            {lang === 'en' ? '🇺🇸' : '🇷🇺'}
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <button onClick={() => changeMonth(-1)} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded font-bold capitalize">{t.prev}</button>
          <h2 className="text-3xl font-bold capitalize">{monthName} {year}</h2>
          <button onClick={() => changeMonth(1)} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded font-bold capitalize">{t.next}</button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-400 font-bold uppercase tracking-wider">
          {/* Days of week can be hardcoded or dynamic */}
          {lang === 'en' ? 
            <><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div></> :
            <><div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div></>
          }
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-900/50 h-32 rounded-lg border border-gray-800/50"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            const isToday = dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const daysEvents = events.filter(e => {
              const eDate = new Date(e.date)
              return eDate.getDate() === dayNum && eDate.getMonth() === month && eDate.getFullYear() === year
            })

            return (
              <div key={dayNum} className={`bg-gray-800 h-32 rounded-lg border p-2 relative ${isToday ? 'border-purple-500 bg-gray-800/80' : 'border-gray-700'}`}>
                <span className={`text-sm font-bold ${isToday ? 'text-purple-400' : 'text-gray-500'}`}>{dayNum}</span>
                <div className="flex flex-wrap gap-1 mt-1 justify-center">
                  {daysEvents.map(event => (
                    <div key={event.id} className="group relative">
                      {user?.id === ADMIN_ID && (
                        <button 
                          onClick={(e) => { e.preventDefault(); handleDeleteEvent(event.id, event.title); }}
                          className="absolute -top-2 -right-2 z-30 bg-red-600 hover:bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition"
                        >✕</button>
                      )}
                      <a 
                        href={event.link || '#'} target="_blank" rel="noopener noreferrer"
                        className={`block w-8 h-8 transition transform group-hover:scale-110 ${event.link ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={(e) => !event.link && e.preventDefault()}
                      >
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(https://flagcdn.com/w80/${event.country_code.toLowerCase()}.png)`, clipPath: heartPath, backgroundColor: 'white' }}></div>
                      </a>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 p-3 rounded-lg border border-purple-500 text-xs shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
                        <div className="font-bold text-white text-sm mb-1">{event.title}</div>
                        <div className="text-gray-300">{event.description}</div>
                        {event.link && <div className="text-blue-400 mt-1">{t.click_open}</div>}
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
  )
}