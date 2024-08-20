<script lang="ts">
  import { engine } from '../main';
  import { Room } from '../room/room';

  const start = () => {
    engine.push(new Room());
  };

  export let visible = true;
</script>

<div
  class="flex flex-col justify-center items-center gap-8 w-screen h-screen"
  class:hidden={!visible}
>
  <h1 class="text-6xl font-bold">Bomber Man Clone</h1>
  <button class="button-primary" on:click={start}>Start</button>
</div>
