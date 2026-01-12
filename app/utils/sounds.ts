// A simple browser-based synthesizer for sound effects
export const playSound = (type: 'broadcast' | 'vote' | 'delete' | 'success') => {
  if (typeof window === 'undefined') return

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContext) return

  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime

  if (type === 'broadcast') {
    // High-pitched "Ding-Dong"
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1)
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1)
    osc.start(now)
    osc.stop(now + 1)
  } 
  else if (type === 'vote') {
    // Sharp "Pop"
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
    osc.start(now)
    osc.stop(now + 0.1)
  }
  else if (type === 'delete') {
    // Lower "Thud"
    osc.type = 'square'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    osc.start(now)
    osc.stop(now + 0.2)
  }
  else if (type === 'success') {
    // Happy major chord arpeggio
    const frequencies = [523.25, 659.25, 783.99] // C Major
    frequencies.forEach((freq, i) => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      
      osc2.type = 'sine'
      osc2.frequency.value = freq
      
      const startTime = now + (i * 0.1)
      gain2.gain.setValueAtTime(0, startTime)
      gain2.gain.linearRampToValueAtTime(0.2, startTime + 0.05)
      gain2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5)
      
      osc2.start(startTime)
      osc2.stop(startTime + 0.5)
    })
  }
}