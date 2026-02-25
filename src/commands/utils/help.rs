use std::{collections::HashMap, time::Duration};
use serenity::{
    all::{
        ButtonStyle, Command, CommandInteraction, ComponentInteractionCollector, Context, CreateActionRow, CreateButton, CreateCommand, CreateEmbed, CreateEmbedFooter, CreateInteractionResponse, CreateInteractionResponseMessage, EditInteractionResponse, GuildId, InteractionContext, Message, MessageId, ReactionType, UserId
    },
    futures::StreamExt,
};
use sqlx::PgPool;
use tracing::{debug, info};
use anyhow::Result;
use crate::{
    commands::{
        CommandCategory,
        CommandEntry,
        SlashCommand
    },
    config::EmojiConfig,
    database::guild,
    models::DbGuild,
};

pub struct Help;

fn create_category_buttons(categories: &HashMap<CommandCategory, Vec<String>>, disabled: bool) -> Vec<CreateActionRow> {
    let buttons: Vec<CreateButton> = categories
        .keys()
        .map(|cat| {
            CreateButton::new(format!("help_{}", cat.name().to_lowercase()))
                .label(cat.name())
                .emoji(ReactionType::Unicode(cat.emoji().to_string()))
                .style(ButtonStyle::Primary)
                .disabled(disabled)
        })
        .collect();

    buttons
        .chunks(5)
        .map(|chunk: &[CreateButton]| CreateActionRow::Buttons(chunk.to_vec()))
        .collect()
}

fn back_button() -> CreateActionRow {
    CreateActionRow::Buttons(vec![
        CreateButton::new("help_menu")
            .label("Back to Home")
            .emoji(ReactionType::Unicode("🏠".to_string()))
            .style(ButtonStyle::Secondary)
    ])
}

fn build_menu_embed(description: &str, color: u32, footer: &str) -> CreateEmbed {
    CreateEmbed::new()
        .title("Commands")
        .description(description)
        .footer(CreateEmbedFooter::new(footer))
        .color(color)
}

fn build_category_embed(category: &CommandCategory, commands: &[String], color: u32, footer: &str) -> CreateEmbed {
    CreateEmbed::new()
        .title(format!("{} | {}", category.emoji(), category.name()))
        .description(commands.join("\n"))
        .footer(CreateEmbedFooter::new(footer))
        .color(color)
}

#[serenity::async_trait]
impl SlashCommand for Help {
    fn name(&self) -> &'static str {
        "help"
    }

    fn description(&self) -> &'static str {
        "List all available commands"
    }

    fn category(&self) -> &'static CommandCategory {
        &CommandCategory::Utils
    }

    fn register(&self) -> CreateCommand {
        info!("\t✅ | {}", self.name());
        CreateCommand::new(self.name())
            .description(self.description())
            .contexts(vec![
                InteractionContext::Guild,
            ])
    }

    async fn run(
        &self,
        ctx: &Context,
        command: &CommandInteraction,
        _database: &PgPool,
        _emoji: &EmojiConfig,
    ) -> Result<()> {
        debug!("Help command called");
        let guild: GuildId = command.guild_id.ok_or(serenity::Error::Other("Commande non disponible en DM"))?;
        let guild_id: String = guild.to_string();
        let guild_db: Option<DbGuild> = guild::get(_database, &guild_id).await.map_err(|_e| serenity::Error::Other("Database error guild on help command"))?;
        let footer: &String = &guild_db.as_ref().unwrap().footer;
        let color: u32 = guild_db.as_ref().unwrap().color as u32;

        let registered_cmds: Vec<Command> = ctx.http.get_global_commands().await?;
        let cmd_ids: HashMap<String, u64> = registered_cmds
            .into_iter()
            .map(|c| (c.name, c.id.get()))
            .collect();
        let mut categories: HashMap<CommandCategory, Vec<String>> = HashMap::new();

        for entry in inventory::iter::<CommandEntry> {
            let cmd: Box<dyn SlashCommand> = (entry.create)();
            let id: u64 = cmd_ids.get(cmd.name()).copied().unwrap_or(0);

            let line: String = if id != 0 {
                format!("</{}:{}> — {}", cmd.name(), id, cmd.description())
            } else {
                format!("`/{}` — {}", cmd.name(), cmd.description())
            };

            categories
                .entry(*cmd.category())
                .or_insert_with(Vec::new)
                .push(line);
        }

        let description: &str = "Welcome to this help command.\nThe buttons below will allow you to navigate through the different categories.";
        let menu_embed: CreateEmbed = build_menu_embed(description, color, &footer);
        let menu_buttons: Vec<CreateActionRow> = create_category_buttons(&categories, false);

        let response: CreateInteractionResponse = CreateInteractionResponse::Message(
            CreateInteractionResponseMessage::new()
                .embed(menu_embed)
                .components(menu_buttons)
                .ephemeral(true)
        );

        command.create_response(&ctx.http, response).await?;

        let msg: Message = command.get_response(&ctx.http).await?;
        let msg_id: MessageId = msg.id;
        let author_id: UserId = command.user.id;

        let mut collector = ComponentInteractionCollector::new(&ctx.shard)
            .filter(move |e| e.message.id == msg_id && e.user.id == author_id)
            .timeout(Duration::from_secs(120))
            .stream();

        while let Some(click) = collector.next().await {
            let custom_id: &str = click.data.custom_id.as_str();

            if custom_id == "help_menu" {
                let menu_embed: CreateEmbed = build_menu_embed(description, color, &footer);
                let menu_buttons: Vec<CreateActionRow> = create_category_buttons(&categories, false);

                click.create_response(&ctx.http, CreateInteractionResponse::UpdateMessage(
                    CreateInteractionResponseMessage::new()
                        .embed(menu_embed)
                        .components(menu_buttons)
                )).await?;
                continue;
            }

            let matched_category = categories.iter().find(|(cat, _)| {
                format!("help_{}", cat.name().to_lowercase()) == custom_id
            });

            if let Some((category, commands)) = matched_category {
                let cat_embed: CreateEmbed = build_category_embed(category, commands, color, &footer);

                let components: Vec<CreateActionRow> = vec![back_button()];
                click.create_response(&ctx.http, CreateInteractionResponse::UpdateMessage(
                    CreateInteractionResponseMessage::new()
                        .embed(cat_embed)
                        .components(components)
                )).await?;
            }
        }
        let disabled_buttons: Vec<CreateActionRow> = create_category_buttons(&categories, true);
        command.edit_response(&ctx.http,
            EditInteractionResponse::new().components(disabled_buttons)
        ).await?;

        Ok(())
    }
}

inventory::submit! {
    CommandEntry { create: || Box::new(Help) }
}
