
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function registerListingsRoute(app, db) {
    app.get("/api/listings", async (req, res, next) => {

        const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
        const page = parsePositiveInteger(req.query.page, 1);
        const requestedPageSize = parsePositiveInteger(req.query.pageSize, DEFAULT_PAGE_SIZE);

        if (!city || page === null || requestedPageSize === null) {
            return res.status(400).json({ error: "invalid city, page or pageSize" });
        }

        const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
        const offset = (page - 1) * pageSize;
        
        try {
            const result = await db.query(
                `SELECT
                l.id,
                l.title,
                l.price,
                l.city,
                l.created_at,
                jsonb_build_object('id', a.id, 'name', a.name) AS agency,
                COALESCE(
                    jsonb_agg(jsonb_build_object('url', p.url))
                    FILTER (WHERE p.id IS NOT NULL),
                    '[]'::jsonb
                ) AS photos
                FROM listings AS l
                JOIN agencies AS a ON a.id = l.agency_id
                LEFT JOIN photos AS p ON p.listing_id = l.id
                WHERE l.city = $1
                GROUP BY l.id, a.id
                ORDER BY l.created_at DESC, l.id DESC
                LIMIT $2 OFFSET $3`,
                [city, pageSize, offset],
            );

            return res.json({ data: result.rows, page, pageSize });
        } catch (error) {
            return next(error);
        }
    })
}