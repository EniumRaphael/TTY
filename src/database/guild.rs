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

pub async fn get_log(db: &PgPool, guild_id: &str, asked: LogChannel) -> Result<Option<String>, sqlx::Error> {
    let query: String = format!("SELECT {} FROM guilds WHERE guild_id = $1", log_select(asked));
    let channel_id: Option<String> = query_scalar(&query)
        .bind(guild_id)
        .fetch_optional(db)
        .await?;
    Ok(channel_id)
}

pub async fn set_log(db: &PgPool, user_id: &str, asked: LogChannel, value: &str) -> Result<(), sqlx::Error> {
    let query = format!("UPDATE guilds set {} = $1 WHERE guild_id = $2", log_select(asked));
    query(&query)
        .bind(value)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}
