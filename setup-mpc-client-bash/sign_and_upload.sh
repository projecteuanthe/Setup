#!/bin/bash
if [[ -z "$PRIVATE_KEY" ]]; then
  echo "USAGE: API_URL=<URL> PARAMS_PATH=</path/to/params> PRIVATE_KEY=<0xPRIVATE_KEY> ./sign_and_upload.sh"
  exit 1
fi

if [[ -z "$PARAMS_PATH" ]]; then
  echo "USAGE: API_URL=<URL> PARAMS_PATH=</path/to/params> PRIVATE_KEY=<0xPRIVATE_KEY> ./sign_and_upload.sh"
  exit 1
fi

if [[ -z "$API_URL" ]]; then
  echo "USAGE: API_URL=<URL> PARAMS_PATH=</path/to/params> PRIVATE_KEY=<0xPRIVATE_KEY> ./sign_and_upload.sh"
  exit 1
fi

node upload "$PRIVATE_KEY" "$PARAMS_PATH" "$API_URL"