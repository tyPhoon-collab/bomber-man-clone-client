<!-- TODO checkValues -->

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { engine } from '../main';
  import { getSocket } from '../socket';
  import { Game } from './game';
  import type { GameEventHandler } from '../event';

  export let visible = true;

  let volume = 0.5;
  let finished = false;
  let winnerName = '';

  const handler: GameEventHandler = {
    onFinish(winnerId) {
      finished = true;
      const game = engine.current as Game;
      winnerName = game.playersController.getPlayerData(winnerId)?.name ?? '';
    },
    onFinishSolo() {
      finished = true;
    },
    onFinishDraw() {
      finished = true;
    },
  };

  onMount(() => {
    getSocket().addHandler(handler);
  });

  onDestroy(() => {
    getSocket().removeHandler(handler);
  });

  export function checkValues() {
    const game = engine.current as Game;
    game.soundController.setMasterVolume(volume);
  }

  function backToTitle() {
    const socket = getSocket();
    socket.leave();
    engine.pop().pop();
  }
</script>

<div class="w-screen h-screen" class:hidden={!visible}>
  <div class="w-full h-full absolute p-4">
    <div class="flex flex-row gap-2">
      <input
        id="volume"
        type="range"
        min="0"
        max="1"
        step="0.1"
        bind:value={volume}
        on:change={checkValues}
      />
      <label for="volume">Volume</label>
    </div>
    <p>WASD: Move</p>
    <p>Space: Bomb</p>
    <p>K: Kick Bomb, if available</p>
    <p>L: Stop Kicking Bomb,if available</p>
    <!-- <p>P: Punch Bomb, if available</p> -->
    <!-- <p>H: Hold Bomb, if available</p> -->
  </div>

  <div
    class="w-full h-full absolute flex flex-col justify-center items-center gap-2"
    class:hidden={!finished}
  >
    {#if winnerName !== ''}
      <p>Winner: {winnerName}</p>
    {/if}
    <button class="button-primary" on:click={backToTitle}>Back to Title</button>
  </div>
</div>
