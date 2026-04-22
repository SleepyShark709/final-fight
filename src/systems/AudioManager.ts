/**
 * 音频管理器 — 基于 Web Audio API 的程序化 SFX 生成
 *
 * 设计原则：
 * - 零外部音频资源：全部使用 oscillator + noise 合成
 * - 单例模式：一个 AudioContext 复用所有声音
 * - 自动解锁：遵循浏览器策略，在首次用户交互后激活
 * - 音量控制：masterVolume、sfxVolume、bgmVolume 可独立调整
 */

/** SFX 参数定义 */
interface SfxDef {
    wave: OscillatorType;
    startFreq: number;
    endFreq: number;
    duration: number; // seconds
    volume: number;   // 0-1
    /** 叠加白噪声强度（0=无） */
    noise?: number;
    /** 谐波 freq 乘数（加一个第二 oscillator 增加层次） */
    harmonic?: number;
    /** 攻击/释放曲线 */
    attack?: number; // seconds
    release?: number; // seconds
}

export type SfxKey =
    | 'attack' | 'attack-heavy' | 'slash'
    | 'hit' | 'crit' | 'hit-heavy'
    | 'hurt' | 'death' | 'death-player'
    | 'jump' | 'land' | 'dash'
    | 'pickup' | 'coin' | 'heal'
    | 'ui-click' | 'ui-select' | 'ui-cancel'
    | 'explosion' | 'fire' | 'thunder' | 'ice'
    | 'boss-roar' | 'room-clear';

/** 预定义 SFX 库 */
const SFX: Record<SfxKey, SfxDef> = {
    // ===== 战斗攻击 =====
    attack:       { wave: 'sawtooth', startFreq: 260, endFreq: 110, duration: 0.10, volume: 0.18, noise: 0.15 },
    'attack-heavy': { wave: 'sawtooth', startFreq: 180, endFreq: 70,  duration: 0.18, volume: 0.28, noise: 0.25 },
    slash:        { wave: 'triangle', startFreq: 800, endFreq: 200, duration: 0.08, volume: 0.20, noise: 0.30 },

    // ===== 命中 =====
    hit:          { wave: 'square',   startFreq: 140, endFreq: 60,  duration: 0.08, volume: 0.30, noise: 0.40, harmonic: 0.5 },
    crit:         { wave: 'square',   startFreq: 420, endFreq: 80,  duration: 0.22, volume: 0.45, noise: 0.35, harmonic: 2.0 },
    'hit-heavy':  { wave: 'square',   startFreq: 90,  endFreq: 40,  duration: 0.14, volume: 0.40, noise: 0.45, harmonic: 0.33 },

    // ===== 受伤/死亡 =====
    hurt:         { wave: 'sawtooth', startFreq: 320, endFreq: 80,  duration: 0.18, volume: 0.30, noise: 0.20 },
    death:        { wave: 'sawtooth', startFreq: 400, endFreq: 40,  duration: 0.55, volume: 0.35, noise: 0.15, harmonic: 0.5 },
    'death-player': { wave: 'sawtooth', startFreq: 600, endFreq: 30, duration: 0.90, volume: 0.45, noise: 0.20, harmonic: 0.5 },

    // ===== 移动 =====
    jump:         { wave: 'sine',     startFreq: 320, endFreq: 560, duration: 0.10, volume: 0.15 },
    land:         { wave: 'square',   startFreq: 80,  endFreq: 40,  duration: 0.08, volume: 0.18, noise: 0.40 },
    dash:         { wave: 'sawtooth', startFreq: 900, endFreq: 200, duration: 0.16, volume: 0.22, noise: 0.35 },

    // ===== 收集 =====
    pickup:       { wave: 'triangle', startFreq: 500, endFreq: 1400, duration: 0.15, volume: 0.22 },
    coin:         { wave: 'triangle', startFreq: 880, endFreq: 1760, duration: 0.10, volume: 0.25 },
    heal:         { wave: 'sine',     startFreq: 440, endFreq: 880, duration: 0.30, volume: 0.28, harmonic: 1.5 },

    // ===== UI =====
    'ui-click':   { wave: 'square',   startFreq: 700, endFreq: 900, duration: 0.06, volume: 0.20 },
    'ui-select':  { wave: 'square',   startFreq: 600, endFreq: 900, duration: 0.10, volume: 0.25, harmonic: 1.5 },
    'ui-cancel':  { wave: 'square',   startFreq: 500, endFreq: 300, duration: 0.10, volume: 0.22 },

    // ===== 元素 / 大招 =====
    explosion:    { wave: 'sawtooth', startFreq: 180, endFreq: 30,  duration: 0.40, volume: 0.50, noise: 0.60 },
    fire:         { wave: 'sawtooth', startFreq: 200, endFreq: 100, duration: 0.20, volume: 0.25, noise: 0.50 },
    thunder:      { wave: 'square',   startFreq: 1200,endFreq: 400, duration: 0.15, volume: 0.30, noise: 0.30, harmonic: 0.5 },
    ice:          { wave: 'triangle', startFreq: 1600,endFreq: 800, duration: 0.25, volume: 0.22, harmonic: 1.5 },

    // ===== 事件 =====
    'boss-roar':  { wave: 'sawtooth', startFreq: 120, endFreq: 50,  duration: 1.20, volume: 0.45, noise: 0.30, harmonic: 0.5 },
    'room-clear': { wave: 'triangle', startFreq: 440, endFreq: 1320,duration: 0.45, volume: 0.35, harmonic: 2.0 },
};

