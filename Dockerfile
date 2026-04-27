FROM rust:alpine

RUN apk add --no-cache \
	pkgconfig \
	openssl-dev \
	openssl-libs-static \
	libc-dev \
	build-base  \
	libgcc

RUN adduser -D botuser
USER botuser

WORKDIR /usr/src/bot

CMD ["cargo", "run"]
