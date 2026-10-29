/**
 * Vue SFC parser exports
 * @module @domscribe/transform/parsers/vue
 */

export { VueSFCParser, createVueSFCParser } from './vue-sfc.parser.js';
export type {
  VueElementNode,
  VueRootNode,
  VueSFCParseResult,
  VueAttributeNode,
  VueDirectiveNode,
  VueSFCTemplateBlock,
  VueParsedSFC,
  VueSourceLocation,
  VueSourcePosition,
  VueTemplateNode,
  NodeTypes,
  ElementTypes,
} from './types.js';
