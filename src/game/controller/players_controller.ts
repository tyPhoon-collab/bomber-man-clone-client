import type { Index, PlayerData } from '../../interface';
import { getSocket } from '../../socket';
import { convertIndexToPosition } from '../convert';
import type { Game } from '../game';
import { newBomberManObject } from '../obj';
import { ControllablePlayer, RemotePlayer, type PlayerState } from '../player';
import * as THREE from 'three';

export class PlayersController {
  player: ControllablePlayer | null = null;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private playerData: PlayerData[] = [];

  constructor(private game: Game) {}

  dispose() {
    this.player?.dispose();
    this.player = null;
    for (const player of this.remotePlayers.values()) {
      player.dispose();
    }
    this.remotePlayers.clear();
  }

  update(delta: number) {
    this.player?.update(delta);
    for (const player of this.remotePlayers.values()) {
      player.update(delta);
    }
  }

  setPlayerData(playerData: PlayerData[]) {
    this.playerData = playerData;
  }

  getPlayerData(id: string) {
    return this.playerData.find((p) => p.id === id);
  }

  joined(player: PlayerData) {
    this.playerData.push(player);
  }

  left(id: string) {
    this.playerData = this.playerData.filter((p) => p.id !== id);

    const player = this.remotePlayers.get(id);
    if (player) {
      player.dispose();
      this.remotePlayers.delete(id);
    }
  }

  setTargetPosition(id: string, pos: THREE.Vector3Like) {
    this.remotePlayers.get(id)?.setTargetPosition(pos);
  }

  setAngle(id: string, angle: number) {
    this.remotePlayers.get(id)?.setAngle(angle);
  }

  setState(id: string, state: PlayerState) {
    this.remotePlayers.get(id)?.setState(state);
  }

  async build(initialSpawnIndexes: Index[]) {
    for (const data of this.playerData) {
      const index = this.playerData.findIndex((p) => p.id === data.id);
      const initIndex = initialSpawnIndexes[index];
      if (data.id === getSocket().id) {
        this.player = await this.buildControllablePlayer(initIndex);
      } else {
        const player = await this.buildRemotePlayer(initIndex);
        this.remotePlayers.set(data.id, player);
      }
    }
  }

  private async buildControllablePlayer(initIndex: Index) {
    const object = await newBomberManObject();
    object.position.copy(convertIndexToPosition(initIndex));
    this.game.add(object);

    return new ControllablePlayer(object, this.game);
  }

  private async buildRemotePlayer(initIndex: Index) {
    const object = await newBomberManObject();
    object.position.copy(convertIndexToPosition(initIndex));
    this.game.add(object);

    return new RemotePlayer(object, this.game);
  }
}
