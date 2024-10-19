# Stage 1: Build
FROM node:20 AS builder

# Set the working directory
WORKDIR /app

# Copy the rest of the application code
COPY . .

# Install dependencies
RUN npm install


# Run the build script
RUN sh etc/build.sh

# Stage 2: Production
FROM node:20

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=builder /app/dist /app
COPY --from=builder /app/package.json /app/package.json

RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "bin/www.js"]
