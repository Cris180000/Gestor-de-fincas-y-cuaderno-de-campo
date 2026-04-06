#!/bin/sh
set -e
# El volumen /data suele llegar con propietario root; el usuario nextjs debe poder escribir SQLite.
mkdir -p /data
chown -R nextjs:nodejs /data
exec gosu nextjs sh -c "cd /app && npx prisma migrate deploy && exec npm run start"
