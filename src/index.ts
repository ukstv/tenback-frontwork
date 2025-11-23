import { Hono } from 'hono';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient } from 'viem';
import { DurableCounter } from './lib/durable-counter.js';
import { HonoBindings, THRESHOLD, withPayment } from './lib/with-payment.js';
import { randomAcceptedMessage, randomWinMessage } from './lib/encourage.js';
import { cors } from 'hono/cors';
import { Buffer } from 'node:buffer';

// @ts-expect-error
globalThis.Buffer = Buffer;

export { DurableCounter };

const DURABLE_COUNTER_INSTANCE_NAME = 'base';

const app = new Hono<HonoBindings>();

app.use(cors());

app.get('/status', async (c) => {
	const durableCounter = c.env.DURABLE_COUNTER.getByName(DURABLE_COUNTER_INSTANCE_NAME);
	const status = await durableCounter.status(THRESHOLD);
	return c.json({
		counter: status.counter, // number
		balance: status.balance.toString(), // bigint as string
		stepsRemaining: status.stepsRemaining, // number
		threshold: THRESHOLD, // number
	});
});

// Define the protected route
app.post('/contribute', async (c) => {
	return withPayment(c, async (paymentContext) => {
		const durableCounter = c.env.DURABLE_COUNTER.getByName(DURABLE_COUNTER_INSTANCE_NAME);
		const increment = await durableCounter.increment(paymentContext.amountReceived, paymentContext.network.threshold);

		if (increment.shouldPayout) {
			const account = privateKeyToAccount(c.env.EVM_PRIVATE_KEY);
			const publicClient = createPublicClient({
				chain: paymentContext.network.chain,
				transport: paymentContext.network.chainTransport,
			});
			const walletClient = createWalletClient({
				account,
				chain: paymentContext.network.chain,
				transport: paymentContext.network.chainTransport,
			});
			const payoutAmount = (increment.payoutAmount * 100n) / 98n;
			const { request } = await publicClient.simulateContract({
				account,
				address: paymentContext.network.price.asset.address,
				abi: paymentContext.network.price.abi,
				functionName: 'transfer',
				args: [paymentContext.payer, payoutAmount],
			});
			const txHash = await walletClient.writeContract(request);
			return c.json({
				kind: 'win',
				payout: payoutAmount.toString(),
				txHash: txHash,
				message: randomWinMessage(),
			});
		}
		return c.json({
			kind: 'accepted',
			currentPot: increment.balance.toString(),
			counter: increment.counter,
			stepsRemaining: paymentContext.network.threshold - increment.counter,
			message: randomAcceptedMessage(),
		});
	});
});

export default app;
