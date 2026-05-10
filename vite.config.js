import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import searchHandler from './api/search.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'local-api-search',
        configureServer(server) {
          server.middlewares.use('/api/search', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            let rawBody = ''
            req.on('data', (chunk) => { rawBody += chunk })
            req.on('end', async () => {
              req.body = rawBody
              res.status = (code) => {
                res.statusCode = code
                return res
              }
              res.json = (payload) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(payload))
              }
              await searchHandler(req, res)
            })
          })
        },
      },
    ],
  }
})
