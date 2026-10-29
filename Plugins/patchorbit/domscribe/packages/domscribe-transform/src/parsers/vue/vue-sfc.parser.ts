/**
 * Vue SFC parser implementation
 *
 * This parser handles Vue Single File Components (.vue files).
 * It extracts the <template> block and parses it using Vue's template compiler
 * to produce an AST that can be used for data-ds attribute injection.
 *
 * The key challenge is that Vue template AST positions are relative to the
 * template block content, not the full SFC. This parser calculates absolute
 * positions for correct injection.
 *
 * @module @domscribe/transform/parsers/vue/vue-sfc-parser
 */

import { ParserInterface } from '../parser.interface.js';
import { ParseParams, SourceLocation } from '../types.js';
import {
  VueRootNode,
  VueElementNode,
  VueSFCParseResult,
  VueAttributeNode,
  VueDirectiveNode,
  NodeTypes,
  ElementTypes,
} from './types.js';

/**
 * VueSFCParser implementation for Vue Single File Components
 *
 * Uses vue/compiler-sfc for SFC structure parsing and template AST generation.
 * The parse function in Vue 3.3+ returns the template AST directly.
 */
export class VueSFCParser implements ParserInterface<
  VueSFCParseResult,
  VueElementNode
> {
  /**
   * Lazily loaded Vue compiler-sfc module
   * Vue is an optional peer dependency, so we load it dynamically
   */
  private compilerSfc: typeof import('vue/compiler-sfc') | null = null;

  /**
   * Cached template content offset from the last parse
   * Used by getInsertPosition to calculate absolute SFC positions
   */
  private lastTemplateContentOffset = 0;

  /**
   * Load Vue compiler-sfc module dynamically
   * Logs a warning if Vue is not installed
   */
  private async loadCompiler(): Promise<void> {
    if (this.compilerSfc) {
      return;
    }

    try {
      // Dynamic import to handle optional peer dependency
      this.compilerSfc = await import('vue/compiler-sfc');
    } catch {
      console.warn(
        '[domscribe-transform][vue-parser] Vue compiler not found. Install vue >= 3.3.0 as a peer dependency.',
      );
    }
  }

  /**
   * Synchronously ensure compiler is loaded
   * Call loadCompiler() before using this parser
   */
  private ensureCompiler(): typeof import('vue/compiler-sfc') {
    if (!this.compilerSfc) {
      throw new Error(
        'Vue compiler not loaded. Call initialize() or loadCompiler() first.',
      );
    }
    return this.compilerSfc;
  }

  /**
   * Initialize the parser by loading Vue compiler
   * Should be called before first use
   */
  async initialize(): Promise<void> {
    await this.loadCompiler();
  }

  /**
   * Parse a Vue SFC and extract the template AST with position information
   *
   * @param source - The full SFC source code
   * @param params - Parse parameters including source file path
   * @returns Parsed result containing template AST and offset information
   */
  parse(source: string, params?: ParseParams): VueSFCParseResult {
    const sfc = this.ensureCompiler();
    const { sourceFile = 'unknown' } = params ?? {};

    // Parse the SFC structure (Vue 3.3+ returns template AST directly)
    const { descriptor, errors } = sfc.parse(source, {
      filename: sourceFile,
      sourceMap: false, // We don't need source maps for SFC structure
    });

    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => ('message' in e ? e.message : String(e)))
        .join(', ');
      throw new SyntaxError(
        `Vue SFC parse error in ${sourceFile}: ${errorMessages}`,
      );
    }

    const template = descriptor.template;

    if (!template) {
      throw new SyntaxError(`Vue SFC has no <template> block in ${sourceFile}`);
    }

    // Vue 3.3+ includes the template AST directly in the parse result
    if (!template.ast) {
      throw new SyntaxError(
        `Vue SFC template AST not available in ${sourceFile}. Ensure you're using Vue >= 3.3.0.`,
      );
    }

    const templateAst = template.ast as VueRootNode;

    // Vue 3.3+ AST positions are already absolute (relative to SFC, not template content)
    // template.loc.start.offset points to where the template content starts
    // AST node offsets are already absolute, so we don't need to add any offset
    const templateContentOffset = 0;

    // Cache the offset for use in getInsertPosition (will be 0 since AST is absolute)
    this.lastTemplateContentOffset = templateContentOffset;

    return {
      templateAst,
      templateContentOffset,
      sfcSource: source,
    };
  }

  /**
   * Find all element nodes in the template AST
   *
   * Skips:
   * - <template> wrapper elements (tagType === ElementTypes.TEMPLATE)
   * - Comment and text nodes
   *
   * @param parseResult - The parsed SFC result from parse()
   * @returns Array of element nodes that should receive data-ds attributes
   */
  findJSXOpeningElements(parseResult: VueSFCParseResult): VueElementNode[] {
    const elements: VueElementNode[] = [];

    const walkNode = (
      node:
        | VueRootNode
        | VueElementNode
        | { type: number; children?: unknown[] },
    ): void => {
      // Only process element nodes
      if (node.type === NodeTypes.ELEMENT) {
        const elementNode = node as VueElementNode;

        // Skip <template> virtual wrapper elements (v-if, v-for containers)
        // These don't render to actual DOM elements
        if (elementNode.tagType !== ElementTypes.TEMPLATE) {
          elements.push(elementNode);
        }

        // Recursively process children
        if (elementNode.children) {
          for (const child of elementNode.children) {
            walkNode(child as VueElementNode);
          }
        }
      } else if (node.type === NodeTypes.ROOT) {
        // Process root's children
        const rootNode = node as VueRootNode;
        for (const child of rootNode.children) {
          walkNode(child as VueElementNode);
        }
      }
      // Skip TEXT, COMMENT, INTERPOLATION, etc.
    };

    walkNode(parseResult.templateAst);

    return elements;
  }

  /**
   * Check if an element already has a data-ds attribute
   *
   * @param node - Vue element node to check
   * @returns true if data-ds attribute exists
   */
  hasDataDsAttribute(node: VueElementNode): boolean {
    return node.props.some((prop) => {
      // Check for static attribute: data-ds="xxx"
      if (prop.type === NodeTypes.ATTRIBUTE) {
        return (prop as VueAttributeNode).name === 'data-ds';
      }
      // Check for dynamic attribute: :data-ds="xxx" or v-bind:data-ds="xxx"
      if (prop.type === NodeTypes.DIRECTIVE) {
        const directive = prop as VueDirectiveNode;
        if (directive.name === 'bind' && directive.arg) {
          return directive.arg.content === 'data-ds';
        }
      }
      return false;
    });
  }

  /**
   * Get the source location of an element in the original SFC
   *
   * Note: Line/column are returned as-is (template-relative) for manifest entries
   * since they represent the logical position within the template.
   * The offset is converted to absolute SFC position for correct injection.
   *
   * @param node - Vue element node
   * @returns Source location with absolute offset positions
   */
  getLocation(node: VueElementNode): SourceLocation | undefined {
    if (!node.loc) {
      console.warn(
        `[domscribe-transform][vue-parser] Could not find source location for <${this.getTagName(node)}>`,
      );
      return undefined;
    }

    // Convert template-relative offsets to absolute SFC offsets
    const absoluteStartOffset =
      this.lastTemplateContentOffset + node.loc.start.offset;
    const absoluteEndOffset =
      this.lastTemplateContentOffset + node.loc.end.offset;

    return {
      start: {
        line: node.loc.start.line,
        column: node.loc.start.column,
        offset: absoluteStartOffset,
      },
      end: {
        line: node.loc.end.line,
        column: node.loc.end.column,
        offset: absoluteEndOffset,
      },
    };
  }

  /**
   * Get the tag name of an element
   *
   * @param node - Vue element node
   * @returns Tag name (e.g., "div", "UserCard", "my-component")
   */
  getTagName(node: VueElementNode): string {
    return node.tag;
  }

  /**
   * Calculate the position for inserting the data-ds attribute
   *
   * Returns an absolute position in the SFC source, accounting
   * for the template content offset.
   *
   * @param node - Vue element node
   * @returns Absolute byte offset in the SFC for attribute insertion
   */
  getInsertPosition(node: VueElementNode): number {
    // We need to find the position just before the closing > or />
    // of the opening tag
    //
    // For self-closing: <div /> -> insert before " />"
    // For regular: <div> -> insert before ">"
    //
    // The challenge is that node.loc covers the entire element including children
    // We need to find where the opening tag ends

    const tagSource = node.loc.source;
    const baseOffset = this.lastTemplateContentOffset + node.loc.start.offset;

    if (node.isSelfClosing) {
      // Self-closing: find /> and insert before it
      // <input /> -> insert position is before " />"
      const selfCloseIndex = tagSource.indexOf('/>');
      if (selfCloseIndex !== -1) {
        return baseOffset + selfCloseIndex;
      }
    }

    // Regular element: find the first > that closes the opening tag
    // Need to be careful not to match > inside attribute values
    // <div class="a>b"> -> should find the last >

    // Simple approach: scan for > accounting for quotes
    let inQuote: string | null = null;
    for (let i = 0; i < tagSource.length; i++) {
      const char = tagSource[i];

      if (inQuote) {
        if (char === inQuote) {
          inQuote = null;
        }
      } else if (char === '"' || char === "'") {
        inQuote = char;
      } else if (char === '>') {
        // Check if this is a self-closing tag we missed
        if (i > 0 && tagSource[i - 1] === '/') {
          return baseOffset + i - 1;
        }
        return baseOffset + i;
      }
    }

    // Fallback: shouldn't reach here for valid Vue templates
    console.warn(
      `[domscribe-transform][vue-parser] Could not find insert position for <${node.tag}>`,
    );
    return baseOffset + node.tag.length + 1;
  }
}

/**
 * Create a VueSFCParser instance
 *
 * Factory function for consistency with other parsers.
 */
export function createVueSFCParser(): VueSFCParser {
  return new VueSFCParser();
}
