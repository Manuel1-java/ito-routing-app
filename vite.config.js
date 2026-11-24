import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { rolldown } from 'rolldown'

function buildMaplibreWorker() {
  return {
    name: 'build-maplibre-worker',
    async generateBundle() {
      const workerEntry = path.resolve('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs')
      const bundle = await rolldown({ input: workerEntry })
      const { output } = await bundle.generate({
        format: 'iife',
        inlineDynamicImports: true
      })
      await bundle.close()

      this.emitFile({
        type: 'asset',
        fileName: 'maplibre-worker.js',
        source: output[0].code
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), buildMaplibreWorker()],
  optimizeDeps: {
    exclude: ['maplibre-gl']
  }
})