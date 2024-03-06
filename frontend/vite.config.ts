import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8081,
  },
  publicDir: 'assets',
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/widgets/Embed.tsx'), // Adjust this path to your component
      name: 'Embed', // The global variable name when included via a script tag
      fileName: (format) => `embed.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
      },
    },
  },
})