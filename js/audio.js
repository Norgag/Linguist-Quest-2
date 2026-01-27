class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    async playSound(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            const source = this.ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.ctx.destination);
            source.start(0);
        } catch (e) {
            console.error("Audio error", e);
        }
    }

    // Direct synthesis for simple arcade sounds if files fail
    beep(freq = 440, duration = 0.1, type = 'square') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}

export const audio = new AudioManager();