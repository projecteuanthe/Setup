FROM setup-mpc-common:latest
WORKDIR /usr/src/setup-mpc-common
RUN yarn link
WORKDIR /usr/src/setup-mpc-server
COPY . ./
RUN yarn link "setup-mpc-common" && yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production
CMD [ "node", "./dest"]