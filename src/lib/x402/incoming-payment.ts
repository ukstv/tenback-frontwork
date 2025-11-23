import type { PaymentPayload, PaymentRequirements } from "x402/types";
import type { PriceTag } from "./price-tag.js";
import type { UseFacilitator } from "./use-facilitator.type.js";
import type { Settlement } from "./verified-payment.js";
import { findMatchingPaymentRequirements } from "x402/shared";
import { VerifiedPayment } from "./verified-payment.js";
import { X402Error } from "./errors.js";

export type { PaymentRequirementsBuilderFn };
export { IncomingPayment };

/**
 * A function that returns the payment requirements for the given price tags.
 *
 * @param priceTags - The price tags to get the payment requirements for.
 * @returns The payment requirements for the given price tags.
 */
type PaymentRequirementsBuilderFn = (
  priceTags: Array<PriceTag>,
) => Array<PaymentRequirements>;

/**
 * Represents an incoming payment, responsible for validating and settling the
 * payment.
 */
class IncomingPayment {
  readonly #payload: PaymentPayload | undefined;

  readonly #paymentRequirementsBuilder: PaymentRequirementsBuilderFn;
  readonly #settleFn: UseFacilitator["settle"];
  readonly #verifyFn: UseFacilitator["verify"];

  #verifiedPayment: VerifiedPayment | undefined;

  /**
   * @param payload - The decoded payment payload sent by the client.
   * @param facilitator - The facilitator functions to use for verifying and settling the
   * payment.
   * @param paymentRequirementsBuilder - A function that returns the payment
   * requirements for the given price tags.
   */
  constructor(
    payload: PaymentPayload | undefined,
    facilitator: UseFacilitator,
    paymentRequirementsBuilder: (
      priceTags: Array<PriceTag>,
    ) => Array<PaymentRequirements>,
  ) {
    this.#payload = payload;
    this.#paymentRequirementsBuilder = paymentRequirementsBuilder;
    this.#settleFn = facilitator.settle;
    this.#verifyFn = facilitator.verify;
    this.#verifiedPayment = undefined;
  }

  /**
   * @returns The verified payment if the payment has been successfully
   * verified, otherwise `undefined`.
   */
  get verified(): VerifiedPayment | undefined {
    return this.#verifiedPayment;
  }

  /**
   * Verifies the payment against the given price tags.
   *
   * @param priceTags - The price tags to verify the payment against.
   * @returns The verified payment if the payment is valid, otherwise it throws
   * an error.
   * @throws {X402Error} - If the payment is invalid.
   */
  async verify(
    priceTags: Array<PriceTag>,
  ): Promise<VerifiedPayment> {
    const paymentRequirements = this.#paymentRequirementsBuilder(priceTags);
		console.log('p.0', paymentRequirements);
    if (!this.#payload) {
      // TODO Paywall?
      throw new X402Error("X-PAYMENT header is required", paymentRequirements);
    }
    const selected = findMatchingPaymentRequirements(
      paymentRequirements,
      this.#payload,
    );
    if (!selected) {
      throw new X402Error(
        "Unable to find matching payment requirements",
        paymentRequirements,
      );
    }
    const verification = await this.#verifyFn(this.#payload, selected);
    if (!verification.isValid) {
      throw new X402Error(
        verification.invalidReason ?? "Payment verification failed",
        paymentRequirements,
        verification.payer,
      );
    }
    return (this.#verifiedPayment = new VerifiedPayment(
      this.#payload,
      selected,
      paymentRequirements,
      this.#settleFn,
    ));
  }

  /**
   * Settles the payment.
   *
   * @returns The settlement information if the payment has been settled,
   * otherwise `undefined`.
   */
  async settle(): Promise<Settlement | undefined> {
    return this.#verifiedPayment?.settle();
  }
}
