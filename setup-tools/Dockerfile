FROM ubuntu:latest
RUN apt update && \
  apt install -y curl && \
  curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt update && \
  apt install -y nodejs yarn libgomp1 build-essential && \
  apt clean
WORKDIR /tmp
RUN curl https://sh.rustup.rs -sSf > rustup.sh \
    && chmod 755 rustup.sh \
    && ./rustup.sh -y \
    && rm /tmp/rustup.sh
WORKDIR /usr/src/setup-tools
ENV PATH="/root/.cargo/bin:$PATH"
COPY . .
RUN cd phase2-bn254/phase2 \
    && cargo build --bin new \
    && cargo build --bin contribute \
    && cargo build --bin verify_contribution \
    && cargo build --bin beacon \
    && cargo build --bin export_keys \
    && cd ../../ \
    && cp /usr/src/setup-tools/phase2-bn254/phase2/target/debug/new . \
    && cp /usr/src/setup-tools/phase2-bn254/phase2/target/debug/contribute . \
    && cp /usr/src/setup-tools/phase2-bn254/phase2/target/debug/verify_contribution . \
    && cp /usr/src/setup-tools/phase2-bn254/phase2/target/debug/beacon . \
    && cp /usr/src/setup-tools/phase2-bn254/phase2/target/debug/export_keys . \
    && rm -rf phase2-bn254