FROM node:16-alpine

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV:-production}

# only copy the package*.json, so that the dep can be installed and cached
# theoretically, these layers will only be rebuilt if dependencies change
RUN mkdir /microdraw
COPY ./package.json /microdraw/
COPY ./package-lock.json /microdraw/

WORKDIR /microdraw
RUN npm pkg set scripts.prepare="echo 'Overriden'" && npm i

COPY . /microdraw

ENTRYPOINT ["npm", "start"]
