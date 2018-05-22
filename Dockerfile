FROM node:8

COPY . /microdraw
WORKDIR /microdraw

RUN npm install

ENTRYPOINT ["npm", "start"]
