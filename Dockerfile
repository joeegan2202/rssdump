FROM node:slim

WORKDIR /usr/src/app

COPY . ./

EXPOSE 8080

RUN npm install

WORKDIR client

RUN npm install

RUN npm run build

WORKDIR /usr/src/app

CMD ["npm", "start"]