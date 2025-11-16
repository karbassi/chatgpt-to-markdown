/**
 * Export ChatGPT conversation to Markdown
 *
 * Usage:
 * 1. Open a ChatGPT conversation in your browser
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Go to the Console tab
 * 4. Paste this entire script and press Enter
 * 5. The markdown file will be automatically downloaded
 */

(function() {
  'use strict';

  /**
   * Convert HTML table to Markdown table
   */
  function convertTableToMarkdown(tableNode) {
    const rows = [];
    const thead = tableNode.querySelector('thead');
    const tbody = tableNode.querySelector('tbody');

    // Helper to get cell text and escape pipes
    function getCellText(cell) {
      return cell.textContent?.trim().replaceAll('|', '\\|') ?? '';
    }

    // Helper to extract cells from a row
    function getCellsFromRow(row) {
      return [...row.querySelectorAll('td, th')].map(getCellText);
    }

    // Helper to format cells as markdown table row
    function formatTableRow(cells) {
      return `| ${cells.join(' | ')} |`;
    }

    // Helper to add header row with separator
    function addHeaderRow(cells) {
      rows.push(formatTableRow(cells));
      rows.push(formatTableRow(cells.map(() => '---')));
    }

    // Process header
    if (thead) {
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        addHeaderRow(getCellsFromRow(headerRow));
      }
    }

    // Process body
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(row => {
        const cells = getCellsFromRow(row);
        if (cells.length > 0) rows.push(formatTableRow(cells));
      });
    } else {
      // If no tbody, process all tr elements directly
      let isFirstRow = !thead;
      tableNode.querySelectorAll('tr').forEach(row => {
        const cells = getCellsFromRow(row);
        if (cells.length > 0) {
          if (isFirstRow) {
            addHeaderRow(cells);
            isFirstRow = false;
          } else {
            rows.push(formatTableRow(cells));
          }
        }
      });
    }

    return rows.join('\n') + '\n\n';
  }

  /**
   * Convert HTML element to Markdown
   */
  function htmlToMarkdown(element, options = {}) {
    if (!element) return '';

    // Clone to avoid modifying original
    const clone = element.cloneNode(true);

    // Remove script, style, svg, and button elements
    clone.querySelectorAll('script, style, svg, button').forEach(el => el.remove());

    // Convert HTML structure to markdown
    return processNode(clone, options).trim();
  }

  /**
   * Escape special markdown characters in text
   */
  function escapeMarkdown(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/^-/gm, '\\-')
      .replace(/^\+ /gm, '\\+ ')
      .replace(/^(=+)/gm, '\\$1')
      .replace(/^(#{1,6}) /gm, '\\$1 ')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/^>/gm, '\\>')
      .replace(/_/g, '\\_')
      .replace(/^(\d+)\. /gm, '$1\\. ');
  }

  /**
   * Collapse whitespace in text nodes (like Turndown does)
   * Preserves single newlines but collapses multiple newlines and spaces
   */
  function collapseWhitespace(text, preserveNewlines = false) {
    if (preserveNewlines) {
      // Preserve newlines but collapse spaces/tabs
      return text
        .replace(/[ \t]+/g, ' ')     // collapse spaces and tabs
        .replace(/\n{3,}/g, '\n\n'); // max 2 consecutive newlines
    }
    // Default behavior: collapse all whitespace to single space
    return text.replace(/[ \t\r\n]+/g, ' ');
  }

  /**
   * Check if node is blank/empty
   */
  function isBlank(node) {
    return (
      node.nodeType === Node.ELEMENT_NODE &&
      !node.querySelector('img, hr, br, table') &&
      /^\s*$/.test(node.textContent)
    );
  }

  /**
   * Check if a node is inside a list item
   */
  function isInsideListItem(node) {
    let parent = node.parentElement;
    while (parent) {
      if (parent.tagName && parent.tagName.toLowerCase() === 'li') {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  /**
   * Process a node and its children, converting to markdown
   */
  function processNode(node, { isCode = false, noEscape = false } = {}) {
    if (!node) return '';

    // Skip blank nodes
    if (isBlank(node)) return '';

    // Text node - escape markdown and collapse whitespace
    if (node.nodeType === Node.TEXT_NODE) {
      const text = isCode ? node.textContent : collapseWhitespace(node.textContent);
      // Don't escape if we're in assistant markdown content or in code
      return (isCode || noEscape) ? text : escapeMarkdown(text);
    }

    // Element node
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();

      // Determine if we're in a code context
      const isCodeContext = isCode || tag === 'code' || tag === 'pre';

      // Process children with appropriate options
      const childContent = [...node.childNodes].map(child =>
        processNode(child, {
          isCode: isCodeContext && tag !== 'pre',
          noEscape
        })
      ).join('');

      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          // Extract heading level from tag name (h1 -> 1, h2 -> 2, etc.)
          const level = parseInt(tag[1]);
          return `${'#'.repeat(level)} ${childContent.trim()}\n\n`;

        case 'p':
          // Inside a list item, don't add extra newlines
          if (isInsideListItem(node)) {
            return childContent.trim();
          }
          return `${childContent.trim()}\n\n`;

        case 'strong':
        case 'b':
          return childContent.trim() ? `**${childContent}**` : '';

        case 'em':
        case 'i':
          return childContent.trim() ? `*${childContent}*` : '';

        case 's':
        case 'del':
        case 'strike':
          return childContent.trim() ? `~~${childContent}~~` : '';

        case 'sup':
          return childContent.trim() ? `<sup>${childContent}</sup>` : '';

        case 'sub':
          return childContent.trim() ? `<sub>${childContent}</sub>` : '';

        case 'code':
          // Check if this is inside a pre tag (code block)
          if (node.parentElement?.tagName.toLowerCase() === 'pre') {
            return childContent;
          }
          // Handle inline code - escape backticks by using multiple backticks if needed
          if (!childContent) return '';
          const inlineCode = childContent.replace(/\r?\n|\r/g, ' ');
          const hasBacktick = inlineCode.includes('`');
          const delimiter = hasBacktick ? '``' : '`';
          const extraSpace = /^`|^ /.test(inlineCode) || /`$| $/.test(inlineCode) ? ' ' : '';
          return `${delimiter}${extraSpace}${inlineCode}${extraSpace}${delimiter}`;

        case 'pre':
          const codeElement = node.querySelector('code');
          const className = codeElement?.getAttribute('class') ?? '';
          const language = className.match(/language-(\S+)/)?.[1] ?? '';
          const code = codeElement?.textContent ?? childContent;
          return `\`\`\`${language}\n${code.trim()}\n\`\`\`\n\n`;

        case 'ul':
        case 'ol':
          // Skip empty lists
          if (!childContent.trim()) return '';

          // Nested lists need indentation
          if (isInsideListItem(node)) {
            const lines = childContent.trim().split('\n');
            return '\n' + lines.map(line => '  ' + line).join('\n') + '\n';
          }
          return `\n${childContent}\n`;

        case 'li':
          // Check if parent is ol or ul
          const parent = node.parentElement;

          // Check for task list checkbox (before processing children)
          const checkbox = node.querySelector('input[type="checkbox"]');
          let taskListPrefix = '';
          if (checkbox) {
            taskListPrefix = checkbox.checked ? '[x] ' : '[ ] ';
          }

          // Clone node and remove checkbox to prevent it from appearing in content
          const liClone = node.cloneNode(true);
          liClone.querySelector('input[type="checkbox"]')?.remove();

          // Process the cloned content without checkbox
          const liContent = [...liClone.childNodes].map(child =>
            processNode(child, { isCode, noEscape })
          ).join('');

          // Process content and handle nested lists
          let content = liContent
            .replace(/^\n+/, '') // remove leading newlines
            .replace(/\n+$/, '\n'); // replace trailing newlines with just a single one

          // Indent continuation lines (not the first line)
          const lines = content.split('\n');
          if (lines.length > 1) {
            content = `${lines[0]}\n${lines.slice(1).map(line => `  ${line}`).join('\n')}`;
          }

          // Determine prefix
          let prefix = '- ';
          if (parent?.tagName.toLowerCase() === 'ol') {
            const start = parent.getAttribute('start');
            const index = [...parent.children].indexOf(node);
            prefix = `${start ? Number(start) + index : index + 1}. `;
          }

          return `${prefix}${taskListPrefix}${content}${node.nextSibling && !/\n$/.test(content) ? '\n' : ''}`;

        case 'blockquote':
          const quoteLines = childContent.trim().split('\n');
          return quoteLines.map(line => `> ${line}`).join('\n') + '\n\n';

        case 'hr':
          return '---\n\n';

        case 'a':
          const href = node.getAttribute('href');
          if (!href) return childContent;
          const title = node.getAttribute('title');
          const titlePart = title ? ` "${title.replaceAll('"', '\\"')}"` : '';
          return `[${childContent}](${href}${titlePart})`;

        case 'img':
          const src = node.getAttribute('src');
          if (!src) return '';
          const alt = node.getAttribute('alt') ?? '';
          const imgTitle = node.getAttribute('title');
          const imgTitlePart = imgTitle ? ` "${imgTitle.replaceAll('"', '\\"')}"` : '';
          return `![${alt}](${src}${imgTitlePart})`;

        case 'br':
          return '\n';

        case 'table':
          return convertTableToMarkdown(node);

        default:
          // Pass through container elements (div, span, article, section, etc.)
          return childContent;
      }
    }

    return '';
  }

  /**
   * Extract text content from an element, preserving structure
   * For user messages, we preserve line breaks as they typed them
   */
  function extractTextContent(element) {
    if (!element) return '';

    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);

    // Remove any script or style elements
    clone.querySelectorAll('script, style, svg, button').forEach(el => el.remove());

    // Get text content
    let text = clone.textContent ?? '';

    // For user messages, preserve newlines but clean up excessive spacing
    text = text
      .replace(/[ \t]+/g, ' ')        // collapse consecutive spaces/tabs
      .replace(/\n[ \t]+/g, '\n')     // remove spaces at start of lines
      .replace(/[ \t]+\n/g, '\n')     // remove spaces at end of lines
      .replace(/\n{3,}/g, '\n\n')     // max 2 consecutive newlines
      .trim();

    return text;
  }

  /**
   * Extract markdown content from assistant messages
   */
  function extractMarkdownContent(element) {
    // For assistant messages, try to preserve the markdown structure
    // Don't escape markdown characters since ChatGPT already provides formatted content
    const markdownDiv = element.querySelector('.markdown');
    if (markdownDiv) {
      return htmlToMarkdown(markdownDiv, { noEscape: true });
    }
    return htmlToMarkdown(element, { noEscape: true });
  }

  /**
   * Clean up excessive whitespace in markdown
   */
  function cleanupMarkdown(markdown) {
    return markdown
      // Replace 3+ newlines with exactly 2 newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove spaces at the end of lines
      .trim();
  }

  /**
   * Main export function
   */
  function exportChatToMarkdown() {
    // Get the conversation title
    const titleElement = document.querySelector('title');
    const conversationTitle = titleElement?.textContent.replace(' | ChatGPT', '') ?? 'ChatGPT Conversation';

    // Find all conversation turns (articles with data-testid containing "conversation-turn")
    const turns = document.querySelectorAll('article[data-testid^="conversation-turn"]');

    if (turns.length === 0) return;

    // Build markdown content
    let markdown = `# ${conversationTitle}\n\n`;
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n`;
    markdown += `---\n\n`;

    // Process each turn
    turns.forEach((turn, index) => {
      const messageDiv = turn.querySelector('[data-message-author-role]');
      if (!messageDiv) return;

      const actualRole = messageDiv.getAttribute('data-message-author-role');

      // Extract content based on role
      let content = '';
      if (actualRole === 'user') {
        // User messages are in a div with class "whitespace-pre-wrap"
        const userContent = messageDiv.querySelector('.whitespace-pre-wrap, [data-multiline]');
        content = extractTextContent(userContent || messageDiv);
      } else if (actualRole === 'assistant') {
        // Assistant messages have markdown formatting
        content = extractMarkdownContent(messageDiv);
      } else {
        // Fallback for any other message types
        content = extractTextContent(messageDiv);
      }

      if (!content) return;

      // Format the message based on role
      if (actualRole === 'user') {
        markdown += `## User\n${content}`;
      } else if (actualRole === 'assistant') {
        markdown += `## Assistant\n${content}`;
      } else {
        markdown += `## ${actualRole}\n${content}`;
      }

      markdown += `\n---\n\n`;
    });

    // Clean up excessive whitespace
    markdown = cleanupMarkdown(markdown);

    // Create and download the file
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Create a safe filename from the title
    const safeTitle = conversationTitle
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);

    const filename = `chatgpt_${safeTitle}_${Date.now()}.md`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Return the markdown for inspection if needed
    return markdown;
  }

  // Run the export
  exportChatToMarkdown();
})();
