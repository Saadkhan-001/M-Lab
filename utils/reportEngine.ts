import * as Print from 'expo-print';

export const ReportEngine = {
  generatePDF: async (
    labInfo: { name?: string, phone?: string, email?: string, logoUrl?: string },
    patientInfo: { name: string, age: number, gender: string, mrNumber: string },
    testRecord: { testName: string, createdAt?: any, completedAt?: any, results?: Record<string, string> },
    parameters: { name: string, unit: string, range: string }[]
  ) => {

    const logoHtml = labInfo.logoUrl 
      ? `<img src="${labInfo.logoUrl}" style="max-height: 80px;" />` 
      : `<h1 style="color: #0E1A35; margin: 0;">${labInfo.name || 'Clinical Laboratory'}</h1>`;

    const paramRows = parameters.map(p => {
       const resultVal = testRecord.results?.[p.name] || '-';
       return `
         <tr>
           <td style="padding: 12px; border-bottom: 1px solid #E0E0E0;">${p.name}</td>
           <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; font-weight: bold;">${resultVal}</td>
           <td style="padding: 12px; border-bottom: 1px solid #E0E0E0;">${p.unit}</td>
           <td style="padding: 12px; border-bottom: 1px solid #E0E0E0;">${p.range}</td>
         </tr>
       `;
    }).join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0E1A35; padding-bottom: 20px; margin-bottom: 30px; }
            .lab-details { text-align: right; font-size: 14px; color: #666; }
            .patient-box { background: #F8F9FA; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .patient-box div p { margin: 5px 0; font-size: 14px; }
            .patient-box div p strong { color: #0E1A35; display: inline-block; width: 110px; }
            .test-title { text-align: center; font-size: 24px; color: #0E1A35; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; padding: 12px; background-color: #0E1A35; color: white; font-weight: normal; font-size: 14px; }
            td { font-size: 14px; }
            .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; border-top: 1px solid #E0E0E0; padding-top: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>${logoHtml}</div>
            <div class="lab-details">
              <strong>${labInfo.name || 'Clinical Laboratory'}</strong><br/>
              Phone: ${labInfo.phone || 'N/A'}<br/>
              Email: ${labInfo.email || 'N/A'}
            </div>
          </div>

          <div class="patient-box">
            <div>
              <p><strong>Patient Name:</strong> ${patientInfo.name}</p>
              <p><strong>Age / Gender:</strong> ${patientInfo.age} Yrs / ${patientInfo.gender}</p>
            </div>
            <div>
              <p><strong>MR Number:</strong> ${patientInfo.mrNumber || 'N/A'}</p>
              <p><strong>Date:</strong> ${new Date(testRecord.completedAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>

          <h2 class="test-title">${testRecord.testName}</h2>

          <table>
            <thead>
              <tr>
                <th>Investigation</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
              </tr>
            </thead>
            <tbody>
              ${paramRows}
            </tbody>
          </table>

          <div class="footer">
            <p>This is an electronically generated report and does not require a physical signature.</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
  },

  generateReceiptPDF: async (
    labInfo: { name?: string, phone?: string, email?: string, logoUrl?: string },
    patientInfo: { name: string, age?: number, gender?: string, mrNumber?: string, phone?: string },
    invoice: { invoiceNo: string, tests: { name: string, price: number }[], totalAmount: number, discount: number, paid: number, balance: number, createdAt: any },
    currencySymbol: string = 'Rs'
  ) => {

    const logoHtml = labInfo.logoUrl 
      ? `<img src="${labInfo.logoUrl}" style="max-height: 80px;" />` 
      : `<h1 style="color: #0E1A35; margin: 0;">${labInfo.name || 'Clinical Laboratory'}</h1>`;

    const testRows = invoice.tests.map(t => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E0E0E0;">${t.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: right;">${currencySymbol} ${t.price}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0E1A35; padding-bottom: 20px; margin-bottom: 30px; }
            .lab-details { text-align: right; font-size: 14px; color: #666; }
            .patient-box { background: #F8F9FA; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .patient-box p { margin: 5px 0; font-size: 14px; }
            .patient-box strong { color: #0E1A35; display: inline-block; width: 110px; }
            .test-title { text-align: center; font-size: 24px; color: #0E1A35; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; padding: 12px; background-color: #0E1A35; color: white; font-weight: normal; font-size: 14px; }
            th.right, td.right { text-align: right; }
            .totals-box { margin-left: auto; width: 300px; padding: 20px; border: 1px solid #E0E0E0; border-radius: 12px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; }
            .totals-row.bold { font-weight: bold; font-size: 18px; border-top: 1px solid #E0E0E0; padding-top: 12px; margin-top: 12px; }
            .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; border-top: 1px solid #E0E0E0; padding-top: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>${logoHtml}</div>
            <div class="lab-details">
              <strong>${labInfo.name || 'Clinical Laboratory'}</strong><br/>
              Phone: ${labInfo.phone || 'N/A'}<br/>
              Email: ${labInfo.email || 'N/A'}
            </div>
          </div>

          <h2 class="test-title">PAYMENT RECEIPT</h2>

          <div class="patient-box">
            <div>
              <p><strong>Patient Name:</strong> ${patientInfo.name}</p>
              <p><strong>Age / Gender:</strong> ${patientInfo.age || '--'} Yrs / ${patientInfo.gender || '--'}</p>
              <p><strong>Contact:</strong> ${patientInfo.phone || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
              <p><strong>Date:</strong> ${new Date(invoice.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Investigation Summary</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${testRows}
            </tbody>
          </table>

          <div class="totals-box">
            <div class="totals-row"><span>Total Amount:</span><span>${currencySymbol} ${invoice.totalAmount}</span></div>
            <div class="totals-row"><span>Discount:</span><span>${currencySymbol} ${invoice.discount}</span></div>
            <div class="totals-row bold"><span>Gross Amount:</span><span>${currencySymbol} ${invoice.totalAmount - invoice.discount}</span></div>
            <div class="totals-row" style="color: green; margin-top: 8px;"><span>Paid Amount:</span><span>${currencySymbol} ${invoice.paid}</span></div>
            <div class="totals-row" style="color: ${invoice.balance > 0 ? 'red' : 'inherit'}"><span>Balance Due:</span><span>${currencySymbol} ${invoice.balance}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for choosing ${labInfo.name || 'Clinical Laboratory'}. Wishing you the best of health.</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
  }
};
