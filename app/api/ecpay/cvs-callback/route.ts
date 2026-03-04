import { NextResponse } from 'next/server';

/**
 * ECPay CVS Map Callback
 * Receives the store information from ECPay as a POST request.
 * We must respond with a small HTML page that uses postMessage 
 * to send the data back to the original application window.
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const storeInfo = {
            store_id: formData.get('CVSStoreID'),
            store_name: formData.get('CVSStoreName'),
            store_address: formData.get('CVSAddress'),
            store_phone: formData.get('CVSTelephone'),
            extra_data: formData.get('ExtraData'),
        };

        console.log('ECPay CVS Callback received:', storeInfo);

        // Render a small HTML to send the message and close the tab
        const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'ECPAY_CVS_STORE_SELECTED',
                payload: ${JSON.stringify(storeInfo)}
              }, window.location.origin);
              window.close();
            } else {
              alert('Store selected: ' + ${JSON.stringify(storeInfo.store_name)});
              window.close();
            }
          </script>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
            <p>Store selected successfully! Closing window...</p>
          </div>
        </body>
      </html>
    `;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    } catch (error) {
        console.error('Error in ECPay callback:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
