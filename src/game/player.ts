import * as THREE from 'three';
import { convertPositionToIndex } from './convert';
import { PLAYER_RADIUS, UNIT } from './obj';
import { Game } from './game';
import { engine } from '../main';
import { v4 } from 'uuid';
import { BombState, equalIndex, type Index } from '../interface';
import type { GameSocket } from '../event';
import { getSocket } from '../socket';
import { Sound } from './controller/sound_controller';
import { FPS } from '../engine';

export type PlayerState =
  | 'Idle'
  | 'HoldingIdle'
  | 'Walking'
  | 'HoldingWalking'
  | 'Stun'
  | 'Dead'
  | 'Misobon';

export class Player {
  private animationMixer: THREE.AnimationMixer;
  private actions: Map<PlayerState, THREE.AnimationAction>;
  private currentAction: THREE.AnimationAction;
  private state: PlayerState;

  constructor(
    private object: THREE.Object3D,
    protected game: Game
  ) {
    this.animationMixer = new THREE.AnimationMixer(this.object);

    const anim = this.object.animations;

    const idle = this.animationMixer.clipAction(anim[5]);
    const holdingIdle = this.animationMixer.clipAction(anim[4]);
    const stun = this.animationMixer.clipAction(anim[1]);
    const walk = this.animationMixer.clipAction(anim[2]);
    const holdingWalk = this.animationMixer.clipAction(anim[0]);

    this.actions = new Map<PlayerState, THREE.AnimationAction>([
      ['Idle', idle],
      ['HoldingIdle', holdingIdle],
      ['Walking', walk],
      ['HoldingWalking', holdingWalk],
      ['Stun', stun],
      ['Dead', stun],
      ['Misobon', holdingIdle],
    ]);

    this.state = 'Idle';
    this.currentAction = idle;
    this.currentAction.play();
  }

  // remove from scene. object was managed by this class
  dispose() {
    this.animationMixer.stopAllAction();

    this.game.remove(this.object);
  }

  getState() {
    return this.state;
  }

  update(delta: number) {
    if (this.state == 'Dead') {
      const angle = this.object.rotation.y;
      const dir = new THREE.Vector3(Math.sin(angle), 3, Math.cos(angle));

      this.pos.add(dir.normalize().multiplyScalar(40 * delta * FPS));

      this.game.effectController.playDead(this.pos);
    }

    this.animationMixer.update(delta);
  }

  /// short hand for this.object.position
  get pos(): THREE.Vector3 {
    return this.object.position;
  }

  get index(): Index {
    return convertPositionToIndex(this.pos);
  }

  setState(state: PlayerState): boolean {
    if (state == this.state) {
      return false;
    }

    this.currentAction.stop();

    this.state = state;
    this.currentAction = this.actions.get(state)!;
    this.currentAction.reset();
    this.currentAction.play();

    return true;
  }

  setAngle(angle: number) {
    this.object.rotation.y = angle;
  }
}

export class RemotePlayer extends Player {
  private targetPosition: THREE.Vector3;

  constructor(
    object: THREE.Object3D,
    game: Game,
    private lerpRate = 0.3
  ) {
    super(object, game);

    this.targetPosition = object.position.clone();
  }

  update(delta: number): void {
    super.update(delta);

    const state = this.getState();

    if (state != 'Dead' && state != 'Misobon') {
      this.pos.lerp(this.targetPosition, this.lerpRate);
    }
  }

  setTargetPosition(pos: THREE.Vector3Like) {
    this.targetPosition.copy(pos);
  }
}

export class ControllablePlayer extends Player {
  private positionSyncController: SyncController;
  private moveWeight = 5;
  private deadIndexes: Map<string, Index[]> = new Map();
  private socket: GameSocket;

  constructor(object: THREE.Object3D, game: Game) {
    super(object, game);

    this.socket = getSocket();
    this.positionSyncController = new SyncController(() => {
      this.socket.position(this.pos);
    });
  }

  setDeadIndexes(indexes: Index[]) {
    const key = v4();
    this.deadIndexes.set(key, indexes);

    setTimeout(() => {
      this.deadIndexes.delete(key);
    }, 1000);
  }

  update(delta: number): void {
    super.update(delta);

    if (this.getState() != 'Dead') {
      this.checkDead();
    }
  }

  move(direction: THREE.Vector3) {
    if (!this.canMove()) return;
    if (!this.canMoveTo(direction)) return;

    if (this.isStunnerIndex(this.index)) {
      this.setState('Stun');
      setTimeout(() => {
        if (this.getState() !== 'Dead') {
          this.setState('Idle');
        }
      }, 1500);

      return;
    }

    if (direction.x == 0 && direction.z == 0) {
      this.setState('Idle');
      return;
    }

    if (this.canMoveTo(direction)) {
      this.setState('Walking');
      this.pos.add(direction.clone().multiplyScalar(this.moveWeight));

      const currentIndex = this.index;

      if (this.game.fieldController?.isItemIndex(currentIndex)) {
        this.socket.getItem(currentIndex);
        // To avoid multiple get_item event
        this.game.fieldController.set({
          index: currentIndex,
          type: 0,
        });
      }

      this.positionSyncController.update(engine.frameCount);
    }

    const angle = Math.atan2(direction.x, direction.z);
    this.setAngle(angle);

    this.socket.angle(angle);
  }

  canMove() {
    const state = this.getState();
    return !(state == 'Dead' || state == 'Misobon' || state == 'Stun');
  }

  speedUp() {
    this.moveWeight *= 1.1;
  }

  setState(state: PlayerState): boolean {
    const changed = super.setState(state);

    if (changed) {
      this.socket.state(state);
    }

    return changed;
  }

  private canMoveTo(direction: THREE.Vector3): boolean {
    const pos = this.pos.clone();
    const currentIndex = this.index;

    let checkSize: number;

    if (this.isPlacedBombIndex(currentIndex)) {
      checkSize = UNIT;
    } else {
      checkSize = PLAYER_RADIUS;
    }

    pos.add(direction.clone().multiplyScalar(checkSize));

    const targetIndex = convertPositionToIndex(pos);

    const isNonBlockerIndex =
      this.game.fieldController?.isNonBlockerIndex(targetIndex) ?? false;
    const isBombIndex = this.isPlacedBombIndex(targetIndex);

    return isNonBlockerIndex && !isBombIndex;
  }

  private checkDead() {
    for (const indexes of this.deadIndexes.values()) {
      for (const index of indexes) {
        if (equalIndex(index, this.index)) {
          this.setState('Dead');

          this.game.soundController.playSound(Sound.Dead);

          setTimeout(() => {
            this.setState('Misobon');
          }, 3000);
        }
      }
    }
  }

  private isPlacedBombIndex(index: Index): boolean {
    const bomb = this.game.bombController.getBomb(index);
    return bomb !== null && bomb.state === BombState.placed;
  }

  private isStunnerIndex(index: Index): boolean {
    const bomb = this.game.bombController.getBomb(index);
    return bomb !== null && bomb.state === BombState.moving;
  }
}

class SyncController {
  private nextSyncFrameCount = -1;

  constructor(
    private sync: () => void,
    private interval = 6
  ) {}

  update(frameCount: number) {
    if (this.nextSyncFrameCount < frameCount) {
      this.sync();

      this.nextSyncFrameCount = frameCount + this.interval;
    }
  }
}
