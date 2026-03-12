import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Request } from 'express';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('sentry')
  async handleSentry(
    @Body() body: any,
    @Req() req: Request,
    @Headers('sentry-hook-signature') signature: string,
  ) {
    return this.webhookService.handleSentryWebhook(
      body,
      (req as any).rawBody,
      signature,
    );
  }
}
