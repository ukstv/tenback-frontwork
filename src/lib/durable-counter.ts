import { DurableObject } from 'cloudflare:workers';

type DurableCounterContent = { counter: number, balance: string }

export type DurableCounterInstance = {
	counter: number;
	balance: bigint;
	shouldPayout: boolean;
	payoutAmount: bigint;
};

const DURABLE_COUNTER_KEY = 'counter';

export class DurableCounter extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async existing(): Promise<{ counter: number; balance: bigint }> {
		const existing = await this.ctx.storage.get<DurableCounterContent | undefined>(
			DURABLE_COUNTER_KEY
		);

		if (existing) {
			return {
				counter: existing.counter,
				balance: BigInt(existing.balance),
			};
		}

		// initialize
		return {
			counter: 0,
			balance: 0n,
		};
	}

	async increment(amount: bigint, threshold: number = 10): Promise<DurableCounterInstance> {
		const state = await this.existing();

		const newCounter = state.counter + 1;
		const newBalance = state.balance + amount;

		const shouldPayout = newCounter >= threshold;
		const payoutAmount = shouldPayout ? newBalance : 0n;

		if (shouldPayout) {
			// reset for next round
			await this.ctx.storage.put<DurableCounterContent>(DURABLE_COUNTER_KEY, {
				counter: 0,
				balance: '0',
			});

			return {
				counter: newCounter,
				balance: newBalance,
				shouldPayout: true,
				payoutAmount,
			};
		}

		// normal store
		await this.ctx.storage.put<DurableCounterContent>(DURABLE_COUNTER_KEY, {
			counter: newCounter,
			balance: newBalance.toString(),
		});

		return {
			counter: newCounter,
			balance: newBalance,
			shouldPayout: false,
			payoutAmount: 0n,
		};
	}

	async clear() {
		await this.ctx.storage.delete(DURABLE_COUNTER_KEY);
	}
}
