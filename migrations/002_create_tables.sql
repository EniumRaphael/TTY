CREATE TABLE bots (
    id            SERIAL PRIMARY KEY,
    status        TEXT         NOT NULL DEFAULT 'TTY by EniumTeam',
    activity_type bot_activity NOT NULL DEFAULT 'Watching',
    presence      bot_presence NOT NULL DEFAULT 'dnd'
);
INSERT INTO bots DEFAULT VALUES;

CREATE TABLE users (
    user_id  TEXT PRIMARY KEY,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    is_buyer BOOLEAN NOT NULL DEFAULT FALSE,
    is_dev   BOOLEAN NOT NULL DEFAULT FALSE,
    is_enium BOOLEAN NOT NULL DEFAULT FALSE,
    is_pwn   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE guilds (
    guild_id TEXT PRIMARY KEY,

    log_enable   BOOLEAN NOT NULL DEFAULT FALSE,
    log_category TEXT,
    log_bot      TEXT,
    log_channels TEXT,
    log_member   TEXT,
    log_mod      TEXT,
    log_msg      TEXT,
    log_server   TEXT,

    join_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    join_message   TEXT    NOT NULL DEFAULT 'Bienvenue {user.mention} sur le serveur {guild.name}, tu es le {guild.count}e membre du serveur 👋',
    join_channel   TEXT,
    leave_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    leave_message  TEXT    NOT NULL DEFAULT 'Au revoir {user.name} 👋',
    leave_channel  TEXT,

    protect_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
    protect_anti_channel      BOOLEAN NOT NULL DEFAULT FALSE,
    protect_anti_rank         BOOLEAN NOT NULL DEFAULT FALSE,
    protect_anti_perm         BOOLEAN NOT NULL DEFAULT FALSE,
    protect_anti_massban      BOOLEAN NOT NULL DEFAULT FALSE,
    protect_anti_mass_mention BOOLEAN NOT NULL DEFAULT FALSE,
    protect_anti_bot          BOOLEAN NOT NULL DEFAULT FALSE,

    footer TEXT    NOT NULL DEFAULT '© EniumTeam ~ 2025',
    color  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE guild_users (
    id       SERIAL PRIMARY KEY,
    user_id  TEXT    NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    guild_id TEXT    NOT NULL REFERENCES guilds(guild_id)  ON DELETE CASCADE,

    xp              INTEGER NOT NULL DEFAULT 0,
    level           INTEGER NOT NULL DEFAULT 0,
    is_wl_user      BOOLEAN NOT NULL DEFAULT FALSE,

    invitation_count INTEGER NOT NULL DEFAULT 0,
    invited_by       TEXT,

    UNIQUE(user_id, guild_id)
);

CREATE TABLE bot_buyers (
    bot_id  INTEGER NOT NULL REFERENCES bots(id)        ON DELETE CASCADE,
    user_id TEXT    NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    PRIMARY KEY (bot_id, user_id)
);

CREATE TABLE bot_owners (
    bot_id  INTEGER NOT NULL REFERENCES bots(id)        ON DELETE CASCADE,
    user_id TEXT    NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    PRIMARY KEY (bot_id, user_id)
);

CREATE TABLE guild_whitelist (
    guild_id TEXT NOT NULL REFERENCES guilds(guild_id)  ON DELETE CASCADE,
    user_id  TEXT NOT NULL REFERENCES users(user_id)    ON DELETE CASCADE,
    PRIMARY KEY (guild_id, user_id)
);
