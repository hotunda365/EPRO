FROM node:18-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install a simple HTTP server to serve static files
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the server
CMD ["serve", "-s", ".", "-l", "3000"]
