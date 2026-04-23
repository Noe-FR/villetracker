# Dev uniquement — Vite hot-reload
# En prod : nginx/Dockerfile build le frontend et le sert via nginx
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV API_URL=http://api:8000
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
