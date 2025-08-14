import { WebClient } from '@slack/web-api';
import crypto from 'crypto';
import type { VercelRequest } from '@vercel/node';

const slackToken = process.env.SLACK_BOT_TOKEN;
const signingSecret = process.env.SLACK_SIGNING_SECRET;

if (!slackToken || !signingSecret) {
  console.error('Slack environment variables are not set.');
}

const slackClient = new WebClient(slackToken);

export const verifySlackRequest = (headers: VercelRequest['headers'], rawBody: string) => {
  const signature = headers['x-slack-signature'] as string;
  const timestamp = headers['x-slack-request-timestamp'] as string;

  if (!signature || !timestamp) {
    console.error('Slack signature or timestamp missing from headers.');
    return false;
  }

  const hmac = crypto.createHmac('sha256', signingSecret as string);
  const base = `v0:${timestamp}:${rawBody}`;
  hmac.update(base);
  const hash = `v0=${hmac.digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch (error) {
    console.error('Error during signature verification:', error);
    return false;
  }
};

export const sendSlackMessage = async (channel: string, text: string, blocks?: any) => {
  try {
    await slackClient.chat.postMessage({
      channel,
      text,
      blocks,
    });
  } catch (error) {
    console.error('Error sending Slack message:', error);
  }
};

export const sendSlackThreadMessage = async (channel: string, thread_ts: string, text: string) => {
  try {
    await slackClient.chat.postMessage({
      channel,
      thread_ts,
      text,
    });
  } catch (error) {
    console.error('Error sending Slack thread message:', error);
  }
};
