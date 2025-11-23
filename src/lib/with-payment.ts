import { DurableCounter } from './durable-counter.js';
import { Context } from 'hono';
import { Promising } from './x402/promising.type.js';
import { PaymentMiddleware } from './x402/payment-middleware.js';
import { HonoStrategy } from './x402/hono-strategy.js';
import { X402Error } from './x402/errors.js';
import { ERC20_ABI } from './erc20.abi.js';
import { base, baseSepoliaPreconf } from 'viem/chains';
import { http } from 'viem';
import type { FacilitatorConfig } from 'x402/types';

type Bindings = {
	DURABLE_COUNTER: DurableObjectNamespace<DurableCounter>;
};

type Env = {
	EVM_PRIVATE_KEY: `0x${string}`;
	CDP_API_KEY_ID: string;
	CDP_API_KEY_SECRET: string;
};

export type HonoBindings = { Bindings: Bindings & Env };

export const THRESHOLD = 10;

export const NETWORK_PARAMS = {
	'base-sepolia': {
		facilitator: (a?: string, b?: string): FacilitatorConfig => {
			return {
				url: 'https://x402.org/facilitator',
			};
		},
		price: {
			amount: '1000000',
			asset: { address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, decimals: 6, eip712: { name: 'USDC', version: '2' } },
			abi: ERC20_ABI,
		},
		threshold: THRESHOLD,
		payTo: '0xad9d77FB3FB3f5d18B5937b530d698C04133B0c2',
		chain: baseSepoliaPreconf,
		chainTransport: http("https://rpc.ankr.com/base_sepolia/f232740bceed74a79687a13df99b79482ef87a8ff15f4a30e8ffa65e0d5e044a"),
	},
	base: {
		facilitator: (a?: string, b?: string): FacilitatorConfig => {
			// Sorry, 500 Internal Server Error is painful
			return  {
				url: "http://facilitator.fareside.com/"
			}
		},
		price: {
			amount: '1000000',
			asset: { address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, decimals: 6, eip712: { name: 'USD Coin', version: '2' } },
			abi: ERC20_ABI,
		},
		threshold: THRESHOLD,
		payTo: '0xad9d77FB3FB3f5d18B5937b530d698C04133B0c2',
		chain: base,
		chainTransport: http("https://rpc.ankr.com/base/f232740bceed74a79687a13df99b79482ef87a8ff15f4a30e8ffa65e0d5e044a"),
	},
} as const;

export type SupportedNetwork = 'base';

export type WithPaymentContext = {
	payer: `0x${string}`;
	amountReceived: bigint;
	txHash: string;
	network: (typeof NETWORK_PARAMS)[keyof typeof NETWORK_PARAMS];
};

export async function withPayment(
	context: Context<HonoBindings>,
	f: (context: WithPaymentContext) => Promising<Response>,
): Promise<Response> {
	const facilitator = {
		base: NETWORK_PARAMS.base.facilitator(context.env.CDP_API_KEY_ID, context.env.CDP_API_KEY_SECRET),
		// "base-sepolia": { url: "https://x402.org/facilitator" },
	} satisfies Record<SupportedNetwork, FacilitatorConfig>;
	const x402Middleware = new PaymentMiddleware({
		strategy: HonoStrategy,
		facilitator,
		config: {
			description:
				'Push the pot and chase the glory! Every call powers the cycle, and the 10th player scoops the stash. Entry: 1 USDC. 🎮🔥',
		},
	});
	const incoming = x402Middleware.incoming(context);
	try {
		const verified = await incoming.verify([
			{
				network: 'base',
				payTo: NETWORK_PARAMS['base'].payTo,
				...NETWORK_PARAMS['base'].price,
			},
		]);
		if (!('authorization' in verified.payload.payload)) {
			throw new Error(`Only EVM supported`);
		}
		const network = verified.payload.network;
		const settlement = await verified.settle();
		return await f({
			amountReceived: BigInt(verified.payload.payload.authorization.value),
			payer: settlement.payer as `0x${string}`,
			txHash: settlement.transaction,
			// @ts-ignore
			network: NETWORK_PARAMS[network],
		});
	} catch (e) {
		if (e instanceof X402Error) {
			return new Response(JSON.stringify(e), {
				status: 402,
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			// Re-throw all other errors for standard error handling
			throw e;
		}
	}
}
