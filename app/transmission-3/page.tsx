'use client'

import { useLanguage } from '@/app/context/LanguageContext'
import PuzzleChat from '@/app/components/PuzzleChat'

export default function Transmission3Page() {
  const { lang, toggleLanguage } = useLanguage()
  const switchLang = (l: 'en' | 'ru') => { if (l !== lang) toggleLanguage() }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
        
        * { box-sizing: border-box; }
        
        /* OVERALL ATMOSPHERE */
        .t3-bg {
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(0,255,136,0.1) 0%, rgba(0,0,0,1) 70%);
        }
        .scanlines {
          position: fixed; inset: 0; z-index: 100; pointer-events: none;
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
          background-size: 100% 4px;
        }

        /* HEADER TOGGLE */
        .t3-lang { position: fixed; top: 20px; right: 20px; z-index: 50; display: flex; gap: 8px; }
        .t3-lbtn { font-family: 'Share Tech Mono', monospace; font-size: 12px; padding: 4px 10px;
          border-radius: 4px; cursor: pointer; border: 1px solid transparent; letter-spacing: 0.15em;
          background: transparent; color: rgba(255,255,255,0.3); transition: all 0.2s; }
        .t3-lbtn.on { color: #00ff88; border-color: rgba(0,255,136,0.4); text-shadow: 0 0 10px #00ff88; }
        
        /* CONTENT CONTAINER */
        .finale-container {
          position: relative; z-index: 10;
          border: 1px solid rgba(0, 255, 136, 0.3);
          background: rgba(0, 20, 10, 0.6);
          padding: 60px 80px;
          border-radius: 8px;
          box-shadow: 0 0 40px rgba(0, 255, 136, 0.1), inset 0 0 30px rgba(0, 255, 136, 0.1);
          text-align: center;
          max-width: 800px;
          width: 90%;
        }

        .finale-title {
          color: #00ff88;
          font-family: 'VT323', monospace;
          font-size: 64px;
          margin-bottom: 30px;
          text-shadow: 0 0 20px rgba(0, 255, 136, 0.8), 0 0 40px rgba(0, 255, 136, 0.4);
          animation: textGlitch 4s infinite;
          letter-spacing: 0.05em;
          line-height: 1.1;
        }

        .finale-subtitle {
          color: rgba(0, 255, 136, 0.8);
          font-family: 'Share Tech Mono', monospace;
          font-size: 20px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 40px;
          border-bottom: 1px solid rgba(0, 255, 136, 0.3);
          padding-bottom: 20px;
          display: inline-block;
        }

        .finale-text {
          color: rgba(255, 255, 255, 0.7);
          font-family: 'Share Tech Mono', monospace;
          font-size: 16px;
          line-height: 1.8;
          max-width: 600px;
          margin: 0 auto;
        }

        .finale-text p {
          margin-bottom: 20px;
        }

        .typing-effect {
          overflow: hidden;
          white-space: pre-wrap;
          border-right: 2px solid #00ff88;
          animation: blink 1s step-end infinite;
        }

        @keyframes textGlitch {
          0%, 100% { transform: translate(0); text-shadow: 0 0 20px rgba(0, 255, 136, 0.8); }
          2% { transform: translate(-2px, 1px); text-shadow: -2px 0 #ff00ea, 2px 2px #00ff88; }
          4% { transform: translate(2px, -1px); text-shadow: 2px 0 #00ffff, -2px -2px #00ff88; }
          6% { transform: translate(0); text-shadow: 0 0 20px rgba(0, 255, 136, 0.8); }
        }

        @keyframes blink {
          0%, 100% { border-color: transparent; }
          50% { border-color: #00ff88; }
        }
      `}</style>
      
      <div className="t3-bg" />
      <div className="scanlines" />

      {/* Language Toggle */}
      <div className="t3-lang">
        <button className={`t3-lbtn ${lang === 'en' ? 'on' : ''}`} onClick={() => switchLang('en')}>EN</button>
        <button className={`t3-lbtn ${lang === 'ru' ? 'on' : ''}`} onClick={() => switchLang('ru')}>RU</button>
      </div>

      <PuzzleChat />

      <div className="finale-container">
        <div className="finale-subtitle">
          {lang === 'en' ? '// OVERRIDE ACCEPTED' : '// ПЕРЕОПРЕДЕЛЕНИЕ ПРИНЯТО'}
        </div>
        
        <h1 className="finale-title">
          {lang === 'en' ? 'CONGRATULATIONS' : 'ПОЗДРАВЛЯЕМ'}
        </h1>
        
        <div className="finale-text">
          {lang === 'en' ? (
            <>
              <p>You have successfully tracked the signal, bypassed the secondary security protocols, and cracked the final code.</p>
              <p className="typing-effect">There is nothing left to decode here. The transmission is complete.</p>
            </>
          ) : (
            <>
              <p>Вы успешно отследили сигнал, обошли вторичные протоколы безопасности и взломали окончательный код.</p>
              <p className="typing-effect">Здесь больше нечего расшифровывать. Передача завершена.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
