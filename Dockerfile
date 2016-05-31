FROM node:6.2.0
MAINTAINER Joel Grenon <joelgrenon@covistra.com>

ENV NODE_ENV production
EXPOSE 8888

WORKDIR /opt/service
COPY package.json README.md /opt/service/
RUN npm install --production
COPY . /opt/service

# Use the start script defined in package.json
CMD [ "npm", "start" ]
