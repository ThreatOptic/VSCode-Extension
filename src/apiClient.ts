import { getApiUrl } from './config'

export class ThreatOpticApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ThreatOpticApiError'
    this.status = status
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return `HTTP ${res.status}`

  try {
    const data = JSON.parse(text) as { detail?: unknown }
    if (typeof data.detail === 'string' && data.detail) return data.detail
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail
        .map((entry) =>
          entry && typeof entry === 'object' && 'msg' in entry
            ? String((entry as { msg: unknown }).msg)
            : String(entry),
        )
        .join('; ')
    }
  } catch {
    return text
  }

  return text
}

export async function postJson<T>(
  path: string,
  apiKey: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new ThreatOpticApiError(res.status, await parseErrorMessage(res))
  }

  return (await res.json()) as T
}
