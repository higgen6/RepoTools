#!/usr/bin/env sh
set -eu

echo "Installing RepoTools dependencies and building assets..."
npm run setup
echo
echo "RepoTools is ready."
echo "Start it with: npm start"
