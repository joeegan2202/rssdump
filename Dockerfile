FROM node:slim

WORKDIR /usr/src/app

COPY . ./

EXPOSE 8080

RUN npm install

CMD ["npm", "start", "/usr/src/app"]