/**
 * Parser abstraction for different TypeScript/JSX parsers
 *
 * This interface provides a common contract for parsing JSX/TSX code,
 * allowing the core injector to work with different parsers (Acorn, Babel, etc.)
 * without being coupled to any specific implementation.
 *
 * @module @domscribe/transform/parsers/parser-interface
 */
import { ParseParams, SourceLocation } from './types.js';

/**
 * Common interface for JSX/TSX parsers
 *
 * @param TParseResult - The type returned by parse() (AST root or wrapper containing AST)
 * @param TElement - The type of element nodes found within the parse result
 */
export interface ParserInterface<TParseResult = unknown, TElement = unknown> {
  /**
   * Initialize the parser (optional)
   *
   * Some parsers may need async initialization (e.g., loading dynamic imports).
   * If implemented, this should be called before first use.
   *
   * @returns Promise that resolves when initialization is complete
   */
  initialize?(): Promise<void>;
  /**
   * Parse source code into an Abstract Syntax Tree (AST)
   *
   * @param source - Source code string to parse
   * @param params - Parsing configuration
   * @returns Parse result (format depends on parser implementation)
   * @throws SyntaxError if source code is invalid
   *
   * @example
   * ```typescript
   * const ast = parser.parse('const App = () => <div>Hello</div>', {
   *   sourceFile: 'App.tsx',
   *   sourceType: 'module'
   * });
   * ```
   */
  parse(source: string, params?: ParseParams): TParseResult;

  /**
   * Find all JSX opening elements in the AST
   *
   * This includes:
   * - Regular elements: `<div>`, `<Button>`
   * - Self-closing elements: `<input />`, `<Component />`
   * - Member expressions: `<UI.Button.Primary>`
   * - Namespaced elements: `<svg:rect>`
   * - Fragments: `<>`
   *
   * @param parseResult - Parsed result from parse()
   * @returns Array of JSX opening element nodes
   *
   * @example
   * ```typescript
   * const parseResult = parser.parse(source);
   * const elements = parser.findJSXOpeningElements(parseResult);
   * console.log(`Found ${elements.length} JSX elements`);
   * ```
   */
  findJSXOpeningElements(parseResult: TParseResult): TElement[];

  /**
   * Check if a JSX element already has a `data-ds` attribute
   *
   * Used to avoid duplicate injection when an element already has the attribute
   * (e.g., from a previous transform run or manual addition).
   *
   * @param node - JSX opening element node
   * @returns true if `data-ds` attribute exists, false otherwise
   *
   * @example
   * ```typescript
   * const elements = parser.findJSXOpeningElements(ast);
   * elements.forEach(element => {
   *   if (!parser.hasDataDsAttribute(element)) {
   *     // Inject data-ds attribute
   *   }
   * });
   * ```
   */
  hasDataDsAttribute(node: TElement): boolean;

  /**
   * Get the source location (line/column/offset) of a JSX element
   *
   * Returns position information for both the start and end of the element's
   * opening tag. This is used for:
   * - Manifest entries (mapping DOM to source)
   * - Source map resolution
   * - Error reporting
   *
   * @param node - JSX opening element node
   * @returns Source location with start and optional end positions
   *
   * @example
   * ```typescript
   * const location = parser.getLocation(element);
   * console.log(`Element at ${location.start.line}:${location.start.column}`);
   * ```
   */
  getLocation(node: TElement): SourceLocation | undefined;

  /**
   * Get the tag name of a JSX element
   *
   * Handles different JSX naming patterns:
   * - Simple identifiers: `div`, `Button`
   * - Member expressions: `UI.Button.Primary` → "UI.Button.Primary"
   * - Namespaced names: `svg:rect` → "svg:rect"
   * - Fragments: `<>` → "Unknown"
   *
   * @param node - JSX opening element node
   * @returns Tag name as a string
   *
   * @example
   * ```typescript
   * const tagName = parser.getTagName(element);
   * if (tagName === 'div') {
   *   // Handle native element
   * } else if (tagName.startsWith('UI.')) {
   *   // Handle UI library component
   * }
   * ```
   */
  getTagName(node: TElement): string;

  /**
   * Get the insertion position for injecting the `data-ds` attribute
   *
   * Returns the byte offset where the attribute should be inserted:
   * - Self-closing elements: 2 characters before end (before `/>`)
   * - Regular elements: 1 character before end (before `>`)
   *
   * @param node - JSX opening element node
   * @returns Byte offset for attribute insertion
   *
   * @example
   * ```typescript
   * const insertPos = parser.getInsertPosition(element);
   * magicString.appendLeft(insertPos, ' data-ds="abc123"');
   *
   * // Input:  <div className="foo">
   * // Output: <div className="foo" data-ds="abc123">
   * //                              ↑ insertPos
   * ```
   */
  getInsertPosition(node: TElement): number;
}
