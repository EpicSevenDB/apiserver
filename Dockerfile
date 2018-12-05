FROM node:8.9.4

WORKDIR /usr/src

ADD package*.json ./

RUN npm install

ADD . .

RUN npm run build

CMD [ "npm", "run", "start" ]
