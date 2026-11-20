import { describe, it, expect } from 'vitest';
import {
  slug,
  resolveRef,
  firstSentence,
  titleOf,
  linkProblems,
  buildLlmsTxt,
} from './build-llms-txt.mjs';

describe('build-llms-txt (GitHub #666)', () => {
  it('makes GitHub heading anchors', () => {
    expect(slug('i18n rules — follow these exactly')).toBe('i18n-rules--follow-these-exactly');
    expect(slug('Debugging — `?debug=1` is the in-app inspector')).toBe(
      'debugging--debug1-is-the-in-app-inspector',
    );
  });

  it('resolves a decision id to its file and leaves a path alone', () => {
    expect(resolveRef('ADR-058')).toBe('docs/adr/ADR-058.md');
    expect(resolveRef('docs/ops/rollback.md')).toBe('docs/ops/rollback.md');
    expect(() => resolveRef('ADR-999')).toThrow(/no file/);
  });

  it('takes the first sentence, not a cut at "e.g."', () => {
    expect(firstSentence('# T\n\nA route shows it (e.g. /fly?debug=1) at once. More.')).toBe(
      'A route shows it (e.g. /fly?debug=1) at once.',
    );
    expect(firstSentence('```\ncode line that is long enough\n```\nThe prose line here.')).toBe(
      'The prose line here.',
    );
  });

  it('titles a doc by its H1, a skill by its name', () => {
    expect(titleOf('# Hello **world**\n\ntext', 'x')).toBe('Hello world');
    expect(titleOf('---\nname: i18n-audit\n---\n\nbody', 'x')).toBe('i18n-audit');
  });

  it('reports a missing file and a missing AGENTS.md anchor', () => {
    expect(linkProblems('- [a](AGENTS.md#no-such-heading-here)')).toEqual([
      'missing anchor: AGENTS.md#no-such-heading-here',
    ]);
    expect(linkProblems('- [a](docs/nope.md)')).toEqual(['missing file: docs/nope.md']);
    expect(linkProblems('- [a](AGENTS.md#i18n-rules--follow-these-exactly)')).toEqual([]);
  });

  it('builds an llms.txt in the llmstxt.org shape, under 30 KB, every link resolving', () => {
    const txt = buildLlmsTxt();
    expect(txt.startsWith('# Orrery\n\n> ')).toBe(true);
    expect(txt).toContain('\n## Agent rules\n');
    expect(txt).toContain('\n## Optional\n');
    expect(Buffer.byteLength(txt)).toBeLessThan(30_000);
    expect(linkProblems(txt)).toEqual([]);
  });
});
