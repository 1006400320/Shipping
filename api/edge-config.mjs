import { get, getAll } from '@vercel/edge-config'

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function getQuery(request) {
  const host = request.headers.host || 'localhost'
  const url = new URL(request.url, `https://${host}`)

  return url.searchParams
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (!process.env.EDGE_CONFIG) {
    sendJson(response, 500, { error: 'EDGE_CONFIG environment variable is not configured.' })
    return
  }

  try {
    const query = getQuery(request)
    const key = query.get('key')

    if (key) {
      sendJson(response, 200, { key, value: await get(key) })
      return
    }

    sendJson(response, 200, { items: await getAll() })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Failed to read Edge Config.'
    })
  }
}
