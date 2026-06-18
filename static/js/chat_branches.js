// Conversation branching helpers for regenerated assistant turns and edited user turns.

import { state } from './state.js';
import { renderAllMessages } from './renderer.js';
import { assistantTurnStartIndex, branchHostIndex, logIndexToMessagesIndex as rawLogIndexToMessagesIndex } from './chat_log_utils.js';

export function logIndexToMessagesIndex(logIndex, displayLog = state.displayLog) {
  return rawLogIndexToMessagesIndex(logIndex, displayLog);
}

function clone(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function branchLogStart(logIndex, branch, displayLog = state.displayLog) {
  return branch?.kind === 'assistant' ? assistantTurnStartIndex(logIndex, displayLog) : logIndex;
}

function omitSelfBranch(segment = [], kind, absoluteHostIndex = null, absoluteStartIndex = 0) {
  const next = clone(segment) || [];
  let relativeHostIndex = Number.isInteger(absoluteHostIndex)
    ? absoluteHostIndex - absoluteStartIndex
    : branchHostIndex(next, kind);

  if (relativeHostIndex < 0 || relativeHostIndex >= next.length) {
    relativeHostIndex = branchHostIndex(next, kind);
  }

  const host = next[relativeHostIndex];
  if (host?.branch?.kind === kind) delete host.branch;
  return next;
}

function makeVariantFromSlices(messages, displayLog, logStart, messageStart, kind, hostLogIndex = null) {
  return {
    messages: clone(messages.slice(messageStart)),
    displayLog: omitSelfBranch(displayLog.slice(logStart), kind, hostLogIndex, logStart),
  };
}

function makeVariant(turn, logStart, messageStart, kind, hostLogIndex = null) {
  return makeVariantFromSlices(turn.messages, turn.displayLog, logStart, messageStart, kind, hostLogIndex);
}

function findBranchHost(segment = [], kind) {
  const hostIndex = branchHostIndex(segment, kind);
  const host = hostIndex >= 0 ? segment[hostIndex] : null;
  return host?.branch?.kind === kind ? host : null;
}

function putBranchOnSegment(segment = [], branch) {
  const next = omitSelfBranch(segment, branch.kind);
  const hostIndex = branchHostIndex(next, branch.kind);
  if (hostIndex >= 0) next[hostIndex].branch = clone(branch);
  return { segment: next, hostIndex };
}

function applyBranchToTurnSuffix(turn, logStart, messageStart, branch) {
  const activeVariant = branch.variants[branch.active];
  const { segment: displaySegment, hostIndex } = putBranchOnSegment(activeVariant.displayLog, branch);
  turn.displayLog.splice(logStart, turn.displayLog.length - logStart, ...displaySegment);
  turn.messages.splice(messageStart, turn.messages.length - messageStart, ...clone(activeVariant.messages));
  return hostIndex >= 0 ? logStart + hostIndex : -1;
}

function makeBranch(kind, oldSegment, newSegment, existingBranch = null) {
  const existing = existingBranch || findBranchHost(oldSegment.displayLog, kind)?.branch;
  const variants = existing?.variants?.length ? clone(existing.variants) : [clone(oldSegment)];
  const active = Number.isInteger(existing?.active) ? existing.active : 0;

  if (existing) variants[active] = clone(oldSegment);
  variants.push(clone(newSegment));

  return {
    id: existing?.id || crypto.randomUUID(),
    kind,
    active: variants.length - 1,
    variants,
  };
}

export function syncVisibleBranches() {
  const branchHosts = [];
  state.displayLog.forEach((entry, logIndex) => {
    if (entry?.branch?.kind && Array.isArray(entry.branch.variants)) {
      branchHosts.push({ logIndex, branch: entry.branch });
    }
  });

  // Update children before parents so parent suffix snapshots keep nested branch state.
  for (let i = branchHosts.length - 1; i >= 0; i--) {
    const { logIndex } = branchHosts[i];
    const host = state.displayLog[logIndex];
    const branch = host?.branch;
    if (!branch || !Array.isArray(branch.variants)) continue;

    const active = Number.isInteger(branch.active) ? branch.active : 0;
    if (active < 0 || active >= branch.variants.length) continue;

    const logStart = branchLogStart(logIndex, branch);
    const messageStart = logIndexToMessagesIndex(logStart);
    const nextBranch = clone(branch);
    nextBranch.variants[active] = makeVariantFromSlices(
      state.messages,
      state.displayLog,
      logStart,
      messageStart,
      nextBranch.kind,
      logIndex,
    );
    host.branch = nextBranch;
  }
}

export function captureSuffix(turn, logStart, messageStart, kind, hostLogIndex = null) {
  return makeVariant(turn, logStart, messageStart, kind, hostLogIndex);
}

export function attachUserBranch(turn, logStart, messageStart, oldSegment, existingBranch = null) {
  const newSegment = makeVariant(turn, logStart, messageStart, 'user', logStart);
  const branch = makeBranch('user', oldSegment, newSegment, existingBranch);
  return applyBranchToTurnSuffix(turn, logStart, messageStart, branch);
}

export function attachAssistantBranch(turn, logStart, messageStart, oldSegment, hostLogIndex = null, existingBranch = null) {
  const newSegment = makeVariant(turn, logStart, messageStart, 'assistant', hostLogIndex);
  const branch = makeBranch('assistant', oldSegment, newSegment, existingBranch);
  return applyBranchToTurnSuffix(turn, logStart, messageStart, branch);
}

export async function switchBranch(logIndex, variantIndex, persistConversationFor) {
  syncVisibleBranches();

  const host = state.displayLog[logIndex];
  const branch = host?.branch;
  if (!branch || !Array.isArray(branch.variants)) return;
  if (variantIndex < 0 || variantIndex >= branch.variants.length || variantIndex === branch.active) return;

  const logStart = branchLogStart(logIndex, branch);
  const messageStart = logIndexToMessagesIndex(logStart);
  const nextBranch = { ...clone(branch), active: variantIndex };
  const activeVariant = nextBranch.variants[variantIndex];
  const { segment: displaySegment } = putBranchOnSegment(activeVariant.displayLog, nextBranch);

  state.displayLog.splice(logStart, state.displayLog.length - logStart, ...displaySegment);
  state.messages.splice(messageStart, state.messages.length - messageStart, ...clone(activeVariant.messages));
  renderAllMessages(state.displayLog);

  if (state.convId) {
    await persistConversationFor(state.convId, {
      messages: state.messages,
      displayLog: state.displayLog,
    });
  }
}
