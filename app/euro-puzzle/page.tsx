'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/app/context/LanguageContext'
import PuzzleChat from '@/app/components/PuzzleChat'
import { createClient } from '@/app/utils/supabase/client'
import { User } from '@supabase/supabase-js'

/* ── Translations ── */
const TRANS = {
  en: {
    eyebrow: '// Classified Archive — Handle With Care',
    lore_label: '// Transmission — Origin Unknown',
    lore_text: 'The Eurovision Puzzle Archive has been locked since <span class="hi">2003</span>. Someone left the door open. What you find here was never meant to be public. The signals are scattered. <span class="hi">Find the path. Piece it together. Claim what\'s yours.</span>',
    rules_label: '// Protocol — <span class="rx rx-outer"><span style="color:#060608;user-select:text;-webkit-user-select:text;-moz-user-select:text;">VISION</span></span> Before Proceeding',
    r1_title: 'LOOK',
    r1_desc: 'It begins somewhere on this site. Or maybe it already began. Not everything is <span class="rx">visible</span>. Some things are hidden in <span class="rx">places</span> that most people never think to check.',
    r2_title: 'LISTEN',
    r2_desc: 'The letters mean nothing without <span class="rx">context</span>. Each one knows its place. The order is <span class="rx">obvious</span> if you know what <span class="rx">silence</span> sounds like.',
    r3_title: 'MOVE',
    r3_desc: 'When you have what you need, you will know where to go. No link will take you there. You have to <a href="/r" class="rx" style="cursor:pointer;text-decoration:none;color:#111;background:#111;border-radius:1px;padding:0 4px;display:inline;outline:none;">type</a> it yourself. Manually. <span class="rx">No shortcuts.</span>',
    r4_title: 'SUBMIT',
    r4_desc: 'The <span class="rx">system</span> is watching. First in, <span class="rx">first</span> wins. There is no second place. Timestamps do not lie. <span class="rx">This</span> does not give second chances.',
    prize_label: '// Total Prize Pool',
    prize_desc: 'First correct submission wins. Timestamps are server-recorded. No extensions. No exceptions.',
    start_btn: 'START',
    start_sub: "— good luck, you'll need it —",
    err1: 'ERROR 404 — Contest not found',
    err2: 'ERROR: Unauthorized access',
    err3: 'ERROR: Interference detected',
    err4: 'Please stop.',
  },
  ru: {
    eyebrow: '// Закрытый архив — Обращаться с осторожностью',
    lore_label: '// Передача — Источник неизвестен',
    lore_text: 'Архив Eurovision Puzzle закрыт с <span class="hi">2003</span> года. Кто-то оставил дверь открытой. То, что вы здесь найдёте, никогда не предназначалось для чужих глаз. Сигналы рассеяны. <span class="hi">Найди путь. Сложи картину. Возьми то, что тебе причитается.</span>',
    rules_label: '// Протокол — <span class="rx rx-outer"><span style="color:#060608;user-select:text;-webkit-user-select:text;-moz-user-select:text;">VISION</span></span> перед началом',
    r1_title: 'СМОТРИ',
    r1_desc: 'Это начинается где-то на этом сайте. Или, возможно, уже началось. Не всё <span class="rx">видимо</span>. Кое-что спрятано в <span class="rx">местах</span>, о которых большинство никогда не думает.',
    r2_title: 'СЛУШАЙ',
    r2_desc: 'Буквы ничего не значат без <span class="rx">контекста</span>. Каждая знает своё место. Порядок <span class="rx">очевиден</span>, если знаешь, как звучит <span class="rx">тишина</span>.',
    r3_title: 'ДЕЙСТВУЙ',
    r3_desc: 'Когда у тебя будет всё необходимое, ты поймёшь, куда идти. Никакая ссылка туда не ведёт. Тебе придётся <a href="/r" class="rx" style="cursor:pointer;text-decoration:none;color:#111;background:#111;border-radius:1px;padding:0 4px;display:inline;outline:none;">набрать</a> это вручную. Вручную. <span class="rx">Без подсказок.</span>',
    r4_title: 'ОТПРАВЬ',
    r4_desc: '<span class="rx">Система</span> наблюдает. Первый пришёл — первый <span class="rx">победил</span>. Второго места нет. Временные метки не лгут. <span class="rx">Это</span> не даёт второго шанса.',
    prize_label: '// Общий призовой фонд',
    prize_desc: 'Побеждает первая правильная заявка. Время фиксируется на сервере. Никаких продлений. Никаких исключений.',
    start_btn: 'СТАРТ',
    start_sub: '— удачи, она тебе понадобится —',
    err1: 'ОШИБКА 404 — Соревнование не найдено',
    err2: 'ОШИБКА: Несанкционированный доступ',
    err3: 'ОШИБКА: Обнаружены помехи',
    err4: 'Пожалуйста, остановитесь.',
  },
} as const
type Lang = keyof typeof TRANS

