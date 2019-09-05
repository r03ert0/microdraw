FROM node:8-alpine

# alpine images do not have certtificates bundled
RUN apk --no-cache add ca-certificates

# build bcrypt on alpine
# see https://github.com/kelektiv/node.bcrypt.js/wiki/Installation-Instructions#alpine-linux-based-images
RUN apk --no-cache add --virtual builds-deps build-base python

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV:-production}

COPY . /microdraw
WORKDIR /microdraw
RUN npm install

ENTRYPOINT ["npm", "start"]
