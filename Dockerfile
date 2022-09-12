FROM node:16-alpine

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV:-production}

COPY . /microdraw
WORKDIR /microdraw
RUN npm install

ENTRYPOINT ["npm", "start"]
