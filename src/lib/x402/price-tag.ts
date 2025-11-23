import type { ERC20TokenAmount, Network, PaymentRequirements, Resource, SPLTokenAmount } from 'x402/types';
import { processPriceToAtomicAmount } from 'x402/shared';
import { X402ConfigurationError } from './errors.js';

export type { ERC20PriceTag, SPLPriceTag, MoneyPriceTag, PriceTag, PriceTagRequirementsBase };
export { priceTagsToRequirements };

/**
 * Represents a price tag for ERC20 token payments.
 * Includes the token amount details along with network and payment recipient.
 */
type ERC20PriceTag = ERC20TokenAmount & {
	network: Network;
	payTo: string;
};

/**
 * Represents a price tag for SPL token payments.
 * Includes the token amount details along with network and payment recipient.
 */
type SPLPriceTag = SPLTokenAmount & {
	network: Network;
	payTo: string;
};

/**
 * Represents a price tag for fiat money payments that get converted to USDC amounts.
 * The amount is specified as a string (e.g., '$0.002' or '100'), along with network and payment recipient.
 */
type MoneyPriceTag = {
	network: Network;
	payTo: string;
	amount: string;
};

/**
 * Union type representing any supported price tag format.
 * Can be an ERC20, SPL, or fiat money price tag.
 */
type PriceTag = ERC20PriceTag | SPLPriceTag | MoneyPriceTag;

/**
 * Base requirements for a price tag, which can be extended with `resource`,
 * `network`,`maxAmountRequired`, etc. to form a complete `PaymentRequirements`.
 */
type PriceTagRequirementsBase = Pick<PaymentRequirements, 'scheme' | 'description' | 'mimeType' | 'maxTimeoutSeconds' | 'outputSchema'>;

/**
 * Converts an array of price tags into an array of payment requirements.
 *
 * @param base - The base requirements to apply to all payment requirements.
 * @param resource - The resource being paid for.
 * @param priceTags - An array of price tags to convert.
 * @param processPriceToAtomicAmountFn - Optional function to process price tags into atomic amounts. Defaults to `processPriceToAtomicAmount`.
 * @returns An array of payment requirements.
 * @throws {X402ConfigurationError} If `priceTag.amount` cannot be converted to an atomic amount.
 */
function priceTagsToRequirements(
	base: PriceTagRequirementsBase,
	resource: Resource,
	priceTags: Array<PriceTag>,
	processPriceToAtomicAmountFn: typeof processPriceToAtomicAmount = processPriceToAtomicAmount,
): Array<PaymentRequirements> {
	const paymentRequirements: Array<PaymentRequirements> = [];
	for (const priceTag of priceTags) {
		if ('asset' in priceTag) {
			const paymentReq: PaymentRequirements = Object.assign({}, base, {
				network: priceTag.network,
				maxAmountRequired: priceTag.amount,
				payTo: priceTag.payTo,
				asset: priceTag.asset.address,
				resource: resource,
				// @ts-ignore
				extra: priceTag.asset.eip712,
			});
			paymentRequirements.push(paymentReq);
		} else {
			const atomicAmountForAsset = processPriceToAtomicAmountFn(priceTag.amount, priceTag.network);
			if ('error' in atomicAmountForAsset) {
				throw new X402ConfigurationError(atomicAmountForAsset.error);
			}
			const extra = 'eip712' in atomicAmountForAsset.asset ? atomicAmountForAsset.asset.eip712 : undefined;
			const paymentReq: PaymentRequirements = Object.assign({}, base, {
				network: priceTag.network,
				maxAmountRequired: atomicAmountForAsset.maxAmountRequired,
				payTo: priceTag.payTo,
				asset: atomicAmountForAsset.asset.address,
				resource: resource,
				extra,
			});
			paymentRequirements.push(paymentReq);
		}
	}
	return paymentRequirements;
}
