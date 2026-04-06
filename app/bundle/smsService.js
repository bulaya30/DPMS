import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function sendSMS({ to, message }) {
  try {
    if (!to || !message) {
      throw new Error("Missing 'to' or 'message'");
    }

    // 🔹 Normalize phone (remove dashes, spaces)
    const formattedTo = to.replace(/[-\s]/g, "");

    // console.log("📩 Sending SMS to:", formattedTo);

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });

    // console.log("✅ SMS sent:", response.sid);

    return {
      success: true,
      sid: response.sid,
    };

  } catch (error) {
    console.error("❌ SMS failed:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}