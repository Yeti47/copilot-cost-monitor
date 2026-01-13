export const CONFIG_SECTION = 'copilotCostMonitor';
export const CONFIG_USERNAME = 'githubUsername';
export const CONFIG_POLLING = 'pollingInterval';
export const CONFIG_WARNING = 'warningThreshold';
export const CONFIG_ERROR = 'errorThreshold';

export const COMMAND_REFRESH = 'copilotCostMonitor.refresh';
export const COMMAND_SET_TOKEN = 'copilotCostMonitor.setToken';
export const COMMAND_DELETE_TOKEN = 'copilotCostMonitor.deleteToken';
export const COMMAND_CREATE_TOKEN = 'copilotCostMonitor.createToken';

export const SECRET_KEY_TOKEN = 'copilotCostMonitor.githubToken';

export const DEFAULT_POLLING_INTERVAL = 300;
export const MIN_POLLING_INTERVAL = 5;
export const DEFAULT_WARNING_THRESHOLD = 10;
export const DEFAULT_ERROR_THRESHOLD = 20;

export const CREATE_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=Copilot%20Cost%20Monitor&description=Plan%20read%20permissions%20for%20Copilot%20Cost%20Monitor%20Extension&plan=read';
