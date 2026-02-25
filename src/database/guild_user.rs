use sqlx::{PgPool, query, query_as, query_scalar};
use crate::models::guild_user::DbGuildUser;
use anyhow::Result;

pub async fn get(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
) -> Result<Option<DbGuildUser>> {
    let guild_user = query_as!(
        DbGuildUser,
        "SELECT * FROM guild_users WHERE user_id = $1 AND guild_id = $2",
        user_id,
        guild_id,
    )
    .fetch_optional(db)
    .await?;
    Ok(guild_user)
}

pub async fn create(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
) -> Result<()> {
    query!(
        "INSERT INTO guild_users (user_id, guild_id) \
         VALUES ($1, $2) \
         ON CONFLICT (user_id, guild_id) DO NOTHING",
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn delete(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
) -> Result<()> {
    query!(
        "DELETE FROM guild_users WHERE user_id = $1 AND guild_id = $2",
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn delete_all_in_guild(
    db: &PgPool,
    guild_id: &str,
) -> Result<()> {
    query!("DELETE FROM guild_users WHERE guild_id = $1", guild_id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn add_xp(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
    amount: i32,
) -> Result<()> {
    query!(
        "UPDATE guild_users SET xp = xp + $1 \
         WHERE user_id = $2 AND guild_id = $3",
        amount,
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn set_level(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
    level: i32,
) -> Result<()> {
    query!(
        "UPDATE guild_users SET level = $1 \
         WHERE user_id = $2 AND guild_id = $3",
        level,
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn get_xp(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
) -> Result<Option<i32>> {
    let xp: Option<i32> = query_scalar(
        "SELECT xp FROM guild_users WHERE user_id = $1 AND guild_id = $2",
        )
        .bind(user_id)
        .bind(guild_id)
    .fetch_optional(db)
    .await?;
    Ok(xp)
}

pub async fn get_level(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
) -> Result<Option<i32>> {
    let level: Option<i32> = query_scalar("SELECT level FROM guild_users WHERE user_id = $1 AND guild_id = $2")
        .bind(user_id)
        .bind(guild_id)
    .fetch_optional(db)
    .await?;
    Ok(level)
}

pub async fn set_wl(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
    value: bool,
) -> Result<()> {
    query!(
        "UPDATE guild_users SET is_wl_user = $1 \
         WHERE user_id = $2 AND guild_id = $3",
        value,
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn get_all_wl(
    db: &PgPool,
    guild_id: &str,
) -> Result<Vec<DbGuildUser>> {
    let users = query_as!(
        DbGuildUser,
        "SELECT * FROM guild_users \
         WHERE guild_id = $1 AND is_wl_user = true",
        guild_id,
    )
    .fetch_all(db)
    .await?;
    Ok(users)
}

pub async fn set_invited_by(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
    inviter_id: &str,
) -> Result<()> {
    query!(
        "UPDATE guild_users SET invited_by = $1 \
         WHERE user_id = $2 AND guild_id = $3",
        inviter_id,
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn increment_invitations(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
) -> Result<()> {
    query!(
        "UPDATE guild_users SET invitation_count = invitation_count + 1 \
         WHERE user_id = $1 AND guild_id = $2",
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn decrement_invitations(
    db: &PgPool,
    user_id: &str,
    guild_id: &str,
) -> Result<()> {
    query!(
        "UPDATE guild_users SET invitation_count = GREATEST(invitation_count - 1, 0) \
         WHERE user_id = $1 AND guild_id = $2",
        user_id,
        guild_id,
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn leaderboard_xp(
    db: &PgPool,
    guild_id: &str,
    limit: i64,
) -> Result<Vec<DbGuildUser>> {
    let users = query_as!(
        DbGuildUser,
        "SELECT * FROM guild_users \
         WHERE guild_id = $1 \
         ORDER BY xp DESC \
         LIMIT $2",
        guild_id,
        limit,
    )
    .fetch_all(db)
    .await?;
    Ok(users)
}

pub async fn leaderboard_invitations(
    db: &PgPool,
    guild_id: &str,
    limit: i64,
) -> Result<Vec<DbGuildUser>> {
    let users = query_as!(
        DbGuildUser,
        "SELECT * FROM guild_users \
         WHERE guild_id = $1 \
         ORDER BY invitation_count DESC \
         LIMIT $2",
        guild_id,
        limit,
    )
    .fetch_all(db)
    .await?;
    Ok(users)
}
pub async fn get_or_create(db: &PgPool, user_id: &str, guild_id: &str) -> Result<DbGuildUser> {
    create(db, user_id, guild_id).await?;
    get(db, user_id, guild_id)
        .await?
        .ok_or_else(|| sqlx::Error::RowNotFound.into())
}
