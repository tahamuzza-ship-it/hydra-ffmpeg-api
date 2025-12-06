# Imagen base con Node 18
FROM node:18

# Instalar FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package.json .
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto donde correrá Express
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
