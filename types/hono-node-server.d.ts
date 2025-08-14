declare module '@hono/node-server' {
  import { Hono } from 'hono'
  import { ServeOptions } from '@hono/node-server/dist/types'
  export function serve(options: ServeOptions & { fetch: Hono['fetch'] }): void
}
