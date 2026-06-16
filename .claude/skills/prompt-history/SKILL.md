---
description: Distil a Claude Code session into a movie/drama script-style document saved under docs/ai-prompts/ — capturing both sides of the conversation with real verbatim dialogue and brief stage directions.
argument-hint: "[title or topic description] — optional, becomes the episode title and output filename"
---

# prompt-history

Extract the most meaningful parts of a Claude Code session and write them as a two-sided movie/drama script saved to `docs/ai-prompts/`.

The output is NOT a transcript dump — it is a curated narrative that captures the real decisions, debates, pivots, and discoveries. Routine housekeeping (file moves, server restarts, CI noise) is excluded unless it caused something surprising.

## Input

`$ARGUMENTS` — optional episode title / topic description. If omitted, derive a title from the session content. The output filename will be `docs/ai-prompts/YYYY-MM-DD-<slugified-title>.md`.

## Steps

### 1 — Locate the session transcripts

Claude Code stores session transcripts as JSONL files:

```
/home/srt/.claude/projects/-media-srt-Files-tamim-dev-veribir-barkomas-dev/*.jsonl
```

List them sorted by modification time:

```bash
ls -lt /home/srt/.claude/projects/-media-srt-Files-tamim-dev-veribir-barkomas-dev/*.jsonl | head -10
```

The **current session** is the most recently modified file. Older sessions are separate files. Each line is a JSON object with:
- `type`: `"user"` or `"assistant"`
- `message.content`: either a plain string or an array of `{ "type": "text", "text": "..." }` objects (use `.text` of the first element with `type: "text"`)
- `timestamp`: ISO 8601

### 2 — Extract both sides with a Python script

Run a Python one-liner to extract all messages from the target JSONL file(s), preserving both USER and CLAUDE turns. Save to a temp file to avoid printing 10MB to the terminal:

```bash
python3 - <<'EOF'
import json, sys, textwrap

path = "/home/srt/.claude/projects/-media-srt-Files-tamim-dev-veribir-barkomas-dev/REPLACE_WITH_FILENAME.jsonl"
out  = path.replace(".jsonl", "-messages.txt")

with open(path) as f, open(out, "w") as o:
    idx = {"user": 0, "assistant": 0}
    for line in f:
        try:
            obj = json.loads(line)
        except:
            continue
        role = obj.get("type")
        if role not in ("user", "assistant"):
            continue
        content = obj.get("message", {}).get("content", "")
        if isinstance(content, list):
            parts = [b["text"] for b in content if isinstance(b, dict) and b.get("type") == "text"]
            text = "\n".join(parts).strip()
        else:
            text = str(content).strip()
        if not text:
            continue
        idx[role] += 1
        ts = obj.get("timestamp", "")[:19]
        label = f"[{role.upper()} #{idx[role]} @ {ts}]"
        o.write(f"\n{label}\n{text}\n")

print(f"Written to {out}")
EOF
```

Then read the output file with the `Read` tool, sampling key sections (first 200 lines for Act I, later sections for Act II/III etc.).

To quickly find thematic boundaries use bash grep:
```bash
grep -n "^\[USER" /path/to/messages.txt | head -80
```

### 3 — Identify the narrative structure

Read through the extracted messages and identify:

- **Acts**: natural turning points where the conversation shifts (a new goal, a major pivot, a crisis, a resolution). Typically 2–4 acts per session.
- **Scenes to INCLUDE**: substantive brainstorming, schema/architecture decisions, debates between alternatives, surprising discoveries, failed attempts that led somewhere, and key "aha" moments.
- **Scenes to EXCLUDE**: file moves, server start/stop, CI output, fixing typos, the meta-request to create this document itself, and any routine housekeeping with no lasting consequence.

Give each act a short dramatic title (e.g. "The Great Schema Rethink", "Missing Drawings").

### 4 — Write the script

Create `docs/ai-prompts/YYYY-MM-DD-<title>.md` with this structure:

```markdown
# Episode: "<Dramatic Title>"

**Spans:** YYYY-MM-DD → YYYY-MM-DD
**Setting:** one-sentence description of the project context and what was at stake

---

## ACT I — <ACT TITLE>

*Brief stage direction: sets the scene in italics.*

**USER:** [verbatim, lightly trimmed for clarity — never paraphrased]

**CLAUDE:** [key response, condensed to the essential reasoning — keep any design decisions, warnings, or architectural choices verbatim; cut boilerplate and step-by-step narration]

...alternating USER/CLAUDE exchanges...

*(Stage direction: describes a transition, time skip, or off-screen event in italics.)*

---

## ACT II — <ACT TITLE>

...
```

**Dialogue rules:**
- `**USER:**` — verbatim. Trim only run-on sentences that add no meaning. Never paraphrase.
- `**CLAUDE:**` — condense to the key content. Keep: design decisions, warnings, self-corrections, and anything the user responded to. Cut: "I'll now...", "Let me...", enumerated step announcements, and repetitive confirmations.
- `*(Stage direction)*` — italic prose for transitions, off-screen work, time skips, or context the reader needs but that wasn't said aloud.

**What makes a good stage direction vs. dialogue:**
- Use a stage direction when Claude did a lot of silent work (tool calls, builds, file writes) — summarise the outcome in one sentence.
- Use dialogue when the reasoning or decision was *spoken* — i.e. visible in the message text.

**Tone:** crisp, slightly dramatic. The reader is a future developer reading this to understand *why* the project is the way it is — not a casual audience.

### 5 — Save and confirm

Write the file via the `Write` tool. Report:
- File path created
- Acts and scene count
- Date range covered
- Any sessions that were NOT included (and why)
