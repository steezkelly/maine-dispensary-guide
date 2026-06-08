#!/bin/bash
set -e
cd "$(dirname "$0")/apps/maine-cannabis"
mkdir -p node_modules/@network
for pkg in config content-types design-system layouts ui; do
  ln -sfn ../../node_modules/@network/$pkg node_modules/@network/$pkg 2>/dev/null || true
done
node -e "require('fs').rmSync('.vercel/output',{recursive:true,force:true})"

# Write a build-time health snapshot to public/status.json. This file is
# served at /status.json on the live site and gives external monitors a
# machine-readable view of MDG's health without scraping HTML.
# Sprint 77 observability: closes gap #7 from the 2026-06-07 MDG tracking audit.
# Must run BEFORE astro build so the file ends up in .vercel/output/static/
# and is then copied to ../../dist by the subsequent cp step.
cd ../..
node apps/maine-cannabis/scripts/admin/sprint-score.cjs --write-public 2>&1 | tail -10 || echo "sprint-score: skipped (non-fatal)"
cd "$(dirname "$0")/apps/maine-cannabis"

NODE_PATH=../../node_modules npx astro build
node -e "const fs=require('fs');const src='.vercel/output/static';const dst='../../dist';if(fs.existsSync(src)){fs.rmSync(dst,{recursive:true,force:true});fs.cpSync(src,dst,{recursive:true});console.log('Copied clean output to '+dst);}"
# Pretty-print sitemap-*.xml so SEO parsers (Screaming Frog, Sitebulb, etc.)
# can read it. The @astrojs/sitemap stream emits one long line by default.
# This rewrites every <loc>URL</loc> onto its own line. Touched: 2026-06-06 audit.
node -e "const fs=require('fs');const path=require('path');function prettify(p){if(!fs.existsSync(p))return;let x=fs.readFileSync(p,'utf8');const before=x.length;x=x.replace(/><loc>/g,'>\n  <loc>').replace(/<\/loc>/g,'<\/loc>\n');if(x.length!==before)fs.writeFileSync(p,x);}prettify('../../dist/sitemap-0.xml');prettify('../../dist/sitemap-index.xml');"
# Sprint 79: regenerate llms.txt + MISSION_CONTROL.md from build-time data so
# the AI-corpus index and the dashboard both stay in sync with the public
# route set. Both files are written to public/ and then copied to dist/ for
# the same build that just produced dist/sitemap-0.xml.
cd ../..
node scripts/admin/regenerate-llms.cjs --from-file=dist/sitemap-0.xml 2>&1 | tail -3 || echo "regenerate-llms: skipped (non-fatal)"
if [ -f apps/maine-cannabis/public/llms.txt ]; then
  cp apps/maine-cannabis/public/llms.txt dist/llms.txt
  cp apps/maine-cannabis/public/llms-full.txt dist/llms-full.txt
fi
node scripts/admin/build-mission-control.cjs 2>&1 | tail -3 || echo "build-mission-control: skipped (non-fatal)"
cd "$(dirname "$0")/apps/maine-cannabis"
