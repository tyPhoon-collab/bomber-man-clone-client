<script lang="ts">
  import { getSocket } from '../socket';
  import type { PlayerData } from '../interface';

  export let errorMessage = '';
  export let visible = true;
  export let joined = false;

  export let players: PlayerData[] = [];

  let roomName = 'debug';

  function join(
    event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
  ) {
    if (roomName.length === 0) {
      errorMessage = 'Please enter room name';
      return;
    }
    errorMessage = '';
    getSocket().join(roomName);
  }

  function start(
    event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
  ) {
    getSocket().start();
  }

  function leave(
    event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
  ) {
    getSocket().leave();
    joined = false;
  }
</script>

<div
  class="flex flex-col justify-center items-center w-screen h-screen"
  class:hidden={!visible}
>
  <div class="flex flex-row gap-4 items-center">
    <label for="roomName">Room: </label>
    <input
      type="text"
      id="roomName"
      class="input-primary"
      placeholder="Room Name..."
      bind:value={roomName}
      required
    />
    <button class="button-primary" disabled={joined} on:click={join}
      >Join</button
    >
  </div>
  <p>{errorMessage}</p>

  <div
    class="flex flex-col justify-center items-center gap-4 py-8"
    class:hidden={!joined}
  >
    <ul>
      {#each players as player}
        <li>{player.name}</li>
      {/each}
    </ul>
    <div class="flex flex-col gap-4">
      <button class="button-primary" on:click={leave}>Leave</button>
      <button class="button-primary" on:click={start}>Play</button>
    </div>
  </div>
</div>
