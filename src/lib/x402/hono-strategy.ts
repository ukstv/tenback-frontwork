import { RequestToPaymentStrategy } from './request-to-payment-strategy.type.js';
import { Context } from 'hono';
import { PaymentPayload, Resource } from 'x402/types';
import { exact } from 'x402/schemes';

export const HonoStrategy = Object.freeze({
	canRenderPaywall(ctx: Context): boolean {
		return Boolean(ctx.req.header('Accept')?.includes('text/html') && ctx.req.header('User-Agent')?.includes('Mozilla'));
	},
	paymentPayload(ctx: Context): PaymentPayload | undefined {
		const paymentHeader = ctx.req.header('X-Payment');
		if (!paymentHeader) {
			return undefined;
		}
		return exact.evm.decodePayment(paymentHeader);
	},
	resource(ctx: Context): Resource {
		const url = new URL(ctx.req.url);
		return `${url.protocol}//${url.host}${url.pathname}` as Resource;
	},
}) satisfies RequestToPaymentStrategy<Context>;
