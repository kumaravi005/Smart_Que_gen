import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function loadEnvFile(filename) {
  const filePath = path.join(rootDir, filename)
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
  }
  return env
}

const envLocal = loadEnvFile('.env.local')
const envDefault = loadEnvFile('.env')
const env = { ...envDefault, ...envLocal, ...process.env }

const url = (env.VITE_SUPABASE_URL || '').trim()
const anonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim()

function isPlaceholder(val) {
  if (!val) return true
  const l = val.toLowerCase()
  return (
    l.includes('your-project-id') ||
    l.includes('placeholder') ||
    l.includes('your-anon-token') ||
    l.includes('your-anon-or-publishable-key') ||
    l.includes('your_supabase')
  )
}

function maskKey(key) {
  if (!key) return '(empty)'
  if (key.length <= 16) return '***'
  const prefix = key.slice(0, 12)
  const suffix = key.slice(-4)
  return `${prefix}...${suffix} (${key.length} chars)`
}

function getKeyFormat(key) {
  if (!key) return 'unknown'
  if (key.startsWith('sb_publishable_')) return 'Supabase Publishable Key'
  if (key.startsWith('sb_')) return 'Supabase Key (' + key.slice(0, key.indexOf('_', 3) + 1 || 8) + ')'
  if (key.startsWith('eyJ')) return 'Legacy JWT Key'
  return 'Custom/Standard Key'
}

async function run() {
  console.log('='.repeat(65))
  console.log('  Omega Question Paper Generator — Supabase Connection Test')
  console.log('='.repeat(65))

  const hasUrl = url.length > 0 && !isPlaceholder(url)
  const hasKey = anonKey.length > 0 && !isPlaceholder(anonKey)

  console.log(`- Project URL:   ${hasUrl ? url : '(Not configured or using placeholder)'}`)
  console.log(`- API Key Type:  ${getKeyFormat(anonKey)}`)
  console.log(`- API Key:       ${hasKey ? maskKey(anonKey) : '(Not configured or using placeholder)'}`)
  console.log(`- Source file:   ${fs.existsSync(path.join(rootDir, '.env.local')) ? '.env.local' : '(no .env.local found)'}`)
  console.log('-'.repeat(65))

  if (!hasUrl || !hasKey) {
    console.log('\n[STATUS: UNCONFIGURED]')
    console.log('No valid Supabase project credentials found.')
    console.log('\nNext steps:')
    console.log('1. Copy .env.example to .env.local:  cp .env.example .env.local')
    console.log('2. Open https://supabase.com/dashboard/projects')
    console.log('3. In your project settings -> Data API (or API):')
    console.log('   - Copy "Project URL" into VITE_SUPABASE_URL')
    console.log('   - Copy "Publishable key" (or "anon public" key) into VITE_SUPABASE_ANON_KEY')
    console.log('4. Re-run this check:  npm run test:supabase\n')
    return false
  }

  console.log('\nPinging Supabase Auth Health endpoint...')
  const start = performance.now()

  try {
    // Phase 1: Test basic HTTP reachability and API key acceptance via the Auth health endpoint
    // Using `apikey` header is compatible with both new `sb_publishable_` keys and legacy JWT keys.
    const res = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/health`, {
      headers: {
        apikey: anonKey
      }
    })

    const latency = Math.round(performance.now() - start)

    if (res.status === 401 || res.status === 403) {
      console.log(`\n[STATUS: AUTH ERROR (HTTP ${res.status})]`)
      console.log(`Connected to host in ${latency}ms, but the API key was rejected.`)
      console.log('Please double-check VITE_SUPABASE_ANON_KEY in your .env.local file.\n')
      return false
    }

    if (!res.ok && res.status !== 200 && res.status !== 204) {
      console.log(`\n[STATUS: UNEXPECTED RESPONSE (HTTP ${res.status})] in ${latency}ms\n`)
      return false
    }

    console.log(`[STATUS: REACHABLE] HTTP ${res.status} OK in ${latency}ms`)

    // Phase 2: Check database schema using @supabase/supabase-js
    console.log('Checking Omega tables...')
    const client = createClient(url, anonKey)
    const tables = ['institutes', 'profiles', 'papers', 'question_bank']
    const missing = []

    for (const table of tables) {
      const { error } = await client.from(table).select('id', { count: 'exact', head: true })
      if (error) {
        const msg = error.message || ''
        const isMissing =
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          msg.toLowerCase().includes('relation') ||
          msg.toLowerCase().includes('could not find the table')
        if (isMissing) {
          missing.push(table)
        }
      }
    }

    if (missing.length > 0) {
      console.log('\n[STATUS: TABLES MISSING]')
      console.log(`The Supabase project is reachable, but the following tables were not found: ${missing.join(', ')}`)
      console.log('Run the migration script (supabase/migrations/001_initial_schema.sql) in your Supabase SQL Editor.\n')
      return true
    }

    console.log('\n[STATUS: CONNECTED & SCHEMA DETECTED]')
    console.log('Supabase project is reachable, the API key is verified, and all Omega tables are installed!\n')
    return true
  } catch (err) {
    const latency = Math.round(performance.now() - start)
    console.log(`\n[STATUS: UNREACHABLE] in ${latency}ms`)
    console.log(`Error: ${err.message || 'Network request failed'}`)
    console.log('Please verify your internet connection and that VITE_SUPABASE_URL is correct.\n')
    return false
  }
}

// Execute cleanly without calling process.exit() to prevent Windows libuv assertions
run()
  .then((success) => {
    process.exitCode = success ? 0 : 1
  })
  .catch((err) => {
    console.error('Unexpected error:', err)
    process.exitCode = 1
  })
