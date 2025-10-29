# Use Node.js base image (includes npm and Debian package manager)
FROM node:20-slim

# Set working directory for the app
WORKDIR /app

# 1. Install dependencies required for Android / Bubblewrap builds
# - openjdk-17-jdk: needed by Gradle
# - python3: required by Bubblewrap
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-17-jdk \
        python3 \
        unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Install Bubblewrap globally
RUN npm install -g bubblewrap

# 3. Copy Node.js server logic and UI
COPY server.js .
COPY index.html .

# 4. Copy all necessary Android / TWA template files
COPY android.keystore .
COPY app ./app/
COPY build.gradle .
COPY gradle ./gradle/
COPY gradle.properties .
COPY gradlew .
COPY gradlew.bat .
COPY settings.gradle .
COPY store_icon.png .
COPY twa-manifest.json .
COPY manifest-checksum.txt .
COPY icon-192.png .
COPY icon-512.png .

# 5. Ensure Gradle wrapper is executable
RUN chmod +x gradlew

# 6. Expose Cloud Run default port
ENV PORT=8080
EXPOSE 8080

# 7. Start Node.js server
CMD ["node", "server.js"]


