"""Skill service — discovers and serves developer-defined skill files.

Skills are Markdown files stored in the ``skills/`` directory at the project
root.  Each file must have a YAML-style frontmatter block at the top:

    ---
    name: Python Debugging
    description: Step-by-step strategies for debugging Python code and tracebacks.
    ---

    (full skill instructions follow here…)

At the start of every chat turn, ``build_skills_catalog()`` is called to
produce a short system-prompt block listing every discovered skill with its
name, description, and container-side path.  The LLM uses the ``view`` tool
to read a skill file when it decides one is relevant.

The skill files are mounted read-only into the container at ``/skills/`` so
the model can ``view`` them exactly like workspace files.
"""
from __future__ import annotations

import re
from pathlib import Path

# Host-side skills directory — lives next to this file.
SKILLS_DIR = Path(__file__).parent / "skills"

# Where the skills directory is mounted inside the sandbox container.
CONTAINER_SKILLS_DIR = "/skills"


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Extract YAML-style frontmatter from the top of a Markdown file.

    Returns (metadata_dict, body_without_frontmatter).
    If no frontmatter is present, returns ({}, original_text).
    """
    match = re.match(r"^---\s*\n(.*?\n)---\s*\n", text, re.DOTALL)
    if not match:
        return {}, text

    meta: dict = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()

    body = text[match.end():]
    return meta, body


def list_skills() -> list[dict]:
    """Return metadata for every valid skill file in ``skills/``.

    Each entry has:
        name        – human-readable name from frontmatter (falls back to stem)
        description – one-line description from frontmatter
        container_path – path inside the sandbox container
    """
    if not SKILLS_DIR.exists():
        return []

    skills = []
    for path in sorted(SKILLS_DIR.glob("*.md")):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue

        meta, _ = _parse_frontmatter(text)
        stem = path.stem
        skills.append({
            "name": meta.get("name") or stem.replace("_", " ").title(),
            "description": meta.get("description") or "",
            "container_path": f"{CONTAINER_SKILLS_DIR}/{path.name}",
        })

    return skills


def build_skills_catalog() -> str:
    """Return the system-prompt block listing all available skills.

    Returns an empty string if no skills are found.
    """
    skills = list_skills()
    if not skills:
        return ""

    lines = [
        "## Available Skills\n",
        "Assistant have access to the following skill files. "
        "When a skill is relevant to the user's request, use the `view` tool "
        "to read the markdown file before responding.\n",
    ]
    for skill in skills:
        desc = f": {skill['description']}" if skill["description"] else ""
        lines.append(f"- **{skill['name']}** (`{skill['container_path']}`){desc}")

    return "\n".join(lines)


def volume_spec() -> str | None:
    """Return a Docker read-only volume spec for the skills directory.

    Returns None if the skills directory does not exist (no skills defined yet).
    Used by container_service to mount the directory into the sandbox.
    """
    if not SKILLS_DIR.exists() or not any(SKILLS_DIR.glob("*.md")):
        return None

    # Import here to avoid circular imports at module level.
    from docker_path_utils import host_path_to_docker_src
    src = host_path_to_docker_src(str(SKILLS_DIR))
    return f"{src}:{CONTAINER_SKILLS_DIR}:ro"