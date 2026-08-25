import { EventEmitter } from 'events';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// ══════════════════════════════════════════════════════
// EMAIL SERVICE — Gmail API Integration
// Two-step confirmation: parse → preview → confirm → send
// ══════════════════════════════════════════════════════

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
}

class EmailService {
  private eventBus: EventEmitter;
  private oauth2Client: OAuth2Client | null = null;
  private gmail: any = null;
  private isAuthenticated = false;
  private connectedEmail = '';
  private pendingDraft: EmailDraft | null = null;

  // Gmail OAuth2 credentials (user will configure in Settings)
  private clientId = '';
  private clientSecret = '';
  private redirectUri = 'http://localhost:3000/oauth2callback';

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
  }

  // ── Authentication ──

  async authenticate(clientId: string, clientSecret: string): Promise<{ success: boolean; message: string; authUrl?: string }> {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    try {
      this.oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUri
      );

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
        ],
        prompt: 'consent',
      });

      return {
        success: true,
        message: 'Opening browser for Gmail authentication...',
        authUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Authentication failed: ${err.message}`,
      };
    }
  }

  async handleAuthCallback(code: string): Promise<{ success: boolean; message: string }> {
    if (!this.oauth2Client) {
      return { success: false, message: 'OAuth client not initialized. Please authenticate first.' };
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.isAuthenticated = true;

      // Get connected email address
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      this.connectedEmail = profile.data.emailAddress || '';

      // Store tokens securely (in production, use keytar)
      // For now, store in memory
      this.eventBus.emit('email:authenticated', { email: this.connectedEmail });

      return {
        success: true,
        message: `Successfully connected to Gmail as ${this.connectedEmail}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Auth callback failed: ${err.message}`,
      };
    }
  }

  // ── Parse Email Command ──

  parseEmailCommand(input: string): EmailDraft | null {
    const lower = input.toLowerCase();

    // Extract recipient
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const emailMatch = input.match(emailRegex);
    if (!emailMatch) return null;

    const to = emailMatch[0];

    // Extract subject
    let subject = 'No Subject';
    const subjectMatch = lower.match(/(?:about|regarding|subject|re:?)\s+(.+?)(?:\s+(?:and|with|body|message|saying|that|please|$))/i)
      || lower.match(/(?:about|regarding|subject|re:?)\s+(.+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim().replace(/[.,!?]+$/, '');
    }

    // Extract body
    let body = '';
    const bodyMatch = input.match(/(?:saying|body|message|that|content)\s+(.+?)$/i);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    } else {
      // Use subject as body if no explicit body
      body = subject;
    }

    return { to, subject, body, isHtml: false };
  }

  // ── Send Email (only called after confirmation) ──

  async confirmAndSend(draft: EmailDraft): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(draft.to, draft.subject, draft.body, draft.isHtml);
  }

  async sendEmail(to: string, subject: string, body: string, isHtml = false): Promise<{ success: boolean; message: string }> {
    if (!this.isAuthenticated || !this.gmail) {
      return {
        success: false,
        message: 'Gmail not connected. Please authenticate in Settings first.',
      };
    }

    try {
      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
        '',
        body,
      ].join('\r\n');

      const encodedMessage = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        success: true,
        message: `Email sent successfully to ${to}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to send email: ${err.message}`,
      };
    }
  }

  // ── Read Inbox ──

  async readInbox(maxResults = 10): Promise<{ success: boolean; messages: EmailMessage[]; message: string }> {
    if (!this.isAuthenticated || !this.gmail) {
      return {
        success: false,
        messages: [],
        message: 'Gmail not connected. Please authenticate in Settings first.',
      };
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        labelIds: ['INBOX'],
      });

      const messages: EmailMessage[] = [];
      const messageIds = response.data.messages || [];

      for (const msg of messageIds.slice(0, maxResults)) {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = detail.data.payload?.headers || [];
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';
        const isRead = !detail.data.labelIds?.includes('UNREAD');

        messages.push({
          id: msg.id,
          from,
          subject,
          snippet: detail.data.snippet || '',
          date,
          isRead,
        });
      }

      return {
        success: true,
        messages,
        message: `Found ${messages.length} emails in your inbox.`,
      };
    } catch (err: any) {
      return {
        success: false,
        messages: [],
        message: `Failed to read inbox: ${err.message}`,
      };
    }
  }

  // ── Search Emails ──

  async searchEmails(query: string, maxResults = 10): Promise<{ success: boolean; messages: EmailMessage[]; message: string }> {
    if (!this.isAuthenticated || !this.gmail) {
      return {
        success: false,
        messages: [],
        message: 'Gmail not connected. Please authenticate in Settings first.',
      };
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query,
      });

      const messages: EmailMessage[] = [];
      const messageIds = response.data.messages || [];

      for (const msg of messageIds.slice(0, maxResults)) {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = detail.data.payload?.headers || [];
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';
        const isRead = !detail.data.labelIds?.includes('UNREAD');

        messages.push({
          id: msg.id,
          from,
          subject,
          snippet: detail.data.snippet || '',
          date,
          isRead,
        });
      }

      return {
        success: true,
        messages,
        message: `Found ${messages.length} emails matching "${query}".`,
      };
    } catch (err: any) {
      return {
        success: false,
        messages: [],
        message: `Failed to search emails: ${err.message}`,
      };
    }
  }

  // ── Status ──

  getStatus(): { isAuthenticated: boolean; email: string } {
    return {
      isAuthenticated: this.isAuthenticated,
      email: this.connectedEmail,
    };
  }

  // ── Pending Draft Management ──

  setPendingDraft(draft: EmailDraft | null): void {
    this.pendingDraft = draft;
  }

  getPendingDraft(): EmailDraft | null {
    return this.pendingDraft;
  }

  clearPendingDraft(): void {
    this.pendingDraft = null;
  }
}

export default EmailService;
