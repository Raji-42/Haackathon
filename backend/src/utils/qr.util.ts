import QRCode from 'qrcode';

export class QRUtil {
  /**
   * Generates a Data URL QR code for a given verification URL or certificate payload.
   */
  public static async generateDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250,
      color: {
        dark: '#0f172a', // Deep slate navy
        light: '#ffffff',
      },
    });
  }

  /**
   * Generates a PNG Buffer QR code for embedding in PDF.
   */
  public static async generateBuffer(payload: string): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }
}
