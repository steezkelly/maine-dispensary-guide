#!/bin/bash
set -e
cd "$(dirname "$0")/apps/maine-cannabis"
mkdir -p node_modules/@network
for pkg in config content-types design-system layouts ui; do
  ln -sfn ../../node_modules/@network/$pkg node_modules/@network/$pkg 2>/dev/null || true
done
node -e "require('fs').rmSync('.vercel/output',{recursive:true,force:true})"
NODE_PATH=../../node_modules astro build
node -e "const fs=require('fs');const src='.vercel/output/static';const dst='../../dist';if(fs.existsSync(src)){fs.rmSync(dst,{recursive:true,force:true});fs.cpSync(src,dst,{recursive:true});console.log('Copied clean output to '+dst);}"
# Pretty-print sitemap-*.xml so SEO parsers (Screaming Frog, Sitebulb, etc.)
# can read it. The @astrojs/sitemap stream emits one long line by default.
# This rewrites every <loc>URL</loc> onto its own line. Touched: 2026-06-06 audit.
node -e "const fs=require('fs');const path=require('path');function prettify(p){if(!fs.existsSync(p))return;let x=fs.readFileSync(p,'utf8');const before=x.length;x=x.replace(/><loc>/g,'>\n  <loc>').replace(/<\/loc>/g,'<\/loc>\n');if(x.length!==before)fs.writeFileSync(p,x);}prettify('../../dist/sitemap-0.xml');prettify('../../dist/sitemap-index.xml');"
