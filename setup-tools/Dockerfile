FROM ubuntu:latest
RUN apt-get update && apt-get install -y curl build-essential
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
    && cargo build --bin export_keys

FROM ubuntu:latest
WORKDIR /usr/src/setup-tools
COPY --from=0 \
  /usr/src/setup-tools/phase2-bn254/phase2/target/debug/new \
  /usr/src/setup-tools/phase2-bn254/phase2/target/debug/contribute \
  /usr/src/setup-tools/phase2-bn254/phase2/target/debug/verify_contribution \
  /usr/src/setup-tools/phase2-bn254/phase2/target/debug/beacon \
  /usr/src/setup-tools/phase2-bn254/phase2/target/debug/export_keys \
  ./