import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log('Fetching channels...')
    const { data, error } = await supabase.from('puzzle_tv_channels').select('*')
    if (error) {
        console.error('Error fetching:', error)
    } else {
        console.log('Channels in DB:', JSON.stringify(data, null, 2))
    }
}

test()
