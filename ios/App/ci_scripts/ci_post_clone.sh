#!/bin/sh
set -e

brew install node || true

cd "$CI_WORKSPACE"
npm install
npm run build
npx cap sync ios
