import { DurableCounter } from './durable-counter.js';
import { Context } from 'hono';
import { Promising } from './x402/promising.type.js';
import { PaymentMiddleware } from './x402/payment-middleware.js';
import { HonoStrategy } from './x402/hono-strategy.js';
import { X402Error } from './x402/errors.js';
import { ERC20_ABI } from './erc20.abi.js';
import { baseSepoliaPreconf } from 'viem/chains';
import { http } from 'viem';

type Bindings = {
	DURABLE_COUNTER: DurableObjectNamespace<DurableCounter>;
};

type Env = {
	EVM_PRIVATE_KEY: `0x${string}`;
};

export type HonoBindings = { Bindings: Bindings & Env };

export const NETWORK_PARAMS = {
	'base-sepolia': {
		facilitator: 'https://x402.org/facilitator',
		price: {
			amount: '1',
			asset: { address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, decimals: 6, eip712: { name: 'USDC', version: '2' } },
			abi: ERC20_ABI,
		},
		threshold: 3,
		payTo: '0xad9d77FB3FB3f5d18B5937b530d698C04133B0c2',
		chain: baseSepoliaPreconf,
		chainTransport: http('https://rpc.ankr.com/base_sepolia/560b517b4937af61a4cc7ced03397ff7502ce30ca0e668e33d622228e3585a10'),
	},
} as const;

export type WithPaymentContext = {
	payer: `0x${string}`;
	amountReceived: bigint;
	txHash: string;
	network: (typeof NETWORK_PARAMS)[keyof typeof NETWORK_PARAMS];
};

export async function withPayment(
	networkName: keyof typeof NETWORK_PARAMS,
	context: Context<HonoBindings>,
	f: (context: WithPaymentContext) => Promising<Response>,
): Promise<Response> {
	const network = NETWORK_PARAMS[networkName];
	const facilitator = {
		url: network.facilitator,
	} as const;
	const x402Middleware = new PaymentMiddleware({
		strategy: HonoStrategy,
		facilitator: facilitator,
	});
	const incoming = x402Middleware.incoming(context);
	try {
		const verified = await incoming.verify([
			{
				network: networkName,
				payTo: network.payTo,
				...network.price,
			},
		]);
		if (!('authorization' in verified.payload.payload)) {
			throw new Error(`Only EVM supported`);
		}
		const settlement = await verified.settle();
		return await f({
			amountReceived: BigInt(verified.payload.payload.authorization.value),
			payer: settlement.payer as `0x${string}`,
			txHash: settlement.transaction,
			network,
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
