use anyhow::Result;
use serenity::all::{Context, GuildId, Member, RoleId};

pub async fn get_members_with_role(ctx: &Context, guild_id: GuildId, role_id: RoleId) -> Result<Vec<Member>> {
    let members = guild_id.members(&ctx.http, None, None).await?;
    Ok(members.into_iter().filter(|m| m.roles.contains(&role_id)).collect())
}
