async function discordRequest(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord API ${method} ${path} failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

class DiscordNotifier {
  constructor({ token, channelId }) {
    this.token = token;
    this.channelId = channelId;
  }

  async validateChannel() {
    const channel = await discordRequest(`/channels/${this.channelId}`, {
      token: this.token
    });

    if (![0, 5].includes(channel.type)) {
      throw new Error('DISCORD_CHANNEL_ID must point to a text-based channel the bot can access.');
    }

    return channel;
  }

  async sendMessage(content) {
    return discordRequest(`/channels/${this.channelId}/messages`, {
      method: 'POST',
      token: this.token,
      body: { content }
    });
  }
}

module.exports = {
  DiscordNotifier,
  discordRequest
};
