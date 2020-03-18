# Trusted Setup MPC Tools

This repository contains several tools to help coordinators of trusted SNARK setup multi-party computation. It is a modification of the AZTEC Ignition [Setup repository](https://github.com/AztecProtocol/Setup/).

- [setup-tools](/setup-tools) - Codebase of the actual computation code, verification code etc. These are taken from Kobi Gurkan's [phase2](https://github.com/kobigurk/phase2-bn254) repository, which itself is a modified version of the ZCash team's phase2 code.
- [setup-mpc-server](/setup-mpc-server) - Coordination server for participants partaking in the MPC.
- [setup-mpc-client](/setup-mpc-client) - Client terminal application for execution of client side tools and reporting to server.
- [setup-mpc-client-bash](/setup-mpc-client-bash) - Utility scripts for clients wanting more fine-grained control over their contribution process.
- [setup-mpc-common](/setup-mpc-common) - Shared code between server and client applications (i.e. common TS interfaces).

We will write up instructions in `setup-mpc-server` for coordinators. At a high level, running an MPC should just require you to swap in your own `circuit.json`, run a build script, and publish docker images for participants.

We are also working on a webapp (zkparty.io) that can serve as a portal to different ceremonies + host attestations of participants and transcript files from any ceremonies run with this tool chain.

All of this code is highly experimental and has not been audited. Use at your own risk.
