import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

// Parse .env manually to avoid dependency issues
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const parts = line.trim().split('=');
    if (parts.length >= 2 && !parts[0].startsWith('#')) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  }
}

async function runTest() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const to = process.env.OWNER_EMAIL || 'pandeyanuj278@gmail.com';
  const from = process.env.EMAIL_FROM || '"SHREE ASSOCIATES" <alerts@shreeassociates.com>';

  console.log('--- SMTP Diagnostic Test ---');
  console.log(`SMTP Host: ${host}`);
  console.log(`SMTP Port: ${port}`);
  console.log(`SMTP User: ${user}`);
  console.log(`SMTP Pass: ${pass ? '****' + pass.substring(Math.max(0, pass.length - 4)) : 'NOT CONFIGURED'}`);
  console.log(`From Address: ${from}`);
  console.log(`To (Recipient) Address: ${to}`);
  console.log('----------------------------');

  if (!host || !user || !pass) {
    console.error('ERROR: Missing SMTP_HOST, SMTP_USER, or SMTP_PASSWORD in backend/.env file!');
    process.exit(1);
  }

  // Create transporter with debug options
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    logger: true, // Log SMTP traffic to console
    debug: true,  // Include SMTP traffic in logs
  });

  console.log('Attempting to verify SMTP connection...');
  try {
    const verified = await transporter.verify();
    console.log('✅ SMTP Connection verified successfully!');
  } catch (err: any) {
    console.error('❌ SMTP Connection verification failed:', err.message);
    console.error(err);
  }

  console.log('\nAttempting to send diagnostic test email...');
  try {
    const info = await transporter.sendMail({
      from: user, // Use SMTP_USER directly to avoid spoofing rejections by Gmail
      to,
      subject: '[SHREE ASSOCIATES] Direct SMTP Test Alert',
      html: `
        <h2>Shree Associates Alert Diagnostic Test</h2>
        <p>This is a test alert sent from the command-line diagnostic script.</p>
        <p>If you received this email, your SMTP configuration is correct and emails are active!</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN')}</p>
      `,
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Envelope:', info.envelope);
  } catch (err: any) {
    console.error('❌ Failed to send email:', err.message);
    console.error(err);
  }
}

runTest();
