include!("./mod_gen.rs");

use serenity::prelude::TypeMapKey;
use sqlx::{Pool, Postgres};

pub struct DbPool;

impl TypeMapKey for DbPool {
    type Value = Pool<Postgres>;
}
