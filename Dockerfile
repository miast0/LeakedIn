FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads/avatars uploads/posts
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
CMD ["npm", "run", "start:seeded"]
