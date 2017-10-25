FROM node

RUN apt-get update && apt-get -y upgrade
RUN apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
COPY . /microdraw
WORKDIR /microdraw
RUN npm install
RUN ln -sf openseadragon-bin-2.3.1 public/lib/openseadragon
RUN ln -sf FileSaver.js-master-c347c51 public/lib/FileSaver.js
RUN ln -sf Openseadragon-screenshot-master-f0c5169 public/lib/openseadragon-screenshot
RUN echo '#!/bin/bash\nnpm start &> server.log &\nnode host.js\nnpm test' > test.sh && chmod u+x test.sh && ln -s /microdraw/test.sh /usr/local/bin/tests
CMD ["npm", "start"]
