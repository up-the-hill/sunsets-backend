import 'dotenv/config';
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { sunsetsTable } from './db/schema.js';

const app = new Hono()
const db = drizzle(process.env.DATABASE_URL!);

// app.get('/', serveStatic({ path: './public/index.html' }))
app.get('/hello', (c) => {
  return c.text("hello")
})

app.get('/sunsets', async (c) => {
  const sunsets = await db.select().from(sunsetsTable)
  return c.json(sunsets)
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
