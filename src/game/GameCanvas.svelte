<!-- TODO checkValues -->

<script lang="ts">
  import { engine } from '../main';
  import { getSocket } from '../socket';
  import { Game } from './game';

  export let visible = true;
  export let finished = false;
  let volume = 0.5;

  export function checkValues() {
    const game = engine.current as Game;
    game.soundController.setMasterVolume(volume);
  }

  function backToTitle() {
    const socket = getSocket();
    socket.leave();
    socket.disconnect(); // temporary
    engine.pop().pop();
  }
</script>

<div class="w-screen h-screen" class:hidden={!visible}>
  <div class="w-full h-full absolute p-4">
    <div class="flex flex-row gap-2">
      <input
        id="muteCheck"
        type="range"
        min="0"
        max="1"
        step="0.1"
        bind:value={volume}
        on:change={checkValues}
      />
      <label for="muteCheck">Mute</label>
    </div>
    <p>WASD: Move</p>
    <p>Space: Bomb</p>
    <p>K: Kick Bomb, if available</p>
    <p>L: Stop Kicking Bomb,if available</p>
    <!-- <p>P: Punch Bomb, if available</p> -->
    <!-- <p>H: Hold Bomb, if available</p> -->
  </div>

  <div
    class="w-full h-full absolute flex justify-center items-center"
    class:hidden={!finished}
  >
    <button class="button-primary" on:click={backToTitle}>Back to Title</button>
  </div>
</div>
