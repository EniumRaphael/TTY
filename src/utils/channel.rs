use serenity::all::{ChannelType, Context, CreateChannel, GuildChannel, GuildId};
use anyhow::{Result};

pub async fn clone_channel(channel: &GuildChannel, ctx: &Context, guild_id: GuildId) -> Result<GuildChannel> {
    let mut builder = CreateChannel::new(&channel.name)
        .kind(channel.kind)
        .position(channel.position)
        .permissions(channel.permission_overwrites.clone())
        .nsfw(channel.nsfw);

    if let Some(topic) = &channel.topic {
        builder = builder.topic(topic);
    }

    if let Some(parent_id) = &channel.parent_id {
        builder = builder.category(parent_id);
    }

    if let Some(rate_limit) = channel.rate_limit_per_user {
        builder = builder.rate_limit_per_user(rate_limit);
    }

    if channel.kind == ChannelType::Voice || channel.kind == ChannelType::Stage {
        if let Some(bitrate) = channel.bitrate {
            builder = builder.bitrate(bitrate);
        }
        if let Some(rtc_region) = &channel.rtc_region {
            builder = builder.rtc_region(rtc_region.to_owned());
        }
        if channel.kind == ChannelType::Voice {
            if let Some(user_limit) = channel.user_limit {
                builder = builder.user_limit(user_limit);
            }
        }
    }

    let new_channel: GuildChannel = guild_id
        .create_channel(&ctx.http, builder)
        .await?;

    Ok(new_channel)
}
