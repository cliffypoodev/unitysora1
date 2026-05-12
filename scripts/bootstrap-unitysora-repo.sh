#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-../unitysora}"
REMOTE_URL="${2:-https://github.com/cliffypoodev/unitysora.git}"

if [ -e "$TARGET_DIR" ]; then
  echo "Target already exists: $TARGET_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"/{docs,scripts,src,src/pages,src/components,src/lib,api}

cat > "$TARGET_DIR/README.md" <<'EOF'
# UnitySora

UnitySora is a Base44-oriented video generation control plane scaffold.
EOF

cat > "$TARGET_DIR/package.json" <<'EOF'
{
  "name": "unitysora",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {}
}
EOF

cat > "$TARGET_DIR/docs/README.md" <<'EOF'
# UnitySora Docs

Add product, runtime, provider, and generation workflow documentation here.
EOF

cat > "$TARGET_DIR/src/main.jsx" <<'EOF'
import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <main style={{ padding: 24 }}><h1>UnitySora</h1><p>Video generation control plane scaffold.</p></main>;
}

createRoot(document.getElementById('root')).render(<App />);
EOF

cat > "$TARGET_DIR/index.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UnitySora</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cd "$TARGET_DIR"
git init
git add -A
git commit -m "chore: bootstrap UnitySora scaffold"
git remote add origin "$REMOTE_URL"

echo "Created UnitySora scaffold at $TARGET_DIR"
echo "Remote configured as $REMOTE_URL"
