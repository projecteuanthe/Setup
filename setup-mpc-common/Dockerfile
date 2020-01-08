FROM setup-tools:latest
WORKDIR /usr/src/setup-mpc-common
COPY . .
RUN yarn install && yarn test && yarn build && yarn link && rm -rf node_modules && yarn install --production

FROM node:10-alpine
COPY --from=0 /usr/src/setup-mpc-common /usr/src/setup-mpc-common
