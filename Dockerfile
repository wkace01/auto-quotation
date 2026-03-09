FROM node:20-bullseye

# 업데이트 및 LibreOffice 설치
RUN apt-get update && apt-get install -y \
    libreoffice \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install --production

# 앱 코드 복사
COPY . .

# 서버 실행 포트
EXPOSE 3001

# 실행 명령어
CMD ["npm", "start"]
