/**
 * Live Backend Email Service
 * In a production environment, this would be a Node.js/Express endpoint
 * integrating with SendGrid, AWS SES, or Mailgun.
 */
export const emailService = {
  sendAlert: async (to: string, subject: string, body: string) => {
    console.log(`[BACKEND SKILL: EMAIL] Initiating send to ${to}...`);
    console.log(`[BACKEND SKILL: EMAIL] Subject: ${subject}`);
    console.log(`[BACKEND SKILL: EMAIL] Body: ${body}`);
    
    // Network delay for backend processing
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[BACKEND SKILL: EMAIL] ✓ Successfully delivered to ${to}`);
        resolve({ 
          success: true, 
          message: 'Email dispatched successfully',
          timestamp: new Date().toISOString()
        });
      }, 1200);
    });
  }
};
