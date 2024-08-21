<script lang="ts">
  import { getSocket } from '../socket';
  import type { PlayerData } from '../interface';
  import { onDestroy, onMount } from 'svelte';
  import type { GameEventHandler } from '../event';

  export let visible = true;

  let errorMessage = '';
  let joined = false;
  let players: PlayerData[] = [];
  let roomName = 'debug';

  $: if (roomName.length === 0) {
    errorMessage = 'Please enter room name';
  }

  const handler: GameEventHandler = {
    onPlayers: (newPlayers: PlayerData[]) => {
      players = newPlayers;
      joined = true;
    },
    onJoinedPlayer: (player: PlayerData) => {
      players = [...players, player];
    },
    onLeftPlayer: (id: string) => {
      players = players.filter((p) => p.id !== id);
    },
    onErrorRoomIsPlaying() {
      errorMessage = 'Room is playing';
    },
    onErrorRoomIsFull() {
      errorMessage = 'Room is full';
    },
  };

  onMount(() => {
    getSocket().addHandler(handler);
  });

  onDestroy(() => {
    getSocket().removeHandler(handler);
  });

  function join(
    event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
  ) {
    if (roomName.length === 0) {
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
  <p role="alert" class="text-red-500">{errorMessage}</p>

  <div
    class="flex flex-col justify-center items-center gap-4 py-8"
    class:hidden={!joined}
  >
    {#each players as player}
      <p class="text-xl">{player.name}</p>
    {/each}
    <div class="flex flex-col gap-4">
      <button class="button-primary" on:click={leave}>Leave</button>
      <button class="button-primary" on:click={start}>Play</button>
    </div>
  </div>
</div>
