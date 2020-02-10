FROM setup-tools:latest
WORKDIR /usr/src/setup-mpc-common
COPY . .
RUN yarn install && yarn test && yarn build