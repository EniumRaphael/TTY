use sqlx::{
    PgPool,
    query,
    query_as
};
use crate::models::User;

/// Adding the user (if exist do nothing)
///
/// * `db` - database initialised in the main
/// * `user_id` - the discord user_id to insert
///
/// # Errors
///
/// Returns `sqlx::Error` if the query fails.
pub async fn create(db: &PgPool, user_id: &str) -> Result<(), sqlx::Error> {
    query(
        "INSERT INTO users (user_id) VALUES ($1) ON CONFLICT DO NOTHING"
        )
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}

/// Take the database information of a user
///
/// # Returns 
/// User overwise `None` if the user doesn't exist
///
/// # Arguments
///
/// * `db` - database initialised in the main
/// * `user_id` - the discord user_id to fetch information
///
/// # Errors
///
/// Returns `sqlx::Error` if the query fails.
pub async fn get(db: &PgPool, user_id: &str) -> Result<Option<User>, sqlx::Error> {
    let user: Option<User> = query_as::<_, User>(
        "SELECT user_id, is_owner, is_buyer, is_dev FROM users WHERE user_id = $1",
    )
    .bind(user_id)
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
/// Returns `sqlx::Error` if the query fails.
pub async fn set_owner(db: &PgPool, user_id: &str, value: bool) -> Result<(), sqlx::Error> {
    query(
        "UPDATE users set is_owner = $1 WHERE user_id = $2",
        )
        .bind(value)
        .bind(user_id)
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
/// Returns `sqlx::Error` if the query fails.
pub async fn set_buyer(db: &PgPool, user_id: &str, value: bool) -> Result<(), sqlx::Error> {
    query(
        "UPDATE users set is_buyer = $1 WHERE user_id = $2",
        )
        .bind(value)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(())
}
