use serenity::all::{CommandInteraction, Context, CreateCommand};

include!("./mod_gen.rs");

#[serenity::async_trait]
pub trait SlashCommand: Send + Sync {
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;

    fn register(&self) -> CreateCommand;

    async fn run(&self, ctx: &Context, command: &CommandInteraction)
    -> Result<(), serenity::Error>;
}

pub struct CommandEntry {
    pub create: fn() -> Box<dyn SlashCommand>,
}

inventory::collect!(CommandEntry);

pub fn all_commands() -> Vec<Box<dyn SlashCommand>> {
    inventory::iter::<CommandEntry>
        .into_iter()
        .map(|entry| (entry.create)())
        .collect()
}
