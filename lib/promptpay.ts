import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

/**
 * Generates a PromptPay QR with the amount baked in (EMVCo dynamic QR),
 * so the student physically cannot transfer the wrong amount.
 */
export async function generatePromptPayQR(promptpayId: string, amount: number) {
  const payload = generatePayload(promptpayId, { amount });
  const dataUrl = await QRCode.toDataURL(payload);
  return dataUrl; // <img src={dataUrl} />
}
