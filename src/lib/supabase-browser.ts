import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

let client: ReturnType<typeof createServerClient<Database>> | null = null

export function createBrowserClient() {
  if (client) return client

  client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie
            .split('; ')
            .filter(c => c.length)
            .map(c => {
              const [name, ...rest] = c.split('=')
              return { name, value: rest.join('=') }
            })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = options
              ? `; ${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ')}`
              : ''
            document.cookie = `${name}=${value}${opts}`
          })
        },
      },
    }
  )

  return client
}
