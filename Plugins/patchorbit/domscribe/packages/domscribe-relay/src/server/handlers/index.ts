/**
 * HTTP handlers for Domscribe Relay
 * @module @domscribe/relay/server/handlers
 */
export { registerManifestHandlers } from './manifest-handler.js';
export { registerAnnotationHandlers } from './annotation-handler.js';
export {
  registerStatusHandler,
  type StatusHandlerOptions,
} from './status-handler.js';
export { registerHealthHandler } from './health-handler.js';
export { registerShutdownHandler } from './shutdown-handler.js';
