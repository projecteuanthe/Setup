#!/bin/bash
if [[ -z "$PORT" ]]; then
  PORT="8081" # default port 8081
fi

if [[ -z "$VOLUME" ]]; then
  VOLUME="mpc-server-vol"
fi

if [[ $* == *--clear-state* ]]; then
  # remove all stopped setup-mpc-server containers
  docker ps -a | awk '{ print $1,$2 }' | grep setup-mpc-server:latest | awk '{print $1 }' | xargs -I {} docker rm {}
  # remove mpc-server-vol volume
  docker volume rm "$VOLUME"
fi

docker run --mount 'type=volume,src='"$VOLUME"',dst=/usr/src/setup-mpc-server/store' -p "$PORT":80 setup-mpc-server:latest