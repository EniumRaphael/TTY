use sqlx::FromRow;

#[derive(Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "bot_presence", rename_all = "lowercase")]
pub enum BotPresence {
    Online,
    Idle,
    Dnd,
    Invisible,
}

#[derive(Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "bot_activity")]
pub enum BotActivity {
    Playing,
    Streaming,
    Listening,
    Watching,
    Competing,
}

#[derive(Debug, FromRow)]
pub struct DbBot {
    pub status: String,
    pub activity_type: BotActivity,
    pub presence: BotPresence,
}
