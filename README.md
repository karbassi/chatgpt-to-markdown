# ChatGPT to Markdown Exporter

A browser-based JavaScript tool that exports ChatGPT conversations to GitHub-flavored Markdown format.

## Features

- Converts ChatGPT conversations to clean, readable Markdown
- Preserves formatting: code blocks, tables, lists, links, images
- Handles nested lists and task lists
- Detects programming language in code blocks
- Silent operation with automatic download
- No dependencies or installation required

## Usage

1. Open a ChatGPT conversation in your browser
2. Open Chrome DevTools:
   - Windows/Linux: Press `F12` or `Ctrl+Shift+I`
   - Mac: Press `Cmd+Option+I`
3. Go to the **Console** tab
4. Copy the contents of `export-chatgpt.js`
5. Paste into the console and press Enter
6. The markdown file will download automatically

## Output Format

The exported file includes:

- Conversation title as the main heading
- Export timestamp
- User and Assistant messages with proper formatting
- All markdown elements preserved (tables, code, lists, etc.)

## File Naming

Files are saved as: `chatgpt_[title]_[timestamp].md`

- Title is sanitized (special characters replaced with underscores)
- Timestamp ensures unique filenames

## Supported Markdown Elements

- Headings (h1-h6)
- Bold, italic, strikethrough
- Code blocks with syntax highlighting
- Inline code
- Tables
- Ordered and unordered lists
- Nested lists
- Task lists
- Links and images
- Blockquotes
- Horizontal rules

## Technical Details

- Written in modern ES2020+ JavaScript
- Uses optional chaining, nullish coalescing, and destructuring
- Runs entirely in the browser
- No external dependencies
- No server-side processing

## License

MIT
