#!/usr/bin/env bash

output=$(
  cat <<EOF
shasum for dadinator(dadinator-0.0.0.tgz): 60df433e93be03d45f8b4c9779777821da425693
⚡️ Your npm packages are published.
dadinator: npm i https://pkg.pr.new/IMax153/dadinator@8b1d799
EOF
)

echo "$output" | awk '
  /⚡️ Your npm packages are published./ \
  { found=1; next } found \
  { sub(/npm i/, "pnpm add"); print "\"" $0 "\"" }
' | paste -sd ','
