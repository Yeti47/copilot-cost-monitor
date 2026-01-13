# Copilot Cost Monitor

A minimal VS Code extension that displays your accrued GitHub Copilot Premium costs for the current billing period in the status bar.

## Features
- **Real-time Cost**: Polling update of your net Copilot usage cost.
- **Traffic Light System**: 
  - 🟢 < $10 (Default)
  - 🟡 > $10 (Warning)
  - 🔴 > $20 (Error)
  - *Thresholds are configurable.*
- **Secure**: Authentication tokens are stored in your OS keychain using VS Code's SecretStorage API.
- **Smart Polling**: Pauses updates when the VS Code window is in the background to prevent unnecessary API calls.

## Installation

1. Download the `.vsix` file from the latest GitHub Release.
2. Open VS Code.
3. Open the Command Palette (`Ctrl+Shift+P`).
4. Run: **Extensions: Install from VSIX...**
5. Select the downloaded `.vsix` file.

## Setup

### 1. Requirements
You need a GitHub Personal Access Token (PAT) (Classic) with the **`read:plan`** scope.
[Generate one here](https://github.com/settings/personal-access-tokens/new?name=Copilot%20Cost%20Monitor&description=Plan%20read%20permissions%20for%20Copilot%20Cost%20Monitor%20Extension&plan=read).

### 2. Configuration
1.  **Set Username**:
    - Go to **Settings** (`Ctrl+,`) -> Search for `Copilot Cost Monitor`.
    - Enter your **Github Username**.
2.  **Set Token**:
    - Open Command Palette (`Ctrl+Shift+P`).
    - Run: `Copilot Cost Monitor: Set GitHub Token`.
    - Paste your PAT and press Enter.

## Commands
| Command | Description |
| --- | --- |
| `Copilot Cost Monitor: Refresh Cost` | Manually triggers an API fetch. |
| `Copilot Cost Monitor: Set GitHub Token` | Securely saves your PAT. |
| `Copilot Cost Monitor: Create GitHub Token` | Opens GitHub to generate a PAT with correct scopes. |
| `Copilot Cost Monitor: Clear GitHub Token` | Removes your PAT from storage. |

## Settings
| Setting | Default | Description |
| --- | --- | --- |
| `copilotCostMonitor.githubUsername` | `""` | Your GitHub username. |
| `copilotCostMonitor.pollingInterval` | `300` | Frequency of updates in seconds (minimum 5). |
| `copilotCostMonitor.warningThreshold` | `10` | Cost ($) to trigger Yellow status. |
| `copilotCostMonitor.errorThreshold` | `20` | Cost ($) to trigger Red status. |

## License
[MIT](LICENSE.md)
