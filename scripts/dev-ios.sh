#!/bin/sh
IP=$(ipconfig getifaddr en0)
if [ -z "$IP" ]; then
  echo "Error: could not find local IP on en0"
  exit 1
fi
export VITE_LIVE_RELOAD_URL="http://$IP:5173"
echo "Live reload URL: $VITE_LIVE_RELOAD_URL"
npx cap sync ios
npx vite --host
