# AppleScript MCP Connector

**Comprehensive macOS automation via AppleScript** with strong guardrails, clear schemas, and extensive app coverage. Designed for JSON‑first automation, natural‑language orchestration, and seamless integration with modern productivity workflows.

## What It Does

### System Control

- **System Management**: volume, brightness, shutdown/restart/sleep, screenshots, app lifecycle
- **Application Orchestration**: Safari, Music, Mail, Messages, Contacts, Calendar, Reminders
- **Productivity Suite**: Numbers (spreadsheets), Keynote (presentations), Pages (documents)
- **Knowledge Management**: Apple Notes, Obsidian integration with universal note creation
- **File Management**: Finder operations, folder creation, trash management, file preview

### Web Research & Content

- **Headless Chrome Fetch**: **Preferred method** for web research, content extraction, and scraping
- **Safari Integration**: Tab management, content extraction, browsing session control
- **Smart Web Search**: Built-in web search with configurable result limits

### Workflow Orchestration

- **End-to-End Automation**: Complete workflows via `workflow_full_json`
- **Natural Language Router**: Intent-based automation via `execute_query`
- **Workspace Setup**: Volume control, music activation, app launching in one call

### Security & Safety

- **Comprehensive Guardrails**: Denylist scanning, path allowlists/blocklists
- **Permission Management**: Built-in diagnostics and remediation guidance
- **Sandboxed Operations**: File system access controls with explicit path validation

## Architecture

### Directory Structure

```
AppleScript/
├── helpers/           # Core utilities and shared functionality
│   ├── builders.ts    # AppleScript code generators for complex operations
│   ├── osascript.ts   # AppleScript execution engine with error handling
│   ├── permissions.ts # TCC/Automation permission diagnostics
│   └── utils.ts       # String escaping, date parsing, result formatting
├── tools/             # Modular tool implementations (one per domain)
│   ├── diagnostics.ts # Health checks, script compilation, permission diagnosis
│   ├── system.ts      # System controls (volume, brightness, power, screenshots)
│   ├── safari.ts      # Safari tab management and integration
│   ├── web.ts         # Headless Chrome fetch and web research
│   ├── music.ts       # Music app search and playback control
│   ├── note_selector.ts # Universal note creation with app choice popup
│   ├── notes.ts       # Apple Notes with markdown conversion
│   ├── obsidian.ts    # Full Obsidian integration (create/append/open)
│   ├── numbers.ts     # Spreadsheet creation and manipulation
│   ├── keynote.ts     # Presentation creation with themes
│   ├── pages.ts       # Word processing document creation
│   ├── comm.ts        # Mail, Messages, Contacts integration
│   ├── calendar_reminders.ts # Calendar events and reminder management
│   ├── finder.ts      # File system operations via Finder
│   ├── maps.ts        # Location search and directions
│   ├── workflow.ts    # Orchestration and workspace setup
│   └── misc.ts        # Additional utilities and helpers
└── applescript.ts     # Main connector configuration and tool registration
```

### Design Principles

- **Modular Architecture**: Each tool group is self-contained with clear boundaries
- **Fail-Safe Operations**: Comprehensive error handling with actionable remediation
- **Performance Optimized**: Efficient AppleScript generation with minimal overhead
- **Security First**: Path validation, script sanitization, permission verification

## Requirements & Installation

### System Requirements

- **macOS 10.14+** (Mojave or later recommended)
- **AppleScript Support**: Built into macOS via `osascript`
- **Target Applications**: Install the apps you want to automate (Safari, Music, etc.)

### Web Research Dependencies

