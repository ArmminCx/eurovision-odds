'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'COUNTRY' | 'EVENT' | 'PREDICTION' | 'BROADCAST' | 'TV'>('COUNTRY')

  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [artist, setArtist] = useState(''); const [song, setSong] = useState(''); const [youtube, setYoutube] = useState('')
  const [eventDate, setEventDate] = useState(''); const [eventTitle, setEventTitle] = useState(''); const [eventCountry, setEventCountry] = useState(''); const [eventDesc, setEventDesc] = useState(''); const [eventLink, setEventLink] = useState('')
  const [finalName, setFinalName] = useState(''); const [finalCode, setFinalCode] = useState(''); const [finalDate, setFinalDate] = useState(''); const [finalTime, setFinalTime] = useState(''); const [participants, setParticipants] = useState([{ artist: '', song: '' }])
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [tvUrl, setTvUrl] = useState('')

  useEffect(() => {
    async function loadTv() {
        const { data } = await supabase.from('site_content').select('content').eq('key', 'live_tv_url').single()
        if (data) setTvUrl(data.content)
    }
    loadTv()
  }, [])

  // HANDLERS
  const handleAddCountry = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('')
    const { error } = await supabase.from('countries').insert({ name, code: code.toUpperCase(), artist, song, youtube_url: youtube })
    if (error) setMessage(`❌ Error: ${error.message}`)
    else { setMessage(`✅ Added ${name}`); setName(''); setCode(''); setArtist(''); setSong(''); setYoutube('') }
    setLoading(false)
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('')
    const { error } = await supabase.from('calendar_events').insert({ date: eventDate, title: eventTitle, country_code: eventCountry.toUpperCase(), description: eventDesc, link: eventLink })
    if (error) setMessage(`❌ Error: ${error.message}`)
    else { setMessage(`✅ Added Event: ${eventTitle}`); setEventTitle(''); setEventCountry(''); setEventDesc(''); setEventLink('') }
    setLoading(false)
  }

  const addRow = () => { setParticipants([...participants, { artist: '', song: '' }]) }
  const updateRow = (index: number, field: 'artist' | 'song', value: string) => { const newRows = [...participants]; newRows[index][field] = value; setParticipants(newRows) }
  const removeRow = (index: number) => { setParticipants(participants.filter((_, i) => i !== index)) }

  const handleCreateFinal = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('')
    const { data: finalData, error: finalError } = await supabase.from('national_finals').insert({ name: finalName, country_code: finalCode.toUpperCase(), event_date: finalDate, event_time: finalTime }).select().single()
    if (finalError || !finalData) { setMessage(`❌ Error: ${finalError?.message}`); setLoading(false); return }
    const rowsToInsert = participants.map(p => ({ final_id: finalData.id, artist: p.artist, song: p.song }))
    const { error: partError } = await supabase.from('final_participants').insert(rowsToInsert)
    if (partError) setMessage(`❌ Error parts: ${partError.message}`)
    else { setMessage(`✅ Created "${finalName}"`); setFinalName(''); setFinalCode(''); setFinalDate(''); setFinalTime(''); setParticipants([{ artist: '', song: '' }]) }
    setLoading(false)
  }

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault(); if (!broadcastMsg) return; setLoading(true)
    const { error } = await supabase.from('broadcasts').insert({ message: broadcastMsg })
    if (error) toast.error("Failed"); else { toast.success("Sent!"); setBroadcastMsg('') }
    setLoading(false)
  }

  const handleSetTv = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    // USING UPSERT TO CREATE OR UPDATE
    const { error } = await supabase.from('site_content').upsert({ key: 'live_tv_url', content: tvUrl })
    if (error) toast.error("Failed: " + error.message); else toast.success("TV URL Updated!")
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-purple-400 text-center">Admin Panel</h1>
        
        <div className="flex mb-8 bg-gray-900 rounded p-1 overflow-x-auto">
          <button onClick={() => setMode('COUNTRY')} className={`flex-1 py-2 px-4 whitespace-nowrap rounded font-bold text-sm ${mode === 'COUNTRY' ? 'bg-purple-600' : 'text-gray-400'}`}>Add Country</button>
          <button onClick={() => setMode('EVENT')} className={`flex-1 py-2 px-4 whitespace-nowrap rounded font-bold text-sm ${mode === 'EVENT' ? 'bg-purple-600' : 'text-gray-400'}`}>Calendar</button>
          <button onClick={() => setMode('PREDICTION')} className={`flex-1 py-2 px-4 whitespace-nowrap rounded font-bold text-sm ${mode === 'PREDICTION' ? 'bg-purple-600' : 'text-gray-400'}`}>Build Final</button>
          <button onClick={() => setMode('BROADCAST')} className={`flex-1 py-2 px-4 whitespace-nowrap rounded font-bold text-sm ${mode === 'BROADCAST' ? 'bg-red-600' : 'text-gray-400'}`}>📢 Alert</button>
          <button onClick={() => setMode('TV')} className={`flex-1 py-2 px-4 whitespace-nowrap rounded font-bold text-sm ${mode === 'TV' ? 'bg-blue-600' : 'text-gray-400'}`}>📺 TV</button>
        </div>
        
        {/* FORMS */}
        {mode === 'COUNTRY' && (
          <form onSubmit={handleAddCountry} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4"><input type="text" value={name} onChange={e => setName(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3" placeholder="Country" required /><input type="text" maxLength={2} value={code} onChange={e => setCode(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3 uppercase" placeholder="Code" required /></div>
            <input type="text" value={artist} onChange={e => setArtist(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3" placeholder="Artist" required />
            <input type="text" value={song} onChange={e => setSong(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3" placeholder="Song" required />
            <input type="text" value={youtube} onChange={e => setYoutube(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3 text-blue-400" placeholder="YouTube URL" />
            <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded mt-2">Add Country</button>
          </form>
        )}

        {mode === 'EVENT' && (
          <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
             <div className="grid grid-cols-2 gap-4"><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3 text-white scheme-dark" required /><input type="text" maxLength={2} value={eventCountry} onChange={e => setEventCountry(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3 uppercase" placeholder="Host Code" required /></div>
             <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3" placeholder="Event Title" required />
             <input type="text" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3" placeholder="Details" />
             <input type="text" value={eventLink} onChange={e => setEventLink(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3 text-blue-400" placeholder="Link" />
             <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded mt-2">Add Event</button>
          </form>
        )}

        {mode === 'PREDICTION' && (
          <form onSubmit={handleCreateFinal} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4"><input type="text" value={finalName} onChange={e => setFinalName(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3" placeholder="Event Name" required /><input type="text" maxLength={2} value={finalCode} onChange={e => setFinalCode(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3 uppercase" placeholder="Code" required /></div>
            <div className="grid grid-cols-2 gap-4"><input type="date" value={finalDate} onChange={e => setFinalDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3 text-white scheme-dark" required /><input type="text" value={finalTime} onChange={e => setFinalTime(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-3" placeholder="Time" /></div>
            <div className="mt-4"><label className="block text-sm text-gray-400 mb-2">Participants</label><div className="space-y-2">{participants.map((row, index) => (<div key={index} className="flex gap-2"><span className="p-3 text-gray-500 font-mono w-8 text-center">{index + 1}</span><input type="text" placeholder="Artist" value={row.artist} onChange={(e) => updateRow(index, 'artist', e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm" required /><input type="text" placeholder="Song" value={row.song} onChange={(e) => updateRow(index, 'song', e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm" required />{participants.length > 1 && <button type="button" onClick={() => removeRow(index)} className="bg-red-900/50 hover:bg-red-600 text-red-200 w-10 rounded font-bold transition">✕</button>}</div>))}</div><button type="button" onClick={addRow} className="mt-3 w-full py-2 border-2 border-dashed border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-400 rounded font-bold transition">+ Add Row</button></div>
            <button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded mt-4">Create Final</button>
          </form>
        )}

        {mode === 'BROADCAST' && (
            <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
                <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Alert Message" className="w-full h-32 bg-black border border-red-500/50 rounded p-4 text-xl font-bold text-white focus:outline-none" required />
                <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded mt-2 shadow-[0_0_15px_rgba(220,38,38,0.5)]">🚀 SEND</button>
            </form>
        )}

        {mode === 'TV' && (
            <form onSubmit={handleSetTv} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-blue-400 border-b border-blue-900 pb-2">Set Live TV URL</h2>
                <p className="text-sm text-gray-400">Supported: YouTube Live, YouTube Video, Twitch. Others may open in new tab.</p>
                <input 
                    type="text" 
                    value={tvUrl} 
                    onChange={e => setTvUrl(e.target.value)} 
                    placeholder="e.g. https://www.youtube.com/watch?v=..." 
                    className="w-full bg-black border border-blue-500/50 rounded p-4 text-white focus:outline-none"
                    required
                />
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded mt-2">💾 Update Screen</button>
            </form>
        )}

        {message && <div className="text-center p-3 rounded font-bold mt-4 border bg-gray-700">{message}</div>}

        <div className="border-t border-gray-700 mt-6 pt-6 text-center">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition font-bold">← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}