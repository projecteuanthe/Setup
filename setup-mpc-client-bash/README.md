# Run a client (custom / extra security)
\[Copied from the participant guide\]

If you'd like to have a little more control over how you contribute to the ceremony, you can contribute in OFFLINE/CUSTOM mode. You'll still have to run an "empty" client that signals to the server that you're indeed in the process of contributing (else the server will skip over you - see "Notes" in the [participant guide](/setup-mpc-client)), but the actual work of generating the contribution can be done by yourself.

To run the client in OFFLINE mode:
```
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
