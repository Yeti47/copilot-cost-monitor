import * as vscode from 'vscode';
import { fetchCopilotCost } from './api';
import {
    CONFIG_SECTION, CONFIG_USERNAME, CONFIG_POLLING, CONFIG_WARNING, CONFIG_ERROR,
    COMMAND_REFRESH, COMMAND_SET_TOKEN, COMMAND_DELETE_TOKEN, COMMAND_CREATE_TOKEN,
    SECRET_KEY_TOKEN, DEFAULT_POLLING_INTERVAL, MIN_POLLING_INTERVAL,
    DEFAULT_WARNING_THRESHOLD, DEFAULT_ERROR_THRESHOLD, CREATE_TOKEN_URL
} from './constants';

let myStatusBarItem: vscode.StatusBarItem;
let pollingIntervalId: NodeJS.Timeout | undefined;
let lastUpdateTime: number = 0;
let currentETag: string | null = null;
let lastKnownCost: number | null = null;

// Config interface now just holds what comes from settings.json
// Token is fetched separately.
interface ExtensionConfig {
    username: string;
    pollingInterval: number;
    warningThreshold: number;
    errorThreshold: number;
}

function getExtensionConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return {
        username: config.get<string>(CONFIG_USERNAME, ''),
        pollingInterval: config.get<number>(CONFIG_POLLING, DEFAULT_POLLING_INTERVAL),
        warningThreshold: config.get<number>(CONFIG_WARNING, DEFAULT_WARNING_THRESHOLD),
        errorThreshold: config.get<number>(CONFIG_ERROR, DEFAULT_ERROR_THRESHOLD)
    };
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "copilot-cost-monitor" is now active!');

    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_REFRESH, () => {
        updateCost(context, true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_SET_TOKEN, async () => {
        const token = await vscode.window.showInputBox({
            placeHolder: 'e.g. ghp_...',
            prompt: 'Enter your GitHub Personal Access Token',
            password: true,
            ignoreFocusOut: true
        });
        if (token) {
            await context.secrets.store(SECRET_KEY_TOKEN, token);
            vscode.window.showInformationMessage('GitHub Token saved securely.');
            updateCost(context, true);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_DELETE_TOKEN, async () => {
        await context.secrets.delete(SECRET_KEY_TOKEN);
        vscode.window.showInformationMessage('GitHub Token cleared.');
        updateCost(context, true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(COMMAND_CREATE_TOKEN, async () => {
        const url = vscode.Uri.parse(CREATE_TOKEN_URL);
        await vscode.env.openExternal(url);
    }));

    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = COMMAND_REFRESH;
    context.subscriptions.push(myStatusBarItem);

    // Initial update
    updateCost(context);

    // Watch for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(CONFIG_SECTION)) {
            setupPolling(context);
            updateCost(context);
        }
    }));

    // Watch for window state changes
    context.subscriptions.push(vscode.window.onDidChangeWindowState(state => {
        if (state.focused) {
            const config = getExtensionConfig();
            const validInterval = Math.max(config.pollingInterval, MIN_POLLING_INTERVAL) * 1000;

            if (Date.now() - lastUpdateTime > validInterval) {
                console.log('Window focused and interval expired, updating cost...');
                updateCost(context);
            }
        }
    }));

    setupPolling(context);
}

function setupPolling(context: vscode.ExtensionContext) {
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = undefined;
    }

    const config = getExtensionConfig();
    const safeInterval = Math.max(config.pollingInterval, MIN_POLLING_INTERVAL) * 1000;

    pollingIntervalId = setInterval(() => {
        if (vscode.window.state.focused) {
            updateCost(context);
        } else {
            console.log('Skipping polling update because window is not focused');
        }
    }, safeInterval);
}

async function updateCost(context: vscode.ExtensionContext, showNotification = false) {
    const config = getExtensionConfig();
    const token = await context.secrets.get(SECRET_KEY_TOKEN);

    if (!config.username || !token) {
        myStatusBarItem.text = `$(alert) Copilot Config Missing`;
        myStatusBarItem.tooltip = "Click to configure GitHub Username and Token";

        // If specific piece is missing, guide the user
        if (!token) {
            myStatusBarItem.command = COMMAND_SET_TOKEN;
            myStatusBarItem.tooltip = "Click to set GitHub Token";
        } else {
            myStatusBarItem.command = 'workbench.action.openSettings';
        }

        myStatusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        myStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        myStatusBarItem.show();

        if (showNotification) {
            if (!token) {
                const selection = await vscode.window.showErrorMessage("Copilot Cost Monitor: GitHub Token is missing.", "Set Token");
                if (selection === "Set Token") {
                    vscode.commands.executeCommand(COMMAND_SET_TOKEN);
                }
            } else {
                vscode.window.showErrorMessage("Copilot Cost Monitor: Please configure your GitHub Username in settings.");
            }
        }
        return;
    }

    myStatusBarItem.command = COMMAND_REFRESH;

    if (showNotification) {
        myStatusBarItem.text = `$(sync~spin) Copilot Cost...`;
        myStatusBarItem.color = undefined;
        myStatusBarItem.show();
    }

    try {
        const result = await fetchCopilotCost(config.username, token, currentETag);

        let cost: number;
        if (result.cost !== null) {
            cost = result.cost;
            currentETag = result.etag;
            lastKnownCost = cost;
        } else if (lastKnownCost !== null) {
            console.log('Restoring cost from cache');
            cost = lastKnownCost;
        } else {
            // Should not happen unless API returns 304 on very first call without local cache (unlikely)
            // But if it does, we restart etag.
            currentETag = null;
            return updateCost(context, showNotification); // Retry without etag
        }

        lastUpdateTime = Date.now();
        const formattedCost = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost);
        myStatusBarItem.text = `$(github) ${formattedCost}`;
        myStatusBarItem.tooltip = "Current Copilot Premium Cost (Billing Period)";

        if (cost >= config.errorThreshold) {
            myStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            myStatusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        } else if (cost >= config.warningThreshold) {
            myStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            myStatusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        } else {
            myStatusBarItem.backgroundColor = undefined;
            myStatusBarItem.color = undefined;
        }
        myStatusBarItem.show();

        if (showNotification) {
            vscode.window.showInformationMessage(`Copilot Cost Updated: ${formattedCost}`);
        }
    } catch (error: any) {
        myStatusBarItem.text = `$(error) Error`;
        myStatusBarItem.tooltip = `Copilot Billing Error: ${error.message}`;
        myStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        myStatusBarItem.show();
        if (showNotification) {
            vscode.window.showErrorMessage(`Copilot Cost Monitor Error: ${error.message}`);
        }
    }
}

export function deactivate() {
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
    }
}
