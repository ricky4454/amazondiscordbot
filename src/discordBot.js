function buildDiscordErrorMessage({ method, path, status, statusText, errorText }) {
  const baseMessage = `Discord API ${method} ${path} failed: ${status} ${statusText}`;

  if (status === 401) {
    return `${baseMessage} - Unauthorized. Check DISCORD_TOKEN in .env. If you pasted the token into chat or shared it anywhere, regenerate it in Discord Developer Portal and update .env.`;
  }

  if (status === 403) {
    return `${baseMessage} - Forbidden. The bot can reach Discord, but it does not have permission to access this channel.`;
  }

  if (status === 404) {
    return `${baseMessage} - Not Found. Check DISCORD_CHANNEL_ID and make sure the bot is in the server.`;
  }

  return `${baseMessage} - ${errorText}`;
}

async function discordRequest(path, { method = 'GET', token, body } = {}) {
  let response;

  try {
    response = await fetch(`https://discord.com/api/v10${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    throw new Error(`Discord request failed before a response was received: ${error.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      buildDiscordErrorMessage({
        method,
        path,
        status: response.status,
        statusText: response.statusText,
        errorText
      })
    );
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
  buildDiscordErrorMessage,
  DiscordNotifier,
  discordRequest
};
