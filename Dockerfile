FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies strictly from package-lock.json
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the expected port for Cloud Run
EXPOSE 8080

# Set Node environment to production
ENV NODE_ENV=production

# Start the built server
CMD ["npm", "start"]
