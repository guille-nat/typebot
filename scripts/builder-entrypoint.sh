#!/bin/bash

cd apps/builder;
node  -e "const { configureRuntimeEnv } = require('next-runtime-env/build/configure'); configureRuntimeEnv();"
cd ../..;

# Prisma v7: la URL de conexión ya no vive en schema.prisma.
# Usamos prisma.config.ts (packages/prisma/prisma.config.ts) para resolver DATABASE_URL.
./node_modules/.bin/prisma migrate deploy \
  --config=packages/prisma/prisma.config.ts \
  --schema=packages/prisma/postgresql/schema.prisma

NODE_OPTIONS=--no-node-snapshot HOSTNAME=${HOSTNAME:-0.0.0.0} PORT=${PORT:-3000} node apps/builder/server.js;
