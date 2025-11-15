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

    // Helper to get cell text
    function getCellText(cell) {
      return (cell.textContent || '').trim();
    }

    // Process header
    if (thead) {
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => {
          return getCellText(cell);
        });
        rows.push('| ' + headers.join(' | ') + ' |');
        rows.push('| ' + headers.map(() => '---').join(' | ') + ' |');
      }
    }

    // Process body
    if (tbody) {
      const bodyRows = tbody.querySelectorAll('tr');
      bodyRows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(cell => {
          return getCellText(cell);
        });
        if (cells.length > 0) {
          rows.push('| ' + cells.join(' | ') + ' |');
        }
      });
    } else {
      // If no tbody, process all tr elements directly
      const allRows = tableNode.querySelectorAll('tr');
      let isFirstRow = !thead; // If no thead, first row is header

      allRows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(cell => {
          return getCellText(cell);
        });

        if (cells.length > 0) {
          if (isFirstRow) {
            rows.push('| ' + cells.join(' | ') + ' |');
            rows.push('| ' + cells.map(() => '---').join(' | ') + ' |');
            isFirstRow = false;
          } else {
            rows.push('| ' + cells.join(' | ') + ' |');
          }
        }
      });
    }

    return rows.join('\n') + '\n\n';
  }

  /**
   * Convert HTML element to Markdown
   */
  function htmlToMarkdown(element) {
    if (!element) return '';

    // Clone to avoid modifying original
    const clone = element.cloneNode(true);

    // Remove script, style, svg, and button elements
    const unwanted = clone.querySelectorAll('script, style, svg, button');
    unwanted.forEach(el => el.remove());

    // Convert HTML structure to markdown
    return processNode(clone).trim();
  }

  /**
   * Process a node and its children, converting to markdown
   */
  function processNode(node) {
    if (!node) return '';

    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    // Element node
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      let content = '';

      // Process children
      const children = Array.from(node.childNodes);
      const childContent = children.map(child => processNode(child)).join('');

      switch (tag) {
        case 'h1':
          return `# ${childContent.trim()}\n\n`;
        case 'h2':
          return `## ${childContent.trim()}\n\n`;
        case 'h3':
          return `### ${childContent.trim()}\n\n`;
        case 'h4':
          return `#### ${childContent.trim()}\n\n`;
        case 'h5':
          return `##### ${childContent.trim()}\n\n`;
        case 'h6':
          return `###### ${childContent.trim()}\n\n`;

        case 'p':
          // Check if we're inside a list item
          let currentParent = node.parentElement;
          while (currentParent) {
            if (currentParent.tagName.toLowerCase() === 'li') {
              // Inside a list item, don't add extra newlines
              return childContent.trim();
            }
            currentParent = currentParent.parentElement;
          }
          return `${childContent.trim()}\n\n`;

        case 'strong':
        case 'b':
          return `**${childContent}**`;

        case 'em':
        case 'i':
          return `*${childContent}*`;

        case 'code':
          // Check if this is inside a pre tag (code block)
          if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
            return childContent;
          }
          return `\`${childContent}\``;

        case 'pre':
          return `\`\`\`\n${childContent.trim()}\n\`\`\`\n\n`;

        case 'ul':
        case 'ol':
          // Check if we're nested inside another list item
          let isNested = false;
          let parentCheck = node.parentElement;
          while (parentCheck) {
            if (parentCheck.tagName && parentCheck.tagName.toLowerCase() === 'li') {
              isNested = true;
              break;
            }
            parentCheck = parentCheck.parentElement;
          }

          if (isNested) {
            // For nested lists, indent each line
            const lines = childContent.trim().split('\n');
            return '\n' + lines.map(line => '  ' + line).join('\n') + '\n';
          }
          return `\n${childContent}\n`;

        case 'li':
          // Check if parent is ol or ul
          const parent = node.parentElement;

          // Check if this list item contains a nested list
          const hasNestedList = node.querySelector('ul, ol');

          let content;
          if (hasNestedList) {
            // Keep the structure for nested lists
            content = childContent.trim();
          } else {
            // For simple list items, collapse internal whitespace
            content = childContent.trim().replace(/\n+/g, ' ');
          }

          if (parent && parent.tagName.toLowerCase() === 'ol') {
            const index = Array.from(parent.children).indexOf(node) + 1;
            return `${index}. ${content}\n`;
          }
          return `- ${content}\n`;

        case 'blockquote':
          const lines = childContent.trim().split('\n');
          return lines.map(line => `> ${line}`).join('\n') + '\n\n';

        case 'hr':
          return '---\n\n';

        case 'a':
          const href = node.getAttribute('href');
          if (href) {
            return `[${childContent}](${href})`;
          }
          return childContent;

        case 'img':
          const src = node.getAttribute('src');
          const alt = node.getAttribute('alt') || '';
          if (src) {
            return `![${alt}](${src})`;
          }
          return '';

        case 'br':
          return '\n';

        case 'table':
          return convertTableToMarkdown(node);

        case 'div':
        case 'span':
        case 'article':
        case 'section':
          return childContent;

        default:
          return childContent;
      }
    }

    return '';
  }

  /**
   * Extract text content from an element, preserving structure
   */
  function extractTextContent(element) {
    if (!element) return '';

    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);

    // Remove any script or style elements
    const scripts = clone.querySelectorAll('script, style, svg, button');
    scripts.forEach(el => el.remove());

    // Get text content
    let text = clone.textContent || '';

    // Clean up whitespace
    text = text.trim();

    return text;
  }

  /**
   * Extract markdown content from assistant messages
   */
  function extractMarkdownContent(element) {
    // For assistant messages, try to preserve the markdown structure
    const markdownDiv = element.querySelector('.markdown');
    if (markdownDiv) {
      return htmlToMarkdown(markdownDiv);
    }
    return htmlToMarkdown(element);
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
    console.log('🚀 Starting ChatGPT export to Markdown...');

    // Get the conversation title
    const titleElement = document.querySelector('title');
    const conversationTitle = titleElement ? titleElement.textContent.replace(' | ChatGPT', '') : 'ChatGPT Conversation';

    // Find all conversation turns (articles with data-testid containing "conversation-turn")
    const turns = document.querySelectorAll('article[data-testid^="conversation-turn"]');

    if (turns.length === 0) {
      console.error('❌ No conversation messages found. Make sure you\'re on a ChatGPT conversation page.');
      return;
    }

    console.log(`📝 Found ${turns.length} messages`);

    // Build markdown content
    let markdown = `# ${conversationTitle}\n\n`;
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n`;
    markdown += `---\n\n`;

    // Process each turn
    turns.forEach((turn, index) => {
      const role = turn.getAttribute('data-turn');
      const messageDiv = turn.querySelector('[data-message-author-role]');

      if (!messageDiv) {
        console.warn(`⚠️  Skipping message ${index + 1}: No message content found`);
        return;
      }

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

      if (!content) {
        console.warn(`⚠️  Skipping message ${index + 1}: Empty content`);
        return;
      }

      // Format the message based on role
      if (actualRole === 'user') {
        markdown += `## User\n\n`;
        markdown += `${content}\n\n`;
      } else if (actualRole === 'assistant') {
        markdown += `## Assistant\n\n`;
        markdown += `${content}\n\n`;
      } else {
        markdown += `## ${actualRole}\n\n`;
        markdown += `${content}\n\n`;
      }

      markdown += `---\n\n`;
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

    console.log(`✅ Export complete! Downloaded as: ${filename}`);
    console.log(`📊 Exported ${turns.length} messages`);

    // Return the markdown for inspection if needed
    return markdown;
  }

  // Run the export
  try {
    const result = exportChatToMarkdown();
    console.log('\n✨ You can also access the markdown content by typing: result');
  } catch (error) {
    console.error('❌ Error during export:', error);
  }
})();
