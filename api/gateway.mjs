// Both deployments dispatch through the same routes, cookie checks and error handling.
export default async function gateway(request, response) {
  if (!process.env.DATABASE_URL || !process.env.APP_ORIGIN) {
    response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify({ error: { code: 'api_unavailable' } }))
    return
  }
  const url = new URL(request.url, 'http://localhost')
  if (url.pathname === '/api/gateway') {
    const route = url.searchParams.get('__route') || ''
    url.searchParams.delete('__route')
    request.url = '/api/v1/' + route + url.search
  }
  const { handler } = await import('../server/dist/handler.js')
  return handler(request, response)
}
