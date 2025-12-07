# Imagen base oficial de Node
FROM node:18

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# -------------------------------
# Instalar FFmpeg (REQUERIDO)
# -------------------------------
RUN apt-get update && apt-get install -y ffmpeg

# -------------------------------
# Instalar dependencias
# -------------------------------
COPY package*.json ./
RUN npm install --production

# -------------------------------
# Copiar el resto del código
# -------------------------------
COPY . .

# -------------------------------
# Puerto (solo documentación)
# Railway usará process.env.PORT
# -------------------------------
EXPOSE 3000

# -------------------------------
# Comando de arranque
# -------------------------------
CMD ["npm", "start"]
