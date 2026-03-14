'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'

type Channel = {
    channel_number: number
    channel_type: 'static' | 'video_url' | 'mp4' | 'twitch'
    content_url: string | null
}

const DEFAULT_CHANNELS: Channel[] = Array.from({ length: 10 }, (_, i) => ({
    channel_number: i,
    channel_type: 'static',
    content_url: '',
}))

export default function AdminPuzzlePage() {
    const router = useRouter()
    const supabase = createClient()
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
    const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS)
    const [saving, setSaving] = useState<number | null>(null)
    const [uploading, setUploading] = useState<number | null>(null)

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }

            // Security check — only allow the specific admin user ID
            if (user.id !== 'f15ffc29-f012-4064-af7b-c84feb4d3320') {
                router.push('/')
                return
            }

            setIsAdmin(true)

            // Fetch channels
            const { data } = await supabase
                .from('puzzle_tv_channels')
                .select('*')
                .order('channel_number', { ascending: true })

            if (data && data.length > 0) {
                const merged = [...DEFAULT_CHANNELS]
                data.forEach(dbCh => {
                    merged[dbCh.channel_number] = dbCh as Channel
                })
                setChannels(merged)
            }
        }
        init()
    }, [])

    async function handleSave(ch: Channel) {
        setSaving(ch.channel_number)

        // Auto-convert standard YouTube links to embed links + add autoplay & modestbranding
        let finalUrl = ch.content_url || ''
        if (ch.channel_type === 'video_url' && finalUrl.includes('youtube.com/watch?v=')) {
            const vidId = new URL(finalUrl).searchParams.get('v')
            if (vidId) {
                finalUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&enablejsapi=1&controls=0&loop=1&playlist=${vidId}&rel=0&modestbranding=1&showinfo=0`
            }
        } else if (ch.channel_type === 'video_url' && finalUrl.includes('youtu.be/')) {
            const vidId = finalUrl.split('youtu.be/')[1].split('?')[0]
            if (vidId) {
                finalUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&enablejsapi=1&controls=0&loop=1&playlist=${vidId}&rel=0&modestbranding=1&showinfo=0`
            }
        } else if (ch.channel_type === 'twitch') {
            // Extract channel name from full URL if provided, otherwise assume it's just the name
            if (finalUrl.includes('twitch.tv/')) {
                finalUrl = finalUrl.split('twitch.tv/')[1].split('?')[0].split('/')[0]
            }
        }

        const { error } = await supabase
            .from('puzzle_tv_channels')
            .upsert({
                channel_number: ch.channel_number,
                channel_type: ch.channel_type,
                content_url: finalUrl || null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'channel_number' })

        if (error) alert('Failed to save: ' + error.message)
        setSaving(null)
    }

    function handleChange(num: number, field: keyof Channel, val: string) {
        setChannels(prev => prev.map(c => c.channel_number === num ? { ...c, [field]: val } : c))
    }

    if (isAdmin === null) return null // Hide while checking

    return (
        <div style={{
            minHeight: '100vh', background: '#08080a', color: '#ccc',
            fontFamily: '"Space Mono", monospace', padding: '40px'
        }}>
            <h1 style={{ color: '#00ff88', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>
        // Transmission 2 — Channel Manager
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px' }}>
                {channels.map(ch => (
                    <div key={ch.channel_number} style={{
                        background: '#111', border: '1px solid #333', padding: '16px',
                        borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '16px'
                    }}>
                        <div style={{ width: '60px', color: '#fff', fontWeight: 'bold' }}>CH {ch.channel_number}</div>

                        <select
                            value={ch.channel_type}
                            onChange={e => handleChange(ch.channel_number, 'channel_type', e.target.value)}
                            style={{
                                background: '#000', color: '#00ff88', border: '1px solid #333',
                                padding: '8px', borderRadius: '4px', outline: 'none', fontFamily: 'inherit'
                            }}
                        >
                            <option value="static">Static</option>
                            <option value="video_url">Video URL (iframe)</option>
                            <option value="mp4">MP4 File</option>
                            <option value="twitch">Twitch Stream</option>
                        </select>

                        <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder={
                                    ch.channel_type === 'mp4' ? "e.g., /my-video.mp4 (Put video in 'public' folder)" : 
                                    ch.channel_type === 'twitch' ? "Twitch channel name or URL (e.g., relaxbeats)" :
                                    "Content URL (YouTube embed or exact .mp4 link)"
                                }
                                value={ch.content_url || ''}
                                onChange={e => handleChange(ch.channel_number, 'content_url', e.target.value)}
                                disabled={ch.channel_type === 'static'}
                                style={{
                                    flex: 1, background: '#000', color: '#fff', border: '1px solid #333',
                                    padding: '8px', borderRadius: '4px', outline: 'none', fontFamily: 'inherit',
                                    opacity: ch.channel_type === 'static' ? 0.3 : 1
                                }}
                            />
                        </div>

                        <button
                            onClick={() => handleSave(ch)}
                            disabled={saving === ch.channel_number}
                            style={{
                                background: '#00ff88', color: '#000', border: 'none',
                                padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold',
                                cursor: 'pointer', fontFamily: 'inherit'
                            }}
                        >
                            {saving === ch.channel_number ? '...' : 'SAVE'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
