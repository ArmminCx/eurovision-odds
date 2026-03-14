'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/context/LanguageContext'
import PuzzleChat from '@/app/components/PuzzleChat'
import { createClient } from '@/app/utils/supabase/client'
import { User } from '@supabase/supabase-js'

const CORRECT = '607'

const T = {
  en: {
    label: '// Inger is waiting for your answer',
    placeholder: 'Enter the sum...',
    submit: 'SUBMIT',
    transcript_btn: 'READ TRANSCRIPT',
    transcript_title: '// Transmission — Inger',
    wrong: 'Incorrect. Inger is not impressed.',
    success: 'Signal accepted. Proceeding to next transmission.',
    close: '✕',
    lang_divider: '— Russian translation below —',
  },
  ru: {
    label: '// Ингер ждёт твоего ответа',
    placeholder: 'Введи сумму...',
    submit: 'ОТПРАВИТЬ',
    transcript_btn: 'ЧИТАТЬ ТЕКСТ',
    transcript_title: '// Трансляция — Ингер',
    wrong: 'Неверно. Ингер недоволен.',
    success: 'Сигнал принят. Переход к следующей передаче.',
    close: '✕',
    lang_divider: '— перевод на русский ниже —',
  },
}

const TRANSCRIPT_EN = `Did you really think it would be that easy? You found a signal. That does not make you special.

Let me tell you something about myself. My name is Inger. I have lived in Moscow my entire life. I have never left Russia. Not once. I dream of Paris. I think about Belgrade sometimes too. But dreams are cheap and tickets are expensive.

I support Real Madrid. Always have. In school they tried to break me — pressure me, bully me into supporting Zenit. I refused. Every single time. Ronaldo was everything I looked up to. You do not abandon that.

In school, aside from the bullying, there was one thing I was genuinely good at. Mathematics. Not because I was told to be. Because I loved it. I loved the idea that no matter how complicated things seemed, numbers always had a final answer. You combine them, you work through them, and at the end there is one single truth. One total. That never changes. I have carried that with me ever since.

On Sundays I watch Smeshariki. It has been a family tradition for as long as I can remember. Some things you do not question.

Every night when I was young my mother would sit beside my bed and tell me stories. Fairytales mostly. I never knew whether to believe in them or not. Part of me still does not. But one night standing in that crowd... for the first time in my life a fairytale felt real.

My mother never missed a single performance that week. She dragged me to every event she could. I remember her crying during one performance in particular. I asked her why. She said — because that word, that one word she kept singing, is the most important word in any language. I did not fully understand it then. I think I do now.

There was one act that week that nobody talked about before it happened. No expectations. No hype. They came from somewhere quiet across the water and they just... wandered onto that stage. Classical but not classical. I have never forgotten them. Most people have. I have not.

I was standing in my own city the night the world came to me. I felt something I had never felt before. Something changed in me. I became obsessed. I studied every contest, every score, every country, every song going all the way back to the very first one.

And then I built something. A module. A cipher. A system that lives deep within the Eurovision archive. It has been running for years. And nobody has ever come close to breaking it.

Until now. Until you.

You may try to break it. But let me be honest with you — you would be wise to give up here. What comes next is not for casual fans. This is for those who truly know Eurovision.

Prove it.`

const TRANSCRIPT_RU = `Ты правда думал, что всё будет так просто? Ты нашёл сигнал. Это не делает тебя особенным.

Позволь рассказать тебе кое-что о себе. Меня зовут Ингер. Я прожил всю жизнь в Москве. Я никогда не покидал Россию. Ни разу. Я мечтаю о Париже. Иногда думаю о Белграде. Но мечты дёшевы, а билеты дороги.

Я болею за Реал Мадрид. Всегда. В школе меня пытались сломить — давили, травили, чтобы я болел за Зенит. Я отказывался. Каждый раз. Роналду был всем, на кого я равнялся. Такое не предают.

В школе, помимо травли, было кое-что, в чём я был действительно хорош. Математика. Не потому что меня заставляли. Потому что я любил её. Мне нравилась идея, что как бы ни были сложны вещи, у чисел всегда есть конечный ответ. Ты складываешь, работаешь с ними — и в конце есть одна истина. Одна сумма. Это не меняется. Я несу это с собой с тех самых пор.

По воскресеньям я смотрю Смешариков. Это семейная традиция, сколько я себя помню. Некоторые вещи не подвергаются сомнению.

Каждый вечер в детстве мама садилась рядом со мной и рассказывала истории. В основном сказки. Я никогда не знал — верить им или нет. Часть меня до сих пор не знает. Но однажды ночью, стоя в той толпе... впервые в жизни сказка почувствовалась настоящей.

Мама не пропустила ни одного выступления той недели. Она тащила меня на каждое мероприятие, на которое могла. Помню, как она плакала во время одного выступления. Я спросил, почему. Она сказала — потому что это слово, то единственное слово, которое она пела, — самое важное слово в любом языке. Тогда я не до конца понял. Кажется, теперь понимаю.

Был один номер той недели, о котором никто не говорил заранее. Никаких ожиданий. Никакого ажиотажа. Они пришли из где-то тихого, по ту сторону воды, и просто... вышли на сцену. Классика, но не классика. Я никогда их не забывал. Большинство людей забыли. Я — нет.

Я стоял в своём городе той ночью, когда мир пришёл ко мне. Я почувствовал то, чего никогда раньше не чувствовал. Что-то изменилось во мне. Я стал одержим. Я изучил каждый конкурс, каждый результат, каждую страну, каждую песню — начиная с самого первого.

А потом я создал кое-что. Модуль. Шифр. Систему, которая живёт глубоко в архивах Евровидения. Она работает годами. И никто никогда не был близок к тому, чтобы взломать её.

До сих пор. До тебя.

Ты можешь попытаться взломать её. Но буду с тобой честен — тебе мудрее было бы остановиться здесь. То, что ждёт дальше, не для случайных фанатов. Это для тех, кто действительно знает Евровидение.

Докажи это.`

