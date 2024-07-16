#!/usr/bin/env bash

output=$(
  cat <<EOF
⚡️ Your npm packages are published.
dadinator: npm i https://pkg.pr.new/IMax153/dadinator@f283bda
EOF
)

echo "$output" | awk '/⚡️ Your npm packages are published./ {found=1; next} found {sub(/npm i/, "pnpm add"); print}'
