#!/usr/bin/env bash
# sync-rules.sh — Sync .ai/rules/ to .claude/rules/ and .cursor/rules/
# Usage: bash .ai/sync-rules.sh
# Mirrors the pattern from ai-articles/.ai/sync-rules.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AI_RULES="$SCRIPT_DIR/rules"

CLAUDE_RULES="$REPO_ROOT/.claude/rules"
CURSOR_RULES="$REPO_ROOT/.cursor/rules"

created=0
updated=0
removed=0
errors=0

log() { echo "$1"; }
ok()  { echo "  ✓ $1"; }
err() { echo "  ✗ $1" >&2; ((errors++)) || true; }

# ── Create target directories ────────────────────────────────────────────────
mkdir -p "$CLAUDE_RULES" "$CURSOR_RULES"

# ── Sync rule files ───────────────────────────────────────────────────────────
log "Syncing rules..."
for src in "$AI_RULES"/*.md; do
  [ -e "$src" ] || continue
  basename="$(basename "$src" .md)"

  # Claude Code: .md symlink
  dst_claude="$CLAUDE_RULES/${basename}.md"
  rel_claude="../../.ai/rules/${basename}.md"
  if [ -L "$dst_claude" ]; then
    current="$(readlink "$dst_claude")"
    if [ "$current" != "$rel_claude" ]; then
      ln -sf "$rel_claude" "$dst_claude"
      ok "updated (claude): ${basename}.md"
      ((updated++)) || true
    fi
  else
    ln -s "$rel_claude" "$dst_claude"
    ok "created (claude): ${basename}.md"
    ((created++)) || true
  fi

  # Cursor: .mdc symlink (same source, different extension)
  dst_cursor="$CURSOR_RULES/${basename}.mdc"
  rel_cursor="../../.ai/rules/${basename}.md"
  if [ -L "$dst_cursor" ]; then
    current="$(readlink "$dst_cursor")"
    if [ "$current" != "$rel_cursor" ]; then
      ln -sf "$rel_cursor" "$dst_cursor"
      ok "updated (cursor): ${basename}.mdc"
      ((updated++)) || true
    fi
  else
    ln -s "$rel_cursor" "$dst_cursor"
    ok "created (cursor): ${basename}.mdc"
    ((created++)) || true
  fi
done

# ── Root CLAUDE.md symlink ────────────────────────────────────────────────────
log "Syncing root CLAUDE.md..."
root_target="$REPO_ROOT/CLAUDE.md"
root_link=".ai/rules/general.md"

if [ -L "$root_target" ]; then
  current="$(readlink "$root_target")"
  if [ "$current" != "$root_link" ]; then
    ln -sf "$root_link" "$root_target"
    ok "updated: CLAUDE.md → $root_link"
    ((updated++)) || true
  else
    ok "unchanged: CLAUDE.md → $root_link"
  fi
elif [ -f "$root_target" ]; then
  # Regular file exists — replace with symlink (content already moved to general.md)
  rm "$root_target"
  ln -s "$root_link" "$root_target"
  ok "replaced with symlink: CLAUDE.md → $root_link"
  ((created++)) || true
else
  ln -s "$root_link" "$root_target"
  ok "created: CLAUDE.md → $root_link"
  ((created++)) || true
fi

# ── Remove stale symlinks ─────────────────────────────────────────────────────
log "Checking for stale symlinks..."
for stale in "$CLAUDE_RULES"/*.md "$CURSOR_RULES"/*.mdc; do
  [ -L "$stale" ] || continue
  if [ ! -e "$stale" ]; then
    rm "$stale"
    ok "removed stale: $(basename "$stale")"
    ((removed++)) || true
  fi
done

# ── Verify all symlinks resolve ───────────────────────────────────────────────
log "Verifying symlinks..."
for link in "$CLAUDE_RULES"/*.md "$CURSOR_RULES"/*.mdc; do
  [ -L "$link" ] || continue
  if [ ! -e "$link" ]; then
    err "broken symlink: $link"
  fi
done

# ── Install git pre-push hook ─────────────────────────────────────────────────
log "Installing git hook..."
hook_src=".ai/hooks/pre-push"
hook_dst="$REPO_ROOT/.git/hooks/pre-push"
hook_content="#!/usr/bin/env bash
# Delegates to the source-controlled hook in .ai/hooks/pre-push
exec \"\$(git rev-parse --show-toplevel)/.ai/hooks/pre-push\" \"\$@\""

if [ -f "$hook_dst" ] && ! grep -q "\.ai/hooks/pre-push" "$hook_dst" 2>/dev/null; then
  err "pre-push hook already exists and is not managed by this repo — skipping"
else
  echo "$hook_content" > "$hook_dst"
  chmod +x "$hook_dst"
  ok "installed: .git/hooks/pre-push → $hook_src"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Done: ${created} created, ${updated} updated, ${removed} removed, ${errors} errors"
[ "$errors" -eq 0 ] || exit 1
