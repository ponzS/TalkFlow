// src/sounds/sounds.ts

class SoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {}

  constructor() {
    this.loadSound('click1', new Audio(import.meta.env.BASE_URL + './audio/bell.mp3'))
    this.loadSound('click2', new Audio(import.meta.env.BASE_URL + './audio/button.mp3'))
    this.loadSound('click3', new Audio(import.meta.env.BASE_URL + './audio/pen.mp3'))
    this.loadSound('click4', new Audio(import.meta.env.BASE_URL + './audio/safe.mp3'))
    this.loadSound('click5', new Audio(import.meta.env.BASE_URL + './audio/tick.mp3'))
    this.loadSound('click6', new Audio(import.meta.env.BASE_URL + './audio/wind.mp3'))
  }

  private loadSound(name: string, audio: HTMLAudioElement) {
    this.sounds[name] = audio
  }

  public play(name: string) {
    const sound = this.sounds[name]
    if (sound) {
      sound.currentTime = 0 // 重新播放
      sound.play()
    } else {
      console.warn(`声音 "${name}" 未找到！`)
    }
  }

  public stop(name: string) {
    const sound = this.sounds[name]
    if (sound) {
      sound.pause()
      sound.currentTime = 0
    }
  }

}

const soundManager = new SoundManager()
export default soundManager
