use sqlx::FromRow;

#[derive(Debug, FromRow)]
pub struct Guild {
    pub guild_id: String,

    pub log_enable: bool,
    pub log_category: Option<String>,
    pub log_bot: Option<String>,
    pub log_channels: Option<String>,
    pub log_member: Option<String>,
    pub log_mod: Option<String>,
    pub log_msg: Option<String>,
    pub log_server: Option<String>,

    pub join_enabled: bool,
    pub join_message: String,
    pub join_channel: Option<String>,
    pub leave_enabled: bool,
    pub leave_message: String,
    pub leave_channel: Option<String>,

    pub protect_enabled: bool,
    pub protect_anti_channel: bool,
    pub protect_anti_rank: bool,
    pub protect_anti_perm: bool,
    pub protect_anti_massban: bool,
    pub protect_anti_mass_mention: bool,
    pub protect_anti_bot: bool,

    pub footer: String,
    pub color: i32,
}
