import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/resources/*',
          dest: 'src/resources',
        },
        {
          src: 'src/lib/*',
          dest: 'src/lib',
        },
      ],
    }),
  ],
});
