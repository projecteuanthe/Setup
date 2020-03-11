#!/bin/bash
if [[ -z "$PORT" ]]; then
  PORT="8081" # default port 8081
fi

if [[ -z "$VOLUME" ]]; then
  VOLUME="mpc-server-vol"
fi

if [[ -z "$ADMIN_ADDRESS" ]]; then
  ADMIN_ADDRESS="0x1aA18F5b595d87CC2C66d7b93367d8beabE203bB"
fi

if [[ $* == *--clear-state* ]]; then
  # remove all stopped setup-mpc-server containers
  # if you still get an Error: volume is in use error then try `docker system prune`
  docker ps -a | awk '{ print $1,$2 }' | grep setup-mpc-server:latest | awk '{print $1 }' | xargs -I {} docker rm {}
  # remove mpc-server-vol volume
  docker volume rm "$VOLUME"
fi

# first command mounts a volume; second does not
# docker run --mount 'type=volume,src='"$VOLUME"',dst=/usr/src/setup-mpc-server/store' -p "$PORT":80 -e ADMIN_ADDRESS="$ADMIN_ADDRESS" setup-mpc-server:latest
docker run -p "$PORT":80 -e ADMIN_ADDRESS="$ADMIN_ADDRESS" setup-mpc-server:latest