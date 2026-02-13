include!("./mod_gen.rs");

use sqlx::{Pool, Postgres};
use serenity::prelude::TypeMapKey;

pub struct DbPool;

impl TypeMapKey for DbPool {
    type Value = Pool<Postgres>;
}
