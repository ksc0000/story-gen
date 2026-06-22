import { readFileSync } from 'fs';
import { resolve } from 'path';

const baselineDataPath = resolve('docs/smoke-results/PROD_BASELINE_2_DATA.json');
const data = JSON.parse(readFileSync(baselineDataPath, 'utf8'));

console.log("Book IDs and metadata from baseline:");
data.filter(b => b.status === 'completed' || b.status === 'partial_completed').forEach(b => {
    console.log(`ID: ${b.bookId}, Status: ${b.status}, Model: ${b.imageModel}, Cohort: ${b.cohort}`);
});
