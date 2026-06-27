import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email notifications for new briefs
  app.post("/api/notify-lead", async (req, res) => {
    const { lead, targetEmail, businessName } = req.body;
    if (!lead) {
      return res.status(400).json({ error: "Lead data is required" });
    }

    const recipient = targetEmail || process.env.SMTP_FROM || "admin@example.com";
    const sender = process.env.SMTP_FROM || `"Event CRM" <noreply@example.com>`;

    const subject = `✨ New Client Brief Submission: ${lead.clientName}`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1c1917; background-color: #fcfbfb; border: 1px solid #e7e5e4; border-radius: 24px;">
        <div style="margin-bottom: 32px; border-bottom: 1px solid #f5f5f4; padding-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 700; color: #1c1917; margin: 0 0 8px 0; font-family: Georgia, serif;">New Client Brief Submission</h2>
          <p style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c; margin: 0;">Inquiry Details for ${businessName}</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 24px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c; width: 35%;">Client Name</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;">${lead.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Email</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;"><a href="mailto:${lead.email}" style="color: #78716c; text-decoration: underline;">${lead.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Phone</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;"><a href="tel:${lead.phone}" style="color: #1c1917; text-decoration: none;">${lead.phone}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Event Date</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;">${lead.eventDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Guest Count</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;">${lead.guestCount} guests</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Budget Range</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #b45309;">GHc ${lead.budgetRange}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Event Vibe</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;">${Array.isArray(lead.eventVibe) ? lead.eventVibe.join(", ") : lead.eventVibe}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Services</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;">${Array.isArray(lead.servicesInterested) ? lead.servicesInterested.join(", ") : lead.servicesInterested || "None specified"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Venue Status</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;">${lead.venueStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Decision Maker</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;">${lead.isDecisionMaker ? "Yes" : "No"}</td>
            </tr>
            ${lead.inspirationLink ? `
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #78716c;">Inspiration Link</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1c1917;"><a href="${lead.inspirationLink}" target="_blank" style="color: #1c1917; text-decoration: underline;">View Inspiration</a></td>
            </tr>
            ` : ""}
          </table>
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/admin" style="display: inline-block; padding: 14px 28px; background-color: #1c1917; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);">Open Admin Dashboard</a>
        </div>
      </div>
    `;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(port),
          secure: parseInt(port) === 465,
          auth: { user, pass },
        });

        await transporter.sendMail({
          from: sender,
          to: recipient,
          subject,
          html: htmlContent,
        });

        console.log(`✅ Email notification successfully sent to ${recipient}`);
        return res.json({ success: true, message: "Email sent successfully" });
      } catch (error) {
        console.error("❌ Error sending email via SMTP:", error);
        return res.status(500).json({ error: "SMTP dispatch failed", details: String(error) });
      }
    } else {
      console.log(`ℹ️ [Sandbox Mode] SMTP is not configured. Email notification logged to console:`);
      console.log(`To: ${recipient}`);
      console.log(`Subject: ${subject}`);
      console.log(`Details:`, JSON.stringify(lead, null, 2));
      return res.json({
        success: true,
        sandbox: true,
        message: "Logged to console (SMTP credentials not set)"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
