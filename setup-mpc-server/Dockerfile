FROM setup-mpc-common:latest
WORKDIR /usr/src/setup-mpc-common
RUN yarn link
WORKDIR /usr/src/setup-mpc-server
COPY . ./
RUN ../setup-tools/new ./initial/circuit.json ./initial/initial_params ./initial/radix \
  && yarn link "setup-mpc-common" \
  && yarn install \
  && yarn test \
  && yarn build \
CMD [ "node", "./dest"]