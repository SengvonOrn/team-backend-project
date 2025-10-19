FROM node:22

# 2️⃣ Set the working directory inside the container
WORKDIR /usr/src/app

# 5️⃣ Copy the rest of the project files
# COPY ./src . or 
#  FOR EVERYTHING ELSE
COPY . . 
# 3️⃣ Install dependencies
RUN npm install


# 7️⃣ Expose port 3000 (the NestJS default port)
EXPOSE 3000


# 4️⃣ Build the project
CMD ["npm", "run", "start:dev"]