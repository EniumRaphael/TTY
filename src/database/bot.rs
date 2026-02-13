use sqlx::{PgPool, query, query_as};
use crate::models::bot::{Bot, BotPresence, BotActivity};

const BOT_ID: i32 = 1;

pub async fn init(db: &PgPool) -> Result<(), sqlx::Error> {
    query("INSERT INTO bots (id) VALUES ($1) ON CONFLICT DO NOTHING")
        .bind(BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn get(db: &PgPool) -> Result<Option<Bot>, sqlx::Error> {
    let bot = query_as::<_, Bot>(
        "SELECT * FROM bots WHERE id = $1",
    )
    .bind(BOT_ID)
    .fetch_optional(db)
    .await?;
    Ok(bot)
}

pub async fn set_status(db: &PgPool, status: &str) -> Result<(), sqlx::Error> {
    query("UPDATE bots SET status = $1 WHERE id = $2")
        .bind(status)
        .bind(BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn set_activity(db: &PgPool, activity: BotActivity) -> Result<(), sqlx::Error> {
    query("UPDATE bots SET activity_type = $1 WHERE id = $2")
        .bind(activity)
        .bind(BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn set_presence(db: &PgPool, presence: BotPresence) -> Result<(), sqlx::Error> {
    query("UPDATE bots SET presence = $1 WHERE id = $2")
        .bind(presence)
        .bind(BOT_ID)
        .execute(db)
        .await?;
    Ok(())
}
