#!/bin/bash
if [[ -z "$API_URL" ]]; then
  echo "USAGE: API_URL=<URL> PRIVATE_KEY=<0xPRIVATE_KEY> [optional COMPUTE_OFFLINE=1] ./run-client.sh"
  exit 1
fi

if [[ -z "$PRIVATE_KEY" ]]; then
  echo "USAGE: API_URL=<URL> PRIVATE_KEY=<0xPRIVATE_KEY> [optional COMPUTE_OFFLINE=1] ./run-client.sh"
  exit 1
fi

if [[ -z "$COMPUTE_OFFLINE" ]]; then
  COMPUTE_OFFLINE="0"
fi

docker run -ti -e API_URL="$API_URL"/api -e PRIVATE_KEY="$PRIVATE_KEY" -e COMPUTE_OFFLINE="$COMPUTE_OFFLINE" setup-mpc-client:latest