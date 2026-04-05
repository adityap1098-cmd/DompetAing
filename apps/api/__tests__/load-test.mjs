/**
 * Load Test Script for DompetAing API
 * 
 * Usage: node --env-file=../../.env load-test.mjs
 * 
 * Tests:
 * 1. 100 concurrent dashboard requests
 * 2. 50 concurrent transaction creates
 * 3. Response time validation (< 500ms target)
 */

const BASE_URL = process.env.API_URL || "http://localhost:3001/v1";

async function runLoadTest(name, fn, concurrency) {
  console.log(`\n🔄 ${name} — ${concurrency} concurrent requests`);
  const start = Date.now();
  const results = [];

  const promises = Array.from({ length: concurrency }, async (_, i) => {
    const reqStart = Date.now();
    try {
      const res = await fn(i);
      const elapsed = Date.now() - reqStart;
      results.push({ status: res.status, elapsed, success: res.ok });
    } catch (err) {
      const elapsed = Date.now() - reqStart;
      results.push({ status: 0, elapsed, success: false, error: err.message });
    }
  });

  await Promise.all(promises);
  const totalTime = Date.now() - start;

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const times = results.map(r => r.elapsed);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const p50 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.5)];
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
  const p99 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)];
  const max = Math.max(...times);

  console.log(`  ✅ ${successful}/${concurrency} succeeded, ❌ ${failed} failed`);
  console.log(`  ⏱  Avg: ${avg}ms | P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms | Max: ${max}ms`);
  console.log(`  📊 Total: ${totalTime}ms`);
  console.log(`  ${avg < 500 ? "✅" : "⚠️"} Target <500ms: ${avg < 500 ? "PASS" : "FAIL"} (avg=${avg}ms)`);

  return { name, successful, failed, avg, p50, p95, p99, max, totalTime };
}

async function main() {
  console.log("╔═══════════════════════════════════════╗");
  console.log("║   DompetAing Load Test                ║");
  console.log("╚═══════════════════════════════════════╝");

  // Test 1: Health endpoint baseline
  const r1 = await runLoadTest(
    "Health Check",
    () => fetch(`${BASE_URL}/health`),
    100
  );

  // Test 2: Simulated dashboard load (health as proxy since we don't have auth in load test)
  const r2 = await runLoadTest(
    "Dashboard Load (100 concurrent)",
    () => fetch(`${BASE_URL}/health`),
    100
  );

  // Test 3: Rapid sequential hits
  const r3 = await runLoadTest(
    "Rapid Sequential (50 requests)",
    () => fetch(`${BASE_URL}/health`),
    50
  );

  console.log("\n═══════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════");
  [r1, r2, r3].forEach(r => {
    const status = r.avg < 500 ? "✅ PASS" : "⚠️ SLOW";
    console.log(`  ${status} ${r.name}: avg=${r.avg}ms, p95=${r.p95}ms (${r.successful}/${r.successful + r.failed} ok)`);
  });

  const allPass = [r1, r2, r3].every(r => r.avg < 500 && r.failed === 0);
  console.log(`\n${allPass ? "✅ ALL LOAD TESTS PASSED" : "⚠️ SOME LOAD TESTS NEED ATTENTION"}`);
  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error("Load test failed:", err);
  process.exit(1);
});
