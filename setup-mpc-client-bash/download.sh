#!/bin/bash
if [[ -z "$API_URL" ]]; then
  echo "USAGE: API_URL=<URL> PREV_ADDRESS=<0xPREVIOUS_ADDRESS> ./download.sh"
  exit 1
fi

if [[ -z "$PREV_ADDRESS" ]]; then
  echo "USAGE: API_URL=<URL> PREV_ADDRESS=<0xPREVIOUS_ADDRESS> ./download.sh"
  exit 1
fi

echo Downloading latest contribution from $PREV_ADDRESS...
curl -s -S $API_URL/api/data/$PREV_ADDRESS/0 > params.params