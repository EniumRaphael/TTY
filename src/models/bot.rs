use sqlx::FromRow;

#[derive(Debug, FromRow)]
pub struct Bot {
    pub id: i32,
    pub status: String,
    pub activity_type: String,
    pub presence: String,
}
