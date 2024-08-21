import { FieldController } from './controller/field_controller';
import * as THREE from 'three';
import { InputManager } from './input_manager';
import { GameSocket } from '../event';
import { UNIT } from './obj';
import { convertDirectionToIndex } from './convert';
import { BombController } from './controller/bomb_controller';
import { EffectController } from './controller/effect_controller';
import { Sound, SoundController } from './controller/sound_controller';
import {
  type Bomb,
  type FieldDiff,
  type Index,
  isFourDirection,
  type PlayerData,
} from '../interface';
import type { EngineContext } from '../engine';
import { getSocket } from '../socket';
import GameCanvas from './GameCanvas.svelte';
import { getTargetDocument } from '../main';
import { PlayersController } from './controller/players_controller';

export class Game implements EngineContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  animationMixers: Map<THREE.Object3D, THREE.AnimationMixer> = new Map();

  bombController: BombController;
  fieldController: FieldController | null = null;
  effectController: EffectController;
  soundController: SoundController;
  playersController: PlayersController;

  private socket: GameSocket;
  private inputManager: InputManager;
  private component: GameCanvas | null = null;

  constructor() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 1000, 3000 * 3);
    camera.rotation.x -= (Math.PI * 5) / 12;

    this.scene = scene;
    this.camera = camera;

    this.bombController = new BombController(this);
    this.effectController = new EffectController(this);
    this.soundController = new SoundController();
    this.playersController = new PlayersController(this);

    this.inputManager = new InputManager();

    this.socket = getSocket();

    this.socket.addHandler({
      onPlayers: (players: PlayerData[]) => {
        this.playersController.setPlayerData(players);
      },
      onJoinedPlayer: (player) => {
        this.playersController.joined(player);
      },
      onLeftPlayer: (id) => {
        this.playersController.left(id);
      },
      onField: async (field) => {
        this.dispose();
        this.fieldController = new FieldController(field, this);
        this.fieldController.build();
        this.camera.position.set((field.config.width * UNIT) / 2, 5000, 100);

        this.playersController.build(field.config.initialSpawnIndexes);
        this.soundController.playBGM();
      },
      onFieldDiffs: (diffs: FieldDiff[]) => {
        this.fieldController?.setAll(diffs);
      },
      onExploded: (bombIds: string[], diffs: FieldDiff[]) => {
        this.bombController.explode(bombIds, diffs);
        const indexes = diffs.map((diff) => diff.index);
        this.player?.setDeadIndexes(indexes);
      },
      onBomb: (bomb: Bomb) => this.bombController.set(bomb),
      onPlayerPosition: (id, pos) =>
        this.playersController.setTargetPosition(id, pos),
      onPlayerAngle: (id, angle) => this.playersController.setAngle(id, angle),
      onPlayerState: (id, state) => this.playersController.setState(id, state),
      onSpeedUp: () => this.player?.speedUp(),
      onGotItem: (index: Index) => {
        this.fieldController?.set({
          index,
          type: 0,
        });
        this.soundController.playSound(Sound.GotItem);
      },
      onFinish: (_) => this.onFinish(),
      onFinishSolo: () => this.onFinish(),
      onFinishDraw: () => this.onFinish(),
    });

    this.initialize();
  }

  async initialize() {
    await this.bombController.initialize();

    await this.effectController.initialize();

    const listener = await this.soundController.initialize();
    this.camera.add(listener);
  }

  private onFinish() {
    this.soundController.stopBGM();
    this.soundController.playSound(Sound.Finish);
  }

  dispose() {
    this.bombController.dispose();
    this.fieldController?.dispose();
    this.playersController?.dispose();
  }

  get player() {
    return this.playersController.player;
  }

  add(object: THREE.Object3D) {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D) {
    this.scene.remove(object);
    this.animationMixers.delete(object);
  }

  update(delta: number) {
    if (this.fieldController == null) return;

    for (const mixer of this.animationMixers.values()) {
      mixer.update(delta);
    }

    this.playersController.update(delta);
    this.effectController.update(delta);
    this.bombController.update(delta);

    if (this.player?.canMove()) {
      this.handleInput();
    }

    this.inputManager.postFrame();
  }

  activate() {
    if (this.component !== null) {
      this.component!.visible = true;
      return;
    }
    this.component = new GameCanvas({
      target: getTargetDocument(),
    });
  }

  deactivate() {
    this.component!.visible = false;
  }

  private handleInput() {
    if (this.player == null) return;

    const dir = this.inputManager.getDirection();

    this.player.move(dir);

    if (this.inputManager.isPlaceBombPressed()) {
      this.socket.placeBomb(this.player.index);
    } else if (this.inputManager.isKickBombPressed()) {
      if (isFourDirection(dir)) {
        const dirIndex = convertDirectionToIndex(dir);
        this.socket.kickBomb(this.player.index, dirIndex);
      }
    } else if (this.inputManager.isStopBombPressed()) {
      this.socket.stopBomb();
    } else if (this.inputManager.isPunchPressed()) {
      this.socket.punchBomb(this.player.index);
    } else if (this.inputManager.isHoldPressed()) {
      this.socket.holdBomb(this.player.index);
    }
  }
}
