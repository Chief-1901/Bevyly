/**
 * Intent Module
 * 
 * Powers the Intent-Driven Sales OS by detecting signals, 
 * identifying patterns, and generating recommendations.
 * 
 * Endpoints:
 * - GET /intent/briefing - User's personalized briefing with signals + recommendations
 * - POST /intent/briefing/refresh - Refresh signals and recommendations
 * - GET /intent/signals - List active signals
 * - GET /intent/signals/:id - Get signal detail
 * - POST /intent/signals/:id/resolve - Resolve/dismiss a signal
 * - GET /intent/recommendations - List recommendations
 * - GET /intent/recommendations/:id - Get recommendation detail
 * - PATCH /intent/recommendations/:id - Update recommendation status
 * - POST /intent/recommendations/:id/feedback - Record feedback
 */

export { intentRouter } from './routes.js';
export * as signalsService from './signals.service.js';
export * as recommendationsService from './recommendations.service.js';
