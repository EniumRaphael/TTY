use sqlx::FromRow;

#[derive(Debug, FromRow)]
pub struct User {
    pub user_id: String,
    pub is_owner: bool,
    pub is_buyer: bool,
    pub is_dev: bool,
    pub is_enium: bool,
    pub is_pwn: bool,
}