export default function EuroPuzzlePage() {
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [localClicks, setLocalClicks] = useState(0)
  const [showE, setShowE] = useState(false)
  const { lang, toggleLanguage } = useLanguage()
  const T = TRANS[lang as keyof typeof TRANS] ?? TRANS['en']

  /* Get user on mount */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  /* Switch to a specific language (only toggle if it's different) */
  const switchLang = (l: 'en' | 'ru') => { if (l !== lang) toggleLanguage() }

  /* Track START button click in puzzle_interactions */
  const handleStartClick = () => {
    // ── Visual sequence (local, independent) ──
    const next = localClicks + 1
    setLocalClicks(next)
    if (next === 3) {
      // Flash the letter E for 100ms
      setShowE(true)
      setTimeout(() => setShowE(false), 100)
    }

    // ── Supabase upsert (fire-and-forget, does not block visual) ──
    if (user) {
      ; (async () => {
        const { data: existing } = await supabase
          .from('puzzle_interactions')
          .select('click_count')
          .eq('user_id', user.id)
          .single()
        const newCount = (existing?.click_count ?? 0) + 1
        await supabase.from('puzzle_interactions').upsert({
          user_id: user.id,
          click_count: newCount,
          last_clicked_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      })()
    }
  }

  /* Particles + rare floating O */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number

    type Dot = { x: number; y: number; r: number; speed: number; opacity: number; drift: number }
    type OLetter = { x: number; y: number; speed: number; opacity: number; drift: number; active: boolean }

    const dots: Dot[] = []
    const oLetters: OLetter[] = []
    const N = 55
    let W = 0, H = 0

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    const makeDot = (scatterY = false): Dot => ({
      x: Math.random() * W,
      y: scatterY ? Math.random() * H : H + Math.random() * 60,
      r: Math.random() * 1.5 + 0.4,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.35 + 0.05,
      drift: (Math.random() - 0.5) * 0.25,
    })

    // Schedule the next O spawn between 45–90 seconds
    let oTimer: ReturnType<typeof setTimeout>
    const scheduleO = () => {
      const delay = 45000 + Math.random() * 45000
      oTimer = setTimeout(() => {
        if (W > 0 && H > 0) {
          oLetters.push({
            x: Math.random() * W,
            y: H + 10,
            speed: 0.2 + Math.random() * 0.3,
            opacity: 0.2 + Math.random() * 0.15,
            drift: (Math.random() - 0.5) * 0.25,
            active: true,
          })
        }
        scheduleO() // schedule next one
      }, delay)
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      // Green dots
      dots.forEach(d => {
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,255,136,${d.opacity})`; ctx.fill()
        d.y -= d.speed; d.x += d.drift
        if (d.y < -10) Object.assign(d, makeDot(false))
      })
      // White O letters
      ctx.font = "14px 'Share Tech Mono', monospace"
      ctx.textAlign = 'center'
      oLetters.forEach((o, i) => {
        ctx.fillStyle = `rgba(255,255,255,0.9)`
        ctx.fillText('O', o.x, o.y)
        o.y -= o.speed; o.x += o.drift
        if (o.y < -20) oLetters.splice(i, 1)
      })
      animId = requestAnimationFrame(draw)
    }

    resize()
    for (let i = 0; i < N; i++) dots.push(makeDot(true))
    draw()
    scheduleO()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      clearTimeout(oTimer)
    }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Space+Mono:wght@400;700&display=swap');
        .ep { background:#060608; min-height:100vh; font-family:'Space Mono',monospace; color:#c8d0d8; overflow-x:hidden; position:relative; }
        .ep::before { content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image:linear-gradient(rgba(0,255,136,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,.025) 1px,transparent 1px);
          background-size:44px 44px; }
        .ep::after { content:''; position:fixed; inset:0; z-index:9998; pointer-events:none;
          background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.07) 2px,rgba(0,0,0,.07) 4px); }
        .ep-orb { position:fixed; border-radius:50%; pointer-events:none; z-index:0; filter:blur(80px); opacity:.13; }
        .ep-orb-tl { width:380px; height:380px; top:-120px; left:-120px; background:#00ff88; }
        .ep-orb-br { width:420px; height:420px; bottom:-140px; right:-140px; background:#ffd700; }
        .ep-bkt { position:fixed; width:36px; height:36px; z-index:2; pointer-events:none; }
        .ep-bkt-tl { top:14px; left:14px; border-top:2px solid #00ff88; border-left:2px solid #00ff88; }
        .ep-bkt-br { bottom:14px; right:14px; border-bottom:2px solid #ffd700; border-right:2px solid #ffd700; }
        .ep-wrap { position:relative; z-index:3; max-width:860px; margin:0 auto; padding:0 24px 80px; }
        /* Status */
        .ep-bar { display:flex; align-items:center; justify-content:space-between; padding:10px 0;
          border-bottom:1px solid rgba(0,255,136,.12); font-family:'Share Tech Mono',monospace; font-size:11px;
          color:rgba(255,255,255,.4); letter-spacing:.08em; position:sticky; top:0; z-index:100;
          background:rgba(6,6,8,.92); backdrop-filter:blur(8px); }
        .ep-bar-l { display:flex; align-items:center; gap:8px; }
        .ep-bar-r { display:flex; align-items:center; gap:14px; }
        .ep-dot { width:7px; height:7px; border-radius:50%; background:#ff3b3b; animation:ep-pulse 1.4s ease-in-out infinite; }
        @keyframes ep-pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,59,59,.6)} 50%{opacity:.6;box-shadow:0 0 0 5px rgba(255,59,59,0)} }
        .ep-sig { display:flex; align-items:flex-end; gap:2px; height:12px; }
        .ep-sig span { display:block; width:3px; background:#00ff88; border-radius:1px; }
        .ep-sig span:nth-child(1){height:4px;opacity:.5} .ep-sig span:nth-child(2){height:7px;opacity:.7}
        .ep-sig span:nth-child(3){height:10px;opacity:.9} .ep-sig span:nth-child(4){height:13px}
        .ep-ltog { display:flex; align-items:center; gap:4px; }
        .ep-lbtn { font-family:'Share Tech Mono',monospace; font-size:10px; padding:2px 7px; border-radius:3px;
          cursor:pointer; border:1px solid transparent; letter-spacing:.1em; transition:all .2s;
          background:transparent; color:rgba(255,255,255,.25); }
        .ep-lbtn.on { color:#00ff88; border-color:rgba(0,255,136,.5); text-shadow:0 0 8px #00ff88; box-shadow:0 0 8px rgba(0,255,136,.15); }
        /* Sections */
        .ep-s { opacity:0; transform:translateY(22px); animation:ep-up .7s ease forwards; }
        .ep-s:nth-child(1){animation-delay:.1s} .ep-s:nth-child(2){animation-delay:.25s}
        .ep-s:nth-child(3){animation-delay:.4s}  .ep-s:nth-child(4){animation-delay:.55s}
        .ep-s:nth-child(5){animation-delay:.7s}  .ep-s:nth-child(6){animation-delay:.85s}
        .ep-s:nth-child(7){animation-delay:1s}
        @keyframes ep-up { to{opacity:1;transform:none} }
        /* Header */
        .ep-head { text-align:center; padding:54px 0 12px; }
        .ep-brow { font-family:'Share Tech Mono',monospace; font-size:12px; color:rgba(255,255,255,.35); letter-spacing:.15em; margin-bottom:20px; }
        .ep-euro { font-family:'Bebas Neue',sans-serif; font-size:clamp(100px,22vw,180px); line-height:.9; color:#00ff88;
          text-shadow:0 0 30px rgba(0,255,136,.35),0 0 80px rgba(0,255,136,.1); letter-spacing:.04em; }
        .ep-puz { font-family:'Bebas Neue',sans-serif; font-size:clamp(100px,22vw,180px); line-height:.9;
          color:transparent; -webkit-text-stroke:2px rgba(255,255,255,.55); letter-spacing:.04em; animation:ep-glitch 6s infinite; }
        @keyframes ep-glitch {
          0%,88%,100%{text-shadow:none;transform:none;-webkit-text-stroke:2px rgba(255,255,255,.55)}
          89%{text-shadow:-4px 0 #ff0033,4px 0 #00ffee;transform:skew(-1.5deg)}
          90%{text-shadow:4px 0 #ff0033,-4px 0 #00ffee;transform:skew(1.5deg);-webkit-text-stroke:2px rgba(255,0,51,.7)}
          91%{text-shadow:-3px 0 #ff0033,3px 0 #00ffee;transform:none}
          92%{text-shadow:none;-webkit-text-stroke:2px rgba(255,255,255,.55)} }
        /* Lore */
        .ep-lore { margin:52px 0 48px; border-left:3px solid #ffd700; padding:22px 26px; background:rgba(255,215,0,.04); }
        .ep-llbl { font-family:'Share Tech Mono',monospace; font-size:11px; color:#ffd700; letter-spacing:.18em; margin-bottom:14px; opacity:.7; }
        .ep-ltxt { font-size:14px; line-height:1.9; color:rgba(255,255,255,.65); }
        .ep-ltxt .hi { color:#ffd700; font-weight:700; }
        /* Rules */
        .ep-rlbl { font-family:'Share Tech Mono',monospace; font-size:11px; color:rgba(255,255,255,.3); letter-spacing:.18em; margin-bottom:22px; text-align:center; }
        .ep-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:600px){.ep-grid{grid-template-columns:1fr}}
        .ep-card { background:#0c0d12; border:1px solid rgba(255,255,255,.07); border-radius:4px; padding:24px 22px 22px;
          position:relative; overflow:hidden; transition:border-color .3s,transform .3s; }
        .ep-card:hover{border-color:rgba(0,255,136,.35);transform:translateY(-3px)}
        .ep-card::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:2px;
          background:linear-gradient(90deg,transparent,#00ff88,transparent);transition:left .5s ease}
        .ep-card:hover::before{left:100%}
        .ep-cn{font-family:'Bebas Neue',sans-serif;font-size:68px;color:rgba(255,255,255,.04);line-height:1;position:absolute;top:8px;right:14px;user-select:none}
        .ep-ct{font-family:'Share Tech Mono',monospace;font-size:13px;color:#00ff88;letter-spacing:.1em;margin-bottom:10px}
        .ep-cd{font-size:12px;line-height:1.8;color:rgba(255,255,255,.5)}
        .rx{background:#111;color:#111;border-radius:1px;padding:0 4px;user-select:none;letter-spacing:normal}
        .rx-outer{user-select:text!important;-webkit-user-select:text!important;-moz-user-select:text!important}
        /* Prize */
        .ep-prize{margin:48px 0;border-top:2px solid #ffd700;background:rgba(255,215,0,.05);padding:26px 30px;
          display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
        .ep-plbl{font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,215,0,.55);letter-spacing:.18em;margin-bottom:4px}
        .ep-pamt{font-family:'Bebas Neue',sans-serif;font-size:72px;line-height:1;color:#ffd700;
          text-shadow:0 0 20px rgba(255,215,0,.4),0 0 60px rgba(255,215,0,.12)}
        .ep-prt{max-width:300px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,255,255,.3);line-height:1.85;text-align:right}
        @media(max-width:600px){.ep-prt{text-align:left}}
        /* Stars */
        .ep-stars{text-align:center;font-size:18px;letter-spacing:10px;color:rgba(255,215,0,.45);margin:40px 0 44px}
        .ep-stars span{animation:ep-twink 2.5s ease-in-out infinite}
        .ep-stars span:nth-child(odd){animation-delay:0s} .ep-stars span:nth-child(even){animation-delay:1.25s}
        @keyframes ep-twink{0%,100%{opacity:.4;text-shadow:none}50%{opacity:1;text-shadow:0 0 10px #ffd700}}
        /* Start */
        .ep-sw{text-align:center;margin:10px 0 48px}
        .ep-btn{display:inline-block;position:relative;overflow:hidden;font-family:'Bebas Neue',sans-serif;font-size:32px;
          letter-spacing:.2em;color:#060608;background:#00ff88;padding:18px 72px;border:none;border-radius:3px;cursor:pointer;
          transition:transform .25s,box-shadow .25s;box-shadow:0 0 24px rgba(0,255,136,.35),0 0 60px rgba(0,255,136,.12)}
        .ep-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);transition:left .45s ease}
        .ep-btn:hover{transform:translateY(-4px);box-shadow:0 0 40px rgba(0,255,136,.6),0 0 100px rgba(0,255,136,.2)}
        .ep-btn:hover::after{left:160%}
        .ep-sub{margin-top:14px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,255,255,.2);letter-spacing:.12em}
        .ep-err{
          margin-top:14px;font-family:'Share Tech Mono',monospace;font-size:12px;
          letter-spacing:.08em;animation:ep-fadein .2s ease both;
          min-height:18px;
        }
        @keyframes ep-fadein{from{opacity:0}to{opacity:1}}
        .ep-err-red{color:#ff2d55}
        .ep-err-white{color:rgba(255,255,255,.35)}
        .ep-flash-e{
          position:fixed;top:20px;right:28px;z-index:9999;
          font-family:'Bebas Neue',sans-serif;font-size:120px;line-height:1;
          color:#fff;pointer-events:none;user-select:none;
          text-shadow:0 0 40px rgba(255,255,255,.6);
        }
        .ep-fl{color:#00ff88;opacity:.6;text-decoration:none;transition:opacity .2s} .ep-fl:hover{opacity:1}
        .hidden-letter{color:transparent;user-select:text;font-size:0px;position:relative}
      `}</style>

      <div className="ep">
        <PuzzleChat room="euro-puzzle" />
        <div className="ep-orb ep-orb-tl" />
        <div className="ep-orb ep-orb-br" />
        <div className="ep-bkt ep-bkt-tl" />
        <div className="ep-bkt ep-bkt-br" />
        <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

        <div className="ep-wrap">

          {/* Status bar */}
          <div className="ep-bar">
            <div className="ep-bar-l">
              <div className="ep-dot" />
              <span>EUROIMBA.COM / EURO_PUZZLE</span>
            </div>
            <div className="ep-bar-r">
              <div className="ep-sig"><span /><span /><span /><span /></div>
              <div className="ep-ltog">
                <button className={`ep-lbtn${lang === 'en' ? ' on' : ''}`} onClick={() => switchLang('en')}>EN</button>
                <button className={`ep-lbtn${lang === 'ru' ? ' on' : ''}`} onClick={() => switchLang('ru')}>RU</button>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="ep-head ep-s">
            <div className="ep-brow">{T.eyebrow}</div>
            <div className="ep-euro">EURO</div>
            <div className="ep-puz">PUZZLE</div>
          </div>

          {/* Lore */}
          <div className="ep-lore ep-s">
            <div className="ep-llbl">{T.lore_label}</div>
            <p className="ep-ltxt" dangerouslySetInnerHTML={{ __html: T.lore_text }} />
          </div>

          {/* Rules */}
          <div className="ep-s">
            <div className="ep-rlbl" dangerouslySetInnerHTML={{ __html: T.rules_label }} />
            <div className="ep-grid">
              <div className="ep-card"><div className="ep-cn">01</div><div className="ep-ct" dangerouslySetInnerHTML={{ __html: T.r1_title }} /><div className="ep-cd" dangerouslySetInnerHTML={{ __html: T.r1_desc }} /></div>
              <div className="ep-card"><div className="ep-cn">02</div><div className="ep-ct" dangerouslySetInnerHTML={{ __html: T.r2_title }} /><div className="ep-cd" dangerouslySetInnerHTML={{ __html: T.r2_desc }} /></div>
              <div className="ep-card"><div className="ep-cn">03</div><div className="ep-ct" dangerouslySetInnerHTML={{ __html: T.r3_title }} /><div className="ep-cd" dangerouslySetInnerHTML={{ __html: T.r3_desc }} /></div>
              <div className="ep-card"><div className="ep-cn">04</div><div className="ep-ct" dangerouslySetInnerHTML={{ __html: T.r4_title }} /><div className="ep-cd" dangerouslySetInnerHTML={{ __html: T.r4_desc }} /></div>
            </div>
          </div>

          {/* Prize */}
          <div className="ep-prize ep-s">
            <div>
              <div className="ep-plbl">{T.prize_label}</div>
              <div className="ep-pamt">$50</div>
            </div>
            <div className="ep-prt">{T.prize_desc}</div>
          </div>

          {/* Stars */}
          <div className="ep-stars ep-s">
            <span>★</span><span>✦</span><span>★</span><span>✦</span><span>★<span style={{ fontSize: '18px', color: '#060608', background: '#060608', userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text', letterSpacing: '-18px' } as React.CSSProperties}>U</span></span>
            <span>✦</span><span>★</span><span>✦</span><span>★</span><span>✦</span>
          </div>

          {/* Start */}
          <div className="ep-sw ep-s">
            <button className="ep-btn" onClick={handleStartClick}>{T.start_btn}</button>
            <div className="ep-sub">{T.start_sub}</div>
            {/* Visual error sequence */}
            {localClicks === 1 && <div key={1} className="ep-err ep-err-red">{T.err1}</div>}
            {localClicks === 2 && <div key={2} className="ep-err ep-err-red">{T.err2}</div>}
            {localClicks === 3 && <div key={3} className="ep-err ep-err-red">{T.err3}</div>}
            {localClicks === 4 && <div key={4} className="ep-err ep-err-white">{T.err4}</div>}
          </div>
          {/* Flash E on click 3 */}
          {showE && <div className="ep-flash-e">E</div>}

          {/* Back link */}
          <div className="ep-s" style={{ paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <Link href="/" className="ep-fl">← EUROIMBA.COM</Link>
          </div>

        </div>
      </div>
    </>
  )
}
