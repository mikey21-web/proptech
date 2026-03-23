import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { unauthorized, forbidden } from '@/lib/api-response';

/**
 * Prometheus-compatible metrics endpoint
 * GET /api/metrics — restricted to super_admin
 */

let requestCount = 0;
let errorCount = 0;

function incrementRequestCount() { requestCount++; }
function incrementErrorCount() { errorCount++; }

export async function GET() {
  const auth = await requireAuth(['super_admin']);
  if (!auth.authorized) {
    return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
  }
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  const metrics = [
    '# HELP clickprops_uptime_seconds Application uptime in seconds',
    '# TYPE clickprops_uptime_seconds gauge',
    `clickprops_uptime_seconds ${uptime.toFixed(2)}`,
    '',
    '# HELP clickprops_memory_heap_used_bytes Heap memory used',
    '# TYPE clickprops_memory_heap_used_bytes gauge',
    `clickprops_memory_heap_used_bytes ${memUsage.heapUsed}`,
    '',
    '# HELP clickprops_memory_heap_total_bytes Total heap memory',
    '# TYPE clickprops_memory_heap_total_bytes gauge',
    `clickprops_memory_heap_total_bytes ${memUsage.heapTotal}`,
    '',
    '# HELP clickprops_memory_rss_bytes Resident set size',
    '# TYPE clickprops_memory_rss_bytes gauge',
    `clickprops_memory_rss_bytes ${memUsage.rss}`,
    '',
    '# HELP clickprops_memory_external_bytes External memory',
    '# TYPE clickprops_memory_external_bytes gauge',
    `clickprops_memory_external_bytes ${memUsage.external}`,
    '',
    '# HELP clickprops_requests_total Total HTTP requests',
    '# TYPE clickprops_requests_total counter',
    `clickprops_requests_total ${requestCount}`,
    '',
    '# HELP clickprops_errors_total Total errors',
    '# TYPE clickprops_errors_total counter',
    `clickprops_errors_total ${errorCount}`,
    '',
    '# HELP nodejs_version_info Node.js version',
    '# TYPE nodejs_version_info gauge',
    `nodejs_version_info{version="${process.version}"} 1`,
    '',
  ].join('\n');

  return new NextResponse(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
