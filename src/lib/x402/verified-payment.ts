import type { Network, PaymentPayload, PaymentRequirements } from "x402/types";
import type { UseFacilitator } from "./use-facilitator.type.js";
import { X402Error } from "./errors.js";

export { VerifiedPayment };
export type { Settlement };

/**
 * Represents a successful payment settlement.
 * Contains details about the completed transaction, including transaction hash, network, and payer information.
 */
type Settlement = {
  /** Indicates the settlement was successful. Always `true` */
  success: true;
  /** The transaction hash of the completed payment. */
  transaction: string;
  /** The blockchain network on which the transaction occurred. */
  network: Network;
  /** The address of the payer who initiated the payment. */
  payer: string;
};

/**
 * Represents a verified payment that can be settled.
 * This class encapsulates payment payload, selected requirements, and provides methods to settle the payment.
 * It integrates with payment gateways to verify and complete transactions.
 */
class VerifiedPayment {
  readonly payload: PaymentPayload;
  readonly selected: PaymentRequirements;
  readonly requirements: Array<PaymentRequirements>;
  readonly #settleFn: UseFacilitator["settle"];

  #settlement: Settlement | undefined;

  /**
   * Creates an instance of VerifiedPayment.
   * @param payload - The payment payload containing transaction details.
   * @param selected - The selected payment requirements for this transaction.
   * @param requirements - Array of all available payment requirements.
   * @param settleFn - The settlement function provided by the facilitator.
   */
  constructor(
    payload: PaymentPayload,
    selected: PaymentRequirements,
    requirements: Array<PaymentRequirements>,
    settleFn: UseFacilitator["settle"],
  ) {
    this.payload = payload;
    this.selected = selected;
    this.requirements = requirements;
    this.#settleFn = settleFn;
    this.#settlement = undefined;
  }

  /**
   * Settles the verified payment by calling a facilitator.
   * If the payment has already been settled, returns the cached settlement result.
   *
   * @returns Settlement details if successful.
   * @throws {X402Error} If the settlement fails, with details about the failure reason and requirements.
   */
  async settle(): Promise<Settlement> {
    if (this.#settlement) {
      return this.#settlement;
    }
    const settlement = await this.#settleFn(this.payload, this.selected);
    if (settlement.success) {
      return (this.#settlement = {
        success: true,
        transaction: settlement.transaction,
        network: settlement.network,
        payer: settlement.payer!,
      });
    } else {
      throw new X402Error(
        `Settlement failed: ${settlement.errorReason}`,
        this.requirements,
        settlement.payer,
      );
    }
  }
}
