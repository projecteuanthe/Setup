FROM setup-mpc-common:latest
WORKDIR /usr/src/setup-mpc-common
RUN yarn link
WORKDIR /usr/src/setup-mpc-client
COPY . ./
RUN yarn link "setup-mpc-common" && yarn install && yarn build && mkdir -p /usr/src/setup_db/new && mkdir -p /usr/src/setup_db/old
CMD ["yarn", "--silent", "start"]