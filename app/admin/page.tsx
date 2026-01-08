'use client'

import { createClient } from '@/app/utils/supabase/client'
import { useState } from 'react'
import Link from 'next/link'

export default function AdminPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Form States
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [artist, setArtist] = useState('')
  const [song, setSong] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // 1. Validate
    if (!name || !code || !artist || !song) {
      setMessage('❌ Please fill in all fields')
      setLoading(false)
      return
    }

    // 2. Insert into Supabase
    const { error } = await supabase.from('countries').insert({
      name,
      code: code.toUpperCase(), // Force uppercase for flags (e.g. "fr" -> "FR")
      artist,
      song
    })

    if (error) {
      setMessage(`❌ Error: ${error.message}`)
    } else {
      setMessage(`✅ Success! Added ${name}.`)
      // Clear form
      setName('')
      setCode('')
      setArtist('')
      setSong('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-purple-400 text-center">Admin Panel</h1>
        
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          
          {/* Country Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Country Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Norway"
              className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:border-purple-500 outline-none transition"
            />
          </div>

          {/* Country Code */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Country Code (2 Letters)</label>
            <input 
              type="text" 
              maxLength={2}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. NO"
              className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:border-purple-500 outline-none uppercase font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Used for the flag image.</p>
          </div>

          {/* Artist */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Artist</label>
            <input 
              type="text" 
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="e.g. Alexander Rybak"
              className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:border-purple-500 outline-none transition"
            />
          </div>

          {/* Song */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Song Name</label>
            <input 
              type="text" 
              value={song}
              onChange={e => setSong(e.target.value)}
              placeholder="e.g. Fairytale"
              className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:border-purple-500 outline-none transition"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded mt-4 transition disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Country'}
          </button>

          {/* Status Message */}
          {message && (
            <div className={`text-center p-3 rounded font-bold ${message.includes('Error') ? 'bg-red-900/50 text-red-200 border border-red-500' : 'bg-green-900/50 text-green-200 border border-green-500'}`}>
              {message}
            </div>
          )}

        </form>

        <div className="border-t border-gray-700 mt-6 pt-6 text-center">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition font-bold flex items-center justify-center gap-2">
            <span>←</span> Back to Betting Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}