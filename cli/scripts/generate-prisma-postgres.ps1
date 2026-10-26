# Generate Prisma client for PostgreSQL
Copy-Item -Path "packages/database/prisma/schema.postgres.prisma" -Destination "packages/database/prisma/schema.prisma" -Force
bunx prisma generate --schema=packages/database/prisma/schema.prisma
Write-Host "Prisma client generated for PostgreSQL" -ForegroundColor Green
