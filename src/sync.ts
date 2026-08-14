import * as os from 'os'
import * as vscode from 'vscode'
import { postJson } from './apiClient'
import { getApiKey, getDeviceLabel } from './config'
import { getEditorName } from './editor'

type IdeExtensionEntry = {
  extension_id: string
  version: string
  display_name?: string
}

type IdeDeviceSyncResponse = {
  id: string
  extension_count: number
  last_synced_at: string
}

function collectExtensions(): IdeExtensionEntry[] {
  return vscode.extensions.all
    .filter((ext) => !ext.packageJSON.isBuiltin)
    .map((ext) => ({
      extension_id: ext.id,
      version: String(ext.packageJSON.version ?? 'unknown'),
      display_name:
        typeof ext.packageJSON.displayName === 'string'
          ? ext.packageJSON.displayName
          : undefined,
    }))
}

export async function syncExtensions(
  context: vscode.ExtensionContext,
  options?: { showSuccessMessage?: boolean },
): Promise<IdeDeviceSyncResponse | null> {
  const apiKey = await getApiKey(context)
  if (!apiKey) {
    return null
  }

  const payload = {
    machine_id: vscode.env.machineId,
    label: getDeviceLabel(),
    editor_name: getEditorName(),
    editor_version: vscode.version,
    os_platform: os.platform(),
    os_version: os.release(),
    cpu_arch: os.arch(),
    extensions: collectExtensions(),
  }

  const result = await postJson<IdeDeviceSyncResponse>(
    '/ide/devices/sync',
    apiKey,
    payload,
  )

  if (options?.showSuccessMessage) {
    void vscode.window.showInformationMessage(
      `ThreatOptic synced ${result.extension_count} extensions.`,
    )
  }

  return result
}
