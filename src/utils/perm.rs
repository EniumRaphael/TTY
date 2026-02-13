use sqlx::{
    PgPool,
    query_scalar,
};

pub async fn is_whitelist(db: &PgPool, user_id: &str, guild_id: &str) -> Result<bool, sqlx::Error> {
    let result: Option<bool> = query_scalar(
        "SELECT TRUE FROM guild_users gu \
         LEFT JOIN users u ON u.user_id = gu.user_id \
         WHERE gu.user_id = $1 AND gu.guild_id = $2 \
         AND ( \
             gu.is_wl_user = true \
             OR COALESCE(u.is_owner, false) = true \
             OR COALESCE(u.is_buyer, false) = true \
             OR COALESCE(u.is_dev, false) = true \
         )",
    )
    .bind(user_id)
    .bind(guild_id)
    .fetch_optional(db)
    .await?;
    Ok(result.is_some())
}
