#!/bin/sh
set -e

# Install Node dependencies and sync Capacitor before Xcode Cloud builds
cd "$CI_WORKSPACE"
npm install
npx cap sync ios
