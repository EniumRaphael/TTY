use serenity::all::*;
use sqlx::PgPool;
use crate::commands::SlashCommand;
use crate::database::{guild, user, guild_user, bot};
use crate::events::{
    BotEvent,
    EventEntry
};
use crate::models::DbBot;
use crate::models::bot::{
    BotActivity,
    BotPresence
};

pub struct ReadyHandler;

async fn fetch_all_members(
    ctx: &Context,
    guild_id: GuildId,
) -> Result<Vec<Member>, serenity::Error> {
    let mut all_members: Vec<Member> = Vec::new();
    let mut last_id: Option<UserId> = None;

    loop {
        let batch: Vec<Member> = guild_id.members(ctx, Some(1000), last_id).await?;

        if batch.is_empty() {
            break;
        }

        last_id = Some(batch.last().unwrap().user.id);
        let count: usize = batch.len();
        all_members.extend(batch);

        if count < 1000 {
            break;
        }
    }
    Ok(all_members)
}


async fn bot_activity(ctx: &Context, db: &PgPool) {
    if let Some(config) = bot::get(db).await.expect("Erreur bot::get") {
        let activity: ActivityData = match config.activity_type {
            BotActivity::Playing   => ActivityData::playing(&config.status),
            BotActivity::Watching  => ActivityData::watching(&config.status),
            BotActivity::Listening => ActivityData::listening(&config.status),
            BotActivity::Competing => ActivityData::competing(&config.status),
            BotActivity::Streaming => ActivityData::streaming(&config.status, "https://twitch.tv/EniumRaphael")
                                        .expect("ERROR STREAMING"),
        };

        let presence: OnlineStatus = match config.presence {
            BotPresence::Online    => OnlineStatus::Online,
            BotPresence::Idle      => OnlineStatus::Idle,
            BotPresence::Dnd       => OnlineStatus::DoNotDisturb,
            BotPresence::Invisible => OnlineStatus::Invisible,
        };

        ctx.set_presence(Some(activity), presence);
    }
}

#[serenity::async_trait]
impl BotEvent for ReadyHandler {
    fn event_type(&self) -> &'static str { "ready" }

    async fn on_ready(&self, ctx: &Context, ready: &Ready, commands: &[Box<dyn SlashCommand>], db: &PgPool) {
        println!("TTY is now running as: '{}'\n", ready.user.name);

        println!("Starting commands registration:");
        let cmds: Vec<CreateCommand> = commands.iter().map(|c| c.register()).collect();
        Command::set_global_commands(&ctx.http, cmds)
            .await
            .expect("❌ | Cannot register commands");

        println!("TTY now running with {} commands loaded\n", commands.len());

        bot_activity(ctx, &db).await;

        println!("Synchronizing {} guilds\n", ready.guilds.len());

        let mut count: i32 = 0;

        for unavailable_guild in &ready.guilds {
            let guild: GuildId = unavailable_guild.id;
            let guild_id: String = guild.to_string();

            if let Err(e) = guild::get_or_create(&db, &guild_id).await {
                eprintln!("\t❌ | Guild {} — {}", guild, e);
                continue;
            }

            let members: Vec<Member> = match fetch_all_members(ctx, guild).await {
                Ok(m) => m,
                Err(e) => {
                    eprintln!("\t❌ | Guild {} — fetch members: {}", guild, e);
                    continue;
                }
            };

            println!("\t✅ | {} ({})", guild.name(ctx).expect("Undefined Name"), guild_id);
            for member in &members {
                if member.user.bot {
                    continue;
                }
                let member_id: String = member.user.id.to_string();
                if let Err(e) = user::get_or_create(&db, &member_id).await {
                    eprintln!("\t\t❌ | User {} — {}", member_id, e);
                    continue;
                }
                if let Err(e) = guild_user::get_or_create(&db, &member_id, &guild_id).await {
                    eprintln!("\t\t❌ | GuildUser {}/{} — {}", guild, member_id, e);
                    continue;
                }
                println!("\t\t✅ | {} ({})", member.user.name, member_id);
                count += 1;
            }
            println!("\n");
        }

        println!("🚀 | Synchronization complete! {} users registered", count);
    }
}

inventory::submit! {
    EventEntry { create: || Box::new(ReadyHandler) }
}
