const pool = require('../db/pool');

// GET /api/barbers — list all active barbers (with search/filter)
const getAllBarbers = async (req, res) => {
  try {
    const { category, lat, lng } = req.query;

    let query = `
      SELECT b.id, b.bio, b.instagram, b.years_exp, b.address,
             b.latitude, b.longitude, b.no_show_fee,
             u.full_name, u.avatar_url,
             COALESCE(AVG(r.rating), 0) AS avg_rating,
             COUNT(DISTINCT r.id) AS review_count
      FROM barbers b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN reviews r ON r.barber_id = b.id
      WHERE b.is_active = true
      GROUP BY b.id, u.full_name, u.avatar_url
      ORDER BY avg_rating DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Get barbers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/barbers/:id — single barber profile
const getBarberById = async (req, res) => {
  try {
    const { id } = req.params;

    const barber = await pool.query(`
      SELECT b.*, u.full_name, u.avatar_url, u.email, u.phone,
             COALESCE(AVG(r.rating), 0) AS avg_rating,
             COUNT(DISTINCT r.id) AS review_count
      FROM barbers b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN reviews r ON r.barber_id = b.id
      WHERE b.id = $1
      GROUP BY b.id, u.full_name, u.avatar_url, u.email, u.phone
    `, [id]);

    if (barber.rows.length === 0) {
      return res.status(404).json({ error: 'Barber not found' });
    }

    // Get their services
    const services = await pool.query(
      'SELECT * FROM services WHERE barber_id = $1 AND is_active = true',
      [id]
    );

    // Get their photos
    const photos = await pool.query(
      'SELECT * FROM barber_photos WHERE barber_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get their reviews
    const reviews = await pool.query(`
      SELECT r.*, u.full_name, u.avatar_url
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      WHERE r.barber_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [id]);

    res.json({
      ...barber.rows[0],
      services: services.rows,
      photos: photos.rows,
      reviews: reviews.rows
    });

  } catch (err) {
    console.error('Get barber error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/barbers/:id — update barber profile (barber only)
const updateBarber = async (req, res) => {
  try {
    const { id } = req.params;
    const { bio, instagram, years_exp, address, latitude, longitude,
            cancellation_policy, cancellation_hours, no_show_fee } = req.body;

    const result = await pool.query(`
      UPDATE barbers SET
        bio = COALESCE($1, bio),
        instagram = COALESCE($2, instagram),
        years_exp = COALESCE($3, years_exp),
        address = COALESCE($4, address),
        latitude = COALESCE($5, latitude),
        longitude = COALESCE($6, longitude),
        cancellation_policy = COALESCE($7, cancellation_policy),
        cancellation_hours = COALESCE($8, cancellation_hours),
        no_show_fee = COALESCE($9, no_show_fee)
      WHERE id = $10
      RETURNING *
    `, [bio, instagram, years_exp, address, latitude, longitude,
        cancellation_policy, cancellation_hours, no_show_fee, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update barber error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/barbers/:id/availability — get available time slots for a date
const getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // e.g. 2026-05-24

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const dayOfWeek = new Date(date).getDay();

    // Get barber's schedule for that day
    const schedule = await pool.query(
      'SELECT * FROM availability WHERE barber_id = $1 AND day_of_week = $2',
      [id, dayOfWeek]
    );

    if (schedule.rows.length === 0) {
      return res.json({ available: false, slots: [] });
    }

    // Get existing appointments for that day
    const booked = await pool.query(`
      SELECT start_time, end_time FROM appointments
      WHERE barber_id = $1
        AND DATE(start_time) = $2
        AND status NOT IN ('cancelled')
    `, [id, date]);

    res.json({
      schedule: schedule.rows[0],
      booked_slots: booked.rows
    });

  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllBarbers, getBarberById, updateBarber, getAvailability };
