# zkparty MPC Coordinator Guide
**All of this code is highly experimental and has not been audited. Use at your own risk.** 

The coordinator guide can be found here: [HackMD link](https://hackmd.io/@bgu33/H1ndttIBL)

This set of tools allows you to run a trusted setup ceremony for zkSNARKs. We are using a fork of AZTEC's trusted setup repository.

In the coordinator guide:
- **Ceremony lifecycle**: An overview of how ceremonies work with `setup-mpc-server`.
- **Get, build, and run a server**: How to build and run the trusted setup server code.
- **Quickstart**: Get up and running locally once you've built the repo.
- **Ceremony state guide**: The ceremony parameters (admin address, start time, end conditions, timeout conditions, more) and how to set and change them.
- **Ceremony data guide**: Where ceremony data is stored, and how to reload or discard data.
- **Selecting participants**: How to register and order participants in the ceremony.
- **API**: Description of the coordinator server API.
- **Setup binaries**: How to build and run the phase2 binaries used by the coordinator server on their own.
