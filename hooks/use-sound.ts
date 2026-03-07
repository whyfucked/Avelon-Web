let lastSoundTime = 0
const SOUND_DEBOUNCE = 300

export function playSound(type: 'success' | 'error' | 'info' | 'click') {
  if (typeof window === 'undefined') return
  
  const now = Date.now()
  if (now - lastSoundTime < SOUND_DEBOUNCE) {
    return
  }
  lastSoundTime = now
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    switch (type) {
      case 'success':
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.08)
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.2)
        break
        
      case 'error':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.08)
        oscillator.type = 'square'
        gainNode.gain.setValueAtTime(0.06, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.15)
        break
        
      case 'info':
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.06, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
        break
        
      case 'click':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.04, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.03)
        break
    }
    
    setTimeout(() => {
      audioContext.close()
    }, 500)
  } catch (e) {
  }
}
