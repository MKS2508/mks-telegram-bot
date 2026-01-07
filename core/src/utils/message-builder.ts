import telegramFormat from '@flla/telegram-format'
import type { Formatter } from '@flla/telegram-format'

// Get the formatters from the main module
const { html } = telegramFormat

/**
 * MessageBuilder - Fluent API for building formatted Telegram messages
 *
 * Provides a consistent way to build messages without worrying about:
 * - Proper escaping of special characters
 * - Format consistency (Markdown vs HTML)
 * - Parse errors from malformed entities
 *
 * @example
 * ```typescript
 * const message = MessageBuilder.markdown()
 *   .title('User Information')
 *   .newline()
 *   .line('User ID', '123456', { code: true })
 *   .line('Username', '@john_doe')
 *   .build()
 * ```
 */
export class MessageBuilder {
  private parts: string[] = []
  private listDepth = 0

  private constructor(
    private formatter: Formatter,
    private parseModeValue: 'Markdown' | 'HTML' | 'MarkdownV2'
  ) {}

  /**
   * Create an HTML message builder (default)
   * HTML is simpler and more reliable than MarkdownV2
   */
  static markdown(): MessageBuilder {
    return new MessageBuilder(html as unknown as Formatter, 'HTML')
  }

  /**
   * Create an HTML message builder
   */
  static html(): MessageBuilder {
    return new MessageBuilder(html as unknown as Formatter, 'HTML')
  }

  /**
   * Add a title/heading (bold)
   */
  title(text: string): this {
    this.parts.push(this.formatter.bold(text))
    return this
  }

  /**
   * Add a section heading (underline/italic)
   */
  section(text: string): this {
    this.parts.push(this.formatter.underline(text))
    return this
  }

  /**
   * Add a key-value line
   * @param key - The label/key
   * @param value - The value
   * @param opts - Options for formatting the value
   */
  line(key: string, value: string, opts?: { code?: boolean; bold?: boolean }): this {
    let formattedValue = value
    if (opts?.code) {
      formattedValue = this.formatter.monospace(value)
    } else if (opts?.bold) {
      formattedValue = this.formatter.bold(value)
    }
    this.parts.push(`${key}: ${formattedValue}`)
    return this
  }

  /**
   * Add a code block
   */
  codeBlock(text: string, language?: string): this {
    this.parts.push(this.formatter.monospaceBlock(text, language))
    return this
  }

  /**
   * Add a list item
   */
  listItem(text: string, depth: number = 0): this {
    const indent = '  '.repeat(depth)
    const bullet = this.listDepth > 0 ? '•' : `${this.listDepth + 1}.`
    this.parts.push(`${indent}${bullet} ${text}`)
    return this
  }

  /**
   * Add a sublist (increase indentation)
   */
  startSublist(): this {
    this.listDepth++
    return this
  }

  /**
   * End sublist (decrease indentation)
   */
  endSublist(): this {
    if (this.listDepth > 0) this.listDepth--
    return this
  }

  /**
   * Add a newline
   */
  newline(): this {
    this.parts.push('\n')
    return this
  }

  /**
   * Add raw text (escaped, no formatting)
   */
  text(text: string): this {
    this.parts.push(this.formatter.escape(text))
    return this
  }

  /**
   * Add a horizontal rule (separator)
   */
  separator(): this {
    this.parts.push(this.parseModeValue === 'HTML' ? '<hr>' : '---')
    return this
  }

  /**
   * Build the final message string
   * @returns The formatted message ready to send
   */
  build(): string {
    return this.parts.join('\n').trim()
  }

  /**
   * Get the parse_mode for Telegraf
   * Note: Telegraf accepts 'Markdown' for both Markdown and MarkdownV2
   */
  getParseMode(): 'Markdown' | 'HTML' {
    return this.parseModeValue === 'MarkdownV2' ? 'Markdown' : this.parseModeValue
  }
}

/**
 * Quick escape helper for raw text
 */
export function escapeText(text: string): string {
  const formatter = html as unknown as Formatter
  return formatter.escape(text)
}

/**
 * Format mode type
 */
export type FormatType = 'html'

/**
 * Quick format helpers
 */
export const fmt = {
  bold: (text: string) => (html as unknown as Formatter).bold(text),
  italic: (text: string) => (html as unknown as Formatter).italic(text),
  underline: (text: string) => (html as unknown as Formatter).underline(text),
  code: (text: string) => (html as unknown as Formatter).monospace(text),
  link: (text: string, url: string) => (html as unknown as Formatter).url(text, url),
  escape: (text: string) => (html as unknown as Formatter).escape(text),
}
