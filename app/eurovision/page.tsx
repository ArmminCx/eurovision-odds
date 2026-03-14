'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { useLanguage } from '@/app/context/LanguageContext'
import PuzzleChat from '@/app/components/PuzzleChat'

const TRANS = {
  en: {
    no_auth_main: 'You must be signed in to access this.',
    no_auth_sub: 'Go back. Start from the beginning.',
    no_clicks_main: 'You have not been here long enough.',
    no_clicks_sub: 'Go back. Start from the beginning.',
  },
  ru: {
    no_auth_main: 'Ты должен войти в систему.',
    no_auth_sub: 'Вернись. Начни сначала.',
    no_clicks_main: 'Ты здесь недостаточно долго.',
    no_clicks_sub: 'Вернись. Начни сначала.',
  },
} as const

type Screen = 'loading' | 'no_auth' | 'no_clicks' | 'secret' | 'started'

// Characters for scramble effect
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/\\~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function scramble(len: number) {
  return Array.from({ length: len }, () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]).join('')
}

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');
  .ev-root {
    position: fixed; inset: 0; background: #000;
    font-family: 'Share Tech Mono', monospace;
    overflow: hidden;
  }
  .ev-scanlines::after {
    content: ''; position: fixed; inset: 0; z-index: 9999; pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.12) 2px, rgba(0,0,0,.12) 4px);
  }
  .ev-scanlines-heavy::after {
    content: ''; position: fixed; inset: 0; z-index: 9999; pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,.55) 1px, rgba(0,0,0,.55) 3px);
    animation: ev-scan-flicker .08s steps(1) infinite;
  }
  @keyframes ev-scan-flicker {
    0%{opacity:1} 25%{opacity:.6} 50%{opacity:1} 75%{opacity:.4}
  }
  @keyframes ev-flicker {
    0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.4} 94%{opacity:1} 96%{opacity:.7} 97%{opacity:1}
  }
  @keyframes ev-glitch {
    0%,88%,100%{text-shadow:none;transform:none}
    89%{text-shadow:-4px 0 #ff0033,4px 0 #00ffee;transform:skew(-2deg)}
    90%{text-shadow:4px 0 #ff0033,-4px 0 #00ffee;transform:skew(2deg)}
    91%{text-shadow:-3px 0 #ff0033,3px 0 #00ffee;transform:none}
    92%{text-shadow:none}
  }
  @keyframes ev-scatter-0 { to { transform: translate(-300px,-500px) rotate(-80deg); opacity:0; } }
  @keyframes ev-scatter-1 { to { transform: translate(400px,-300px) rotate(55deg); opacity:0; } }
  @keyframes ev-scatter-2 { to { transform: translate(-150px,400px) rotate(-120deg); opacity:0; } }
  @keyframes ev-scatter-3 { to { transform: translate(350px,250px) rotate(90deg); opacity:0; } }
  @keyframes ev-scatter-4 { to { transform: translate(-400px,100px) rotate(-40deg); opacity:0; } }
  @keyframes ev-scatter-5 { to { transform: translate(250px,-400px) rotate(130deg); opacity:0; } }
  @keyframes ev-blink { 50%{opacity:0} }
  .ev-lang { position:fixed; top:14px; right:20px; z-index:10000;
    display:flex; gap:6px; align-items:center; }
  .ev-lbtn { font-family:'Share Tech Mono',monospace; font-size:10px; padding:2px 8px;
    border-radius:3px; cursor:pointer; border:1px solid transparent;
    letter-spacing:.1em; transition:all .2s; background:transparent; color:rgba(255,255,255,.2); }
  .ev-lbtn.on { color:#00ff88; border-color:rgba(0,255,136,.4);
    text-shadow:0 0 8px #00ff88; box-shadow:0 0 8px rgba(0,255,136,.1); }
  .ev-center {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 18px;
    text-align: center; padding: 40px;
  }
`

export default function EurovisionPage() {
  const supabase = createClient()
  const { lang, toggleLanguage } = useLanguage()
  const T = TRANS[lang as keyof typeof TRANS] ?? TRANS['en']

  const [screen, setScreen] = useState<Screen>('loading')
  const [user, setUser] = useState<User | null>(null)

  // Malfunction animation state
  const [phase, setPhase] = useState(0)               // 0=idle 1=init 2=heavy-scan 3+ each step
  const [showRules, setShowRules] = useState(true)
  const [showHints, setShowHints] = useState(true)
  const [showWarn, setShowWarn] = useState(true)
  const [showLore, setShowLore] = useState(true)
  const [scatterHead, setScatterHead] = useState(false)
  const [whiteFlash, setWhiteFlash] = useState(false)
  const [blackCursor, setBlackCursor] = useState(false)

  // Text scramble state for each block
  const [rulesText, setRulesText] = useState<string | null>(null)
  const [hintsText, setHintsText] = useState<string | null>(null)
  const [warnText, setWarnText] = useState<string | null>(null)
  const [loreText, setLoreText] = useState<string | null>(null)

  const scrambleIntervals = useRef<ReturnType<typeof setInterval>[]>([])

  const switchLang = (l: 'en' | 'ru') => { if (l !== lang) toggleLanguage() }

  useEffect(() => {
    let isMounted = true
    async function gate() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return
      setUser(user)
      if (!user) { setScreen('no_auth'); return }

      const { data } = await supabase
        .from('puzzle_interactions')
        .select('click_count, levelup_announced, puzzle_started')
        .eq('user_id', user.id)
        .single()

      if (!isMounted) return
      const count = data?.click_count ?? 0
      const announced = data?.levelup_announced ?? false
      const started = data?.puzzle_started ?? false

      if (count < 4) { setScreen('no_clicks'); return }

      // If already started — skip straight to 404
      if (started) { setScreen('started'); return }

      setScreen('secret')

      // Fire level-up announcement only once
      if (!announced) {
        const username = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.email?.split('@')[0]
          || 'Someone'
        await Promise.all([
          supabase.from('puzzle_chat').insert({
            user_id: user.id,
            username: 'SYSTEM',
            avatar_url: null,
            message: `🔔 ${username} has leveled up! They have reached the Eurovision stage.`,
            room: 'all',
            is_bot: true,
          }),
          supabase.from('puzzle_interactions').upsert({
            user_id: user.id,
            levelup_announced: true,
          }, { onConflict: 'user_id' }),
        ])
      }
    }
    gate()
    return () => { isMounted = false }
  }, [])

  // When screen=started, open new tab after 15s
  useEffect(() => {
    if (screen !== 'started') return
    const t = setTimeout(() => {
      window.open('/let-the-eurovision-song-contest-begin', '_blank')
    }, 15000)
    return () => clearTimeout(t)
  }, [screen])

  function startScramble(setter: (s: string | null) => void, originalLen: number, ms: number) {
    const iv = setInterval(() => setter(scramble(originalLen)), 60)
    scrambleIntervals.current.push(iv)
    setTimeout(() => {
      clearInterval(iv)
      setter(null)
    }, ms)
  }

  async function handleStart() {
    if (phase !== 0) return
    setPhase(1) // Step 1: button → INITIALIZING

    // Step 2 — heavy scanlines
    setTimeout(() => setPhase(2), 500)

    // Step 3 — scramble + hide rules box
    setTimeout(() => {
      startScramble(setRulesText, 180, 700)
      setTimeout(() => setShowRules(false), 800)
    }, 1500)

    // Step 4 — scramble + hide hints box
    setTimeout(() => {
      startScramble(setHintsText, 120, 700)
      setTimeout(() => setShowHints(false), 800)
    }, 2500)

    // Step 5 — scramble + hide warning
    setTimeout(() => {
      startScramble(setWarnText, 80, 700)
      setTimeout(() => setShowWarn(false), 800)
    }, 3500)

    // Step 6 — scramble + hide lore box
    setTimeout(() => {
      startScramble(setLoreText, 100, 700)
      setTimeout(() => setShowLore(false), 800)
    }, 4500)

    // Step 7 — scatter heading letters
    setTimeout(() => setScatterHead(true), 5500)

    // Step 8 — white flash → black cursor
    setTimeout(() => {
      setWhiteFlash(true)
      setTimeout(() => {
        setWhiteFlash(false)
        setBlackCursor(true)
      }, 200)
    }, 6500)

    // Step 9 — show 404 + save to DB
    setTimeout(async () => {
      scrambleIntervals.current.forEach(clearInterval)
      if (user) {
        await supabase.from('puzzle_interactions').upsert({
          user_id: user.id,
          puzzle_started: true,
        }, { onConflict: 'user_id' })
      }
      setScreen('started')
    }, 7500)
  }

  /* ── Shared shell ── */
  const Shell = ({ children, heavy }: { children: React.ReactNode; heavy?: boolean }) => (
    <>
      <style>{BASE_CSS}</style>
      <div className={`ev-root ${heavy ? 'ev-scanlines-heavy' : 'ev-scanlines'}`}>
        <div className="ev-lang">
          <button className={`ev-lbtn${lang === 'en' ? ' on' : ''}`} onClick={() => switchLang('en')}>EN</button>
          <button className={`ev-lbtn${lang === 'ru' ? ' on' : ''}`} onClick={() => switchLang('ru')}>RU</button>
        </div>
        {children}
      </div>
    </>
  )

  /* ── Loading ── */
  if (screen === 'loading') return (
    <Shell><div style={{ position: 'absolute', inset: 0, background: '#000' }} /></Shell>
  )

  /* ── Not authenticated ── */
  if (screen === 'no_auth') return (
    <Shell>
      <div className="ev-center">
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 'clamp(14px,2vw,18px)', color: '#00ff88', letterSpacing: '.1em', animation: 'ev-flicker 4s infinite' }}>
          {T.no_auth_main}
        </p>
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '12px', color: 'rgba(255,255,255,.2)', letterSpacing: '.1em' }}>
          {T.no_auth_sub}
        </p>
      </div>
    </Shell>
  )

  /* ── Not enough clicks ── */
  if (screen === 'no_clicks') return (
    <Shell>
      <div className="ev-center">
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 'clamp(14px,2vw,18px)', color: '#00ff88', letterSpacing: '.1em', animation: 'ev-flicker 3.5s infinite' }}>
          {T.no_clicks_main}
        </p>
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '12px', color: 'rgba(255,255,255,.2)', letterSpacing: '.1em' }}>
          {T.no_clicks_sub}
        </p>
      </div>
    </Shell>
  )

  /* ── Permanent 404 (puzzle_started = true) ── */
  if (screen === 'started') return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; }
        .cr-root {
          min-height: 100vh; background: #fff;
          font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
          color: #202124; display: flex; flex-direction: column;
        }
        .cr-bar {
          background: #f1f3f4; border-bottom: 1px solid #dadce0;
          padding: 8px 12px; display: flex; align-items: center; gap: 8px;
        }
        .cr-btns { display: flex; gap: 4px; }
        .cr-btn {
          width: 28px; height: 28px; border-radius: 50%; border: none;
          background: transparent; cursor: default; display: flex;
          align-items: center; justify-content: center; color: #5f6368;
          font-size: 16px;
        }
        .cr-btn:hover { background: rgba(0,0,0,.06); }
        .cr-url-bar {
          flex: 1; background: #fff; border: 1px solid #dadce0;
          border-radius: 20px; padding: 5px 16px; font-size: 14px;
          color: #202124; display: flex; align-items: center; gap: 6px;
        }
        .cr-url-lock { color: #5f6368; font-size: 12px; }
        .cr-url-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cr-body {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 40px 20px;
        }
        .cr-content { max-width: 500px; width: 100%; }
        .cr-dino { margin-bottom: 24px; }
        .cr-heading {
          font-size: 24px; font-weight: 400; color: #202124;
          margin-bottom: 12px; line-height: 1.3;
        }
        .cr-sub { font-size: 14px; color: #5f6368; line-height: 1.6; margin-bottom: 20px; }
        .cr-err { font-size: 12px; color: #5f6368; margin-top: 8px; }
        .cr-reload {
          background: #1a73e8; color: #fff; border: none;
          border-radius: 4px; padding: 8px 20px; font-size: 14px;
          cursor: default; font-family: inherit;
        }
        .cr-details { margin-top: 16px; }
        .cr-details-summary {
          font-size: 13px; color: #1a73e8; cursor: default; list-style: none;
        }
        .cr-details-body { font-size: 12px; color: #5f6368; margin-top: 8px; line-height: 1.8; }
      `}</style>
      <div className="cr-root">
        {/* Fake address bar */}
        <div className="cr-bar">
          <div className="cr-btns">
            <div className="cr-btn">←</div>
            <div className="cr-btn">→</div>
            <div className="cr-btn">↻</div>
          </div>
          <div className="cr-url-bar">
            <span className="cr-url-lock">🔒</span>
            <span className="cr-url-text">eurovision.epics.tv/eurovision</span>
          </div>
        </div>

        <div className="cr-body">
          <div className="cr-content">
            {/* Chrome T-Rex SVG */}
            <div className="cr-dino">
              <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* body */}
                <rect x="38" y="44" width="44" height="32" rx="3" fill="#dadce0" />
                {/* head */}
                <rect x="62" y="18" width="40" height="30" rx="3" fill="#dadce0" />
                {/* snout extension */}
                <rect x="98" y="30" width="14" height="10" rx="2" fill="#dadce0" />
                {/* mouth open */}
                <rect x="98" y="36" width="14" height="4" rx="1" fill="#fff" />
                {/* eye */}
                <rect x="90" y="22" width="7" height="7" rx="3.5" fill="#fff" />
                <rect x="92" y="24" width="3" height="3" rx="1.5" fill="#5f6368" />
                {/* tail */}
                <polygon points="38,54 6,72 38,72" fill="#dadce0" />
                {/* leg 1 */}
                <rect x="52" y="76" width="9" height="14" rx="2" fill="#dadce0" />
                {/* leg 2 */}
                <rect x="66" y="76" width="9" height="14" rx="2" fill="#dadce0" />
                {/* foot 1 */}
                <rect x="48" y="88" width="17" height="2" rx="1" fill="#dadce0" />
                {/* foot 2 */}
                <rect x="62" y="88" width="17" height="2" rx="1" fill="#dadce0" />
                {/* small arm */}
                <rect x="76" y="58" width="10" height="5" rx="2" fill="#dadce0" />
              </svg>
            </div>

            <h1 className="cr-heading">This page isn't available</h1>
            <p className="cr-sub">
              The URL <strong>eurovision.epics.tv/eurovision</strong> may have been removed, had its
              name changed, or is temporarily unavailable.
            </p>
            <button className="cr-reload">Reload</button>
            <p className="cr-err">ERR_NOT_FOUND</p>

            <div className="cr-details">
              <span className="cr-details-summary">Details</span>
              <div className="cr-details-body">
                Check if there is a typo in the URL.<br />
                If the page just went offline, wait a few minutes and try again.<br />
                Clear your browsing data and cookies, then try again.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  /* ── Secret page ── */
  const isEn = lang === 'en'
  const titleText = isEn ? 'YOU MADE IT.' : 'ТЫ ДОБРАЛСЯ.'

  return (
    <Shell heavy={phase >= 2}>
      <style>{`
        .ev-secret {
          position: absolute; inset: 0; overflow-y: auto;
          display: flex; flex-direction: column; align-items: center;
          min-height: 100vh; padding: 80px 24px 80px;
        }
        .ev-inner {
          width: 100%; max-width: 700px;
          display: flex; flex-direction: column; gap: 36px;
          align-items: center; text-align: center;
        }
        .ev-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(64px, 14vw, 130px); line-height: .9;
          color: #00ff88;
          text-shadow: 0 0 30px rgba(0,255,136,.4), 0 0 80px rgba(0,255,136,.1);
          animation: ev-glitch 5s infinite, ev-flicker 7s infinite;
          letter-spacing: .05em;
          display: flex; flex-wrap: wrap; justify-content: center;
        }
        .ev-letter { display: inline-block; }
        .ev-sub {
          font-family: 'Share Tech Mono', monospace; font-size: 12px;
          color: rgba(0,255,136,.6); letter-spacing: .18em;
          margin-top: -20px;
        }
        .ev-lore-box {
          width: 100%; background: rgba(0,255,136,.04);
          border-left: 3px solid #00ff88; padding: 20px 24px;
          text-align: left;
          font-family: 'Space Mono', monospace; font-size: 13px;
          line-height: 2; color: rgba(255,255,255,.6);
          transition: opacity .4s;
        }
        .ev-warn {
          font-family: 'Share Tech Mono', monospace; font-size: 13px;
          color: #ff2d55; letter-spacing: .06em; line-height: 1.7;
          text-align: center; white-space: pre-line;
          transition: opacity .4s;
        }
        .ev-card {
          width: 100%; padding: 24px 26px; text-align: left;
          background: rgba(255,255,255,.02);
          transition: opacity .4s;
        }
        .ev-card-gold { border-left: 3px solid #ffd700; }
        .ev-card-dim  { border-left: 3px solid rgba(255,255,255,.12); }
        .ev-card-title {
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
          letter-spacing: .18em; margin-bottom: 18px;
        }
        .ev-card-title-gold  { color: #ffd700; }
        .ev-card-title-green { color: #00ff88; }
        .ev-card-body {
          font-family: 'Space Mono', monospace; font-size: 12px;
          line-height: 2; color: rgba(255,255,255,.5);
          white-space: pre-wrap;
        }
        .ev-hint { margin-bottom: 14px; font-family: 'Space Mono', monospace; font-size: 12px; line-height: 1.8; }
        .ev-hint-normal { color: rgba(255,255,255,.55); }
        .ev-hint-locked { color: #444; display: flex; align-items: flex-start; gap: 6px; }
        .ev-cta {
          font-family: 'Bebas Neue', sans-serif; font-size: 20px;
          letter-spacing: .2em; color: #060608; background: #00ff88;
          border: none; border-radius: 3px; padding: 18px 40px;
          cursor: pointer; transition: opacity .2s, transform .15s, box-shadow .2s;
          box-shadow: 0 0 30px rgba(0,255,136,.35), 0 0 80px rgba(0,255,136,.1);
        }
        .ev-cta:hover:not(:disabled) {
          opacity: .88; transform: translateY(-3px);
          box-shadow: 0 0 50px rgba(0,255,136,.5), 0 0 100px rgba(0,255,136,.15);
        }
        .ev-cta:disabled { opacity: .6; cursor: not-allowed; }
        .ev-cta-warn {
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
          color: rgba(255,45,85,.45); letter-spacing: .1em;
          margin-top: -18px;
        }
        .ev-scramble {
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
          color: #ff2d55; letter-spacing: .05em; word-break: break-all;
          text-shadow: 2px 0 #ff0033, -2px 0 #00ffee;
          animation: ev-glitch .1s steps(1) infinite;
        }
        .ev-flash-white {
          position: fixed; inset: 0; z-index: 99999; background: #fff;
        }
        .ev-black-cursor {
          position: fixed; inset: 0; z-index: 99998; background: #000;
          display: flex; align-items: center; justify-content: center;
        }
        .ev-cursor-bar {
          width: 2px; height: 28px; background: #fff;
          animation: ev-blink .7s step-end infinite;
        }
      `}</style>

      {/* Overlay layers */}
      {whiteFlash && <div className="ev-flash-white" />}
      {blackCursor && !whiteFlash && (
        <div className="ev-black-cursor"><div className="ev-cursor-bar" /></div>
      )}

      <div className="ev-secret">
        <PuzzleChat room="eurovision" />
        <div className="ev-inner">

          {/* S1 — Heading with per-letter scatter */}
          <div className="ev-title">
            {titleText.split('').map((ch, i) => (
              <span
                key={i}
                className="ev-letter"
                style={scatterHead ? {
                  animation: `ev-scatter-${i % 6} ${0.35 + (i % 3) * 0.12}s ${i * 0.06}s ease-in forwards`,
                } : {}}
              >{ch === ' ' ? '\u00a0' : ch}</span>
            ))}
          </div>

          {/* S2 — Subheading */}
          <div className="ev-sub">
            {isEn ? '// Checkpoint 01 — Signal Confirmed' : '// Контрольная точка 01 — Сигнал подтверждён'}
          </div>

          {/* S3 — Lore box */}
          {showLore && (
            <div className="ev-lore-box" style={{ opacity: loreText ? 0.5 : 1 }}>
              {loreText
                ? <span className="ev-scramble">{loreText}</span>
                : (isEn
                  ? 'Congratulations. You found the first signal. You made it further than most ever will. But do not mistake this for the finish line — the end is still far ahead.'
                  : 'Поздравляем. Ты нашёл первый сигнал. Ты продвинулся дальше, чем большинство. Но не принимай это за финишную черту — конец ещё далеко впереди.')}
            </div>
          )}

          {/* S4 — Warning */}
          {showWarn && (
            <div className="ev-warn" style={{ opacity: warnText ? 0.5 : 1 }}>
              {warnText
                ? <span className="ev-scramble">{warnText}</span>
                : (isEn
                  ? 'I have to warn you — it gets significantly harder from here.\nOnly the smartest Eurovision experts make it to the end.'
                  : 'Должен предупредить — дальше становится значительно сложнее.\nДо конца доберутся только лучшие знатоки Евровидения.')}
            </div>
          )}

          {/* S5 — Rules box */}
          {showRules && (
            <div className="ev-card ev-card-gold" style={{ opacity: rulesText ? 0.5 : 1 }}>
              <div className="ev-card-title ev-card-title-gold">
                {isEn ? '// Guidelines — Read Carefully' : '// Правила — Читай внимательно'}
              </div>
              <div className="ev-card-body">
                {rulesText
                  ? <span className="ev-scramble">{rulesText}</span>
                  : (isEn
                    ? `Feel free to use the internet as your resource. Feel free to chat and work together to figure out each step. Feel free to follow along as you watch EpicStory on his journey.\n\nWe encourage you to use a notepad and write things down. We encourage you to use recording software, clipping tools, screenshots — use everything at your disposal.\n\nPlease refrain from using AI. The purpose of this is to watch you work together as a collective. However, if everything has been tried and nothing works — in the worst case scenario you may use it. Not that it will help.\n\nThe $50 is only meant for EpicStory to win. Feel free to play along and help him get there. Good luck.`
                    : `Можно использовать интернет в качестве помощника. Можно общаться и работать вместе, чтобы разобраться с каждым шагом. Можно следить за путешествием EpicStory в прямом эфире.\n\nРекомендуем использовать блокнот и записывать всё важное. Рекомендуем использовать программы записи, инструменты для клипов и скриншотов — используй всё, что есть под рукой.\n\nПожалуйста, воздержись от использования ИИ. Цель этого — наблюдать за тем, как вы работаете вместе как единое целое. Однако если всё было испробовано и ничего не работает — в крайнем случае можно использовать его. Хотя вряд ли поможет.\n\n$50 предназначены только для EpicStory. Можно играть вместе и помогать ему добраться до цели. Удачи.`)}
              </div>
            </div>
          )}

          {/* S6 — Hints box */}
          {showHints && (
            <div className="ev-card ev-card-dim" style={{ opacity: hintsText ? 0.5 : 1 }}>
              <div className="ev-card-title ev-card-title-green">
                {isEn ? '// Hints — 4 Total' : '// Подсказки — 4 всего'}
              </div>
              {hintsText
                ? <span className="ev-scramble">{hintsText}</span>
                : (<>
                  <div className="ev-hint ev-hint-normal">
                    {isEn ? 'Hint 01 — Available now. ' : 'Подсказка 01 — Доступна сейчас. '}
                  </div>
                  <div className="ev-hint ev-hint-locked">
                    <span>🔒</span>
                    <span>{isEn ? 'Hint 02 — Unlocks 24 hours after the puzzle begins.' : 'Подсказка 02 — Откроется через 24 часа после начала головоломки.'}</span>
                  </div>
                  <div className="ev-hint ev-hint-locked">
                    <span>🔒</span>
                    <span>{isEn ? 'Hint 03 — Unlocks 48 hours after the puzzle begins.' : 'Подсказка 03 — Откроется через 48 часов после начала головоломки.'}</span>
                  </div>
                  <div className="ev-hint ev-hint-normal">
                    {isEn
                      ? 'Hint 04 — This hint cannot be given. It can only be found. If you ever find it — good luck.'
                      : 'Подсказка 04 — Эту подсказку нельзя получить. Её можно только найти. Если найдёшь — удачи.'}
                  </div>
                </>)}
            </div>
          )}

          {/* S7 — CTA button */}
          <button
            className="ev-cta"
            disabled={phase > 0}
            onClick={handleStart}
          >
            {phase > 0
              ? 'INITIALIZING...'
              : (isEn ? "I UNDERSTAND. LET'S START." : 'Я ПОНИМАЮ. НАЧНЁМ.')}
          </button>

          {/* S8 — Below button warning */}
          <div className="ev-cta-warn">
            {isEn ? 'There is no going back from here.' : 'Отсюда нет пути назад.'}
          </div>

        </div>
      </div>
    </Shell>
  )
}
