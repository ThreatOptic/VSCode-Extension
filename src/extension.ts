import * as vscode from 'vscode'
import { ThreatOpticApiError } from './apiClient'
import {
  clearApiKey,
  getApiKey,
  setApiKey,
} from './config'
import { syncExtensions } from './sync'

const DEBOUNCE_MS = 2000

let syncInFlight = false
let debounceTimer: NodeJS.Timeout | undefined
let missingKeyNoticeShown = false
let statusBarItem: vscode.StatusBarItem | undefined

function updateStatusBar(message: string): void {
  if (!statusBarItem) return
  statusBarItem.text = `ThreatOptic: ${message}`
  statusBarItem.show()
}

async function runSync(options?: { showSuccessMessage?: boolean }): Promise<void> {
  const apiKey = await getApiKey(contextRef)
  if (!apiKey) {
    updateStatusBar('No API key configured')
    if (!missingKeyNoticeShown) {
      missingKeyNoticeShown = true
      void vscode.window.showInformationMessage(
        'Create an API key in ThreatOptic → Access, then run "ThreatOptic: Set API Key".',
      )
    }
    return
  }

  if (syncInFlight) return
  syncInFlight = true
  updateStatusBar('Syncing…')

  try {
    const result = await syncExtensions(contextRef, options)
    if (result) {
      const syncedAt = new Date(result.last_synced_at).toLocaleTimeString()
      updateStatusBar(`Synced ${result.extension_count} extensions at ${syncedAt}`)
    }
  } catch (err) {
    const message =
      err instanceof ThreatOpticApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Sync failed'
    updateStatusBar('Sync failed')
    if (options?.showSuccessMessage) {
      void vscode.window.showErrorMessage(`ThreatOptic sync failed: ${message}`)
    }
  } finally {
    syncInFlight = false
  }
}

function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void runSync()
  }, DEBOUNCE_MS)
}

let contextRef: vscode.ExtensionContext

export function activate(context: vscode.ExtensionContext): void {
  contextRef = context

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  statusBarItem.command = 'threatoptic.syncExtensions'
  statusBarItem.tooltip = 'Sync IDE extensions to ThreatOptic'
  context.subscriptions.push(statusBarItem)

  context.subscriptions.push(
    vscode.commands.registerCommand('threatoptic.setApiKey', async () => {
      const value = await vscode.window.showInputBox({
        prompt: 'Paste your ThreatOptic API key (top_…)',
        password: true,
        ignoreFocusOut: true,
      })
      if (!value?.trim()) return
      if (!value.trim().startsWith('top_')) {
        void vscode.window.showErrorMessage('ThreatOptic API keys must start with top_.')
        return
      }
      await setApiKey(context, value)
      missingKeyNoticeShown = false
      void vscode.window.showInformationMessage('ThreatOptic API key saved.')
      await runSync({ showSuccessMessage: true })
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('threatoptic.clearApiKey', async () => {
      await clearApiKey(context)
      updateStatusBar('No API key configured')
      void vscode.window.showInformationMessage('ThreatOptic API key cleared.')
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('threatoptic.syncExtensions', async () => {
      await runSync({ showSuccessMessage: true })
    }),
  )

  context.subscriptions.push(
    vscode.extensions.onDidChange(() => {
      scheduleSync()
    }),
  )

  void getApiKey(context).then((apiKey) => {
    if (apiKey) {
      scheduleSync()
    } else {
      updateStatusBar('No API key configured')
    }
  })
}

export function deactivate(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
}
