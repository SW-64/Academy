import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly discordWebhookUrl: string;
  private readonly sentrySecret: string;

  constructor(private configService: ConfigService) {
    this.discordWebhookUrl = this.configService.get<string>(
      'DISCORD_WEBHOOK_URL',
    );
    this.sentrySecret = this.configService.get<string>('SENTRY_WEBHOOK_SECRET');
  }

  async handleSentryWebhook(
    body: any,
    rawBody: Buffer | undefined,
    signature: string,
  ) {
    if (!this.verifySentrySignature(rawBody, signature)) {
      this.logger.warn('잘못된 Sentry webhook 서명');
      return { message: '서명 검증 실패' };
    }

    const embed = this.createDiscordEmbed(body);
    await this.sendToDiscord(embed);
    return { message: 'Webhook 처리 완료' };
  }

  private verifySentrySignature(
    rawBody: Buffer | undefined,
    signature: string,
  ): boolean {
    if (!this.sentrySecret) return true;
    if (!signature || !rawBody) return false;

    const hmac = crypto.createHmac('sha256', this.sentrySecret);
    const digest = hmac.update(rawBody).digest('hex');
    return signature === digest;
  }

  private createDiscordEmbed(sentryEvent: any) {
    const { action, data } = sentryEvent;

    const colorMap = {
      'issue.created': 0xff4949,
      'issue.resolved': 0x43a047,
      'issue.ignored': 0x9ca3af,
    };
    const color = colorMap[action] || 0xffa500;

    return {
      title: data?.issue?.title || 'Sentry 알림',
      url: data?.issue?.web_url,
      color,
      timestamp: new Date().toISOString(),
      fields: [
        { name: '이벤트 타입', value: action || 'unknown', inline: true },
        {
          name: '프로젝트',
          value: data?.issue?.project?.name || 'N/A',
          inline: true,
        },
        {
          name: '환경',
          value: data?.issue?.metadata?.value || 'N/A',
          inline: true,
        },
        {
          name: '위치',
          value: `\`\`\`${data?.issue?.culprit || 'unknown'}\`\`\``,
          inline: false,
        },
      ],
    };
  }

  private async sendToDiscord(embed: any) {
    if (!this.discordWebhookUrl) return;

    try {
      await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
      this.logger.log('Discord 메시지 전송 성공');
    } catch (error) {
      this.logger.error('Discord 전송 실패', error);
    }
  }
}
