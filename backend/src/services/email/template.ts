interface OtpEmailInput {
  code: string;
  purpose: 'signup' | 'reset';
}

export function otpEmail({ code, purpose }: OtpEmailInput): { subject: string; html: string; text: string } {
  const isReset = purpose === 'reset';
  const heading = isReset ? 'Reclaim your access' : 'Open the gate';
  const intro = isReset
    ? 'Someone (hopefully you) asked to reset the password for your ChallengeX account.'
    : 'Use this code to verify your email and enter ChallengeX.';
  const subject = isReset ? 'Your password reset code' : 'Your verification code';
  const text = [
    heading,
    '',
    intro,
    '',
    `Your code: ${code}`,
    'It expires in 10 minutes and works once.',
    '',
    "If you didn't request this, you can ignore this email.",
  ].join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0b0710;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0710;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#150d1f;border:1px solid #f5c451;border-radius:14px;">
<tr><td style="padding:32px 28px 8px;text-align:center;font-family:Georgia,'Times New Roman',serif;color:#f5c451;font-size:13px;letter-spacing:4px;text-transform:uppercase;">ChallengeX</td></tr>
<tr><td style="padding:8px 28px 0;text-align:center;font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:26px;font-weight:bold;">${heading}</td></tr>
<tr><td style="padding:16px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#e9e0f5;font-size:15px;line-height:1.6;">${intro}</td></tr>
<tr><td align="center" style="padding:24px 28px;">
<div style="display:inline-block;background:#000000;border:2px solid #f5c451;border-radius:10px;padding:16px 28px;font-family:'Courier New',monospace;color:#ffd978;font-size:36px;font-weight:bold;letter-spacing:10px;">${code}</div>
</td></tr>
<tr><td style="padding:0 28px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:14px;">This code expires in <strong>10 minutes</strong> and can be used once.</td></tr>
<tr><td style="padding:16px 28px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#b8aacb;font-size:12px;line-height:1.5;">If you didn't request this, you can safely ignore this email.</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject, html, text };
}
