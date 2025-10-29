# Use Node 20 (Debian Slim variant)
FROM node:20-slim

# Install dependencies: Java (for Android tools), Python3, and unzip
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-17-jdk \
        python3 \
        default-jre-headless \
        unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Bubblewrap globally
RUN npm install -g bubblewrap

# Set working directory
WORKDIR /app

# Copy project files
COPY server.js .
COPY index.html .
COPY .gitignore .
COPY android.keystore .
COPY app/ ./app/
COPY build.gradle .
COPY gradle/ ./gradle/
COPY gradle.properties .
COPY gradlew .
COPY gradlew.bat .
COPY icon-192.png .
COPY icon-512.png .
COPY manifest-checksum.txt .
COPY settings.gradle .
COPY store_icon.png .
COPY twa-manifest.json .

# Ensure Gradle wrapper is executable
RUN chmod +x gradlew

# Expose port for server.js
ENV PORT=8080
EXPOSE 8080

# Default command to start the Node.js server
CMD ["node", "server.js"]

