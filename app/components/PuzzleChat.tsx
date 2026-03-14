'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { User } from '@supabase/supabase-js'

type ChatMsg = {
    id: number
    user_id: string
    username: string
    avatar_url: string | null
    message: string
    room: string
    is_bot: boolean
    created_at: string
}

function playBell() {
    try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1047, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(523, ctx.currentTime + 1.2)
        gain.gain.setValueAtTime(0.35, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 1.8)
    } catch { }
}

export default function PuzzleChat({ room = 'euro-puzzle' }: { room?: string }) {
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(null)
    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [input, setInput] = useState('')
    const [minimized, setMinimized] = useState(false)
    const [sending, setSending] = useState(false)
    const [onlineCount, setOnlineCount] = useState(0)
    const [userLevels, setUserLevels] = useState<Record<string, number>>({})
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const seenIds = useRef<Set<number>>(new Set())
    const initDone = useRef(false)
    const preInitBuffer = useRef<ChatMsg[]>([])
    const bellMuted = useRef(typeof window !== 'undefined' && localStorage.getItem('chat-bell-muted') === 'true')
    const [isMuted, setIsMuted] = useState(() => typeof window !== 'undefined' && localStorage.getItem('chat-bell-muted') === 'true')

    function toggleMute(e: React.MouseEvent) {
        e.stopPropagation()
        const next = !bellMuted.current
        bellMuted.current = next
        setIsMuted(next)
        localStorage.setItem('chat-bell-muted', String(next))
    }

    // Helper: fetch levels for a list of user_ids and merge into state
    const fetchLevels = async (userIds: string[]) => {
        if (!userIds.length) return
        const { data } = await supabase
            .from('puzzle_interactions')
            .select('user_id, levelup_announced, transmission_1_solved')
            .in('user_id', userIds)
        if (data) {
            setUserLevels(prev => {
                const next = { ...prev }
                data.forEach((r: { user_id: string; levelup_announced: boolean; transmission_1_solved: boolean }) => {
                    next[r.user_id] = r.transmission_1_solved ? 2 : r.levelup_announced ? 1 : 0
                })
                return next
            })
        }
    }

    // Subscribe immediately (so no events are missed), buffer until seenIds is seeded
    useEffect(() => {
        function applyIncoming(incoming: ChatMsg) {
            if (incoming.room !== room && incoming.room !== 'all') return
            if (seenIds.current.has(incoming.id)) return
            seenIds.current.add(incoming.id)
            if (incoming.is_bot && !bellMuted.current) playBell()
            setMessages(prev => [...prev, incoming])
            setUserLevels(prev => {
                if (prev[incoming.user_id] === undefined && !incoming.is_bot) fetchLevels([incoming.user_id])
                return prev
            })
        }

        const channel = supabase
            .channel(`puzzle_chat_feed_${room}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'puzzle_chat',
            }, (payload) => {
                const incoming = payload.new as ChatMsg
                if (!initDone.current) {
                    // Buffer events that arrive before seenIds is ready
                    preInitBuffer.current.push(incoming)
                    return
                }
                applyIncoming(incoming)
            })
            .subscribe()

        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            const { data } = await supabase
                .from('puzzle_chat')
                .select('*')
                .in('room', [room, 'all'])
                .order('created_at', { ascending: true })
                .limit(80)
            if (data) {
                data.forEach((m: ChatMsg) => seenIds.current.add(m.id))
                setMessages(data as ChatMsg[])
                const ids = [...new Set((data as ChatMsg[]).map(m => m.user_id).filter(Boolean))]
                fetchLevels(ids)
            }

            // Mark init done, then flush buffered events
            initDone.current = true
            for (const msg of preInitBuffer.current) applyIncoming(msg)
            preInitBuffer.current = []
        }
        init()

        return () => { supabase.removeChannel(channel) }
    }, [room])

    // Presence — track online users per room
    useEffect(() => {
        const presenceKey = Math.random().toString(36).slice(2)
        const presence = supabase
            .channel(`puzzle_chat_presence_${room}`, { config: { presence: { key: presenceKey } } })
            .on('presence', { event: 'sync' }, () => {
                const state = presence.presenceState()
                setOnlineCount(Object.keys(state).length)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presence.track({ online_at: new Date().toISOString() })
                }
            })
        return () => { supabase.removeChannel(presence) }
    }, [room])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (!minimized) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, minimized])

    const handleSend = async () => {
        if (!user || !input.trim() || sending) return
        const msg = input.trim()
        setInput('')
        setSending(true)

        const username = user.user_metadata.full_name || user.user_metadata.name || 'Anonymous'
        const avatar_url = user.user_metadata.avatar_url || null

        // Optimistic insert — show immediately
        const optimistic: ChatMsg = {
            id: Date.now(),
            user_id: user.id,
            username,
            avatar_url,
            message: msg,
            room,
            is_bot: false,
            created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimistic])

        const { data, error } = await supabase.from('puzzle_chat').insert({
            user_id: user.id,
            username,
            avatar_url,
            message: msg,
            room,
        }).select().single()

        if (data) {
            const realId = (data as ChatMsg).id
            seenIds.current.add(realId)
            setMessages(prev => {
                // If realtime already added this row, just remove the optimistic entry
                if (prev.some(m => m.id === realId)) {
                    return prev.filter(m => m.id !== optimistic.id)
                }
                return prev.map(m => m.id === optimistic.id ? data as ChatMsg : m)
            })
        } else {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        }


        setSending(false)
        inputRef.current?.focus()
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    return (
        <>
            <style>{`
        .pc-panel {
          position: fixed;
          bottom: 0;
          right: 20px;
          width: 380px;
          z-index: 9990;
          display: flex;
          flex-direction: column;
          font-family: 'Share Tech Mono', monospace;
          border: 1px solid rgba(0,255,136,.25);
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          box-shadow: -4px 0 40px rgba(0,255,136,.08), 0 0 60px rgba(0,0,0,.6);
          background: rgba(6,6,8,.97);
          backdrop-filter: blur(12px);
          transition: height .25s ease;
          overflow: hidden;
        }
        .pc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(0,255,136,.15);
          cursor: pointer;
          user-select: none;
          flex-shrink: 0;
        }
        .pc-title {
          font-size: 11px; letter-spacing: .18em; color: #00ff88;
          display: flex; align-items: center; gap: 8px;
        }
        .pc-live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #00ff88;
          animation: pc-pulse 1.6s ease-in-out infinite;
          box-shadow: 0 0 6px #00ff88;
        }
        @keyframes pc-pulse {
          0%,100% { opacity:1; } 50% { opacity:.3; }
        }
        .pc-count { color: rgba(255,255,255,.3); font-size:10px; }
        .pc-online-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #ff2d55;
          animation: pc-pulse 1s ease-in-out infinite;
          box-shadow: 0 0 6px #ff2d55; flex-shrink: 0;
        }
        .pc-online-count { color: #ff2d55; font-size: 10px; letter-spacing: .05em; }
        .pc-min-btn {
          background: transparent; border: none; cursor: pointer;
          color: rgba(255,255,255,.3); font-size: 14px; line-height:1;
          padding: 2px 4px; transition: color .2s;
        }
        .pc-min-btn:hover { color: #00ff88; }
        .pc-body {
          flex: 1; overflow-y: auto; padding: 10px 12px;
          display: flex; flex-direction: column; gap: 10px;
          max-height: 460px;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,255,136,.15) transparent;
        }
        .pc-body::-webkit-scrollbar { width: 4px; }
        .pc-body::-webkit-scrollbar-thumb { background: rgba(0,255,136,.15); border-radius: 2px; }
        .pc-msg { display: flex; gap: 8px; align-items: flex-start; }
        .pc-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(0,255,136,.25); flex-shrink: 0;
          background: #1a1a2e; object-fit: cover;
        }
        .pc-avatar-placeholder {
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(0,255,136,.2); flex-shrink: 0;
          background: #1a1a2e; display: flex; align-items: center;
          justify-content: center; font-size: 13px; color: rgba(255,255,255,.3);
        }
        .pc-msg-inner { flex: 1; min-width: 0; }
        .pc-name {
          font-size: 11px; color: #00ff88; letter-spacing: .06em;
          margin-bottom: 3px; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; font-weight: 700;
          display: flex; align-items: center; gap: 6px;
        }
        .pc-lvl {
          font-size: 9px; color: rgba(255,255,255,.3); background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1); border-radius: 3px;
          padding: 1px 5px; letter-spacing: .1em; font-weight: 400;
          flex-shrink: 0;
        }
        .pc-text {
          font-size: 12px; color: rgba(255,255,255,.75); line-height: 1.55;
          word-break: break-word; font-family: 'Space Mono', monospace;
        }
        .pc-empty {
          text-align: center; color: rgba(255,255,255,.2);
          font-size: 11px; padding: 20px 0; letter-spacing: .08em;
        }
        .pc-footer {
          border-top: 1px solid rgba(0,255,136,.1);
          padding: 10px 12px;
          flex-shrink: 0;
        }
        .pc-login-hint {
          font-size: 10px; color: rgba(255,255,255,.25); text-align: center;
          letter-spacing: .08em; padding: 6px 0;
        }
        .pc-input-row { display: flex; gap: 6px; align-items: center; }
        .pc-input {
          flex: 1; background: rgba(255,255,255,.04); border: 1px solid rgba(0,255,136,.15);
          border-radius: 4px; padding: 7px 10px; color: #fff; font-size: 11px;
          font-family: 'Space Mono', monospace; outline: none; min-width: 0;
          transition: border-color .2s;
        }
        .pc-input::placeholder { color: rgba(255,255,255,.2); }
        .pc-input:focus { border-color: rgba(0,255,136,.5); }
        .pc-send {
          background: #00ff88; color: #060608; border: none; border-radius: 4px;
          padding: 7px 10px; font-size: 11px; font-family: 'Share Tech Mono', monospace;
          cursor: pointer; letter-spacing: .08em; font-weight: 700;
          transition: opacity .2s, transform .15s;
          flex-shrink: 0;
        }
        .pc-send:hover { opacity: .85; transform: scale(1.05); }
        .pc-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
        .pc-mute-btn {
          background: transparent; border: none; cursor: pointer;
          font-size: 13px; padding: 2px 4px; opacity: .4;
          transition: opacity .2s; line-height: 1;
          flex-shrink: 0;
        }
        .pc-mute-btn:hover { opacity: .9; }
        .pc-bot {
          background: rgba(255,215,0,.07); border: 1px solid rgba(255,215,0,.3);
          border-radius: 4px; padding: 8px 12px;
          display: flex; align-items: flex-start; gap: 8px;
        }
        .pc-bot-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
        .pc-bot-body { flex: 1; }
        .pc-bot-label {
          font-size: 9px; color: #ffd700; letter-spacing: .2em;
          margin-bottom: 3px; font-family: 'Share Tech Mono', monospace;
        }
        .pc-bot-msg { font-size: 11px; color: rgba(255,215,0,.85); line-height: 1.5;
          font-family: 'Space Mono', monospace; }
        @media (max-width: 640px) {
          .pc-panel { width: calc(100vw - 24px); right: 12px; }
        }
      `}</style>

            <div className="pc-panel" style={{ height: minimized ? 'auto' : '560px' }}>
                {/* Header */}
                <div className="pc-header" onClick={() => setMinimized(m => !m)}>
                    <div className="pc-title">
                        <div className="pc-live-dot" />
                        <span>PUZZLE CHAT</span>
                        <span className="pc-count">({messages.length})</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                            <div className="pc-online-dot" />
                            <span className="pc-online-count">{onlineCount} online</span>
                        </div>
                    </div>
                    <button className="pc-min-btn" onClick={e => { e.stopPropagation(); setMinimized(m => !m) }}>
                        {minimized ? '▲' : '▼'}
                    </button>
                    <button className="pc-mute-btn" title={isMuted ? 'Unmute announcements' : 'Mute announcements'} onClick={toggleMute}>
                        {isMuted ? '🔕' : '🔔'}
                    </button>
                </div>

                {/* Body */}
                {!minimized && (
                    <>
                        <div className="pc-body">
                            {messages.length === 0 && (
                                <div className="pc-empty">// no signals yet —<br />be the first to transmit</div>
                            )}
                            {messages.map(msg =>
                                msg.is_bot ? (
                                    <div key={msg.id} className="pc-bot">
                                        <div className="pc-bot-icon">🔔</div>
                                        <div className="pc-bot-body">
                                            <div className="pc-bot-label">// SYSTEM ANNOUNCEMENT</div>
                                            <div className="pc-bot-msg">{msg.message}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={msg.id} className="pc-msg">
                                        {msg.avatar_url
                                            ? <img src={msg.avatar_url} alt="" className="pc-avatar" />
                                            : <div className="pc-avatar-placeholder">👤</div>
                                        }
                                        <div className="pc-msg-inner">
                                            <div className="pc-name">
                                                <span>{msg.username}</span>
                                                <span className="pc-lvl">LVL {userLevels[msg.user_id] ?? 0}</span>
                                            </div>
                                            <div className="pc-text">{msg.message}</div>
                                        </div>
                                    </div>
                                ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Footer / Input */}
                        <div className="pc-footer">
                            {!user ? (
                                <div className="pc-login-hint">// sign in to transmit</div>
                            ) : (
                                <div className="pc-input-row">
                                    <input
                                        ref={inputRef}
                                        className="pc-input"
                                        placeholder="transmit a message..."
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKey}
                                        maxLength={280}
                                    />
                                    <button className="pc-send" onClick={handleSend} disabled={!input.trim() || sending}>
                                        ➤
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
