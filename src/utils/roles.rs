use anyhow::Result;
use serenity::all::{CommandInteraction, Context, CreateInteractionResponse, CreateInteractionResponseMessage, Guild, GuildId, Member, Role, RoleId, UserId};

use crate::config::EmojiConfig;

pub async fn get_members_with_role(ctx: &Context, guild_id: GuildId, role_id: RoleId) -> Result<Vec<Member>> {
    let members = guild_id.members(&ctx.http, None, None).await?;
    Ok(members.into_iter().filter(|m| m.roles.contains(&role_id)).collect())
}

pub async fn check_permission_using_user(ctx: &Context, emoji: &EmojiConfig, guild: &Guild, user_id: UserId, command: &CommandInteraction, action: &str) -> Result<bool> {
    let target_member: Member = guild.id.member(&ctx.http, user_id).await?;
    let executor_member: Member = guild.id.member(&ctx.http, command.user.id).await?;
    let bot_id: UserId = ctx.cache.current_user().id;
    let bot_member: Member = guild.id.member(&ctx.http, bot_id).await?;
    let target_role_pos: u16 = guild
        .member_highest_role(&target_member)
        .map(|r| r.position)
        .unwrap_or(0);
    let executor_role_pos: u16 = guild
        .member_highest_role(&executor_member)
        .map(|r| r.position)
        .unwrap_or(0);
    let bot_role_pos: u16 = guild
        .member_highest_role(&bot_member)
        .map(|r| r.position)
        .unwrap_or(0);
    if user_id == guild.owner_id || target_role_pos >= executor_role_pos {
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | You cannot {} this user because they are hierarchically above you", emoji.answer.no, action))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;
        return Ok(false);
    }
    else if target_role_pos >= bot_role_pos {
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | You cannot {} this user because they are hierarchically above the bot", emoji.answer.no, action))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;
        return Ok(false);
    }
    return Ok(true);
}

pub async fn check_permission_using_role(ctx: &Context, emoji: &EmojiConfig, guild: &Guild, role: &Role, command: &CommandInteraction, action: &str) -> Result<bool> {
    let executor_member: Member = guild.id.member(&ctx.http, command.user.id).await?;
    let bot_id: UserId = ctx.cache.current_user().id;
    let bot_member: Member = guild.id.member(&ctx.http, bot_id).await?;

    let target_role_pos: u16 = role.position;
    let executor_role_pos: u16 = guild
        .member_highest_role(&executor_member)
        .map(|r| r.position)
        .unwrap_or(0);
    let bot_role_pos: u16 = guild
        .member_highest_role(&bot_member)
        .map(|r| r.position)
        .unwrap_or(0);
    if command.user.id != guild.owner_id && target_role_pos >= executor_role_pos {
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | You cannot {} this role it's hierarchically above you", emoji.answer.no, action))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;
        return Ok(false);
    }
    else if target_role_pos >= bot_role_pos {
        let message: CreateInteractionResponseMessage = CreateInteractionResponseMessage::new()
            .content(format!("{} | You cannot {} this role it's hierarchically above the bot", emoji.answer.no, action))
            .ephemeral(true);
        let response: CreateInteractionResponse = CreateInteractionResponse::Message(message);
        command.create_response(&ctx.http, response).await?;
        return Ok(false);
    }
    Ok(true)
}
