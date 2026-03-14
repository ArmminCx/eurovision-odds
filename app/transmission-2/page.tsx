'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/app/context/LanguageContext'
import PuzzleChat from '@/app/components/PuzzleChat'
import { createClient } from '@/app/utils/supabase/client'
import { useRouter } from 'next/navigation'

type Channel = {
  channel_number: number
  channel_type: 'static' | 'video_url' | 'mp4' | 'twitch'
  content_url: string | null
}

export default function Transmission2Page() {
  const router = useRouter()
  const { lang, toggleLanguage } = useLanguage()
  const [channel, setChannel] = useState(1)
  const [channelsList, setChannelsList] = useState<Channel[]>([])
  
  // Screen/TV states
  const [flickering, setFlickering] = useState(false)
  const [screenFlickerColor, setScreenFlickerColor] = useState<'white' | 'green' | 'red'>('white')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const hasPlayedSecretSixRef = useRef(false)
  const secretVidRef = useRef<HTMLVideoElement>(null)
  
  const [showSecretSix, setShowSecretSix] = useState(false)
  const [isPowered, setIsPowered] = useState(true)
  const [volLevel, setVolLevel] = useState(7) // 0 to 10 scale
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const audioMutedRef = useRef(false)
  const [audioMuted, setAudioMuted] = useState(false)
  const [sequence, setSequence] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [secretMsg, setSecretMsg] = useState('')
  const [terminalStatus, setTerminalStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const switchLang = (l: 'en' | 'ru') => { if (l !== lang) toggleLanguage() }

  function handleNumPress(n: number) {
    let newSeq = sequence + n.toString()
    if (newSeq.length > 4) newSeq = newSeq.slice(-4) // Keep only the last 4 digits
    
    if (newSeq === '0229') setUnlocked(true)
    
    setSequence(newSeq)
    doSwitch(n) // always switch channel, including 0
  }

  function handleTerminalSubmit() {
    if (terminalStatus !== 'idle') return

    const answer = secretMsg.trim().toLowerCase()
    if (answer === 'tukkataka') {
      setTerminalStatus('success')
      setScreenFlickerColor('green')
      setFlickering(true)
      setTimeout(() => setFlickering(false), 1000)
      
      // Navigate to part 3 after 3 seconds
      setTimeout(() => {
        router.push('/transmission-3')
      }, 3000)
    } else {
      setTerminalStatus('error')
      setScreenFlickerColor('red')
      setFlickering(true)
      setTimeout(() => setFlickering(false), 1000)
      
      // Reset input box
      setTimeout(() => {
        setSecretMsg('')
        setTerminalStatus('idle')
      }, 2000)
    }
  }

  function doSwitch(n: number) {
    if (!isPowered) return
    setScreenFlickerColor('white')
    setFlickering(true)

    // CHANNEL 6 SECRET MECHANIC (Tarkatukka 1:23 - 1:29)
    if (channel === 7 && n === 6 && !hasPlayedSecretSixRef.current) {
      const ch7Vid = videoRefs.current[7]
      if (ch7Vid && ch7Vid.currentTime >= 83 && ch7Vid.currentTime <= 89) {
        setShowSecretSix(true)
        hasPlayedSecretSixRef.current = true // mark as played for this session
      }
    } else if (n !== 6) {
      // If we switch away from 6, hide the secret video (preventing it from showing again)
      setShowSecretSix(false)
    }

    // Check if we are switching TO a static channel
    const targetCh = channelsList.find(c => c.channel_number === n)
    const targetIsStatic = (!targetCh || targetCh.channel_type === 'static') && !(n === 6 && showSecretSix && !hasPlayedSecretSixRef.current /* Wait, we just set the ref. Just rely on `(n===6 && showSecretSix)` for this switch logic */)
    const isActuallyStatic = targetIsStatic && !(n === 6 && (showSecretSix || (channel===7 && n===6 && !hasPlayedSecretSixRef.current && videoRefs.current[7]?.currentTime >= 83 && videoRefs.current[7]?.currentTime <= 89)))

    // Brief audio dip on channel change (only dip white noise if going TO static)
    if (gainRef.current && audioCtxRef.current && !audioMutedRef.current && volLevel > 0 && isActuallyStatic) {
      const g = gainRef.current
      const t = audioCtxRef.current.currentTime
      const targetVol = volLevel / 100
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(targetVol, t)
      g.gain.linearRampToValueAtTime(0, t + 0.04)
      g.gain.linearRampToValueAtTime(targetVol, t + 0.18)
    }
    setTimeout(() => { setChannel(n); setFlickering(false) }, 100)
  }
  function chUp() { doSwitch(channel === 9 ? 0 : channel + 1) }
  function chDown() { doSwitch(channel === 0 ? 9 : channel - 1) }

  const iframeRefs = useRef<Record<number, HTMLIFrameElement>>({})
  const videoRefs = useRef<Record<number, HTMLVideoElement>>({})

  function updateVol(newVol: number) {
    if (!isPowered) return
    const v = Math.max(0, Math.min(10, newVol))
    setVolLevel(v)
    if (audioMutedRef.current) toggleAudioMute() // Unmute if changing vol

    // Update Web Audio (Static) if current channel is static
    const currentCh = channelsList.find(c => c.channel_number === channel)
    const isStatic = !currentCh || currentCh.channel_type === 'static'
    if (gainRef.current && audioCtxRef.current && isStatic) {
      gainRef.current.gain.setTargetAtTime(v / 100, audioCtxRef.current.currentTime, 0.08)
    }

    // Update YouTube Iframes via postMessage API
    Object.entries(iframeRefs.current).forEach(([chNum, iframe]) => {
      if (iframe && iframe.contentWindow) {
        // active channel gets volLevel*10, inactive get 0
        const vol = (Number(chNum) === channel) ? (v * 10) : 0
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command', func: 'setVolume', args: [vol]
        }), '*')
      }
    })

    // Update MP4 Videos
    Object.entries(videoRefs.current).forEach(([chNum, vid]) => {
      if (vid) {
        vid.volume = (Number(chNum) === channel) ? (v / 10) : 0
      }
    })
  }
  function volUp() { updateVol(volLevel + 1) }
  function volDown() { updateVol(volLevel - 1) }

  function togglePower() {
    const next = !isPowered
    setIsPowered(next)
    if (next) {
      // Turn ON — brief flicker then static
      setFlickering(true)
      setTimeout(() => setFlickering(false), 150)
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
      if (gainRef.current && audioCtxRef.current && !audioMutedRef.current) {
        gainRef.current.gain.setTargetAtTime(volLevel / 100, audioCtxRef.current.currentTime, 0.1)
      }
    } else {
      // Turn OFF
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.05)
      }
    }
  }

  function toggleAudioMute() {
    if (!isPowered) return
    const next = !audioMutedRef.current
    audioMutedRef.current = next
    setAudioMuted(next)

    // Static noise
    const currentCh = channelsList.find(c => c.channel_number === channel)
    const currentIsStatic = (!currentCh || currentCh.channel_type === 'static') && !(channel === 6 && showSecretSix)
    if (gainRef.current && audioCtxRef.current && currentIsStatic) {
      gainRef.current.gain.setTargetAtTime(next ? 0 : volLevel / 100, audioCtxRef.current.currentTime, 0.08)
    }

    // YouTube
    Object.entries(iframeRefs.current).forEach(([chNum, iframe]) => {
      if (iframe && iframe.contentWindow) {
        const shouldMute = next || (Number(chNum) !== channel)
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command', func: shouldMute ? 'mute' : 'unMute', args: []
        }), '*')
      }
    })

    // MP4
    Object.entries(videoRefs.current).forEach(([chNum, vid]) => {
      if (vid) {
        vid.muted = next || (Number(chNum) !== channel)
      }
    })

    // Secret Six
    if (secretVidRef.current) {
      secretVidRef.current.muted = next || channel !== 6 || !showSecretSix
    }
  }

  function resumeAudio() {
    audioCtxRef.current?.resume()
  }

  // Fetch channel data
  useEffect(() => {
    async function fetchChannels() {
      const supabase = createClient()
      const { data } = await supabase.from('puzzle_tv_channels').select('*')
      if (data) setChannelsList(data as Channel[])
    }
    fetchChannels()

    // Real-time channel updates
    const supabase = createClient()
    const sub = supabase.channel('tv_channels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puzzle_tv_channels' }, payload => {
        setChannelsList(prev => {
          const updated = payload.new as Channel
          const i = prev.findIndex(c => c.channel_number === updated.channel_number)
          if (i > -1) {
            const copy = [...prev]; copy[i] = updated; return copy
          }
          return [...prev, updated]
        })
      }).subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  // Canvas noise animation (only runs when powered on and channel is static)
  const currentCh = channelsList.find(c => c.channel_number === channel)
  const isStatic = (!currentCh || currentCh.channel_type === 'static') && !(channel === 6 && showSecretSix)

  useEffect(() => {
    if (!isPowered || !isStatic) {
      cancelAnimationFrame(rafRef.current)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      // Fill screen with dark off-state grey
      if (ctx && canvas) {
        ctx.fillStyle = '#111'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    function draw(time: number) {
      if (time - lastFrameRef.current > 40) {
        lastFrameRef.current = time
        const img = ctx!.createImageData(W, H)
        const d = img.data
        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * 255) | 0
          const bright = Math.random() > 0.996 ? 255 : v
          d[i] = bright; d[i + 1] = bright; d[i + 2] = bright; d[i + 3] = 255
        }
        ctx!.putImageData(img, 0, 0)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPowered, isStatic])

  // Web Audio white noise engine (starts on mount)
  useEffect(() => {
    try {
      const actx = new AudioContext()
      audioCtxRef.current = actx
      const sr = actx.sampleRate
      const bufLen = sr * 2 // 2s looping buffer
      const buf = actx.createBuffer(1, bufLen, sr)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1
      const src = actx.createBufferSource()
      src.buffer = buf; src.loop = true
      const gain = actx.createGain()
      gain.gain.value = 0 // Starts muted, synced below
      gainRef.current = gain
      src.connect(gain); gain.connect(actx.destination)
      src.start()
      actx.resume().catch(() => { })
    } catch { }
    return () => { audioCtxRef.current?.close() }
  }, [])

  // Sync volume of everything based on active channel and TV state
  useEffect(() => {
    if (!gainRef.current || !audioCtxRef.current) return

    // Sync static noise
    if (isPowered && isStatic && !audioMuted) {
      gainRef.current.gain.setTargetAtTime(volLevel / 100, audioCtxRef.current.currentTime, 0.05)
    } else {
      gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.05)
    }

    // Since YouTube iframes take time to load their API, we use an interval
    // to repeatedly broadcast the correct mute/volume state to all mounted iframes
    const interval = setInterval(() => {
      Object.entries(iframeRefs.current).forEach(([chNumStr, iframe]) => {
        if (iframe && iframe.contentWindow) {
          const chNum = Number(chNumStr)
          const isActive = (chNum === channel) && isPowered

          if (isActive && !audioMuted) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*')
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [volLevel * 10] }), '*')
          } else {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*')
          }
        }
      })
    }, 500)

    // Sync MP4 volumes
    Object.entries(videoRefs.current).forEach(([chNumStr, vid]) => {
      if (vid) {
        const chNum = Number(chNumStr)
        const isActive = (chNum === channel) && isPowered
        vid.muted = !isActive || audioMuted
        vid.volume = isActive ? (volLevel / 10) : 0
      }
    })

    // Sync Secret Six volume
    if (secretVidRef.current) {
      const isActive = (channel === 6) && isPowered && showSecretSix
      secretVidRef.current.muted = !isActive || audioMuted
      secretVidRef.current.volume = isActive ? (volLevel / 10) : 0
    }

    return () => clearInterval(interval)
  }, [channel, isPowered, isStatic, volLevel, audioMuted, channelsList])


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #000; overflow: hidden; width: 100%; height: 100%; }

        /* ── Root: full-screen living room scene ── */
        .room {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          overflow: hidden;
        }

        /* ── WALL ── */
        .room-wall {
          position: absolute; inset: 0;
          background:
            /* Subtle diamond wallpaper */
            repeating-linear-gradient(45deg, transparent, transparent 28px, rgba(255,255,255,.012) 28px, rgba(255,255,255,.012) 29px),
            repeating-linear-gradient(-45deg, transparent, transparent 28px, rgba(255,255,255,.012) 28px, rgba(255,255,255,.012) 29px),
            /* Wall base color — dark desaturated navy */
            #0b0c11;
        }
        /* Corner shadow vignette — makes room feel enclosed */
        .room-wall::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,.55) 100%);
          pointer-events: none;
        }

        /* ── TV GLOW ON WALL (Off when power is false) ── */
        .tv-glow {
          position: absolute;
          width: 900px; height: 700px;
          top: 50%; left: 50%;
          transform: translate(-50%, -58%);
          background: radial-gradient(ellipse at center,
            rgba(160,255,190,.055) 0%,
            rgba(100,220,150,.028) 25%,
            rgba(50,180,100,.012) 50%,
            transparent 70%);
          pointer-events: none; z-index: 1;
          animation: glow-flicker 8s ease-in-out infinite;
          opacity: ${isPowered ? 1 : 0} !important;
          transition: opacity 0.3s ease;
        }
        @keyframes glow-flicker {
          0%,100% { opacity: 1; }
          45% { opacity: .85; }
          46% { opacity: 1; }
          72% { opacity: .78; }
          73% { opacity: 1; }
        }

        /* ── FLOOR ── */
        .room-floor {
          position: absolute; bottom: 0; left: 0; right: 0; height: 30%;
          background:
            /* Wood plank grain lines */
            repeating-linear-gradient(90deg,
              transparent 0px, transparent 140px,
              rgba(0,0,0,.18) 140px, rgba(0,0,0,.18) 142px,
              transparent 142px, transparent 260px,
              rgba(0,0,0,.1) 260px, rgba(0,0,0,.1) 261px
            ),
            /* Floor color */
            linear-gradient(180deg, #1c1208 0%, #241608 60%, #181008 100%);
          border-top: 2px solid rgba(255,255,255,.04);
        }
        /* Floor perspective shadow nearthe wall/floor join */
        .room-floor::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 18px;
          background: linear-gradient(180deg, rgba(0,0,0,.45), transparent);
        }

        /* ── TV CABINET on floor ── */
        .tv-cabinet {
          position: absolute;
          bottom: 30%;
          /* Align with floor top */
          left: 50%; transform: translateX(-50%);
          width: 560px; height: 55px;
          background: linear-gradient(180deg,
            #9c6430 0%, #7a4c20 40%,
            #5e3814 80%, #3e2208 100%);
          border-radius: 4px 4px 0 0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.18),
            inset 4px 0 8px rgba(0,0,0,.3),
            inset -4px 0 8px rgba(0,0,0,.3),
            0 8px 30px rgba(0,0,0,.7);
          z-index: 3;
          /* Wood grain lines */
          background-image:
            repeating-linear-gradient(90deg,
              transparent 0px, transparent 90px,
              rgba(0,0,0,.12) 90px, rgba(0,0,0,.12) 91px
            ),
            linear-gradient(180deg, #9c6430, #7a4c20 40%, #5e3814 80%, #3e2208);
        }
        /* Cabinet decorative panel lines */
        .tv-cabinet::before {
          content: ''; position: absolute; inset: 8px 12px;
          border: 1px solid rgba(255,255,255,.06); border-radius: 2px;
        }
        /* Cabinet legs */
        .tv-cabinet::after {
          content: ''; position: absolute; bottom: -14px; left: 0; right: 0;
          height: 14px;
          background: linear-gradient(180deg, #3e2208, #2a1508);
          clip-path: polygon(6% 0%, 14% 100%, 86% 100%, 94% 0%);
        }

        /* ── LAMP SILHOUETTE (atmosphere) ── */
        .lamp {
          position: absolute; bottom: 30%; right: calc(50% - 400px);
          z-index: 2;
        }
        .lamp-stand {
          width: 4px; height: 90px; background: #2a2218;
          margin: 0 auto;
        }
        .lamp-shade {
          width: 0; height: 0;
          border-left: 24px solid transparent;
          border-right: 24px solid transparent;
          border-bottom: 20px solid #251e14;
          margin: 0 auto;
        }
        .lamp-glow {
          position: absolute; bottom: 90px; left: 50%; transform: translateX(-50%);
          width: 80px; height: 60px;
          background: radial-gradient(ellipse at center bottom, rgba(255,200,80,.06), transparent 70%);
        }

        /* ── TV UNIT wrapper (sits on cabinet) ── */
        .tv-unit {
          position: absolute;
          bottom: calc(30% + 55px);
          left: 50%; 
          transform: translateX(-50%) scale(1.6); /* Added scale(1.6) to make it much bigger */
          transform-origin: bottom center;
          display: flex; flex-direction: column; align-items: center;
          z-index: 4;
        }

        /* Antennas */
        .tv-antennas { position: relative; width: 140px; height: 100px; margin-bottom: -3px; }
        .tv-ant {
          position: absolute; bottom: 0; width: 5px;
          background: linear-gradient(180deg, #9a9a9a 0%, #4a4a4a 100%);
          border-radius: 3px 3px 0 0;
          box-shadow: 1px 0 4px rgba(0,0,0,.6);
        }
        .tv-ant-l { height: 92px; left: 28px; transform-origin: bottom center; transform: rotate(-30deg); }
        .tv-ant-r { height: 92px; right: 28px; transform-origin: bottom center; transform: rotate(30deg); }
        .tv-ant-base {
          position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 42px; height: 11px;
          background: linear-gradient(180deg, #3e3e3e, #1e1e1e);
          border-radius: 3px; border: 1px solid #555;
          box-shadow: 0 2px 6px rgba(0,0,0,.6);
        }

        /* TV BODY */
        .tv-body {
          background: linear-gradient(158deg, #2c2c2c 0%, #1a1a1a 48%, #222222 65%, #161616 100%);
          border-radius: 22px 22px 16px 16px;
          padding: 28px 36px 20px;
          border: 4px solid #0e0e0e;
          box-shadow:
            inset 4px 4px 14px rgba(255,255,255,.06),
            inset -5px -5px 14px rgba(0,0,0,.8),
            /* SCREEN GLOW bleeding through bezel */
            0 0 60px rgba(150,255,180,.12),
            0 0 140px rgba(80,220,120,.06),
            10px 20px 60px rgba(0,0,0,.95),
            0 0 0 1px #3a3a3a;
          width: 520px;
        }

        /* Screen bezel inset */
        .tv-screen-wrap {
          background: #080808; border-radius: 12px; padding: 14px;
          box-shadow: inset 6px 6px 18px rgba(0,0,0,.95), inset -4px -4px 12px rgba(0,0,0,.8);
          border: 2px solid #060606;
        }

        /* Actual screen */
        .tv-screen {
          width: 400px; height: 300px; border-radius: 12px;
          overflow: hidden; position: relative; background: #020202;
          box-shadow:
            inset 0 0 80px rgba(0,0,0,.9),
            inset 0 0 12px rgba(80,255,140,.04);
          transition: background 0.3s;
        }
        .tv-screen canvas {
          width: 100%; height: 100%; image-rendering: pixelated; display: block; 
          opacity: ${isPowered ? 0.82 : 0.05};
          transition: opacity 0.3s;
        }
        .screen-lines {
          position: absolute; inset: 0; pointer-events: none; z-index: 2;
          background: repeating-linear-gradient(0deg,
            rgba(0,0,0,.3) 0px, rgba(0,0,0,.3) 1px,
            transparent 1px, transparent 4px);
        }
        .screen-vignette {
          position: absolute; inset: 0; pointer-events: none; z-index: 3;
          background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,.8) 100%);
        }
        .screen-glare {
          position: absolute; inset: 0; pointer-events: none; z-index: 4;
          background: radial-gradient(ellipse at 26% 20%, rgba(255,255,255,.08) 0%, transparent 50%);
        }
        .screen-flicker { 
          position: absolute; inset: 0; z-index: 10; pointer-events: none; 
        }
        .screen-flicker.white { background: #fff; }
        .screen-flicker.green { 
          background: rgba(0, 255, 136, 0.5); 
          animation: fast-strobe 0.1s infinite alternate; 
        }
        .screen-flicker.red { 
          background: rgba(255, 0, 0, 0.5); 
          animation: fast-strobe 0.1s infinite alternate; 
        }
        @keyframes fast-strobe {
          0% { opacity: 0.3; }
          100% { opacity: 0.9; }
        }
        .channel-num {
          position: absolute; bottom: 10px; right: 14px; z-index: 6;
          font-family: 'VT323', monospace; font-size: 24px;
          color: #00ff88; text-shadow: 0 0 10px #00ff88, 0 0 24px rgba(0,255,136,.5);
        }
        .tv-mute-btn {
          position: absolute; top: 8px; left: 10px; z-index: 7;
          background: transparent; border: none; cursor: pointer;
          font-size: 14px; opacity: .35; transition: opacity .2s; padding: 2px;
          line-height: 1;
        }
        .tv-mute-btn:hover { opacity: .8; }

        /* TV controls */
        .tv-controls {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 8px 2px;
        }
        .tv-knob {
          width: 30px; height: 30px; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #505050, #181818);
          border: 2px solid #0e0e0e;
          box-shadow: 3px 4px 8px rgba(0,0,0,.85), inset 1px 1px 3px rgba(255,255,255,.1);
          position: relative;
        }
        .tv-knob::after {
          content: ''; position: absolute;
          top: 50%; left: 50%; transform: translate(-50%, -160%);
          width: 2px; height: 10px; background: #aaa; border-radius: 1px;
        }
        .tv-brand { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: rgba(255,255,255,.14); letter-spacing: .4em; }

        /* ── REMOTE — foreground, bottom center ── */
        .remote-wrap {
          position: fixed; bottom: -28px; left: 50%; transform: translateX(-50%);
          z-index: 100;
          /* Perspective tilt — like holding in hands */
          perspective: 600px;
        }
        .remote {
          width: 130px;
          background: linear-gradient(170deg, #28282b 0%, #1e1e21 55%, #242426 100%);
          border-radius: 16px 16px 0 0;
          padding: 18px 14px 36px;
          box-shadow:
            0 -6px 30px rgba(0,0,0,.6),
            inset 0 1px 0 rgba(255,255,255,.1),
            0 0 0 1px #3a3a3d;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          transform: rotateX(-12deg);
          transform-origin: bottom center;
        }
        .power-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: radial-gradient(circle at 36% 32%, #ff5555, #bb1111);
          border: 2px solid #881111;
          box-shadow: 0 4px 12px rgba(200,0,0,.5), inset 0 1px 0 rgba(255,255,255,.25);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 16px; color: rgba(255,255,255,.85);
          transition: transform .07s, box-shadow .07s;
        }
        .power-btn:hover { background: radial-gradient(circle at 36% 32%, #ff6666, #cc1111); }
        .power-btn:active { transform: translateY(2px); box-shadow: 0 1px 4px rgba(200,0,0,.4); }
        .controls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
        .ch-col, .vol-col { display: flex; flex-direction: column; gap: 8px; }
        .ch-btn {
          flex: 1; padding: 9px 0; font-size: 9px;
          background: linear-gradient(180deg, #3e3e42, #2e2e32);
          border: 1px solid #565658; border-bottom: 3px solid #111;
          border-radius: 6px; color: #c0c0c6; cursor: pointer;
          letter-spacing: .04em; font-family: 'Share Tech Mono', monospace;
          box-shadow: 0 3px 6px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08);
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          transition: transform .07s;
        }
        .ch-btn:hover { background: linear-gradient(180deg, #484850, #383840); color: #fff; }
        .ch-btn:active { transform: translateY(2px); border-bottom-width: 1px; }
        .ch-arrow { font-size: 14px; color: #e0e0e8; }
        .ch-label { font-size: 7px; color: #666; letter-spacing: .1em; }
        .num-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%; }
        .num-btn {
          aspect-ratio: 1; border-radius: 6px; font-size: 15px;
          background: linear-gradient(180deg, #3c3c40, #2c2c30);
          border: 1px solid #525256; border-bottom: 3px solid #111;
          color: #ccc; cursor: pointer; font-family: 'Share Tech Mono', monospace;
          box-shadow: 0 2px 5px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07);
          display: flex; align-items: center; justify-content: center;
          transition: transform .07s;
        }
        .num-btn:hover { background: linear-gradient(180deg, #484848, #383838); color: #fff; }
        .num-btn:active { transform: translateY(2px); border-bottom-width: 1px; }

        /* Lang toggle */
        .t2-lang { position: fixed; top: 14px; right: 20px; z-index: 10000; display: flex; gap: 6px; }
        .t2-lbtn { font-family: 'Share Tech Mono', monospace; font-size: 10px; padding: 2px 8px;
          border-radius: 3px; cursor: pointer; border: 1px solid transparent; letter-spacing: .1em;
          background: transparent; color: rgba(255,255,255,.2); transition: all .2s; }
        .t2-lbtn.on { color: #00ff88; border-color: rgba(0,255,136,.4); text-shadow: 0 0 8px #00ff88; }

        /* Secret Terminal */
        .secret-terminal {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          margin: 0 15px; width: 100%;
          animation: terminal-glitch 0.3s ease-out;
        }
        @keyframes terminal-glitch {
          0% { opacity: 0; transform: scale(0.9) skewX(10deg); filter: drop-shadow(0 0 10px #00ff88); }
          50% { opacity: 1; transform: scale(1.05) skewX(-5deg); filter: drop-shadow(0 0 15px #00ff88); }
          100% { transform: scale(1) skewX(0); }
        }
        .secret-label {
          color: #00ff88; font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.1em; opacity: 0.8;
          margin-bottom: 3px; text-shadow: 0 0 5px rgba(0,255,136,0.5);
          text-transform: uppercase; white-space: nowrap;
        }
        .secret-input {
          width: 100%; background: #05100a; border: 1px solid rgba(0,255,136,0.3);
          color: #00ff88; font-family: 'Share Tech Mono', monospace;
          font-size: 14px; padding: 4px 8px; border-radius: 2px;
          outline: none; box-shadow: inset 0 0 10px rgba(0,255,136,0.1), 0 0 8px rgba(0,255,136,0.2);
          text-align: center; transition: all 0.2s;
        }
        .secret-input:focus {
          border-color: #00ff88; box-shadow: inset 0 0 10px rgba(0,255,136,0.2), 0 0 12px rgba(0,255,136,0.4);
        }
        .secret-input.error {
          border-color: #ff3333; color: #ff3333; box-shadow: 0 0 12px rgba(255,50,50,0.5);
          animation: shake 0.3s ease-in-out;
        }
        .secret-input.success {
          border-color: #ffffff; color: #ffffff; box-shadow: 0 0 20px rgba(255,255,255,0.8);
          background: #004422;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
        .secret-sub-label {
          color: #ff3333; font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.1em; opacity: 0.8;
          margin-top: 3px; text-shadow: 0 0 5px rgba(255,50,50,0.5);
          text-transform: uppercase; white-space: nowrap;
        }
      `}</style>

      {/* Living room */}
      <div className="room" onClick={resumeAudio}>
        <div className="room-wall" />
        <div className="tv-glow" />
        <div className="room-floor" />

        {/* Lamp silhouette */}
        <div className="lamp">
          <div className="lamp-glow" />
          <div className="lamp-shade" />
          <div className="lamp-stand" />
        </div>

        {/* TV cabinet on floor */}
        <div className="tv-cabinet" />

        {/* TV unit */}
        <div className="tv-unit">
          <div className="tv-antennas">
            <div className="tv-ant tv-ant-l" />
            <div className="tv-ant tv-ant-r" />
            <div className="tv-ant-base" />
          </div>
          <div className="tv-body">
            <div className="tv-screen-wrap">
              <div className="tv-screen">
                {flickering && <div className={`screen-flicker ${screenFlickerColor}`} />}

                {(!isPowered || isStatic) && (
                  <canvas ref={canvasRef} width="160" height="120" style={{ display: (isPowered && !isStatic) ? 'none' : 'block' }} />
                )}

                {channelsList.map(ch => {
                  const isActive = isPowered && ch.channel_number === channel

                  if (ch.channel_type === 'video_url' && ch.content_url) {
                    return (
                      <iframe
                        key={ch.channel_number}
                        ref={el => { if (el) iframeRefs.current[ch.channel_number] = el }}
                        src={ch.content_url}
                        style={{
                          width: '100%', height: '100%', border: 'none', pointerEvents: 'none', objectFit: 'cover',
                          opacity: isActive ? 1 : 0,
                          position: 'absolute', top: 0, left: 0, zIndex: isActive ? 1 : -1
                        }}
                        allow="autoplay; encrypted-media"
                        title={`TV Channel ${ch.channel_number}`}
                      />
                    )
                  }

                  if (ch.channel_type === 'mp4' && ch.content_url) {
                    return (
                      <video
                        key={ch.channel_number}
                        ref={el => { if (el) videoRefs.current[ch.channel_number] = el }}
                        src={ch.content_url}
                        autoPlay loop playsInline
                        muted={!isActive || audioMuted}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          opacity: isActive ? 1 : 0,
                          position: 'absolute', top: 0, left: 0, zIndex: isActive ? 1 : -1
                        }}
                      />
                    )
                  }

                  if (ch.channel_type === 'twitch' && ch.content_url) {
                    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
                    return (
                      <div key={ch.channel_number} style={{
                        width: '100%', height: '100%',
                        opacity: isActive ? 1 : 0,
                        position: 'absolute', top: 0, left: 0, zIndex: isActive ? 1 : -1
                      }}>
                        {/* 
                          We use a standard iframe instead of the JS API because browsers heavily restrict
                          unmuting and autoplaying iframes that are rendered in the background without user interaction.
                          The user can hover/interact with the native Twitch controls to unmute it themselves if they want audio.
                        */}
                        {isActive && (
                          <iframe
                            src={`https://player.twitch.tv/?channel=${ch.content_url}&parent=${host}&autoplay=true&muted=false`}
                            frameBorder="0"
                            scrolling="no"
                            allowFullScreen={true}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title={`Twitch Stream ${ch.content_url}`}
                          />
                        )}
                      </div>
                    )
                  }

                  return null
                })}

                {/* SECRET CHANNEL 6 VIDEO */}
                {showSecretSix && (
                  <video
                    ref={secretVidRef}
                    src="https://lcphdyurnwmcusiedisq.supabase.co/storage/v1/object/public/videos/channel6secret.mp4"
                    autoPlay
                    playsInline
                    muted={!isPowered || channel !== 6 || audioMuted}
                    onEnded={() => setShowSecretSix(false)} // Return to static when done
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      opacity: (isPowered && channel === 6) ? 1 : 0,
                      position: 'absolute', top: 0, left: 0, zIndex: (isPowered && channel === 6) ? 2 : -1
                    }}
                  />
                )}

                <div className="screen-lines" />
                <div className="screen-vignette" />
                <div className="screen-glare" />
                {isPowered && (
                  <>
                    <button className="tv-mute-btn" onClick={toggleAudioMute} title={audioMuted ? 'Unmute' : 'Mute'}>
                      {audioMuted ? '🔇' : '🔊'}
                    </button>
                    <div className="channel-num">CH {channel}</div>
                  </>
                )}
              </div>
            </div>
            <div className="tv-controls">
              <div className="tv-knob" />
              {unlocked ? (
                <div className="secret-terminal">
                  <div className="secret-label">
                    {terminalStatus === 'success' 
                      ? (lang === 'en' ? '// signal accepted — stand by' : '// сигнал принят — ожидайте')
                      : (lang === 'en' ? '// signal unlocked — transmit your message' : '// сигнал разблокирован — передайте сообщение')}
                  </div>
                  <input
                    type="text"
                    value={secretMsg}
                    onChange={e => setSecretMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleTerminalSubmit() }}
                    disabled={terminalStatus !== 'idle'}
                    autoFocus
                    spellCheck={false}
                    className={`secret-input ${terminalStatus === 'error' ? 'error' : terminalStatus === 'success' ? 'success' : ''}`}
                  />
                  {terminalStatus === 'error' && (
                    <div className="secret-sub-label">
                      {lang === 'en' ? '// signal rejected — try again' : '// сигнал отклонён — попробуйте снова'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="tv-brand">RETROVISION</div>
              )}
              <div className="tv-knob" />
            </div>
          </div>
        </div>
      </div>

      {/* Remote — foreground bottom */}
      <div className="remote-wrap">
        <div className="remote">
          <button className="power-btn" onClick={togglePower}>⏻</button>

          <div className="controls-grid">
            <div className="ch-col">
              <button className="ch-btn" onClick={chUp}>
                <span className="ch-arrow">▲</span>
                <span className="ch-label">CH+</span>
              </button>
              <button className="ch-btn" onClick={chDown}>
                <span className="ch-arrow">▼</span>
                <span className="ch-label">CH−</span>
              </button>
            </div>
            <div className="vol-col">
              <button className="ch-btn" onClick={volUp}>
                <span className="ch-arrow">▲</span>
                <span className="ch-label">VOL+</span>
              </button>
              <button className="ch-btn" onClick={volDown}>
                <span className="ch-arrow">▼</span>
                <span className="ch-label">VOL−</span>
              </button>
            </div>
          </div>
          <div className="num-grid" style={{ paddingBottom: '20px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} className="num-btn" onClick={() => handleNumPress(n)}>{n}</button>
            ))}
            <div /> {/* Empty bottom-left cell */}
            <button className="num-btn" onClick={() => handleNumPress(0)}>0</button>
            <div /> {/* Empty bottom-right cell */}
          </div>
        </div>
      </div>

      {/* Lang toggle */}
      <div className="t2-lang">
        <button className={`t2-lbtn${lang === 'en' ? ' on' : ''}`} onClick={() => switchLang('en')}>EN</button>
        <button className={`t2-lbtn${lang === 'ru' ? ' on' : ''}`} onClick={() => switchLang('ru')}>RU</button>
      </div>

      {/* Chat */}
      <PuzzleChat room="transmission-2" />
    </>
  )
}
