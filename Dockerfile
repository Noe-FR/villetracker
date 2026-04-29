# Dev — Next.js avec hot-reload
# En prod : build standalone dans nginx/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV API_INTERNAL_URL=http://api:8000
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev"]
