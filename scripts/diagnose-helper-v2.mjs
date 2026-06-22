import { readFileSync } from 'fs';
import { resolve } from 'path';

// I will look for any historical report that might contain scores.
// Since I can't find a JSON with scores, I'll check if there's any markdown report.

console.log("Protagonist Consistency Analysis - Score retrieval");
console.log("Analyzing PROD_BASELINE_2_EXECUTION_LOG.md for consistency mentions...");

const log = readFileSync('docs/smoke-results/PROD_BASELINE_2_EXECUTION_LOG.md', 'utf8');
if (log.includes("consistency")) {
    console.log("Found consistency mentions in log.");
}

console.log("Analyzing quality metrics definitions...");
const metrics = readFileSync('docs/QUALITY_METRICS.md', 'utf8');
console.log(metrics.split('\n').filter(l => l.includes('character consistency')).join('\n'));
