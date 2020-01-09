#!/bin/bash
docker run -ti -e API_URL="$1"/api -e PRIVATE_KEY="$2" setup-mpc-client:latest