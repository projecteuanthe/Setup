#!/bin/bash
if [[ -z "$PORT" ]]; then
  PORT="8081" # default port 8081
fi

if [[ $* == *--clear-state* ]]; then
  # remove all stopped setup-mpc-server containers
  docker ps -a | awk '{ print $1,$2 }' | grep setup-mpc-server:latest | awk '{print $1 }' | xargs -I {} docker rm {}
  # remove mpc-server-vol volume
  docker volume rm mpc-server-vol
fi

docker run --mount 'type=volume,src=mpc-server-vol,dst=/usr/src/setup-mpc-server/store' -p "$PORT":80 setup-mpc-server:latest