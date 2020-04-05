#!/bin/bash
git submodule init && git submodule update
cd ./setup-tools
docker build -t setup-tools:latest .
cd ../setup-mpc-common
docker build -t setup-mpc-common:latest .
cd ../setup-mpc-client
docker build -t setup-mpc-client:latest .