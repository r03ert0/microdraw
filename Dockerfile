FROM node

RUN apt-get update && apt-get upgrade
COPY . /microdraw
WORKDIR /microdraw
RUN npm install
CMD ["npm", "start"]
