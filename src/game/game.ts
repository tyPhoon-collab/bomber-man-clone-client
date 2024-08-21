import { FieldController } from './controller/field_controller';
import * as THREE from 'three';
import { ControllablePlayer, RemotePlayer } from './player';
import { InputManager } from './input_manager';
import { GameSocket } from '../event';
import { newBomberManObject, UNIT } from './obj';
import { convertDirectionToIndex, convertIndexToPosition } from './convert';
import { BombController } from './controller/bomb_controller';
import { EffectController } from './controller/effect_controller';
import { SoundController } from './controller/sound_controller';
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

export class Game implements EngineContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  animationMixers: Map<THREE.Object3D, THREE.AnimationMixer> = new Map();

  bombController: BombController;
  fieldController: FieldController | null = null;
  effectController: EffectController;
  soundController: SoundController;

  private player: ControllablePlayer | null = null;
  private players: Map<string, RemotePlayer> = new Map();
  private playerData: PlayerData[] = [];

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

    this.inputManager = new InputManager();

    this.socket = getSocket();

    this.socket.addHandler({
      onPlayers: (players: PlayerData[]) => {
        this.playerData = players;
      },
      onJoinedPlayer: (player) => {
        this.playerData.push(player);
      },
      onLeftPlayer: (id) => {
        this.playerData = this.playerData.filter((p) => p.id !== id);

        const player = this.players.get(id);
        if (player) {
          player.dispose();
          this.players.delete(id);
        }
      },
      onField: async (field) => {
        this.dispose();
        this.fieldController = new FieldController(field, this);
        this.fieldController.build();
        this.camera.position.set((field.config.width * UNIT) / 2, 5000, 100);

        for (const data of this.playerData) {
          const index = this.playerData.findIndex((p) => p.id === data.id);
          const initIndex = field.config.initialSpawnIndexes[index];
          if (data.id === getSocket().id) {
            this.player = await this.buildControllablePlayer(initIndex);
          } else {
            const player = await this.buildPlayer(initIndex);
            this.players.set(data.id, player);
          }
        }

        this.soundController.playBGM();
      },
      onFieldDiffs: (diffs: FieldDiff[]) => {
        this.fieldController?.setAll(diffs);
      },
      onExploded: (bombIds: string[], diffs: FieldDiff[]) => {
        this.bombController.explode(bombIds, diffs);
        this.player?.setDeadIndexes(diffs.map((diff) => diff.index));
      },
      onBomb: (bomb: Bomb) => {
        this.bombController.set(bomb);
      },
      onPlayerPosition: (id, pos) => {
        this.players.get(id)?.setTargetPosition(pos);
      },
      onPlayerAngle: (id, angle) => {
        this.players.get(id)?.setAngle(angle);
      },
      onPlayerState: (id, state) => {
        this.players.get(id)?.setState(state);
      },
      onSpeedUp: () => {
        this.player?.speedUp();
      },
      onGotItem: (index: Index) => {
        this.fieldController?.set({
          index,
          type: 0,
        });
        this.soundController.playGotItem();
      },
      onFinish: (winnerId) => {
        this.soundController.stopBGM();
        this.component!.finished = true;
      },
      onFinishSolo: () => {
        this.soundController.stopBGM();
        this.component!.finished = true;
      },
      onFinishDraw: () => {
        this.soundController.stopBGM();
        this.component!.finished = true;
      },
    });

    this.initialize();
  }

  async initialize() {
    await this.bombController.initialize();

    await this.effectController.initialize();

    const listener = await this.soundController.initialize();
    this.camera.add(listener);
  }

  dispose() {
    this.bombController.dispose();
    this.fieldController?.dispose();
    this.player?.dispose();
    for (const player of this.players.values()) {
      player.dispose();
    }
  }

  add(object: THREE.Object3D) {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D) {
    this.scene.remove(object);
    this.animationMixers.delete(object);
  }

  update(delta: number) {
    if (this.player == null || this.fieldController == null) return;

    const dir = this.inputManager.getDirection();

    this.player.update(delta);
    this.player.move(dir);

    for (const player of this.players.values()) {
      player.update(delta);
    }

    for (const mixer of this.animationMixers.values()) {
      mixer.update(delta);
    }

    this.effectController.update(delta);
    this.bombController.update(delta);

    if (this.player.canMove()) {
      this.handleInput(dir);
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

  private handleInput(dir: THREE.Vector3) {
    if (this.player == null) return;

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

  private async buildControllablePlayer(initIndex: Index) {
    const object = await newBomberManObject();
    object.position.copy(convertIndexToPosition(initIndex));
    this.add(object);

    return new ControllablePlayer(object, this, this.socket);
  }

  private async buildPlayer(initIndex: Index) {
    const object = await newBomberManObject();
    object.position.copy(convertIndexToPosition(initIndex));
    this.add(object);

    return new RemotePlayer(object, this);
  }
}
