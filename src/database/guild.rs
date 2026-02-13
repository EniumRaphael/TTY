use sqlx::{
    PgPool,
    query_as,
    query_scalar,
};
use crate::models::Guild;

pub enum LogChannel {
    Bot,
    Category,
    Channels,
    Member,
    Moderation,
    Msg,
    Server,
}

pub enum Protect {
    AntiBot,
    AntiChannel,
    AntiMassMention,
    AntiMassban,
    AntiPerm,
    AntiRank,
}

fn log_select(asked: LogChannel) -> &'static str {
    match asked {
        LogChannel::Bot        => "log_bot",
        LogChannel::Category   => "log_category",
        LogChannel::Channels   => "log_channels",
        LogChannel::Member     => "log_member",
        LogChannel::Moderation => "log_mod",
        LogChannel::Msg        => "log_msg",
        LogChannel::Server     => "log_server",
    }
}

fn protect_select(asked: Protect) -> &'static str {
    match asked {
        Protect::AntiBot         => "protect_anti_bot",
        Protect::AntiChannel     => "protect_anti_channel",
        Protect::AntiMassMention => "protect_anti_mass_mention",
        Protect::AntiMassban     => "protect_anti_massban",
        Protect::AntiPerm        => "protect_anti_perm",
        Protect::AntiRank        => "protect_anti_rank",
    }
}

pub async fn get(db: &PgPool, guild_id: &str) -> Result<Option<Guild>, sqlx::Error> {
    let guild: Option<Guild> = query_as::<_, Guild>(
        "SELECT * FROM guilds WHERE guild_id = $1",
        )
        .bind(guild_id)
        .fetch_optional(db)
        .await?;
    Ok(guild)
}

pub async fn get_log(db: &PgPool, guild_id: &str, asked: LogChannel) -> Result<Option<String>, sqlx::Error> {
    let sql: String = format!("SELECT {} FROM guilds WHERE guild_id = $1", log_select(asked));
    let channel_id: Option<String> = query_scalar(&sql)
        .bind(guild_id)
        .fetch_optional(db)
        .await?;
    Ok(channel_id)
}

pub async fn set_log(db: &PgPool, user_id: &str, asked: LogChannel, value: &str) -> Result<(), sqlx::Error> {
    let sql: String = format!("UPDATE guilds set {} = $1 WHERE guild_id = $2", log_select(asked));
    query(&sql)
        .bind(value)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn get_protect(db: &PgPool, guild_id: &str, asked: Protect) -> Result<Option<bool>, sqlx::Error> {
    let sql: String = format!("SELECT {} FROM guilds WHERE guild_id = $1", protect_select(asked));
    let state: Option<bool> = query_scalar(&sql)
        .bind(guild_id)
        .fetch_optional(db)
        .await?;
    Ok(state)
}

pub async fn set_protect(db: &PgPool, user_id: &str, asked: Protect, value: &str) -> Result<(), sqlx::Error> {
    let sql: String = format!("UPDATE guilds set {} = $1 WHERE guild_id = $2", log_protect(asked));
    query(&sql)
        .bind(value)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}
