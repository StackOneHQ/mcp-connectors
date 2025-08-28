// Extracted constants from applescript.ts (no logic changes)

export const DEFAULT_TIMEOUT = 45_000;
export const DEFAULT_MAX_BUFFER = 512_000;
export const DEFAULT_DENYLIST = [
  "do shell script",
  "execute javascript",
  "keystroke",
  "key code",
  "with administrator privileges",
];

// Configuration for various utilities
export const CALENDAR_CONFIG = {
  TIMEOUT_MS: 10000,
  MAX_EVENTS: 20,
};

export const CONTACTS_CONFIG = {
  MAX_CONTACTS: 1000,
  TIMEOUT_MS: 10000,
};

export const MAIL_CONFIG = {
  MAX_EMAILS: 20,
  MAX_CONTENT_PREVIEW: 300,
  TIMEOUT_MS: 10000,
};

export const NOTES_CONFIG = {
  MAX_NOTES: 50,
  MAX_CONTENT_PREVIEW: 200,
  TIMEOUT_MS: 8000,
};

export const REMINDERS_CONFIG = {
  MAX_REMINDERS: 50,
  MAX_LISTS: 20,
  TIMEOUT_MS: 8000,
};

export const MESSAGES_CONFIG = {
  MAX_MESSAGES: 50,
  MAX_CONTENT_PREVIEW: 300,
  TIMEOUT_MS: 8000,
};

export const WEBSEARCH_CONFIG = {
  MAX_RESULTS: 3,
  TIMEOUT: 10000,
};

// Enhanced Configuration for comprehensive automation
export const SYSTEM_CONFIG = {
  SCREENSHOT_TIMEOUT: 30000,
  BRIGHTNESS_STEPS: 16,
  DEFAULT_SHELL_PATH: 'PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"',
};

export const GUI_CONFIG = {
  UI_ELEMENT_TIMEOUT: 5000,
  KEYSTROKE_DELAY: 0.1,
  CLICK_DELAY: 0.1,
  MAX_UI_DEPTH: 10,
};

export const MUSIC_CONFIG = {
  SEARCH_TIMEOUT: 15000,
  PLAYBACK_TIMEOUT: 5000,
  MAX_RESULTS: 50,
  DEFAULT_SEARCH_TYPE: "name",
};

export const WORKFLOW_CONFIG = {
  DEFAULT_VOLUME: 20,
  DEFAULT_MUSIC_KEYWORD: "focus",
  DEFAULT_APPS: ["Calendar", "Reminders", "Notes"],
  SETUP_TIMEOUT: 60000,
};

