const pool = require('../db/pool');

// POST /api/appointments — book an appointment
const createAppointment = async (req, res) => {
  try {
    const { barber_id, service_id, start_time, notes } = req.body;
    const customer_id = req.user.id;

    if (!barber_id || !service_id || !start_time) {
      return res.status(400).json({ error: 'barber_id, service_id and start_time are required' });
    }

    // Get service to calculate end_time and price
    const service = await pool.query(
      'SELECT * FROM services WHERE id = $1 AND is_active = true',
      [service_id]
    );
    if (service.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { duration_mins, price } = service.rows[0];
    const start = new Date(start_time);
    const end = new Date(start.getTime() + duration_mins * 60000);

    // Check for scheduling conflicts
    const conflict = await pool.query(`
      SELECT id FROM appointments
      WHERE barber_id = $1
        AND status NOT IN ('cancelled')
        AND ($2, $3) OVERLAPS (start_time, end_time)
    `, [barber_id, start, end]);

    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }

    // Create the appointment
    const result = await pool.query(`
      INSERT INTO appointments
        (customer_id, barber_id, service_id, start_time, end_time, notes, total_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [customer_id, barber_id, service_id, start, end, notes, price]);

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Create appointment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/appointments/my — customer's appointments
const getMyAppointments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
             u.full_name AS barber_name,
             s.name AS service_name,
             s.duration_mins
      FROM appointments a
      JOIN barbers b ON a.barber_id = b.id
      JOIN users u ON b.user_id = u.id
      JOIN services s ON a.service_id = s.id
      WHERE a.customer_id = $1
      ORDER BY a.start_time DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get appointments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/appointments/barber — barber's upcoming appointments
const getBarberAppointments = async (req, res) => {
  try {
    const barber = await pool.query(
      'SELECT id FROM barbers WHERE user_id = $1', [req.user.id]
    );
    if (barber.rows.length === 0) {
      return res.status(404).json({ error: 'Barber profile not found' });
    }

    const result = await pool.query(`
      SELECT a.*,
             u.full_name AS customer_name,
             u.phone AS customer_phone,
             s.name AS service_name,
             s.duration_mins
      FROM appointments a
      JOIN users u ON a.customer_id = u.id
      JOIN services s ON a.service_id = s.id
      WHERE a.barber_id = $1
        AND a.start_time >= NOW()
      ORDER BY a.start_time ASC
    `, [barber.rows[0].id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get barber appointments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/appointments/:id/status — update status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['confirmed', 'completed', 'cancelled', 'no_show'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(`
      UPDATE appointments SET status = $1
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createAppointment, getMyAppointments, getBarberAppointments, updateStatus };
