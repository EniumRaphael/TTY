CREATE INDEX idx_guild_users_user_id  ON guild_users(user_id);
CREATE INDEX idx_guild_users_guild_id ON guild_users(guild_id);

CREATE INDEX idx_bot_buyers_user_id   ON bot_buyers(user_id);
CREATE INDEX idx_bot_owners_user_id   ON bot_owners(user_id);
CREATE INDEX idx_guild_wl_user_id     ON guild_whitelist(user_id);
