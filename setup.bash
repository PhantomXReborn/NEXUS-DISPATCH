# 1. Install PostgreSQL (if not already installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from https://www.postgresql.org/download/

# 2. Start PostgreSQL
# macOS: brew services start postgresql
# Ubuntu: sudo service postgresql start

# 3. Create database
psql -U postgres
CREATE DATABASE nexus_dispatch;
\q

# 4. Navigate to your project directory
cd nexus-dispatch

# 5. Install dependencies
npm install

# 6. Create .env file with your database credentials
echo "DB_HOST=localhost" > .env
echo "DB_PORT=5432" >> .env
echo "DB_USER=postgres" >> .env
echo "DB_PASS=your_password" >> .env
echo "DB_NAME=nexus_dispatch" >> .env
echo "PORT=3000" >> .env

# 7. Run database migrations
npm run migrate

# 8. Seed the database with initial data
npm run seed

# 9. Start the server
npm run dev