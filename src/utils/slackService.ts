import { WebClient } from '@slack/web-api';
import crypto from 'crypto';
import type { VercelRequest } from '@vercel/node';

const slackToken = process.env.SLACK_BOT_TOKEN;
const signingSecret = process.env.SLACK_SIGNING_SECRET;

if (!slackToken || !signingSecret) {
  console.error('Slack environment variables are not set.');
}

const slackClient = new WebClient(slackToken);

export const verifySlackRequest = (request: VercelRequest) => {
  const signature = request.headers['x-slack-signature'] as string;
  const timestamp = request.headers['x-slack-request-timestamp'] as string;
  
  // When the body is pre-parsed by Vercel, it's an object.
  // For signature verification, we need the raw body string.
  // When the request is form-urlencoded, the body is a string.
  const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

  if (!signature || !timestamp) {
    console.error('Slack signature or timestamp missing.');
    return false;
  }

  const hmac = crypto.createHmac('sha256', signingSecret as string);
  const base = `v0:${timestamp}:${rawBody}`;
  hmac.update(base);
  const hash = `v0=${hmac.digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch (error) {
    console.error('Error during timingSafeEqual:', error);
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
