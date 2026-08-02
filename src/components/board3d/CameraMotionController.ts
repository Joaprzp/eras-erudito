import { Vector3 } from 'three'

export class CameraMotionController {
  private holdElapsed = 0
  private phase: 'idle' | 'follow' | 'hold' | 'return' = 'idle'
  readonly target = new Vector3()

  get mode() {
    return this.phase
  }

  follow(position: Vector3) {
    this.target.copy(position)
    this.phase = 'follow'
  }

  track(position: Vector3) {
    this.target.copy(position)
  }

  land(position: Vector3) {
    this.target.copy(position)
    this.holdElapsed = 0
    this.phase = 'hold'
  }

  advance(delta: number) {
    if (this.phase !== 'hold') return
    this.holdElapsed += delta
    if (this.holdElapsed >= 0.32) this.phase = 'return'
  }

  reset() {
    this.holdElapsed = 0
    this.phase = 'idle'
    this.target.set(0, 0, 0)
  }
}
