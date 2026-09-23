import { mkdirSync, writeFileSync } from 'node:fs';
import { assessmentFixture, assessmentAssets } from './assessment-fixture.mjs';
import { createAssessmentPdf } from '../functions/_lib/assessment-pdf.js';
const input = assessmentFixture(); input.report.date = '5 September 2026';
mkdirSync('output/pdf', { recursive: true });
writeFileSync('output/pdf/WOW-Assessment-Report-Corrected.pdf', await createAssessmentPdf(input, assessmentAssets()));
writeFileSync('tmp/pdfs/assessment-input.json', JSON.stringify(input, null, 2));
console.log('Generated corrected report from the real assessment engine.');
