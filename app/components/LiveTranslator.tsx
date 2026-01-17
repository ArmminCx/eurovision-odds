'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'react-hot-toast'

const ALLOWED_IDS = [
  'f15ffc29-f012-4064-af7b-c84feb4d3320', 
  '6e0d7faf-060c-4275-92f7-81befc3121ab'
]

const SOURCE_LANGUAGES = [
  { code: 'en', name: 'Speaking: English 🇬🇧', engine: 'deepgram', model: 'nova-2' },
  { code: 'ru', name: 'Speaking: Russian 🇷🇺', engine: 'deepgram', model: 'nova-2' },
  { code: 'it', name: 'Speaking: Italian 🇮🇹', engine: 'deepgram', model: 'nova-2' },
  { code: 'sv', name: 'Speaking: Swedish 🇸🇪', engine: 'deepgram', model: 'nova-2' },
  { code: 'fr', name: 'Speaking: French 🇫🇷', engine: 'deepgram', model: 'nova-2' },
  { code: 'es', name: 'Speaking: Spanish 🇪🇸', engine: 'deepgram', model: 'nova-2' },
  { code: 'fi', name: 'Speaking: Finnish 🇫🇮', engine: 'deepgram', model: 'base' },
  { code: 'uk', name: 'Speaking: Ukrainian 🇺🇦', engine: 'deepgram', model: 'base' },
  { code: 'de', name: 'Speaking: German 🇩🇪', engine: 'deepgram', model: 'nova-2' },
  { code: 'no', name: 'Speaking: Norwegian 🇳🇴', engine: 'deepgram', model: 'nova-2' },
  { code: 'pt', name: 'Speaking: Portuguese 🇵🇹', engine: 'deepgram', model: 'nova-2' },
  { code: 'pl', name: 'Speaking: Polish 🇵🇱', engine: 'deepgram', model: 'nova-2' },
  { code: 'sr', name: 'Speaking: Serbian 🇷🇸', engine: 'deepgram', model: 'base' },
  { code: 'ro', name: 'Speaking: Romanian 🇷🇴', engine: 'deepgram', model: 'base' },
  { code: 'mt', name: 'Speaking: Maltese 🇲🇹', engine: 'browser', langCode: 'mt-MT' },
]

const TARGET_LANGUAGES = [
  { code: 'ru', name: 'Read: Russian 🇷🇺' },
  { code: 'en', name: 'Read: English 🇬🇧' },
]

