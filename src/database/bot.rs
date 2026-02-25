use sqlx::{PgPool, query, query_as};
use crate::models::bot::{DbBot, BotPresence, BotActivity};
use anyhow::Result;

const BOT_ID: i32 = 1;

pub async fn init(db: &PgPool) -> Result<()> {
    query!("INSERT INTO bots (id) VALUES ($1) ON CONFLICT DO NOTHING", BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn get(db: &PgPool) -> Result<Option<DbBot>> {
    let bot: Option<DbBot> = query_as!(
        DbBot,
        r#"SELECT status, activity_type as "activity_type: BotActivity", presence as "presence: BotPresence" FROM bots WHERE id = $1"#,
        BOT_ID
    )
        .fetch_optional(db)
        .await?;
    Ok(bot)
}

pub async fn set_status(db: &PgPool, status: &str) -> Result<()> {
    query!("UPDATE bots SET status = $1 WHERE id = $2", status, BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn set_activity(db: &PgPool, activity: BotActivity) -> Result<()> {
    query!("UPDATE bots SET activity_type = $1::bot_activity WHERE id = $2", activity as BotActivity, BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn set_presence(db: &PgPool, presence: BotPresence) -> Result<()> {
    query!("UPDATE bots SET presence = $1::bot_presence WHERE id = $2", presence as BotPresence, BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}
