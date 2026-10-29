#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FORM_URL = 'https://form.typeform.com/to/IRj7WaKH';
const ANSWER_FILE = path.join(ROOT, 'docs', 'grants', 'TYPEFORM_ANSWER_PACK.md');
const EXPECTED_FINGERPRINT = '611739716b3eb5ad7b16a2e93778f91b9b8cc06ff5ffcbe2eb843c4683544dcd';

const EXPECTED_GRANT_FIELDS = Object.freeze([
  ['Your email address', 'email', '| Email |'],
  ['What best describes your primary role?', 'multiple_choice', '| Role |'],
  ['Where are you currently based?', 'short_text', '| City, country |'],
  ['What problem are you solving, and why now?', 'long_text', '### What problem are you solving, and why now?'],
  ['Who does this help?', 'long_text', '### Who does this help?'],
  ['In one line, what are you building?', 'short_text', '### In one line, what are you building?'],
  ['Who is building this, and why is your team the right one to do it?', 'short_text', '### Who is building this, and why is the team right?'],
  ['What’s open about it, and what would get worse if it closed tomorrow, and for whom?', 'long_text', '### What is open, what gets worse if it closed tomorrow, and for whom?'],
  ['Please provide demo or trial links', 'website', '### Demo or trial link'],
  ['Are you interested in applying for the grant track or the investment track?', 'multiple_choice', '| Track |'],
  ['How much grant funding are you asking for?', 'multiple_choice', '| Funding range |'],
  ['What would the grant unlock?', 'long_text', '### What would the grant unlock?'],
  ['Please upload any supporting documents, decks, or research materials.', 'file_upload', '| Supporting document |'],
]);

function extractObject(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert(markerIndex >= 0, `live form HTML is missing ${marker}`);
  const start = source.indexOf('{', markerIndex + marker.length);
  assert(start >= 0, `live form HTML has no object after ${marker}`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated object after ${marker}`);
}

function flattenFields(fields, result = []) {
  for (const field of fields) {
    if (Array.isArray(field.properties && field.properties.fields)) {
      flattenFields(field.properties.fields, result);
    } else result.push(field);
  }
  return result;
}

function findUnique(fields, title) {
  const matches = fields.filter((field) => field.title === title);
  assert.strictEqual(matches.length, 1, `expected one live field titled ${JSON.stringify(title)}, found ${matches.length}`);
  return matches[0];
}

function conditionBindsGrant(action, trackRef, grantChoiceRef) {
  const variables = action.condition && action.condition.vars;
  return Array.isArray(variables)
    && variables.some((value) => value.type === 'field' && value.value === trackRef)
    && variables.some((value) => value.type === 'choice' && value.value === grantChoiceRef);
}

async function main() {
  const response = await fetch(FORM_URL, {
    headers: {
      accept: 'text/html',
      'user-agent': 'Citadel-Sentient-Grant-Contract/1.0',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  assert.strictEqual(response.ok, true, `${FORM_URL} returned HTTP ${response.status}`);
  const html = await response.text();
  const rendererIndex = html.indexOf('window.rendererData =');
  assert(rendererIndex >= 0, 'live form HTML is missing window.rendererData');
  const form = JSON.parse(extractObject(html.slice(rendererIndex), '\n              form:'));
  assert.strictEqual(form.id, 'IRj7WaKH');

  const fields = flattenFields(form.fields);
  const answers = fs.readFileSync(ANSWER_FILE, 'utf8');
  const mappedFields = EXPECTED_GRANT_FIELDS.map(([title, type, marker]) => {
    const field = findUnique(fields, title);
    assert.strictEqual(field.type, type, `${title}: live field type drifted`);
    assert.strictEqual(field.validations && field.validations.required, true, `${title}: live required status drifted`);
    assert.ok(answers.includes(marker), `${title}: answer pack is missing ${JSON.stringify(marker)}`);
    return {
      ref: field.ref,
      title: field.title,
      type: field.type,
      required: field.validations.required,
      max_length: field.validations.max_length || null,
    };
  });

  const oneLine = findUnique(fields, 'In one line, what are you building?');
  assert.strictEqual(oneLine.validations.max_length, 80, 'one-line maximum length drifted');

  const track = findUnique(fields, 'Are you interested in applying for the grant track or the investment track?');
  const grantChoice = track.properties.choices.find((choice) => choice.label === 'Grant');
  assert.ok(grantChoice, 'Grant choice is missing from the live track field');
  const funding = findUnique(fields, 'How much grant funding are you asking for?');
  assert.deepStrictEqual(funding.properties.choices.map((choice) => choice.label), ['10k', '25k', '50k', '>50k']);

  const upload = findUnique(fields, 'Please upload any supporting documents, decks, or research materials.');
  const howHeard = findUnique(fields, 'How did you hear about this program');
  const uploadIndex = form.fields.findIndex((field) => field.ref === upload.ref);
  const howHeardIndex = form.fields.findIndex((field) => field.ref === howHeard.ref);
  assert(uploadIndex >= 0 && howHeardIndex > uploadIndex, 'combined form no longer places how-heard after the Grant upload');
  const actualGrantPath = flattenFields(form.fields.slice(0, uploadIndex + 1))
    .filter((field) => field.type !== 'statement');
  assert.deepStrictEqual(
    actualGrantPath.map((field) => field.title),
    EXPECTED_GRANT_FIELDS.map(([title]) => title),
    'ordered Grant path added, removed, or reordered an answer field',
  );
  const uploadLogic = form.logic.find((entry) => entry.ref === upload.ref);
  assert(uploadLogic, 'Grant upload no longer has branch logic');
  const grantExit = uploadLogic.actions.find((action) => (
    action.action === 'jump'
      && action.details && action.details.to && action.details.to.type === 'thankyou'
      && conditionBindsGrant(action, track.ref, grantChoice.ref)
  ));
  assert(grantExit, 'Grant path no longer jumps from the required upload to thank-you');
  assert.ok(!answers.includes('[HOW SETH HEARD ABOUT SENTIENT]'), 'answer pack reintroduced the skipped how-heard field');

  const contract = {
    schema: 1,
    form_id: form.id,
    form_title: form.title,
    grant_fields: mappedFields,
    branch: {
      track_ref: track.ref,
      grant_choice_ref: grantChoice.ref,
      upload_ref: upload.ref,
      thankyou_ref: grantExit.details.to.value,
      skipped_how_heard_ref: howHeard.ref,
    },
  };
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(contract)).digest('hex');
  assert.strictEqual(fingerprint, EXPECTED_FINGERPRINT, 'live Grant contract fingerprint drifted');
  process.stdout.write(`Sentient live Grant form passed: ${mappedFields.length} required fields, upload-to-thank-you branch, sha256:${fingerprint}\n`);
}

main().catch((error) => {
  process.stderr.write(`Sentient live Grant form failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
