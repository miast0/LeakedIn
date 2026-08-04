FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads/avatars uploads/posts
EXPOSE 3000
CMD ["npm", "start"]
