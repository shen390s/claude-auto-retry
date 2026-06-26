import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, unlink, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { injectWrapper, removeWrapper, installFishWrapper, removeFishWrapper, MARKER_START, MARKER_END } from '../bin/cli.js';

describe('injectWrapper', () => {
  const testFile = join(tmpdir(), `car-rc-test-${Date.now()}`);
  afterEach(async () => { try { await unlink(testFile); } catch {} });

  it('adds wrapper to empty file', async () => {
    await writeFile(testFile, '');
    await injectWrapper(testFile, '/path/to/launcher.js');
    const content = await readFile(testFile, 'utf-8');
    assert.ok(content.includes(MARKER_START));
    assert.ok(content.includes(MARKER_END));
    assert.ok(content.includes('/path/to/launcher.js'));
  });
  it('adds wrapper to file with existing content', async () => {
    await writeFile(testFile, 'export PATH=$HOME/bin:$PATH\n');
    await injectWrapper(testFile, '/path/to/launcher.js');
    const content = await readFile(testFile, 'utf-8');
    assert.ok(content.includes('export PATH'));
    assert.ok(content.includes(MARKER_START));
  });
  it('replaces existing wrapper', async () => {
    await writeFile(testFile, `before\n${MARKER_START}\nold stuff\n${MARKER_END}\nafter\n`);
    await injectWrapper(testFile, '/new/path/launcher.js');
    const content = await readFile(testFile, 'utf-8');
    assert.ok(content.includes('/new/path'));
    assert.ok(!content.includes('old stuff'));
    assert.ok(content.includes('before'));
    assert.ok(content.includes('after'));
  });
});

describe('removeWrapper', () => {
  const testFile = join(tmpdir(), `car-rm-test-${Date.now()}`);
  afterEach(async () => { try { await unlink(testFile); } catch {} });

  it('removes wrapper and preserves surrounding content', async () => {
    await writeFile(testFile, `before\n${MARKER_START}\nwrapper stuff\n${MARKER_END}\nafter\n`);
    await removeWrapper(testFile);
    const content = await readFile(testFile, 'utf-8');
    assert.ok(!content.includes(MARKER_START));
    assert.ok(content.includes('before'));
    assert.ok(content.includes('after'));
  });
  it('does nothing when no wrapper present', async () => {
    await writeFile(testFile, 'just normal content\n');
    await removeWrapper(testFile);
    const content = await readFile(testFile, 'utf-8');
    assert.equal(content, 'just normal content\n');
  });
});

describe('installFishWrapper', () => {
  const testDir = join(tmpdir(), `car-fish-test-${Date.now()}`);
  afterEach(async () => { try { await rm(testDir, { recursive: true }); } catch {} });

  it('creates fish function file with correct content', async () => {
    // Temporarily override FISH_FUNCTION_DIR by testing the raw file output
    const dest = await installFishWrapper('/path/to/launcher.js');
    const content = await readFile(dest, 'utf-8');
    assert.ok(content.includes(MARKER_START));
    assert.ok(content.includes(MARKER_END));
    assert.ok(content.includes('/path/to/launcher.js'));
    assert.ok(content.includes('function claude'));
    assert.ok(content.includes('set -gx CLAUDE_AUTO_RETRY_ACTIVE 1'));
  });
});

describe('removeFishWrapper', () => {
  it('removes fish function file when it contains our marker', async () => {
    // installFishWrapper creates the file, removeFishWrapper should delete it
    const dest = await installFishWrapper('/path/to/launcher.js');
    await removeFishWrapper();
    let exists = true;
    try { await readFile(dest, 'utf-8'); } catch { exists = false; }
    assert.ok(!exists);
  });
});

describe('wrapper.fish template', () => {
  it('contains proper fish syntax', async () => {
    const content = await readFile(join(import.meta.dirname, '..', 'src', 'wrapper.fish'), 'utf-8');
    assert.ok(content.includes('function claude'));
    assert.ok(content.includes('end'));
    assert.ok(content.includes('$argv'));
    assert.ok(content.includes('__LAUNCHER_PATH__'));
  });
});

describe('detectOS - NixOS', () => {
  it('nixos entry exists in installTmux cmds', async () => {
    // Verify the source contains nixos support
    const cliSrc = await readFile(join(import.meta.dirname, '..', 'bin', 'cli.js'), 'utf-8');
    assert.ok(cliSrc.includes("nixos: ['nix-env', ['-iA', 'nixpkgs.tmux']]"));
    assert.ok(cliSrc.includes("ID=nixos"));
  });
});
