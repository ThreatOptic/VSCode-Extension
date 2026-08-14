# ThreatOptic VS Code Extension

Sync installed VS Code and Cursor extension inventory to your ThreatOptic account. The extension reports extension IDs, versions, and display names so you can monitor what is installed across your team's IDEs from the ThreatOptic dashboard.

Works in **VS Code**, **Cursor**, and other VS Code-compatible editors that support the Extension API.

## What it does

On each sync, the extension sends:

| Field | Source | Example |
|-------|--------|---------|
| Device identity | `vscode.env.machineId` | Stable per installation |
| Device label | Setting `threatoptic.deviceLabel` | `Work MacBook` |
| Editor version | `vscode.version` | `1.98.2` |
| Extension ID | `extension.id` | `ms-python.python` |
| Extension version | `extension.packageJSON.version` | `2025.4.0` |
| Display name | `extension.packageJSON.displayName` | `Python` |

Built-in extensions (language packs, etc.) are **excluded**. User-installed and marketplace extensions are included whether enabled or disabled.

Synced data appears in the ThreatOptic UI under **Security → Monitoring → Extensions** (`/security/extensions`).

## Prerequisites

- A ThreatOptic account
- Network access to your ThreatOptic API
- An API key created in the dashboard (see below)

## Quick start

### 1. Create an API key

1. Sign in to ThreatOptic.
2. Open **Account → Access**.
3. Click **Create API key**, give it a name (e.g. `VS Code — work laptop`).
4. Copy the one-time secret — it starts with `top_` and is shown only once.

You can revoke keys anytime from the same page. Each account supports up to 10 active keys.

### 2. Install the extension

**From the ThreatOptic dashboard (recommended):**

1. Sign in and open **Account → Access**.
2. Create an API key.
3. Click **Install in VS Code** or **Install in Cursor** in the IDE plugins section.

**From a marketplace:**

