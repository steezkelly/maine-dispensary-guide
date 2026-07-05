#!/usr/bin/env python3
"""
R127 migrator v3 — handles BOTH proper and compressed frontmatter correctly.

Approach: extract the import statements from the frontmatter (if any), add
the AutoRelated import, then rewrite the file. The frontmatter structure
is:

  ---                          <- opening
  import X from 'Y';           <- imports
  import Z from 'W';
  const foo = ...;             <- declarations
  ---                          <- closing

For PROPER format, both --- are on their own lines. For COMPRESSED, the
opening --- might be glued to the first import, and the closing --- might
be glued to the body.

Strategy: find the first "---" (opening), then find the closing "---" (next
delimiter that has at least one import or const/let/var declaration AFTER
the opening and BEFORE the closing).

For the body: find <h2>Related Guides/Further Reading/Related/Nearby</h2> ...
</ul> and replace with <AutoRelated ... />.
"""
import os, re

PAGES_DIR = '/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/pages'

def get_import_path(file_path: str) -> str:
    rel = file_path.replace(PAGES_DIR + '/', '')
    if '/' in rel:
        return '../../components/AutoRelated.astro'
    return '../components/AutoRelated.astro'

def get_url(file_path: str) -> str:
    rel = file_path.replace(PAGES_DIR, '').replace('.astro', '')
    if rel.endswith('/index'):
        rel = rel[:-len('/index')]
    if not rel.startswith('/'):
        rel = '/' + rel
    return rel

def extract_meta(text: str) -> tuple[str, list[str]]:
    section = ''
    m = re.search(r"section:\s*['\"]([^'\"]+)['\"]", text)
    if m:
        section = m.group(1)
    topics = []
    m = re.search(r"const\s+topics\s*=\s*\[([^\]]+)\]", text)
    if m:
        for tm in re.finditer(r"['\"]([^'\"]+)['\"]", m.group(1)):
            t = tm.group(1).strip()
            if t and t not in topics:
                topics.append(t)
    return section, topics


def find_frontmatter_bounds(text: str) -> tuple[int, int, str]:
    """Return (open_pos, close_pos, close_kind) where:
    - open_pos: char position of opening ---
    - close_pos: char position of closing --- (or -1 if compressed_close)
    - close_kind: 'proper' (closing on own line), 'inline' (closing glued to body), 'missing' (no closing)
    """
    m = re.search(r'^\s*---\s*$', text, re.M)
    if not m:
        # try inline opening: --- at start of line followed by code
        m = re.search(r'^\s*---\s', text, re.M)
        if not m:
            return (-1, -1, 'missing')
    open_start = m.start()
    # find next standalone --- (a line that is ONLY ---)
    rest_after_open = text[m.end():]
    m2 = re.search(r'^\s*---\s*$', rest_after_open, re.M)
    if m2:
        return (open_start, m2.start() + m.end(), 'proper')
    # no standalone closing --- — the closing is glued to body
    return (open_start, -1, 'inline')


ok_count = 0
skip_count = 0
fail_count = 0
fails = []

for root, dirs, files in os.walk(PAGES_DIR):
    for f in files:
        if not f.endswith('.astro'):
            continue
        path = os.path.join(root, f)
        text = open(path).read()
        if '<AutoRelated' in text and 'import AutoRelated from' in text:
            skip_count += 1
            continue

        section, topics = extract_meta(text)
        url = get_url(path)
        import_path = get_import_path(path)
        topics_str = '[' + ', '.join(f"'{t}'" for t in topics) + ']'

        # Step 1: find body
        # find the <h2>Related Guides/Further Reading/Related/Nearby</h2>
        h2_patterns = [
            r'<h2[^>]*>(?:Related Guides|Further Reading|Related Reading|Related Policy Developments|Nearby Markets to Compare|Nearby Dispensary Clusters|Nearby Markets and Regional Strategy|Nearby Markets|Nearby Dispensary Options)[^<]*</h2>',
            r'<h2[^>]*>(?:Related Guides|Further Reading|Related)[^<]*</h2>',
        ]
        h2_match = None
        for pat in h2_patterns:
            m = re.search(pat, text)
            if m:
                h2_match = m
                break
        if not h2_match:
            fail_count += 1
            fails.append((path, "no Related Guides header"))
            continue

        ul_close = text.find('</ul>', h2_match.end())
        if ul_close == -1:
            fail_count += 1
            fails.append((path, "no </ul> after h2"))
            continue

        # Step 2: find frontmatter bounds
        fm_start, fm_end, fm_kind = find_frontmatter_bounds(text)
        if fm_start == -1:
            fail_count += 1
            fails.append((path, "no --- opening delimiter"))
            continue

        # Step 3: ensure import is in frontmatter
        if 'import AutoRelated from' in text:
            # already has it (race condition?), skip
            skip_count += 1
            continue

        # Insert import as a new line at the start of the frontmatter content
        # We want the import in a position that Astro recognizes as part of frontmatter.
        # If the opening --- is on its own line: insert as new line after the opening ---.
        # If the opening --- is glued to the first import: insert as new line after the first
        # import statement (which is on the same line as the opening ---).
        first_line_end = text.find('\n', fm_start)
        first_line = text[fm_start:first_line_end]
        has_inline_import = first_line.startswith('--- import') or 'import ' in first_line[3:10]

        import_line = f"import AutoRelative from '{import_path}';"
        # correct variable name (typo: AutoRelative):
        import_line = f"import AutoRelated from '{import_path}';"

        if has_inline_import:
            # find the first `;` after the opening `---` and insert after it
            insert_pos = text.find(';', fm_start) + 1
        else:
            # opening --- is on its own line; insert on a new line after it
            insert_pos = first_line_end + 1  # after the newline

        # Step 4: replace the h2 + ul with AutoRelated
        # NOTE: limit={6} (single braces for number literal), currentTopics={['a','b']} (single braces for array literal)
        replacement = '<AutoRelated currentPath="' + url + '" currentTopics={' + topics_str + '}' + (' section="' + section + '"' if section else '') + ' limit={6} />'
        body_before = text[:h2_match.start()]
        body_after = text[ul_close + len('</ul>'):]
        body = body_before + replacement + body_after

        # Step 5: insert the import into the frontmatter
        if has_inline_import:
            # Insert as a new line AFTER the existing first import (on the same line
            # as the opening ---, or as a new line if we want)
            # Easier: insert as new line at start of file (before the opening ---)
            # NO — the import must be AFTER the opening --- for Astro to parse it.
            # Insert after the first ; (end of first import statement)
            new_body = body[:insert_pos] + '\n' + import_line + body[insert_pos:]
        else:
            new_body = body[:insert_pos] + import_line + '\n' + body[insert_pos:]

        open(path, 'w').write(new_body)
        ok_count += 1

print(f"Total: ok={ok_count}, skip={skip_count}, fail={fail_count}")
if fails:
    print("\nFirst 5 failures:")
    for p, m in fails[:5]:
        print(f"  {p}: {m}")