export default function LiveTranslator({ userId, hidden }: { userId: string, hidden?: boolean }) {
  // --- 1. STATE & REFS ---
  const [isListening, setIsListening] = useState(false)
  const [caption, setCaption] = useState('Initializing...') 
  
  // Settings
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('ru') 
  const [textSize, setTextSize] = useState(24)
  const [isMinimized, setIsMinimized] = useState(false)
  
  // Pause/Music Mode State
  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(false) 
  
  // Dragging State
  const [subPos, setSubPos] = useState({ x: 0, y: 0 })
  const [isDraggingSub, setIsDraggingSub] = useState(false)
  const [subDragOffset, setSubDragOffset] = useState({ x: 0, y: 0 })
  const [controlPos, setControlPos] = useState({ x: 20, y: 100 })
  const [isDraggingControl, setIsDraggingControl] = useState(false)
  const [controlDragOffset, setControlDragOffset] = useState({ x: 0, y: 0 })
  
  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<any>(null)
  
  const lastTranslationTime = useRef<number>(0)
  const isTranslatingRef = useRef(false)
  const pendingTextRef = useRef<string | null>(null)

  // --- 2. EFFECTS ---

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setSubPos({ x: window.innerWidth / 2 - 250, y: window.innerHeight - 150 })
    }
  }, [])

  // Sync isPaused state to ref
  useEffect(() => {
      isPausedRef.current = isPaused
  }, [isPaused])

  // --- 3. FUNCTIONS ---

  // Defined HERE so it is visible to the rest of the component
  const togglePause = () => {
      const newState = !isPaused
      setIsPaused(newState)
      if (newState) toast("Music Mode: Subtitles Paused ⏸️", { id: 'pause-toast', icon: '🎵' })
      else toast("Resuming Translation ▶️", { id: 'pause-toast' })
  }

  // Keyboard Listener (V to Toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        if (e.key.toLowerCase() === 'v' && isListening) {
            togglePause()
        }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isListening, isPaused]) // Dependencies updated

  // Dragging Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingSub) {
            setSubPos({ x: e.clientX - subDragOffset.x, y: e.clientY - subDragOffset.y })
        }
        if (isDraggingControl) {
            setControlPos({ x: e.clientX - controlDragOffset.x, y: e.clientY - controlDragOffset.y })
        }
    }
    const handleMouseUp = () => { setIsDraggingSub(false); setIsDraggingControl(false) }
    if (isDraggingSub || isDraggingControl) {
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingSub, isDraggingControl, subDragOffset, controlDragOffset])

  const handleSubMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSub(true)
    setSubDragOffset({ x: e.clientX - subPos.x, y: e.clientY - subPos.y })
  }

  const handleControlMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'INPUT') return;
    setIsDraggingControl(true)
    setControlDragOffset({ x: e.clientX - controlPos.x, y: e.clientY - controlPos.y })
  }

  // Translation Logic
  const attemptTranslate = async (text: string, sLang: string, tLang: string) => {
    if (isPausedRef.current) return; 

    if (isTranslatingRef.current) {
        pendingTextRef.current = text;
        return;
    }

    isTranslatingRef.current = true;
    
    try {
        const sl = sLang.split('-')[0];
        const tl = tLang.split('-')[0];
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            if (!isPausedRef.current) setCaption(data[0][0][0]);
        }
    } catch (err) {
        console.error(err)
    }

    isTranslatingRef.current = false;
    
    if (pendingTextRef.current && pendingTextRef.current !== text) {
        const nextText = pendingTextRef.current;
        pendingTextRef.current = null;
        attemptTranslate(nextText, sLang, tLang);
    }
  };

  const startListening = async () => {
    const selectedSource = SOURCE_LANGUAGES.find(l => l.code === sourceLang)
    if (!selectedSource) return

    setIsListening(true)
    setIsPaused(false)
    
    if (selectedSource.engine === 'browser') {
        startBrowserRecognition(selectedSource.langCode || 'en-US')
        return
    }
    startDeepgram(selectedSource.model || 'base')
  }

  const startBrowserRecognition = (langCode: string) => {
    if (!('webkitSpeechRecognition' in window)) {
        toast.error("Browser Not Supported")
        setIsListening(false)
        return
    }
    setCaption("🎙️ Mic Listening...")
    
    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = langCode

    recognition.onresult = async (event: any) => {
        if (isPausedRef.current) return;

        const result = event.results[event.results.length - 1]
        const transcript = result[0].transcript

        if (transcript) {
            if (sourceLang === targetLang) {
                setCaption(transcript)
            } else {
                attemptTranslate(transcript, sourceLang, targetLang)
            }

            if (result.isFinal) {
                setTimeout(() => {
                    if (!isPausedRef.current) setCaption(prev => (prev.length < 5) ? '...' : prev)
                }, 5000)
            }
        }
    }
    recognition.start()
    recognitionRef.current = recognition
  }

  const startDeepgram = async (model: string) => {
    try {
      setCaption("Getting Key...")
      const response = await fetch("/api/deepgram");
      const data = await response.json();
      if (!data.key) throw new Error("API Key Error");

      setCaption("Share Tab Audio...")
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      })

      if (stream.getAudioTracks().length === 0) {
          toast.error("NO AUDIO! Check 'Share Tab Audio'.");
          stopListening();
          return;
      }

      setCaption("Connecting...")
      streamRef.current = stream

      const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=${model}&language=${sourceLang}&smart_format=true`, [
        'token', data.key
      ])

      socket.onopen = () => {
        setCaption(`🟢 Listening...`)
        toast.success("Connected")
        const mediaRecorder = new MediaRecorder(stream)
        recorderRef.current = mediaRecorder
        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0 && socket.readyState === 1 && !isPausedRef.current) {
                socket.send(event.data)
            }
        })
        mediaRecorder.start(250)
      }

      socket.onmessage = async (message) => {
        if (isPausedRef.current) return;

        const received = JSON.parse(message.data)
        const transcript = received.channel?.alternatives[0]?.transcript
        
        if (transcript) {
            if (sourceLang === targetLang) {
                setCaption(transcript)
            } else {
                attemptTranslate(transcript, sourceLang, targetLang)
            }

            if (received.is_final) {
                setTimeout(() => {
                    if (!isPausedRef.current) setCaption(prev => (prev.includes(transcript) || prev.length < 5) ? '...' : prev)
                }, 5000)
            }
        }
      }

      socket.onclose = () => stopListening()
      socket.onerror = () => setCaption("Connection Error")
      socketRef.current = socket

    } catch (error: any) {
      console.error(error)
      stopListening()
      if (error.name === "NotAllowedError") toast.error("Permission denied.")
      else toast.error("Error: " + error.message)
    }
  }

  const stopListening = () => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    socketRef.current?.close()
    if (recognitionRef.current) recognitionRef.current.stop()
    
    isTranslatingRef.current = false
    pendingTextRef.current = null
    setIsPaused(false)
    setIsListening(false)
    setCaption('')
  }

  // --- 4. RENDER ---
  if (!userId || !ALLOWED_IDS.includes(userId)) return null

  return (
    <>
      {/* CONTROLS (Hidden if 'hidden' prop is true, e.g. in Cinema Mode) */}
      {!hidden && (
        <div 
            onMouseDown={handleControlMouseDown}
            style={{ left: `${controlPos.x}px`, top: `${controlPos.y}px` }}
            className={`fixed z-[99999] cursor-grab active:cursor-grabbing select-none ${isDraggingControl ? 'cursor-grabbing' : ''}`}
        >
            {isMinimized ? (
                <button 
                    onClick={() => setIsMinimized(false)} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 transition-all hover:scale-110 ${isListening ? (isPaused ? 'bg-yellow-600 border-yellow-400' : 'bg-green-600 border-green-400 animate-pulse') : 'bg-gray-800 border-gray-600'}`}
                >
                    {isPaused ? '⏸️' : '🎙️'}
                </button>
            ) : (
                <div className="flex flex-col gap-2 items-start bg-black/90 p-3 rounded-lg border border-yellow-500 shadow-xl w-52 animate-fade-in relative">
                    <div className="w-full flex justify-between items-center mb-1 border-b border-white/10 pb-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase pointer-events-none">AI Translator</span>
                        <button onClick={() => setIsMinimized(true)} className="text-gray-400 hover:text-white px-1.5 rounded hover:bg-white/10 text-xs font-bold">－</button>
                    </div>
                    
                    {!isListening ? (
                        <>
                            <label className="text-[9px] text-gray-500 uppercase font-bold">Source (Audio)</label>
                            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="bg-gray-800 text-white text-xs p-1 rounded border border-gray-600 w-full mb-2">
                                {SOURCE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>

                            <label className="text-[9px] text-gray-500 uppercase font-bold">Target (Text)</label>
                            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="bg-gray-800 text-white text-xs p-1 rounded border border-gray-600 w-full">
                                {TARGET_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>
                            
                            <button onClick={startListening} className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-2 rounded mt-2 shadow">🎙️ Start Translation</button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={togglePause} 
                                className={`w-full text-white text-xs font-bold px-3 py-2 rounded shadow mb-1 transition-colors ${isPaused ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}
                            >
                                {isPaused ? '⏸ RESUME (V)' : '⏸ PAUSE (V)'}
                            </button>

                            <button onClick={stopListening} className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded shadow">⏹ Stop</button>
                            
                            <div className="w-full h-[1px] bg-white/20 my-1"></div>
                            <label className="text-[10px] text-gray-400 font-bold uppercase flex justify-between w-full pointer-events-none">Text Size <span>{textSize}px</span></label>
                            <input type="range" min="14" max="60" value={textSize} onChange={(e) => setTextSize(parseInt(e.target.value))} className="w-full accent-yellow-500 cursor-pointer h-2 bg-gray-700 rounded-lg appearance-none"/>
                        </>
                    )}
                </div>
            )}
        </div>
      )}

      {/* SUBTITLES BOX (Hidden when Paused, but SHOWS in Cinema Mode) */}
      {isListening && !isPaused && (
        <div 
            onMouseDown={handleSubMouseDown}
            style={{ 
                left: `${subPos.x}px`, 
                top: `${subPos.y}px`,
                cursor: isDraggingSub ? 'grabbing' : 'grab'
            }}
            className="fixed z-[99999] w-full max-w-4xl px-4 text-center select-none"
        >
            <div className="bg-black/70 backdrop-blur-md px-8 py-4 rounded-2xl border-2 border-yellow-500/30 shadow-[0_0_50px_rgba(0,0,0,0.9)] inline-block min-w-[300px] hover:border-yellow-500/80 transition-colors">
                <div className="w-12 h-1 bg-white/20 mx-auto rounded-full mb-2"></div>
                
                <p 
                    style={{ fontSize: `${textSize}px`, lineHeight: 1.4 }}
                    className="text-yellow-300 font-bold drop-shadow-md font-sans transition-all duration-100"
                >
                    {caption}
                </p>
            </div>
        </div>
      )}
    </>
  )
}