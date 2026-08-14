import * as vscode from 'vscode'

export const API_KEY_SECRET = 'threatoptic.apiKey'
export const DEFAULT_API_URL = 'https://api.threat-optic.com'

export function getApiUrl(): string {
  const config = vscode.workspace.getConfiguration('threatoptic')
  const configured = config.get<string>('apiUrl')?.trim()
  return (configured || DEFAULT_API_URL).replace(/\/$/, '')
}

export function getDeviceLabel(): string | undefined {
  const config = vscode.workspace.getConfiguration('threatoptic')
  const label = (config.get<string>('deviceLabel') ?? '').trim()
  return label || undefined
}

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(API_KEY_SECRET)
}

export async function setApiKey(
  context: vscode.ExtensionContext,
  value: string,
): Promise<void> {
  await context.secrets.store(API_KEY_SECRET, value.trim())
}

export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(API_KEY_SECRET)
}