export class AudioManager {
    private static instance: AudioManager | null = null;
    private ctx: AudioContext | null = null;
    private masterGain!: GainNode;
    private sfxGain!: GainNode;
    private bgmGain!: GainNode;

    private masterVolume: number = 0.7;
    private sfxVolume: number = 0.8;
    private bgmVolume: number = 0.5;

    private muted: boolean = false;

    // BGM 状态
    private currentBgm: string | null = null;
    private bgmNodes: { osc: OscillatorNode, gain: GainNode }[] = [];
    private bgmLoopTimer: number | null = null;

    // 降重叠：相同声音在极短时间内只触发一次
    private lastPlayedAt: Map<SfxKey, number> = new Map();
    private static readonly DEDUPE_MS = 20;

    private constructor() { }

    static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * 初始化（需在用户首次交互时调用，否则浏览器会阻止 AudioContext）
     */
    public init(): void {
        if (this.ctx) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new Ctx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = this.bgmVolume;
            this.bgmGain.connect(this.masterGain);

            console.log('[AudioManager] 初始化成功');
        } catch (e) {
            console.warn('[AudioManager] 初始化失败:', e);
        }
    }

    /**
     * 自动解锁：接入常见交互事件
     */
    public attachAutoUnlock(): void {
        const unlock = () => {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        };
        ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, unlock, { once: false, passive: true });
        });
    }

    public setMuted(v: boolean): void {
        this.muted = v;
        if (this.masterGain) {
            this.masterGain.gain.value = v ? 0 : this.masterVolume;
        }
    }

    public isMuted(): boolean {
        return this.muted;
    }

    public setMasterVolume(v: number): void {
        this.masterVolume = Math.max(0, Math.min(1, v));
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    /**
     * 播放 SFX
     * @param key SFX 名称
     * @param opts 覆盖参数：volume 音量倍率，pitch 音高倍率
     */
    public play(key: SfxKey, opts?: { volume?: number; pitch?: number; }): void {
        if (this.muted || !this.ctx) return;
        const def = SFX[key];
        if (!def) return;

        // 降重叠
        const now = this.ctx.currentTime * 1000;
        const last = this.lastPlayedAt.get(key) ?? -Infinity;
        if (now - last < AudioManager.DEDUPE_MS) return;
        this.lastPlayedAt.set(key, now);

        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const volMul = opts?.volume ?? 1;
        const pitchMul = opts?.pitch ?? 1;
        const volume = def.volume * volMul;
        const attack = def.attack ?? 0.005;
        const release = def.release ?? Math.max(0.02, def.duration * 0.3);
        const hold = Math.max(0.01, def.duration - attack - release);

        // 总 gain 包络
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(volume, t0 + attack);
        gain.gain.linearRampToValueAtTime(volume, t0 + attack + hold);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + def.duration + 0.01);
        gain.connect(this.sfxGain);

        // 主振荡器（频率滑动）
        const osc = ctx.createOscillator();
        osc.type = def.wave;
        osc.frequency.setValueAtTime(def.startFreq * pitchMul, t0);
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(0.01, def.endFreq * pitchMul),
            t0 + def.duration,
        );
        osc.connect(gain);
        osc.start(t0);
        osc.stop(t0 + def.duration + 0.02);

        // 谐波叠加（可选）
        if (def.harmonic) {
            const osc2 = ctx.createOscillator();
            osc2.type = def.wave;
            osc2.frequency.setValueAtTime(def.startFreq * pitchMul * def.harmonic, t0);
            osc2.frequency.exponentialRampToValueAtTime(
                Math.max(0.01, def.endFreq * pitchMul * def.harmonic),
                t0 + def.duration,
            );
            const g2 = ctx.createGain();
            g2.gain.value = 0.4;
            osc2.connect(g2);
            g2.connect(gain);
            osc2.start(t0);
            osc2.stop(t0 + def.duration + 0.02);
        }

        // 白噪声叠加（可选）
        if (def.noise && def.noise > 0) {
            const bufferSize = Math.ceil(ctx.sampleRate * def.duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1);
            }
            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = buffer;
            const noiseGain = ctx.createGain();
            noiseGain.gain.value = def.noise;
            noiseSource.connect(noiseGain);
            noiseGain.connect(gain);
            noiseSource.start(t0);
            noiseSource.stop(t0 + def.duration + 0.02);
        }
    }

    /**
     * 播放简易 BGM（基于音阶循环）
     * @param mood 'menu' | 'cavern' | 'lava' | 'boss' | 'hub' | 'win'
     */
    public playBgm(mood: 'menu' | 'cavern' | 'lava' | 'boss' | 'hub' | 'win'): void {
        if (!this.ctx) return;
        if (this.currentBgm === mood) return;
        this.stopBgm();
        this.currentBgm = mood;

        // 预设音阶与节拍
        const patterns = this.getBgmPattern(mood);
        this.scheduleBgm(patterns);
    }

    public stopBgm(): void {
        this.bgmNodes.forEach(({ osc, gain }) => {
            try {
                gain.gain.setValueAtTime(gain.gain.value, this.ctx!.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx!.currentTime + 0.3);
                osc.stop(this.ctx!.currentTime + 0.35);
            } catch { /* ignore */ }
        });
        this.bgmNodes = [];
        if (this.bgmLoopTimer) {
            clearTimeout(this.bgmLoopTimer);
            this.bgmLoopTimer = null;
        }
        this.currentBgm = null;
    }

    private getBgmPattern(mood: string): { notes: number[], tempo: number, wave: OscillatorType, bassNotes?: number[] } {
        // 音符 = MIDI note number（A4 = 69 = 440Hz）
        // Menu: 安静神秘 (A minor)
        // Hub: 温暖（F major）
        // Cavern: 阴森（D minor arpeggio）
        // Lava: 激昂（C minor 七和弦）
        // Boss: 紧张（半音阶下行）
        // Win: 凯旋
        const patterns: Record<string, { notes: number[], tempo: number, wave: OscillatorType, bassNotes?: number[] }> = {
            menu:   { notes: [57, 60, 64, 67, 64, 60], tempo: 480, wave: 'sine', bassNotes: [45, 45, 48, 48] },
            hub:    { notes: [65, 69, 72, 77, 72, 69], tempo: 420, wave: 'triangle', bassNotes: [53, 53, 57, 57] },
            cavern: { notes: [62, 65, 69, 74, 69, 65], tempo: 500, wave: 'sawtooth', bassNotes: [50, 50, 55, 55] },
            lava:   { notes: [60, 63, 67, 72, 70, 67], tempo: 300, wave: 'sawtooth', bassNotes: [48, 48, 53, 53] },
            boss:   { notes: [58, 57, 56, 55, 54, 53], tempo: 260, wave: 'sawtooth', bassNotes: [46, 46, 44, 44] },
            win:    { notes: [72, 76, 79, 84, 79, 84], tempo: 320, wave: 'triangle', bassNotes: [60, 60, 64, 64] },
        };
        return patterns[mood] ?? patterns.menu;
    }

    private scheduleBgm(pattern: { notes: number[], tempo: number, wave: OscillatorType, bassNotes?: number[] }): void {
        if (!this.ctx) return;
        const noteDur = pattern.tempo / 1000; // seconds
        const { notes, wave, bassNotes } = pattern;

        const playLoop = () => {
            if (!this.ctx || this.currentBgm === null) return;
            const t0 = this.ctx.currentTime;
            notes.forEach((midi, i) => {
                const freq = 440 * Math.pow(2, (midi - 69) / 12);
                const start = t0 + i * noteDur;
                const osc = this.ctx!.createOscillator();
                osc.type = wave;
                osc.frequency.value = freq;
                const g = this.ctx!.createGain();
                g.gain.setValueAtTime(0, start);
                g.gain.linearRampToValueAtTime(0.25, start + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, start + noteDur * 0.95);
                osc.connect(g);
                g.connect(this.bgmGain);
                osc.start(start);
                osc.stop(start + noteDur);
                this.bgmNodes.push({ osc, gain: g });
            });
            // 低音线
            if (bassNotes) {
                const bassDur = (notes.length * noteDur) / bassNotes.length;
                bassNotes.forEach((midi, i) => {
                    const freq = 440 * Math.pow(2, (midi - 69) / 12);
                    const start = t0 + i * bassDur;
                    const osc = this.ctx!.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    const g = this.ctx!.createGain();
                    g.gain.setValueAtTime(0, start);
                    g.gain.linearRampToValueAtTime(0.18, start + 0.03);
                    g.gain.exponentialRampToValueAtTime(0.0001, start + bassDur * 0.95);
                    osc.connect(g);
                    g.connect(this.bgmGain);
                    osc.start(start);
                    osc.stop(start + bassDur);
                    this.bgmNodes.push({ osc, gain: g });
                });
            }
            // 定时下一轮
            const totalMs = notes.length * pattern.tempo;
            this.bgmLoopTimer = window.setTimeout(playLoop, totalMs);
            // 清理旧节点
            setTimeout(() => {
                this.bgmNodes = this.bgmNodes.slice(-notes.length * 3);
            }, totalMs + 500);
        };

        playLoop();
    }
}

// 便捷导出单例
export const Audio = AudioManager.getInstance();
