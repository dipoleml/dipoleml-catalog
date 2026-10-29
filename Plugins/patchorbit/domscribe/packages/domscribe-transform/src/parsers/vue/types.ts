/**
 * Type definitions for Vue SFC template parsing
 *
 * These types model the subset of Vue's template AST that we need
 * for element discovery and attribute injection.
 *
 * @module @domscribe/transform/parsers/vue/types
 */

/**
 * Vue template AST node types from @vue/compiler-core
 * Note: Using regular enum instead of const enum for runtime compatibility
 */
export enum NodeTypes {
  ROOT = 0,
  ELEMENT = 1,
  TEXT = 2,
  COMMENT = 3,
  SIMPLE_EXPRESSION = 4,
  INTERPOLATION = 5,
  ATTRIBUTE = 6,
  DIRECTIVE = 7,
  // ... other types we don't need
}

/**
 * Vue element types
 */
export enum ElementTypes {
  ELEMENT = 0,
  COMPONENT = 1,
  SLOT = 2,
  TEMPLATE = 3,
}

/**
 * Source position in Vue's AST
 */
export interface VueSourcePosition {
  offset: number;
  line: number;
  column: number;
}

/**
 * Source location in Vue's AST
 */
export interface VueSourceLocation {
  start: VueSourcePosition;
  end: VueSourcePosition;
  source: string;
}

/**
 * Base node interface for Vue template AST
 */
export interface VueTemplateNode {
  type: NodeTypes;
  loc: VueSourceLocation;
}

/**
 * Attribute node (static attributes like class="foo")
 */
export interface VueAttributeNode extends VueTemplateNode {
  type: NodeTypes.ATTRIBUTE;
  name: string;
  value?: {
    type: NodeTypes.TEXT;
    content: string;
    loc: VueSourceLocation;
  };
}

/**
 * Directive node (v-if, v-for, :prop, @event, etc.)
 */
export interface VueDirectiveNode extends VueTemplateNode {
  type: NodeTypes.DIRECTIVE;
  name: string;
  arg?: {
    type: NodeTypes;
    content: string;
    loc: VueSourceLocation;
  };
  exp?: {
    type: NodeTypes;
    content: string;
    loc: VueSourceLocation;
  };
}

/**
 * Element node in Vue template AST
 */
export interface VueElementNode extends VueTemplateNode {
  type: NodeTypes.ELEMENT;
  tag: string;
  tagType: ElementTypes;
  props: (VueAttributeNode | VueDirectiveNode)[];
  children: VueTemplateNode[];
  isSelfClosing: boolean;
  loc: VueSourceLocation;
}

/**
 * Root node of Vue template AST
 */
export interface VueRootNode extends VueTemplateNode {
  type: NodeTypes.ROOT;
  children: VueTemplateNode[];
  loc: VueSourceLocation;
}

/**
 * SFC template block descriptor
 */
export interface VueSFCTemplateBlock {
  type: 'template';
  content: string;
  loc: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
    source: string;
  };
  attrs: Record<string, string | true>;
  ast?: VueRootNode;
}

/**
 * Parsed SFC result containing template info
 */
export interface VueParsedSFC {
  descriptor: {
    template: VueSFCTemplateBlock | null;
    filename: string;
  };
  errors: Array<{ message: string }>;
}

/**
 * Combined result from parsing an SFC
 * Contains both the template AST and positioning info needed for injection
 */
export interface VueSFCParseResult {
  /**
   * The parsed template AST root node
   */
  templateAst: VueRootNode;

  /**
   * Offset where the template content starts in the SFC
   * Used to calculate absolute positions for injection
   */
  templateContentOffset: number;

  /**
   * The original SFC source (needed for magic-string manipulation)
   */
  sfcSource: string;
}
