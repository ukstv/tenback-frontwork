import { Hono } from 'hono';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient } from 'viem';
import { DurableCounter } from './lib/durable-counter.js';
import { HonoBindings, withPayment } from './lib/with-payment.js';
import { randomAcceptedMessage, randomWinMessage } from './lib/encourage.js';

export { DurableCounter };

const DURABLE_COUNTER_INSTANCE_NAME = 'instance';

const app = new Hono<HonoBindings>();

// Define the protected route
app.post('/contribute', async (c) => {
	return withPayment('base-sepolia', c, async (paymentContext) => {
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
			const { request } = await publicClient.simulateContract({
				account,
				address: paymentContext.network.price.asset.address,
				abi: paymentContext.network.price.abi,
				functionName: 'transfer',
				args: [paymentContext.payer, increment.payoutAmount],
			});
			const txHash = await walletClient.writeContract(request);
			// TODO Track incoming balance, send some percentage to the foundation address
			return c.json({
				kind: 'win',
				payout: increment.payoutAmount.toString(),
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
