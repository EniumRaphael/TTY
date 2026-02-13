use sqlx::FromRow;

#[derive(Debug, FromRow)]
pub struct DbGuildUser {
    pub id: i32,
    pub user_id: String,
    pub guild_id: String,

    pub xp: i32,
    pub level: i32,
    pub is_wl_user: bool,

    pub invitation_count: i32,
    pub invited_by: Option<String>,
}
