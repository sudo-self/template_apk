
FROM node:20-slim

RUN apt-get update && 

apt-get install -y openjdk-17-jdk python3 default-jre-headless unzip && 

apt-get clean && 

rm -rf /var/lib/apt/lists/*

RUN npm install -g bubblewrap

WORKDIR /app

COPY server.js .
COPY index.html .

COPY .gitignore .
COPY android.keystore .
COPY app/ app/
COPY build.gradle .
COPY gradle/ gradle/
COPY gradle.properties .
COPY gradlew .
COPY gradlew.bat .
COPY icon-192.png .
COPY icon-512.png .
COPY manifest-checksum.txt .
COPY settings.gradle .
COPY store_icon.png .
COPY twa-manifest.json .

RUN chmod +x gradlew

ENV PORT 8080
EXPOSE 8080

CMD ["node", "server.js"]
