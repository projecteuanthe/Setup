#!/bin/bash

cd setup-tools/phase2-bn254/phase2
cargo build --release --bin verify_contribution
cargo build --release --bin new
mv target/release/verify_contribution ../../
mv target/release/new ../../
cd ../../../setup-mpc-common
yarn install
yarn build
yarn link
cd ../setup-mpc-server
../setup-tools/new ./initial/circuit.json ./initial/initial_params ./initial/radix
yarn install
yarn link setup-mpc-common
yarn build
