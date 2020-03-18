# zkparty MPC Participant Guide
**All of this code is highly experimental and has not been audited. Use at your own risk.** [HackMD link](https://hackmd.io/@bgu33/BJ9jcRerU).

Thanks for helping to participate in zkSNARK trusted setup ceremonies! This guide will walk you through how to participate.

If you are a participant, you'll first need to obtain the trusted setup client Docker image. This Docker image will allow you to participate in any trusted setup ceremony as long as the project is using our AZTEC-based coordinator server, so you only need to get the image once! (unless breaking changes are introduced to the coordinator server API).

In this guide:
- **Register for a ceremony**: How to join an upcoming or ongoing MPC ceremony.
- **Build the client image**: Build the software you need to participate in a ceremony.
- **Run a client (no frills)**: The easiest way to run the client software and contribute to MPC.
- **Run a client (custom / extra security)**: For advanced users who want to be especially careful about the integrity of their ceremony contribution. Read this if you want to control the computation / toxic waste generation process.
- **Spectator mode**: How to spectate on a ceremony you aren't participating in.
- **Attestations**: Send a signed attestation or message regarding your participation.
- **Verifying ceremony integrity**: Verify that all steps of an MPC ceremony have been performed properly.
- **Notes on participant ordering**: When your client needs to be online and running.

## Register for a ceremony
You'll need to know the admin address and coordinator server URL of the ceremony you'd like to join. This should be provided to you by the ceremony coordinator; in the future, we will have a listing on zkparty.io.

You can register for a ceremony by sending 1 Wei to the admin address of the ceremony. Ceremonies may specify a maximum number of participants, and inclusion in the participant set is first-come-first-serve. You can submit registration at any point, even after the ceremony has begun.

Alternatively, ceremonies can also manually add a "whitelist" of participants. If a ceremony coordinator tells you that they have whitelisted your address, you don't need to do anything manually to register.

## Build the client image
First, make sure you have [Docker](https://www.docker.com/products/docker-desktop) installed.

To get started, you need to build the image from the Setup repository (in the future we may make an already-built image publicly available online). Clone the repository:
```
https://github.com/briangu33/Setup
cd Setup
```
Next, run the `./build-all` script in the root directory. This builds the necessary Docker images. To be safe, you should have about 5GB of space available. (It's one of my many TODOs to optimize this a bit, should be able to get it down to < 1GB). 

The image we care about is `setup-mpc-client:latest`.

## Run a client (no frills)
Once you've built the client image, you can join and participate in a ceremony.
```
cd setup-mpc-client
API_URL=<ceremony url> PRIVATE_KEY=<0x...> ./run-client.sh
```
To join the ceremony, you need two parameters passed as environment variables:
- API_URL: This is the URL that the coordinator server exposes the ceremony API from. Your client uploads to and downloads from this coordinator server. You'll need to get this URL from the ceremony coordinator.
- PRIVATE_KEY: The private key of the Ethereum account you used to register for the ceremony. Obviously, keep this private!

That's it! Leave the client running on a machine with a stable Internet connection for the duration of the ceremony, or at least so long as you have not completed your part of the ceremony.

## Run a client (custom / extra security)
The no-frills contribution mode downloads the latest parameter set from the server and automatically makes a contribution with OS entropy. However, if you'd like to have a little more control over how you contribute to the ceremony, you can contribute in OFFLINE/CUSTOM mode. You'll still have to run an "empty" client that signals to the server that you're indeed in the process of contributing (else the server will skip over you - see "Notes"), but the actual work of generating the contribution can be done by yourself.

To run the client in OFFLINE mode:
```
cd setup-mpc-client
API_URL=<ceremony url> PRIVATE_KEY=<0x...> COMPUTE_OFFLINE=1 ./run-client.sh
```
This above command starts an "empty" client that tells the server not to skip over your turn. Note that the only difference is passing in the `COMPUTE_OFFLINE` variable.

If you're running your client in this mode, the following is your responsibility to do manually:
- Grab the most recent parameter set, from the last completed participant
- Run contribution binaries to contribute your entropy to the parameter set
- Upload your new parameter set to the server

Note that download, computation, and upload can be run from ANY machine, completely independent of the empty client you are running. The only constraint is that your upload must be signed with the private key you've registered for the ceremony with.

We have provided scripts for all three of these operations in `setup-mpc-client-bash`. Here's how to use them:

### Download
```
cd setup-mpc-client-bash
API_URL=<ceremony url> PREV_ADDRESS=<0x...> ./download.sh
```
Note that you'll need to refer to the interface of your empty client to get the address of the most recent ceremony participant, `PREV_ADDRESS`. This writes to a file `params.params` in your current directory.

### Contribute
```
contribute <in_params_filename> <entropy_str> <out_params_filename> <optional 1000>
```
The `contribute` program is compiled from Kobi Gurkan's MPC contribution [Rust library](https://github.com/kobigurk/phase2-bn254/tree/master/phase2). The last parameter is optional; put `1000` as the fourth argument if you'd like to print progress reports on the computation to terminal.

**This is the trusted step.** Security-minded participants may want to perform this step on an air-gapped computer with an exotic source of entropy.

### Upload
```
API_URL=<ceremony url> PARAMS_PATH=</path/to/params> PRIVATE_KEY=<0x...> ./sign_and_upload.sh
```
Signs and uploads the parameters you generated.

## Spectator mode
You can enter a bogus private key to track the progress of a ceremony in your terminal in spectator mode. In the future, you'll also be able to track the progress of ceremonies on a webapp hub that we're in the process of putting together.
```
API_URL=<ceremony url> PRIVATE_KEY=0x00 ./run-client.sh
```

## Attestations
We are in the process of putting together a webapp which participants will be able to submit signed messages and attestions to.

## Verifying ceremony integrity
A number of tools are available to help you trustlessly verify ceremony integrity. Your ceremony coordinator should publish publically their `circuit.json` file and the `initial_params` of the ceremony. Initial ceremony parameters are available at `GET <server url>/api/data/initial_params`.

You can download the parameters after the contribution of any participant by making an HTTP request to `GET <server url>/api/data/<eth address>/0`. You can download the signature of a participant's parameter set with `GET <server url>/api/signature/<eth address>/0`. Verify the signatures with `web3x` or your preferred Ethereum library.

You can verify that a contribution was performed properly with the `verify_contribution` binary provided by [Kobi's library](https://github.com/kobigurk/phase2-bn254/tree/master/phase2). More detailed instructions coming soon.

## Notes on Participant ordering
Technically, you don't have to start running your client until it's your turn to contribute, but online participants are prioritized by the ceremony protocol in general (i.e. if it would be your turn but you're offline, the ceremony will swap in the next currently online person and push you back a slot in the contribution queue). You can exit the ceremony once you've finished your part without penalty.

If disconnect midway through your turn, the server will time you out after a timeout period.

If you are computing offline and upload a malformed or otherwise invalid contribution, the server will just ignore it. You can upload a proper contribution any time before your timeout period is up without penalty.