- **Google Chrome or Chromium** (recommended for optimal `headless_chrome_fetch` performance)
  - **Preferred option**: [Google Chrome](https://www.google.com/chrome/)
  - **Alternative**: [Chromium](https://www.chromium.org/)
  - **Homebrew**: `brew install --cask google-chrome`
  - **Fallback**: Safari integration available if Chrome not installed

### Optional Applications

- **Obsidian** (for knowledge management): [Download](https://obsidian.md/)
- **Things 3** (for advanced task management): Mac App Store
- **Any iWork app** you want to automate (Numbers, Keynote, Pages)

### Quick Setup

1. **Optional**: Install Google Chrome for best web research experience (Safari works as fallback)
2. Grant necessary permissions when prompted (see Permissions section below)
3. Test with `diagnose_permissions` tool for any permission issues

## Permissions & Security Setup

### Essential Permissions

#### Automation Access

**System Settings → Privacy & Security → Automation**

- Enable automation access for your MCP client (e.g., Claude Desktop, VS Code, etc.)
- Grant access to specific apps as prompted (Safari, Music, Calendar, etc.)

#### Calendar & Reminders

**System Settings → Privacy & Security → Calendars/Reminders**

- Required for `calendar_create_event_iso` and `reminders_create_batch`
- Grant access to your MCP client application

#### Safari Advanced Features

**Safari → Settings → Advanced**

1. Enable "Show Develop menu in menu bar"
2. **Develop Menu → Allow JavaScript from Apple Events**
3. Required for `safari_extract_content` functionality

#### Full Disk Access (for Messages)

**System Settings → Privacy & Security → Full Disk Access**

- Required only for `messages_read` functionality
- Add your MCP client to enable message history access

### Permission Troubleshooting

- **Use `diagnose_permissions`** for automatic permission diagnostics
- **Permission denied errors**: macOS will often show permission prompts automatically
- **Stuck on permissions**: Quit and restart your MCP client, then retry
- **Advanced debugging**: Check Console.app for TCC (Transparency, Consent, Control) messages

### Security Features

- **Script Sanitization**: All user-provided scripts are checked against a denylist
- **Path Sandboxing**: File system access restricted to configured allowed paths
- **App Allowlists**: Optional restriction to specific applications only
- **No Shell Access**: Pure AppleScript approach avoids shell script vulnerabilities

## Configuration Options

### Credential Schema

Configure the connector through your MCP client's credential settings:

```typescript
{
  allowApps?: string[]       // Optional app allowlist (advisory only)
  denylist?: string[]        // Script tokens blocked by run_applescript
  allowedPaths?: string[]    // File system paths allowed for operations
  blockedPaths?: string[]    // File system paths explicitly blocked
  defaultTimeoutMs?: number  // Default AppleScript execution timeout
}
```

### Configuration Examples

#### Basic Setup (Recommended)

```json
{
  "defaultTimeoutMs": 30000
}
```

#### Security-Focused Setup

```json
{
  "allowApps": ["Safari", "Music", "Calendar", "Notes", "Numbers"],
  "allowedPaths": ["/Users/yourname/Documents", "/Users/yourname/Desktop"],
  "blockedPaths": ["/System", "/Library", "/usr"],
  "denylist": ["rm ", "sudo", "delete", "destroy"]
}
```

#### Development/Testing Setup

```json
{
  "defaultTimeoutMs": 60000,
  "allowedPaths": ["/Users/yourname"]
}
```

### Path Security Details

- **`allowedPaths`**: If specified, file operations are restricted to these path prefixes
- **`blockedPaths`**: Explicitly forbidden paths (checked first, overrides allowedPaths)
- **Path Resolution**: All paths are resolved to absolute paths before checking
- **Affected Tools**: `finder_*`, `preview_*`, and any tools with `savePath` parameters

## Return Values & Error Handling

### Success Response Format

All tools return structured JSON with consistent formatting:

```typescript
// Simple success
{
  "ok": true,
  "data": {
    "result": "Created spreadsheet with 5 columns and 6 rows",
    "mode": "single-sheet",
    "savePath": "/Users/name/Desktop/Analysis.numbers"
  }
}

// Rich metadata response
{
  "ok": true,
  "data": {
    "tracks": [
      {
        "persistentId": "12345",
        "name": "Bad Romance",
        "artist": "Lady Gaga",
        "album": "The Fame Monster",
        "duration": "4:54"
      }
    ],
    "totalFound": 1
  }
}
```

### Error Response Format

Failures include actionable error messages and diagnostic information:

```typescript
{
  "ok": false,
  "error": "AppleScript execution failed",
  "meta": {
    "stderr": "Music got an error: Track not found (-1728)",
    "suggestion": "Check if the track exists in your Music library",
    "tool": "music_play"
  }
}
```

### Common Error Patterns & Solutions

| Error Type            | Example                      | Solution                                                    |
| --------------------- | ---------------------------- | ----------------------------------------------------------- |
| **Permission Denied** | `"Automation access denied"` | Run `diagnose_permissions`, grant access in System Settings |
| **App Not Running**   | `"Calendar got an error"`    | Launch the target app, or use `app_activate` tool first     |
| **Invalid Path**      | `"Path not allowed"`         | Check `allowedPaths`/`blockedPaths` in configuration        |
| **Chrome Not Found**  | `"Chrome binary not found"`  | Install Chrome or provide `chromePath` parameter            |
| **Timeout**           | `"Script timed out"`         | Increase `timeoutMs` parameter or check system load         |

## Common Usage Patterns

### Music Playback Workflow

```
1. music_search → pick persistentId from results → music_play
```

**Example**: Find and play a specific track

- `music_search` with query "Pink Pony Club Chappell Roan"
- Select `persistentId` from returned tracks
- `music_play` using the selected `persistentId`

### Web Research & Note Taking

```
1. headless_chrome_fetch (preferred) → create_note_with_choice → finder_ensure_folders_tree
```

**Example**: Research and organize information

- `headless_chrome_fetch` to extract content from websites
- `create_note_with_choice` to save research with app popup selection
- `finder_ensure_folders_tree` to organize research folders

### Project Planning & Management

```
1. numbers_create_and_populate → reminders_create_batch → calendar_create_event_iso → keynote_build_presentation
```

**Example**: Complete project setup

- Create spreadsheet with project tasks and timeline
- Generate reminder items for key milestones
- Schedule calendar events for meetings/deadlines
- Build presentation deck for project kickoff

### Daily Workspace Setup

```
1. workflow_setup_workspace → safari_open_many → app_activate
```

**Example**: Morning routine automation

- Set system volume and start focus music
- Open essential productivity apps
- Launch research tabs in Safari
- Activate primary work applications

## Workflow Orchestration

### `workflow_full_json`

One‑call orchestration. Include only the sections you need.

```
{
  "setup": { "volume": 20, "musicKeyword": "focus", "apps": ["Calendar","Reminders","Notes"] },
  "reminders": {
    "list": "Work",
    "items": [
      { "title": "Send weekly report", "priority": "high" },
      { "title": "Book meeting room", "due": "2025-09-01 10:00" }
    ]
  },
  "note": { "title": "Meeting Notes", "markdown": "# Agenda\n- Updates", "append": true },
  "numbers": { "headers": ["Task","Owner"], "rows": [["Spec","Alex"]], "savePath": "/Users/me/Documents/plan.numbers" },
  "keynote": {
    "theme": "White",
    "slides": [ { "title": "Quarterly Review", "bullets": ["Revenue","Roadmap"] } ],
    "fileName": "Q3.key" , "savePath": "/Users/me/Documents"
  },
  "calendar": { "title": "Review", "start": "2025-09-01 14:00", "end": "2025-09-01 15:00", "location": "HQ" },
  "folders": ["/Users/me/Projects/NewApp/docs"],
  "urls": ["https://news.ycombinator.com"]
}
```

### `execute_query`

Lightweight NL router for common intents (e.g., simple calendar/note creation) when you don’t want to fully structure `workflow_full_json`.

## Comprehensive Tool Reference

### Diagnostics & Health

Essential tools for troubleshooting and system validation.

**`health_check`**: `{}`

- Verifies osascript availability and basic macOS compatibility

**`compile_applescript`**: `{ "script": string }`

- Syntax-check AppleScript code without execution (uses osacompile)

**`run_applescript`**: `{ "script": string, "timeoutMs"?: number, "dryRun"?: boolean }`

- Execute custom AppleScript with safety checks and denylist filtering

**`diagnose_permissions`**: `{}`

- Automatic permission diagnostics with actionable remediation steps

### System Control & Management

Core system operations and application lifecycle management.

**`system_shutdown`**: `{ "force"?: boolean, "delay"?: number }`

- Shutdown system with optional force and delay parameters

**`system_restart`**: `{ "force"?: boolean, "delay"?: number }`

- Restart system with optional force and delay parameters

**`system_sleep`**: `{ "displaysOnly"?: boolean }`

- Put system or displays to sleep

**`volume_get_info`**: `{}`

- Get comprehensive volume information (output, input, alert levels)

**`volume_set_level`**: `{ "level": number, "type"?: "output"|"input"|"alert" }`

- Set volume level (0-100) for output, input, or alert sounds

**`brightness_set_level`**: `{ "level": number }`

- Set display brightness (0.0-1.0)

**`take_screenshot_enhanced`**: `{ "path"?: string, "interactive"?: boolean, "window"?: boolean, "selection"?: boolean, "delay"?: number }`

- Take screenshots with multiple capture modes and optional save path

**`run_shortcut`**: `{ "shortcutName": string, "input"?: string }`

- Execute macOS Shortcuts by name with optional input

**`app_activate`**: `{ "appName": string }`

- Bring application to front/activate

**`app_quit`**: `{ "appName": string }`

- Quit specific application

**`app_is_running`**: `{ "appName": string }`

- Check if application is currently running

**`system_get_running_applications`**: `{}`

- Get list of all currently running applications

### Web Research & Browser Control

**Modern web research requires understanding which sites work reliably vs which are typically blocked by anti-bot systems.**

#### Site Compatibility Guide

**RELIABLE (Recommended for automation):**

- **News**: BBC, Reuters, AP News, NPR, local newspapers
- **Educational**: Wikipedia, Britannica, university sites, academic papers
- **Technical**: GitHub, Stack Overflow, MDN, official documentation
- **Government**: .gov sites, official agencies, public databases
- **Reference**: Dictionaries, specialized databases, company pages
- **Blogs**: Medium, personal/technical blogs

**MIXED RESULTS (Moderate bot detection):**

- **Search Engines**: Google, DuckDuckGo, Bing - often blocked
- **Social Media**: Twitter, Facebook, LinkedIn - high detection
- **E-commerce**: Amazon, eBay - sophisticated protection
- **Forums**: Reddit, specialized communities - variable blocking

**TYPICALLY BLOCKED (Use alternatives):**

- **Financial**: Banking, trading platforms - strict security
- **Interactive**: Web apps, dashboards, admin panels
- **Authenticated**: Sites requiring login/API keys
- **Streaming**: YouTube, Netflix - content protection policies

#### Core Tools

**`headless_chrome_fetch`**: `{ "url": string, "chromePath"?: string, "userAgent"?: string, "extraArgs"?: string[], "timeoutMs"?: number, "maxChars"?: number }`

- **ALWAYS PREFERRED** for automated content extraction and research
- **Background operation** - no GUI permissions required
- **JavaScript support** - renders modern dynamic websites
- **Anti-detection included** - randomized user agents, stealth flags, human delays
- **Smart URL optimization** - automatically improves search engine URLs
- **Error handling** - provides specific guidance when sites block access
- **Default maxChars**: 20,000 characters (adjust only if needed for token limits)

**`safari_open_many`**: `{ "urls": string[], "inNewWindow"?: boolean }`

- **Use ONLY for interactive browsing** where user needs to click/scroll/explore
- **Requires permissions** - System Settings → Privacy & Security → Automation
- **Best for**: research starting points, bookmarking, manual exploration

**`safari_extract_content`**: `{ "scope"?: "current"|"frontWindow"|"allWindows", "include"?: ("url"|"title"|"text"|"selection"|"html"|"meta"|"links")[], "maxCharsPerField"?: number, "urlIncludes"?: string, "dryRun"?: boolean }`

- Extract content from Safari tabs that are already open
- **Requires**: Safari → Develop → "Allow JavaScript from Apple Events"
- **Use case**: Capture findings from interactive browsing sessions

**`web_search`**: `{ "query": string, "numResults"?: number }`

- Opens Google search in Safari for user to browse results manually
- **Not for automation** - designed for user interaction

#### Best Practices for Web Research

1. **Start with reliable sources**: Wikipedia, BBC, government sites for foundation
2. **Use direct URLs**: Prefer article links over search engine results
3. **Handle bot detection gracefully**: When blocked, suggest alternative sources
4. **Capture immediately**: Use `create_note_with_choice` to save findings right away

**Typical Research Workflow:**

```
headless_chrome_fetch (primary content) →
create_note_with_choice (capture findings) →
safari_open_many (if user needs interactive exploration)
```

#### Web Research Troubleshooting

**Common Issues and Solutions:**

**"Chrome not found" Error:**

- **Problem**: `headless_chrome_fetch` can't locate Chrome binary
- **Solutions**:
  - Install Google Chrome: Download from [google.com/chrome](https://www.google.com/chrome/)
  - Use Homebrew: `brew install --cask google-chrome`
  - Specify path manually: `{ "chromePath": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" }`
  - **Fallback**: Use `safari_open_many` + `safari_extract_content` workflow

**"Bot detection triggered" Error:**

- **Problem**: Website detected automated access and blocked the request
- **What this means**: Modern websites actively block headless browsers
- **Solutions**:
  - **Try alternative sources**: Wikipedia instead of Google search, BBC instead of social media
  - **Use different site types**: Educational/government sites are more permissive
  - **Fallback to Safari**: Use `safari_open_many` for interactive browsing, then `safari_extract_content`
  - **Don't retry the same site** - it will likely block again

**"Empty response" or Minimal Content:**

- **Problem**: Site loaded but returned very little content
- **Possible causes**: JavaScript dependency, geo-blocking, or soft blocking
- **Solutions**:
  - Check if site works in regular browser first
  - Try different user agent: `{ "userAgent": "Mozilla/5.0..." }`
  - Use Safari approach: `safari_open_many` → wait for load → `safari_extract_content`
  - Find alternative sources for the same information

**⏱"Timeout" Error:**

- **Problem**: Site took too long to respond
- **Solutions**:
  - Increase timeout: `{ "timeoutMs": 60000 }` (60 seconds)
  - Try during off-peak hours
  - Use faster alternative sites (e.g., Wikipedia is typically faster than complex news sites)

**"Permission denied" (Safari tools):**

- **Problem**: Safari automation permissions not granted
- **Solutions**:
  - **System Settings** → **Privacy & Security** → **Automation**
  - Enable automation for your MCP client app
  - For content extraction: Safari → **Develop** menu → **Allow JavaScript from Apple Events**
  - Alternative: Use `headless_chrome_fetch` which doesn't need these permissions

**"Site requires login" or Authentication:**

- **Problem**: Content behind login/paywall
- **Solutions**:
  - Find alternative open sources
  - Use archive sites: `web.archive.org/web/*/[URL]`
  - Try academic mirrors or government data sources
  - **Don't attempt automated login** - violates terms of service

**Choosing the Right Approach:**

| Scenario                    | Best Tool                 | Reason                                      |
| --------------------------- | ------------------------- | ------------------------------------------- |
| Research article content    | `headless_chrome_fetch`   | No permissions needed, handles JavaScript   |
| Blocked by bot detection    | `safari_open_many`        | Human-like browsing avoids detection        |
| Need to interact with site  | Safari workflow           | User can click, scroll, navigate naturally  |
| Site has complex JavaScript | `headless_chrome_fetch`   | Full browser engine renders dynamic content |
| Quick fact lookup           | Wikipedia/BBC direct URLs | Reliable, fast, automation-friendly         |

### Music Control & Playback

Complete Music app integration for search, playback, and playlist management.

**`music_search`**: `{ "query": string, "searchBy"?: "any"|"name"|"artist"|"album", "limit"?: number }`

- Search Music library with flexible criteria
- Returns tracks with persistentId, name, artist, album, duration
- Use persistentId for reliable playback with `music_play`

**`music_play`**: `{ "persistentId": string }` | `{ "name": string, "artist"?: string, "album"?: string }`

- Play specific track using persistentId (preferred) or search criteria
- Always use `music_search` → `music_play` workflow for best results

**`music_create_playlist`**: `{ "playlistName": string }`

- Create new empty playlist in Music app

**`music_add_tracks_to_playlist`**: `{ "playlistName": string, "trackQueries": string[] }`

- Add multiple tracks to existing playlist using search queries

**`music_control_playback`**: `{ "action": "play"|"pause"|"next"|"previous"|"stop" }`

- Control current Music app playback state

### Knowledge Management & Note Taking

Universal note creation with support for both Apple Notes and Obsidian.

**`create_note_with_choice`**: `{ "title": string, "content": string, "folder"?: string, "noteApp"?: "apple_notes"|"obsidian"|"ask" }`

- **PREFERRED** universal note creation tool with app selection popup
- Automatically converts markdown for Apple Notes, preserves for Obsidian
- Smart app suggestion based on content (vault → Obsidian, simple → Apple Notes)

**`notes_from_markdown`**: `{ "title": string, "markdown": string, "folder"?: string, "append"?: boolean }`

- Direct Apple Notes creation with markdown-to-rich-text conversion
- Supports headers, bold, italic, bullets with visual formatting

**`notes_create_enhanced`**: `{ "title": string, "body": string, "folderName"?: string }`

- Enhanced Apple Notes creation with folder organization

**`obsidian_create_note`**: `{ "title": string, "content": string, "vault"?: string, "folder"?: string }`

- Create new note in Obsidian with full markdown support
- Supports [[links]], tags, code blocks, and all Obsidian syntax

**`obsidian_append_note`**: `{ "title": string, "content": string, "vault"?: string, "folder"?: string, "heading"?: string }`

- Append content to existing Obsidian note; creates if not found
- Optionally append under specific heading for organized content

**`obsidian_open_note`**: `{ "title": string, "vault"?: string, "folder"?: string, "line"?: number }`

- Open existing note in Obsidian interface with optional line jump

### Productivity Suite - Spreadsheets (Numbers)

Professional spreadsheet creation with single/multi-sheet support and auto-save.

**`numbers_create_and_populate`**:

- Single sheet: `{ "headers": string[], "rows": string[][], "savePath"?: string }`
- Multi-sheet: `{ "sheets": [{ "name": string, "headers": string[], "rows"?: string[][] }], "savePath"?: string }`
- Creates new Numbers document with data and optional file save
- Auto-saves to specified path with save-close-reopen workflow

**`numbers_add_sheet`**: `{ "sheetName": string, "headers": string[], "rows"?: string[][], "documentName"?: string }`

- Add new sheet to existing Numbers document
- Works with active document or specify by name

### Productivity Suite - Presentations (Keynote)

Professional presentation creation with themes, layouts, and auto-save.

**`keynote_build_presentation`**: `{ "theme"?: string, "slides": [{ "layout"?: string, "title"?: string, "subtitle"?: string, "bullets"?: string[] }], "savePath"?: string, "fileName"?: string }`

- Create complete Keynote presentation with professional themes
- **Available themes**: Black, White, Gradient, Photo Essay, Classic, Slate, Cream Paper, Artisan, Improv, Showroom, Renaissance, Photo Portfolio, Editorial, Kyoto, Brushed Canvas, Typeset, Moroccan, Craft, Industrial, Modern Portfolio, Harmony, Graph Paper, Blueprint, Formal, Leather Book, Vintage, Hard Cover, Linen Book, Chalkboard, Parchment, Sal Theme
- Auto-saves to specified path with save-close-reopen workflow

### Productivity Suite - Documents (Pages)

Word processing document creation with markdown support and auto-save.

**`pages_create_document`**: `{ "title"?: string, "content"?: string, "template"?: string, "savePath"?: string, "isMarkdown"?: boolean }`

- Create Pages documents with optional markdown conversion
- When `isMarkdown=true`, converts markdown to structured plain text formatting
- Auto-saves to specified path with save-close-reopen workflow

### Communication & Contacts

Email, messaging, and contact management integration.

**`mail_send`**: `{ "to": string, "subject": string, "body": string, "cc"?: string, "bcc"?: string }`

- Send email through Mail app with full recipient options
- Supports rich text content in body

**`messages_send`**: `{ "phoneNumber": string, "message": string }`

- Send text message to phone number via Messages app
- Uses system SMS/iMessage routing automatically

**`messages_read`**: `{ "phoneNumber": string, "limit"?: number }`

- Read message history for specific phone number (requires Full Disk Access)
- Returns recent messages with timestamps and content

**`contacts_find_number`**: `{ "name": string }`

- Find phone number(s) for contact by name search
- Returns all matching phone numbers for the contact

**`contacts_create_contact`**: `{ "firstName": string, "lastName"?: string, "email"?: string, "phone"?: string, "company"?: string }`

- Create new contact in Contacts app with comprehensive details

### Scheduling & Task Management

Comprehensive calendar and reminder management with flexible date/time support.

**`calendar_create_event_iso`**: `{ "title": string, "start": string, "end"?: string, "durationMinutes"?: number, "allDay"?: boolean, "alertMinutesBefore"?: number, "location"?: string, "description"?: string, "calendarName"?: string }`

- Create calendar events with flexible date/time formats
- **Accepted formats**: `YYYY-MM-DD` (all-day), `YYYY-MM-DD HH:MM`, or full ISO8601 with timezone
- **Time handling**: Parses timezone offsets and normalizes to local time
- **Duration**: Use `end` time or `durationMinutes` (ignored for all-day events)

**`calendar_get_events`**: `{ "start": string, "end": string, "calendarName"?: string }`

- Retrieve calendar events between specified dates
- Same flexible date format support as create event
- Optional calendar name filtering

**`reminders_create_batch`**: `{ "list"?: string, "items": [{ "title": string, "notes"?: string, "due"?: string, "priority"?: "low"|"medium"|"high" }] }`

- Create multiple reminders in single operation for efficiency
- Supports custom list names and comprehensive reminder metadata

**`reminders_create_enhanced`**: `{ "name": string, "listName"?: string, "notes"?: string, "dueDate"?: string, "priority"?: "low"|"medium"|"high" }`

- Create single reminder with enhanced options and metadata

### File System & Finder Operations

Secure file system operations with path validation and safety controls.

**`finder_ensure_folders_tree`**: `{ "basePath": string }`

- Create nested folder structure if missing
- Respects `allowedPaths`/`blockedPaths` configuration for security
- Never deletes or renames existing files/folders

**`finder_move_to_trash`**: `{ "path": string }`

- Move file or folder to Trash via Finder (recoverable deletion)
- Path validation enforced via allowlist/blocklist settings

**`finder_get_selection`**: `{}`

- Get currently selected items in Finder
- Returns paths and basic metadata for selected items

**`preview_open_file`**: `{ "filePath": string }`

- Open file in Preview app for viewing
- Subject to path security restrictions

### Location & Navigation

Apple Maps integration for location search and navigation.

**`maps_search`**: `{ "query": string }`

- Search for locations, businesses, addresses using Apple Maps
- Returns location details and coordinates when available

**`maps_directions`**: `{ "fromAddress": string, "toAddress": string, "transportType"?: "driving"|"walking"|"transit" }`

- Get turn-by-turn directions between two addresses
- Supports multiple transportation modes with route optimization

### iWork Applications - Document Management

Complete document lifecycle management with opening and content reading capabilities.

#### Opening Documents

**`numbers_open`**: `{ "documentPath"?: string }`

- Open Numbers app with optional existing spreadsheet document
- If no path provided, creates new blank spreadsheet
- **Path security**: Subject to `allowedPaths`/`blockedPaths` configuration
- **Use case**: Resume work on existing financial models, data analysis sheets

**`keynote_open`**: `{ "presentationPath"?: string, "theme"?: string }`

- Open Keynote app with optional existing presentation document
- If no path provided, creates new blank presentation with optional theme
- **Available themes**: Same as `keynote_build_presentation` (White, Black, Slate, etc.)
- **Path security**: Subject to `allowedPaths`/`blockedPaths` configuration
- **Use case**: Resume editing presentations, quick theme-based presentation start

**`pages_open`**: `{ "documentPath"?: string, "template"?: string }`

- Open Pages app with optional existing document
- If no path provided, creates new blank document with optional template
- **Path security**: Subject to `allowedPaths`/`blockedPaths` configuration
- **Use case**: Resume document editing, template-based document creation

#### Reading Document Content

**`numbers_read`**: `{ "documentPath": string, "sheetName"?: string, "maxRows"?: number }`

- **Extract complete spreadsheet data** from Numbers documents
- **Content extracted**: Sheet names, headers, cell data, row/column counts
- **Selective reading**: Specify sheet name to read single sheet, or read all sheets
- **Performance limits**: Default 100 rows per sheet (max 1000), prevents memory issues
- **Returns**: Structured JSON with headers array and data rows array per sheet
- **Use case**: Analyze financial data, extract CSV-like data, read project tracking sheets

**`keynote_read`**: `{ "documentPath": string, "slideNumber"?: number, "includeNotes"?: boolean, "maxSlides"?: number }`

- **Extract complete presentation content** from Keynote documents
- **Content extracted**: Slide text content, presenter notes, slide numbers, presentation metadata
- **Selective reading**: Read specific slide or all slides (default max 50 slides)
- **Notes inclusion**: Optional presenter notes extraction (enabled by default)
- **Returns**: Structured JSON with presentation info and array of slide content
- **Use case**: Analyze presentation content, extract speaker notes, content review

**`pages_read`**: `{ "documentPath": string, "maxChars"?: number, "includeFormatting"?: boolean }`

- **Extract document text content** from Pages documents
- **Content extracted**: Full document text, character count, basic document metadata
- **Content limits**: Default 20,000 characters (max 50,000) to manage token usage
- **Optional formatting**: Basic paragraph count when `includeFormatting=true`
- **Returns**: Structured JSON with document metadata and full text content
- **Use case**: Analyze report content, extract text for processing, document review

### Additional Applications

Extended app integrations for specialized workflows.

**`photos_create_album`**: `{ "albumName": string }`

- Create new photo album in Photos app for organization

**`things_create_todo`**: `{ "title": string, "notes"?: string, "when"?: string, "deadline"?: string, "tags"?: string[] }`

- Create todo item in Things 3 app with comprehensive metadata
- Supports natural language scheduling and tag organization

## Practical Examples

### Research Workflow with Note Taking

```typescript
// 1. Extract content from website (preferred method)
headless_chrome_fetch({
  url: "https://example.com/research-article",
  maxChars: 10000,
});

// 2. Save research with app choice popup
create_note_with_choice({
  title: "Research: Article Title",
  content: "# Research Notes\n\n[extracted content here]",
  noteApp: "ask", // Shows popup to choose Apple Notes vs Obsidian
});

// 3. Organize research folders
finder_ensure_folders_tree({
  basePath: "/Users/yourname/Documents/Research/2025",
});
```

### Music Discovery and Playback

```typescript
// 1. Search for music
music_search({
  query: "Pink Pony Club Chappell Roan",
  searchBy: "any",
  limit: 5,
});

// 2. Play selected track using persistentId from results
music_play({
  persistentId: "12345-returned-from-search",
});
```

### Project Management Setup

```typescript
// 1. Create project spreadsheet
numbers_create_and_populate({
  headers: ["Task", "Owner", "Due Date", "Status"],
  rows: [
    ["Design mockups", "Alice", "2025-09-15", "In Progress"],
    ["API development", "Bob", "2025-09-20", "Not Started"],
  ],
  savePath: "/Users/yourname/Documents/Project-Plan.numbers",
});

// 2. Create project reminders
reminders_create_batch({
  list: "Work Projects",
  items: [
    {
      title: "Review design mockups",
      due: "2025-09-16 14:00",
      priority: "high",
    },
    {
      title: "API testing session",
      due: "2025-09-21 10:00",
      priority: "medium",
    },
  ],
});

// 3. Schedule project meeting
calendar_create_event_iso({
  title: "Project Kickoff Meeting",
  start: "2025-09-10 14:00",
  durationMinutes: 60,
  location: "Conference Room A",
  alertMinutesBefore: 15,
});
```

### Daily Workspace Setup

```typescript
workflow_setup_workspace({
  volume: 25,
  musicKeyword: "focus",
  apps: ["Calendar", "Notes", "Safari", "Terminal"],
});
```

### Resume Work on Existing Documents

```typescript
// Open existing project spreadsheet
numbers_open({
  documentPath: "/Users/yourname/Documents/Project-Budget.numbers"
});

// Continue working on presentation 
keynote_open({
  presentationPath: "/Users/yourname/Documents/Q4-Review.key"
});

// Edit existing report
pages_open({
  documentPath: "/Users/yourname/Documents/Annual-Report.pages"
});

// Or create new documents with specific themes/templates
keynote_open({
  theme: "Modern Portfolio"  // Creates new presentation with theme
});

pages_open({
  template: "Resume"  // Creates new document from template
});
```

### Document Analysis and Content Extraction

```typescript
// Analyze spreadsheet data from financial model
numbers_read({
  documentPath: "/Users/yourname/Documents/Q4-Budget.numbers",
  maxRows: 200  // Read up to 200 rows of data
});
// Returns: { sheets: { "Revenue": { headers: ["Month", "Amount"], data: [["Jan", "50000"], ...] } } }

// Extract presentation content for review
keynote_read({
  documentPath: "/Users/yourname/Documents/Board-Presentation.key",
  includeNotes: true,  // Include speaker notes
  maxSlides: 20
});
// Returns: { presentation: { title: "Board-Presentation", slideCount: 15 }, slides: [{ slideNumber: 1, content: ["Title Slide"], notes: "Remember to..." }] }

// Analyze report content
pages_read({
  documentPath: "/Users/yourname/Documents/Annual-Report.pages",
  maxChars: 30000,  // Limit to 30k characters
  includeFormatting: true
});
// Returns: { document: { title: "Annual-Report", characterCount: 25430 }, content: "Executive Summary...", paragraphs: 45 }

// Read specific spreadsheet sheet only
numbers_read({
  documentPath: "/Users/yourname/Documents/Sales-Data.numbers",
  sheetName: "Q4 Results",  // Only read this sheet
  maxRows: 50
});

// Read single presentation slide
keynote_read({
  documentPath: "/Users/yourname/Documents/Training.key",
  slideNumber: 5,  // Only read slide 5
  includeNotes: false
});
```

## Troubleshooting Guide

### Common Issues & Solutions

| Issue                    | Symptoms                               | Solution                                                                                                                      |
| ------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Permission Denied**    | "Automation access denied" errors      | 1. Run `diagnose_permissions`<br>2. System Settings → Privacy & Security → Automation<br>3. Enable access for your MCP client |
| **Safari Content Blank** | `safari_extract_content` returns empty | 1. Safari → Settings → Advanced<br>2. Enable "Show Develop menu"<br>3. Develop → "Allow JavaScript from Apple Events"         |
| **Chrome Not Found**     | "Chrome binary not found"              | 1. Install Google Chrome<br>2. Or provide `chromePath` parameter<br>3. Or use `brew install --cask google-chrome`             |
| **Messages Read Fails**  | Permission error on `messages_read`    | System Settings → Privacy & Security → Full Disk Access → Add your MCP client                                                 |
| **Path Access Denied**   | "Path not allowed" errors              | Check `allowedPaths`/`blockedPaths` in connector configuration                                                                |
| **Script Timeouts**      | Operations hanging/timing out          | 1. Increase `timeoutMs` parameter<br>2. Check if target app is responsive<br>3. Use `app_activate` before automation          |
| **App Automation Fails** | App-specific errors                    | 1. Launch target app manually first<br>2. Grant Automation permissions when prompted<br>3. Restart MCP client if needed       |
| **Document Read Fails**  | iWork document reading errors          | 1. Ensure document exists and is not corrupted<br>2. Close document in app before reading<br>3. Check file permissions        |
| **Large Document Issues**| Memory/timeout on large documents      | 1. Use `maxRows`/`maxChars`/`maxSlides` limits<br>2. Read specific sheets/slides instead of all<br>3. Increase timeout         |

### Advanced Debugging

- **Console.app**: Check for TCC (Transparency, Consent, Control) messages
- **Activity Monitor**: Verify target applications are running and responsive
- **Terminal**: Test `osascript` directly with simple scripts to isolate issues

### Performance Tips

- **Batch Operations**: Use `reminders_create_batch` instead of multiple single calls
- **Headless Chrome**: Prefer `headless_chrome_fetch` over Safari for automated research
- **Path Caching**: Use absolute paths to avoid repeated path resolution
- **App State**: Keep frequently-used apps running to reduce launch overhead
- **Document Reading**: Use selective reading parameters (`sheetName`, `slideNumber`, `maxRows`) for large documents
- **Memory Management**: Set appropriate limits (`maxChars`, `maxSlides`) to prevent memory issues with large documents

## Technical Standards & Formats

### Date & Time Formats

- **All-day events**: `YYYY-MM-DD` (e.g., `2025-12-25`)
- **Timed events**: `YYYY-MM-DD HH:MM` (e.g., `2025-12-25 14:30`)
- **With timezone**: ISO8601 format (e.g., `2025-12-25T14:30:00-05:00`)

### File Paths & URLs

- **Paths**: Always absolute (`/Users/name/Documents/file.txt`, not `~/Documents/file.txt`)
- **URLs**: Must include protocol (`https://example.com`, not `example.com`)
- **Security**: Subject to `allowedPaths`/`blockedPaths` configuration

### Data Types & Enums

- **Priorities**: `low` | `medium` | `high`
- **Transport modes**: `driving` | `walking` | `transit`
- **Note apps**: `apple_notes` | `obsidian` | `ask`
- **Volume levels**: 0-100 (integers)
- **Brightness**: 0.0-1.0 (float)

## Security & Safety Features

### Script Sanitization

- **Denylist filtering**: `run_applescript` checks for dangerous tokens
- **Input validation**: All parameters validated against expected schemas
- **No shell access**: Pure AppleScript approach avoids shell vulnerabilities

### File System Protection

- **Path sandboxing**: Operations restricted to `allowedPaths` configuration
- **Explicit blocking**: `blockedPaths` provides additional security layer
- **Safe operations**: No destructive actions without explicit user intent

### Privacy Safeguards

- **Permission transparency**: Clear indication of required system permissions
- **Minimal access**: Tools request only necessary permissions for functionality
- **User control**: Optional app allowlists and comprehensive configuration options

## Version History & Compatibility

**Current Version**: 1.0.0

- **macOS Support**: 10.14+ (Mojave and later)
- **Architecture**: Modular design with tool-per-domain organization
- **Compatibility**: Designed for recent macOS versions with standard Apple apps

### Recent Changes

- **Modular Architecture**: Decomposed monolithic file into focused tool modules
- **Enhanced Error Handling**: Comprehensive error mapping with actionable remediation
- **Obsidian Integration**: Full knowledge management support with universal note creation
- **Performance Optimization**: Improved AppleScript generation and execution efficiency
- **Security Hardening**: Enhanced path validation and script sanitization
