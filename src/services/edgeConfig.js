async function readJson(response) {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error || `Edge Config request failed with status ${response.status}.`
    throw new Error(message)
  }

  return payload
}

export async function getEdgeConfigValue(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Edge Config key must be a non-empty string.')
  }

  const response = await fetch(`/api/edge-config?key=${encodeURIComponent(key)}`, {
    headers: { accept: 'application/json' }
  })
  const payload = await readJson(response)

  return payload.value
}

export async function getEdgeConfigItems() {
  const response = await fetch('/api/edge-config', {
    headers: { accept: 'application/json' }
  })
  const payload = await readJson(response)

  return payload.items || {}
}
