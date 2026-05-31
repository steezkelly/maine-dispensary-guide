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
