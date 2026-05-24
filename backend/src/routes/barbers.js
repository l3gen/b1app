const express = require('express');
const router = express.Router();
const { getAllBarbers, getBarberById, updateBarber, getAvailability } = require('../controllers/barbersController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',                    getAllBarbers);
router.get('/:id',                 getBarberById);
router.get('/:id/availability',    getAvailability);
router.put('/:id', authenticate, authorize('barber', 'admin'), updateBarber);

module.exports = router;