export default function TransmissionPage() {
  const router = useRouter()
  const { lang, toggleLanguage } = useLanguage()
  const tx = T[lang as keyof typeof T] ?? T.en
  const isEn = lang === 'en'

  const v1 = useRef<HTMLVideoElement>(null)
  const v2 = useRef<HTMLVideoElement>(null)

  const [phase, setPhase] = useState<'v1' | 'v2'>('v1')
  const [showOverlay, setShowOverlay] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)

  const [answer, setAnswer] = useState('')
  const [wrongMsg, setWrongMsg] = useState(false)
  const [shake, setShake] = useState(false)
  const [flashGreen, setFlashGreen] = useState(false)
  const [flashRed, setFlashRed] = useState(false)
  const [success, setSuccess] = useState(false)

  // Start video1 on mount + fetch user
  useEffect(() => {
    const vid = v1.current
    if (!vid) return
    vid.volume = 1
    vid.play().catch(() => setBlocked(true))
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUser(user) })
  }, [])

  function handleClickUnblock() {
    if (!blocked) return
    const vid = phase === 'v1' ? v1.current : v2.current
    vid?.play().catch(() => { })
    setBlocked(false)
  }

  function handleVideo1End() {
    const v1el = v1.current
    const v2el = v2.current
    if (!v1el || !v2el) return
    // Stop v1 audio immediately
    v1el.pause()
    v1el.currentTime = v1el.duration || 0
    // Seamless cut: hide v1, show & play v2
    v1el.style.opacity = '0'
    v2el.style.opacity = '1'
    v2el.volume = 0.4
    v2el.loop = true
    v2el.play().catch(() => { })
    setPhase('v2')
    setTimeout(() => setShowOverlay(true), 600)
  }

  async function handleSubmit() {
    if (success) return
    if (answer.trim() === CORRECT) {
      setFlashGreen(true)
      setSuccess(true)
      setWrongMsg(false)
      setTimeout(() => setFlashGreen(false), 500)
      // Bot announcement + level up
      if (user) {
        const username = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.email?.split('@')[0]
          || 'Someone'
        await Promise.all([
          supabase.from('puzzle_chat').insert({
            user_id: user.id,
            username: 'SYSTEM',
            avatar_url: null,
            message: `🔔 ${username} cracked Inger's cipher! They are moving to the next transmission.`,
            room: 'all',
            is_bot: true,
          }),
          supabase.from('puzzle_interactions').upsert({
            user_id: user.id,
            transmission_1_solved: true,
          }, { onConflict: 'user_id' }),
        ])
      }
      setTimeout(() => router.push('/transmission-2'), 3000)
    } else {
      setFlashRed(true)
      setShake(true)
      setWrongMsg(true)
      setTimeout(() => setFlashRed(false), 450)
      setTimeout(() => setShake(false), 500)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <>
      {phase === 'v2' && <PuzzleChat room="transmission-1" />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #000; overflow: hidden; }

        /* Lang toggle */
        .tx-lang { position: fixed; top: 14px; right: 20px; z-index: 9999;
          display: flex; gap: 6px; align-items: center; }
        .tx-lbtn { font-family: 'Share Tech Mono', monospace; font-size: 10px;
          padding: 2px 8px; border-radius: 3px; cursor: pointer;
          border: 1px solid transparent; letter-spacing: .1em;
          background: transparent; color: rgba(255,255,255,.2); transition: all .2s; }
        .tx-lbtn.on { color: #00ff88; border-color: rgba(0,255,136,.4);
          text-shadow: 0 0 8px #00ff88; }

        /* Overlay fade in */
        .tx-overlay {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          display: flex; flex-direction: column; align-items: center;
          padding: 24px 20px 32px;
          background: linear-gradient(to top, rgba(0,0,0,.85) 60%, transparent);
          opacity: 0; pointer-events: none;
          transition: opacity .8s ease;
        }
        .tx-overlay.visible { opacity: 1; pointer-events: auto; }

        .tx-label {
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
          color: rgba(0,255,136,.5); letter-spacing: .15em; margin-bottom: 12px;
        }
        .tx-row { display: flex; gap: 8px; align-items: center; width: 100%; max-width: 520px; }
        .tx-input {
          flex: 1; background: #000; border: 1px solid rgba(0,255,136,.4);
          border-radius: 3px; padding: 10px 14px;
          font-family: 'Share Tech Mono', monospace; font-size: 14px;
          color: #00ff88; outline: none; caret-color: #00ff88;
          transition: border-color .2s;
        }
        .tx-input::placeholder { color: rgba(0,255,136,.25); }
        .tx-input:focus { border-color: #00ff88; }
        .tx-submit {
          background: #00ff88; color: #000; border: none; border-radius: 3px;
          padding: 10px 18px; font-family: 'Share Tech Mono', monospace;
          font-size: 12px; letter-spacing: .12em; cursor: pointer;
          font-weight: 700; white-space: nowrap; transition: opacity .2s;
        }
        .tx-submit:hover { opacity: .85; }
        .tx-transcript-btn {
          background: transparent; color: rgba(255,255,255,.6);
          border: 1px solid rgba(255,255,255,.25); border-radius: 3px;
          padding: 10px 14px; font-family: 'Share Tech Mono', monospace;
          font-size: 11px; letter-spacing: .1em; cursor: pointer;
          white-space: nowrap; transition: all .2s;
        }
        .tx-transcript-btn:hover { color: #fff; border-color: rgba(255,255,255,.6); }
        .tx-wrong {
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
          color: #ff2d55; letter-spacing: .08em; margin-top: 10px;
          text-align: center;
        }
        .tx-success {
          font-family: 'Share Tech Mono', monospace; font-size: 13px;
          color: #00ff88; letter-spacing: .1em; margin-top: 10px;
          text-align: center; animation: tx-flicker 1s infinite;
        }
        @keyframes tx-flicker {
          0%,100%{opacity:1} 50%{opacity:.6}
        }
        @keyframes tx-shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)} 60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
        .tx-input.shake { animation: tx-shake .4s ease; }

        /* Flash overlays */
        .tx-flash {
          position: fixed; inset: 0; z-index: 9998; pointer-events: none;
          opacity: 0; transition: opacity .1s;
        }
        .tx-flash.green { background: rgba(0,255,136,.25); opacity: 1; }
        .tx-flash.red   { background: rgba(255,45,85,.25); opacity: 1; }

        /* Blocked hint */
        @keyframes tx-pulse { 0%,100%{opacity:.12} 50%{opacity:.4} }
        .tx-blocked-dot {
          position: fixed; inset: 0; z-index: 200;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .tx-blocked-dot div {
          width: 8px; height: 8px; border-radius: 50%; background: #fff;
          animation: tx-pulse 2s ease-in-out infinite;
        }

        /* Modal */
        .tx-modal-bg {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,.88); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .tx-modal {
          width: 100%; max-width: 680px; max-height: 82vh;
          background: #0a0a0a; border: 1px solid rgba(255,255,255,.12);
          border-radius: 4px; display: flex; flex-direction: column;
          overflow: hidden;
        }
        .tx-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,.08);
          flex-shrink: 0;
        }
        .tx-modal-title {
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
          color: #00ff88; letter-spacing: .18em;
        }
        .tx-modal-close {
          background: transparent; border: none; color: rgba(255,255,255,.4);
          font-size: 16px; cursor: pointer; padding: 2px 6px;
          transition: color .2s;
        }
        .tx-modal-close:hover { color: #fff; }
        .tx-modal-body {
          flex: 1; overflow-y: auto; padding: 24px 24px 32px;
          scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.1) transparent;
        }
        .tx-modal-body::-webkit-scrollbar { width: 4px; }
        .tx-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
        .tx-transcript {
          font-family: 'Share Tech Mono', monospace; font-size: 12.5px;
          color: rgba(255,255,255,.75); line-height: 2; white-space: pre-wrap;
        }
        .tx-divider {
          border: none; border-top: 1px solid rgba(255,255,255,.08);
          margin: 28px 0; text-align: center;
        }
        .tx-divider-label {
          font-family: 'Share Tech Mono', monospace; font-size: 10px;
          color: rgba(255,255,255,.2); letter-spacing: .15em;
          text-align: center; margin-bottom: 20px;
        }
      `}</style>

      {/* Skip button — only during video1 */}
      {phase === 'v1' && (
        <button
          onClick={handleVideo1End}
          style={{
            position: 'fixed', top: 16, left: 20, zIndex: 9999,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.18)',
            color: 'rgba(255,255,255,.35)',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11, letterSpacing: '.15em',
            padding: '4px 12px', borderRadius: 3,
            cursor: 'pointer', transition: 'color .2s, border-color .2s',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,.8)'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.5)' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,.35)'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.18)' }}
        >
          SKIP ›
        </button>
      )}

      {/* Lang toggle */}
      <div className="tx-lang">
        <button className={`tx-lbtn${lang === 'en' ? ' on' : ''}`} onClick={() => { if (lang !== 'en') toggleLanguage() }}>EN</button>
        <button className={`tx-lbtn${lang === 'ru' ? ' on' : ''}`} onClick={() => { if (lang !== 'ru') toggleLanguage() }}>RU</button>
      </div>

      {/* Flash overlays */}
      <div className={`tx-flash green${flashGreen ? '' : ' hidden'}`} style={{ opacity: flashGreen ? 1 : 0 }} />
      <div className={`tx-flash red${flashRed ? '' : ' hidden'}`} style={{ opacity: flashRed ? 1 : 0 }} />

      {/* Click-to-unblock */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, cursor: blocked ? 'default' : 'none' }}
        onClick={handleClickUnblock}
      />
      {blocked && (
        <div className="tx-blocked-dot"><div /></div>
      )}

      {/* Video 1 */}
      <video
        ref={v1}
        src="https://lcphdyurnwmcusiedisq.supabase.co/storage/v1/object/public/videos/video1.mp4"
        playsInline
        preload="auto"
        onEnded={handleVideo1End}
        style={{
          position: 'fixed', inset: 0,
          width: '100vw', height: '100vh',
          objectFit: 'cover', display: 'block',
          opacity: phase === 'v1' ? 1 : 0,
          transition: 'opacity .05s',
          zIndex: 1,
        }}
      />

      {/* Video 2 — preloaded, hidden until v1 ends */}
      <video
        ref={v2}
        src="https://lcphdyurnwmcusiedisq.supabase.co/storage/v1/object/public/videos/video2.mp4"
        playsInline
        preload="auto"
        style={{
          position: 'fixed', inset: 0,
          width: '100vw', height: '100vh',
          objectFit: 'cover', display: 'block',
          opacity: phase === 'v2' ? 1 : 0,
          transition: 'opacity .05s',
          zIndex: 1,
        }}
      />

      {/* Input overlay — fades in after v1 ends */}
      <div className={`tx-overlay${showOverlay ? ' visible' : ''}`} style={{ zIndex: 200 }}>
        <div className="tx-label">{tx.label}</div>
        <div className="tx-row">
          <input
            className={`tx-input${shake ? ' shake' : ''}`}
            value={answer}
            onChange={e => { setAnswer(e.target.value); setWrongMsg(false) }}
            onKeyDown={handleKey}
            placeholder={tx.placeholder}
            disabled={success}
            autoComplete="off"
          />
          <button className="tx-submit" onClick={handleSubmit} disabled={success}>
            {tx.submit}
          </button>
          <button className="tx-transcript-btn" onClick={() => setShowModal(true)}>
            {tx.transcript_btn}
          </button>
        </div>
        {wrongMsg && !success && (
          <div className="tx-wrong">{tx.wrong}</div>
        )}
        {success && (
          <div className="tx-success">{tx.success}</div>
        )}
      </div>

      {/* Transcript modal */}
      {showModal && (
        <div className="tx-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="tx-modal">
            <div className="tx-modal-header">
              <span className="tx-modal-title">{tx.transcript_title}</span>
              <button className="tx-modal-close" onClick={() => setShowModal(false)}>{tx.close}</button>
            </div>
            <div className="tx-modal-body">
              <div className="tx-transcript">{TRANSCRIPT_EN}</div>
              <div className="tx-divider-label" style={{ marginTop: 28 }}>{T.en.lang_divider}</div>
              <hr className="tx-divider" />
              <div className="tx-transcript">{TRANSCRIPT_RU}</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
