const express = require('express');
const router = express.Router();
const { createAppointment, getMyAppointments, getBarberAppointments, updateStatus } = require('../controllers/appointmentsController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/',               authenticate, createAppointment);
router.get('/my',              authenticate, getMyAppointments);
router.get('/barber',          authenticate, authorize('barber'), getBarberAppointments);
router.patch('/:id/status',    authenticate, updateStatus);

module.exports = router;
