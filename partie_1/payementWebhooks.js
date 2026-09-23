import { createHmac, timingSafeEqual } from "node:crypto";

function hasValidSignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== "string") return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function registerPaymentWebhook(app, { db, jobs, webhookSecret }) {
  app.post("/webhooks/payment",app.rawJsonBodyParser,async (req, res, next) => {
      try {
        if (!hasValidSignature(req.body, req.get("x-payment-signature"), webhookSecret)) {
          return res.status(401).send("invalid signature");
        }

        let event;
        try {
          event = JSON.parse(req.body.toString("utf8"));
        } catch {
          return res.status(400).send("invalid payload");
        }

        if (!event.id || !event.type) {
          return res.status(400).send("invalid event");
        }

        await db.transaction(async (tx) => {
          const inserted = await tx.query(
            `INSERT INTO payment_events (provider_event_id, type, payload)
             VALUES ($1, $2, $3)
             ON CONFLICT (provider_event_id) DO NOTHING
             RETURNING provider_event_id`,
            [event.id, event.type, event],
          );

          if (inserted.rowCount === 0 || event.type !== "payment.succeeded") return;

          await tx.query(
            `UPDATE bookings
             SET status = 'paid'
             WHERE id = $1 AND status <> 'paid'`,
            [event.booking_id],
          );

          await jobs.enqueue(tx, "payment.succeeded", {
            eventId: event.id,
            bookingId: event.booking_id,
            customerEmail: event.customer_email,
          });
        });

        return res.status(200).send("ok");
      } catch (error) {
        return next(error);
      }
    },
  );
}