#!/bin/bash
docker run --mount type=bind,src=$(pwd),dst=/usr/src/setup-mpc=server -p 8081:80 setup-mpc-server:latest