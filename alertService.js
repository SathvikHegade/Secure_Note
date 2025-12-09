let nodemailer;
try {
  nodemailer = require('nodemailer');
  console.log('✓ Nodemailer module loaded, version:', nodemailer.version || 'unknown');
} catch (err) {
  console.error('✗ Failed to load nodemailer:', err.message);
}

// Configure email transporter
let transporter = null;

function initEmailService() {
  if (!nodemailer) {
    console.log('⚠ Email alerts disabled - nodemailer not available');
    return;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠ Email alerts disabled - SMTP configuration missing');
    return;
  }

  try {
    console.log('Creating email transporter with:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || '587',
      user: process.env.SMTP_USER
    });
    
    // Check if createTransport exists
    if (typeof nodemailer.createTransport !== 'function') {
      console.error('✗ nodemailer.createTransport is not a function. Module contents:', Object.keys(nodemailer));
      return;
    }
    
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
    
    // Verify connection
    transporter.verify(function(error, success) {
      if (error) {
        console.error('✗ SMTP connection verification failed:', error.message);
        console.error('  Please check your SMTP credentials and settings');
      } else {
        console.log('✓ SMTP server is ready to send emails');
      }
    });
    
    console.log('✓ Email alert service initialized');
  } catch (error) {
    console.error('Email service initialization error:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Send security alert email
async function sendSecurityAlert(email, padId, eventType, details) {
  if (!transporter || !email) return;

  const eventMessages = {
    'note_accessed': {
      subject: '🔓 Your SecureNote was accessed',
      emoji: '👁️',
      title: 'Note Access Alert',
      message: 'Someone successfully accessed your note.'
    },
    'login_failed': {
      subject: '⚠️ Failed login attempt on your SecureNote',
      emoji: '🚫',
      title: 'Failed Login Attempt',
      message: 'Someone tried to access your note with an incorrect password.'
    },
    'brute_force': {
      subject: '🚨 SECURITY ALERT: Multiple failed login attempts',
      emoji: '⛔',
      title: 'Brute Force Attack Detected',
      message: 'Multiple failed password attempts detected from the same IP address.'
    },
    'file_uploaded': {
      subject: '📤 File uploaded to your SecureNote',
      emoji: '📎',
      title: 'File Upload',
      message: 'A file was uploaded to your note.'
    },
    'file_downloaded': {
      subject: '📥 File downloaded from your SecureNote',
      emoji: '⬇️',
      title: 'File Download',
      message: 'A file was downloaded from your note.'
    },
    'file_deleted': {
      subject: '🗑️ File deleted from your SecureNote',
      emoji: '🗑️',
      title: 'File Deletion',
      message: 'A file was deleted from your note.'
    }
  };

  const event = eventMessages[eventType] || {
    subject: '🔔 SecureNote Activity Alert',
    emoji: '🔔',
    title: 'Activity Alert',
    message: 'Activity detected on your note.'
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .emoji { font-size: 48px; margin-bottom: 10px; }
    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .details p { margin: 8px 0; font-size: 14px; color: #495057; }
    .details strong { color: #212529; }
    .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emoji">${event.emoji}</div>
      <h1>${event.title}</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #333;">${event.message}</p>
      
      <div class="alert-box">
        <strong>Note ID:</strong> ${padId}
      </div>
      
      <div class="details">
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        ${details.ip ? `<p><strong>IP Address:</strong> ${details.ip}</p>` : ''}
        ${details.userAgent ? `<p><strong>Browser:</strong> ${details.userAgent.substring(0, 100)}...</p>` : ''}
        ${details.fileName ? `<p><strong>File:</strong> ${details.fileName}</p>` : ''}
        ${details.attemptCount ? `<p><strong>Failed Attempts:</strong> ${details.attemptCount}</p>` : ''}
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 20px;">
        ${eventType === 'brute_force' ? 
          '⚠️ <strong>Action Recommended:</strong> If this wasn\'t you, consider changing your password immediately.' :
          'If this wasn\'t you, please verify your note\'s security.'
        }
      </p>
      
      <a href="${process.env.APP_URL || 'https://secure-pad-pro-15.onrender.com'}/pad/${padId}" class="btn">View Your Note</a>
    </div>
    
    <div class="footer">
      <p>This is an automated security alert from SecureNote</p>
      <p>You received this because you enabled alerts for note: ${padId}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"SecureNote Alerts" <${process.env.SMTP_USER}>`,
      to: email,
      subject: event.subject,
      html: htmlContent
    });
    console.log(`✓ Alert email sent to ${email} for ${eventType}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error.message);
    return false;
  }
}

module.exports = { initEmailService, sendSecurityAlert };
