use sqlx::{
    PgPool,
    query,
    query_as,
};
use crate::models::DbUser;
use anyhow::Result;

/// Adding the user (if exist do nothing)
///
/// * `db` - database initialised in the main
/// * `user_id` - the discord user_id to insert
///
/// # Errors
///
/// Returns `Error` if the query fails.
pub async fn create(db: &PgPool, user_id: &str) -> Result<()> {
    query!("INSERT INTO users (user_id) VALUES ($1) ON CONFLICT DO NOTHING", user_id)
        .execute(db)
        .await?;
    Ok(())
}

/// Take the database information of a user
///
/// # Returns 
/// [`DbUser`] or `None` if the user doesn't exist
///
/// # Arguments
///
/// * `db` - database initialised in the main
/// * `user_id` - the discord user_id to fetch information
///
/// # Errors
///
/// Returns `Error` if the query fails.
pub async fn get(db: &PgPool, user_id: &str) -> Result<Option<DbUser>> {
    let user: Option<DbUser> = query_as!(
        DbUser,
        "SELECT * FROM users WHERE user_id = $1",
        user_id,
    )
    .fetch_optional(db)
    .await?;
    Ok(user)
}

/// Set/Revoke the owner permission to an user
///
/// * `db` - database initialised in the main
/// * `user_id` - the discord user_id to set/revoke owner permission
/// * `value` - the new value for owner's permission (true to grant / false to revoke)
///
/// # Errors
///
/// Returns `Error` if the query fails.
pub async fn set_owner(db: &PgPool, user_id: &str, value: bool) -> Result<()> {
    query!("UPDATE users set is_owner = $1 WHERE user_id = $2", value, user_id)
        .execute(db)
        .await?;
    Ok(())
}

/// Set/Revoke the buyer permission to an user
///
/// * `db`: database initialised in the main
/// * `user_id`: the discord user_id to set/revoke buyer permission
/// * `value`: the new value for buyer's permission (true to grant / false to revoke)
///
/// # Errors
///
/// Returns `Error` if the query fails.
pub async fn set_buyer(db: &PgPool, user_id: &str, value: bool) -> Result<()> {
    query!(
        "UPDATE users set is_buyer = $1 WHERE user_id = $2",
        value,
        user_id
        )
        .execute(db)
        .await?;
    Ok(())
}

pub async fn get_or_create(db: &PgPool, user_id: &str) -> Result<DbUser> {
    create(db, user_id).await?;
    get(db, user_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Not able to get or create the user"))
}
