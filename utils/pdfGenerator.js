import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * Generate PDF HTML for Receipt
 */
export const generateReceiptPDF = (receipt, items = []) => {
  const date = receipt.scheduledDate 
    ? new Date(receipt.scheduledDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'N/A';

  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const itemsRows = items.map((item, index) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const total = qty * price;
    return `
    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
      <td style="padding: 12px; text-align: center; color: rgba(255, 255, 255, 0.9);">${index + 1}</td>
      <td style="padding: 12px; color: rgba(255, 255, 255, 0.9);">${item.productName || 'N/A'}</td>
      <td style="padding: 12px; text-align: center; color: rgba(255, 255, 255, 0.7);">${item.productCode || 'N/A'}</td>
      <td style="padding: 12px; text-align: center; color: rgba(255, 255, 255, 0.9);">${qty}</td>
      <td style="padding: 12px; text-align: right; color: rgba(255, 255, 255, 0.9);">₹${price.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right; color: #FF6B9D; font-weight: 600;">₹${total.toFixed(2)}</td>
    </tr>
  `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%);
            color: #FFFFFF;
            padding: 30px;
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #2C243B;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid rgba(255, 107, 157, 0.3);
          }
          .title {
            font-size: 32px;
            font-weight: bold;
            color: #FF6B9D;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .reference {
            font-size: 24px;
            font-weight: bold;
            color: #FFFFFF;
            background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
            padding: 15px 30px;
            border-radius: 12px;
            display: inline-block;
            margin-top: 15px;
            box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
          }
          .info-section {
            margin-bottom: 30px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .info-label {
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .info-value {
            color: #FFFFFF;
            font-size: 16px;
            font-weight: 500;
            text-align: right;
          }
          .products-section {
            margin-top: 40px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #FF6B9D;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(255, 107, 157, 0.3);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: #1A1625;
            border-radius: 12px;
            overflow: hidden;
          }
          thead {
            background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
          }
          th {
            padding: 15px;
            text-align: left;
            color: #FFFFFF;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          th:first-child, td:first-child {
            text-align: center;
          }
          th:last-child, td:last-child {
            text-align: right;
          }
          th:nth-child(4), td:nth-child(4) {
            text-align: center;
          }
          th:nth-child(5), td:nth-child(5) {
            text-align: right;
          }
          tbody tr:hover {
            background: rgba(255, 107, 157, 0.1);
          }
          .total-row {
            background: rgba(255, 107, 157, 0.2);
            font-weight: bold;
          }
          .total-row td {
            padding: 20px 12px;
            font-size: 18px;
            color: #FF6B9D;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .status-draft {
            background: rgba(158, 158, 158, 0.3);
            color: #9E9E9E;
          }
          .status-ready {
            background: rgba(255, 193, 7, 0.3);
            color: #FFC107;
          }
          .status-done {
            background: rgba(76, 175, 80, 0.3);
            color: #4CAF50;
          }
          .notes-section {
            margin-top: 30px;
            padding: 20px;
            background: #1A1625;
            border-radius: 12px;
            border-left: 4px solid #FF6B9D;
          }
          .notes-label {
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .notes-text {
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">Receipt</div>
            <div class="reference">${receipt.reference || 'N/A'}</div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Date</span>
              <span class="info-value">${date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Receive From</span>
              <span class="info-value">${receipt.receiveFrom || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Responsible</span>
              <span class="info-value">${receipt.responsible || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">To Location</span>
              <span class="info-value">${receipt.toLocation || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Contact</span>
              <span class="info-value">${receipt.contact || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="info-value">
                <span class="status-badge status-${receipt.status || 'draft'}">${(receipt.status || 'draft').toUpperCase()}</span>
              </span>
            </div>
          </div>

          <div class="products-section">
            <div class="section-title">Products</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
                <tr class="total-row">
                  <td colspan="5" style="text-align: right; padding-right: 12px;">Total Amount:</td>
                  <td>₹${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${receipt.notes ? `
            <div class="notes-section">
              <div class="notes-label">Additional Notes</div>
              <div class="notes-text">${receipt.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
};

/**
 * Generate PDF HTML for Delivery
 */
export const generateDeliveryPDF = (delivery, items = []) => {
  const date = delivery.scheduledDate 
    ? new Date(delivery.scheduledDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'N/A';

  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const itemsRows = items.map((item, index) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const total = qty * price;
    return `
    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
      <td style="padding: 12px; text-align: center; color: rgba(255, 255, 255, 0.9);">${index + 1}</td>
      <td style="padding: 12px; color: rgba(255, 255, 255, 0.9);">${item.productName || 'N/A'}</td>
      <td style="padding: 12px; text-align: center; color: rgba(255, 255, 255, 0.7);">${item.productCode || 'N/A'}</td>
      <td style="padding: 12px; text-align: center; color: rgba(255, 255, 255, 0.9);">${qty}</td>
      <td style="padding: 12px; text-align: right; color: rgba(255, 255, 255, 0.9);">₹${price.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right; color: #FF6B9D; font-weight: 600;">₹${total.toFixed(2)}</td>
    </tr>
  `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%);
            color: #FFFFFF;
            padding: 30px;
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #2C243B;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid rgba(255, 107, 157, 0.3);
          }
          .title {
            font-size: 32px;
            font-weight: bold;
            color: #FF6B9D;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .reference {
            font-size: 24px;
            font-weight: bold;
            color: #FFFFFF;
            background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
            padding: 15px 30px;
            border-radius: 12px;
            display: inline-block;
            margin-top: 15px;
            box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
          }
          .info-section {
            margin-bottom: 30px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .info-label {
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .info-value {
            color: #FFFFFF;
            font-size: 16px;
            font-weight: 500;
            text-align: right;
          }
          .products-section {
            margin-top: 40px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #FF6B9D;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(255, 107, 157, 0.3);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: #1A1625;
            border-radius: 12px;
            overflow: hidden;
          }
          thead {
            background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
          }
          th {
            padding: 15px;
            text-align: left;
            color: #FFFFFF;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          th:first-child, td:first-child {
            text-align: center;
          }
          th:last-child, td:last-child {
            text-align: right;
          }
          th:nth-child(4), td:nth-child(4) {
            text-align: center;
          }
          th:nth-child(5), td:nth-child(5) {
            text-align: right;
          }
          tbody tr:hover {
            background: rgba(255, 107, 157, 0.1);
          }
          .total-row {
            background: rgba(255, 107, 157, 0.2);
            font-weight: bold;
          }
          .total-row td {
            padding: 20px 12px;
            font-size: 18px;
            color: #FF6B9D;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .status-draft {
            background: rgba(158, 158, 158, 0.3);
            color: #9E9E9E;
          }
          .status-waiting {
            background: rgba(255, 152, 0, 0.3);
            color: #FF9800;
          }
          .status-ready {
            background: rgba(255, 193, 7, 0.3);
            color: #FFC107;
          }
          .status-done {
            background: rgba(76, 175, 80, 0.3);
            color: #4CAF50;
          }
          .notes-section {
            margin-top: 30px;
            padding: 20px;
            background: #1A1625;
            border-radius: 12px;
            border-left: 4px solid #FF6B9D;
          }
          .notes-label {
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .notes-text {
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">Delivery Order</div>
            <div class="reference">${delivery.reference || 'N/A'}</div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Date</span>
              <span class="info-value">${date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Delivery Address</span>
              <span class="info-value">${delivery.deliveryAddress || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Responsible</span>
              <span class="info-value">${delivery.responsible || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">From Location</span>
              <span class="info-value">${delivery.fromLocation || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">To Location</span>
              <span class="info-value">${delivery.toLocation || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Contact</span>
              <span class="info-value">${delivery.contact || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Operation Type</span>
              <span class="info-value">${delivery.operationType || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="info-value">
                <span class="status-badge status-${delivery.status || 'draft'}">${(delivery.status || 'draft').toUpperCase()}</span>
              </span>
            </div>
          </div>

          <div class="products-section">
            <div class="section-title">Products</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
                <tr class="total-row">
                  <td colspan="5" style="text-align: right; padding-right: 12px;">Total Amount:</td>
                  <td>₹${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${delivery.notes ? `
            <div class="notes-section">
              <div class="notes-label">Additional Notes</div>
              <div class="notes-text">${delivery.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
};

/**
 * Generate and save PDF
 */
export const generateAndSavePDF = async (html, filename) => {
  try {
    // Generate PDF
    // printToFileAsync already saves the file and returns a URI
    const options = {
      html: html,
      base64: false,
    };
    
    const { uri } = await Print.printToFileAsync(options);
    
    // The URI is already a valid file path that can be used for printing/sharing
    // We don't need to move or copy it - just return the URI
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Share PDF
 */
export const sharePDF = async (uri) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri);
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};

/**
 * Print PDF
 */
export const printPDF = async (uri) => {
  try {
    await Print.printAsync({ uri });
  } catch (error) {
    console.error('Error printing PDF:', error);
    throw error;
  }
};

