#!/usr/bin/env bash
set -euo pipefail

DATABASE_USER="tty_dev"
DATABASE_PASS="PasswordCompliqueOuPasMdr!"
DATABASE_NAME="bot_db"
DATABASE_URL="postgres://${DATABASE_USER}:${DATABASE_PASS}@localhost:5432/${DATABASE_NAME}"

function log_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

function log_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

function log_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1" >&2
}

function check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "Command not found '$1'"
        exit 1
    fi
}

log_info "Check dependency"
check_command "psql"
check_command "cargo"
check_command "brew"
check_command "sqlx"

POSTGRES_HOST="localhost"

if [[ "$(uname)" == "Darwin" ]]; then
    POSTGRES_USER=$(whoami)
else
    POSTGRES_USER="postgres"
fi

log_info "PostgreSQL Configuration"

if [[ "$(uname)" == "Darwin" ]]; then
    if ! brew services list | grep -q "postgresql.*started"; then
        log_info "Starting PostgreSQL"
        brew services start postgresql@15
        sleep 2
    fi
fi

if ! psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DATABASE_USER'" | grep -q 1; then
    log_info "PostgreSQL User creation '$DATABASE_USER'"
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE USER $DATABASE_USER WITH PASSWORD '$DATABASE_PASS';" || {
        log_error "Check if postgres is running / you have access"
        exit 1
    }
else
    log_info "User '$DATABASE_USER' already exist"
fi

if ! psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DATABASE_NAME'" | grep -q 1; then
    log_info "'$DATABASE_NAME' Database Creation"
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $DATABASE_NAME OWNER $DATABASE_USER;" || {
        log_error "Check if postgres is running / you have access"
        exit 1
    }
else
    log_info "Database '$DATABASE_NAME' already exist"
fi

log_info "Permission check"
psql -U "$POSTGRES_USER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DATABASE_NAME TO $DATABASE_USER;"

log_info "Rust and SQLX configuration"

if [ ! -f ".env" ]; then
    log_info "Creation of the '.env' file"
    cat > .env <<EOL
DATABASE_URL="$DATABASE_URL"
DISCORD_TOKEN="ton_token_discord_ici"
EOL
    log_success "'.env' Created"
else
    log_info "'.env' already exist. Updating DATABASE_URL"
    if grep -q "^DATABASE_URL=" .env; then
        sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
    else
        echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env
    fi
    log_success "'.env' file updated"
fi

if [ ! -d ".sqlx" ]; then
    log_info "SQLX Installation"
    sqlx database setup || {
        log_error "Error during the sqlx installation"
        exit 1
    }
    log_success "SQLX Installed"
else
    log_info "SQLX already install / setup"
fi

log_info "Test migrations"

mkdir -p migrations

if [ ! -f "migrations/$(date +%Y%m%d%H%M%S)_create_users_table.sql" ]; then
    log_info "Migration test for 'users'"
    cat > "migrations/$(date +%Y%m%d%H%M%S)_create_users_table.sql" <<EOL
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO users (discord_id, username) VALUES ('1234567890', 'test_user') ON CONFLICT DO NOTHING;
EOL
    log_success "Migration test succeed"
else
    log_info "Migration already test"
fi

log_info "Test migration execution"
sqlx migrate run || {
    log_error "Error during migration execution"
    exit 1
}
log_success "Migrations execution sucessfull"

log_info "Connection to the database"
if psql -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "SELECT 1" &> /dev/null; then
    log_success "Connection successfull"
else
    log_error "Connection failed"
    exit 1
fi

log_success "✅ | Setup Done"
echo ""
echo "Resume:"
echo "   - Database User: $DATABASE_USER"
echo "   - Database Name: $DATABASE_NAME"
echo "   - Database URL: $DATABASE_URL"
echo "   - .env : $(pwd)/.env"
echo ""
echo "To connect to DataBase:"
echo "   - psql -U $DATABASE_USER -d $DATABASE_NAME"

