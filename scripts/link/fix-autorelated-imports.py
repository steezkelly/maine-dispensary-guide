#!/usr/bin/env python3
"""
R128 fixup v2 — find files where `import AutoRelated` is NOT in the
frontmatter (it's somewhere in the body) and move it into the frontmatter
properly.

Strategy:
1. For each file with `<AutoRelated />` in body:
   - Find the frontmatter bounds (opening `---` to next standalone `---`)
   - If `import AutoRelated` is NOT inside the frontmatter bounds:
     - Find where it currently is in the file
     - Move it inside the frontmatter (just after the opening `---`)
2. For compressed-frontmatter files where frontmatter is one giant line:
   - Insert `import AutoRelated from '...';` immediately after the opening ---
   - Or, if the next --- follows inline (e.g., `...; --- <Layout>`),
     insert it as a new line before that closing ---.
"""
import os, re

PAGES_DIR = '/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/pages'

def get_import_path(file_path: str) -> str:
    rel = file_path.replace(PAGES_DIR + '/', '')
    if '/' in rel:
        return '../../components/AutoRelated.astro'
    return '../components/AutoRelated.astro'

def find_frontmatter_bounds(text: str):
    """Return (open_pos, close_pos) char indices of the frontmatter (between --- and ---)."""
    # Find the opening ---
    m = re.search(r'^---\s*$', text, re.M)
    if not m:
        # Compressed: `--- ...` on line 1
        if text.startswith('---'):
            open_pos = 0
            # find next --- on its own (could be inline or end of line)
            # for compressed files it's typically followed by another expression
            # the closing --- is the second occurrence
            second_dash = text.find('---', 3)
            if second_dash == -1:
                return (0, len(text))
            return (0, second_dash)
        return (-1, -1)
    open_pos = m.start()
    # find next standalone --- after open_pos
    rest = text[m.end():]
    m2 = re.search(r'^---\s*$', rest, re.M)
    if m2:
        return (open_pos, m2.start() + m.end())
    return (open_pos, -1)


fixed = 0
for root, dirs, files in os.walk(PAGES_DIR):
    for f in files:
        if not f.endswith('.astro'):
            continue
        path = os.path.join(root, f)
        text = open(path).read()
        if '<AutoRelated' not in text:
            continue
        # Where is the import?
        import_path = get_import_path(path)
        import_stmt = f"import AutoRelated from '{import_path}';"
        m = re.search(r"import AutoRelated from '[^']+';", text)
        if not m:
            continue
        import_pos = m.start()
        # Find frontmatter bounds
        fm_open, fm_close = find_frontmatter_bounds(text)
        if fm_open == -1:
            continue
        # Is import inside frontmatter?
        if import_pos >= fm_open and (fm_close == -1 or import_pos < fm_close):
            continue  # already correct
        # Need to move the import INTO the frontmatter
        # Step 1: remove the import from its current location
        text_no = text[:import_pos] + text[m.end():]
        # Adjust frontmatter bounds if needed
        # Step 2: add it just after the opening ---
        if text_no.startswith('---'):
            # Compressed frontmatter: insert after `--- ` (which could be `---`)
            # but only if the existing line 1 doesn't start with `--- import` followed by AutoRelated
            # Insert directly after the `---` opener
            # find the opening --- (which is at pos 0 in compressed)
            insert_pos = 3  # after "---"
            # actually better: insert AFTER the existing imports but BEFORE the const/let
            # For compressed, just append to line 1 with a space before existing content
            line1 = text_no.split('\n')[0]
            if line1.strip() == '---':
                # line is just ---, insert as new line
                lines = text_no.split('\n')
                lines.insert(1, import_stmt)
                new_text = '\n'.join(lines)
            else:
                # line is `--- import A; ...`, prepend the new import to the existing imports
                # structure: `--- import A; ...; --- <Layout>`
                # insert: `--- import AutoRelated; import A; ...; --- <Layout>`
                if line1.startswith('--- import') or line1.startswith('---import'):
                    # find the first space after --- and insert before the rest
                    after_dashes = line1[3:].lstrip()
                    new_line1 = '--- ' + import_stmt + ' ' + after_dashes
                    lines = text_no.split('\n')
                    lines[0] = new_line1
                    new_text = '\n'.join(lines)
                else:
                    # unusual case: `--- foo; --- <Layout>` — insert before the closing ---
                    # find the closing --- on this line
                    close_dash = line1.find('---', 3)
                    if close_dash > 0:
                        new_line1 = line1[:close_dash] + import_stmt + ' ' + line1[close_dash:]
                        lines = text_no.split('\n')
                        lines[0] = new_line1
                        new_text = '\n'.join(lines)
                    else:
                        new_text = import_stmt + '\n' + text_no
        else:
            # proper frontmatter: line 1 is ---, line 2 is the first import
            # insert import as line 2
            lines = text_no.split('\n')
            lines.insert(1, import_stmt)
            new_text = '\n'.join(lines)
        open(path, 'w').write(new_text)
        fixed += 1

print(f"Fixed {fixed} files")