- [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=threatoptic.threatoptic-vscode)
- [Open VSX](https://open-vsx.org/extension/threatoptic/threatoptic-vscode)

**From source:**

```bash
git clone https://github.com/ThreatOptic/VSCode-Extension.git
cd VSCode-Extension
npm install
npm run compile
```

Press **F5** in VS Code to launch an Extension Development Host with the extension loaded.

**From a VSIX package:**

```bash
npm install
npm run package   # produces threatoptic-vscode-<version>.vsix
code --install-extension threatoptic-vscode-*.vsix
```

**From Docker (no local Node/npm):**

Builds the VSIX inside a container — dependencies are installed in the image, not on your machine.

```bash
# Export the VSIX into the current directory (Docker BuildKit)
docker build --target artifact --output . .
code --install-extension threatoptic-vscode.vsix

# Or build an image and copy the VSIX out via a volume mount
docker build -t threatoptic-vscode .
docker run --rm -v "$(pwd):/out" threatoptic-vscode
code --install-extension threatoptic-vscode.vsix
```

Use `cursor --install-extension` instead of `code --install-extension` in Cursor.

### 3. Configure the API URL (if needed)

The extension defaults to `https://api.threat-optic.com`. If you run your own instance, set the base URL in VS Code settings:

```json
{
  "threatoptic.apiUrl": "http://localhost:8000"
}
```

Or use **Settings → Extensions → ThreatOptic → Api Url**.

### 4. Store your API key

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:

**ThreatOptic: Set API Key**

Paste the `top_…` secret from step 1. The key is stored in VS Code **SecretStorage** (encrypted by the editor, not written to settings or workspace files).

The extension syncs immediately after the key is saved.

### 5. View inventory in ThreatOptic

Open **Security → Monitoring → Extensions** in the ThreatOptic dashboard to see synced devices and their extension lists.

## Sync behavior

| Trigger | Behavior |
|---------|----------|
| Extension activation | Debounced sync ~5 seconds after startup (if API key is set) |
| Extension install/update/uninstall | Debounced re-sync ~5 seconds after change |
| Manual command | Immediate sync with success/error notification |
| Status bar click | Runs manual sync (`ThreatOptic: Sync IDE Extensions`) |

Only one sync runs at a time. Automatic sync failures update the status bar silently; manual sync also shows an error message.

If no API key is configured, a one-time info message points you to **Account → Access**.

## Commands

| Command | Description |
|---------|-------------|
| **ThreatOptic: Set API Key** | Prompt for and store your `top_…` API key |
| **ThreatOptic: Clear API Key** | Remove the stored key and stop syncing |
| **ThreatOptic: Sync IDE Extensions** | Push the current extension inventory to ThreatOptic |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `threatoptic.apiUrl` | `https://api.threat-optic.com` | ThreatOptic API base URL (no trailing slash) |
| `threatoptic.deviceLabel` | *(empty)* | Optional friendly name for this IDE in the dashboard |

Example `settings.json`:

```json
{
  "threatoptic.apiUrl": "https://api.threat-optic.com",
  "threatoptic.deviceLabel": "MacBook Pro — engineering"
}
```

## Security

- API keys are sent as `Authorization: Bearer top_…` on each sync request.
- Keys are stored in VS Code SecretStorage, not in plain settings or source control.
- Create separate keys per machine or use case so you can revoke individually.
- Keys inherit your ThreatOptic account permissions (`ide:write` is required for sync).
- Revoke a compromised key immediately from **Account → Access**; the extension will receive `401` on the next sync.

## API reference

The extension calls a single endpoint:

```
POST {threatoptic.apiUrl}/ide/devices/sync
Authorization: Bearer top_...
Content-Type: application/json
```

Request body:

```json
{
  "machine_id": "…",
  "label": "Work MacBook",
  "editor_version": "1.98.2",
  "extensions": [
    {
      "extension_id": "ms-python.python",
      "version": "2025.4.0",
      "display_name": "Python"
    }
  ]
}
```

Each sync **replaces** the full extension list for that device.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Status bar: `No API key configured` | Key not set | Run **ThreatOptic: Set API Key** |
| `ThreatOptic API keys must start with top_.` | Wrong value pasted | Copy the full key from **Account → Access** |
| `Not authenticated` / `401` | Revoked or invalid key | Create a new key and run **Set API Key** |
| `Sync failed` (network) | Wrong `threatoptic.apiUrl` or API unreachable | Check URL and that the API is running |
| Nothing in dashboard | Sync never succeeded | Run **Sync IDE Extensions** manually and check the error |
| Duplicate devices | Same key on multiple profiles | Use one key per IDE installation; set `deviceLabel` to tell them apart |

**Output log:** open **Help → Toggle Developer Tools → Console** (or **Output** panel) while running a manual sync to see fetch errors.

## Development

Requires **Node.js 18+** (20+ recommended for packaging with `@vscode/vsce`).

```bash
npm install
npm run compile      # one-off build → dist/extension.js
npm run watch        # rebuild on file changes
npm run package      # compile + create .vsix
```

**Docker build** (same `.vsix` output, no local `npm install`):

```bash
docker build --target artifact --output . .
# → threatoptic-vscode.vsix
```

Launch with **F5** using `.vscode/launch.json` (Extension Development Host).

### Local end-to-end test

Point the extension at a ThreatOptic API you control, then verify the round trip:

1. Set `threatoptic.apiUrl` to your API base URL.
2. Create an API key in the dashboard under **Account → Access**.
3. Run `npm run compile`, press **F5**, then run **ThreatOptic: Set API Key** in the development host and paste the key.
4. Confirm the status bar reports a successful sync.

Check the stored inventory directly:

```bash
curl -s -H "Authorization: Bearer top_YOUR_KEY" \
  https://api.threat-optic.com/ide/devices | jq
```

Or open **Security → Monitoring → Extensions** in the dashboard.

### Project layout

```
.
├── src/
│   ├── extension.ts    # activation, commands, debounced auto-sync, status bar
│   ├── sync.ts         # collect extensions, POST /ide/devices/sync
│   ├── apiClient.ts    # HTTP client + error parsing
│   ├── config.ts       # settings + SecretStorage helpers
│   └── editor.ts       # editor name detection
├── package.json        # contributes commands, configuration
├── esbuild.js          # bundle to dist/extension.js
└── Dockerfile          # containerized VSIX build (no local npm)
```

### Publishing (maintainers)

```bash
npm run package
npx vsce publish -p "$VSCE_PAT"
npx ovsx publish -p "$OVSX_PAT" threatoptic-vscode-*.vsix
```

## License

MIT — see [LICENSE](LICENSE).
