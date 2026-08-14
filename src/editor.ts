import * as vscode from 'vscode'

/** Human-readable editor name reported to ThreatOptic (e.g. Cursor, VS Code). */
export function getEditorName(): string {
  const name = vscode.env.appName?.trim()
  return name || 'Unknown IDE'
}
