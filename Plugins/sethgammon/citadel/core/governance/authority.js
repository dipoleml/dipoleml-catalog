'use strict';

const fs = require('fs');
const path = require('path');
const {
  canonicalClone,
  deepFreeze,
  sha256Digest,
} = require('./canonical');
const { readJournalFile } = require('./journal');
const {
  GovernanceReceiptError,
  governanceStorePaths,
  readDecisionReceipt,
  receiptFileName,
  sameSubject,
  validateAuthoritySubject,
  validateDecisionReceipt,
} = require('./receipts');

function authorizationResult(input) {
  return deepFreeze({
    authorized: input.authorized,
    status: input.authorized ? 'passed' : 'unknown',
    authorization_code: input.code,
    subject: canonicalClone(input.subject),
    requested_disposition: input.requestedDisposition,
    decision_digest: input.decisionDigest || null,
    receipt_digest: input.receiptDigest || null,
  });
}

function deny(subject, requestedDisposition, code, receipt = null) {
  return authorizationResult({
    authorized: false,
    code,
    subject,
    requestedDisposition,
    decisionDigest: receipt?.decision?.decision_digest,
    receiptDigest: receipt?.receipt_digest,
  });
}

function verifyReceiptLink(entries, receipt) {
  const linked = entries[receipt.journal_sequence - 1];
  if (!linked || linked.sequence !== receipt.journal_sequence
    || linked.entry_hash !== receipt.journal_entry_hash
    || linked.record_type !== 'decision'
    || linked.payload.decision_digest !== receipt.decision.decision_digest
    || linked.payload_digest !== sha256Digest(receipt.decision)) {
    return 'JOURNAL_LINK_INVALID';
  }
  const laterForSubject = entries.slice(receipt.journal_sequence)
    .some((entry) => ['observation', 'decision'].includes(entry.record_type)
      && sameSubject(entry.payload.subject, receipt.subject));
  return laterForSubject ? 'DECISION_NOT_LATEST' : null;
}

function sha256Pattern(value) {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
}

function authorizeDecision(projectRoot, subject, requestedDisposition) {
  const identity = { kind: subject?.kind, id: subject?.id };
  const subjectErrors = validateAuthoritySubject(identity);
  if (subjectErrors.length
    || !sha256Pattern(subject?.digest)
    || !Number.isInteger(subject?.generation)
    || subject.generation < 1
    || !['advance', 'merge'].includes(requestedDisposition)) {
    return deny(
      { kind: subject?.kind || 'other', id: subject?.id || 'invalid' },
      requestedDisposition,
      'INVALID_REQUEST',
    );
  }
  let receipt;
  try {
    receipt = readDecisionReceipt(projectRoot, identity);
  } catch (error) {
    return deny(identity, requestedDisposition, 'RECEIPT_INVALID');
  }
  if (!receipt) return deny(identity, requestedDisposition, 'RECEIPT_MISSING');
  let entries;
  try {
    entries = readJournalFile(governanceStorePaths(projectRoot).journal);
  } catch (error) {
    return deny(identity, requestedDisposition, 'JOURNAL_INVALID', receipt);
  }
  const linkError = verifyReceiptLink(entries, receipt);
  if (linkError) return deny(identity, requestedDisposition, linkError, receipt);
  if (receipt.subject_digest !== subject.digest
    || receipt.subject_generation !== subject.generation) {
    return deny(identity, requestedDisposition, 'SUBJECT_STALE', receipt);
  }
  const decision = receipt.decision;
  if (decision.truth_status !== 'passed' || decision.current !== true
    || !decision.coverage.complete
    || decision.coverage.passed !== decision.coverage.required) {
    return deny(identity, requestedDisposition, 'DECISION_NOT_PASSING', receipt);
  }
  if (receipt.requested_disposition !== requestedDisposition
    || decision.disposition !== requestedDisposition) {
    return deny(identity, requestedDisposition, 'DISPOSITION_MISMATCH', receipt);
  }
  return authorizationResult({
    authorized: true,
    code: 'AUTHORIZED',
    subject: identity,
    requestedDisposition,
    decisionDigest: decision.decision_digest,
    receiptDigest: receipt.receipt_digest,
  });
}

function checkGovernanceStore(projectRoot) {
  const paths = governanceStorePaths(projectRoot);
  if (!fs.existsSync(paths.journal) && !fs.existsSync(paths.decisions)) {
    return deepFreeze({
      status: 'unknown',
      check_code: 'STORE_MISSING',
      entries: 0,
      receipts: 0,
    });
  }
  let entries;
  try {
    entries = readJournalFile(paths.journal);
  } catch (error) {
    return deepFreeze({ status: 'unknown', check_code: 'JOURNAL_INVALID', entries: 0, receipts: 0 });
  }
  const files = fs.existsSync(paths.decisions)
    ? fs.readdirSync(paths.decisions).filter((name) => name.endsWith('.json')).sort()
    : [];
  const expectedReceipts = new Set(entries
    .filter((entry) => entry.record_type === 'decision')
    .map((entry) => receiptFileName(entry.payload.subject)));
  if ([...expectedReceipts].some((name) => !files.includes(name))) {
    return deepFreeze({
      status: 'unknown',
      check_code: 'RECEIPT_MISSING',
      entries: entries.length,
      receipts: files.length,
    });
  }
  for (const name of files) {
    let receipt;
    try {
      receipt = JSON.parse(fs.readFileSync(path.join(paths.decisions, name), 'utf8'));
      const errors = validateDecisionReceipt(receipt);
      if (errors.length || receiptFileName(receipt.subject) !== name) {
        throw new GovernanceReceiptError('RECEIPT_INVALID', errors.join('; '));
      }
    } catch (error) {
      return deepFreeze({
        status: 'unknown',
        check_code: error instanceof GovernanceReceiptError ? 'RECEIPT_INVALID' : 'RECEIPT_UNREADABLE',
        entries: entries.length,
        receipts: files.length,
      });
    }
    const linkError = verifyReceiptLink(entries, receipt);
    if (linkError) {
      return deepFreeze({
        status: 'unknown',
        check_code: linkError,
        entries: entries.length,
        receipts: files.length,
      });
    }
  }
  return deepFreeze({
    status: 'passed',
    check_code: 'STORE_VERIFIED',
    entries: entries.length,
    receipts: files.length,
  });
}

module.exports = Object.freeze({
  authorizeDecision,
  checkGovernanceStore,
  verifyReceiptLink,
});
