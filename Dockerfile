FROM rust:alpine AS builder

RUN apk add --no-cache \
    pkgconfig \
    openssl-dev \
    openssl-libs-static \
    libc-dev \
    build-base \
    libgcc

WORKDIR /usr/src/bot

COPY Cargo.toml Cargo.lock emoji.toml ./
COPY src ./src

RUN touch src/main.rs && cargo build --release


FROM alpine:latest

RUN apk add --no-cache \
    libgcc \
    openssl

RUN adduser -D botuser
USER botuser

WORKDIR /app

COPY --from=builder /usr/src/bot/target/release/bot .
COPY --from=builder /usr/src/bot/emoji.toml .

CMD ["./tty"]
